-- Phase checks for migration 20261118120000 (FFH-P09), run inside the one-paste hosted apply file.
-- Format: ONE SELECT returning (check_name text, ok boolean). Aggregate counts only; never select household rows.
select 'existing expenses kept their monthly amount' as check_name,
       not exists (select 1 from public.expenses where payment_amount <> monthly_amount or recurrence <> 'monthly') as ok
union all
select 'no due dates or reminders invented on expenses',
       not exists (select 1 from public.expenses where due_anchor_date is not null or reminder_days is not null)
union all
select 'no due dates or reminders invented on debts',
       not exists (select 1 from public.debts where due_anchor_date is not null or reminder_days is not null)
