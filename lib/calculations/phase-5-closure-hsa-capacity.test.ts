import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

function person(id: string, relationship: string, birthDate = "1990-01-01") {
  return {
    id,
    display_name: id,
    relationship,
    birth_date: birthDate,
    is_active: true,
    is_dependent: false,
    estimated_taxable_compensation_annual: 100000,
    covered_by_workplace_retirement_plan: false,
  };
}

function snapshot(retirementAccounts: Record<string, unknown>[], people: Record<string, unknown>[]) {
  return buildMoneyPrioritySnapshot({
    householdId: "hsa-closure",
    people,
    income: [],
    expenses: [],
    accounts: [],
    debts: [],
    goals: [],
    insuranceExposures: [],
    retirementAccounts: retirementAccounts.map((account) => ({ balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, ...account })),
  });
}

test("multiple HSAs owned by one person share one annual contribution limit", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "h1", owner_person_id: "self", name: "HSA 1", account_type: "hsa", hsa_eligible: true, hsa_coverage_type: "family", employee_contributed_ytd: 3000, employer_contributed_ytd: 500 },
    { id: "h2", owner_person_id: "self", name: "HSA 2", account_type: "hsa", hsa_eligible: true, hsa_coverage_type: "family", employee_contributed_ytd: 1000, employer_contributed_ytd: 250 },
  ], [person("self", "self")])).opportunities;

  assert.deepEqual(result.map((item) => item.contributedYtd), [4750, 4750]);
  assert.deepEqual(result.map((item) => item.remainingAnnualRoom), [4000, 4000]);
  assert.deepEqual(result.map((item) => item.sharedCapacityGroup), ["hsa:self", "hsa:self"]);
});

test("two eligible spouses expose one shared family base limit rather than two independent limits", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "a", owner_person_id: "self", name: "Self HSA", account_type: "hsa", hsa_eligible: true, hsa_coverage_type: "family", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    { id: "b", owner_person_id: "spouse", name: "Spouse HSA", account_type: "hsa", hsa_eligible: true, hsa_coverage_type: "family", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
  ], [person("self", "self"), person("spouse", "spouse_partner")])).opportunities;

  assert.deepEqual(result.map((item) => item.sharedOrdinaryRemainingRoom), [8750, 8750]);
  assert.deepEqual(result.map((item) => item.ownerCatchUpRemainingRoom), [0, 0]);
  assert.deepEqual(result.map((item) => item.sharedCapacityGroup), ["hsa:married-family", "hsa:married-family"]);
});

test("married family HSA sharing preserves each age-55 catch-up in that spouse's own HSA", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "a", owner_person_id: "self", name: "Self HSA", account_type: "hsa", hsa_eligible: true, hsa_coverage_type: "family", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    { id: "b", owner_person_id: "spouse", name: "Spouse HSA", account_type: "hsa", hsa_eligible: true, hsa_coverage_type: "family", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
  ], [person("self", "self", "1970-01-01"), person("spouse", "spouse_partner", "1970-01-01")])).opportunities;

  assert.deepEqual(result.map((item) => item.sharedOrdinaryRemainingRoom), [8750, 8750]);
  assert.deepEqual(result.map((item) => item.ownerCatchUpRemainingRoom), [1000, 1000]);
  assert.deepEqual(result.map((item) => item.catchUpAmount), [1000, 1000]);
});

test("one eligible spouse with family coverage retains the full family limit", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "a", owner_person_id: "self", name: "Self HSA", account_type: "hsa", hsa_eligible: true, hsa_coverage_type: "family", employee_contributed_ytd: 1000, employer_contributed_ytd: 500 },
  ], [person("self", "self"), person("spouse", "spouse_partner")])).opportunities[0]!;

  assert.equal(result.annualLimit, 8750);
  assert.equal(result.contributedYtd, 1500);
  assert.equal(result.remainingAnnualRoom, 7250);
});
