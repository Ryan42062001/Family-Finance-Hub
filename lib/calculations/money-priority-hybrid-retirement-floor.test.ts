import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";
import { evaluateUserPlan } from "./money-priority-user-plan.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

const AS_OF_DATE = "2026-09-01";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "hybrid-retirement-floor",
    people: [{
      id: "p1", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, estimated_taxable_compensation_annual: 120000,
      covered_by_workplace_retirement_plan: true, is_active: true, is_dependent: false,
    }],
    income: [{ id: "income", owner_person_id: "p1", name: "Income",
      monthly_amount: 8000, monthly_gross_amount: 10000, income_type: "employment",
      is_variable: false, is_active: true }],
    expenses: [{ id: "living", name: "Living", category: "housing",
      monthly_amount: 4000, is_essential: true }],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings",
      balance: 20000, cash_purpose: "protected_reserve" }],
    debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: [{
      id: "work", owner_person_id: "p1", name: "401k", account_type: "401k",
      balance: 185000, monthly_employee_contribution: 1250,
      monthly_employer_contribution: 250, employee_contributed_ytd: 0,
      employer_contributed_ytd: 0, full_match_employee_contribution_monthly: 500,
      match_status: "fully_captured", plan_eligible_compensation_annual: 120000,
    }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced",
      job_replacement_difficulty: "easy", known_income_disruption: false,
      desired_retirement_monthly_spending: 5000,
      retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0, planning_pension_monthly: 0,
      expected_hsa_medical_spending_annual: 0,
      tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000,
    },
  };
}

test("ON_TRACK protects the normal 15 percent floor without requiring maxed accounts", () => {
  const result = runMoneyPriorityEngine(baseRaw(), AS_OF_DATE);
  const floor = result.build.retirementFloor;
  assert.equal(floor.status, "on_track");
  assert.equal(floor.normalBaselineRate, 0.15);
  assert.equal(floor.currentRetirementSavingsAnnual, 18000);
  assert.equal(floor.currentRetirementSavingsRate, 0.15);
  assert.equal(floor.targetProtectedAnnualAmount, 18000);
  assert.ok(floor.additionalVerifiedLegalCapacityAnnual > 0);
});

test("BEHIND raises the corrective target above the normal baseline", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].balance = 0;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.status, "behind");
  assert.ok((floor.projectionRequiredCorrectiveRate ?? 0) > 0.15);
  assert.ok((floor.targetProtectedFloorRate ?? 0) > 0.15);
  assert.ok((floor.projectedPortfolioShortfall ?? 0) > 0);
});

test("AHEAD requires a meaningful durable surplus and cautiously uses 12 percent", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].balance = 500000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.status, "ahead");
  assert.equal(floor.targetProtectedFloorRate, 0.12);
  assert.equal(floor.targetProtectedAnnualAmount, 14400);
});

test("a tiny projection surplus remains ON_TRACK rather than oscillating to AHEAD", () => {
  const floor = runMoneyPriorityEngine(baseRaw(), AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.projection.state, "on_track");
  assert.equal(floor.status, "on_track");
  assert.ok(floor.reasonCodes.includes("projection_on_track_normal_band"));
});

test("employer match remains explicitly protected", () => {
  const floor = runMoneyPriorityEngine(baseRaw(), AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.employerMatchProtectedAnnualAmount, 9000);
  assert.ok(floor.reasonCodes.includes("employer_match_protected"));
});

test("a generous employer contribution does not make zero employee saving the protected policy", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].monthly_employee_contribution = 0;
  raw.retirementAccounts![0].monthly_employer_contribution = 1500;
  raw.retirementAccounts![0].full_match_employee_contribution_monthly = 0;
  raw.retirementAccounts![0].balance = 500000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.employerContributionAnnual, 18000);
  assert.equal(floor.employeeSavingGuardrailAnnualAmount, 6000);
  assert.equal(floor.targetProtectedAnnualAmount, 24000);
});

