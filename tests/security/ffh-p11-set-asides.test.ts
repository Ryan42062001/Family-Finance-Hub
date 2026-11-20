// FFH-P11 irregular-expense set-asides (issue #172): source-level security, isolation and financial-noninterference
// checks. Database behaviour itself is proved by the RLS matrix (scripts/rls-local/matrix.sql, P11 section) and the
// CI-only race test (scripts/rls-ci/test-set-aside-concurrency.sh).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261119100000_ffh_p11_bill_set_asides.sql");
const actions = read("app/bills/set-aside-actions.ts");
const component = read("app/bills/SetAsides.tsx");
const page = read("app/bills/page.tsx");
const loader = read("lib/supabase/set-asides.ts");

test("FFH-P11 migration: household-consistent FK, one tracker per bill, RLS through the session-gated helpers", () => {
  assert.match(migration, /alter table public\.expenses add constraint expenses_id_household_key unique \(id, household_id\)/);
  assert.match(migration, /foreign key \(expense_id, household_id\)\s+references public\.expenses\(id, household_id\) on delete cascade/);
  assert.match(migration, /constraint bill_set_asides_expense_key unique \(expense_id\)/);
  assert.match(migration, /check \(reserved_amount >= 0\)/);
  assert.match(migration, /reserved_amount numeric\(14,2\)/);
  assert.match(migration, /alter table public\.bill_set_asides enable row level security/);
  assert.match(migration, /revoke all on public\.bill_set_asides from anon/);
  for (const [cmd, helper] of [["select", "can_read_household"], ["insert", "can_write_household_financials"], ["update", "can_write_household_financials"], ["delete", "can_write_household_financials"]]) {
    assert.match(migration, new RegExp(`for ${cmd} to authenticated (using|with check) \\(private\\.${helper}\\(household_id\\)\\)`), cmd);
  }
  assert.match(migration, /security invoker/);
  assert.doesNotMatch(migration, /security definer|grant execute|disable row level security|to anon|bypassrls|service_role/i);
  assert.match(migration, /revoke all on function private\.bill_set_aside_before_write\(\) from public, anon, authenticated/);
  // The trigger owns the version and the identity columns, checks eligibility against the CURRENT bill and locks it.
  assert.match(migration, /new\.version := old\.version \+ 1/);
  // Pre-freeze review: an account's ON DELETE SET NULL on the audit columns passes through unchanged (else the FK
  // check would block deleting that account); anything else is a normal, version-bumped, re-stamped update.
  assert.match(migration, /\(new\.created_by is null or new\.updated_by is null\)[\s\S]{0,700}is not distinct from[\s\S]{0,300}then\s+return new;/);
  assert.match(migration, /for share/);
  assert.match(migration, /v_recurrence not in \('quarterly', 'yearly'\) or v_anchor is null or v_payment is null or v_payment <= 0/);
  assert.match(migration, /new\.cycle_due_date < \(now\(\) at time zone 'utc'\)::date/);
  // Ryan-approved P07 fix: the check-in trigger gets the same audit-only pass-through, nothing else changes.
  assert.match(migration, /create or replace function private\.monthly_check_in_before_write\(\)/);
  assert.match(migration, /\(to_jsonb\(new\) - 'created_by' - 'updated_by'\) = \(to_jsonb\(old\) - 'created_by' - 'updated_by'\) then\s+return new;/);
  const released = read("supabase/migrations/20261114110000_ffh_p07_cash_flow_availability.sql");
  const body = (src: string) => src.slice(src.indexOf("create or replace function private.monthly_check_in_before_write()"), src.indexOf("$$;", src.indexOf("create or replace function private.monthly_check_in_before_write()")))
    .replace(/\n    -- FFH-P11[\s\S]*?end if;\n/, "\n");
  assert.equal(body(migration), body(released), "only the pass-through is added to the released check-in trigger");
  // No change to any bill amount, recurrence or the P09 derivation.
  // (The released check-in trigger body, proven identical to 20261114110000 apart from the pass-through, is excluded.)
  const start = migration.indexOf("create or replace function private.monthly_check_in_before_write()");
  const withoutCheckIn = migration.slice(0, start) + migration.slice(migration.indexOf("$$;", start) + 3);
  assert.doesNotMatch(withoutCheckIn, /update public\.expenses|alter table public\.expenses (?!add constraint expenses_id_household_key)|monthly_amount|alter table public\.debts/i);
});

