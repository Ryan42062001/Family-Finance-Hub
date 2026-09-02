import assert from "node:assert/strict";
import test from "node:test";

import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import {
  deriveRecommendedPlanAllocations,
  evaluateUserPlan,
} from "./money-priority-user-plan.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import { evaluateHomeAffordability, type HomePurchaseScenario } from "./home-affordability.ts";
import { evaluateVehicleAffordability, type VehiclePurchaseScenario } from "./vehicle-affordability.ts";

const AS_OF_DATE = "2026-09-01";
type Owner = "a" | "b";

type HsaInput = {
  id: string;
  owner: Owner;
  eligible: boolean | null;
  coverage: "family" | "self_only" | "unknown" | null;
  employeeYtd?: number;
  employerYtd?: number;
  matchMonthly?: number;
};

function hsa(input: HsaInput): Record<string, unknown> {
  return {
    id: input.id,
    owner_person_id: input.owner,
    name: input.id,
    account_type: "hsa",
    balance: 0,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: input.employeeYtd ?? 0,
    employer_contributed_ytd: input.employerYtd ?? 0,
    hsa_eligible: input.eligible,
    hsa_coverage_type: input.coverage,
    match_status: input.matchMonthly ? "not_fully_captured" : "not_offered",
    full_match_employee_contribution_monthly: input.matchMonthly ?? null,
  };
}

function raw(
  hsaAccounts: HsaInput[],
  options: {
    aBirthDate?: string;
    bBirthDate?: string;
    monthlyIncome?: number;
    monthlyExpense?: number;
    deployableCash?: number;
    addIra?: boolean;
    addWorkplace?: boolean;
    reserveBalance?: number;
  } = {},
): MoneyPriorityRawSnapshot {
  const accounts: Record<string, unknown>[] = [{
    id: "reserve", name: "Reserve", account_type: "savings",
    balance: options.reserveBalance ?? 12000, cash_purpose: "protected_reserve",
  }];
  if (options.deployableCash) accounts.push({
    id: "cash", name: "Cash", account_type: "savings",
    balance: options.deployableCash, cash_purpose: "unallocated",
  });
  const retirementAccounts = hsaAccounts.map(hsa);
  if (options.addIra) retirementAccounts.push({
    id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira",
    balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 7000, employer_contributed_ytd: 0, match_status: "not_offered",
  });
  if (options.addWorkplace) retirementAccounts.push({
    id: "workplace-a", owner_person_id: "a", name: "A 401k", account_type: "401k",
    balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    employee_contributed_ytd: 0, employer_contributed_ytd: 0,
    full_match_employee_contribution_monthly: 300, match_status: "not_fully_captured",
    plan_eligible_compensation_annual: 120000,
  });
  return {
    householdId: "hsa-household-uncertainty",
    people: [
      { id: "a", display_name: "A", relationship: "self",
        birth_date: options.aBirthDate ?? "1990-01-01", planned_retirement_age: 65,
        covered_by_workplace_retirement_plan: false,
        estimated_taxable_compensation_annual: 120000, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner",
        birth_date: options.bBirthDate ?? "1990-01-01", planned_retirement_age: 65,
        covered_by_workplace_retirement_plan: false,
        estimated_taxable_compensation_annual: 120000, is_active: true, is_dependent: false },
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income",
      monthly_amount: options.monthlyIncome ?? 4000, monthly_gross_amount: 10000,
      income_type: "employment", is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Essentials",
      monthly_amount: options.monthlyExpense ?? 3000, is_essential: true }],
    accounts,
    debts: [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 100,
      interest_rate: 20, minimum_payment: 0, is_past_due: false, is_in_collections: false,
      has_legal_or_tax_priority: false }],
    goals: [], insuranceExposures: [], retirementAccounts,
    preferences: {
      emergency_fund_months_override: 3, known_income_disruption: false,
      debt_vs_investing: "balanced", job_replacement_difficulty: "easy",
      desired_retirement_monthly_spending: 5000, retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0, planning_pension_monthly: 0,
      tax_profile_year: 2026, tax_filing_status: "married_filing_jointly",
      estimated_modified_agi: 120000,
    },
  };
}

function opportunities(input: MoneyPriorityRawSnapshot) {
  return evaluateRetirementAccountOpportunities(buildMoneyPrioritySnapshot(input)).opportunities;
}

