-- Family Finance Hub - Phase 1 household tenancy foundation

create extension if not exists pgcrypto;

create type public.household_role as enum ('owner', 'member', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Keep SECURITY DEFINER authorization helpers outside the exposed public schema.
create schema if not exists private;

create or replace function private.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_household_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_household_member(uuid) to authenticated;

create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "households_select_members"
on public.households
for select
to authenticated
using (private.is_household_member(id));

create policy "households_insert_creator"
on public.households
for insert
to authenticated
with check (created_by = (select auth.uid()));

create policy "households_update_members"
on public.households
for update
to authenticated
using (private.is_household_member(id))
with check (private.is_household_member(id));

create policy "household_members_select_same_household"
on public.household_members
for select
to authenticated
using (private.is_household_member(household_id));

-- Bootstrap policy: the creator may add only themselves as the first owner.
create policy "household_members_insert_creator_owner"
on public.household_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1
    from public.households h
    where h.id = household_id
      and h.created_by = (select auth.uid())
  )
);

-- Broader member-management policies are intentionally deferred until invitation flows exist.

create index household_members_user_id_idx on public.household_members(user_id);
create index households_created_by_idx on public.households(created_by);
