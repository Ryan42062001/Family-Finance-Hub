// FFH-P12 per-paycheck planning (issue #203): source-level security, isolation, guided-input and financial-
// noninterference checks. Database behaviour itself is proved by the RLS matrix (scripts/rls-local/matrix.sql, P12
// section, 84 probes) and the CI-only race test (scripts/rls-ci/test-pay-schedule-concurrency.sh).
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../../", import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), "utf8");
const migration = read("supabase/migrations/20261120200000_ffh_p12_income_pay_schedules.sql");
const actions = read("app/plan/paychecks/actions.ts");
const page = read("app/plan/paychecks/page.tsx");
const view = read("app/plan/paychecks/PaycheckPlanView.tsx");
const loader = read("lib/supabase/paychecks.ts");

function files(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? files(rel) : [rel];
  });
}

test("migration: P11 database-boundary contract (column grants, exact-cent CHECK on unconstrained numeric, every write revalidated)", () => {
  // 1. Column-limited client writes.
  assert.match(migration, /revoke all on public\.income_pay_schedules from anon, authenticated;/);
  assert.match(migration, /grant select, delete on public\.income_pay_schedules to authenticated;/);
  assert.match(migration, /grant insert \(household_id, income_source_id, frequency, expected_deposit_amount, next_expected_deposit_date,\s+semimonthly_day_one, semimonthly_day_two\)/);
  assert.match(migration, /grant update \(frequency, expected_deposit_amount, next_expected_deposit_date, semimonthly_day_one, semimonthly_day_two\)/);
  assert.doesNotMatch(migration, /grant (select, )?insert, update/);
  // 2. Money: unconstrained numeric with the form's rule (never numeric(14,2), which rounds).
  assert.match(migration, /expected_deposit_amount numeric not null/);
  assert.doesNotMatch(migration, /numeric\(14,\s*2\)/);
  for (const rule of [/expected_deposit_amount <> 'NaN'::numeric/, /expected_deposit_amount >= 0/, /expected_deposit_amount <= 999999999999\.99/, /expected_deposit_amount = round\(expected_deposit_amount, 2\)/]) {
    assert.match(migration, rule);
  }
  // The anchors CHECK can never evaluate to NULL (a NULL CHECK passes): explicit IS NOT NULL inside a CASE.
  assert.match(migration, /case when frequency = 'semimonthly'\s+then semimonthly_day_one is not null and semimonthly_day_two is not null/);
  // 3. Every write locks and revalidates the parent income; identity and version belong to the database.
  assert.match(migration, /from public\.income_sources i\s+where i\.id = new\.income_source_id and i\.household_id = new\.household_id\s+for share;/);
  assert.match(migration, /if not v_active then/);
  assert.match(migration, /new\.version := old\.version \+ 1/);
  assert.match(migration, /new\.household_id is distinct from old\.household_id/);
  assert.match(migration, /\(new\.created_by is null or new\.updated_by is null\)[\s\S]{0,900}is not distinct from[\s\S]{0,400}then\s+return new;/);
  // Household consistency and RLS through the session-gated helpers.
  assert.match(migration, /alter table public\.income_sources add constraint income_sources_id_household_key unique \(id, household_id\)/);
  assert.match(migration, /foreign key \(income_source_id, household_id\)\s+references public\.income_sources\(id, household_id\) on delete cascade/);
  assert.match(migration, /constraint income_pay_schedules_income_source_key unique \(income_source_id\)/);
  for (const [cmd, helper] of [["select", "can_read_household"], ["insert", "can_write_household_financials"], ["update", "can_write_household_financials"], ["delete", "can_write_household_financials"]]) {
    assert.match(migration, new RegExp(`for ${cmd} to authenticated (using|with check) \\(private\\.${helper}\\(household_id\\)\\)`), cmd);
  }
  assert.match(migration, /security invoker/);
  assert.doesNotMatch(migration, /security definer|grant execute|disable row level security|to anon|bypassrls|service_role/i);
  assert.match(migration, /revoke all on function private\.income_pay_schedule_before_write\(\) from public, anon, authenticated/);
  // 4. Direct-write probes exist for each rule.
  const matrix = read("scripts/rls-local/matrix.sql");
  for (const probe of ["nan-amount-refused", "sub-cent-amount-refused", "infinite-amount-refused", "client-id-on-insert-denied", "client-audit-on-insert-denied",
    "client-version-denied", "move-to-other-income-denied", "move-to-other-house-denied", "amount-edit-on-inactive-income-refused", "column-privileges-input-only",
    "semimonthly-without-days-refused", "forged-foreign-income-in-own-house-denied", "pending-2fa-reads-nothing", "other-financial-rows-unchanged-by-schedules"]) {
    assert.ok(matrix.includes(`pg_temp.ffh_p12_expect('${probe}'`), probe);
  }
});

