-- FFH-P12 Per-Paycheck Financial Planning (Owner-approved design: GitHub issue #203).
--
-- One optional pay schedule per EXISTING income source. It stores only facts the household typed: how often the pay
-- arrives, the expected take-home (net) amount of one deposit, the next expected deposit date, and for twice-a-month
-- pay two day-of-month anchors. Everything else on the paycheck page (deposits, intervals, bills, plan-step shares,
-- shortfalls) is derived on each request. income_sources.monthly_amount stays the Money Priority Engine's authority:
-- nothing here reads, writes or replaces it, and no reader of the financial plan (engine snapshot, check-in snapshot,
-- exports, P09 bills, P10 purchase checks, P11 set-asides) reads this table.
--
-- Built to the P11-approved database-boundary contract for a new household table (.ai/DECISIONS.md, 2026-11-20), in
-- this FIRST migration:
--   1. clients may INSERT/UPDATE only the columns a person supplies; id, household/parent on update, version, audit
--      columns and timestamps belong to the database;
--   2. the amount is an unconstrained numeric with a CHECK equal to the form's rule (finite, not NaN, 0 to
--      999,999,999,999.99, whole cents), so a direct API write is refused, never rounded;
--   3. every insert and update locks the parent income source (FOR SHARE) and revalidates the whole row against it;
--   4. each rule has a direct authenticated write probe in scripts/rls-local/matrix.sql.
--
-- Household consistency: composite FK (income_source_id, household_id) -> income_sources(id, household_id), ON DELETE
-- CASCADE (deleting the income removes its schedule; no orphan); one schedule per income source. RLS: read = any
-- household member, write = owner/member (viewer read-only), through the existing helpers, which require
-- private.session_ok() (P08: live session, MFA when enrolled). The trigger function is not executable by API roles.
--
-- Safe for the released P11 app on the shared Supabase project (Preview and Production): it adds a table the released
-- app never reads, and a unique constraint on income_sources(id, household_id) that every existing row already
-- satisfies (id is the primary key). No existing row, column, policy, grant or function changes.

begin;

alter table public.income_sources add constraint income_sources_id_household_key unique (id, household_id);

create table public.income_pay_schedules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  income_source_id uuid not null,
  frequency text not null constraint income_pay_schedules_frequency_check
    check (frequency in ('weekly', 'biweekly', 'semimonthly', 'monthly', 'irregular')),
  expected_deposit_amount numeric not null constraint income_pay_schedules_amount_check check (
    expected_deposit_amount <> 'NaN'::numeric
    and expected_deposit_amount >= 0
    and expected_deposit_amount <= 999999999999.99
    and expected_deposit_amount = round(expected_deposit_amount, 2)
  ),
  next_expected_deposit_date date not null constraint income_pay_schedules_next_date_check
    check (next_expected_deposit_date between date '2000-01-01' and date '2099-12-31'),
  semimonthly_day_one smallint null,
  semimonthly_day_two smallint null,
  -- Written so it can never evaluate to NULL (a NULL CHECK result would pass): missing days are refused explicitly.
  constraint income_pay_schedules_days_check check (
    case when frequency = 'semimonthly'
      then semimonthly_day_one is not null and semimonthly_day_two is not null
        and semimonthly_day_one between 1 and 31 and semimonthly_day_two between 1 and 31
        and semimonthly_day_one < semimonthly_day_two
      else semimonthly_day_one is null and semimonthly_day_two is null
    end
  ),
  version integer not null default 1 constraint income_pay_schedules_version_check check (version >= 1),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint income_pay_schedules_income_source_key unique (income_source_id),
  constraint income_pay_schedules_income_source_household_fkey foreign key (income_source_id, household_id)
    references public.income_sources(id, household_id) on delete cascade
);
create index income_pay_schedules_household_idx on public.income_pay_schedules(household_id);