test("FFH-P11 audit remediation migration (P11-01..03): exact-cent CHECK, column-limited writes, every write revalidated", () => {
  const fix = read("supabase/migrations/20261120100000_ffh_p11_set_aside_integrity.sql");
  // P11-01: no silent rounding, no NaN/infinity, bounded, whole cents.
  assert.match(fix, /alter column reserved_amount type numeric,/);
  assert.match(fix, /reserved_amount <> 'NaN'::numeric\s+and reserved_amount >= 0\s+and reserved_amount <= 999999999999\.99\s+and reserved_amount = round\(reserved_amount, 2\)/);
  // P11-02: clients supply only input columns; id/version/audit columns stay with the database.
  assert.match(fix, /revoke insert, update on public\.bill_set_asides from authenticated;/);
  assert.match(fix, /grant insert \(household_id, expense_id, cycle_due_date, cycle_anchor_date, cycle_recurrence, reserved_amount\)/);
  assert.match(fix, /grant update \(cycle_due_date, cycle_anchor_date, cycle_recurrence, reserved_amount\)/);
  assert.match(fix, /new\.id is distinct from old\.id or new\.household_id is distinct from old\.household_id/);
  // P11-03: the bill check is no longer limited to inserts and cycle changes.
  assert.doesNotMatch(fix, /if tg_op = 'INSERT'\s+or new\.cycle_due_date is distinct from old\.cycle_due_date/);
  assert.match(fix, /for share;/);
  assert.match(fix, /security invoker/);
  assert.doesNotMatch(fix, /security definer|grant execute|to anon|disable row level security/i);
  assert.match(fix, /revoke all on function private\.bill_set_aside_before_write\(\) from public, anon, authenticated/);
  // The app's writes use only the granted columns.
  assert.doesNotMatch(actions, /(^|[^_a-z])(id|version|created_by|updated_by|created_at|updated_at)\s*:/m, "no write sends a database-owned column");
});

