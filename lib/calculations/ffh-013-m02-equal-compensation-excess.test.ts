import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

function equalCompensationScenario(
  ytdA: number,
  ytdB: number,
  options: { reversePeople?: boolean; reverseAccounts?: boolean } = {},
) {
  const people = [
    { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 10000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 10000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
  ];
  const retirementAccounts = [
    { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: ytdA, employer_contributed_ytd: 0 },
    { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: ytdB, employer_contributed_ytd: 0 },
  ];
  return buildMoneyPrioritySnapshot({
    householdId: "ffh-013-m02",
    people: options.reversePeople ? [...people].reverse() : people,
    retirementAccounts: options.reverseAccounts ? [...retirementAccounts].reverse() : retirementAccounts,
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 20000 },
  });
}

function unequalCompensationScenario() {
  return buildMoneyPrioritySnapshot({
    householdId: "ffh-013-m02-a04",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 4000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 2000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    retirementAccounts: [
      { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 5000, employer_contributed_ytd: 0 },
      { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    ],
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 6000 },
  });
}

function summarize(ytdA: number, ytdB: number, options: { reversePeople?: boolean; reverseAccounts?: boolean } = {}) {
  const result = evaluateRetirementAccountOpportunities(equalCompensationScenario(ytdA, ytdB, options));
  const opportunities = result.opportunities
    .map((item) => ({
      owner: item.ownerPersonId,
      room: item.remainingAnnualRoom,
      sharedGroup: item.sharedCapacityGroup,
      sharedRemaining: item.sharedCapacityRemainingRoom,
    }))
    .sort((left, right) => left.owner!.localeCompare(right.owner!));
  return { result, opportunities };
}

test("FFH-013-M02 equal compensation keeps A owner-only excess local", () => {
  const { result, opportunities } = summarize(8000, 0);
  assert.deepEqual(opportunities.map((item) => [item.owner, item.room]), [["a", 0], ["b", 7500]]);
  assert.deepEqual(opportunities.map((item) => item.sharedGroup), ["ira:a", "ira:b"]);
  assert.ok(opportunities.every((item) => !item.sharedGroup?.startsWith("ira:mfj-compensation:")));
  assert.ok(result.warnings.some((item) => item.includes("A's") && item.includes("owner compensation ceiling") && item.includes("additional IRA room for this owner is zero")));
});

test("FFH-013-M02 equal compensation keeps B owner-only excess local", () => {
  const { result, opportunities } = summarize(0, 8000);
  assert.deepEqual(opportunities.map((item) => [item.owner, item.room]), [["a", 7500], ["b", 0]]);
  assert.deepEqual(opportunities.map((item) => item.sharedGroup), ["ira:a", "ira:b"]);
  assert.ok(result.warnings.some((item) => item.includes("B's") && item.includes("owner compensation ceiling") && item.includes("additional IRA room for this owner is zero")));
});

test("FFH-013-M02 person input reversal preserves owner-local equal-compensation results", () => {
  assert.deepEqual(summarize(8000, 0).opportunities, summarize(8000, 0, { reversePeople: true }).opportunities);
  assert.deepEqual(summarize(0, 8000).opportunities, summarize(0, 8000, { reversePeople: true }).opportunities);
});

test("FFH-013-M02 IRA account input reversal preserves owner-local equal-compensation results", () => {
  assert.deepEqual(summarize(8000, 0).opportunities, summarize(8000, 0, { reverseAccounts: true }).opportunities);
  assert.deepEqual(summarize(0, 8000).opportunities, summarize(0, 8000, { reverseAccounts: true }).opportunities);
});

test("FFH-013-M02 preserves unequal-compensation A04 shared-group fail-closed behavior", () => {
  const result = evaluateRetirementAccountOpportunities(unequalCompensationScenario());
  const opportunities = result.opportunities.sort((left, right) => left.ownerPersonId!.localeCompare(right.ownerPersonId!));
  assert.deepEqual(opportunities.map((item) => item.remainingAnnualRoom), [0, 0]);
  assert.ok(opportunities.every((item) => item.sharedCapacityGroup?.startsWith("ira:mfj-compensation:")));
  assert.ok(result.warnings.some((item) => item.includes("A's") && item.includes("owner compensation ceiling") && item.includes("affected shared MFJ group is zero")));
});
