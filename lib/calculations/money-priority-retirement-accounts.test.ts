import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

function snapshot(
  retirementAccounts: Record<string, unknown>[],
  people: Record<string, unknown>[] = [],
  preferences: Record<string, unknown> | null = null,
) {
  return buildMoneyPrioritySnapshot({
    householdId: "h1",
    people,
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: retirementAccounts.map((account) => ({ balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, ...account })),
    preferences,
  });
}

function adult(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
    estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: false,
    is_active: true,
    ...overrides,
  };
}

function taxProfile(overrides: Record<string, unknown> = {}) {
  return {
    tax_profile_year: 2026,
    tax_filing_status: "single",
    estimated_modified_agi: 100000,
    ...overrides,
  };
}

test("2026 family HSA combines employee and employer YTD contributions", () => {
  const value = snapshot([{
    id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa", hsa_eligible: true,
    hsa_coverage_type: "family", employee_contributed_ytd: 3000, employer_contributed_ytd: 500,
  }], [adult()]);
  const hsa = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(hsa?.annualLimit, 8750);
  assert.equal(hsa?.contributedYtd, 3500);
  assert.equal(hsa?.remainingAnnualRoom, 5250);
  assert.equal(hsa?.state, "available");
});

test("HSA age-55 catch-up adds $1,000", () => {
  const value = snapshot([{
    id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa", hsa_eligible: true,
    hsa_coverage_type: "self_only", employee_contributed_ytd: 0, employer_contributed_ytd: 0,
  }], [adult({ birth_date: "1970-01-01" })]);
  const hsa = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(hsa?.annualLimit, 5400);
});

test("401k and 403b deferrals are aggregated by owner", () => {
  const value = snapshot([
    { id: "k", owner_person_id: "p1", name: "401k", account_type: "401k", employee_contributed_ytd: 10000, employer_contributed_ytd: 0 },
    { id: "b", owner_person_id: "p1", name: "403b", account_type: "403b", employee_contributed_ytd: 5000, employer_contributed_ytd: 0 },
  ], [adult()]);
  const result = evaluateRetirementAccountOpportunities(value);
  assert.deepEqual(result.opportunities.map((item) => item.contributedYtd), [15000, 15000]);
  assert.deepEqual(result.opportunities.map((item) => item.remainingAnnualRoom), [9500, 9500]);
});

test("governmental 457b room is evaluated separately", () => {
  const value = snapshot([
    { id: "k", owner_person_id: "p1", name: "401k", account_type: "401k", employee_contributed_ytd: 20000, employer_contributed_ytd: 0 },
    { id: "v", owner_person_id: "p1", name: "457", account_type: "457", employee_contributed_ytd: 5000 },
  ], [adult()]);
  const four57 = evaluateRetirementAccountOpportunities(value).opportunities.find((item) => item.accountId === "v");
  assert.equal(four57?.annualLimit, 24500);
  assert.equal(four57?.remainingAnnualRoom, 19500);
});

test("IRA room can be calculated while tax eligibility remains unresolved", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 2000 },
  ], [adult()], null);
  const ira = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(ira?.annualLimit, 7500);
  assert.equal(ira?.remainingAnnualRoom, 5500);
  assert.equal(ira?.state, "more_information_needed");
  assert.ok(ira?.missingData.some((item) => item.includes("modified AGI")));
});

test("single filer below the 2026 Roth phaseout has full direct Roth eligibility", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 2000 },
  ], [adult()], taxProfile({ estimated_modified_agi: 150000 }));
  const roth = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(roth?.taxEligibility, "full");
  assert.equal(roth?.annualLimit, 7500);
  assert.equal(roth?.remainingAnnualRoom, 5500);
  assert.equal(roth?.state, "available");
});

test("single filer inside the 2026 Roth phaseout gets the IRS reduced direct contribution limit", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 1000 },
  ], [adult()], taxProfile({ estimated_modified_agi: 160500 }));
  const roth = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(roth?.taxEligibility, "partial");
  assert.equal(roth?.annualLimit, 3750);
  assert.equal(roth?.remainingAnnualRoom, 2750);
});

test("single filer at or above $168,000 MAGI is not directly Roth eligible", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 0 },
  ], [adult({ estimated_taxable_compensation_annual: 200000 })], taxProfile({ estimated_modified_agi: 168000 }));
  const roth = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(roth?.taxEligibility, "none");
  assert.equal(roth?.annualLimit, 0);
  assert.equal(roth?.remainingAnnualRoom, 0);
  assert.equal(roth?.state, "not_eligible");
});

