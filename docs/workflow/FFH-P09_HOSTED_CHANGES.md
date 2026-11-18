# FFH-P09 hosted changes (Ryan only, each step separately authorized)

Preview and Production share one Supabase project. **Every step needs Ryan's explicit authorization; the Builder does
none of them.** Share only what is asked for (true/false, counts, parity rows, an error's first line), never ids,
emails, names or amounts.

**Order:** 1 → 2 → 3 before P09 Preview QA. No Auth settings, secrets or environment variables change in P09.

**Safe for today's Production app (P08, `2a62022`):** it still writes `monthly_amount` only. The migration back-fills
every existing expense as a monthly payment of the same amount (no amount changes, no due dates or reminders
invented) and accepts monthly-only writes for monthly expenses, which are the only kind the P08 app can create.
The one difference: if a quarterly/yearly expense created on the P09 Preview is edited in the P08 Production app,
that save is refused until P09 is released (synthetic QA data only).

## 1. Read-only pre-check (authorize: "P09 read-only check")

```sql
select
  (select count(*) from supabase_migrations.schema_migrations) as migrations_recorded,
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'expenses' and column_name = 'payment_amount') as already_applied,
  exists (select 1 from pg_trigger where tgrelid = 'public.expenses'::regclass and not tgisinternal) as expenses_has_trigger;
```

Expected: `25`, `false`, `false`. Anything else: STOP and report the row.

## 2. Apply migration `20261118120000` (authorize: "apply migration 20261118120000")

1. Open `supabase/migrations/20261118120000_ffh_p09_bills_due_dates.sql` at the **commit the Builder names** and use
   **Copy raw file**.
2. Paste the whole file into a new SQL Editor query exactly as it is (it starts with `begin;` and ends with
   `commit;`) and **Run**. Success: "Success. No rows returned." Any error rolls everything back; STOP and report
   the first line.
3. Record it: `insert into supabase_migrations.schema_migrations(version, name) values ('20261118120000', 'ffh_p09_bills_due_dates');`
4. Right away (before anyone uses the P09 Preview), confirm every existing row was kept as it was (expected `0`, `0`, `0`):

   ```sql
   select
     (select count(*) from public.expenses where payment_amount <> monthly_amount or recurrence <> 'monthly') as changed_expenses,
     (select count(*) from public.expenses where due_anchor_date is not null or reminder_days is not null) as invented_expense_schedules,
     (select count(*) from public.debts where due_anchor_date is not null or reminder_days is not null) as invented_debt_schedules;
   ```

5. **Always, before parity:** run `scripts/rls-local/strip-cr.sql` (raw file). Browser pastes turn line endings into
   CRLF, which changes stored function bodies and the `functions` fingerprint without changing behaviour; this
   re-creates only the affected functions without `\r` (owner, grants and settings kept; no table data touched;
   safe to re-run). Expected last row: `functions_with_cr_left = 0`.
6. Run `scripts/rls-local/parity.sql` and compare with `scripts/rls-local/parity.expected.txt` (must be 9/9 MATCH,
   migrations 26). Report the rows.

**Result (Ryan, 2026-11-18):** step 1 `25 | false | false`; step 2 applied and recorded, existing rows `0 | 0 | 0`;
parity 8/9 with `functions` differing because of CRLF in `private.expenses_derive_monthly_amount` (`has_cr = true`).
Repair: step 5, then parity again.

## 3. Preview (authorize: "P09 preview")

Vercel → Settings → Domains: point `family-finance-hub-preview.vercel.app` at `phase/ffh-p09-bills-exports`,
redeploy. The Builder then runs the Preview smoke test (12/12) and QA runs Q38–Q45 (plus the regression rows) with
TestA/TestB only.
