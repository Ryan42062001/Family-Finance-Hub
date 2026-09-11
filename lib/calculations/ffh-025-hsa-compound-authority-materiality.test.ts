import assert from "node:assert/strict";
import test from "node:test";

import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

const YEAR = 2026;

type Eligibility = "eligible" | "ineligible" | "unknown";
type Coverage = "self_only" | "family" | "none" | "unknown";
type AuthorityStatus = "confirmed_legal_spouses" | "confirmed_not_legal_spouses" | "unknown";

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

function hsaAccount(id: string, owner: string) {
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
    hsa_eligible: true,
    hsa_coverage_type: "self_only",
    match_status: "not_offered",
  };
}

function traditionalIra(id: string, owner: string) {
  return {
    id,
    owner_person_id: owner,
    name: id,
    account_type: "traditional_ira",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: 0,
    employer_contributed_ytd: 0,
    match_status: "not_offered",
  };
}

function workplace401k(id: string, owner: string) {
  return {
    id,
    owner_person_id: owner,
    name: id,
    account_type: "401k",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: 0,
    employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 100000,
    match_status: "not_offered",
  };
}

function profile(id: string) {
  return {
    id: `profile-${id}`,
    person_id: id,
    tax_year: YEAR,
    medicare_effective_on: null,
    last_month_rule_status: "not_elected",
    testing_period_status: "not_applicable",
    data_version: 1,
  };
}

function months(id: string, eligibility: Eligibility, coverage: Coverage) {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `month-${id}-${index + 1}`,
    person_id: id,
    tax_year: YEAR,
    month: index + 1,
    eligibility_status: eligibility,
    coverage_status: coverage,
    evidence_status: "confirmed",
  }));
}

function authority(status: AuthorityStatus) {
  return {
    id: `authority-${status}`,
    tax_year: YEAR,
    person_one_id: "a",
    person_two_id: "b",
    authority_status: status,
    confirmation_source: "explicit_household_confirmation",
    confirmed_at: "2026-01-01T00:00:00.000Z",
    data_version: 1,
  };
}

function scenario(options: {
  bEligibility?: Eligibility;
  bCoverage?: Coverage;
  authority?: AuthorityStatus | "missing";
  extraAccounts?: Record<string, unknown>[];
} = {}): MoneyPriorityRawSnapshot {
  const bEligibility = options.bEligibility ?? "eligible";
  const bCoverage = options.bCoverage ?? "unknown";
  const status = options.authority ?? "missing";
  return {
    householdId: "ffh-025",
    people: [person("a", "self"), person("b", "spouse_partner")],
    income: [],
    expenses: [],
    accounts: [],
    debts: [],
    goals: [],
    insuranceExposures: [],
    retirementAccounts: [
      hsaAccount("hsa-a", "a"),
      hsaAccount("hsa-b", "b"),
      ...(options.extraAccounts ?? []),
    ],
    hsaTaxYearProfiles: [profile("a"), profile("b")],
    hsaMonthStatuses: [
      ...months("a", "eligible", "self_only"),
      ...months("b", bEligibility, bCoverage),
    ],
    hsaMarriedAllocations: [],
    hsaLegalSpouseAuthorities: status === "missing" ? [] : [authority(status)],
    preferences: {
      tax_profile_year: YEAR,
      tax_filing_status: "single",
      estimated_modified_agi: 100000,
    },
  };
}

function opportunities(input: MoneyPriorityRawSnapshot) {
  return evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
}

function hsa(input: MoneyPriorityRawSnapshot, accountId: "hsa-a" | "hsa-b") {
  return opportunities(input).find((item) => item.accountId === accountId)!;
}

function assertAuthorityBlocked(input: MoneyPriorityRawSnapshot) {
  const a = hsa(input, "hsa-a");
  assert.equal(a.state, "more_information_needed");
  assert.equal(a.annualLimit, null);
  assert.equal(a.remainingAnnualRoom, null);
  assert.ok(a.missingData.some((item) => item.includes("Legal-spouse authority")));
}

