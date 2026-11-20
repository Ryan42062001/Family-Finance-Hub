-- FFH-P11 Irregular Expense Set-Asides (Owner-approved spec: GitHub issue #172).
--
-- One optional tracker per quarterly/yearly EXPENSE (P09 bills are the household's existing expenses; debts are
-- monthly and never eligible). The tracker stores only what P09 does not already hold:
--   * the active cycle: the due date this reserve is for, plus the P09 anchor and recurrence it was confirmed against
--     (if someone later edits the bill's schedule, the app shows "cycle confirmation needed" instead of guessing);
--   * the amount the household has REPORTED as set aside (a manual assertion, never a verified balance);
--   * a version number for optimistic concurrency (the trigger bumps it; the app writes "where version = <read>").
-- The bill's amount, recurrence and due dates stay authoritative in public.expenses; nothing is duplicated.
--
-- Tracking/advisory only: no reader of the financial plan (Money Priority Engine snapshot, check-in snapshot, plan
-- exports) reads this table, and nothing here writes any other table.
--
-- Household consistency is a database invariant: composite FK (expense_id, household_id) -> expenses(id,
-- household_id), ON DELETE CASCADE (deleting the bill removes its tracker; no orphan). RLS: read = any household
-- member, write = owner/member (viewer read-only), both through the existing helpers, which require
-- private.session_ok() (P08: live session, MFA when enrolled). The trigger function is not executable by API roles.
--
-- Safe for the released P10 app on the shared Supabase project: it adds a table it never reads and a unique
-- constraint on expenses(id, household_id), which every existing row already satisfies (id is the primary key). It
-- also fixes the P07 check-in trigger so account deletion works for invited members (no change to any saved check-in).

begin;

alter table public.expenses add constraint expenses_id_household_key unique (id, household_id);

create table public.bill_set_asides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  expense_id uuid not null,
  cycle_due_date date not null constraint bill_set_asides_cycle_due_date_check
    check (cycle_due_date between date '2000-01-01' and date '2099-12-31'),
  cycle_anchor_date date not null constraint bill_set_asides_cycle_anchor_date_check
    check (cycle_anchor_date between date '2000-01-01' and date '2099-12-31'),
  cycle_recurrence text not null constraint bill_set_asides_cycle_recurrence_check
    check (cycle_recurrence in ('quarterly', 'yearly')),
  reserved_amount numeric(14,2) not null constraint bill_set_asides_reserved_amount_check
    check (reserved_amount >= 0),
  version integer not null default 1 constraint bill_set_asides_version_check check (version >= 1),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bill_set_asides_expense_key unique (expense_id),
  constraint bill_set_asides_expense_household_fkey foreign key (expense_id, household_id)
    references public.expenses(id, household_id) on delete cascade
);
create index bill_set_asides_household_idx on public.bill_set_asides(household_id);

-- SECURITY INVOKER: the bill is read with the caller's own RLS. A new or changed cycle must belong to the bill's
-- CURRENT schedule: an eligible (quarterly/yearly, scheduled, amount > 0) expense whose anchor and recurrence equal the
-- confirmed ones, on a real occurrence of that schedule, not in the past (UTC calendar date). FOR SHARE holds the bill
-- row until commit, so a concurrent schedule change or delete cannot slip between this check and the write.
create or replace function private.bill_set_aside_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recurrence text;
  v_anchor date;
  v_payment numeric;
  v_step integer;
  v_months integer;
  v_day integer;
  v_last_day integer;
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.created_by := auth.uid();
    new.created_at := now();
  else
    -- ON DELETE SET NULL from a deleted account (created_by/updated_by -> auth.users): only an audit column becomes
    -- NULL and nothing else changes. Let it through as is; re-stamping it would point at the deleted account, fail the
    -- foreign key and so block that person's account deletion (pre-freeze review). No data or version changes.
    if (new.created_by is null or new.updated_by is null)
       and (new.created_by is distinct from old.created_by or new.updated_by is distinct from old.updated_by)
       and (new.created_by is null or new.created_by = old.created_by)
       and (new.updated_by is null or new.updated_by = old.updated_by)
       and (new.id, new.household_id, new.expense_id, new.cycle_due_date, new.cycle_anchor_date, new.cycle_recurrence,
            new.reserved_amount, new.version, new.created_at, new.updated_at)
           is not distinct from (old.id, old.household_id, old.expense_id, old.cycle_due_date, old.cycle_anchor_date,
            old.cycle_recurrence, old.reserved_amount, old.version, old.created_at, old.updated_at) then
      return new;
    end if;
    if new.household_id is distinct from old.household_id or new.expense_id is distinct from old.expense_id then
      raise exception 'a set-aside cannot be moved to another bill' using errcode = '22023';
    end if;
    new.version := old.version + 1;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();

  if tg_op = 'INSERT'
     or new.cycle_due_date is distinct from old.cycle_due_date
     or new.cycle_anchor_date is distinct from old.cycle_anchor_date
     or new.cycle_recurrence is distinct from old.cycle_recurrence then
    select e.recurrence, e.due_anchor_date, e.payment_amount into v_recurrence, v_anchor, v_payment
      from public.expenses e
      where e.id = new.expense_id and e.household_id = new.household_id
      for share;
    if not found then
      raise exception 'bill not found' using errcode = '42501';
    end if;
    if v_recurrence not in ('quarterly', 'yearly') or v_anchor is null or v_payment is null or v_payment <= 0 then
      raise exception 'only a scheduled quarterly or yearly bill with an amount can be tracked' using errcode = '22023';
    end if;
    if new.cycle_recurrence is distinct from v_recurrence or new.cycle_anchor_date is distinct from v_anchor then
      raise exception 'the bill schedule changed; confirm the cycle again' using errcode = '22023';
    end if;
    if new.cycle_due_date < (now() at time zone 'utc')::date then
      raise exception 'a set-aside cycle cannot start in the past' using errcode = '22023';
    end if;
    -- Occurrence k of the anchor: k * step months later, the anchor's day clamped to that month's length.
    v_step := case v_recurrence when 'quarterly' then 3 else 12 end;
    v_months := (extract(year from new.cycle_due_date)::integer * 12 + extract(month from new.cycle_due_date)::integer)
              - (extract(year from v_anchor)::integer * 12 + extract(month from v_anchor)::integer);
    v_day := extract(day from v_anchor)::integer;
    v_last_day := extract(day from (date_trunc('month', new.cycle_due_date) + interval '1 month - 1 day'))::integer;
    if v_months < 0 or v_months % v_step <> 0
       or extract(day from new.cycle_due_date)::integer <> least(v_day, v_last_day) then
      raise exception 'the cycle date is not a due date of this bill' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.bill_set_aside_before_write() from public, anon, authenticated;

create trigger bill_set_aside_before_write_trigger
  before insert or update on public.bill_set_asides
  for each row execute function private.bill_set_aside_before_write();


-- Pre-existing P07 defect fixed here (Ryan approved, 2026-11-19): the check-in trigger had the same re-stamping of
-- created_by/updated_by, blocking account deletion for an invited member who had saved a check-in. The function body
-- is the released 20261114110000 one with only the pass-through above added; owner, grants and trigger are unchanged.
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
    -- C6 (Ryan, 2026-11-14, original wording): not available only when the profile has no
    -- active income AND no expenses; otherwise income - expenses - debt minimums - employee
    -- retirement, which can be negative.
    new.planned_cash_flow := case
      when v_active_income > 0 or v_expense_rows > 0
        then v_income - v_expenses - v_debt_minimums - v_employee_retirement
      else null
    end;
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  else
    -- FFH-P11 (pre-freeze review, Ryan approved 2026-11-19): ON DELETE SET NULL from a deleted account only nulls an
    -- audit column; let it through as is. Re-stamping it pointed at the deleted account and failed the foreign key,
    -- so an invited member who had saved a check-in could not delete their account.
    if (new.created_by is null or new.updated_by is null)
       and (new.created_by is distinct from old.created_by or new.updated_by is distinct from old.updated_by)
       and (new.created_by is null or new.created_by = old.created_by)
       and (new.updated_by is null or new.updated_by = old.updated_by)
       and (to_jsonb(new) - 'created_by' - 'updated_by') = (to_jsonb(old) - 'created_by' - 'updated_by') then
      return new;
    end if;
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

alter table public.bill_set_asides enable row level security;
revoke all on public.bill_set_asides from anon;
grant select, insert, update, delete on public.bill_set_asides to authenticated;

create policy bill_set_asides_household_read on public.bill_set_asides
  for select to authenticated using (private.can_read_household(household_id));
create policy bill_set_asides_household_write_insert on public.bill_set_asides
  for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy bill_set_asides_household_write_update on public.bill_set_asides
  for update to authenticated using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy bill_set_asides_household_write_delete on public.bill_set_asides
  for delete to authenticated using (private.can_write_household_financials(household_id));

commit;
