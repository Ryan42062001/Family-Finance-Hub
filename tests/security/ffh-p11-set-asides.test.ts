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
  assert.match(migration, /for share/);
  assert.match(migration, /v_recurrence not in \('quarterly', 'yearly'\) or v_anchor is null or v_payment is null or v_payment <= 0/);
  assert.match(migration, /new\.cycle_due_date < \(now\(\) at time zone 'utc'\)::date/);
  // No change to any bill amount, recurrence or the P09 derivation.
  assert.doesNotMatch(migration, /update public\.expenses|alter table public\.expenses (?!add constraint expenses_id_household_key)|monthly_amount|alter table public\.debts/i);
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
  // Every date the form showed is recomputed from the bill's current schedule.
  assert.match(actions, /firstCycleDue\(bill, todayUtc\(\)\) !== shownCycle/);
  assert.match(actions, /nextCycleDue\(bill, tracker, today\) !== shownNext/);
  assert.match(actions, /bill\.anchor !== expectedAnchor \|\| bill\.recurrence !== expectedRecurrence/);
  // The loader is scoped to the household too.
  assert.match(loader, /\.eq\("household_id", householdId\)/);
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
  assert.match(read("scripts/rls-local/preflight.sql"), /'20261119100000'/);
});
