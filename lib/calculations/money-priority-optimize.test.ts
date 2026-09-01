import test from "node:test";
import assert from "node:assert/strict";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateBuildStage } from "./money-priority-build.ts";
import { evaluateOptimizeStage } from "./money-priority-optimize.ts";

function snapshot(overrides: Record<string, unknown> = {}) {
  return buildMoneyPrioritySnapshot({
    householdId: "h1",
    people: [],
    income: [{ id: "i1", name: "Job", monthly_amount: 6000, monthly_gross_amount: 8000, is_active: true }],
    expenses: [{ id: "e1", name: "Housing", category: "housing", monthly_amount: 2000, is_essential: true }],
    accounts: [],
    debts: [],
    retirementAccounts: [{ id: "r1", name: "401k", account_type: "401k", balance: 10000, monthly_employee_contribution: 960, monthly_employer_contribution: 0, match_status: "fully_captured" }],
    goals: [],
    insuranceExposures: [{ id: "x1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { debt_vs_investing: "balanced", job_replacement_difficulty: "easy" },
    ...overrides,
  });
}

function buildFor(value: ReturnType<typeof snapshot>) {
  return evaluateBuildStage(value, "2026-08-29");
}

test("balanced 5% mortgage produces a split decision", () => {
  const value = snapshot({ debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 5, minimum_payment: 1200, rate_type: "fixed" }] });
  const result = evaluateOptimizeStage(value, buildFor(value), true);
  assert.equal(result.recommendations[0]?.decision, "split");
});

test("mortgage at 6% or above favors payoff", () => {
  const value = snapshot({ debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 6.5, minimum_payment: 1200, rate_type: "fixed" }] });
  const result = evaluateOptimizeStage(value, buildFor(value), true);
  assert.equal(result.recommendations[0]?.decision, "pay_debt");
});

test("sub-4% ordinary debt favors investing", () => {
  const value = snapshot({ debts: [{ id: "d1", name: "Auto", debt_type: "auto_loan", current_balance: 10000, interest_rate: 3, minimum_payment: 300, rate_type: "fixed" }] });
  const result = evaluateOptimizeStage(value, buildFor(value), true);
  assert.equal(result.recommendations[0]?.decision, "invest");
});

test("debt-focused preference moves a split mortgage one posture toward payoff", () => {
  const value = snapshot({
    debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 5, minimum_payment: 1200, rate_type: "fixed" }],
    preferences: { debt_vs_investing: "debt_focused", job_replacement_difficulty: "easy" },
  });
  const result = evaluateOptimizeStage(value, buildFor(value), true);
  assert.equal(result.recommendations[0]?.decision, "pay_debt");
});

test("growth-focused preference moves a split mortgage one posture toward investing", () => {
  const value = snapshot({
    debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 5, minimum_payment: 1200, rate_type: "fixed" }],
    preferences: { debt_vs_investing: "growth_focused", job_replacement_difficulty: "easy" },
  });
  const result = evaluateOptimizeStage(value, buildFor(value), true);
  assert.equal(result.recommendations[0]?.decision, "invest");
});

test("locked Optimize stage analyzes but allocates no dollars", () => {
  const value = snapshot({ debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 5, minimum_payment: 1200, rate_type: "fixed" }] });
  const result = evaluateOptimizeStage(value, buildFor(value), false);
  assert.equal(result.totalDebtAllocation, 0);
  assert.equal(result.totalInvestingAllocation, 0);
  assert.equal(result.recommendations[0]?.state, "worth_considering");
});

test("split allocation never exceeds residual Build capacity", () => {
  const value = snapshot({ debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: 5, minimum_payment: 1200, rate_type: "fixed" }] });
  const build = buildFor(value);
  const result = evaluateOptimizeStage(value, build, true);
  assert.equal(result.totalDebtAllocation + result.totalInvestingAllocation, build.remainingMonthlyCapacity);
});

test("missing mortgage APR requests information instead of guessing", () => {
  const value = snapshot({ debts: [{ id: "m1", name: "Mortgage", debt_type: "mortgage", current_balance: 150000, interest_rate: null, minimum_payment: 1200, rate_type: "fixed" }] });
  const result = evaluateOptimizeStage(value, buildFor(value), true);
  assert.equal(result.recommendations[0]?.decision, "more_information_needed");
  assert.equal(result.recommendations[0]?.state, "more_information_needed");
});

test("equal-APR debt allocation uses stable ID and ignores display-name changes", () => {
  const debts = [
    { id: "debt-a", name: "Zulu", debt_type: "mortgage", current_balance: 150000, interest_rate: 6, minimum_payment: 1000, rate_type: "fixed" },
    { id: "debt-b", name: "Alpha", debt_type: "mortgage", current_balance: 150000, interest_rate: 6, minimum_payment: 1000, rate_type: "fixed" },
  ];
  const before = snapshot({ debts });
  const renamed = snapshot({ debts: debts.map((debt) => ({ ...debt, name: debt.id === "debt-a" ? "Alpha" : "Zulu" })) });
  const beforeResult = evaluateOptimizeStage(before, buildFor(before), true);
  const renamedResult = evaluateOptimizeStage(renamed, buildFor(renamed), true);
  assert.deepEqual(beforeResult.recommendations.map((item) => [item.relatedDebtId, item.debtMonthlyAmount]), renamedResult.recommendations.map((item) => [item.relatedDebtId, item.debtMonthlyAmount]));
  assert.equal(beforeResult.recommendations[0]?.relatedDebtId, "debt-a");
});