-- SECURITY INVOKER: the income source is read with the caller's own RLS and locked FOR SHARE until commit, so a
-- concurrent delete or deactivation cannot slip between this check and the write. Every write path (insert, any
-- update) is revalidated; the only exception is the account-deletion cascade nulling an audit column, which clients
-- cannot perform (no UPDATE privilege on those columns) and which changes nothing else.
create or replace function private.income_pay_schedule_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active boolean;
  v_today date := (now() at time zone 'utc')::date;
  v_year integer;
  v_month integer;
  v_last_day integer;
  v_day integer;
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.created_by := auth.uid();
    new.created_at := now();
  else
    if (new.created_by is null or new.updated_by is null)
       and (new.created_by is distinct from old.created_by or new.updated_by is distinct from old.updated_by)
       and (new.created_by is null or new.created_by = old.created_by)
       and (new.updated_by is null or new.updated_by = old.updated_by)
       and (new.id, new.household_id, new.income_source_id, new.frequency, new.expected_deposit_amount,
            new.next_expected_deposit_date, new.semimonthly_day_one, new.semimonthly_day_two, new.version,
            new.created_at, new.updated_at)
           is not distinct from (old.id, old.household_id, old.income_source_id, old.frequency,
            old.expected_deposit_amount, old.next_expected_deposit_date, old.semimonthly_day_one,
            old.semimonthly_day_two, old.version, old.created_at, old.updated_at) then
      return new;
    end if;
    if new.id is distinct from old.id or new.household_id is distinct from old.household_id
       or new.income_source_id is distinct from old.income_source_id then
      raise exception 'a pay schedule cannot be moved to another income' using errcode = '22023';
    end if;
    new.version := old.version + 1;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();

  select i.is_active into v_active
    from public.income_sources i
    where i.id = new.income_source_id and i.household_id = new.household_id
    for share;
  if not found then
    raise exception 'income source not found' using errcode = '42501';
  end if;
  if not v_active then
    raise exception 'only an active income source can have a pay schedule' using errcode = '22023';
  end if;

  -- The next expected date: from yesterday (UTC) through 366 days ahead whenever it is set or changed (the form's rule).
  if (tg_op = 'INSERT' or new.next_expected_deposit_date is distinct from old.next_expected_deposit_date)
     and (new.next_expected_deposit_date < v_today - 1 or new.next_expected_deposit_date > v_today + 366) then
    raise exception 'the next expected deposit date is outside the allowed window' using errcode = '22023';
  end if;

  -- Twice a month: the next date must be one of the two paydays (each clamped to that month's length). Missing or
  -- invalid days are refused by income_pay_schedules_days_check (LEAST would skip a NULL, so don't decide that here).
  if new.frequency = 'semimonthly' and new.semimonthly_day_one is not null and new.semimonthly_day_two is not null then
    v_year := extract(year from new.next_expected_deposit_date)::integer;
    v_month := extract(month from new.next_expected_deposit_date)::integer;
    v_last_day := extract(day from (make_date(v_year, v_month, 1) + interval '1 month - 1 day'))::integer;
    v_day := extract(day from new.next_expected_deposit_date)::integer;
    if v_day <> least(new.semimonthly_day_one, v_last_day) and v_day <> least(new.semimonthly_day_two, v_last_day) then
      raise exception 'the next deposit date is not one of the paydays' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.income_pay_schedule_before_write() from public, anon, authenticated;

create trigger income_pay_schedule_before_write_trigger
  before insert or update on public.income_pay_schedules
  for each row execute function private.income_pay_schedule_before_write();

alter table public.income_pay_schedules enable row level security;
revoke all on public.income_pay_schedules from anon, authenticated;
grant select, delete on public.income_pay_schedules to authenticated;
grant insert (household_id, income_source_id, frequency, expected_deposit_amount, next_expected_deposit_date,
              semimonthly_day_one, semimonthly_day_two)
  on public.income_pay_schedules to authenticated;
grant update (frequency, expected_deposit_amount, next_expected_deposit_date, semimonthly_day_one, semimonthly_day_two)
  on public.income_pay_schedules to authenticated;

create policy income_pay_schedules_household_read on public.income_pay_schedules
  for select to authenticated using (private.can_read_household(household_id));
create policy income_pay_schedules_household_write_insert on public.income_pay_schedules
  for insert to authenticated with check (private.can_write_household_financials(household_id));
create policy income_pay_schedules_household_write_update on public.income_pay_schedules
  for update to authenticated using (private.can_write_household_financials(household_id))
  with check (private.can_write_household_financials(household_id));
create policy income_pay_schedules_household_write_delete on public.income_pay_schedules
  for delete to authenticated using (private.can_write_household_financials(household_id));

commit;
