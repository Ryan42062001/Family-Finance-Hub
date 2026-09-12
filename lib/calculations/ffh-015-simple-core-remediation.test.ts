import assert from "node:assert/strict";
import test from "node:test";

import { createRetirementCapacityLedger } from "./money-priority-retirement-capacity.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";

function evaluateSimple(
  overrides: Record<string, unknown> = {},
  birthDate = "1976-01-01",
) {
  const snapshot = buildMoneyPrioritySnapshot({
    householdId: "ffh-015",
    people: [{
      id: "p1",
      display_name: "Participant",
      relationship: "self",
      birth_date: birthDate,
      estimated_taxable_compensation_annual: 200000,
      covered_by_workplace_retirement_plan: true,
      is_active: true,
      is_dependent: false,
    }],
    income: [],
    expenses: [],
    accounts: [],
    debts: [],
    goals: [],
    insuranceExposures: [],
    retirementAccounts: [{
      id: "simple",
      owner_person_id: "p1",
      name: "SIMPLE IRA",
      account_type: "simple_ira",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: 0,
      ...overrides,
    }],
  });
  const result = evaluateRetirementAccountOpportunities(snapshot);
  return { result, opportunity: result.opportunities[0]! };
}

function verifiedCategory(category: "standard" | "certain_applicable_higher", overrides: Record<string, unknown> = {}) {
  return {
    simple_plan_limit_category: category,
    simple_plan_limit_tax_year: 2026,
    ...overrides,
  };
}

test("FFH-015 ordinary SIMPLE consumes the explicit FFH-011 standard category", () => {
  const { opportunity } = evaluateSimple(verifiedCategory("standard", {
    simple_higher_limit_eligible: true,
  }));

  assert.equal(opportunity.state, "available");
  assert.equal(opportunity.annualLimit, 21000);
  assert.equal(opportunity.catchUpEligible, true);
  assert.equal(opportunity.catchUpAmount, 4000);
  assert.equal(opportunity.remainingAnnualRoom, 21000);
  assert.deepEqual(opportunity.missingData, []);
});

test("FFH-015 verified certain-applicable higher SIMPLE uses the higher base and its own age-50 catch-up", () => {
  const { opportunity } = evaluateSimple(verifiedCategory("certain_applicable_higher", {
    simple_higher_limit_eligible: false,
  }));

  assert.equal(opportunity.state, "available");
  assert.equal(opportunity.annualLimit, 21950);
  assert.equal(opportunity.catchUpEligible, true);
  assert.equal(opportunity.catchUpAmount, 3850);
  assert.equal(opportunity.remainingAnnualRoom, 21950);
  assert.deepEqual(opportunity.missingData, []);
});

test("FFH-015 certain-applicable higher SIMPLE age-band boundaries replace rather than stack catch-up capacity", () => {
  const cases = [
    { birthDate: "1977-01-01", annualLimit: 18100, catchUp: 0 },
    { birthDate: "1976-01-01", annualLimit: 21950, catchUp: 3850 },
    { birthDate: "1967-01-01", annualLimit: 21950, catchUp: 3850 },
    { birthDate: "1966-01-01", annualLimit: 23350, catchUp: 5250 },
    { birthDate: "1963-01-01", annualLimit: 23350, catchUp: 5250 },
    { birthDate: "1962-01-01", annualLimit: 21950, catchUp: 3850 },
  ] as const;

  for (const item of cases) {
    const { opportunity } = evaluateSimple(verifiedCategory("certain_applicable_higher"), item.birthDate);
    assert.equal(opportunity.annualLimit, item.annualLimit, item.birthDate);
    assert.equal(opportunity.catchUpAmount, item.catchUp, item.birthDate);
  }
});

