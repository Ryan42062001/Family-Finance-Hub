import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import {
  calculateFullEmergencyTarget,
  calculatePlanFeasibility,
  classifyDebt,
  classifyEmergencyRisk,
} from "./money-priority-core.ts";

function snapshot(overrides: Partial<Parameters<typeof buildMoneyPrioritySnapshot>[0]> = {}) {
  return buildMoneyPrioritySnapshot({
    householdId: "hh-1",
    people: [],
    income: [
      { id: "i1", name: "Job", monthly_amount: "6000", monthly_gross_amount: "8000", is_active: true, is_variable: false },
    ],
    expenses: [
      { id: "e1", name: "Housing", category: "housing", monthly_amount: "2500", is_essential: true },
      { id: "e2", name: "Fun", category: "personal", monthly_amount: "500", is_essential: false },
    ],
    debts: [
      { id: "d1", name: "Loan", debt_type: "personal_loan", current_balance: "10000", interest_rate: "8", minimum_payment: "300", rate_type: "fixed" },
    ],
    accounts: [],
    retirementAccounts: [],
    goals: [],
    insuranceExposures: [],
    preferences: null,
    ...overrides,
  });
}

test("plan feasibility reports feasible capacity", () => {
  const result = calculatePlanFeasibility(snapshot(), 1000);
  assert.equal(result.monthlyPlanCapacity, 2700);
  assert.equal(result.planFundingGap, 0);
  assert.equal(result.status, "feasible");
});

test("plan feasibility reports structural funding gap", () => {
  const result = calculatePlanFeasibility(snapshot(), 3000);
  assert.equal(result.planFundingGap, 300);
  assert.equal(result.status, "funding_gap");
});

test("emergency risk increases for concentrated variable income and dependents", () => {
  const value = snapshot({
    people: [{ id: "p1", display_name: "Child", relationship: "child", is_dependent: true, is_active: true }],
    income: [{ id: "i1", name: "Commission", monthly_amount: 6000, is_active: true, is_variable: true }],
  });
  const assessment = classifyEmergencyRisk(value);
  assert.equal(assessment.tier, "elevated");
  assert.equal(assessment.recommendedMonths, 5);
});

test("emergency fund override changes months but not tier", () => {
  const value = snapshot({
    preferences: { emergency_fund_months_override: "7", debt_vs_investing: "balanced" },
  });
  const assessment = classifyEmergencyRisk(value);
  assert.equal(assessment.tier, "moderate");
  assert.equal(assessment.recommendedMonths, 7);
});

test("full emergency target includes essential expenses and debt minimums", () => {
  assert.equal(calculateFullEmergencyTarget(snapshot(), 4), 11200);
});

test("debt classifier uses V2 APR bands", () => {
  const value = snapshot();
  assert.equal(classifyDebt(value.debts[0]).band, "payoff_favored");
  assert.equal(classifyDebt({ ...value.debts[0], annualInterestRate: 12 }).band, "high_interest");
  assert.equal(classifyDebt({ ...value.debts[0], annualInterestRate: 5 }).band, "gray_zone");
  assert.equal(classifyDebt({ ...value.debts[0], annualInterestRate: 3 }).band, "optimize");
});

test("mortgage and special-case debts bypass ordinary APR bands", () => {
  const value = snapshot();
  assert.equal(classifyDebt({ ...value.debts[0], type: "mortgage", annualInterestRate: 12 }).band, "optimize");
  assert.equal(classifyDebt({ ...value.debts[0], isPastDue: true }).band, "special_priority");
  assert.equal(classifyDebt({ ...value.debts[0], rateType: "promotional" }).band, "special_priority");
});

test("missing APR remains unknown rather than guessed", () => {
  const value = snapshot();
  assert.equal(classifyDebt({ ...value.debts[0], annualInterestRate: null }).band, "unknown");
});
