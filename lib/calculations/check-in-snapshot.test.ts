import assert from "node:assert/strict";
import test from "node:test";
import { checkInNetWorth, currentUtcMonth, isAllowedCheckInMonth, monthLabel } from "./check-in-snapshot.ts";
import { calculateFinancialSummary } from "./financial-summary.ts";

test("C5: net worth = assets − debts, exact to the cent", () => {
  const result = checkInNetWorth([
    { itemType: "account", amount: "1500.10" },
    { itemType: "account", amount: 0.2 },
    { itemType: "retirement_account", amount: 20000 },
    { itemType: "debt", amount: "4200.15" },
  ]);
  assert.deepEqual(result, { state: "complete", netWorth: 17300.15, assets: 21500.3, debts: 4200.15 });
});

test("C5: same formula as the dashboard's net worth", () => {
  const ours = checkInNetWorth([
    { itemType: "account", amount: 1200 }, { itemType: "account", amount: -50 },
    { itemType: "retirement_account", amount: 9000 }, { itemType: "debt", amount: 3000 },
  ]);
  const dashboard = calculateFinancialSummary({
    accountBalances: [1200, -50], retirementBalances: [9000], debtBalances: [3000],
    monthlyIncome: [], monthlyExpenses: [], monthlyDebtPayments: [], monthlyEmployeeRetirement: [], monthlyEmployerRetirement: [],
  });
  assert.equal(ours.state === "complete" && ours.netWorth, dashboard.netWorth);
});

test("C4/C5: a blank balance is not $0 — net worth is incomplete and not shown", () => {
  assert.deepEqual(checkInNetWorth([
    { itemType: "account", amount: 100 }, { itemType: "debt", amount: null }, { itemType: "retirement_account", amount: "" },
  ]), { state: "incomplete", missingCount: 2 });
});

test("no lines is a complete $0 net worth (nothing in the profile to check)", () => {
  assert.deepEqual(checkInNetWorth([]), { state: "complete", netWorth: 0, assets: 0, debts: 0 });
});

test("invalid amounts fail closed", () => {
  assert.throws(() => checkInNetWorth([{ itemType: "account", amount: "abc" }]));
  assert.throws(() => checkInNetWorth([{ itemType: "other" as never, amount: 1 }]));
});

test("C1: no future months; current UTC month and earlier allowed", () => {
  const now = new Date("2026-11-30T23:59:59Z");
  assert.equal(currentUtcMonth(now), "2026-11");
  assert.equal(isAllowedCheckInMonth("2026-11", now), true);
  assert.equal(isAllowedCheckInMonth("2026-10", now), true);
  assert.equal(isAllowedCheckInMonth("2026-12", now), false);
  assert.equal(isAllowedCheckInMonth("2026-13", now), false);
  assert.equal(isAllowedCheckInMonth("1999-12", now), false);
  assert.equal(isAllowedCheckInMonth("2026-1", now), false);
  assert.equal(monthLabel("2026-11"), "November 2026");
});
