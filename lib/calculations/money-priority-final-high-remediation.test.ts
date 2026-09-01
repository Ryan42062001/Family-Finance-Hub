import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import {
  buildMoneyPrioritySnapshot,
  MoneyPrioritySnapshotValidationError,
  type MoneyPriorityRawSnapshot,
} from "./money-priority-snapshot.ts";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "final-high-remediation",
    people: [{
      id: "p1", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, estimated_taxable_compensation_annual: 120000,
      is_active: true, is_dependent: false,
    }],
    income: [{ id: "i1", owner_person_id: "p1", name: "Salary", monthly_amount: 5000, monthly_gross_amount: 10000, is_active: true }],
    expenses: [{ id: "e1", name: "Essentials", monthly_amount: 4000, is_essential: true }],
    accounts: [{ id: "cash", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [{
      id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0,
      plan_eligible_compensation_annual: 120000,
      full_match_employee_contribution_monthly: 500, match_status: "not_fully_captured",
    }],
    goals: [], insuranceExposures: [],
    preferences: { emergency_fund_months_override: 3, known_income_disruption: false },
  };
}

function matchResult(source = raw(), asOfDate = "2026-09-01") {
  const result = runMoneyPriorityEngine(source, asOfDate);
  return { result, secure: result.secure.recommendations.find((item) => item.relatedEntityId === "r1") };
}

test("Secure does not allocate an employer-match contribution after the elective-deferral limit is exhausted", () => {
  const source = raw();
  source.retirementAccounts![0].employee_contributed_ytd = 24500;
  const { result, secure } = matchResult(source);
  assert.equal(result.build.retirementAccounts.opportunities[0]?.state, "limit_reached");
  assert.equal(secure?.id, "secure-match-capacity-exhausted-r1");
  assert.equal(secure?.monthlyAmount, null);
  assert.equal(result.recommendations.find((item) => item.id === "secure-match-gap-r1"), undefined);
});

test("Secure does not allocate an employer-match contribution after annual additions are exhausted", () => {
  const source = raw();
  source.retirementAccounts![0].employee_contributed_ytd = 10000;
  source.retirementAccounts![0].employer_contributed_ytd = 62000;
  const { result, secure } = matchResult(source);
  assert.equal(result.build.retirementAccounts.opportunities[0]?.remainingAnnualRoom, 0);
  assert.equal(secure?.id, "secure-match-capacity-exhausted-r1");
  assert.equal(secure?.monthlyAmount, null);
});

test("partial legal room caps both the monthly Secure recommendation and its annual claim", () => {
  const source = raw();
  source.retirementAccounts![0].employee_contributed_ytd = 23300;
  const { result, secure } = matchResult(source);
  const recommendation = result.recommendations.find((item) => item.id === "secure-match-gap-r1");
  assert.equal(result.build.retirementAccounts.opportunities[0]?.remainingAnnualRoom, 1200);
  assert.equal(secure?.monthlyAmount, 300);
  assert.equal(secure?.legalRemainingAnnualRoom, 1200);
  assert.equal(recommendation?.allocations[0]?.monthlyAmount, 300);
  assert.equal(recommendation?.allocations[0]?.annualAmount, 1200);
});

for (const [name, field] of [
  ["employee contributions YTD", "employee_contributed_ytd"],
  ["employer contributions YTD", "employer_contributed_ytd"],
  ["plan-specific compensation", "plan_eligible_compensation_annual"],
] as const) {
  test(`missing ${name} produces no Secure allocation`, () => {
    const source = raw();
    source.retirementAccounts![0][field] = null;
    const { result, secure } = matchResult(source);
    assert.equal(result.build.retirementAccounts.opportunities[0]?.state, "more_information_needed");
    assert.equal(secure?.id, "secure-match-capacity-missing-r1");
    assert.equal(secure?.state, "more_information_needed");
    assert.equal(result.recommendations.find((item) => item.id === "secure-match-gap-r1"), undefined);
  });
}

test("a fully captured match remains absent from recurring Secure recommendations", () => {
  const source = raw();
  source.retirementAccounts![0].match_status = "fully_captured";
  source.retirementAccounts![0].monthly_employee_contribution = 500;
  const { secure } = matchResult(source);
  assert.equal(secure, undefined);
});

test("verified legal room permits the recurring match recommendation without breaking monthly capacity", () => {
  const { result, secure } = matchResult();
  const allocated = result.recommendations.flatMap((item) => item.allocations).reduce((sum, item) => sum + item.monthlyAmount, 0);
  assert.equal(result.build.retirementAccounts.opportunities[0]?.state, "available");
  assert.equal(secure?.monthlyAmount, 500);
  assert.ok(allocated <= result.feasibility.monthlyPlanCapacity);
});

