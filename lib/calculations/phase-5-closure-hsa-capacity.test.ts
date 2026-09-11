import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

const TAX_YEAR = 2026;

type HsaFact = {
  personId: string;
  eligibility: "eligible" | "ineligible";
  coverage: "self_only" | "family" | "none";
};

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

function snapshot(
  retirementAccounts: Record<string, unknown>[],
  people: Record<string, unknown>[],
  facts: HsaFact[],
) {
  return buildMoneyPrioritySnapshot({
    householdId: "hsa-closure",
    people,
    income: [],
    expenses: [],
    accounts: [],
    debts: [],
    goals: [],
    insuranceExposures: [],
    retirementAccounts: retirementAccounts.map((account) => ({
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      ...account,
      ...(account.account_type === "hsa" ? { hsa_ytd_tax_year: TAX_YEAR } : {}),
    })),
    hsaTaxYearProfiles: facts.map((fact) => ({
      id: `profile-${fact.personId}`,
      person_id: fact.personId,
      tax_year: TAX_YEAR,
      medicare_effective_on: null,
      last_month_rule_status: "not_elected",
      testing_period_status: "not_applicable",
      data_version: 1,
    })),
    hsaMonthStatuses: facts.flatMap((fact) => Array.from({ length: 12 }, (_, index) => ({
      id: `month-${fact.personId}-${index + 1}`,
      person_id: fact.personId,
      tax_year: TAX_YEAR,
      month: index + 1,
      eligibility_status: fact.eligibility,
      coverage_status: fact.coverage,
      evidence_status: "confirmed",
    }))),
  });
}

test("multiple HSAs owned by one person share one annual contribution limit", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "h1", owner_person_id: "self", name: "HSA 1", account_type: "hsa", employee_contributed_ytd: 3000, employer_contributed_ytd: 500 },
    { id: "h2", owner_person_id: "self", name: "HSA 2", account_type: "hsa", employee_contributed_ytd: 1000, employer_contributed_ytd: 250 },
  ], [person("self", "self")], [
    { personId: "self", eligibility: "eligible", coverage: "family" },
  ])).opportunities;

  assert.deepEqual(result.map((item) => item.contributedYtd), [4750, 4750]);
  assert.deepEqual(result.map((item) => item.remainingAnnualRoom), [4000, 4000]);
  assert.deepEqual(result.map((item) => item.sharedCapacityGroup), ["hsa:self", "hsa:self"]);
});

test("two eligible spouses expose one shared family base rather than two independent family limits", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "a", owner_person_id: "self", name: "Self HSA", account_type: "hsa", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    { id: "b", owner_person_id: "spouse", name: "Spouse HSA", account_type: "hsa", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
  ], [person("self", "self"), person("spouse", "spouse_partner")], [
    { personId: "self", eligibility: "eligible", coverage: "family" },
    { personId: "spouse", eligibility: "eligible", coverage: "family" },
  ])).opportunities;

  assert.deepEqual(result.map((item) => item.sharedOrdinaryRemainingRoom), [8750, 8750]);
  assert.deepEqual(result.map((item) => item.ownerCatchUpRemainingRoom), [0, 0]);
  assert.deepEqual(result.map((item) => item.sharedCapacityGroup), ["hsa:married-family", "hsa:married-family"]);
  assert.deepEqual(result.map((item) => item.annualLimit), [4375, 4375]);
});

test("married family HSA sharing preserves each age-55 catch-up in that spouse's own HSA", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "a", owner_person_id: "self", name: "Self HSA", account_type: "hsa", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    { id: "b", owner_person_id: "spouse", name: "Spouse HSA", account_type: "hsa", employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
  ], [person("self", "self", "1970-01-01"), person("spouse", "spouse_partner", "1970-01-01")], [
    { personId: "self", eligibility: "eligible", coverage: "family" },
    { personId: "spouse", eligibility: "eligible", coverage: "family" },
  ])).opportunities;

  assert.deepEqual(result.map((item) => item.sharedOrdinaryRemainingRoom), [8750, 8750]);
  assert.deepEqual(result.map((item) => item.ownerCatchUpRemainingRoom), [1000, 1000]);
  assert.deepEqual(result.map((item) => item.catchUpAmount), [1000, 1000]);
  assert.deepEqual(result.map((item) => item.annualLimit), [5375, 5375]);
});

test("one eligible spouse with family coverage retains the full family limit when the spouse is explicitly ineligible", () => {
  const result = evaluateRetirementAccountOpportunities(snapshot([
    { id: "a", owner_person_id: "self", name: "Self HSA", account_type: "hsa", employee_contributed_ytd: 1000, employer_contributed_ytd: 500 },
  ], [person("self", "self"), person("spouse", "spouse_partner")], [
    { personId: "self", eligibility: "eligible", coverage: "family" },
    { personId: "spouse", eligibility: "ineligible", coverage: "none" },
  ])).opportunities[0]!;

  assert.equal(result.annualLimit, 8750);
  assert.equal(result.contributedYtd, 1500);
  assert.equal(result.remainingAnnualRoom, 7250);
});
