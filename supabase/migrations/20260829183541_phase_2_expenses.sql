-- Phase 2: recurring monthly expenses for cash-flow calculations

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  category text not null check (category in ('housing','utilities','groceries','transportation','insurance','healthcare','childcare','subscriptions','personal','giving','other')),
  monthly_amount numeric(14,2) not null default 0 check (monthly_amount >= 0),
  is_essential boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
grant select, insert, update, delete on public.expenses to authenticated;

create policy "expenses_member_select" on public.expenses for select to authenticated using (private.is_household_member(household_id));
create policy "expenses_member_insert" on public.expenses for insert to authenticated with check (private.is_household_member(household_id));
create policy "expenses_member_update" on public.expenses for update to authenticated using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy "expenses_member_delete" on public.expenses for delete to authenticated using (private.is_household_member(household_id));

create index expenses_household_id_idx on public.expenses(household_id);
