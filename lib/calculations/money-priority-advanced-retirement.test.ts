import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import { evaluateSecureStage } from "./money-priority-secure.ts";

function person(id: string, birthYear: number, compensation = 100000, relationship = "self") {
  return { id, display_name: id, relationship, birth_date: `${birthYear}-01-01`, is_active: true,
    is_dependent: false, estimated_taxable_compensation_annual: compensation,
    covered_by_workplace_retirement_plan: false };
}

function make(accounts: Record<string, unknown>[], people = [person("p1", 1990)], preferences: Record<string, unknown> | null = null) {
  const completeAccounts = accounts.map((account) => ({ balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, ...account }));
  return buildMoneyPrioritySnapshot({ householdId: "h", people, retirementAccounts: completeAccounts, preferences,
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [] });
}

function profile(overrides: Record<string, unknown> = {}) {
  return { tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000, ...overrides };
}

function workplace(age: number) {
  const birthYear = 2026 - age;
  return evaluateRetirementAccountOpportunities(make([{ id: "w", owner_person_id: "p1", name: "Plan", account_type: "401k",
    employee_contributed_ytd: 0, prior_year_sponsor_wages: 100000 }], [person("p1", birthYear)])).opportunities[0]!;
}

function simpleRuntimeOpportunity(age: number, higher: boolean) {
  const snapshot = make([{ id: "s", owner_person_id: "p1", name: "SIMPLE", account_type: "simple_ira",
    employee_contributed_ytd: 1000 }], [person("p1", 2026 - age)]);
  // This is a Core-formula regression fixture, not a persistence-contract fixture.
  // FFH-011 deliberately makes raw simple_higher_limit_eligible non-authoritative;
  // FFH-015 will teach Core to consume the accepted explicit persisted/runtime category.
  snapshot.retirementAccounts[0]!.simpleHigherLimitEligible = higher;
  return evaluateRetirementAccountOpportunities(snapshot).opportunities[0]!;
}

for (const [age, limit, catchUp] of [[49, 24500, 0], [50, 32500, 8000], [59, 32500, 8000],
  [60, 35750, 11250], [61, 35750, 11250], [62, 35750, 11250], [63, 35750, 11250], [64, 32500, 8000]] as const) {
  test(`workplace age ${age} uses the correct non-stacking catch-up`, () => {
    const result = workplace(age);
    assert.equal(result.annualLimit, limit);
    assert.equal(result.catchUpAmount, catchUp);
  });
}

test("IRA age catch-up is combined across Roth and traditional and balances do not count", () => {
  const result = evaluateRetirementAccountOpportunities(make([
    { id: "r", owner_person_id: "p1", name: "Roth", account_type: "roth_ira", balance: 999999, employee_contributed_ytd: 3000 },
    { id: "t", owner_person_id: "p1", name: "Traditional", account_type: "traditional_ira", balance: 999999, employee_contributed_ytd: 2000 },
  ], [person("p1", 1976)], profile()));
  assert.deepEqual(result.opportunities.map((item) => item.annualLimit), [8600, 8600]);
  assert.deepEqual(result.opportunities.map((item) => item.remainingAnnualRoom), [3600, 3600]);
});

test("MFJ spousal IRA permits separate zero-earner capacity without exceeding household compensation", () => {
  const result = evaluateRetirementAccountOpportunities(make([
    { id: "a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", employee_contributed_ytd: 0 },
    { id: "b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", employee_contributed_ytd: 0 },
  ], [person("a", 1990, 80000), person("b", 1990, 0, "spouse_partner")], profile({ tax_filing_status: "married_filing_jointly" })));
  assert.deepEqual(result.opportunities.map((item) => [item.ownerPersonId, item.annualLimit]), [["a", 7500], ["b", 7500]]);
});

