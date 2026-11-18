-- FFH-P09 Bills, due dates & exports (Owner-approved spec: GitHub issue #170).
--
-- Bills are the household's existing expenses and debts; nothing is duplicated.
--   * expenses gain the ACTUAL payment amount and how often it is paid (monthly / quarterly / yearly).
--     expenses.monthly_amount stays the one authoritative monthly figure every existing reader uses (Money Priority
--     Engine snapshot, P07 check-in snapshot). It is now DERIVED here, in exact cents, rounded UP:
--       monthly   -> payment_amount
--       quarterly -> ceil(payment_amount * 100 / 3) / 100
--       yearly    -> ceil(payment_amount * 100 / 12) / 100
--     ($100.00 yearly -> $8.34/month.) A CHECK constraint guarantees the two never disagree.
--   * Existing rows are back-filled as monthly with payment_amount = monthly_amount, so every saved amount and every
--     plan result is unchanged. Legacy writers that only send monthly_amount (guided setup RPC) keep working for
--     monthly rows; a monthly_amount-only change to a quarterly/yearly row is refused (no silent reinterpretation).
--   * expenses and debts gain an optional due-date anchor (the "next due date" the person entered; later
--     occurrences are computed from it, date-only) and an optional per-bill reminder shared by the household
--     (NULL = Off; 0 = on the due day; 1/3/7 days before). Debts are monthly only; their amount is minimum_payment.
--
-- No new tables, policies or callable functions: the columns inherit the existing household RLS on both tables
-- (read: can_read_household; write: can_write_household_financials = owner/member), all gated by
-- private.session_ok() since FFH-P08. The trigger function is not executable by any API role.
--
-- Safe for the released P08 app on the shared Supabase project: it still writes monthly_amount only, which the trigger
-- accepts for monthly rows (all rows it can create); only a monthly-only edit of a P09 quarterly/yearly row is refused.

begin;

alter table public.expenses
  add column payment_amount numeric(14,2),
  add column recurrence text not null default 'monthly',
  add column due_anchor_date date,
  add column reminder_days smallint;

-- Back-fill before the trigger exists: the planning amount of every saved expense stays exactly what it was.
update public.expenses set payment_amount = monthly_amount where payment_amount is null;

alter table public.expenses
  alter column payment_amount set not null,
  add constraint expenses_payment_amount_check check (payment_amount >= 0),
  add constraint expenses_recurrence_check check (recurrence in ('monthly', 'quarterly', 'yearly')),
  add constraint expenses_monthly_equivalent_check check (monthly_amount = case recurrence
    when 'monthly' then payment_amount
    when 'quarterly' then ceil(payment_amount * 100 / 3) / 100
    when 'yearly' then ceil(payment_amount * 100 / 12) / 100
  end),
  add constraint expenses_due_anchor_date_check check (due_anchor_date is null or due_anchor_date between date '2000-01-01' and date '2099-12-31'),
  add constraint expenses_reminder_days_check check (reminder_days is null or reminder_days in (0, 1, 3, 7)),
  add constraint expenses_reminder_needs_due_date_check check (reminder_days is null or due_anchor_date is not null);

alter table public.debts
  add column due_anchor_date date,
  add column reminder_days smallint,
  add constraint debts_due_anchor_date_check check (due_anchor_date is null or due_anchor_date between date '2000-01-01' and date '2099-12-31'),
  add constraint debts_reminder_days_check check (reminder_days is null or reminder_days in (0, 1, 3, 7)),
  add constraint debts_reminder_needs_due_date_check check (reminder_days is null or due_anchor_date is not null);

create or replace function private.expenses_derive_monthly_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.payment_amount is null then
      -- Legacy writer (monthly_amount only): only a monthly expense can be read that way.
      if new.recurrence is distinct from 'monthly' then
        raise exception 'payment_amount is required for a % expense', new.recurrence using errcode = '22023';
      end if;
      new.payment_amount := new.monthly_amount;
    end if;
  else
    if new.payment_amount is not distinct from old.payment_amount
       and new.recurrence is not distinct from old.recurrence
       and new.monthly_amount is distinct from old.monthly_amount then
      -- Legacy writer changed only the monthly figure.
      if new.recurrence is distinct from 'monthly' then
        raise exception 'change payment_amount, not monthly_amount, for a % expense', new.recurrence using errcode = '22023';
      end if;
      new.payment_amount := new.monthly_amount;
    end if;
  end if;
  if new.payment_amount is null or new.payment_amount < 0 then
    raise exception 'payment_amount must be zero or more' using errcode = '22023';
  end if;
  if new.recurrence is null or new.recurrence not in ('monthly', 'quarterly', 'yearly') then
    raise exception 'recurrence must be monthly, quarterly or yearly' using errcode = '22023';
  end if;
  new.monthly_amount := case new.recurrence
    when 'monthly' then new.payment_amount
    when 'quarterly' then ceil(new.payment_amount * 100 / 3) / 100
    else ceil(new.payment_amount * 100 / 12) / 100
  end;
  return new;
end;
$$;

revoke all on function private.expenses_derive_monthly_amount() from public, anon, authenticated;

create trigger expenses_derive_monthly_amount
  before insert or update on public.expenses
  for each row execute function private.expenses_derive_monthly_amount();

commit;
