import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSavingsGoal, fundingMonths } from "./goal-tracker.ts";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateGoalIntelligence } from "./money-priority-goal-intelligence.ts";

const TODAY = "2026-11-14";

test("G4: months left count whole calendar months, a part month as a full month", () => {
  assert.equal(fundingMonths(TODAY, "2026-12-14"), 1);
  assert.equal(fundingMonths(TODAY, "2026-12-15"), 2);
  assert.equal(fundingMonths(TODAY, "2026-11-30"), 1);
  assert.equal(fundingMonths(TODAY, "2026-11-15"), 1);
  assert.equal(fundingMonths(TODAY, "2027-11-14"), 12);
  assert.equal(fundingMonths(TODAY, TODAY), 0);
  assert.equal(fundingMonths(TODAY, "2026-01-01"), 0);
  assert.equal(fundingMonths("2026-01-31", "2026-02-28"), 1);
  assert.equal(fundingMonths(TODAY, "2026-02-30"), null);
});

test("G5/R1: monthly amount is remaining over months, rounded half-up to the cent", () => {
  const thirds = evaluateSavingsGoal({ targetAmount: 100, savedAmount: 0, targetDate: "2027-02-14" }, TODAY);
  assert.equal(thirds.status, "on_schedule_math");
  assert.equal(thirds.monthsLeft, 3);
  assert.equal(thirds.monthlyNeeded, 33.33);
  const half = evaluateSavingsGoal({ targetAmount: 0.05, savedAmount: 0, targetDate: "2027-01-14" }, TODAY);
  assert.equal(half.monthlyNeeded, 0.03); // 0.025 rounds half-up
  const big = evaluateSavingsGoal({ targetAmount: 12000, savedAmount: 2000.5, targetDate: "2027-11-14" }, TODAY);
  assert.equal(big.remainingAmount, 9999.5);
  assert.equal(big.monthlyNeeded, 833.29);
});

test("G6: a reached goal needs $0.00 a month whatever its date, and shows 100%", () => {
  for (const targetDate of [null, "2020-01-01", "2030-01-01"]) {
    const result = evaluateSavingsGoal({ targetAmount: 500, savedAmount: 750, targetDate }, TODAY);
    assert.equal(result.status, "reached");
    assert.equal(result.monthlyNeeded, 0);
    assert.equal(result.remainingAmount, 0);
    assert.equal(result.progressPercent, 100);
  }
});

test("G7/G8: no date or a passed date gives no monthly amount, never an invented one", () => {
  const noDate = evaluateSavingsGoal({ targetAmount: 500, savedAmount: 100, targetDate: null }, TODAY);
  assert.equal(noDate.status, "no_target_date");
  assert.equal(noDate.monthlyNeeded, null);
  for (const targetDate of [TODAY, "2026-11-13", "2025-01-01"]) {
    const passed = evaluateSavingsGoal({ targetAmount: 500, savedAmount: 100, targetDate }, TODAY);
    assert.equal(passed.status, "date_passed");
    assert.equal(passed.monthlyNeeded, null);
    assert.equal(passed.remainingAmount, 400);
  }
});

test("G9/R2: progress is a whole percent rounded down; money left is never 100%", () => {
  const p = (saved: number, target = 100) => evaluateSavingsGoal({ targetAmount: target, savedAmount: saved, targetDate: null }, TODAY).progressPercent;
  assert.equal(p(0), 0);
  assert.equal(p(29), 29); // 0.29 * 100 float error absorbed
  assert.equal(p(99.6), 99);
  assert.equal(p(99.99), 99);
  assert.equal(p(999999999999.98, 999999999999.99), 99);
  assert.equal(p(100), 100);
});

test("invalid amounts and dates fail closed", () => {
  assert.throws(() => evaluateSavingsGoal({ targetAmount: 0, savedAmount: 0, targetDate: null }, TODAY));
  assert.throws(() => evaluateSavingsGoal({ targetAmount: 10, savedAmount: -1, targetDate: null }, TODAY));
  assert.throws(() => evaluateSavingsGoal({ targetAmount: Number.NaN, savedAmount: 0, targetDate: null }, TODAY));
  assert.throws(() => evaluateSavingsGoal({ targetAmount: 10, savedAmount: 0, targetDate: "2026-13-01" }, TODAY));
  assert.throws(() => evaluateSavingsGoal({ targetAmount: 10, savedAmount: 0, targetDate: null }, "not-a-date"));
});