test("shared Traditional and Roth IRA contributions cap remaining Roth room", () => {
  const value = snapshot([
    { id: "traditional", owner_person_id: "p1", name: "Traditional IRA", account_type: "traditional_ira", employee_contributed_ytd: 5000 },
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 1000 },
  ], [adult()], taxProfile());
  const roth = evaluateRetirementAccountOpportunities(value).opportunities.find((item) => item.accountId === "roth");
  assert.equal(roth?.annualLimit, 7500);
  assert.equal(roth?.contributedYtd, 1000);
  assert.equal(roth?.remainingAnnualRoom, 1500);
});

test("taxable compensation caps the IRA contribution limit", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 1000 },
  ], [adult({ estimated_taxable_compensation_annual: 4000 })], taxProfile());
  const roth = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(roth?.annualLimit, 4000);
  assert.equal(roth?.remainingAnnualRoom, 3000);
});

test("married filing separately uses the 0-$10,000 Roth band when spouses lived together", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 0 },
  ], [adult()], taxProfile({
    tax_filing_status: "married_filing_separately",
    estimated_modified_agi: 5000,
    lived_with_spouse_during_tax_year: true,
  }));
  const roth = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(roth?.taxEligibility, "partial");
  assert.equal(roth?.annualLimit, 3750);
});

test("married filing separately and living apart uses the single Roth phaseout band", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 0 },
  ], [adult({ estimated_taxable_compensation_annual: 200000 })], taxProfile({
    tax_filing_status: "married_filing_separately",
    estimated_modified_agi: 150000,
    lived_with_spouse_during_tax_year: false,
  }));
  const roth = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(roth?.taxEligibility, "full");
  assert.equal(roth?.annualLimit, 7500);
});

test("covered single filer below the Traditional IRA phaseout has a full deduction", () => {
  const value = snapshot([
    { id: "traditional", owner_person_id: "p1", name: "Traditional IRA", account_type: "traditional_ira", employee_contributed_ytd: 1000 },
  ], [adult({ covered_by_workplace_retirement_plan: true })], taxProfile({ estimated_modified_agi: 80000 }));
  const ira = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(ira?.taxEligibility, "full");
  assert.equal(ira?.taxDeductibility, "full");
  assert.equal(ira?.state, "available");
});

test("covered single filer inside the Traditional IRA phaseout has a partial deduction", () => {
  const value = snapshot([
    { id: "traditional", owner_person_id: "p1", name: "Traditional IRA", account_type: "traditional_ira", employee_contributed_ytd: 1000 },
  ], [adult({ covered_by_workplace_retirement_plan: true })], taxProfile({ estimated_modified_agi: 86000 }));
  const ira = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(ira?.taxDeductibility, "partial");
});

test("covered single filer at or above the Traditional IRA phaseout ceiling has no deduction", () => {
  const value = snapshot([
    { id: "traditional", owner_person_id: "p1", name: "Traditional IRA", account_type: "traditional_ira", employee_contributed_ytd: 1000 },
  ], [adult({ covered_by_workplace_retirement_plan: true })], taxProfile({ estimated_modified_agi: 91000 }));
  const ira = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(ira?.taxEligibility, "full");
  assert.equal(ira?.taxDeductibility, "none");
});

test("MFJ contributor not covered but spouse covered uses the $242k-$252k deduction phaseout", () => {
  const value = snapshot([
    { id: "traditional", owner_person_id: "p1", name: "Traditional IRA", account_type: "traditional_ira", employee_contributed_ytd: 1000 },
  ], [
    adult({ covered_by_workplace_retirement_plan: false }),
    {
      id: "p2", display_name: "Spouse", relationship: "spouse_partner", birth_date: "1990-01-01",
      estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: true, is_active: true,
    },
  ], taxProfile({ tax_filing_status: "married_filing_jointly", estimated_modified_agi: 247000 }));
  const ira = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(ira?.taxDeductibility, "partial");
});

test("tax profile year mismatch blocks IRA tax guidance", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 1000 },
  ], [adult()], taxProfile({ tax_profile_year: 2025 }));
  const roth = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(roth?.state, "more_information_needed");
  assert.equal(roth?.taxEligibility, "unknown");
  assert.ok(roth?.missingData.some((item) => item.includes("Tax profile year must be 2026")));
});

test("unknown HSA eligibility blocks contribution guidance", () => {
  const value = snapshot([{
    id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa", hsa_coverage_type: "family",
    employee_contributed_ytd: 1000, employer_contributed_ytd: 100,
  }], [adult()]);
  const hsa = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(hsa?.state, "more_information_needed");
  assert.ok(hsa?.missingData.some((item) => item.includes("eligibility")));
});
