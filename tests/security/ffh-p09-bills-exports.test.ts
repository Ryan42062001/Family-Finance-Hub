// FFH-P09 bills, due dates & exports (issue #170): source-level security and financial-invariant checks.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { expensePaymentInput, keepAnchorIfUnchanged, scheduleInput } from "../../lib/bills/form.ts";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261118120000_ffh_p09_bills_due_dates.sql");
const csvRoute = read("app/plan/steps-csv/route.ts");
const printPage = read("app/plan/print/page.tsx");
const billsPage = read("app/bills/page.tsx");
const billsActions = read("app/bills/actions.ts");
const profileActions = read("app/financial-profile/actions.ts");
const header = read("components/AppHeader.tsx");
const mobileNav = read("components/MobileNavigation.tsx");
const engineFiles = ["lib/calculations/money-priority-engine.ts", "lib/calculations/money-priority-snapshot.ts", "lib/supabase/money-priority-snapshot.ts"];

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

test("FFH-P09 migration: back-fill before the trigger, derived monthly amount, no new policies or callable functions", () => {
  const backfill = migration.indexOf("update public.expenses set payment_amount = monthly_amount");
  const trigger = migration.indexOf("create trigger expenses_derive_monthly_amount");
  assert.ok(backfill > 0 && trigger > backfill, "legacy rows are back-filled before the trigger exists");
  assert.match(migration, /ceil\(new\.payment_amount \* 100 \/ 3\) \/ 100/);
  assert.match(migration, /ceil\(new\.payment_amount \* 100 \/ 12\) \/ 100/);
  assert.match(migration, /expenses_monthly_equivalent_check/);
  assert.match(migration, /revoke all on function private\.expenses_derive_monthly_amount\(\) from public, anon, authenticated/);
  assert.doesNotMatch(migration, /create policy|grant execute|security definer|disable row level security/i);
  assert.doesNotMatch(migration, /alter table public\.debts[\s\S]*minimum_payment/i, "debt minimum payments are not changed");
  assert.match(migration, /reminder_days in \(0, 1, 3, 7\)/);
});

test("FFH-P09 Money Priority Engine and snapshot are untouched by P09 (monthly_amount stays the one input)", () => {
  for (const file of engineFiles) {
    const src = read(file);
    assert.doesNotMatch(src, /payment_amount|recurrence|due_anchor_date|reminder_days/, file);
  }
});

