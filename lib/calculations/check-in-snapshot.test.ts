import assert from "node:assert/strict";
import test from "node:test";
import { amountToCents, checkInNetWorth, currentUtcMonth, formatCents, isAllowedCheckInMonth, monthLabel } from "./check-in-snapshot.ts";
import { calculateFinancialSummary } from "./financial-summary.ts";

test("C5: net worth = assets − debts, exact to the cent", () => {
  const result = checkInNetWorth([
    { itemType: "account", amount: "1500.10" },
    { itemType: "account", amount: 0.2 },
    { itemType: "retirement_account", amount: 20000 },
    { itemType: "debt", amount: "4200.15" },
  ]);
  assert.deepEqual(result, { state: "complete", netWorthCents: BigInt(1730015), assetCents: BigInt(2150030), debtCents: BigInt(420015) });
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
  assert.equal(ours.state === "complete" && Number(ours.netWorthCents) / 100, dashboard.netWorth);
});

test("C4/C5: a blank balance is not $0 — net worth is incomplete and not shown", () => {
  assert.deepEqual(checkInNetWorth([
    { itemType: "account", amount: 100 }, { itemType: "debt", amount: null }, { itemType: "retirement_account", amount: "" },
  ]), { state: "incomplete", missingCount: 2 });
});

test("no lines is a complete $0 net worth (nothing in the profile to check)", () => {
  assert.deepEqual(checkInNetWorth([]), { state: "complete", netWorthCents: BigInt(0), assetCents: BigInt(0), debtCents: BigInt(0) });
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
  assert.equal(isAllowedCheckInMonth("1999-12", now), true); // F05: no minimum year
  assert.equal(isAllowedCheckInMonth("2024-10", now), true);
  assert.equal(isAllowedCheckInMonth("0000-01", now), false);
  assert.equal(isAllowedCheckInMonth("2026-1", now), false);
  assert.equal(monthLabel("2026-11"), "November 2026");
});

test("F03: totals beyond 2^53 cents stay exact (100 x $999,999,999,999.99)", () => {
  const result = checkInNetWorth(Array.from({ length: 100 }, () => ({ itemType: "account" as const, amount: "999999999999.99" })));
  assert.equal(result.state, "complete");
  assert.equal(result.state === "complete" && result.netWorthCents, BigInt("9999999999999900"));
  assert.equal(result.state === "complete" && formatCents(result.netWorthCents), "$99,999,999,999,999.00");
  const asNumbers = checkInNetWorth(Array.from({ length: 300 }, () => ({ itemType: "retirement_account" as const, amount: 999999999999.99 })));
  assert.equal(asNumbers.state === "complete" && asNumbers.netWorthCents, BigInt(99999999999999) * BigInt(300));
});

test("F03: negative account balances and debts, formatted exactly", () => {
  const result = checkInNetWorth([
    { itemType: "account", amount: "-999999999999.99" }, { itemType: "debt", amount: 999999999999.99 }, { itemType: "account", amount: "0.01" },
  ]);
  assert.equal(result.state === "complete" && formatCents(result.netWorthCents), "-$1,999,999,999,999.97");
  assert.equal(formatCents(BigInt(5)), "$0.05");
  assert.equal(formatCents(BigInt(-100)), "-$1.00");
});

test("amounts parse to exact cents and fail closed on sub-cent or malformed input", () => {
  assert.equal(amountToCents("12.3"), BigInt(1230));
  assert.equal(amountToCents("-0.07"), BigInt(-7));
  assert.equal(amountToCents(2500.55), BigInt(250055));
  for (const bad of ["12.345", "1e3", "", "abc", "1,000"]) assert.throws(() => amountToCents(bad), String(bad));
  assert.throws(() => amountToCents(12.345));
  assert.throws(() => amountToCents(Number.NaN));
});
