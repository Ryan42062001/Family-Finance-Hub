import assert from "node:assert/strict";
import test from "node:test";
import { runMoneyPriorityEngine as runEngine } from "./money-priority-engine.ts";
import { withNormalizedHsaFacts } from "./hsa-test-fixtures.ts";

const runMoneyPriorityEngine: typeof runEngine = (raw, asOfDate, policy) =>
  runEngine(withNormalizedHsaFacts(raw), asOfDate, policy);
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "h1",
    people: [{
      id: "p1", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, is_active: true, is_dependent: false,
    }],
    income: [{ id: "i1", owner_person_id: "p1", name: "Job", monthly_amount: 7000, monthly_gross_amount: 10000, is_active: true }],
    expenses: [{ id: "e1", name: "Essentials", category: "housing", monthly_amount: 3000, is_essential: true }],
    accounts: [{ id: "a1", name: "Reserve", account_type: "savings", balance: 20000, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [{
      id: "r1", owner_person_id: "p1", name: "401k", account_type: "401k", balance: 1000000,
      monthly_employee_contribution: 300, monthly_employer_contribution: 100,
      employee_contributed_ytd: 3000, employer_contributed_ytd: 1000,
      plan_eligible_compensation_annual: 100000, match_status: "fully_captured",
    }],
    goals: [],
    insuranceExposures: [{ id: "x1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: {
      emergency_fund_months_override: 3,
      debt_vs_investing: "balanced",
      job_replacement_difficulty: "easy",
      desired_retirement_monthly_spending: 5000,
      retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 2500,
      planning_pension_monthly: 0,
    },
  };
}

test("complete projection becomes primary even when the generic 12% benchmark is below target", () => {
  const result = runMoneyPriorityEngine(baseRaw(), "2026-08-29");
  assert.equal(result.build.retirement.guidanceMode, "projection");
  assert.equal(result.build.retirement.state, "projection_on_track");
  assert.ok(result.build.retirement.healthyBenchmarkMonthlyGap > 0);
  assert.equal(result.build.retirement.recommendedMonthlyIncrease, 0);
  assert.equal(result.build.allocations.some((item) => item.category === "retirement"), false);
  assert.ok(result.recommendations.some((item) => item.id === "build-retirement-projection"));
});

test("projection shortfall drives the retirement increase instead of the benchmark gap", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401k", account_type: "401k", balance: 0,
    monthly_employee_contribution: 300, monthly_employer_contribution: 100,
    employee_contributed_ytd: 3000, employer_contributed_ytd: 1000,
    plan_eligible_compensation_annual: 100000, match_status: "fully_captured",
  }];
  const result = runMoneyPriorityEngine(withNormalizedHsaFacts(raw), "2026-08-29");
  assert.equal(result.build.retirement.guidanceMode, "projection");
  assert.equal(result.build.retirement.state, "projection_shortfall");
  assert.ok(result.build.retirement.recommendedMonthlyIncrease > 0);
  assert.equal(
    result.build.allocations.find((item) => item.category === "retirement")?.requestedMonthlyAmount,
    result.build.retirement.recommendedMonthlyIncrease,
  );
  const retirementAllocation = result.build.allocations.find((item) => item.category === "retirement")?.allocatedMonthlyAmount ?? 0;
  const routed = result.build.retirementAccountAllocations.reduce((sum, item) => sum + item.allocatedMonthlyAmount, 0);
  assert.equal(Math.round(routed * 100), Math.round(retirementAllocation * 100));
  assert.equal(
    Math.round((retirementAllocation + result.build.unresolvedRetirementMonthlyAmount) * 100),
    Math.round((result.build.allocations.find((item) => item.category === "retirement")?.requestedMonthlyAmount ?? 0) * 100),
  );
  assert.ok(result.build.retirementAccountAllocations.every((item) => item.allocatedMonthlyAmount * 12 <= 21500));
});

test("Build routes retirement need across legal destinations and exposes any unresolved remainder", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [
    { id: "r1", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 6900,
      employer_contributed_ytd: 0, match_status: "not_offered" },
    { id: "r2", owner_person_id: "p1", name: "401k", account_type: "401k", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 23900,
      employer_contributed_ytd: 0, plan_eligible_compensation_annual: 100000, match_status: "fully_captured" },
  ];
  raw.people![0]!.estimated_taxable_compensation_annual = 100000;
  raw.people![0]!.covered_by_workplace_retirement_plan = true;
  raw.preferences = { ...raw.preferences, tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000 };
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const routedAnnual = result.build.retirementAccountAllocations.reduce((sum, item) => sum + item.allocatedMonthlyAmount * 12, 0);
  assert.ok(routedAnnual <= 1200);
  assert.ok(result.build.unresolvedRetirementMonthlyAmount > 0);
});

test("known HSA room and unresolved IRA tax eligibility are both surfaced", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [
    {
      id: "hsa", owner_person_id: "p1", name: "Family HSA", account_type: "hsa", balance: 10000,
      monthly_employee_contribution: 300, monthly_employer_contribution: 50,
      employee_contributed_ytd: 3000, employer_contributed_ytd: 500,
      hsa_eligible: true, hsa_coverage_type: "family", match_status: "not_offered",
    },
    {
      id: "ira", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", balance: 20000,
      monthly_employee_contribution: 200, monthly_employer_contribution: 0,
      employee_contributed_ytd: 2000, employer_contributed_ytd: 0, match_status: "not_offered",
    },
  ];
  const result = runMoneyPriorityEngine(raw, "2026-08-29");
  const hsa = result.build.retirementAccounts.opportunities.find((item) => item.accountId === "hsa");
  const ira = result.build.retirementAccounts.opportunities.find((item) => item.accountId === "ira");
  assert.equal(hsa?.state, "available");
  assert.equal(hsa?.remainingAnnualRoom, 5250);
  assert.equal(ira?.state, "more_information_needed");
  assert.ok(ira?.missingData.some((item) => item.includes("modified AGI")));
  assert.ok(result.recommendations.some((item) => item.id === "build-retirement-account-options"));
});

test("engine exposes the tax and planning policy versions used for retirement guidance", () => {
  const result = runMoneyPriorityEngine(baseRaw(), "2026-08-29");
  assert.equal(result.taxYear, 2026);
  assert.equal(result.taxPolicyVersion, "2026.2");
  assert.equal(result.planningAssumptionsVersion, "2026.1");
});
