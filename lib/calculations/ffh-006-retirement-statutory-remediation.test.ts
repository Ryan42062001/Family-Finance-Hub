import assert from "node:assert/strict";
import test from "node:test";
import { buildMoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

function evaluate(
  account: Record<string, unknown>,
  birthDate = "1971-01-01",
  compensation = 200000,
) {
  const snapshot = buildMoneyPrioritySnapshot({
    householdId: "ffh-006",
    people: [{
      id: "p1",
      display_name: "Participant",
      relationship: "self",
      birth_date: birthDate,
      estimated_taxable_compensation_annual: compensation,
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
      id: "plan",
      owner_person_id: "p1",
      name: "Plan",
      balance: 0,
      monthly_employee_contribution: 0,
      monthly_employer_contribution: 0,
      employee_contributed_ytd: 0,
      ...account,
    }],
  });
  return evaluateRetirementAccountOpportunities(snapshot).opportunities[0]!;
}

test("governmental 457(b) at the 2026 sponsor-wage threshold does not require Roth catch-up", () => {
  const opportunity = evaluate({
    account_type: "457",
    prior_year_sponsor_wages: 150000,
    roth_catch_up_supported: false,
  });

  assert.equal(opportunity.accountType, "457b");
  assert.equal(opportunity.catchUpEligible, true);
  assert.equal(opportunity.catchUpAmount, 8000);
  assert.equal(opportunity.catchUpMustBeRoth, false);
  assert.equal(opportunity.annualLimit, 32500);
  assert.equal(opportunity.remainingAnnualRoom, 32500);
  assert.equal(opportunity.state, "available");
});

test("governmental 457(b) above the 2026 sponsor-wage threshold keeps age catch-up when Roth is supported", () => {
  const opportunity = evaluate({
    account_type: "457",
    prior_year_sponsor_wages: 150000.01,
    roth_catch_up_supported: true,
  });

  assert.equal(opportunity.catchUpAmount, 8000);
  assert.equal(opportunity.catchUpMustBeRoth, true);
  assert.equal(opportunity.annualLimit, 32500);
  assert.equal(opportunity.remainingAnnualRoom, 32500);
  assert.equal(opportunity.state, "available");
});

test("governmental 457(b) above the threshold blocks unsupported Roth catch-up without removing ordinary room", () => {
  const opportunity = evaluate({
    account_type: "457",
    prior_year_sponsor_wages: 150000.01,
    roth_catch_up_supported: false,
  });

  assert.equal(opportunity.catchUpAmount, 8000);
  assert.equal(opportunity.catchUpMustBeRoth, true);
  assert.equal(opportunity.annualLimit, 24500);
  assert.equal(opportunity.remainingAnnualRoom, 24500);
  assert.equal(opportunity.state, "more_information_needed");
  assert.ok(opportunity.missingData.some((item) => item.includes("cannot support the Roth catch-up")));
});

test("governmental 457(b) above the threshold does not fabricate Roth support when support is unknown", () => {
  const opportunity = evaluate({
    account_type: "457",
    prior_year_sponsor_wages: 150000.01,
  });

  assert.equal(opportunity.catchUpMustBeRoth, true);
  assert.equal(opportunity.annualLimit, 24500);
  assert.equal(opportunity.remainingAnnualRoom, 24500);
  assert.equal(opportunity.state, "more_information_needed");
  assert.ok(opportunity.missingData.some((item) => item.includes("Plan Roth catch-up support is required")));
});

test("governmental 457(b) age catch-up remains unresolved when sponsor wages are unknown", () => {
  const opportunity = evaluate({
    account_type: "457",
    roth_catch_up_supported: true,
  });

  assert.equal(opportunity.catchUpAmount, 8000);
  assert.equal(opportunity.catchUpMustBeRoth, null);
  assert.equal(opportunity.state, "more_information_needed");
  assert.ok(opportunity.missingData.some((item) => item.includes("Prior-year wages from this plan's sponsoring employer")));
});

test("governmental 457(b) age-60-through-63 catch-up replaces rather than stacks with the ordinary catch-up", () => {
  const supported = evaluate({
    account_type: "457",
    prior_year_sponsor_wages: 200000,
    roth_catch_up_supported: true,
  }, "1965-01-01");
  const unsupported = evaluate({
    account_type: "457",
    prior_year_sponsor_wages: 200000,
    roth_catch_up_supported: false,
  }, "1965-01-01");

  assert.equal(supported.catchUpAmount, 11250);
  assert.equal(supported.catchUpMustBeRoth, true);
  assert.equal(supported.annualLimit, 35750);
  assert.equal(unsupported.catchUpAmount, 11250);
  assert.equal(unsupported.annualLimit, 24500);
  assert.equal(unsupported.state, "more_information_needed");
});

test("governmental 457(b) special last-three-years catch-up remains deferred", () => {
  const opportunity = evaluate({
    account_type: "457",
    prior_year_sponsor_wages: 100000,
    roth_catch_up_supported: true,
  });

  assert.ok(opportunity.reasons.some((reason) => reason.includes("last-three-years")));
  assert.equal(opportunity.sharedCapacityGroup, null);
});

test("governmental 457(b) participant below age 50 does not require sponsor-wage Roth facts", () => {
  const opportunity = evaluate({ account_type: "457" }, "1980-01-01");

  assert.equal(opportunity.catchUpEligible, false);
  assert.equal(opportunity.catchUpAmount, 0);
  assert.equal(opportunity.catchUpMustBeRoth, false);
  assert.equal(opportunity.annualLimit, 24500);
  assert.equal(opportunity.state, "available");
  assert.ok(!opportunity.missingData.some((item) => item.includes("Prior-year wages")));
});

test("ordinary SIMPLE age-50 catch-up remains $4,000 when the higher-limit flag is explicitly false", () => {
  const opportunity = evaluate({
    account_type: "simple_ira",
    simple_higher_limit_eligible: false,
  });

  assert.equal(opportunity.catchUpAmount, 4000);
  assert.equal(opportunity.annualLimit, 21000);
});

test("ordinary SIMPLE age-60-through-63 catch-up remains $5,250 without stacking", () => {
  const opportunity = evaluate({
    account_type: "simple_ira",
    simple_higher_limit_eligible: false,
  }, "1965-01-01");

  assert.equal(opportunity.catchUpAmount, 5250);
  assert.equal(opportunity.annualLimit, 22250);
});

test("ordinary SIMPLE age 64+ returns to the general $4,000 catch-up", () => {
  const opportunity = evaluate({
    account_type: "simple_ira",
    simple_higher_limit_eligible: false,
  }, "1962-01-01");

  assert.equal(opportunity.catchUpAmount, 4000);
  assert.equal(opportunity.annualLimit, 21000);
});

test("SIMPLE higher-limit uncertainty remains information-needed rather than inferred", () => {
  const opportunity = evaluate({ account_type: "simple_ira" });

  assert.equal(opportunity.state, "more_information_needed");
  assert.ok(opportunity.missingData.some((item) => item.includes("higher applicable-plan limit")));
});

test("unaffected 401(k) base limit remains $24,500 below catch-up age", () => {
  const opportunity = evaluate({
    account_type: "401k",
    employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 200000,
  }, "1980-01-01");

  assert.equal(opportunity.catchUpEligible, false);
  assert.equal(opportunity.annualLimit, 24500);
  assert.equal(opportunity.state, "available");
});