test("age-based catch-up room is honored when the required Roth-catch-up facts are known", () => {
  const source = raw();
  source.people![0].birth_date = "1966-01-01";
  source.retirementAccounts![0].employee_contributed_ytd = 24500;
  source.retirementAccounts![0].prior_year_sponsor_wages = 100000;
  const { result, secure } = matchResult(source);
  assert.equal(result.build.retirementAccounts.opportunities[0]?.state, "available");
  assert.equal(secure?.monthlyAmount, 500);
});

const missingRequiredCases: Array<[string, (source: MoneyPriorityRawSnapshot) => void, string]> = [
  ["income monthly amount", (source) => { delete source.income![0].monthly_amount; }, "income[0].monthly_amount"],
  ["expense monthly amount", (source) => { delete source.expenses![0].monthly_amount; }, "expenses[0].monthly_amount"],
  ["account balance", (source) => { delete source.accounts![0].balance; }, "accounts[0].balance"],
  ["debt balance", (source) => { source.debts = [{ id: "d", current_balance: undefined, minimum_payment: 0 }]; }, "debts[0].current_balance"],
  ["debt minimum", (source) => { source.debts = [{ id: "d", current_balance: 1, minimum_payment: undefined }]; }, "debts[0].minimum_payment"],
  ["retirement balance", (source) => { delete source.retirementAccounts![0].balance; }, "retirementAccounts[0].balance"],
  ["retirement employee contribution", (source) => { delete source.retirementAccounts![0].monthly_employee_contribution; }, "retirementAccounts[0].monthly_employee_contribution"],
  ["retirement employer contribution", (source) => { delete source.retirementAccounts![0].monthly_employer_contribution; }, "retirementAccounts[0].monthly_employer_contribution"],
  ["goal target", (source) => { source.goals = [{ id: "g", target_amount: undefined, current_amount: 0, priority: 3 }]; }, "goals[0].target_amount"],
  ["goal current amount", (source) => { source.goals = [{ id: "g", target_amount: 1, current_amount: undefined, priority: 3 }]; }, "goals[0].current_amount"],
  ["goal priority", (source) => { source.goals = [{ id: "g", target_amount: 1, current_amount: 0, priority: undefined }]; }, "goals[0].priority"],
];

for (const [name, mutate, expectedPath] of missingRequiredCases) {
  test(`missing required ${name} is diagnosed instead of normalized to zero`, () => {
    const source = raw(); mutate(source);
    assert.throws(() => buildMoneyPrioritySnapshot(source), (error) => error instanceof MoneyPrioritySnapshotValidationError
      && error.issues.some((issue) => issue.code === "missing_required_number" && issue.path === expectedPath));
  });
}

test("explicit required zeros are accepted while absent nullable numerics remain null", () => {
  const source = raw();
  source.income![0].monthly_amount = 0;
  source.income![0].monthly_gross_amount = null;
  source.expenses![0].monthly_amount = 0;
  source.accounts![0].balance = 0;
  source.retirementAccounts![0].balance = 0;
  source.retirementAccounts![0].monthly_employee_contribution = 0;
  source.retirementAccounts![0].monthly_employer_contribution = 0;
  source.retirementAccounts![0].plan_eligible_compensation_annual = null;
  const snapshot = buildMoneyPrioritySnapshot(source);
  assert.equal(snapshot.income[0]?.monthlyTakeHomeAmount, 0);
  assert.equal(snapshot.income[0]?.monthlyGrossAmount, null);
  assert.equal(snapshot.retirementAccounts[0]?.planEligibleCompensationAnnual, null);
});

test("invalid signed and bounded numerics fail before recommendation generation", () => {
  const source = raw();
  source.expenses![0].monthly_amount = -1;
  source.debts = [{ id: "d", current_balance: 1, minimum_payment: 0, interest_rate: 101 }];
  source.goals = [{ id: "g", target_amount: 1, current_amount: 0, priority: 6 }];
  assert.throws(() => runMoneyPriorityEngine(source, "2026-09-01"), (error) => error instanceof MoneyPrioritySnapshotValidationError
    && error.issues.filter((issue) => issue.code === "invalid_number").length === 3);
});

test("combined missing outflows and near-exhausted match capacity cannot create optimistic recommendations", () => {
  const source = raw();
  delete source.expenses![0].monthly_amount;
  source.debts = [{ id: "d", current_balance: 1000, minimum_payment: undefined }];
  source.retirementAccounts![0].employee_contributed_ytd = 24400;
  assert.throws(() => runMoneyPriorityEngine(source, "2026-09-01"), (error) => error instanceof MoneyPrioritySnapshotValidationError
    && error.issues.filter((issue) => issue.code === "missing_required_number").length === 2);
});
