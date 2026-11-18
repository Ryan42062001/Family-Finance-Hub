-- ---------------------------------------------------------------------------------------------------------------
-- Recent re-authentication (proposal §10.1.4 / §11.3). A provider-signed JWT whose amr shows a password sign-in
-- (and, with an approved authenticator, a TOTP verification) in the last 5 minutes, +30 s for clock skew.
-- Refreshing a session keeps the original amr timestamps (spike), so a stolen older or refreshed token is never a
-- proof. Single use per session and purpose; consumed in the caller's transaction.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function private.amr_age(p_claims jsonb, p_method text)
returns bigint
language sql
stable
set search_path = ''
as $$
  select extract(epoch from now())::bigint - max((e ->> 'timestamp')::bigint)
  from jsonb_array_elements(case when jsonb_typeof(p_claims -> 'amr') = 'array' then p_claims -> 'amr' else '[]'::jsonb end) e
  where jsonb_typeof(e) = 'object' and e ->> 'method' = p_method
    and jsonb_typeof(e -> 'timestamp') = 'number' and (e ->> 'timestamp') ~ '^[0-9]{1,12}$';
$$;

create or replace function private.recent_reauth(p_purpose text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_age bigint;
begin
  if v_user is null or not private.session_ok() then
    raise exception 'permission denied: please sign in again' using errcode = '42501';
  end if;
  v_age := private.amr_age(v_claims, 'password');
  if v_age is null or v_age > 330 or v_age < -30 then
    raise exception 'permission denied: please confirm your password again' using errcode = '42501';
  end if;
  if private.has_approved_factor(v_user) then
    v_age := private.amr_age(v_claims, 'totp');
    if v_age is null or v_age > 330 or v_age < -30 then
      raise exception 'permission denied: please confirm your password again' using errcode = '42501';
    end if;
  end if;
  begin
    insert into private.reauth_uses (session_id, purpose, user_id)
    values ((v_claims ->> 'session_id')::uuid, p_purpose, v_user);
  exception when unique_violation then
    raise exception 'permission denied: please confirm your password again' using errcode = '42501';
  end;
end;
$$;

revoke all on function private.amr_age(jsonb, text), private.recent_reauth(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Status for the app's sign-in gate. The ONE allowlisted function that does not require session_ok(): it needs a
-- live session (so a revoked token learns nothing) and returns only the caller's own three booleans.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.my_security_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid;
begin
  begin
    v_session := (auth.jwt() ->> 'session_id')::uuid;
  exception when others then
    v_session := null;
  end;
  if v_user is null or v_session is null
     or not exists (select 1 from auth.sessions s where s.id = v_session and s.user_id = v_user
                    and (s.not_after is null or s.not_after > now())) then
    raise exception 'permission denied: not signed in' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'two_factor_on', private.has_approved_factor(v_user),
    'session_ok', private.session_ok(),
    'unapproved_factor', exists (
      select 1 from auth.mfa_factors f
      where f.user_id = v_user and f.status::text = 'verified'
        and not exists (select 1 from private.mfa_approved_factors a where a.factor_id = f.id)));
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Session revocation by deleting session rows (proposal §11.1). Refresh tokens cascade with their session.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function private.end_sessions(p_user uuid, p_keep uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from auth.sessions s where s.user_id = p_user and (p_keep is null or s.id <> p_keep);
$$;

revoke all on function private.end_sessions(uuid, uuid) from public, anon, authenticated;

-- Part A: after the provider changed the password (it requires the current password; R9), end EVERY session of
-- the person, including the one that made the change. They sign in again with the new password.
create or replace function public.finish_password_change()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  perform private.recent_reauth('password_change');
  insert into private.security_events (user_id, event) values (v_user, 'password_changed');
  perform private.end_sessions(v_user, null);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Part B: FFH factor registry.
-- ---------------------------------------------------------------------------------------------------------------
-- First authenticator: the acting session must have just been verified WITH this factor (row factor_id).
-- Another authenticator: session_ok() already proves aal2 through an approved factor; the new factor must be a
-- verified TOTP factor of the caller. Either way a fresh password sign-in is required. Ends every session.
create or replace function public.approve_my_mfa_factor(p_factor_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_age bigint;
  v_aal text;
  v_session_factor uuid;
begin
  perform private.recent_reauth('mfa_approve');
  if p_factor_id is null or not exists (
       select 1 from auth.mfa_factors f
       where f.id = p_factor_id and f.user_id = v_user and f.factor_type::text = 'totp' and f.status::text = 'verified') then
    raise exception 'permission denied: that authenticator cannot be approved' using errcode = '42501';
  end if;
  if exists (select 1 from private.mfa_approved_factors a where a.factor_id = p_factor_id) then
    raise exception 'permission denied: that authenticator is already on' using errcode = '42501';
  end if;
  if not private.has_approved_factor(v_user) then
    select s.aal::text, s.factor_id into v_aal, v_session_factor
    from auth.sessions s where s.id = (v_claims ->> 'session_id')::uuid and s.user_id = v_user;
    v_age := private.amr_age(v_claims, 'totp');
    if coalesce(v_claims ->> 'aal', '') <> 'aal2' or v_aal is distinct from 'aal2'
       or v_session_factor is distinct from p_factor_id or v_age is null or v_age > 330 or v_age < -30 then
      raise exception 'permission denied: that authenticator cannot be approved' using errcode = '42501';
    end if;
  end if;
  insert into private.mfa_approved_factors (factor_id, user_id) values (p_factor_id, v_user);
  insert into private.security_events (user_id, event) values (v_user, 'mfa_approved');
  perform private.end_sessions(v_user, null);
end;
$$;

-- Turning an authenticator off: fresh password + code (recent_reauth). Ends every OTHER session; the acting session
-- then unenrolls the factor with the provider and signs out.
create or replace function public.revoke_my_mfa_approval(p_factor_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  perform private.recent_reauth('mfa_revoke');
  delete from private.mfa_approved_factors a where a.factor_id = p_factor_id and a.user_id = v_user;
  if not found then
    raise exception 'permission denied: that authenticator is not on' using errcode = '42501';
  end if;
  insert into private.security_events (user_id, event) values (v_user, 'mfa_revoked');
  perform private.end_sessions(v_user, (auth.jwt() ->> 'session_id')::uuid);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Part C: delete my account (proposal §10.6 / §11.4; R2–R4). Identity only from auth.uid(); fresh proof required
-- inside the function; household row locked before membership is read. Sole owner: the household and all its
-- data (including pending invitations) go with the account. Owner with other people: refused (R3). Permanent (R4).
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.delete_my_account(p_confirm text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
  v_role text;
  v_others integer;
begin
  if p_confirm is distinct from 'DELETE' then
    raise exception 'delete: type DELETE to confirm' using errcode = '22023';
  end if;
  perform private.recent_reauth('delete_account');

  select m.household_id into v_household from public.household_members m where m.user_id = v_user;
  if v_household is not null then
    perform 1 from public.households h where h.id = v_household for update;
    select m.role::text into v_role from public.household_members m
    where m.user_id = v_user and m.household_id = v_household;
    if v_role is null then
      raise exception 'permission denied: your household changed; please try again' using errcode = '42501';
    end if;
    if v_role = 'owner' then
      select count(*) into v_others from public.household_members m
      where m.household_id = v_household and m.user_id <> v_user;
      if v_others > 0 then
        raise exception 'permission denied: remove the other people from your household first' using errcode = '42501';
      end if;
      delete from public.households h where h.id = v_household;
    end if;
  end if;
  -- households.created_by does not cascade: any household still naming this person blocks deletion (fail closed).
  if exists (select 1 from public.households h where h.created_by = v_user) then
    raise exception 'permission denied: this account still owns a household' using errcode = '42501';
  end if;
  insert into private.security_events (user_id, event) values (v_user, 'account_deleted');
  delete from auth.users u where u.id = v_user;
  return 'deleted';
end;
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Owner-assisted 2FA reset (proposal §10.7, R11). Run only by Ryan in the SQL editor after confirming identity in
-- person or by a call he places to a number he already had. NOT executable by anon/authenticated.
-- ---------------------------------------------------------------------------------------------------------------
create or replace function private.owner_reset_mfa(p_user uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_reason is null or length(trim(p_reason)) < 5 or length(p_reason) > 200 then
    raise exception 'owner reset: a user id and a short reason are required' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then
    raise exception 'owner reset: no such account' using errcode = '22023';
  end if;
  delete from private.mfa_approved_factors a where a.user_id = p_user;
  delete from auth.mfa_factors f where f.user_id = p_user;
  perform private.end_sessions(p_user, null);
  insert into private.security_events (user_id, event, detail) values (p_user, 'owner_mfa_reset', p_reason);
end;
$$;

revoke all on function private.owner_reset_mfa(uuid, text) from public, anon, authenticated;

revoke all on function public.my_security_status(), public.finish_password_change(),
  public.approve_my_mfa_factor(uuid), public.revoke_my_mfa_approval(uuid), public.delete_my_account(text)
  from public, anon, authenticated;
grant execute on function public.my_security_status(), public.finish_password_change(),
  public.approve_my_mfa_factor(uuid), public.revoke_my_mfa_approval(uuid), public.delete_my_account(text)
  to authenticated;

-- New functions in public are not callable by PUBLIC/anon/authenticated until a migration grants it explicitly
-- (Supabase's default grants EXECUTE to anon and authenticated). Checked by scripts/rls-local/coverage.sql.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

commit;