test("FFH-P11 financial noninterference: the plan, its snapshot, the engine and the exports never read set-asides", () => {
  for (const file of [
    "lib/calculations/money-priority-engine.ts", "lib/calculations/money-priority-snapshot.ts", "lib/supabase/money-priority-snapshot.ts",
    "lib/plan/plan-result.ts", "lib/plan/plan-csv.ts", "app/plan/steps-csv/route.ts", "app/plan/print/page.tsx", "app/plan/page.tsx",
    "lib/bills/bills-view.ts", "lib/supabase/bills.ts", "app/what-if/page.tsx", "app/dashboard/page.tsx",
  ]) {
    assert.doesNotMatch(read(file), /bill_set_asides|set-aside|setAside|SetAside/, file);
  }
  // Set-aside writes revalidate only the Bills page: nothing the plan shows can change.
  assert.match(actions, /revalidatePath\("\/bills"\)/);
  assert.doesNotMatch(actions, /revalidatePath\("\/(plan|dashboard|goals|what-if)/);
  // Nothing here writes a bill or any other table.
  assert.doesNotMatch(actions, /from\("(expenses|debts|goals|savings_goals|accounts)"\)\.(insert|update|delete|upsert)/);
  assert.equal((actions.match(/\.from\("expenses"\)/g) ?? []).length, 1, "the bill is only read (once, in loadBill)");
  assert.doesNotMatch(actions, /\.from\("expenses"\)\.(insert|update|delete|upsert)/);
});

test("FFH-P11 server actions: server-derived identity, owner/member only, guarded writes, no forged household", () => {
  assert.match(actions, /^"use server";/);
  assert.match(actions, /resolveScenarioHouseholdAuthority\(\)/);
  assert.match(actions, /authority\.role === "owner" \|\| authority\.role === "member"/);
  assert.doesNotMatch(actions, /formData\.get\("household/);
  assert.doesNotMatch(actions, /service_role|SERVICE_ROLE|createAdmin|supabaseAdmin/);
  // Every write is scoped to the server's household; updates and deletes are conditional on the version that was read.
  const writes = actions.split(/\.from\("bill_set_asides"\)/).slice(1);
  for (const w of writes) assert.match(w.slice(0, 600), /household_id/, "scoped to household");
  const guarded = actions.match(/\.(update|delete)\([^)]*\)[\s\S]{0,300}?\.eq\("version", version\)/g) ?? [];
  assert.equal(guarded.length, 3, "update, cycle confirmation and stop are all version-guarded");
  // A reported-amount update re-checks the current bill and tracker state (the version does not change when the bill
  // changes or a due date passes).
  assert.match(actions, /canUpdateReported\(evaluateSetAside\(bill, tracker, todayUtc\(\)\)\.status\)/);
  assert.match(component, /const editable = canUpdateReported\(r\.status\);/);
  // Every date the form showed is recomputed from the bill's current schedule.
  assert.match(actions, /firstCycleDue\(bill, todayUtc\(\)\) !== shownCycle/);
  assert.match(actions, /nextCycleDue\(bill, tracker, today\) !== shownNext/);
  assert.match(actions, /bill\.anchor !== expectedAnchor \|\| bill\.recurrence !== expectedRecurrence/);
  // The loader is scoped to the household too.
  assert.match(loader, /\.eq\("household_id", householdId\)/);
  // A read failure hides only the set-aside section (the page catches BillsDataError), never the P09 bills.
  assert.match(loader, /if \(error\) throw new BillsDataError\(/);
  assert.match(page, /setAsides = buildSetAsideSection\(view, await loadSetAsides\(supabase, authority\.householdId\), today\);\n    \} catch \(caught\) \{\n      if \(!\(caught instanceof BillsDataError\) && !\(caught instanceof RangeError\)\) throw caught;/);
});

test("FFH-P11 guided-input contract on the page: nothing pre-answered, blank is not $0, reported-amount wording", () => {
  assert.match(component, /required defaultValue=""/, "amount fields start blank and are required");
  assert.doesNotMatch(component, /defaultChecked|defaultValue=\{|value=\{r\.reservedCents|defaultValue="0"/, "no pre-filled amount or pre-ticked confirmation");
  assert.match(component, /name="confirm" value="yes" required/);
  assert.match(component, /Amount you&apos;ve reported as set aside/);
  assert.match(component, /Type 0 if you haven't set anything aside/);
  // Never presented as a verified balance, a transfer or a payment; no inferred "on track" / "paid" / "overdue".
  assert.doesNotMatch(component, /\bon track\b|overdue|verified|has been paid|marked (as )?paid|transferred/i);
  assert.doesNotMatch(component, /\bPaid\b/);
  assert.match(component, /doesn&apos;t know whether the bill was paid/);
  // Field-linked errors and focus restoration.
  assert.match(component, /aria-describedby=\{`\$\{id\}-hint\$\{isAmountError \? ` \$\{id\}-error` : ""\}`\}/);
  assert.match(component, /aria-invalid=\{isAmountError \|\| undefined\} autoFocus=\{isAmountError\}/);
  assert.match(component, /role="progressbar"[\s\S]{0,300}aria-valuetext=/);
  // URL feedback is allowlisted, never echoed.
  assert.match(page, /SET_ASIDE_ERRORS\.find\(\(e\) => e === params\.sa_error\)/);
  assert.match(page, /UUID\.test\(params\.sa_bill\)/);
  assert.match(page, /Object\.hasOwn\(SET_ASIDE_NOTICES, params\.sa_notice\)/);
});

test("FFH-P11 stays on the Bills page: no new navigation item", () => {
  for (const file of ["components/AppHeader.tsx", "components/MobileNavigation.tsx"]) {
    assert.doesNotMatch(read(file), /set-aside|Set-aside|set aside/i, file);
  }
});

test("FFH-P11 database tests are wired into CI", () => {
  const matrix = read("scripts/rls-local/matrix.sql");
  const runner = read("scripts/rls-ci/run-matrix.sh");
  assert.match(matrix, /DO \$p11\$/);
  assert.match(matrix, /'savings_goals','monthly_check_ins','monthly_check_in_balances','bill_set_asides'/, "zero-residue list includes the new table");
  assert.match(runner, /bash scripts\/rls-ci\/test-set-aside-concurrency\.sh "\$CONTAINER" "\$work"/);
  assert.match(read("scripts/rls-local/preflight.sql"), /'20261119100000','20261120100000'/);
});
