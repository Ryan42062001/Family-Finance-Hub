import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import { buildMoneyPrioritySnapshot, MoneyPrioritySnapshotValidationError, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function person(id: string, relationship: string) {
  return {
    id,
    display_name: id.toUpperCase(),
    relationship,
    birth_date: "1990-01-01",
    planned_retirement_age: 65,
    covered_by_workplace_retirement_plan: false,
    estimated_taxable_compensation_annual: 80000,
    is_dependent: false,
    is_active: true,
  };
}

function hsaAccount(id: string, owner: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    owner_person_id: owner,
    name: id,
    account_type: "hsa",
    balance: 100,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    ...overrides,
  };
}

function profile(id: string, personId: string, taxYear = 2026) {
  return {
    id,
    person_id: personId,
    tax_year: taxYear,
    medicare_effective_on: null,
    last_month_rule_status: "not_elected",
    testing_period_status: "not_applicable",
    confirmed_at: "2026-09-01T12:00:00.000Z",
    data_version: 1,
  };
}

function month(id: string, personId: string, monthNumber: number, taxYear = 2026, overrides: Record<string, unknown> = {}) {
  return {
    id,
    person_id: personId,
    tax_year: taxYear,
    month: monthNumber,
    eligibility_status: "unknown",
    coverage_status: "unknown",
    evidence_status: "unknown",
    ...overrides,
  };
}

function engineRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "hsa-input-contract",
    people: [person("self", "self")],
    income: [{ id: "income", owner_person_id: "self", name: "Income", monthly_amount: 5000, monthly_gross_amount: 7000, income_type: "employment", is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Housing", category: "housing", monthly_amount: 2500, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [],
    goals: [],
    insuranceExposures: [{ id: "health", person_id: "self", name: "Health", insurance_type: "health", deductible_amount: 2000, is_relevant_to_reserve: true }],
    preferences: {
      emergency_fund_months_override: 3,
      debt_vs_investing: "balanced",
      roth_vs_traditional: "unspecified",
      risk_tolerance: "moderate",
      retirement_priority: "balanced",
      job_replacement_difficulty: "easy",
      known_income_disruption: false,
      desired_retirement_monthly_spending: 5000,
      retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0,
      planning_pension_monthly: 0,
      tax_profile_year: 2026,
      tax_filing_status: "single",
      estimated_modified_agi: 80000,
    },
  };
}

test("normalizes person-year/month HSA facts with explicit unknown and planning-assumption states", () => {
  const raw = engineRaw();
  raw.hsaTaxYearProfiles = [profile("p1", "self")];
  raw.hsaMonthStatuses = [
    month("m2", "self", 2, 2026, { eligibility_status: "eligible", coverage_status: "family", evidence_status: "planning_assumption" }),
    month("m1", "self", 1, 2026),
  ];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.hsa.profiles[0]?.personId, "self");
  assert.equal(snapshot.hsa.profiles[0]?.taxYear, 2026);
  assert.deepEqual(snapshot.hsa.months.map((item) => item.month), [1, 2]);
  assert.equal(snapshot.hsa.months[0]?.eligibilityStatus, "unknown");
  assert.equal(snapshot.hsa.months[0]?.coverageStatus, "unknown");
  assert.equal(snapshot.hsa.months[0]?.evidenceStatus, "unknown");
  assert.equal(snapshot.hsa.months[1]?.evidenceStatus, "planning_assumption");
});

test("legacy account eligibility and coverage remain hints and do not create person-year authority", () => {
  const raw = engineRaw();
  raw.retirementAccounts = [hsaAccount("legacy", "self", {
    hsa_eligible: true,
    hsa_coverage_type: "family",
    employee_contributed_ytd: 1000,
    employer_contributed_ytd: 100,
  })];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.deepEqual(snapshot.hsa, { profiles: [], months: [], marriedAllocations: [] });
  assert.equal(snapshot.retirementAccounts[0]?.hsaEligible, true);
  assert.equal(snapshot.retirementAccounts[0]?.hsaCoverageType, "family");
  assert.equal(snapshot.retirementAccounts[0]?.hsaYtdTaxYear, null);
  assert.ok(snapshot.warnings.some((warning) => warning.includes("YTD contributions without an explicit tax-year binding")));
});

test("tax-year-bound HSA YTD is preserved separately from legacy eligibility hints", () => {
  const raw = engineRaw();
  raw.retirementAccounts = [hsaAccount("hsa", "self", {
    employee_contributed_ytd: "1200.50",
    employer_contributed_ytd: "250",
    hsa_ytd_tax_year: "2026",
    hsa_eligible: null,
    hsa_coverage_type: null,
  })];
  const account = buildMoneyPrioritySnapshot(raw).retirementAccounts[0]!;
  assert.equal(account.employeeContributedYtd, 1200.5);
  assert.equal(account.employerContributedYtd, 250);
  assert.equal(account.hsaYtdTaxYear, 2026);
});

