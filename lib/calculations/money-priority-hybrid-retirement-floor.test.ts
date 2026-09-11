import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine as runEngineBase } from "./money-priority-engine.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";
import { evaluateUserPlan } from "./money-priority-user-plan.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { MONEY_PRIORITY_POLICY_V1 } from "./money-priority-policy.ts";
import { withNormalizedHsaFacts } from "./hsa-test-fixtures.ts";

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

const runMoneyPriorityEngine: typeof runEngineBase = (raw, asOfDate, policy) =>
  runEngineBase(withNormalizedHsaFacts(raw), asOfDate, policy);

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
  assert.equal(floor.status, "ahead");
  assert.equal(floor.employeeSavingGuardrailAnnualAmount, 0);
  assert.equal(floor.targetProtectedAnnualAmount, 18000);
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
    floor.remainingLegalCapacityAfterScheduledAnnual);
  assert.ok(floor.additionalRetirementOpportunityAnnual
    < floor.additionalVerifiedLegalCapacityAnnual);
  assert.ok(floor.additionalRetirementOpportunityAnnual > 0);
});

test("unlawful workplace schedule is constrained before projection and cannot create AHEAD", () => {
  const raw = baseRaw();
  raw.income![0].monthly_gross_amount = 8333.333333;
  raw.people![0].estimated_taxable_compensation_annual = 100000;
  raw.retirementAccounts![0].plan_eligible_compensation_annual = 100000;
  raw.retirementAccounts![0].balance = 0;
  raw.retirementAccounts![0].monthly_employee_contribution = 5000;
  raw.retirementAccounts![0].monthly_employer_contribution = 0;
  raw.retirementAccounts![0].full_match_employee_contribution_monthly = 0;
  raw.retirementAccounts![0].match_status = "not_offered";
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.reportedScheduledContributionAnnual, 60000);
  assert.equal(floor.currentRetirementSavingsAnnual, 24500);
  assert.equal(floor.projectionAnnualContributionAssumption, 24500);
  assert.equal(floor.unsupportedScheduledContributionAnnual, 35500);
  assert.notEqual(floor.status, "ahead");
  assert.ok(floor.reasonCodes.includes("scheduled_pace_constrained_by_legal_capacity"));
});

test("lawful remaining workplace schedule reserves room before additional opportunity", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].employee_contributed_ytd = 10000;
  raw.retirementAccounts![0].employer_contributed_ytd = 2000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.scheduledContributionReservedCurrentYear, 6000);
  assert.equal(floor.additionalVerifiedLegalCapacityAnnual, 14500);
  assert.equal(floor.remainingLegalCapacityAfterScheduledAnnual, 9500);
  assert.equal(floor.additionalRetirementOpportunityAnnual, 9500);
});

test("same-owner Traditional and Roth IRA schedules share prospective capacity", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [
    { id: "traditional", owner_person_id: "p1", name: "Traditional",
      account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 500,
      monthly_employer_contribution: 0, employee_contributed_ytd: 0,
      employer_contributed_ytd: 0, match_status: "not_offered" },
    { id: "roth", owner_person_id: "p1", name: "Roth", account_type: "roth_ira",
      balance: 0, monthly_employee_contribution: 500, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0,
      match_status: "not_offered" },
  ];
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.reportedScheduledContributionAnnual, 12000);
  assert.equal(floor.currentRetirementSavingsAnnual, 7500);
  assert.equal(floor.unsupportedScheduledContributionAnnual, 4500);
  assert.equal(floor.remainingLegalCapacityAfterScheduledAnnual, 3500);
});

test("different spouses retain separate prospective IRA limits", () => {
  const raw = baseRaw();
  raw.people!.push({ id: "p2", display_name: "Spouse", relationship: "spouse_partner",
    birth_date: "1990-01-01", planned_retirement_age: 65,
    estimated_taxable_compensation_annual: 60000,
    covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false });
  raw.preferences = { ...raw.preferences, tax_filing_status: "married_filing_jointly" };
  raw.retirementAccounts = ["p1", "p2"].map((owner, index) => ({
    id: `ira-${index}`, owner_person_id: owner, name: `IRA ${index}`,
    account_type: "roth_ira", balance: 0, monthly_employee_contribution: 500,
    monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_offered",
  }));
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.currentRetirementSavingsAnnual, 12000);
  assert.equal(floor.unsupportedScheduledContributionAnnual, 0);
  assert.equal(floor.remainingLegalCapacityAfterScheduledAnnual, 11000);
});

