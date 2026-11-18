-- FFH-P08 independent audit fixes (audit at ed915d419cd4e9e827bd1734e203e8d92f11c542).
--
-- F01 (HIGH): a recently issued session could enroll and verify its OWN authenticator and then approve it, reusing
--   the password sign-in that happened BEFORE that authenticator existed. Approval now also requires the acting
--   session to have been created AFTER the authenticator was enrolled (auth.sessions.created_at >
--   auth.mfa_factors.created_at; both are written by Supabase Auth, so no cross-clock comparison). FFH's own flow
--   already enrolls first and then signs in afresh on a throw-away session, so it is unaffected.
-- F02 (MEDIUM): turning two-factor sign-in off now removes the person's authenticators from Supabase Auth in the SAME
--   transaction as the FFH approvals (it previously relied on separate provider calls whose failures were ignored),
--   and ends every session, including the acting one.
-- Only these two function bodies change; both keep their owner and grants (create or replace).

begin;

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
  v_session_created timestamptz;
  v_factor_created timestamptz;
begin
  perform private.recent_reauth('mfa_approve');
  select f.created_at into v_factor_created
  from auth.mfa_factors f
  where f.id = p_factor_id and f.user_id = v_user and f.factor_type::text = 'totp' and f.status::text = 'verified';
  if p_factor_id is null or v_factor_created is null then
    raise exception 'permission denied: that authenticator cannot be approved' using errcode = '42501';
  end if;
  if exists (select 1 from private.mfa_approved_factors a where a.factor_id = p_factor_id) then
    raise exception 'permission denied: that authenticator is already on' using errcode = '42501';
  end if;
  select s.aal::text, s.factor_id, s.created_at into v_aal, v_session_factor, v_session_created
  from auth.sessions s where s.id = (v_claims ->> 'session_id')::uuid and s.user_id = v_user;
  -- F01: the password sign-in proving this approval must be a NEW session, started after the authenticator existed.
  if v_session_created is null or v_session_created <= v_factor_created then
    raise exception 'permission denied: that authenticator cannot be approved' using errcode = '42501';
  end if;
  if not private.has_approved_factor(v_user) then
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

-- Turning two-factor sign-in off: fresh password + code (recent_reauth). In one transaction: every FFH approval and
-- every authenticator of the person are removed and every session (including this one) ends. Nothing is left for a
-- separate provider call to fail on.
create or replace function public.turn_off_my_two_factor()
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
  delete from private.mfa_approved_factors a where a.user_id = v_user;
  if not found then
    raise exception 'permission denied: two-factor sign-in is not on' using errcode = '42501';
  end if;
  delete from auth.mfa_factors f where f.user_id = v_user;
  insert into private.security_events (user_id, event) values (v_user, 'mfa_revoked');
  perform private.end_sessions(v_user, null);
end;
$$;

commit;