function assertAllHsaUnknown(input: MoneyPriorityRawSnapshot, expectedReason: RegExp): void {
  const hsaOpportunities = opportunities(input).filter((item) => item.accountType === "hsa");
  assert.ok(hsaOpportunities.length > 0);
  assert.ok(hsaOpportunities.every((item) => item.state === "more_information_needed"));
  assert.ok(hsaOpportunities.every((item) => item.remainingAnnualRoom === null));
  assert.ok(hsaOpportunities.some((item) => item.missingData.some((reason) => expectedReason.test(reason))));
  const engine = runMoneyPriorityEngine(input, AS_OF_DATE);
  assert.equal(engine.build.retirementAccountAllocations
    .filter((item) => item.accountId.startsWith("hsa-")).length, 0);
  assert.ok(engine.retirementCapacityLedger.entries
    .filter((item) => item.accountType === "hsa").every((item) => !item.verified));
}

test("unknown spouse eligibility blocks optimistic family HSA room", () => {
  assertAllHsaUnknown(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]), /eligibility is needed to determine whether the married-family contribution limit applies/);
});

test("reversed unknown spouse eligibility blocks optimistic family HSA room", () => {
  assertAllHsaUnknown(raw([
    { id: "hsa-a", owner: "a", eligible: null, coverage: "family", employeeYtd: 8000 },
    { id: "hsa-b", owner: "b", eligible: true, coverage: "family" },
  ]), /eligibility is needed/);
});

test("known self-only spouse remains actionable when other self-only eligibility is unknown", () => {
  const result = opportunities(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "self_only" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "self_only" },
  ]));
  assert.equal(result.find((item) => item.accountId === "hsa-a")?.remainingAnnualRoom, 4400);
  assert.equal(result.find((item) => item.accountId === "hsa-b")?.state, "more_information_needed");
});

test("explicitly ineligible spouse does not block known eligible spouse", () => {
  const result = opportunities(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: false, coverage: "family", employeeYtd: 8000 },
  ]));
  assert.equal(result.find((item) => item.accountId === "hsa-a")?.remainingAnnualRoom, 8750);
  assert.equal(result.find((item) => item.accountId === "hsa-b")?.state, "not_eligible");
});

test("unknown coverage blocks the other spouse's self-only room", () => {
  assertAllHsaUnknown(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: null, employeeYtd: 8000 },
    { id: "hsa-b", owner: "b", eligible: true, coverage: "self_only" },
  ]), /coverage type is needed to determine the shared married-family contribution limit/);
});

test("reversed unknown coverage blocks the other spouse's self-only room", () => {
  assertAllHsaUnknown(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "self_only" },
    { id: "hsa-b", owner: "b", eligible: true, coverage: null, employeeYtd: 8000 },
  ]), /coverage type is needed/);
});

for (const [name, accounts] of [
  ["unknown plus family coverage", [
    { id: "hsa-a", owner: "a", eligible: true, coverage: null },
    { id: "hsa-b", owner: "b", eligible: true, coverage: "family" },
  ]],
  ["both coverages unknown", [
    { id: "hsa-a", owner: "a", eligible: true, coverage: null },
    { id: "hsa-b", owner: "b", eligible: true, coverage: null },
  ]],
] as const) {
  test(`${name} is household-wide information-needed`, () => {
    assertAllHsaUnknown(raw([...accounts]), /coverage type is needed/);
  });
}

test("known $8,000/$0 married-family case remains exactly $750", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family", employeeYtd: 8000 },
    { id: "hsa-b", owner: "b", eligible: true, coverage: "family" },
  ]), AS_OF_DATE);
  assert.equal(engine.retirementCapacityLedger.groups
    .find((group) => group.id === "hsa:married-family")?.originalRemainingAnnualRoom, 750);
  assert.equal(engine.build.retirementAccountAllocations
    .reduce((sum, item) => sum + item.allocatedAnnualAmount, 0), 750);
});

test("unknown structure blocks owner catch-up and multiple-account multiplication", () => {
  assertAllHsaUnknown(raw([
    { id: "hsa-a1", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-a2", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b1", owner: "b", eligible: null, coverage: "family", employeeYtd: 4000 },
    { id: "hsa-b2", owner: "b", eligible: null, coverage: "family", employeeYtd: 4000 },
  ], { aBirthDate: "1970-01-01", bBirthDate: "1970-01-01" }), /eligibility is needed/);
});

