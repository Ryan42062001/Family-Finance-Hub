-- Phase 2: household onboarding bootstrap and first financial profile tables

create or replace function private.add_household_creator_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or new.created_by <> (select auth.uid()) then
    raise exception 'Household creator must match the authenticated user';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (household_id, user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.add_household_creator_membership() from public;
revoke all on function private.add_household_creator_membership() from anon;
revoke all on function private.add_household_creator_membership() from authenticated;

drop trigger if exists household_creator_membership_trigger on public.households;
create trigger household_creator_membership_trigger
after insert on public.households
for each row
execute function private.add_household_creator_membership();

drop policy if exists "household_members_insert_creator_owner" on public.household_members;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  account_type text not null check (account_type in ('checking','savings','cash','brokerage','other_asset')),
  balance numeric(14,2) not null default 0,
  include_in_net_worth boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  monthly_amount numeric(14,2) not null default 0 check (monthly_amount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  debt_type text not null check (debt_type in ('mortgage','student_loan','auto_loan','credit_card','personal_loan','medical','other')),
  current_balance numeric(14,2) not null default 0 check (current_balance >= 0),
  interest_rate numeric(7,4) check (interest_rate is null or (interest_rate >= 0 and interest_rate <= 100)),
  minimum_payment numeric(14,2) not null default 0 check (minimum_payment >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.retirement_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  account_type text not null check (account_type in ('401k','403b','457','traditional_ira','roth_ira','hsa','pension','other')),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  monthly_employee_contribution numeric(14,2) not null default 0 check (monthly_employee_contribution >= 0),
  monthly_employer_contribution numeric(14,2) not null default 0 check (monthly_employer_contribution >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  priority smallint not null default 3 check (priority between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.income_sources enable row level security;
alter table public.debts enable row level security;
alter table public.retirement_accounts enable row level security;
alter table public.goals enable row level security;

grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.income_sources to authenticated;
grant select, insert, update, delete on public.debts to authenticated;
grant select, insert, update, delete on public.retirement_accounts to authenticated;
grant select, insert, update, delete on public.goals to authenticated;

create policy "accounts_member_select" on public.accounts for select to authenticated using (private.is_household_member(household_id));
create policy "accounts_member_insert" on public.accounts for insert to authenticated with check (private.is_household_member(household_id));
create policy "accounts_member_update" on public.accounts for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "accounts_member_delete" on public.accounts for delete to authenticated using (private.is_household_member(household_id));

create policy "income_sources_member_select" on public.income_sources for select to authenticated using (private.is_household_member(household_id));
create policy "income_sources_member_insert" on public.income_sources for insert to authenticated with check (private.is_household_member(household_id));
create policy "income_sources_member_update" on public.income_sources for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "income_sources_member_delete" on public.income_sources for delete to authenticated using (private.is_household_member(household_id));

create policy "debts_member_select" on public.debts for select to authenticated using (private.is_household_member(household_id));
create policy "debts_member_insert" on public.debts for insert to authenticated with check (private.is_household_member(household_id));
create policy "debts_member_update" on public.debts for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "debts_member_delete" on public.debts for delete to authenticated using (private.is_household_member(household_id));

create policy "retirement_accounts_member_select" on public.retirement_accounts for select to authenticated using (private.is_household_member(household_id));
create policy "retirement_accounts_member_insert" on public.retirement_accounts for insert to authenticated with check (private.is_household_member(household_id));
create policy "retirement_accounts_member_update" on public.retirement_accounts for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "retirement_accounts_member_delete" on public.retirement_accounts for delete to authenticated using (private.is_household_member(household_id));

create policy "goals_member_select" on public.goals for select to authenticated using (private.is_household_member(household_id));
create policy "goals_member_insert" on public.goals for insert to authenticated with check (private.is_household_member(household_id));
create policy "goals_member_update" on public.goals for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "goals_member_delete" on public.goals for delete to authenticated using (private.is_household_member(household_id));

create index accounts_household_id_idx on public.accounts(household_id);
create index income_sources_household_id_idx on public.income_sources(household_id);
create index debts_household_id_idx on public.debts(household_id);
create index retirement_accounts_household_id_idx on public.retirement_accounts(household_id);
create index goals_household_id_idx on public.goals(household_id);