// Parity with the Money Priority Engine's own goal arithmetic (not modified by P07).
function engineResult(target: number, saved: number, targetDate: string | null, asOf: string) {
  const raw: MoneyPriorityRawSnapshot = {
    householdId: "h", people: [],
    income: [{ id: "income", name: "Income", monthly_amount: 8000, monthly_gross_amount: 10000, is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Required", category: "housing", monthly_amount: 4000, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [], debts: [], retirementAccounts: [], insuranceExposures: [], preferences: {},
    goals: [{
      id: "g", name: "Goal", target_amount: target, current_amount: saved, target_date: targetDate, priority: 3,
      goal_class: "other", necessity: "important", deadline_flexibility: "somewhat_flexible", consequence_level: "moderate",
      planned_monthly_contribution: null, core_need_amount: null, goal_intelligence_confirmed: true,
      underlying_need: null, desired_solution: null, goal_nature: "unknown", underfunding_consequence: null,
      borrowing_likelihood: null, expected_borrowing_amount: null, expected_borrowing_apr: null,
    }],
  };
  return evaluateGoalIntelligence(buildMoneyPrioritySnapshot(raw), asOf)[0];
}

test("parity: months and remaining match the engine; monthly amount is exact half-up", () => {
  const asOfs = ["2026-11-14", "2026-01-31", "2028-02-29", "2026-12-01"];
  const dates = [null, "2026-11-14", "2026-12-01", "2027-01-31", "2027-02-28", "2027-03-01", "2029-06-15", "2025-05-05"];
  const amounts: Array<[number, number]> = [[100, 0], [12000, 2000.5], [0.05, 0], [500, 750], [999.99, 333.33], [1000000, 1]];
  let compared = 0;
  let engineTieDiffs = 0;
  for (const asOf of asOfs) for (const date of dates) for (const [target, saved] of amounts) {
    const ours = evaluateSavingsGoal({ targetAmount: target, savedAmount: saved, targetDate: date }, asOf);
    const engine = engineResult(target, saved, date, asOf);
    assert.equal(ours.remainingAmount, engine.remainingTargetAmount, `remaining ${asOf} ${date} ${target}/${saved}`);
    assert.equal(ours.monthsLeft, engine.monthsRemaining, `months ${asOf} ${date}`);
    const months = engine.monthsRemaining;
    const remainingCents = Math.round(target * 100) - Math.round(saved * 100);
    const exact = remainingCents <= 0 ? 0 : months === null || months === 0 ? null
      : Math.floor((remainingCents * 2 + months) / (months * 2)) / 100;
    assert.equal(ours.monthlyNeeded, exact, `monthly ${asOf} ${date} ${target}/${saved}`);
    if (exact !== null && engine.requiredMonthlyFunding !== null && engine.requiredMonthlyFunding !== exact) {
      engineTieDiffs += 1;
      assert.ok(Math.abs(engine.requiredMonthlyFunding - exact) <= 0.0100001, "engine differs only by the one-cent tie flaw");
    }
    compared += 1;
  }
  assert.equal(compared, 4 * 8 * 6);
  // The grid includes $0.05 / 2 = 0.025, a tie the engine's float rounding gets right, so no difference here;
  // the F01 tie cases are covered above.
  assert.equal(engineTieDiffs, 0);
});

test("F01: exact half-cent ties round up (half-up), never down from float error", () => {
  const monthly = (target: number, saved = 0, date = "2027-01-14") =>
    evaluateSavingsGoal({ targetAmount: target, savedAmount: saved, targetDate: date }, TODAY).monthlyNeeded;
  assert.equal(monthly(4.27), 2.14); // 2.135
  assert.equal(monthly(4.35), 2.18); // 2.175
  assert.equal(monthly(4.77), 2.39); // 2.385
  assert.equal(monthly(1.01), 0.51); // 0.505
  assert.equal(monthly(0.01), 0.01); // 0.005
  assert.equal(monthly(999999999999.99, 0, "2027-01-14"), 500000000000); // 499,999,999,999.995
  assert.equal(monthly(100, 0, "2027-02-14"), 33.33); // 33.333…, below the tie
  assert.equal(monthly(200, 0, "2027-02-14"), 66.67); // 66.666…, above the tie
});

test("F04: progress is floored from exact cents, one cent below a boundary never rounds up", () => {
  const p = (saved: number, target: number) => evaluateSavingsGoal({ targetAmount: target, savedAmount: saved, targetDate: null }, TODAY).progressPercent;
  assert.equal(p(329999999.99, 1000000000), 32);
  assert.equal(p(330000000, 1000000000), 33);
  assert.equal(p(0.32, 1), 32);
  assert.equal(p(0.33, 1), 33);
  assert.equal(p(989999999999.99, 999999999999.99), 98);
  for (let cents = 1; cents < 1000; cents += 1) {
    assert.equal(p(cents / 100, 10), Math.floor(cents / 10), `saved ${cents / 100} of 10`);
  }
});

test("sub-cent amounts are refused", () => {
  assert.throws(() => evaluateSavingsGoal({ targetAmount: 10.005, savedAmount: 0, targetDate: null }, TODAY));
  assert.throws(() => evaluateSavingsGoal({ targetAmount: 10, savedAmount: 0.001, targetDate: null }, TODAY));
});