test("married-family HSA schedules reserve one shared ordinary bucket", () => {
  const raw = baseRaw();
  raw.people!.push({ id: "p2", display_name: "Spouse", relationship: "spouse_partner",
    birth_date: "1990-01-01", planned_retirement_age: 65,
    estimated_taxable_compensation_annual: 60000,
    covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false });
  raw.preferences = { ...raw.preferences, tax_filing_status: "married_filing_jointly" };
  raw.retirementAccounts = ["p1", "p2"].map((owner, index) => ({
    id: `hsa-${index}`, owner_person_id: owner, name: `HSA ${index}`, account_type: "hsa",
    balance: 0, monthly_employee_contribution: 500, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
    hsa_eligible: true, hsa_coverage_type: "family",
  }));
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.hsaTotalContributionAnnual, 8750);
  assert.equal(floor.unsupportedScheduledContributionAnnual, 3250);
  assert.equal(floor.remainingLegalCapacityAfterScheduledAnnual, 4750);
});

test("married HSA catch-up schedule remains owner-specific", () => {
  const raw = baseRaw();
  raw.people![0].birth_date = "1960-01-01";
  raw.people!.push({ id: "p2", display_name: "Spouse", relationship: "spouse_partner",
    birth_date: "1960-01-01", planned_retirement_age: 70,
    estimated_taxable_compensation_annual: 60000,
    covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false });
  raw.preferences = { ...raw.preferences, tax_filing_status: "married_filing_jointly" };
  raw.retirementAccounts = [
    { id: "hsa-a", owner_person_id: "p1", name: "HSA A", account_type: "hsa",
      balance: 0, monthly_employee_contribution: 900, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
      hsa_eligible: true, hsa_coverage_type: "family" },
    { id: "hsa-b", owner_person_id: "p2", name: "HSA B", account_type: "hsa",
      balance: 0, monthly_employee_contribution: 100, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
      hsa_eligible: true, hsa_coverage_type: "family" },
  ];
  raw.hsaMarriedAllocations = [{
    id: "catch-up-schedule-allocation", tax_year: 2026,
    person_one_id: "p1", person_two_id: "p2",
    person_one_ordinary_amount: 8750, person_two_ordinary_amount: 0,
    data_version: 1,
  }];
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.hsaTotalContributionAnnual, 10750);
  assert.equal(floor.unsupportedScheduledContributionAnnual, 1250);
});

test("direct IRA contribution is removed from incremental take-home feasibility", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 5000;
  raw.expenses![0].monthly_amount = 4000;
  raw.retirementAccounts = [{ id: "ira", owner_person_id: "p1", name: "IRA",
    account_type: "traditional_ira", balance: 500000, monthly_employee_contribution: 1000,
    monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_offered" }];
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.directTakeHomeRetirementContributionAnnual, 7500);
  assert.equal(floor.currentRetirementSavingsAnnual, 7500);
  assert.equal(floor.protectedAnnualAmount, 7500);
});

test("employee HSA is conservatively removed from take-home feasibility once", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 4500;
  raw.expenses![0].monthly_amount = 4000;
  raw.retirementAccounts = [{ id: "hsa", owner_person_id: "p1", name: "HSA",
    account_type: "hsa", balance: 500000, monthly_employee_contribution: 500,
    monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_offered", hsa_eligible: true,
    hsa_coverage_type: "family" }];
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.directTakeHomeRetirementContributionAnnual, 6000);
  assert.equal(floor.protectedAnnualAmount, 6000);
  assert.equal(floor.hsaEmployeeFundingSourceAssumption, "conservative_take_home");
});

test("payroll workplace contribution is not subtracted again from take-home capacity", () => {
  const raw = baseRaw();
  raw.income![0].monthly_amount = 5000;
  raw.expenses![0].monthly_amount = 4000;
  raw.retirementAccounts![0].monthly_employee_contribution = 1000;
  raw.retirementAccounts![0].monthly_employer_contribution = 0;
  raw.retirementAccounts![0].balance = 500000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.directTakeHomeRetirementContributionAnnual, 0);
  assert.equal(floor.protectedAnnualAmount, 14400);
});