test("FFH-015 ordinary SIMPLE retains the general and age-60-through-63 catch-up bands", () => {
  const age50 = evaluateSimple(verifiedCategory("standard"), "1976-01-01").opportunity;
  const age60 = evaluateSimple(verifiedCategory("standard"), "1966-01-01").opportunity;
  const age64 = evaluateSimple(verifiedCategory("standard"), "1962-01-01").opportunity;

  assert.equal(age50.annualLimit, 21000);
  assert.equal(age50.catchUpAmount, 4000);
  assert.equal(age60.annualLimit, 22250);
  assert.equal(age60.catchUpAmount, 5250);
  assert.equal(age64.annualLimit, 21000);
  assert.equal(age64.catchUpAmount, 4000);
});

test("FFH-015 annual-room boundary reaches zero exactly at each verified SIMPLE category limit", () => {
  const standard = evaluateSimple(verifiedCategory("standard", {
    employee_contributed_ytd: 21000,
  })).opportunity;
  const higher = evaluateSimple(verifiedCategory("certain_applicable_higher", {
    employee_contributed_ytd: 21950,
  })).opportunity;

  assert.equal(standard.remainingAnnualRoom, 0);
  assert.equal(standard.state, "limit_reached");
  assert.equal(higher.remainingAnnualRoom, 0);
  assert.equal(higher.state, "limit_reached");
});

test("FFH-015 legacy higher-limit boolean alone remains conservative and non-authoritative", () => {
  const { opportunity } = evaluateSimple({ simple_higher_limit_eligible: true });

  assert.equal(opportunity.annualLimit, 21000);
  assert.equal(opportunity.catchUpAmount, 4000);
  assert.equal(opportunity.state, "more_information_needed");
  assert.ok(opportunity.missingData.some((item) => item.includes("higher applicable-plan limit")));
});

test("FFH-015 stale explicit higher category remains conservative until tax-year authority is refreshed", () => {
  const { opportunity } = evaluateSimple({
    simple_plan_limit_category: "certain_applicable_higher",
    simple_plan_limit_tax_year: 2025,
  });

  assert.equal(opportunity.annualLimit, 21000);
  assert.equal(opportunity.catchUpAmount, 4000);
  assert.equal(opportunity.state, "more_information_needed");
  assert.ok(opportunity.missingData.some((item) => item.includes("higher applicable-plan limit")));
});

test("FFH-015 capacity ledger keeps standard and higher-category catch-up amounts distinct", () => {
  const standardResult = evaluateSimple(verifiedCategory("standard", {
    employee_contributed_ytd: 17000,
  })).result;
  const higherResult = evaluateSimple(verifiedCategory("certain_applicable_higher", {
    employee_contributed_ytd: 18100,
  })).result;

  const standardEntry = createRetirementCapacityLedger(standardResult).entries[0]!;
  const higherEntry = createRetirementCapacityLedger(higherResult).entries[0]!;

  assert.equal(standardEntry.catchUpRemainingRoom, 4000);
  assert.equal(standardEntry.remainingAnnualRoom, 4000);
  assert.equal(higherEntry.catchUpRemainingRoom, 3850);
  assert.equal(higherEntry.remainingAnnualRoom, 3850);
});

test("FFH-015 leaves unrelated 401(k) capacity unchanged", () => {
  const snapshot = buildMoneyPrioritySnapshot({
    householdId: "ffh-015-401k",
    people: [{
      id: "p1",
      display_name: "Participant",
      relationship: "self",
      birth_date: "1980-01-01",
      estimated_taxable_compensation_annual: 200000,
      covered_by_workplace_retirement_plan: true,
      is_active: true,
      is_dependent: false,
    }],
    income: [],
    expenses: [],
    accounts: [],
    debts: [],
    goals: [],
    insuranceExposures: [],
    retirementAccounts: [{
      id: "workplace",
      owner_person_id: "p1",
      name: "401(k)",
      account_type: "401k",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: 0,
      employer_contributed_ytd: 0,
      plan_eligible_compensation_annual: 200000,
    }],
  });
  const opportunity = evaluateRetirementAccountOpportunities(snapshot).opportunities[0]!;

  assert.equal(opportunity.annualLimit, 24500);
  assert.equal(opportunity.catchUpAmount, 0);
  assert.equal(opportunity.remainingAnnualRoom, 24500);
  assert.equal(opportunity.state, "available");
});
