import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

function evaluate(accounts: Record<string, unknown>[], compensation: number | null = 100000, birthDate = "1990-01-01") {
  return evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot({
    householdId: "workplace-limits",
    people: [{ id: "p", display_name: "Person", relationship: "self", birth_date: birthDate,
      estimated_taxable_compensation_annual: compensation, covered_by_workplace_retirement_plan: true,
      is_active: true, is_dependent: false }],
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: accounts,
  })).opportunities;
}

test("substantial employer additions cap remaining employee opportunity at the 2026 annual-additions ceiling", () => {
  const result = evaluate([{ id: "k", owner_person_id: "p", name: "401k", account_type: "401k",
    employee_contributed_ytd: 20000, employer_contributed_ytd: 50000, plan_eligible_compensation_annual: 100000 }])[0]!;
  assert.equal(result.annualAdditionsLimit, 72000);
  assert.equal(result.annualAdditionsYtd, 70000);
  assert.equal(result.remainingAnnualRoom, 2000);
  assert.equal(result.state, "available");
});

test("multiple workplace accounts share a conservative owner-level annual-additions ceiling", () => {
  const result = evaluate([
    { id: "a", owner_person_id: "p", name: "401k", account_type: "401k", employee_contributed_ytd: 10000, employer_contributed_ytd: 30000, plan_eligible_compensation_annual: 50000 },
    { id: "b", owner_person_id: "p", name: "403b", account_type: "403b", employee_contributed_ytd: 5000, employer_contributed_ytd: 25000, plan_eligible_compensation_annual: 40000 },
  ]);
  assert.deepEqual(result.map((item) => item.annualAdditionsYtd), [40000, 30000]);
  assert.deepEqual(result.map((item) => item.annualAdditionsLimit), [50000, 40000]);
  assert.ok(result.every((item) => item.state === "more_information_needed"));
  assert.ok(result.every((item) => item.sharedCapacityGroup === "elective-deferral:p"));
});

test("supported compensation applies the 100-percent ceiling", () => {
  const result = evaluate([{ id: "k", owner_person_id: "p", name: "401k", account_type: "401k",
    employee_contributed_ytd: 10000, employer_contributed_ytd: 25000, plan_eligible_compensation_annual: 40000 }], 100000)[0]!;
  assert.equal(result.annualAdditionsLimit, 40000);
  assert.equal(result.compensationLimitApplied, 40000);
  assert.equal(result.remainingAnnualRoom, 5000);
});

test("person-wide earnings never enlarge a specific plan compensation ceiling", () => {
  const result = evaluate([{ id: "k", owner_person_id: "p", name: "401k", account_type: "401k",
    employee_contributed_ytd: 2000, employer_contributed_ytd: 1000, plan_eligible_compensation_annual: 10000 }], 100000)[0]!;
  assert.equal(result.compensationLimitApplied, 10000);
  assert.equal(result.annualAdditionsLimit, 10000);
  assert.equal(result.remainingAnnualRoom, 7000);
});

test("person compensation cannot substitute for missing plan-specific compensation", () => {
  const result = evaluate([{ id: "k", owner_person_id: "p", name: "401k", account_type: "401k",
    employee_contributed_ytd: 1000, employer_contributed_ytd: 0 }], 100000)[0]!;
  assert.equal(result.state, "more_information_needed");
  assert.equal(result.annualAdditionsLimit, null);
  assert.ok(result.missingData.some((item) => item.includes("specific plan")));
});

test("IRA capacity continues to use individual compensation rather than plan compensation", () => {
  const result = evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot({
    householdId: "ira-control",
    people: [{ id: "p", display_name: "Person", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 4000, is_active: true }],
    retirementAccounts: [{ id: "ira", owner_person_id: "p", name: "IRA", account_type: "traditional_ira", employee_contributed_ytd: 0 }],
    preferences: { tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 4000 },
  })).opportunities[0]!;
  assert.equal(result.annualLimit, 4000);
});

test("missing compensation or employer additions produces conservative more-information-needed state", () => {
  const missingCompensation = evaluate([{ id: "k", owner_person_id: "p", name: "401k", account_type: "401k",
    employee_contributed_ytd: 1000, employer_contributed_ytd: 0 }], 100000)[0]!;
  const missingEmployer = evaluate([{ id: "k", owner_person_id: "p", name: "401k", account_type: "401k",
    employee_contributed_ytd: 1000, plan_eligible_compensation_annual: 100000 }])[0]!;
  assert.equal(missingCompensation.state, "more_information_needed");
  assert.equal(missingCompensation.annualAdditionsLimit, null);
  assert.equal(missingEmployer.state, "more_information_needed");
  assert.equal(missingEmployer.annualAdditionsYtd, null);
});

test("age-based catch-up is not consumed by the ordinary annual-additions ceiling", () => {
  const result = evaluate([{ id: "k", owner_person_id: "p", name: "401k", account_type: "401k",
    employee_contributed_ytd: 24500, employer_contributed_ytd: 47500, plan_eligible_compensation_annual: 100000 }], 100000, "1970-01-01")[0]!;
  assert.equal(result.annualAdditionsYtd, 72000);
  assert.equal(result.catchUpAmount, 8000);
  assert.equal(result.remainingAnnualRoom, 8000);
});

test("403b special 15-year catch-up is explicitly excluded without required plan history", () => {
  const result = evaluate([{ id: "b", owner_person_id: "p", name: "403b", account_type: "403b",
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, plan_eligible_compensation_annual: 100000 }])[0]!;
  assert.equal(result.annualLimit, 24500);
  assert.ok(result.reasons.some((reason) => reason.includes("15-years-of-service")));
});

test("governmental 457b special last-three-years catch-up is excluded while ordinary separation remains", () => {
  const result = evaluate([
    { id: "k", owner_person_id: "p", name: "401k", account_type: "401k", employee_contributed_ytd: 20000, employer_contributed_ytd: 0, plan_eligible_compensation_annual: 100000 },
    { id: "v", owner_person_id: "p", name: "457b", account_type: "457b", employee_contributed_ytd: 5000 },
  ]);
  const four57 = result.find((item) => item.accountId === "v")!;
  assert.equal(four57.annualLimit, 24500);
  assert.equal(four57.remainingAnnualRoom, 19500);
  assert.ok(four57.reasons.some((reason) => reason.includes("last-three-years")));
  assert.notEqual(four57.sharedCapacityGroup, "elective-deferral:p");
});
