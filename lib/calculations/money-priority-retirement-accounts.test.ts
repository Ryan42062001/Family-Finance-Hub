import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

function snapshot(retirementAccounts: Record<string, unknown>[], people: Record<string, unknown>[] = []) {
  return buildMoneyPrioritySnapshot({
    householdId: "h1",
    people,
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts,
    preferences: null,
  });
}

test("2026 family HSA combines employee and employer YTD contributions", () => {
  const value = snapshot([{
    id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa", hsa_eligible: true,
    hsa_coverage_type: "family", employee_contributed_ytd: 3000, employer_contributed_ytd: 500,
  }], [{ id: "p1", display_name: "Adult", birth_date: "1990-01-01", is_active: true }]);
  const result = evaluateRetirementAccountOpportunities(value);
  const hsa = result.opportunities[0];
  assert.equal(hsa?.annualLimit, 8750);
  assert.equal(hsa?.contributedYtd, 3500);
  assert.equal(hsa?.remainingAnnualRoom, 5250);
  assert.equal(hsa?.state, "available");
});

test("HSA age-55 catch-up adds $1,000", () => {
  const value = snapshot([{
    id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa", hsa_eligible: true,
    hsa_coverage_type: "self_only", employee_contributed_ytd: 0, employer_contributed_ytd: 0,
  }], [{ id: "p1", display_name: "Adult", birth_date: "1970-01-01", is_active: true }]);
  const hsa = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(hsa?.annualLimit, 5400);
});

test("401k and 403b deferrals are aggregated by owner", () => {
  const value = snapshot([
    { id: "k", owner_person_id: "p1", name: "401k", account_type: "401k", employee_contributed_ytd: 10000 },
    { id: "b", owner_person_id: "p1", name: "403b", account_type: "403b", employee_contributed_ytd: 5000 },
  ], [{ id: "p1", display_name: "Adult", birth_date: "1990-01-01", is_active: true }]);
  const result = evaluateRetirementAccountOpportunities(value);
  assert.deepEqual(result.opportunities.map((item) => item.contributedYtd), [15000, 15000]);
  assert.deepEqual(result.opportunities.map((item) => item.remainingAnnualRoom), [9500, 9500]);
});

test("governmental 457b room is evaluated separately", () => {
  const value = snapshot([
    { id: "k", owner_person_id: "p1", name: "401k", account_type: "401k", employee_contributed_ytd: 20000 },
    { id: "v", owner_person_id: "p1", name: "457", account_type: "457", employee_contributed_ytd: 5000 },
  ], [{ id: "p1", display_name: "Adult", birth_date: "1990-01-01", is_active: true }]);
  const result = evaluateRetirementAccountOpportunities(value);
  const four57 = result.opportunities.find((item) => item.accountId === "v");
  assert.equal(four57?.annualLimit, 24500);
  assert.equal(four57?.remainingAnnualRoom, 19500);
});

test("IRA room can be calculated while tax eligibility remains unresolved", () => {
  const value = snapshot([
    { id: "roth", owner_person_id: "p1", name: "Roth IRA", account_type: "roth_ira", employee_contributed_ytd: 2000 },
  ], [{ id: "p1", display_name: "Adult", birth_date: "1990-01-01", is_active: true }]);
  const ira = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(ira?.annualLimit, 7500);
  assert.equal(ira?.remainingAnnualRoom, 5500);
  assert.equal(ira?.state, "more_information_needed");
  assert.ok(ira?.missingData.some((item) => item.includes("modified AGI")));
});

test("unknown HSA eligibility blocks contribution guidance", () => {
  const value = snapshot([{
    id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa", hsa_coverage_type: "family",
    employee_contributed_ytd: 1000, employer_contributed_ytd: 100,
  }], [{ id: "p1", display_name: "Adult", birth_date: "1990-01-01", is_active: true }]);
  const hsa = evaluateRetirementAccountOpportunities(value).opportunities[0];
  assert.equal(hsa?.state, "more_information_needed");
  assert.ok(hsa?.missingData.some((item) => item.includes("eligibility")));
});