test("FFH-P09 expense form parsing: strict cents and recurrence; nothing sends monthly_amount", () => {
  assert.deepEqual(expensePaymentInput(form({ payment_amount: "100", recurrence: "yearly" })), { payment_amount: "100.00", recurrence: "yearly" });
  assert.deepEqual(expensePaymentInput(form({ payment_amount: "0.07", recurrence: "quarterly" })), { payment_amount: "0.07", recurrence: "quarterly" });
  for (const bad of [{ payment_amount: "1.005", recurrence: "monthly" }, { payment_amount: "-5", recurrence: "monthly" }, { payment_amount: "5", recurrence: "weekly" }, { payment_amount: "", recurrence: "monthly" }]) {
    assert.throws(() => expensePaymentInput(form(bad)), JSON.stringify(bad));
  }
  const addExpense = profileActions.slice(profileActions.indexOf("export async function addExpense"), profileActions.indexOf("export async function addDebt"));
  const updateExpense = profileActions.slice(profileActions.indexOf("export async function updateExpense"), profileActions.indexOf("export async function updateDebt"));
  for (const body of [addExpense, updateExpense]) {
    assert.match(body, /expensePaymentInput\(formData\)/);
    assert.doesNotMatch(body, /monthly_amount:|amount\(formData, "monthly_amount"/);
  }
  // A recurrence change needs the confirmation, and the write is conditional on the recurrence that was checked.
  assert.match(updateExpense, /current\.recurrence !== payment\.recurrence && formData\.get\("confirm_recurrence"\) !== "on"/);
  assert.match(updateExpense, /\.eq\("recurrence", current\.recurrence\)/);
});

test("FFH-P09 schedule parsing: allowed dates and reminders only; a reminder needs a date; anchors are kept", () => {
  assert.deepEqual(scheduleInput(form({ due_date: "2026-01-31", reminder: "3" })), { due_anchor_date: "2026-01-31", reminder_days: 3 });
  assert.deepEqual(scheduleInput(form({ due_date: "", reminder: "7" })), { due_anchor_date: null, reminder_days: null });
  assert.deepEqual(scheduleInput(form({ due_date: "2026-01-31", reminder: "off" })), { due_anchor_date: "2026-01-31", reminder_days: null });
  for (const bad of [{ due_date: "2026-02-30", reminder: "off" }, { due_date: "1999-12-31", reminder: "off" }, { due_date: "2026-01-31", reminder: "2" }, { due_date: "2026-01-31T00:00", reminder: "off" }]) {
    assert.throws(() => scheduleInput(form(bad)), JSON.stringify(bad));
  }
  // The form shows Feb 28 for a Jan 31 monthly anchor; saving it unchanged keeps Jan 31.
  assert.deepEqual(keepAnchorIfUnchanged({ due_anchor_date: "2026-02-28", reminder_days: 1 }, "2026-01-31", "monthly", "2026-02-10"), { due_anchor_date: "2026-01-31", reminder_days: 1 });
  assert.deepEqual(keepAnchorIfUnchanged({ due_anchor_date: "2027-02-28", reminder_days: null }, "2024-02-29", "yearly", "2026-03-01"), { due_anchor_date: "2024-02-29", reminder_days: null });
  assert.deepEqual(keepAnchorIfUnchanged({ due_anchor_date: "2026-02-27", reminder_days: null }, "2026-01-31", "monthly", "2026-02-10"), { due_anchor_date: "2026-02-27", reminder_days: null });
  assert.deepEqual(keepAnchorIfUnchanged({ due_anchor_date: "2026-02-28", reminder_days: null }, null, "monthly", "2026-02-10"), { due_anchor_date: "2026-02-28", reminder_days: null });
});

test("FFH-P09 Bills action: server-side identity and household, owner/member only, no amounts written", () => {
  assert.match(billsActions, /resolveScenarioHouseholdAuthority\(\)/);
  assert.match(billsActions, /authority\.role !== "owner" && authority\.role !== "member"/);
  assert.match(billsActions, /\.eq\("household_id", authority\.householdId\)/);
  assert.doesNotMatch(billsActions, /formData\.get\("household/);
  assert.doesNotMatch(billsActions, /payment_amount|monthly_amount|minimum_payment|service_role|SERVICE_ROLE/);
  assert.match(billsPage, /const canEdit = authority\.role === "owner" \|\| authority\.role === "member"/);
  assert.match(billsPage, /Object\.hasOwn\(ERRORS, params\.error\)/);
});

test("FFH-P09 exports: authenticated, private no-store, server-resolved household, no ids or technical text", () => {
  assert.match(csvRoute, /"Cache-Control": "private, no-store"/);
  assert.match(csvRoute, /resolveScenarioHouseholdAuthority\(\)/);
  assert.match(csvRoute, /if \(!authority\.authenticated\) return refuse\(401/);
  assert.match(csvRoute, /planStepsCsv\(plan\.view\)/);
  assert.doesNotMatch(csvRoute, /searchParams|request\.url|household_id=|email/i);
  assert.doesNotMatch(read("lib/plan/plan-csv.ts"), /step\.id\b|step\.technical|\.email\b/);
  assert.match(printPage, /resolveScenarioHouseholdAuthority\(\)/);
  assert.doesNotMatch(printPage, /step\.technical|signedInEmail|claims/);
  assert.match(read("app/globals.css"), /@media print \{[\s\S]*\.site-header[\s\S]*display: none/);
});

test("FFH-P09 navigation: account-menu entry, no new bottom-mobile tab", () => {
  assert.match(header, /href="\/bills">Bills &amp; due dates/);
  assert.doesNotMatch(mobileNav, /\/bills/);
});

test("FFH-P09 hosted paste repair: strips CR from FFH functions only, via their own definitions, no table data", () => {
  const strip = read("scripts/rls-local/strip-cr.sql");
  assert.match(strip, /n\.nspname in \('public', 'private'\)/);
  assert.match(strip, /deptype = 'e'/);
  assert.match(strip, /execute replace\(pg_get_functiondef\(f\.oid\), E'\\r', ''\)/);
  assert.doesNotMatch(strip, /\b(insert|update|delete|truncate|drop|grant|revoke)\b/i);
  assert.match(read("docs/workflow/FFH-P09_HOSTED_CHANGES.md"), /Always, before parity/);
});

test("FFH-P09 QA #180: bills screens never say paid, unpaid or overdue (no payment status is implied)", () => {
  const ui = ["app/bills/page.tsx", "app/bills/actions.ts", "components/bills/PaymentAmountFields.tsx", "components/bills/UpcomingBillsSummary.tsx", "app/plan/print/page.tsx"];
  for (const file of ui) {
    const code = read(file).split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");
    assert.doesNotMatch(code, /\b(paid|unpaid|overdue)\b/i, file);
  }
});

test("FFH-P09 QA #182: the mobile account menu's full-width rule targets Sign out only, not the Simple view switch", () => {
  const css = read("app/globals.css");
  assert.doesNotMatch(css, /\.mobile-account-menu form button\{width:100%\}/, "an unscoped form-button rule stretches the switch");
  assert.match(css, /\.mobile-account-menu form button\.nav-sign-out\{width:100%\}/);
  assert.match(css, /\.mobile-account-menu \.simple-mode-switch span\{margin-bottom:0\}/);
  assert.match(css, /\.simple-mode-toggle\{position:relative;flex:0 0 auto;width:46px;height:26px/);
});
