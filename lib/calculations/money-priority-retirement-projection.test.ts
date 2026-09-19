import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { projectRetirement } from "./money-priority-retirement-projection.ts";

function snapshot(overrides: Record<string, unknown> = {}) {
  return buildMoneyPrioritySnapshot({
    householdId: "h1",
    people: [{
      id: "p1", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, is_active: true, is_dependent: false,
    }],
    income: [{ id: "i1", name: "Job", monthly_amount: 6000, monthly_gross_amount: 8000, is_active: true }],
    expenses: [],
    accounts: [],
    debts: [],
    retirementAccounts: [{
      id: "r1", owner_person_id: "p1", name: "401k", account_type: "401k", balance: 150000,
      monthly_employee_contribution: 800, monthly_employer_contribution: 400, match_status: "fully_captured",
    }],
    goals: [],
    insuranceExposures: [],
    preferences: {
      debt_vs_investing: "balanced",
      desired_retirement_monthly_spending: 5000,
      retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 2500,
      planning_pension_monthly: 0,
    },
    ...overrides,
  });
}

test("projection uses desired spending, guaranteed income, assets, and current contributions", () => {
  const result = projectRetirement(snapshot(), "2026-08-29");
  assert.equal(result.yearsToRetirement, 29);
  assert.equal(result.desiredAnnualRetirementSpending, 60000);
  assert.equal(result.modeledAnnualGuaranteedIncome, 30000);
  assert.equal(result.targetPortfolio, 750000);
  assert.ok((result.projectedPortfolioAtRetirement ?? 0) > 0);
  assert.ok(result.state === "on_track" || result.state === "shortfall");
});

test("missing retirement spending blocks projection but preserves benchmark-independent facts", () => {
  const value = snapshot({
    preferences: { debt_vs_investing: "balanced", retirement_spending_basis: "today_dollars" },
  });
  const result = projectRetirement(value, "2026-08-29");
  assert.equal(result.state, "more_information_needed");
  assert.equal(result.currentRetirementAssets, 150000);
  assert.ok(result.missingData.some((item) => item.includes("Desired monthly retirement spending")));
});

test("missing Social Security and pension are modeled conservatively as zero with disclosed assumptions", () => {
  const value = snapshot({
    preferences: {
      debt_vs_investing: "balanced",
      desired_retirement_monthly_spending: 5000,
      retirement_spending_basis: "today_dollars",
    },
  });
  const result = projectRetirement(value, "2026-08-29");
  assert.notEqual(result.state, "more_information_needed");
  assert.equal(result.modeledAnnualGuaranteedIncome, 0);
  assert.ok(result.assumptions.some((item) => item.includes("$0 of Social Security")));
  assert.ok(result.assumptions.some((item) => item.includes("$0 of pension")));
});

test("projection is deterministic for the same as-of date and assumptions", () => {
  const value = snapshot();
  assert.deepEqual(projectRetirement(value, "2026-08-29"), projectRetirement(value, "2026-08-29"));
});

test("today-dollar basis is required by the current real-return projection", () => {
  const value = snapshot({
    preferences: {
      debt_vs_investing: "balanced",
      desired_retirement_monthly_spending: 5000,
      retirement_spending_basis: "future_dollars",
      planning_social_security_monthly: 2500,
      planning_pension_monthly: 0,
    },
  });
  const result = projectRetirement(value, "2026-08-29");
  assert.equal(result.state, "more_information_needed");
  assert.ok(result.missingData.some((item) => item.includes("today's dollars")));
});
