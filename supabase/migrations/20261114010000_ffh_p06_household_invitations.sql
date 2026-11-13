-- FFH-P06: household invitations (Ryan, 2026-11-13). The owner shares a link; the invited
-- person accepts it and only then becomes a member or viewer. Links are valid 7 days and
-- work once. Only the owner invites, changes roles or removes people; the owner is never
-- demoted or removed. Direct writes to household_members stay forbidden: membership
-- changes happen only through the three narrow functions below.

create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  role public.household_role not null check (role in ('member', 'viewer')),
  label text check (label is null or char_length(label) between 1 and 60),
  -- SHA-256 (hex) of the secret link token. The token itself is never stored.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  constraint household_invitations_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '7 days'),
  constraint household_invitations_acceptance_check
    check ((accepted_at is null) = (accepted_by is null))
);

create index household_invitations_household_idx on public.household_invitations(household_id);

alter table public.household_invitations enable row level security;

-- Owners see, create and cancel (delete) their own household's invitations. No UPDATE:
-- acceptance is recorded only by accept_household_invitation.
create policy household_invitations_owner_select on public.household_invitations
  for select to authenticated using (private.is_household_owner(household_id));
create policy household_invitations_owner_insert on public.household_invitations
  for insert to authenticated with check (
    private.is_household_owner(household_id)
    and created_by = (select auth.uid())
    and accepted_at is null and accepted_by is null
  );
create policy household_invitations_owner_delete_pending on public.household_invitations
  for delete to authenticated using (private.is_household_owner(household_id) and accepted_at is null);

revoke all on public.household_invitations from public, anon, authenticated;
grant select, insert, delete on public.household_invitations to authenticated;

-- Accept an invitation by its secret token. Generic failure message for an unknown,
-- expired, used or malformed token, so tokens cannot be probed.
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

  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_user, v_invite.role);
  update public.household_invitations
  set accepted_at = now(), accepted_by = v_user
  where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

-- Owner only: change another person's role between member and viewer.
create or replace function public.set_household_member_role(p_household_id uuid, p_user_id uuid, p_role public.household_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_household_owner(p_household_id) then
    raise exception 'permission denied: only the household owner can change roles' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('member', 'viewer') then
    raise exception 'setup: role must be member or viewer' using errcode = '22023';
  end if;
  update public.household_members
  set role = p_role
  where household_id = p_household_id and user_id = p_user_id and role <> 'owner';
  if not found then
    raise exception 'permission denied: that person cannot be changed' using errcode = '42501';
  end if;
end;
$$;

-- Owner only: remove another person from the household. The owner is never removed.
create or replace function public.remove_household_member(p_household_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_household_owner(p_household_id) then
    raise exception 'permission denied: only the household owner can remove people' using errcode = '42501';
  end if;
  delete from public.household_members
  where household_id = p_household_id and user_id = p_user_id and role <> 'owner';
  if not found then
    raise exception 'permission denied: that person cannot be removed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.accept_household_invitation(text) from public, anon, authenticated;
revoke all on function public.set_household_member_role(uuid, uuid, public.household_role) from public, anon, authenticated;
revoke all on function public.remove_household_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;
grant execute on function public.set_household_member_role(uuid, uuid, public.household_role) to authenticated;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;