test("limited MFJ household compensation is allocated deterministically and never doubled", () => {
  const result = evaluateRetirementAccountOpportunities(make([
    { id: "a", owner_person_id: "a", name: "A", account_type: "traditional_ira", employee_contributed_ytd: 0 },
    { id: "b", owner_person_id: "b", name: "B", account_type: "traditional_ira", employee_contributed_ytd: 0 },
  ], [person("a", 1990, 10000), person("b", 1990, 0, "spouse_partner")], profile({ tax_filing_status: "married_filing_jointly" })));
  assert.equal(result.opportunities.reduce((sum, item) => sum + (item.annualLimit ?? 0), 0), 10000);
  assert.deepEqual(result.opportunities.map((item) => item.annualLimit), [7500, 2500]);
});

test("non-joint zero-earner IRA receives targeted missing data, not spousal capacity", () => {
  const result = evaluateRetirementAccountOpportunities(make([
    { id: "b", owner_person_id: "b", name: "B", account_type: "traditional_ira", employee_contributed_ytd: 0 },
  ], [person("b", 1990, 0, "spouse_partner")], profile({ tax_filing_status: "married_filing_separately", lived_with_spouse_during_tax_year: true })));
  assert.equal(result.opportunities[0]?.state, "more_information_needed");
  assert.ok(result.opportunities[0]?.missingData.some((item) => item.includes("spousal-IRA")));
});

for (const [age, higher, limit] of [[40, false, 17000], [50, false, 21000], [60, false, 22250], [64, false, 21000], [40, true, 18100]] as const) {
  test(`SIMPLE age ${age} higher=${higher} uses plan-specific limit`, () => {
    const result = simpleRuntimeOpportunity(age, higher);
    assert.equal(result.annualLimit, limit);
    assert.equal(result.remainingAnnualRoom, limit - 1000);
  });
}

test("unknown higher SIMPLE eligibility does not grant the higher limit", () => {
  const result = evaluateRetirementAccountOpportunities(make([{ id: "s", owner_person_id: "p1", name: "SIMPLE", account_type: "simple_ira",
    employee_contributed_ytd: 0 }])).opportunities[0]!;
  assert.equal(result.annualLimit, 17000);
  assert.equal(result.state, "more_information_needed");
});

test("SIMPLE coordinates with another plan while governmental 457 remains separate", () => {
  const result = evaluateRetirementAccountOpportunities(make([
    { id: "k", owner_person_id: "p1", name: "K", account_type: "401k", employee_contributed_ytd: 10000 },
    { id: "s", owner_person_id: "p1", name: "S", account_type: "simple_ira", employee_contributed_ytd: 14000, simple_higher_limit_eligible: false },
    { id: "v", owner_person_id: "p1", name: "V", account_type: "457b", employee_contributed_ytd: 10000 },
  ])).opportunities;
  assert.equal(result.find((item) => item.accountId === "k")?.remainingAnnualRoom, 500);
  assert.equal(result.find((item) => item.accountId === "s")?.remainingAnnualRoom, 500);
  assert.equal(result.find((item) => item.accountId === "v")?.remainingAnnualRoom, 14500);
});

test("ordinary SEP is employer-only and capped at 25% compensation", () => {
  const result = evaluateRetirementAccountOpportunities(make([{ id: "sep", owner_person_id: "p1", name: "401k-looking SEP",
    account_type: "sep_ira", employee_contributed_ytd: 9000, employer_contributed_ytd: 5000,
    sep_eligible_compensation_annual: 100000, sep_compensation_calculation_supported: true }])).opportunities[0]!;
  assert.equal(result.contributionSource, "employer");
  assert.equal(result.annualLimit, 25000);
  assert.equal(result.remainingAnnualRoom, 20000);
  assert.equal(result.catchUpAmount, 0);
});

test("SEP maximum is $72,000 and unsupported self-employed math stays unknown", () => {
  const capped = evaluateRetirementAccountOpportunities(make([{ id: "sep", owner_person_id: "p1", name: "SEP", account_type: "sep_ira",
    employer_contributed_ytd: 0, sep_eligible_compensation_annual: 400000, sep_compensation_calculation_supported: true }])).opportunities[0]!;
  const unknown = evaluateRetirementAccountOpportunities(make([{ id: "sep", owner_person_id: "p1", name: "SEP", account_type: "sep_ira",
    employer_contributed_ytd: 0 }])).opportunities[0]!;
  assert.equal(capped.annualLimit, 72000);
  assert.equal(unknown.state, "more_information_needed");
});

