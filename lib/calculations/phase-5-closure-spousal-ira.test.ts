import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

function build(retirementAccounts: Record<string, unknown>[], people: Record<string, unknown>[]) {
  return buildMoneyPrioritySnapshot({
    householdId: "h1",
    people,
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: retirementAccounts.map((account) => ({ balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, ...account })),
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 247000 },
  });
}

const self = {
  id: "p1", display_name: "Self", relationship: "self", birth_date: "1990-01-01",
  estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: false, is_active: true,
};
const spouse = {
  id: "p2", display_name: "Spouse", relationship: "spouse_partner", birth_date: "1990-01-01",
  estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: true, is_active: true,
};

test("MFJ Traditional IRA deductibility recognizes the persisted spouse_partner relationship", () => {
  const snapshot = build([
    { id: "traditional", owner_person_id: "p1", name: "Traditional IRA", account_type: "traditional_ira", employee_contributed_ytd: 1000 },
  ], [self, spouse]);
  const ira = evaluateRetirementAccountOpportunities(snapshot).opportunities[0];
  assert.equal(ira?.taxDeductibility, "partial");
  assert.equal(ira?.state, "available");
});

test("MFJ spousal IRA compensation pool excludes a nondependent adult child", () => {
  const snapshot = build([
    { id: "self-roth", owner_person_id: "p1", name: "Self Roth", account_type: "roth_ira", employee_contributed_ytd: 0 },
    { id: "spouse-roth", owner_person_id: "p2", name: "Spouse Roth", account_type: "roth_ira", employee_contributed_ytd: 0 },
    { id: "child-roth", owner_person_id: "p3", name: "Child Roth", account_type: "roth_ira", employee_contributed_ytd: 0 },
  ], [
    { ...self, estimated_taxable_compensation_annual: 7500 },
    { ...spouse, estimated_taxable_compensation_annual: 0, covered_by_workplace_retirement_plan: false },
    {
      id: "p3", display_name: "Adult Child", relationship: "child", birth_date: "2001-01-01",
      estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: false,
      is_active: true, is_dependent: false,
    },
  ]);
  const result = evaluateRetirementAccountOpportunities(snapshot);
  const selfRoth = result.opportunities.find((item) => item.accountId === "self-roth");
  const spouseRoth = result.opportunities.find((item) => item.accountId === "spouse-roth");
  const childRoth = result.opportunities.find((item) => item.accountId === "child-roth");
  assert.equal(selfRoth?.annualLimit, 3750);
  assert.equal(spouseRoth?.annualLimit, 0);
  assert.equal(childRoth?.annualLimit, 3750);
});