test("AHEAD relaxes employee guardrail when employer contributes 20 percent", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].monthly_employee_contribution = 0;
  raw.retirementAccounts![0].monthly_employer_contribution = 2000;
  raw.retirementAccounts![0].full_match_employee_contribution_monthly = 0;
  raw.retirementAccounts![0].match_status = "not_offered";
  raw.retirementAccounts![0].balance = 500000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.status, "ahead");
  assert.equal(floor.employeeSavingGuardrailAnnualAmount, 0);
  assert.equal(floor.targetProtectedAnnualAmount, 24000);
  assert.equal(floor.protectedFloorShortfallAnnual, 0);
});

test("a six-percent employee match requirement remains protected above the soft guardrail", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].monthly_employee_contribution = 0;
  raw.retirementAccounts![0].monthly_employer_contribution = 0;
  raw.retirementAccounts![0].full_match_employee_contribution_monthly = 600;
  raw.retirementAccounts![0].match_status = "not_fully_captured";
  raw.retirementAccounts![0].balance = 500000;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.employerMatchProtectedAnnualAmount, 7200);
  assert.ok((floor.targetProtectedAnnualAmount ?? 0) >= 7200);
});

test("corrective protected ceiling is deterministic at 24.99, 25, and 25.01 percent", () => {
  for (const rate of [0.2499, 0.25, 0.2501]) {
    const raw = baseRaw();
    raw.retirementAccounts![0].balance = 0;
    raw.retirementAccounts![0].monthly_employee_contribution = 0;
    raw.retirementAccounts![0].monthly_employer_contribution = 0;
    raw.preferences = { ...raw.preferences, desired_retirement_monthly_spending: 12000 };
    const policy = structuredClone(MONEY_PRIORITY_POLICY_V1);
    policy.hybridRetirementFloor.maximumProtectedCorrectiveRate = rate;
    const floor = runMoneyPriorityEngine(raw, AS_OF_DATE, policy).build.retirementFloor;
    assert.equal(Number((floor.targetProtectedFloorRate ?? 0).toFixed(4)), rate);
    assert.ok((floor.projectionRequiredCorrectiveRate ?? 0) > rate);
  }
});

test("AHEAD materiality boundaries require every threshold", () => {
  const raw = baseRaw();
  raw.retirementAccounts![0].balance = 500000;
  const baseline = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  const surplus = (baseline.projection.projectedPortfolioAtRetirement ?? 0)
    - (baseline.projection.targetPortfolio ?? 0);
  const ratio = surplus / (baseline.projection.targetPortfolio ?? 1);
  for (const delta of [-0.01, 0, 0.01]) {
    const policy = structuredClone(MONEY_PRIORITY_POLICY_V1);
    policy.hybridRetirementFloor.aheadMinimumSurplusAmount = surplus + delta;
    policy.hybridRetirementFloor.aheadMinimumSurplusRatio = 0;
    policy.hybridRetirementFloor.aheadMinimumYearsToRetirement = 0;
    const status = runMoneyPriorityEngine(raw, AS_OF_DATE, policy).build.retirementFloor.status;
    assert.equal(status, delta <= 0 ? "ahead" : "on_track");
  }
  for (const delta of [-0.000001, 0, 0.000001]) {
    const policy = structuredClone(MONEY_PRIORITY_POLICY_V1);
    policy.hybridRetirementFloor.aheadMinimumSurplusAmount = 0;
    policy.hybridRetirementFloor.aheadMinimumSurplusRatio = ratio + delta;
    policy.hybridRetirementFloor.aheadMinimumYearsToRetirement = 0;
    const status = runMoneyPriorityEngine(raw, AS_OF_DATE, policy).build.retirementFloor.status;
    assert.equal(status, delta <= 0 ? "ahead" : "on_track");
  }
  for (const threshold of [30, 29, 28]) {
    const policy = structuredClone(MONEY_PRIORITY_POLICY_V1);
    policy.hybridRetirementFloor.aheadMinimumSurplusAmount = 0;
    policy.hybridRetirementFloor.aheadMinimumSurplusRatio = 0;
    policy.hybridRetirementFloor.aheadMinimumYearsToRetirement = threshold;
    const status = runMoneyPriorityEngine(raw, AS_OF_DATE, policy).build.retirementFloor.status;
    assert.equal(status, threshold <= 29 ? "ahead" : "on_track");
  }
});