test("employee workplace, employer, IRA, and long-term HSA components combine exactly", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [
    { ...raw.retirementAccounts![0], monthly_employee_contribution: 750,
      monthly_employer_contribution: 300 },
    { id: "ira", owner_person_id: "p1", name: "IRA", account_type: "traditional_ira",
      balance: 0, monthly_employee_contribution: 200, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered" },
    { id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa",
      balance: 0, monthly_employee_contribution: 350, monthly_employer_contribution: 50,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
      hsa_eligible: true, hsa_coverage_type: "family" },
  ];
  raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: 3300 };
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.employeeWorkplaceContributionAnnual, 9000);
  assert.equal(floor.employerContributionAnnual, 3600);
  assert.equal(floor.iraContributionAnnual, 2400);
  assert.equal(floor.hsaTotalContributionAnnual, 4800);
  assert.equal(floor.longTermHsaContributionAnnual, 1500);
  assert.equal(floor.currentRetirementSavingsAnnual, 16500);
  assert.equal(floor.projectionAnnualContributionAssumption, 16500);
});

test("unknown HSA spending never silently counts all HSA contributions as long-term", () => {
  const raw = baseRaw();
  raw.retirementAccounts!.push({ id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa",
    balance: 0, monthly_employee_contribution: 300, monthly_employer_contribution: 50,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
    hsa_eligible: true, hsa_coverage_type: "family" });
  raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: null };
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.hsaTotalContributionAnnual, 4200);
  assert.equal(floor.longTermHsaContributionAnnual, 0);
  assert.equal(floor.projectionAnnualContributionAssumption, 18000);
  assert.equal(floor.hsaLongTermIntentKnown, false);
  assert.equal(floor.status, "more_information_needed");
});

test("new HSA intent input uses strict nullable nonnegative numeric validation", () => {
  for (const invalid of [" ", false, true, [], {}, [1], "12abc", "$100", Number.NaN,
    Number.POSITIVE_INFINITY, -1]) {
    const raw = baseRaw();
    raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: invalid };
    assert.throws(() => runMoneyPriorityEngine(raw, AS_OF_DATE));
  }
  const raw = baseRaw();
  raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: null };
  assert.doesNotThrow(() => runMoneyPriorityEngine(raw, AS_OF_DATE));
});

test("taxable brokerage assets, emergency savings, goals, and mortgage principal do not enter the rate numerator", () => {
  const raw = baseRaw();
  raw.accounts!.push({ id: "brokerage", name: "Brokerage", account_type: "brokerage",
    balance: 100000, cash_purpose: "not_applicable" });
  raw.goals = [{ id: "goal", name: "Car", target_amount: 20000, current_amount: 5000,
    target_date: "2028-01-01", priority: 3, planned_monthly_contribution: 500 }];
  raw.debts = [{ id: "mortgage", name: "Mortgage", debt_type: "mortgage",
    current_balance: 150000, interest_rate: 5, minimum_payment: 1200 }];
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.currentRetirementSavingsAnnual, 18000);
});

test("supported retirement assets affect projection without changing the contribution-rate numerator", () => {
  const lowAssets = baseRaw();
  lowAssets.retirementAccounts![0].balance = 0;
  const highAssets = baseRaw();
  highAssets.retirementAccounts![0].balance = 500000;
  const low = runMoneyPriorityEngine(lowAssets, AS_OF_DATE).build.retirementFloor;
  const high = runMoneyPriorityEngine(highAssets, AS_OF_DATE).build.retirementFloor;
  assert.equal(low.currentRetirementSavingsAnnual, high.currentRetirementSavingsAnnual);
  assert.ok((high.projection.projectedPortfolioAtRetirement ?? 0)
    > (low.projection.projectedPortfolioAtRetirement ?? 0));
});

test("projection shortfall cannot enlarge verified legal capacity", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].balance = 0;
  raw.retirementAccounts![0].employee_contributed_ytd = 24000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.status, "behind");
  assert.equal(floor.additionalVerifiedLegalCapacityAnnual, 500);
  assert.ok((floor.protectedFloorShortfallAnnual ?? 0) > 500);
  assert.equal(floor.additionalRetirementOpportunityAnnual, 0);
});

test("legal capacity above a satisfied floor remains a separate additional opportunity", () => {
  const floor = runMoneyPriorityEngine(baseRaw(), AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.protectedFloorShortfallAnnual, 0);
  assert.equal(floor.additionalRetirementOpportunityAnnual,
    floor.additionalVerifiedLegalCapacityAnnual);
  assert.ok(floor.additionalRetirementOpportunityAnnual > 0);
});

