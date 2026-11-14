-- FFH-P07: savings goals tracker and monthly check-ins (rules approved by Ryan, 2026-11-14;
-- docs/FFH-P07_DESIGN.md).
--
-- * public.savings_goals is a SEPARATE tracker. The Money Priority Engine reads public.goals
--   and never this table (D1).
-- * public.monthly_check_ins holds one check-in per household per calendar month (C1). Its
--   planned cash-flow snapshot is computed HERE from the Financial profile when the row is
--   first inserted, never taken from the client, and never recalculated afterwards (C6, C8).
-- * public.monthly_check_in_balances holds the manually entered balances, with a copied name
--   and kind so later profile changes never rewrite history (C2, C3). A NULL amount means
--   "not entered", never zero (C4). Net worth is derived from these lines when shown (C5).
--
-- RLS: read = any household member; insert/update/delete = owner or member only (viewer is
-- read-only), using the same helpers as every other financial table.

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null constraint savings_goals_name_check
    check (char_length(name) between 1 and 100 and btrim(name) <> ''),
  target_amount numeric(14,2) not null constraint savings_goals_target_amount_check check (target_amount > 0),
  saved_amount numeric(14,2) not null default 0 constraint savings_goals_saved_amount_check check (saved_amount >= 0),
  target_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index savings_goals_household_idx on public.savings_goals(household_id, created_at);

create table public.monthly_check_ins (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  check_in_month date not null constraint monthly_check_ins_first_of_month_check
    check (extract(day from check_in_month) = 1),
  followed_plan boolean not null,
  -- Planned monthly cash flow at first save (dashboard formula). Set by the trigger only.
  planned_monthly_income numeric(16,2) not null default 0,
  planned_monthly_expenses numeric(16,2) not null default 0,
  planned_debt_minimums numeric(16,2) not null default 0,
  planned_employee_retirement numeric(16,2) not null default 0,
  planned_cash_flow numeric(16,2) null,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_check_ins_household_month_key unique (household_id, check_in_month),
  constraint monthly_check_ins_id_household_key unique (id, household_id)
);

create table public.monthly_check_in_balances (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  check_in_id uuid not null,
  item_type text not null constraint monthly_check_in_balances_item_type_check
    check (item_type in ('account', 'retirement_account', 'debt')),
  name text not null constraint monthly_check_in_balances_name_check
    check (char_length(name) between 1 and 100 and btrim(name) <> ''),
  amount numeric(14,2) null,
  sort_order integer not null default 0 constraint monthly_check_in_balances_sort_order_check
    check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Cash accounts may be overdrawn (same as public.accounts); retirement and debt balances are never negative.
  constraint monthly_check_in_balances_amount_sign_check
    check (amount is null or item_type = 'account' or amount >= 0),
  constraint monthly_check_in_balances_check_in_household_fkey
    foreign key (check_in_id, household_id)
    references public.monthly_check_ins(id, household_id) on delete cascade
);
create index monthly_check_in_balances_check_in_idx on public.monthly_check_in_balances(check_in_id, sort_order);

-- Check-in rows: month never in the future (UTC); planned cash flow computed from the
-- household's own profile on insert (SECURITY INVOKER: only rows the caller may read) and
-- frozen on update; month, creator and creation time are immutable.
create or replace function private.monthly_check_in_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_income numeric;
  v_active_income integer;
  v_expenses numeric;
  v_expense_rows integer;
  v_debt_minimums numeric;
  v_employee_retirement numeric;
