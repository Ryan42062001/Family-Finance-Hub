-- FFH-P06 independent review remediation: one account may have ONE household.
-- Real-host schema migration is NOT authorized here. Reviewed PR only.
-- Apply only after Ryan authorizes hosted SQL and checks duplicates privately.
-- If existing memberships conflict, reject the WHOLE migration without deleting,
-- reassigning or revealing any user/household identifier.
begin;
set local lock_timeout = '10s';

do $membership_migration_guard$
begin
  if exists (
    select 1 from public.household_members
    group by user_id having count(*) > 1
  ) then
    raise exception 'FFH_P06_MEMBERSHIP_COLLISION_MANUAL_REVIEW_REQUIRED' using errcode = '23514';
  end if;
  -- A pending legacy invitation with a future creation date could have been
  -- forged under the historical table-wide INSERT grant. Do not silently
  -- accept, delete, modify or reissue such real household invitations.
  if exists (
    select 1 from public.household_invitations
    where accepted_at is null and created_at > now()
  ) then
    raise exception 'FFH_P06_FUTURE_DATED_INVITATIONS_MANUAL_REVIEW_REQUIRED' using errcode = '23514';
  end if;
end;
$membership_migration_guard$;

-- Covers BOTH acceptance of different invitations and the existing
-- add_household_creator_membership AFTER INSERT bootstrap trigger. Under
-- PostgreSQL MVCC this UNIQUE index arbitrates concurrent transactions.
alter table public.household_members
  add constraint household_members_one_household_per_user unique (user_id);

-- No table-wide INSERT grant: authenticated owners may submit only the four
-- intended input fields. id, created_by, created_at, expires_at, accepted_at
-- and accepted_by are server generated / function-written and not writable.
revoke insert on public.household_invitations from authenticated;
grant insert (household_id, role, label, token_hash)
  on public.household_invitations to authenticated;

-- Preserve locked invitation-row single use and generic invalid-token errors.
-- The new database uniqueness is decisive even if the precheck races.
create or replace function public.accept_household_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.household_invitations%rowtype;
begin
  if v_user is null then
    raise exception 'permission denied: not signed in' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'permission denied: this invitation is not valid' using errcode = '42501';
  end if;

  select * into v_invite
  from public.household_invitations
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;

  if not found or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
    raise exception 'permission denied: this invitation is not valid' using errcode = '42501';
  end if;
  if exists (select 1 from public.household_members where user_id = v_user) then
    raise exception 'permission denied: you already belong to a household' using errcode = '42501';
  end if;

  -- The UNIQUE(user_id) constraint, not this prior SELECT, is the final
  -- concurrency and household-creation invariant. Distinct invitation-row
  -- locks cannot serialize separate invitations for the same account.
  begin
    insert into public.household_members (household_id, user_id, role)
    values (v_invite.household_id, v_user, v_invite.role);
  exception when unique_violation then
    -- No target household/token/constraint identifiers leak to the caller.
    raise exception 'permission denied: you already belong to a household' using errcode = '42501';
  end;
  update public.household_invitations
  set accepted_at = now(), accepted_by = v_user
  where id = v_invite.id;

  return v_invite.household_id;
end;
$$;


commit;
