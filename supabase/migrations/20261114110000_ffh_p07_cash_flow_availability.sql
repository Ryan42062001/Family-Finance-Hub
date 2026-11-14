-- FFH-P07 rule C6 (Ryan, 2026-11-14): use the original approved wording. The planned
-- cash-flow snapshot is "not available" only when the Financial profile has no active income
-- AND no expenses (previously: unless it had active income AND at least one expense, the
-- dashboard's rule). Replaces the one trigger function body; owner, settings and the trigger
-- binding are unchanged. Existing check-ins are never recalculated (C8).

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