test("missing authority blocks known self-only owner when the candidate partner is eligible with coverage unresolved", () => {
  assertAuthorityBlocked(scenario({ authority: "missing", bEligibility: "eligible", bCoverage: "unknown" }));
});

test("explicit unknown authority blocks the same asymmetric eligible/coverage-unknown case", () => {
  assertAuthorityBlocked(scenario({ authority: "unknown", bEligibility: "eligible", bCoverage: "unknown" }));
});

test("unknown partner eligibility with known family coverage keeps the known self-only owner unresolved", () => {
  assertAuthorityBlocked(scenario({ authority: "missing", bEligibility: "unknown", bCoverage: "family" }));
});

test("unknown partner eligibility with family-possible coverage keeps the known self-only owner unresolved", () => {
  assertAuthorityBlocked(scenario({ authority: "unknown", bEligibility: "unknown", bCoverage: "unknown" }));
});

test("fully known all-self-only facts preserve locality under missing authority", () => {
  const input = scenario({ authority: "missing", bEligibility: "eligible", bCoverage: "self_only" });
  const hsas = opportunities(input).filter((item) => item.accountType === "hsa");
  assert.deepEqual(hsas.map((item) => item.state), ["available", "available"]);
  assert.deepEqual(hsas.map((item) => item.annualLimit), [4400, 4400]);
});

test("confirmed non-spouses remain independently calculated", () => {
  const input = scenario({ authority: "confirmed_not_legal_spouses", bEligibility: "eligible", bCoverage: "family" });
  const hsas = opportunities(input).filter((item) => item.accountType === "hsa");
  assert.deepEqual(hsas.map((item) => item.state), ["available", "available"]);
  assert.deepEqual(hsas.map((item) => item.annualLimit), [4400, 8750]);
});

test("confirmed legal spouses with relevant family facts use married sharing", () => {
  const input = scenario({ authority: "confirmed_legal_spouses", bEligibility: "eligible", bCoverage: "family" });
  const hsas = opportunities(input).filter((item) => item.accountType === "hsa");
  assert.deepEqual(hsas.map((item) => item.state), ["available", "available"]);
  assert.deepEqual(hsas.map((item) => item.annualLimit), [4375, 4375]);
});

test("compound unknown-authority materiality is invariant to person/account/month input order", () => {
  const first = scenario({ authority: "unknown", bEligibility: "eligible", bCoverage: "unknown" });
  const second = structuredClone(first);
  second.people = [...(second.people ?? [])].reverse();
  second.retirementAccounts = [...(second.retirementAccounts ?? [])].reverse();
  second.hsaTaxYearProfiles = [...(second.hsaTaxYearProfiles ?? [])].reverse();
  second.hsaMonthStatuses = [...(second.hsaMonthStatuses ?? [])].reverse();

  const summarize = (input: MoneyPriorityRawSnapshot) => opportunities(input)
    .filter((item) => item.accountType === "hsa")
    .map((item) => ({ id: item.accountId, state: item.state, annualLimit: item.annualLimit, remaining: item.remainingAnnualRoom }))
    .sort((a, b) => a.id.localeCompare(b.id));

  assert.deepEqual(summarize(first), summarize(second));
  assert.ok(summarize(first).every((item) => item.state === "more_information_needed"));
});

test("unrelated IRA and workplace opportunities remain usable while only the HSA pair is unresolved", () => {
  const input = scenario({
    authority: "missing",
    bEligibility: "eligible",
    bCoverage: "unknown",
    extraAccounts: [traditionalIra("ira-a", "a"), workplace401k("401k-a", "a")],
  });
  const result = opportunities(input);
  assert.equal(result.find((item) => item.accountId === "hsa-a")?.state, "more_information_needed");
  assert.equal(result.find((item) => item.accountId === "ira-a")?.state, "available");
  assert.equal(result.find((item) => item.accountId === "401k-a")?.state, "available");
});