test("existing cash and Windfall cannot use unresolved HSA room", () => {
  const input = raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ], { deployableCash: 10000 });
  const engine = runMoneyPriorityEngine(input, AS_OF_DATE);
  assert.equal(engine.existingCash.deployments
    .filter((item) => item.category === "retirement").length, 0);
  const windfall = allocateWindfall(engine, {
    amount: 10000, source: "gift", taxTreatment: "known_non_taxable",
  });
  assert.equal(windfall.allocations.filter((item) => item.category === "retirement").length, 0);
});

test("Secure cannot use unresolved HSA match room", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family", matchMonthly: 300 },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]), AS_OF_DATE);
  assert.equal(engine.secure.employerMatchMonthlyGap, 0);
  assert.ok(engine.secure.recommendations.some((item) =>
    item.id === "secure-match-capacity-missing-hsa-a"));
});

test("Your Plan reports unknown unresolved HSA capacity", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]), AS_OF_DATE);
  const plan = evaluateUserPlan(engine, [], {
    additionalRetirementContributions: [{ accountId: "hsa-a", annualAmount: 3600, source: "other" }],
  });
  assert.ok(plan.impacts.some((item) => item.id === "user-plan-retirement-room-unknown"));
  assert.ok(plan.warnings.some((warning) => warning.includes("cannot be verified")));
  assert.ok(!plan.impacts.some((item) => item.id === "user-plan-retirement-room-conflict"));
});

test("unknown HSA structure does not block unrelated IRA routing", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ], { addIra: true }), AS_OF_DATE);
  assert.ok(engine.build.retirementAccountAllocations.some((item) => item.accountId === "ira-a"));
  assert.ok(!engine.build.retirementAccountAllocations.some((item) => item.accountId.startsWith("hsa-")));
});

test("hypothetical affordability rerun preserves unresolved HSA structure", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]), AS_OF_DATE);
  const rerun = runHypotheticalMoneyPriorityEngine(engine, {
    addExpenses: [{ id: "hypothetical-housing", name: "Housing", category: "housing",
      monthlyAmount: 100, isEssential: true, cashFlowTreatment: "required" }],
  }).engine;
  assert.ok(rerun.build.retirementAccounts.opportunities
    .filter((item) => item.accountType === "hsa")
    .every((item) => item.state === "more_information_needed"));
  assert.equal(rerun.build.retirementAccountAllocations
    .filter((item) => item.accountId.startsWith("hsa-")).length, 0);
});

test("Home and Vehicle affordability reruns remain deterministic with unresolved HSA facts", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ], { deployableCash: 50000 }), AS_OF_DATE);
  const before = structuredClone(engine);
  const home: HomePurchaseScenario = {
    purchasePrice: 100000, downPayment: 20000,
    mortgage: { rateType: "fixed", interestRate: 4, termYears: 30, arm: null,
      hasBalloonPayment: false, allowsNegativeAmortization: false },
    closing: { closingCosts: 0, prepaidCosts: 0, initialEscrowDeposit: 0,
      earnestMoneyAlreadyPaid: 0, sellerCredits: 0, lenderCredits: 0, otherCredits: 0 },
    propertyTaxesAnnual: 1200,
    insurance: { homeownersAnnual: 600, floodAnnual: 0, otherRequiredAnnual: 0 },
    hoaMonthly: 0, mortgageInsurance: { type: "none", monthlyAmount: 0 },
    monthlyMaintenancePlanningAmount: 100, monthlyUtilityChange: 0,
    otherMonthlyPropertyCosts: 0, immediateRequiredRepairs: 0, plannedNearTermRepairs: 0,
    currentHousingMonthlyCost: 0, currentHousingCostDisappears: false,
    relatedGoalId: null, homeSale: null,
  };
  const vehicle: VehiclePurchaseScenario = {
    needType: "planned_replacement", purchasePrice: 10000, tradeInValue: 0,
    tradeInLoanPayoff: 0, cashDownPayment: 2000, salesTax: 0,
    titleRegistrationFees: 0, otherPurchaseFees: 0, loanApr: 3, loanTermMonths: 48,
    monthlyInsuranceChange: 0, monthlyFuelChange: 0, monthlyMaintenanceChange: 0,
    monthlyRegistrationTaxChange: 0, monthlyParkingTollsChange: 0,
  };
  assert.deepEqual(evaluateHomeAffordability(engine, home), evaluateHomeAffordability(engine, home));
  assert.deepEqual(evaluateVehicleAffordability(engine, vehicle), evaluateVehicleAffordability(engine, vehicle));
  assert.deepEqual(engine, before);
});

