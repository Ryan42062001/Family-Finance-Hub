-- FFH-P05 review fix (HIGH 2): the guided setup's "household is empty" check and all of
-- its writes run in ONE transaction, serialized per household by a transaction-scoped
-- advisory lock. Two simultaneous submissions can no longer both write: the second
-- waits, then sees the first one's records and saves nothing. Any failure rolls back
-- every write, so setup is all-or-nothing.
--
-- SECURITY INVOKER: every read and write runs with the caller's own permissions and the
-- existing RLS policies (a viewer, an outsider or another household cannot write).
-- The household is never taken from the caller's input: it is the caller's own oldest
-- household, the same one the app uses. All answers are validated again here.
--
-- FFH-P05 review fix (HIGH 1, Ryan 2026-11-13): savings are recorded only with an
-- explicit purpose chosen by the person (protected_reserve, unallocated or
-- operating_cash). "Not sure" means the app sends no savings and nothing is guessed.
create or replace function public.complete_household_setup(
  p_take_home numeric,
  p_fixed_bills numeric,
  p_other_spending numeric,
  p_debt_balance numeric,
  p_debt_minimum numeric,
  p_debt_rate numeric,
  p_savings numeric,
  p_savings_purpose text,
  p_simple_view boolean
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
  v_max constant numeric := 999999999999.99;
begin
  if v_user is null then
    raise exception 'permission denied: not signed in' using errcode = '42501';
  end if;

  -- Validate every answer before reading or writing anything.
  if p_take_home is null or p_fixed_bills is null or p_other_spending is null or p_simple_view is null then
    raise exception 'setup: a required answer is missing' using errcode = '22023';
  end if;
  if p_take_home < 0 or p_take_home > v_max or p_fixed_bills < 0 or p_fixed_bills > v_max
     or p_other_spending < 0 or p_other_spending > v_max then
    raise exception 'setup: an amount is out of range' using errcode = '22023';
  end if;
  if (p_debt_balance is not null and (p_debt_balance < 0 or p_debt_balance > v_max))
     or (p_debt_minimum is not null and (p_debt_minimum < 0 or p_debt_minimum > v_max))
     or (p_debt_rate is not null and (p_debt_rate < 0 or p_debt_rate > 100)) then
    raise exception 'setup: a debt answer is out of range' using errcode = '22023';
  end if;
  if coalesce(p_debt_balance, 0) > 0 and p_debt_minimum is null then
    raise exception 'setup: a debt needs its monthly minimum' using errcode = '22023';
  end if;
  if coalesce(p_debt_balance, 0) = 0 and (p_debt_minimum is not null or p_debt_rate is not null) then
    raise exception 'setup: debt details need a debt balance' using errcode = '22023';
  end if;
  if p_savings is not null and (p_savings < 0 or p_savings > v_max) then
    raise exception 'setup: savings is out of range' using errcode = '22023';
  end if;
  if coalesce(p_savings, 0) > 0
     and (p_savings_purpose is null or p_savings_purpose not in ('protected_reserve', 'unallocated', 'operating_cash')) then
    raise exception 'setup: savings needs a chosen purpose' using errcode = '22023';
  end if;
  if coalesce(p_savings, 0) = 0 and p_savings_purpose is not null then
    raise exception 'setup: a savings purpose needs a savings amount' using errcode = '22023';
  end if;

  -- The caller's own oldest household (visible only through the caller's membership).
  select h.id into v_household
  from public.households h
  join public.household_members m on m.household_id = h.id and m.user_id = v_user
  order by h.created_at, h.id
  limit 1;
  if v_household is null then
    raise exception 'permission denied: no household for this user' using errcode = '42501';
  end if;

  -- One setup at a time per household; released automatically at commit or rollback.
  perform pg_advisory_xact_lock(hashtextextended('ffh-setup:' || v_household::text, 0));

  -- Never runs on a household that already has records: nothing is written.
  if exists (select 1 from public.income_sources where household_id = v_household)
     or exists (select 1 from public.expenses where household_id = v_household)
     or exists (select 1 from public.debts where household_id = v_household)
     or exists (select 1 from public.accounts where household_id = v_household) then
    return 'already_set_up';
  end if;

  if p_take_home > 0 then
    insert into public.income_sources (household_id, name, monthly_amount)
    values (v_household, 'Take-home pay (from setup)', p_take_home);
  end if;
  if p_fixed_bills > 0 then
    insert into public.expenses (household_id, name, category, monthly_amount, is_essential)
    values (v_household, 'Fixed bills and must-haves (from setup)', 'other', p_fixed_bills, true);
  end if;
  if p_other_spending > 0 then
    insert into public.expenses (household_id, name, category, monthly_amount, is_essential)
    values (v_household, 'Other spending (from setup)', 'personal', p_other_spending, false);
  end if;
  if coalesce(p_debt_balance, 0) > 0 then
    insert into public.debts (household_id, name, debt_type, current_balance, minimum_payment, interest_rate)
    values (v_household, 'Debts (from setup)', 'other', p_debt_balance, p_debt_minimum, p_debt_rate);
  end if;
  if coalesce(p_savings, 0) > 0 then
    insert into public.accounts (household_id, name, account_type, balance, cash_purpose)
    values (v_household, 'Savings (from setup)', 'savings', p_savings, p_savings_purpose);
  end if;
  if p_simple_view then
    insert into public.profiles (id, simple_mode) values (v_user, true)
    on conflict (id) do update set simple_mode = true, updated_at = now();
  end if;

  return 'saved';
end;
$$;

revoke all on function public.complete_household_setup(numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, boolean) from public, anon, authenticated;
grant execute on function public.complete_household_setup(numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, boolean) to authenticated;
