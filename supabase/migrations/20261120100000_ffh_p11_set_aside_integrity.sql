-- FFH-P11 independent audit remediation (audit PASS at 694df32 with P11-01..03 MEDIUM; Ryan: "fix all of them now",
-- 2026-11-20). Hardens public.bill_set_asides at the database boundary so DIRECT authenticated API writes uphold the
-- same invariants as the app's forms. No data is changed; the released P10 app never reads this table.
--
-- P11-01  reserved_amount was numeric(14,2): sub-cent input was silently rounded and 'NaN' passed ">= 0". It becomes an
--         unconstrained numeric (binary-compatible, no table rewrite) with a CHECK that refuses NaN, negatives, values
--         above 999,999,999,999.99 and anything that is not a whole number of cents.
-- P11-02  Clients could write any column (id, audit columns, version, timestamps). Insert/update privileges are now
--         limited to the columns a person actually supplies; the trigger also refuses an id change. Referential
--         ON DELETE SET NULL (account deletion) runs as the table owner and still works through the existing
--         audit-only pass-through, which clients can no longer reach.
-- P11-03  A reserve-only edit skipped the bill check, so it could save against a cycle whose bill had just changed
--         schedule or become ineligible, or whose due date had just passed. Every insert and every non-pass-through
--         update now locks the bill row (FOR SHARE) and revalidates the cycle in the same transaction.

begin;

alter table public.bill_set_asides
  alter column reserved_amount type numeric,
  drop constraint bill_set_asides_reserved_amount_check,
  add constraint bill_set_asides_reserved_amount_check check (
    reserved_amount <> 'NaN'::numeric
    and reserved_amount >= 0
    and reserved_amount <= 999999999999.99
    and reserved_amount = round(reserved_amount, 2)
  );

revoke insert, update on public.bill_set_asides from authenticated;
grant insert (household_id, expense_id, cycle_due_date, cycle_anchor_date, cycle_recurrence, reserved_amount)
  on public.bill_set_asides to authenticated;
grant update (cycle_due_date, cycle_anchor_date, cycle_recurrence, reserved_amount)
  on public.bill_set_asides to authenticated;

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
    -- foreign key and so block that person's account deletion. Clients cannot reach this path: they have no UPDATE
    -- privilege on the audit columns (P11-02); referential actions run as the table owner.
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
    if new.id is distinct from old.id or new.household_id is distinct from old.household_id
       or new.expense_id is distinct from old.expense_id then
      raise exception 'a set-aside cannot be moved to another bill' using errcode = '22023';
    end if;
    new.version := old.version + 1;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();

  -- P11-03: every write (a new tracker, a confirmed cycle AND a reserve-only edit) is checked against the bill as it is
  -- now, with the bill row held until commit so a concurrent schedule change or delete cannot slip in between.
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
    raise exception 'this set-aside cycle has passed; confirm the next cycle first' using errcode = '22023';
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
  return new;
end;
$$;

revoke all on function private.bill_set_aside_before_write() from public, anon, authenticated;

commit;