test("multiple HSA accounts do not duplicate canonical person legal facts", () => {
  const raw = engineRaw();
  raw.retirementAccounts = [hsaAccount("h1", "self"), hsaAccount("h2", "self")];
  raw.hsaTaxYearProfiles = [profile("p1", "self")];
  raw.hsaMonthStatuses = [month("m1", "self", 1)];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.retirementAccounts.length, 2);
  assert.equal(snapshot.hsa.profiles.length, 1);
  assert.equal(snapshot.hsa.months.length, 1);
});

test("spouse HSA legal facts can exist without a spouse HSA destination", () => {
  const raw = engineRaw();
  raw.people = [person("self", "self"), person("spouse", "spouse_partner")];
  raw.hsaTaxYearProfiles = [profile("spouse-profile", "spouse")];
  raw.hsaMonthStatuses = [month("spouse-month", "spouse", 1, 2026, { eligibility_status: "eligible", coverage_status: "family", evidence_status: "confirmed" })];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.retirementAccounts.length, 0);
  assert.equal(snapshot.hsa.profiles[0]?.personId, "spouse");
  assert.equal(snapshot.hsa.months[0]?.personId, "spouse");
});

test("tax years remain isolated and no status is carried forward", () => {
  const raw = engineRaw();
  raw.hsaTaxYearProfiles = [profile("p2026", "self", 2026), profile("p2027", "self", 2027)];
  raw.hsaMonthStatuses = [month("m2026", "self", 12, 2026, { eligibility_status: "eligible", coverage_status: "self_only", evidence_status: "confirmed" })];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.hsa.profiles.length, 2);
  assert.equal(snapshot.hsa.months.filter((item) => item.taxYear === 2027).length, 0);
  assert.equal(snapshot.hsa.months.filter((item) => item.taxYear === 2026).length, 1);
});

test("alternate married allocation is absent by default and only appears when explicitly supplied", () => {
  const raw = engineRaw();
  raw.people = [person("self", "self"), person("spouse", "spouse_partner")];
  assert.deepEqual(buildMoneyPrioritySnapshot(raw).hsa.marriedAllocations, []);
  raw.hsaMarriedAllocations = [{
    id: "allocation",
    tax_year: 2026,
    person_one_id: "self",
    person_two_id: "spouse",
    person_one_ordinary_amount: 5000,
    person_two_ordinary_amount: 3750,
    confirmed_at: "2026-09-01T12:00:00.000Z",
  }];
  const allocation = buildMoneyPrioritySnapshot(raw).hsa.marriedAllocations[0]!;
  assert.equal(allocation.personOneOrdinaryAmount, 5000);
  assert.equal(allocation.personTwoOrdinaryAmount, 3750);
});

test("HSA normalized contract is input-order invariant", () => {
  const raw = engineRaw();
  raw.people = [person("self", "self"), person("spouse", "spouse_partner")];
  raw.hsaTaxYearProfiles = [profile("ps", "spouse"), profile("p0", "self")];
  raw.hsaMonthStatuses = [month("ms2", "spouse", 2), month("m01", "self", 1), month("ms1", "spouse", 1)];
  const reversed = structuredClone(raw);
  reversed.people = [...(reversed.people ?? [])].reverse();
  reversed.hsaTaxYearProfiles = [...(reversed.hsaTaxYearProfiles ?? [])].reverse();
  reversed.hsaMonthStatuses = [...(reversed.hsaMonthStatuses ?? [])].reverse();
  assert.deepEqual(buildMoneyPrioritySnapshot(raw).hsa, buildMoneyPrioritySnapshot(reversed).hsa);
});

test("rejects month rows without a matching person/tax-year profile and malformed enum values", () => {
  const raw = engineRaw();
  raw.hsaMonthStatuses = [month("orphan", "self", 1, 2026, { eligibility_status: "maybe" })];
  assert.throws(() => buildMoneyPrioritySnapshot(raw), (error) => error instanceof MoneyPrioritySnapshotValidationError
    && error.issues.some((issue) => issue.path.includes("hsaMonthStatuses") && (issue.code === "invalid_reference" || issue.code === "invalid_enum")));
});

test("Recommendation Refresh fingerprints HSA decision-basis changes even before Core HSA calculation changes", () => {
  const beforeRaw = engineRaw();
  beforeRaw.hsaTaxYearProfiles = [profile("p1", "self")];
  beforeRaw.hsaMonthStatuses = [month("m1", "self", 1)];
  const afterRaw = structuredClone(beforeRaw);
  afterRaw.hsaMonthStatuses = [month("m1", "self", 1, 2026, { eligibility_status: "eligible", coverage_status: "self_only", evidence_status: "confirmed" })];

  const previous = runMoneyPriorityEngine(beforeRaw, "2026-09-01");
  const current = runMoneyPriorityEngine(afterRaw, "2026-09-01");
  const refresh = assessRecommendationRefresh(previous, current);
  assert.notEqual(refresh.financialBasisFingerprint, refresh.previousFinancialBasisFingerprint);
  assert.notEqual(refresh.state, "current");
});