test("only the paycheck page, its actions and loader touch the schedule table (financial noninterference)", () => {
  const allowed = new Set(["app/plan/paychecks/actions.ts", "lib/supabase/paychecks.ts"]);
  for (const file of [...files("app"), ...files("lib"), ...files("components")].filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts"))) {
    if (read(file).includes("income_pay_schedules")) assert.ok(allowed.has(file), `${file} must not read or write pay schedules`);
  }
  // The engine snapshot, check-in snapshot, plan exports, bills and set-asides never read it.
  for (const file of ["lib/supabase/money-priority-snapshot.ts", "lib/supabase/bills.ts", "lib/supabase/set-asides.ts", "app/plan/steps-csv/route.ts", "app/plan/print/page.tsx"]) {
    assert.doesNotMatch(read(file), /income_pay_schedules|paychecks/, file);
  }
  for (const sql of files("supabase/migrations").filter((f) => !f.includes("20261120200000"))) assert.doesNotMatch(read(sql), /income_pay_schedules/);
});

test("actions: session-derived household, owner/member only, version-guarded, write only the schedule facts", () => {
  assert.match(actions, /resolveScenarioHouseholdAuthority\(\)/);
  assert.match(actions, /authority\.role === "owner" \|\| authority\.role === "member"/);
  assert.doesNotMatch(actions, /formData\.get\("household_id"\)/);
  assert.match(actions, /household_id: householdId/);
  assert.match(actions, /\.eq\("version", version\)/);
  assert.match(actions, /incomeFingerprint\(income\) !== shownFingerprint/);
  // Writes go only to the schedule table; the income is only read.
  const writes = [...actions.matchAll(/from\("([a-z_]+)"\)\.(insert|update|delete|upsert)/g)].map((m) => m[1]);
  assert.ok(writes.length >= 1 && writes.every((t) => t === "income_pay_schedules"), String(writes));
  assert.match(actions, /from\("income_sources"\)\.select\(/);
  assert.doesNotMatch(actions, /from\("income_pay_schedules"\)\s*\n?\s*\.update\(facts\)\s*\n?\s*\.eq\("id", scheduleId\)(?![\s\S]{0,120}\.eq\("version")/);
  assert.doesNotMatch(actions + page + loader, /SERVICE_ROLE|service_role|createAdminClient/i);
  // Only the paycheck page is revalidated: nothing the plan reads changed.
  assert.deepEqual([...actions.matchAll(/revalidatePath\("([^"]+)"\)/g)].map((m) => m[1]), ["/plan/paychecks"]);
  assert.doesNotMatch(actions + view + page, /console\.(log|info|debug)/);
});

test("guided input: nothing pre-answered, blank never $0, net pay confirmed, nothing derived from the monthly amount", () => {
  assert.match(view, /<input type="radio" name="frequency" value=\{f\} required/);
  assert.doesNotMatch(view, /defaultChecked/);
  assert.match(view, /name="amount" type="text" inputMode="decimal" autoComplete="off" required defaultValue=""/);
  assert.match(view, /name="next_date" type="date"[^>]*defaultValue=""/);
  assert.match(view, /name="day_one" defaultValue=""/);
  assert.match(view, /name="net_confirm" value="yes" required/);
  assert.doesNotMatch(view, /defaultValue=\{(schedule|income)/);
  // Field-linked accessible errors.
  assert.match(view, /aria-invalid=\{err\("amount"\) \? true : undefined\}/);
  assert.match(view, /id=\{`\$\{base\}-\$\{field\}-error`\}/);
});

test("page: server authority, allowlisted URL feedback, entry from Your plan, no new navigation item", () => {
  assert.match(page, /if \(!authority\.authenticated\) redirect\("\/auth\/login"\)/);
  assert.match(page, /UUID\.test\(params\.ps_income\)/);
  assert.match(read("app/plan/page.tsx"), /href="\/plan\/paychecks">Plan the next paycheck</);
  for (const file of files("components").filter((f) => /nav|Nav|header|Header|Shell/.test(f))) assert.doesNotMatch(read(file), /\/plan\/paychecks/, file);
  // A paycheck problem never hides Your plan, and a missing table (before the hosted migration) fails closed honestly.
  assert.match(page, /PaySchedulesUnavailableError\) loaded = \{ kind: "unavailable", reason: "schedules" \}/);
  assert.doesNotMatch(read("app/plan/page.tsx"), /loadPaySchedules/);
  // Proxy still protects it (no public exception).
  assert.doesNotMatch(read("lib/supabase/proxy.ts"), /paychecks|zz-preview/);
});

test("wording never presents expected or recommended amounts as cash, payments or transfers", () => {
  assert.match(view, /not money in your account/);
  assert.match(view, /Due on payday: the deposit may not clear before this is due\./);
  assert.match(view, /Context only: it isn&apos;t checked against any account and isn&apos;t subtracted here\./);
  assert.doesNotMatch(view, /available balance|you can spend|has been (paid|transferred)/i);
});

test("CI wiring: pay-schedule race test runs in rls-matrix; e2e isolation visits the paycheck page", () => {
  const runner = read("scripts/rls-ci/run-matrix.sh");
  assert.match(runner, /bash scripts\/rls-ci\/test-pay-schedule-concurrency\.sh "\$CONTAINER" "\$work"/);
  const race = read("scripts/rls-ci/test-pay-schedule-concurrency.sh");
  assert.match(race, /GITHUB_ACTIONS:-\}" == "true"/);
  assert.match(race, /ZERO_RESIDUE=PASS/);
  assert.match(read("scripts/e2e/isolation.mjs"), /"\/plan\/paychecks"\]/);
  assert.match(read("scripts/rls-local/preflight.sql"), /'income_pay_schedules'/);
});