for (const [wages, mustBeRoth] of [[149999.99, false], [150000, false], [150000.01, true]] as const) {
  test(`prior-year sponsor wages ${wages} produce Roth catch-up=${mustBeRoth}`, () => {
    const result = evaluateRetirementAccountOpportunities(make([{ id: "w", owner_person_id: "p1", name: "Plan", account_type: "401k",
      employee_contributed_ytd: 0, prior_year_sponsor_wages: wages, roth_catch_up_supported: true }], [person("p1", 1976)])).opportunities[0]!;
    assert.equal(result.catchUpMustBeRoth, mustBeRoth);
  });
}

test("missing sponsor wages and missing Roth support are targeted without using household income", () => {
  const missingWages = evaluateRetirementAccountOpportunities(make([{ id: "w", owner_person_id: "p1", name: "Plan", account_type: "401k",
    employee_contributed_ytd: 0 }], [person("p1", 1976, 999999)])).opportunities[0]!;
  const missingSupport = evaluateRetirementAccountOpportunities(make([{ id: "w", owner_person_id: "p1", name: "Plan", account_type: "401k",
    employee_contributed_ytd: 0, prior_year_sponsor_wages: 150000.01 }], [person("p1", 1976)])).opportunities[0]!;
  assert.equal(missingWages.catchUpMustBeRoth, null);
  assert.ok(missingWages.missingData.some((item) => item.includes("Prior-year wages")));
  assert.ok(missingSupport.missingData.some((item) => item.includes("Roth catch-up support")));
});

test("unsupported Roth catch-up removes only catch-up capacity", () => {
  const result = evaluateRetirementAccountOpportunities(make([{ id: "w", owner_person_id: "p1", name: "Plan", account_type: "401k",
    employee_contributed_ytd: 0, prior_year_sponsor_wages: 150000.01, roth_catch_up_supported: false }], [person("p1", 1976)])).opportunities[0]!;
  assert.equal(result.annualLimit, 24500);
  assert.equal(result.state, "more_information_needed");
});

test("IRA and SEP are never subjected to workplace Roth catch-up", () => {
  const result = evaluateRetirementAccountOpportunities(make([
    { id: "ira", owner_person_id: "p1", name: "IRA", account_type: "traditional_ira", employee_contributed_ytd: 0 },
    { id: "sep", owner_person_id: "p1", name: "SEP", account_type: "sep_ira", employer_contributed_ytd: 0,
      sep_eligible_compensation_annual: 100000, sep_compensation_calculation_supported: true },
  ], [person("p1", 1976)], profile())).opportunities;
  assert.deepEqual(result.map((item) => item.catchUpMustBeRoth), [false, false]);
});

test("ordinary SEP and SIMPLE nonelective contributions create no Secure match recommendation", () => {
  const snapshot = make([
    { id: "sep", owner_person_id: "p1", name: "SEP", account_type: "sep_ira", match_status: "not_fully_captured", full_match_employee_contribution_monthly: 500 },
    { id: "s", owner_person_id: "p1", name: "SIMPLE", account_type: "simple_ira", employer_contribution_type: "nonelective",
      match_status: "not_fully_captured", full_match_employee_contribution_monthly: 500 },
  ]);
  assert.equal(evaluateSecureStage(snapshot, "2026-01-01").recommendations.some((item) => item.id.includes("match")), false);
});

test("opportunity tiers are explicit and nondeductible IRA is lower quality", () => {
  const result = evaluateRetirementAccountOpportunities(make([{ id: "t", owner_person_id: "p1", name: "Traditional", account_type: "traditional_ira",
    employee_contributed_ytd: 0 }], [{ ...person("p1", 1990, 200000), covered_by_workplace_retirement_plan: true }], profile({ estimated_modified_agi: 200000 })));
  assert.equal(result.opportunities[0]?.taxDeductibility, "none");
  assert.equal(result.opportunities[0]?.opportunityTier, "secondary_tax_advantaged");
});