begin
  if tg_op = 'INSERT' then
    if new.check_in_month > date_trunc('month', (now() at time zone 'utc'))::date then
      raise exception 'check-in month cannot be in the future' using errcode = '22023';
    end if;
    select coalesce(sum(monthly_amount), 0), count(*) into v_income, v_active_income
      from public.income_sources where household_id = new.household_id and is_active;
    select coalesce(sum(monthly_amount), 0), count(*) into v_expenses, v_expense_rows
      from public.expenses where household_id = new.household_id;
    select coalesce(sum(minimum_payment), 0) into v_debt_minimums
      from public.debts where household_id = new.household_id;
    select coalesce(sum(monthly_employee_contribution), 0) into v_employee_retirement
      from public.retirement_accounts where household_id = new.household_id;
    new.planned_monthly_income := v_income;
    new.planned_monthly_expenses := v_expenses;
    new.planned_debt_minimums := v_debt_minimums;
    new.planned_employee_retirement := v_employee_retirement;
    -- Same availability rule as the dashboard: active income and at least one expense.
    new.planned_cash_flow := case
      when v_active_income > 0 and v_expense_rows > 0
        then v_income - v_expenses - v_debt_minimums - v_employee_retirement
      else null
    end;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  else
    new.check_in_month := old.check_in_month;
    new.planned_monthly_income := old.planned_monthly_income;
    new.planned_monthly_expenses := old.planned_monthly_expenses;
    new.planned_debt_minimums := old.planned_debt_minimums;
    new.planned_employee_retirement := old.planned_employee_retirement;
    new.planned_cash_flow := old.planned_cash_flow;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger monthly_check_in_before_write_trigger
  before insert or update on public.monthly_check_ins
  for each row execute function private.monthly_check_in_before_write();

-- Balance lines: only the amount can change after creation (the copied name, kind, order
-- and parent are the historical record).
create or replace function private.monthly_check_in_balance_before_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.check_in_id := old.check_in_id;
  new.item_type := old.item_type;
  new.name := old.name;
  new.sort_order := old.sort_order;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger monthly_check_in_balance_before_update_trigger
  before update on public.monthly_check_in_balances
  for each row execute function private.monthly_check_in_balance_before_update();

revoke all on function private.monthly_check_in_before_write() from public, anon, authenticated;
revoke all on function private.monthly_check_in_balance_before_update() from public, anon, authenticated;

alter table public.savings_goals enable row level security;
alter table public.monthly_check_ins enable row level security;
alter table public.monthly_check_in_balances enable row level security;

revoke all on public.savings_goals from anon;
revoke all on public.monthly_check_ins from anon;
revoke all on public.monthly_check_in_balances from anon;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert, update, delete on public.monthly_check_ins to authenticated;
grant select, insert, update, delete on public.monthly_check_in_balances to authenticated;

create policy savings_goals_household_read on public.savings_goals
  for select to authenticated using (private.can_read_household(household_id));
create policy savings_goals_household_write_insert on public.savings_goals
  for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy savings_goals_household_write_update on public.savings_goals
  for update to authenticated using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy savings_goals_household_write_delete on public.savings_goals
  for delete to authenticated using (private.can_write_household_financials(household_id));

create policy monthly_check_ins_household_read on public.monthly_check_ins
  for select to authenticated using (private.can_read_household(household_id));
create policy monthly_check_ins_household_write_insert on public.monthly_check_ins
  for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy monthly_check_ins_household_write_update on public.monthly_check_ins
  for update to authenticated using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy monthly_check_ins_household_write_delete on public.monthly_check_ins
  for delete to authenticated using (private.can_write_household_financials(household_id));

create policy monthly_check_in_balances_household_read on public.monthly_check_in_balances
  for select to authenticated using (private.can_read_household(household_id));
create policy monthly_check_in_balances_household_write_insert on public.monthly_check_in_balances
  for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy monthly_check_in_balances_household_write_update on public.monthly_check_in_balances
  for update to authenticated using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy monthly_check_in_balances_household_write_delete on public.monthly_check_in_balances
  for delete to authenticated using (private.can_write_household_financials(household_id));