test("full cross-consumer scenario blocks only unresolved HSA room", () => {
  const input = raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ], { monthlyIncome: 5000, reserveBalance: 8000, addIra: true, addWorkplace: true });
  const rawBefore = structuredClone(input);
  const engine = runMoneyPriorityEngine(input, AS_OF_DATE);
  const engineBefore = structuredClone(engine);
  assert.ok(engine.recommendations.some((item) => item.allocations.some(
    (allocation) => allocation.category === "employer_match"
      && allocation.relatedEntityId === "workplace-a")));
  assert.ok(engine.recommendations.some((item) => item.id === "secure-debt-high-card"));
  assert.ok(engine.recommendations.some((item) => item.id === "secure-full-emergency-fund"));
  assert.ok(engine.build.retirementAccountAllocations.some((item) => item.accountId === "ira-a"));
  assert.ok(!engine.build.retirementAccountAllocations.some((item) => item.accountId.startsWith("hsa-")));
  const windfall = allocateWindfall(engine, {
    amount: 10000, source: "gift", taxTreatment: "known_non_taxable",
  });
  assert.ok(!windfall.allocations.some((item) => item.category === "retirement"
    && item.relatedEntityId?.startsWith("hsa-")));
  const plan = evaluateUserPlan(engine, [], {
    additionalRetirementContributions: [{ accountId: "hsa-a", annualAmount: 3600, source: "other" }],
  });
  assert.ok(plan.impacts.some((item) => item.id === "user-plan-retirement-room-unknown"));
  assert.deepEqual(input, rawBefore);
  assert.deepEqual(engine, engineBefore);
});

test("eligibility and coverage resolution materially refresh while reorder does not", () => {
  const unresolvedRaw = raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: null, coverage: "family", employeeYtd: 8000 },
  ]);
  const resolvedRaw = structuredClone(unresolvedRaw);
  resolvedRaw.retirementAccounts![1].hsa_eligible = true;
  const before = runMoneyPriorityEngine(unresolvedRaw, AS_OF_DATE);
  const after = runMoneyPriorityEngine(resolvedRaw, AS_OF_DATE);
  assert.equal(assessRecommendationRefresh(before, after).state, "materially_changed");
  const reordered = structuredClone(unresolvedRaw);
  reordered.people = [...(reordered.people ?? [])].reverse();
  reordered.retirementAccounts = [...(reordered.retirementAccounts ?? [])].reverse();
  assert.equal(assessRecommendationRefresh(before,
    runMoneyPriorityEngine(reordered, AS_OF_DATE)).state, "current");
});

test("no-override Your Plan replays exact authoritative annual room", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: true, coverage: "family" },
  ]), AS_OF_DATE);
  const allocation = engine.recommendations.flatMap((item) => item.allocations)
    .find((item) => item.category === "retirement")!;
  assert.equal(allocation.annualAmount, 8750);
  assert.equal(allocation.monthlyAmount, 729.17);
  const plan = evaluateUserPlan(engine, []);
  assert.ok(!plan.impacts.some((item) => item.id === "user-plan-retirement-room-conflict"));
  assert.equal(plan.recommendedPlan.totalAllocated, plan.yourPlan.totalAllocated);
});

test("explicit $729.17 HSA override annualizes to a real $0.04 room conflict", () => {
  const engine = runMoneyPriorityEngine(raw([
    { id: "hsa-a", owner: "a", eligible: true, coverage: "family" },
    { id: "hsa-b", owner: "b", eligible: true, coverage: "family" },
  ]), AS_OF_DATE);
  const before = structuredClone(engine);
  const allocation = deriveRecommendedPlanAllocations(engine)
    .find((item) => item.category === "retirement");
  assert.ok(allocation);
  assert.equal(allocation.recommendedMonthlyAmount, 729.17);

  const plan = evaluateUserPlan(engine, [{
    allocationId: allocation.allocationId,
    monthlyAmount: 729.17,
  }]);
  const conflict = plan.impacts.find(
    (item) => item.id === "user-plan-retirement-room-conflict",
  )?.retirement?.contributionRoomConflict;

  assert.equal(plan.overrides.active.length, 1);
  assert.equal(plan.yourPlan.allocations.find(
    (item) => item.allocationId === allocation.allocationId,
  )?.userMonthlyAmount, 729.17);
  assert.equal(conflict, 0.04);
  assert.deepEqual(engine, before);
});