test("an extreme corrective rate is exposed but capped by protected and feasible ceilings", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].balance = 0;
  raw.retirementAccounts![0].monthly_employee_contribution = 0;
  raw.retirementAccounts![0].monthly_employer_contribution = 0;
  raw.preferences = { ...raw.preferences, desired_retirement_monthly_spending: 12000 };
  raw.income![0].monthly_amount = 4500;
  raw.expenses![0].monthly_amount = 4400;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.status, "behind");
  assert.ok((floor.projectionRequiredCorrectiveRate ?? 0) > 0.25);
  assert.equal(floor.structurallyInfeasibleCorrectiveRate, true);
  assert.ok((floor.targetProtectedFloorRate ?? 0) <= 0.25);
  assert.ok((floor.protectedAnnualAmount ?? 0) < (floor.targetProtectedAnnualAmount ?? 0));
});

test("missing material projection data cannot produce optimistic AHEAD status", () => {
  const raw = baseRaw();
  raw.preferences = { ...raw.preferences, desired_retirement_monthly_spending: null };
  raw.retirementAccounts![0].balance = 1000000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.status, "more_information_needed");
  assert.equal(floor.state, "more_information_needed");
  assert.equal(floor.additionalRetirementOpportunityAnnual, 0);
});

test("equivalent collection reordering preserves the retirement-floor result", () => {
  const raw = baseRaw();
  raw.retirementAccounts!.push({ id: "ira", owner_person_id: "p1", name: "IRA",
    account_type: "roth_ira", balance: 0, monthly_employee_contribution: 0,
    monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_offered" });
  const reordered = structuredClone(raw);
  reordered.retirementAccounts = [...reordered.retirementAccounts!].reverse();
  assert.deepEqual(runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor,
    runMoneyPriorityEngine(reordered, AS_OF_DATE).build.retirementFloor);
});

test("HSA intent changes refresh recommendations while collection reorder remains current", () => {
  const raw = baseRaw();
  raw.retirementAccounts!.push({ id: "hsa", owner_person_id: "p1", name: "HSA", account_type: "hsa",
    balance: 0, monthly_employee_contribution: 300, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
    hsa_eligible: true, hsa_coverage_type: "family" });
  raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: 3600 };
  const changed = structuredClone(raw);
  changed.preferences!.expected_hsa_medical_spending_annual = 0;
  const before = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const after = runMoneyPriorityEngine(changed, AS_OF_DATE);
  assert.equal(assessRecommendationRefresh(before, after).state, "materially_changed");
  const reordered = structuredClone(raw);
  reordered.retirementAccounts = [...reordered.retirementAccounts!].reverse();
  assert.equal(assessRecommendationRefresh(before,
    runMoneyPriorityEngine(reordered, AS_OF_DATE)).state, "current");
});

test("Phase 5A does not change existing Build goal competition", () => {
  const raw = baseRaw();
  raw.goals = [{ id: "car", name: "Car", target_amount: 12000, current_amount: 0,
    target_date: "2027-09-01", priority: 1, necessity: "important",
    planned_monthly_contribution: 1000 }];
  const unknownIntent = structuredClone(raw);
  unknownIntent.preferences!.expected_hsa_medical_spending_annual = null;
  assert.deepEqual(runMoneyPriorityEngine(raw, AS_OF_DATE).build.allocations,
    runMoneyPriorityEngine(unknownIntent, AS_OF_DATE).build.allocations);
});

test("Windfall and Your Plan remain ledger-bound and Recommended Plan stays immutable", () => {
  const engine = runMoneyPriorityEngine(baseRaw(), AS_OF_DATE);
  const before = structuredClone(engine);
  const windfall = allocateWindfall(engine, { amount: 100000, source: "inheritance" });
  assert.ok(windfall.allocations.filter((item) => item.category === "retirement")
    .reduce((sum, item) => sum + item.allocatedAmount, 0)
    <= engine.build.retirementFloor.additionalVerifiedLegalCapacityAnnual);
  evaluateUserPlan(engine, []);
  assert.deepEqual(engine, before);
});

test("hypothetical reruns derive a consistent floor without mutating the source", () => {
  const engine = runMoneyPriorityEngine(baseRaw(), AS_OF_DATE);
  const before = structuredClone(engine);
  const rerun = runHypotheticalMoneyPriorityEngine(engine, {
    addExpenses: [{ id: "vehicle-cost", name: "Vehicle", category: "transportation",
      monthlyAmount: 500, isEssential: false, cashFlowTreatment: "required" }],
  });
  assert.equal(rerun.engine.build.retirementFloor.status, engine.build.retirementFloor.status);
  assert.deepEqual(engine, before);
});