-- Validates one balances payload element; raises 22023 on anything malformed.
create or replace function private.check_in_amount(p_value jsonb)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v numeric;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_value) <> 'string' or (p_value #>> '{}') !~ '^-?[0-9]{1,12}(\.[0-9]{1,2})?$' then
    raise exception 'check-in: an amount is not a valid amount' using errcode = '22023';
  end if;
  v := (p_value #>> '{}')::numeric;
  if abs(v) > 999999999999.99 then
    raise exception 'check-in: an amount is out of range' using errcode = '22023';
  end if;
  return v;
end;
$$;
revoke all on function private.check_in_amount(jsonb) from public, anon, authenticated;
grant execute on function private.check_in_amount(jsonb) to authenticated;

-- Creates a check-in and all its balance lines in ONE transaction for the caller's own
-- household (never taken from input). SECURITY INVOKER: RLS applies, so a viewer, an
-- outsider or another household cannot write. Amounts arrive as decimal strings (exact, to
-- the cent) or null for "not entered". A second check-in for the same month raises the
-- unique violation monthly_check_ins_household_month_key.
create or replace function public.create_monthly_check_in(
  p_month date,
  p_followed_plan boolean,
  p_balances jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
  v_check_in uuid;
  v_line jsonb;
  v_index integer := 0;
begin
  if v_user is null then
    raise exception 'permission denied: not signed in' using errcode = '42501';
  end if;
  if p_month is null or p_followed_plan is null or p_balances is null
     or jsonb_typeof(p_balances) <> 'array' or jsonb_array_length(p_balances) > 300 then
    raise exception 'check-in: a required answer is missing or malformed' using errcode = '22023';
  end if;
  if extract(day from p_month) <> 1 then
    raise exception 'check-in: month must be the first day of a month' using errcode = '22023';
  end if;
  for v_line in select value from jsonb_array_elements(p_balances) loop
    if jsonb_typeof(v_line) <> 'object'
       or jsonb_typeof(v_line -> 'item_type') is distinct from 'string'
       or (v_line ->> 'item_type') not in ('account', 'retirement_account', 'debt')
       or jsonb_typeof(v_line -> 'name') is distinct from 'string'
       or char_length(v_line ->> 'name') not between 1 and 100
       or btrim(v_line ->> 'name') = '' then
      raise exception 'check-in: a balance line is malformed' using errcode = '22023';
    end if;
    perform private.check_in_amount(v_line -> 'amount');
  end loop;

  -- One household per account (household_members_one_household_per_user).
  select m.household_id into v_household
  from public.household_members m
  where m.user_id = v_user;
  if v_household is null then
    raise exception 'permission denied: no household for this user' using errcode = '42501';
  end if;

  insert into public.monthly_check_ins (household_id, check_in_month, followed_plan)
  values (v_household, p_month, p_followed_plan)
  returning id into v_check_in;

  for v_line in select value from jsonb_array_elements(p_balances) loop
    insert into public.monthly_check_in_balances (household_id, check_in_id, item_type, name, amount, sort_order)
    values (v_household, v_check_in, v_line ->> 'item_type', v_line ->> 'name',
            private.check_in_amount(v_line -> 'amount'), v_index);
    v_index := v_index + 1;
  end loop;
  return v_check_in;
end;
$$;

-- Edits a check-in's Yes/No answer and line amounts in ONE transaction. Every listed line
-- must belong to that check-in. The planned cash-flow snapshot is never recalculated (the
-- trigger keeps it). Refuses (42501) when the check-in is not visible and editable.
create or replace function public.update_monthly_check_in(
  p_check_in_id uuid,
  p_followed_plan boolean,
  p_amounts jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
  v_line jsonb;
  v_rows integer;
begin
  if v_user is null then
    raise exception 'permission denied: not signed in' using errcode = '42501';
  end if;
  if p_check_in_id is null or p_followed_plan is null or p_amounts is null
     or jsonb_typeof(p_amounts) <> 'array' or jsonb_array_length(p_amounts) > 300 then
    raise exception 'check-in: a required answer is missing or malformed' using errcode = '22023';
  end if;
  for v_line in select value from jsonb_array_elements(p_amounts) loop
    if jsonb_typeof(v_line) <> 'object' or jsonb_typeof(v_line -> 'id') is distinct from 'string'
       or (v_line ->> 'id') !~ '^[0-9a-fA-F-]{36}$' then
      raise exception 'check-in: a balance line is malformed' using errcode = '22023';
    end if;
    perform private.check_in_amount(v_line -> 'amount');
  end loop;

  update public.monthly_check_ins set followed_plan = p_followed_plan
  where id = p_check_in_id
  returning household_id into v_household;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'permission denied: check-in not found or not editable' using errcode = '42501';
  end if;

  for v_line in select value from jsonb_array_elements(p_amounts) loop
    update public.monthly_check_in_balances
    set amount = private.check_in_amount(v_line -> 'amount')
    where id = (v_line ->> 'id')::uuid and check_in_id = p_check_in_id and household_id = v_household;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'permission denied: balance line not found or not editable' using errcode = '42501';
    end if;
  end loop;
end;
$$;

revoke all on function public.create_monthly_check_in(date, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.update_monthly_check_in(uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.create_monthly_check_in(date, boolean, jsonb) to authenticated;
grant execute on function public.update_monthly_check_in(uuid, boolean, jsonb) to authenticated;
