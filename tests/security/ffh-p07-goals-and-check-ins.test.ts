// FFH-P07 static contract checks. RLS behaviour itself is proven by scripts/rls-local/matrix.sql in CI.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/20261114100000_ffh_p07_goals_and_check_ins.sql", "utf8");
const actions = readFileSync("app/goals/actions.ts", "utf8");
const goalsPage = readFileSync("app/goals/page.tsx", "utf8");
const newCheckIn = readFileSync("app/goals/check-in/page.tsx", "utf8");
const checkInPage = readFileSync("app/goals/check-in/[id]/page.tsx", "utf8");
const context = readFileSync("lib/goals/context.ts", "utf8");

test("D1: the Money Priority Engine never reads the P07 tables", () => {
  const engineFiles = readdirSync("lib/calculations").filter((name) => name.startsWith("money-priority"));
  for (const file of [...engineFiles.map((name) => `lib/calculations/${name}`), "lib/supabase/money-priority-snapshot.ts", "lib/plan/plan-result.ts"]) {
    const source = readFileSync(file, "utf8");
    for (const table of ["savings_goals", "monthly_check_ins", "monthly_check_in_balances", "goal-tracker", "check-in-snapshot"]) {
      assert.ok(!source.includes(table), `${file} must not reference ${table}`);
    }
  }
  // P07 code never writes the engine's goals table or the Financial profile.
  for (const source of [actions, goalsPage, newCheckIn, checkInPage]) {
    assert.doesNotMatch(source, /from\("goals"\)/);
    assert.doesNotMatch(source, /from\("(accounts|retirement_accounts|debts|income_sources|expenses)"\)\.(insert|update|upsert|delete)/);
  }
});

test("P07 tables use the standard read/write household policies and no anon access", () => {
  for (const table of ["savings_goals", "monthly_check_ins", "monthly_check_in_balances"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`create policy ${table}_household_read on public\\.${table}\\s+for select to authenticated using \\(private\\.can_read_household\\(household_id\\)\\)`));
    for (const op of ["insert", "update", "delete"]) {
      assert.match(migration, new RegExp(`create policy ${table}_household_write_${op} on public\\.${table}\\s+for ${op} to authenticated`));
    }
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon`));
  }
  assert.equal((migration.match(/can_write_household_financials\(household_id\)/g) ?? []).length, 12);
  assert.doesNotMatch(migration, /\bto anon\b|\bto public\b|security definer/i);
});

test("C6/C8: the planned cash-flow snapshot is computed by the database and frozen", () => {
  assert.match(migration, /before insert or update on public\.monthly_check_ins/);
  for (const column of ["planned_monthly_income", "planned_monthly_expenses", "planned_debt_minimums", "planned_employee_retirement", "planned_cash_flow", "created_by", "created_at", "check_in_month"]) {
    assert.match(migration, new RegExp(`new\\.${column} := old\\.${column};`));
  }
  assert.match(migration, /when v_active_income > 0 and v_expense_rows > 0/);
  assert.match(migration, /check-in month cannot be in the future/);
  // The app never sends snapshot values.
  assert.doesNotMatch(actions, /planned_/);
});

test("check-in RPCs run as the caller, take the household from membership and are not executable by anon", () => {
  for (const fn of ["create_monthly_check_in", "update_monthly_check_in"]) {
    const start = migration.indexOf(`create or replace function public.${fn}(`);
    assert.ok(start >= 0);
    const body = migration.slice(start, migration.indexOf("$$;", start));
    assert.match(body, /security invoker/);
    assert.match(body, /set search_path = ''/);
    assert.match(body, /auth\.uid\(\)/);
  }
  assert.match(migration, /revoke all on function public\.create_monthly_check_in\(date, boolean, jsonb\) from public, anon, authenticated;/);
  assert.match(migration, /grant execute on function public\.create_monthly_check_in\(date, boolean, jsonb\) to authenticated;/);
  assert.doesNotMatch(migration.slice(migration.indexOf("create or replace function public.create_monthly_check_in")), /p_household/);
  assert.match(migration, /constraint monthly_check_in_balances_check_in_household_fkey\s+foreign key \(check_in_id, household_id\)/);
});

test("G10/C9: every write action requires an owner or member; viewers get read-only pages", () => {
  const exported = [...actions.matchAll(/export async function (\w+)/g)].map((match) => match[1]);
  assert.deepEqual(exported.sort(), ["addSavingsGoal", "createCheckIn", "deleteCheckIn", "deleteSavingsGoal", "updateCheckIn", "updateSavingsGoal"]);
  for (const name of exported) {
    const start = actions.indexOf(`export async function ${name}`);
    const body = actions.slice(start, start + 300);
    assert.match(body, /await editor\(\)/, `${name} must check the role first`);
  }
  assert.match(actions, /if \(!context\.canEdit\) finish\("read_only"\)/);
  assert.match(context, /canEdit: role === "owner" \|\| role === "member"/);
  assert.match(context, /\?\? "viewer"/);
  assert.match(newCheckIn, /if \(!canEdit\) redirect\("\/goals\?notice=read_only"\)/);
  for (const page of [goalsPage, checkInPage]) assert.match(page, /\{canEdit \?/);
  // Deletes need an explicit confirmation field.
  assert.equal((actions.match(/formData\.get\("confirm"\) !== "yes"/g) ?? []).length, 2);
});

test("C2/C4: line names come from the profile, blanks stay null, amounts are exact strings", () => {
  assert.match(actions, /name: String\(item\.name\)\.slice\(0, 100\)/);
  assert.match(actions, /value === null \? null : value\.toFixed\(2\)/);
  assert.doesNotMatch(actions, /formData\.get\(`name_/);
});

test("notices shown from the URL come from a fixed list", () => {
  for (const page of [goalsPage, newCheckIn, checkInPage]) assert.match(page, /goalsNotice\(\(await searchParams\)\.notice\)/);
});
