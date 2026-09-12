import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMoneyPrioritySnapshot,
  type MoneyPriorityRawSnapshot,
  type RetirementAccountType,
} from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

const YEAR = 2026;

function person(id: string, relationship: "self" | "spouse_partner") {
  return {
    id,
    display_name: id.toUpperCase(),
    relationship,
    birth_date: "1990-01-01",
    estimated_taxable_compensation_annual: 100000,
    covered_by_workplace_retirement_plan: false,
    is_dependent: false,
    is_active: true,
  };
}

function hsaAccount(id: string, owner: string): Record<string, unknown> & { account_type: RetirementAccountType } {
  return {
    id,
    owner_person_id: owner,
    name: id,
    account_type: "hsa",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: 0,
    employer_contributed_ytd: 0,
    hsa_ytd_tax_year: YEAR,
    match_status: "not_offered",
  };
}

function profile(personId: string) {
  return {
    id: `profile-${personId}`,
    person_id: personId,
    tax_year: YEAR,
    medicare_effective_on: null,
    last_month_rule_status: "not_elected",
    testing_period_status: "not_applicable",
    data_version: 1,
  };
}

function months(personId: string, coverage: "self_only" | "family") {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `month-${personId}-${index + 1}`,
    person_id: personId,
    tax_year: YEAR,
    month: index + 1,
    eligibility_status: "eligible",
    coverage_status: coverage,
    evidence_status: "confirmed",
  }));
}

function threeCandidateSnapshot(): MoneyPriorityRawSnapshot {
  return {
    householdId: "ffh-028",
    people: [
      person("a", "self"),
      person("b", "spouse_partner"),
      person("c", "spouse_partner"),
    ],
    income: [],
    expenses: [],
    accounts: [],
    debts: [],
    goals: [],
    insuranceExposures: [],
    retirementAccounts: [hsaAccount("hsa-a", "a"), hsaAccount("hsa-b", "b")],
    hsaTaxYearProfiles: [profile("a"), profile("b")],
    hsaMonthStatuses: [...months("a", "family"), ...months("b", "family")],
    hsaMarriedAllocations: [],
    hsaLegalSpouseAuthorities: [{
      id: "authority-a-b",
      tax_year: YEAR,
      person_one_id: "a",
      person_two_id: "b",
      authority_status: "confirmed_legal_spouses",
      confirmation_source: "explicit_household_confirmation",
      confirmed_at: "2026-01-01T00:00:00.000Z",
      data_version: 1,
    }],
    preferences: {
      tax_profile_year: YEAR,
      tax_filing_status: "single",
      estimated_modified_agi: 100000,
    },
  };
}

function hsaOpportunities(input: MoneyPriorityRawSnapshot) {
  return evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities
    .filter((item) => item.accountType === "hsa");
}

test("three spouse candidates cannot bypass explicit target-year A/B shared-family authority", () => {
  const hsas = hsaOpportunities(threeCandidateSnapshot());
  assert.deepEqual(hsas.map((item) => item.state), ["more_information_needed", "more_information_needed"]);
  assert.deepEqual(hsas.map((item) => item.annualLimit), [null, null]);
  assert.ok(hsas.every((item) => item.missingData.some((reason) => reason.includes("Unambiguous legal-spouse pair authority"))));
});

test("three materially ambiguous candidates without affirmative authority are HSA-only information needed", () => {
  const input = threeCandidateSnapshot();
  input.hsaLegalSpouseAuthorities = [];
  input.retirementAccounts = [
    ...(input.retirementAccounts ?? []),
    {
      id: "ira-a",
      owner_person_id: "a",
      name: "IRA A",
      account_type: "traditional_ira",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: 0,
      employer_contributed_ytd: 0,
      match_status: "not_offered",
    },
    {
      id: "401k-a",
      owner_person_id: "a",
      name: "401k A",
      account_type: "401k",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: 0,
      employer_contributed_ytd: 0,
      plan_eligible_compensation_annual: 100000,
      match_status: "not_offered",
    },
  ];
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
  assert.deepEqual(result.filter((item) => item.accountType === "hsa").map((item) => item.state),
    ["more_information_needed", "more_information_needed"]);
  assert.equal(result.find((item) => item.accountId === "ira-a")?.state, "available");
  assert.equal(result.find((item) => item.accountId === "401k-a")?.state, "available");
});

test("three fully known all-self-only candidates preserve spouse-independent locality", () => {
  const input = threeCandidateSnapshot();
  input.hsaLegalSpouseAuthorities = [];
  input.hsaTaxYearProfiles = [...(input.hsaTaxYearProfiles ?? []), profile("c")];
  input.hsaMonthStatuses = [
    ...months("a", "self_only"),
    ...months("b", "self_only"),
    ...months("c", "self_only"),
  ];
  const hsas = hsaOpportunities(input);
  assert.deepEqual(hsas.map((item) => item.state), ["available", "available"]);
  assert.deepEqual(hsas.map((item) => item.annualLimit), [4400, 4400]);
});

test("multi-candidate ambiguity behavior is invariant to people, accounts, facts, and authority order", () => {
  const first = threeCandidateSnapshot();
  const second = structuredClone(first);
  second.people = [...(second.people ?? [])].reverse();
  second.retirementAccounts = [...(second.retirementAccounts ?? [])].reverse();
  second.hsaTaxYearProfiles = [...(second.hsaTaxYearProfiles ?? [])].reverse();
  second.hsaMonthStatuses = [...(second.hsaMonthStatuses ?? [])].reverse();
  second.hsaLegalSpouseAuthorities = [...(second.hsaLegalSpouseAuthorities ?? [])].reverse();
  const summarize = (input: MoneyPriorityRawSnapshot) => hsaOpportunities(input)
    .map((item) => ({ id: item.accountId, state: item.state, annualLimit: item.annualLimit, missingData: item.missingData }))
    .sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(summarize(first), summarize(second));
});
