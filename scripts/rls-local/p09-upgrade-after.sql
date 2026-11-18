-- FFH-P09 upgrade check, step 2: after the P09 migration every legacy amount is unchanged, back-filled as a monthly
-- payment of the same amount, and unscheduled (no invented due dates or reminders).
\set ON_ERROR_STOP on
DO $chk$
DECLARE b record;
BEGIN
  SELECT * INTO b FROM public.ffh_p09_before;
  IF (SELECT string_agg(name||':'||monthly_amount, ',' ORDER BY name) FROM public.expenses) IS DISTINCT FROM b.expenses THEN
    RAISE EXCEPTION 'P09_UPGRADE_EXPENSE_AMOUNTS_CHANGED'; END IF;
  IF (SELECT string_agg(name||':'||minimum_payment, ',' ORDER BY name) FROM public.debts) IS DISTINCT FROM b.debts THEN
    RAISE EXCEPTION 'P09_UPGRADE_DEBT_AMOUNTS_CHANGED'; END IF;
  IF EXISTS (SELECT 1 FROM public.expenses WHERE payment_amount <> monthly_amount OR recurrence <> 'monthly'
             OR due_anchor_date IS NOT NULL OR reminder_days IS NOT NULL) THEN
    RAISE EXCEPTION 'P09_UPGRADE_EXPENSE_BACKFILL_WRONG'; END IF;
  IF EXISTS (SELECT 1 FROM public.debts WHERE due_anchor_date IS NOT NULL OR reminder_days IS NOT NULL) THEN
    RAISE EXCEPTION 'P09_UPGRADE_DEBT_BACKFILL_WRONG'; END IF;
END
$chk$;
\echo P09_UPGRADE_PASS