test("HSA spending above contributions never creates negative retirement saving", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{ id: "hsa", owner_person_id: "p1", name: "HSA",
    account_type: "hsa", balance: 0, monthly_employee_contribution: 300,
    monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_offered", hsa_eligible: true,
    hsa_coverage_type: "family" }];
  raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: 5000 };
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.longTermHsaContributionAnnual, 0);
  assert.equal(floor.currentRetirementSavingsAnnual, 0);
  assert.ok(floor.projectionAnnualContributionAssumption < 0);
});

test("null HSA intent with zero HSA contribution is not information-needed", () => {
  const raw = baseRaw();
  raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: null };
  raw.retirementAccounts![0].monthly_employee_contribution = 0;
  raw.retirementAccounts![0].monthly_employer_contribution = 0;
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.hsaLongTermIntentKnown, true);
  assert.notEqual(floor.status, "more_information_needed");
});

test("multiple HSA accounts subtract household medical spending exactly once", () => {
  const raw = baseRaw();
  raw.retirementAccounts = ["a", "b"].map((id) => ({ id, owner_person_id: "p1",
    name: id, account_type: "hsa", balance: 0, monthly_employee_contribution: 200,
    monthly_employer_contribution: 0, employee_contributed_ytd: 0,
    employer_contributed_ytd: 0, match_status: "not_offered", hsa_eligible: true,
    hsa_coverage_type: "family" }));
  raw.preferences = { ...raw.preferences, expected_hsa_medical_spending_annual: 3000 };
  const floor = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  assert.equal(floor.hsaTotalContributionAnnual, 4800);
  assert.equal(floor.longTermHsaContributionAnnual, 1800);
});

test("spouse HSA contributions share one deterministic household spending intent", () => {
  const raw = baseRaw();
  raw.people!.push({ id: "p2", display_name: "Spouse", relationship: "spouse_partner",
    birth_date: "1990-01-01", planned_retirement_age: 65,
    estimated_taxable_compensation_annual: 60000,
    covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false });
  raw.preferences = { ...raw.preferences, tax_filing_status: "married_filing_jointly",
    expected_hsa_medical_spending_annual: 3000 };
  raw.retirementAccounts = ["p1", "p2"].map((owner, index) => ({
    id: `hsa-${index}`, owner_person_id: owner, name: `HSA ${index}`, account_type: "hsa",
    balance: 0, monthly_employee_contribution: 200, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0, match_status: "not_offered",
    hsa_eligible: true, hsa_coverage_type: "family",
  }));
  const forward = runMoneyPriorityEngine(raw, AS_OF_DATE).build.retirementFloor;
  const reversed = structuredClone(raw);
  reversed.people = [...reversed.people!].reverse();
  reversed.retirementAccounts = [...reversed.retirementAccounts!].reverse();
  const backward = runMoneyPriorityEngine(reversed, AS_OF_DATE).build.retirementFloor;
  assert.equal(forward.hsaTotalContributionAnnual, 4800);
  assert.equal(forward.longTermHsaContributionAnnual, 1800);
  assert.deepEqual(backward, forward);
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

test("a scheduled contribution change refreshes sustainable pace and legal opportunity", () => {
  const raw = baseRaw();
  const changed = structuredClone(raw);
  changed.retirementAccounts![0].monthly_employee_contribution = 1000;
  const before = runMoneyPriorityEngine(raw, AS_OF_DATE);
  const after = runMoneyPriorityEngine(changed, AS_OF_DATE);
  assert.notEqual(before.build.retirementFloor.currentRetirementSavingsAnnual,
    after.build.retirementFloor.currentRetirementSavingsAnnual);
  assert.notEqual(before.build.retirementFloor.remainingLegalCapacityAfterScheduledAnnual,
    after.build.retirementFloor.remainingLegalCapacityAfterScheduledAnnual);
  assert.equal(assessRecommendationRefresh(before, after).state, "materially_changed");
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
