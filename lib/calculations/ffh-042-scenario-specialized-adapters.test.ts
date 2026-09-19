import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHomeAffordability,
  type HomeAffordabilityEvaluationTrace,
  type HomePurchaseScenario,
} from "./home-affordability.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { MONEY_PRIORITY_POLICY_V1 } from "./money-priority-policy.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import { retirementCapacityInvariantHolds } from "./money-priority-retirement-capacity.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import {
  deriveRecommendedPlanAllocations,
  evaluateUserPlan,
} from "./money-priority-user-plan.ts";
import {
  evaluateVehicleAffordability,
  type VehicleAffordabilityEvaluationTrace,
  type VehiclePurchaseScenario,
} from "./vehicle-affordability.ts";
import { allocateWindfall } from "./money-priority-windfall.ts";
import {
  SCENARIO_DEFINITION_VERSION,
  type ScenarioDefinition,
} from "../scenarios/scenario-definition.ts";
import { runMoneyPriorityScenario } from "../scenarios/scenario-runner.ts";
import {
  SPECIALIZED_SCENARIO_DEFINITION_VERSION,
  detectScenarioCompositionConflicts,
  type ScenarioSpecializedIntent,
  type SpecializedScenarioDefinition,
} from "../scenarios/scenario-specialized-contract.ts";
import { runSpecializedScenario } from "../scenarios/scenario-specialized-runner.ts";

const AS_OF = "2026-09-19";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "ffh-042-household",
    people: [{
      id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 67, estimated_taxable_compensation_annual: 180000,
      covered_by_workplace_retirement_plan: true, is_active: true, is_dependent: false,
    }],
    income: [{
      id: "income", owner_person_id: "p", name: "Salary", income_type: "employment",
      monthly_amount: 12000, monthly_gross_amount: 15000, is_variable: false, is_active: true,
    }],
    expenses: [
      { id: "housing", name: "Current rent", category: "housing", monthly_amount: 2000, is_essential: true, cash_flow_treatment: "required" },
      { id: "essentials", name: "Essentials", category: "other", monthly_amount: 2000, is_essential: true, cash_flow_treatment: "required" },
      { id: "lifestyle", name: "Lifestyle", category: "other", monthly_amount: 1000, is_essential: false, cash_flow_treatment: "discretionary" },
    ],
    accounts: [
      { id: "reserve", name: "Emergency reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
      { id: "cash", name: "Unallocated cash", account_type: "savings", balance: 250000, cash_purpose: "unallocated" },
      { id: "house-cash", name: "House fund", account_type: "savings", balance: 20000, cash_purpose: "earmarked_goal", related_goal_id: "house-goal" },
      { id: "car-cash", name: "Car fund", account_type: "savings", balance: 10000, cash_purpose: "earmarked_goal", related_goal_id: "car-goal" },
      { id: "college-cash", name: "College fund", account_type: "savings", balance: 50000, cash_purpose: "earmarked_goal", related_goal_id: "college-goal" },
    ],
    debts: [],
    retirementAccounts: [{
      id: "work", owner_person_id: "p", name: "401k", account_type: "401k", balance: 300000,
      monthly_employee_contribution: 1500, monthly_employer_contribution: 300,
      employee_contributed_ytd: 10000, employer_contributed_ytd: 2000,
      plan_eligible_compensation_annual: 180000,
      full_match_employee_contribution_monthly: 1000, match_status: "fully_captured",
    }],
    goals: [
      {
        id: "house-goal", name: "House", target_amount: 60000, current_amount: 20000, target_date: "2027-09-19",
        priority: 1, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "somewhat_flexible",
        consequence_level: "moderate", planned_monthly_contribution: 500, core_need_amount: 50000,
        goal_intelligence_confirmed: true, underlying_need: "Housing", desired_solution: "Purchase", goal_nature: "mixed",
        underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null,
      },
      {
        id: "car-goal", name: "Vehicle", target_amount: 30000, current_amount: 10000, target_date: "2027-06-19",
        priority: 2, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "somewhat_flexible",
        consequence_level: "moderate", planned_monthly_contribution: 300, core_need_amount: 20000,
        goal_intelligence_confirmed: true, underlying_need: "Transportation", desired_solution: "Purchase", goal_nature: "mixed",
        underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null,
      },
      {
        id: "college-goal", name: "College", target_amount: 50000, current_amount: 50000, target_date: "2030-01-01",
        priority: 3, goal_class: "education", necessity: "important", deadline_flexibility: "flexible",
        consequence_level: "moderate", planned_monthly_contribution: 0, core_need_amount: 50000,
        goal_intelligence_confirmed: true, underlying_need: "Education", desired_solution: "Fund", goal_nature: "mixed",
        underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null,
      },
    ],
    insuranceExposures: [{
      id: "auto-insurance", person_id: "p", name: "Auto", insurance_type: "auto",
      deductible_amount: 1000, family_deductible_amount: null, out_of_pocket_max: null,
      percentage_deductible: null, insured_value: 30000, is_relevant_to_reserve: true,
    }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", roth_vs_traditional: "unspecified",
      risk_tolerance: "moderate", retirement_priority: "balanced", job_replacement_difficulty: "easy",
      known_income_disruption: false, known_income_disruption_end_date: null,
      desired_retirement_monthly_spending: 5000, retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 0, planning_pension_monthly: 0,
      expected_hsa_medical_spending_annual: null, tax_profile_year: 2026,
      tax_filing_status: "single", estimated_modified_agi: 180000, lived_with_spouse_during_tax_year: null,
    },
  };
}

function homeScenario(overrides: Partial<HomePurchaseScenario> = {}): HomePurchaseScenario {
  const base: HomePurchaseScenario = {
    purchasePrice: 300000,
    downPayment: 60000,
    mortgage: { rateType: "fixed", interestRate: 4, termYears: 30, arm: null, hasBalloonPayment: false, allowsNegativeAmortization: false },
    closing: { closingCosts: 8000, prepaidCosts: 2000, initialEscrowDeposit: 2000, earnestMoneyAlreadyPaid: 5000, sellerCredits: 0, lenderCredits: 0, otherCredits: 0 },
    propertyTaxesAnnual: 6000,
    insurance: { homeownersAnnual: 1800, floodAnnual: 0, otherRequiredAnnual: 0 },
    hoaMonthly: 0,
    mortgageInsurance: { type: "none", monthlyAmount: 0 },
    monthlyMaintenancePlanningAmount: 300,
    monthlyUtilityChange: 100,
    otherMonthlyPropertyCosts: 0,
    immediateRequiredRepairs: 0,
    plannedNearTermRepairs: 0,
    currentHousingMonthlyCost: 2000,
    currentHousingCostDisappears: true,
    relatedGoalId: "house-goal",
    homeSale: null,
  };
  return {
    ...base,
    ...overrides,
    mortgage: { ...base.mortgage, ...(overrides.mortgage ?? {}) },
    closing: { ...base.closing, ...(overrides.closing ?? {}) },
    insurance: { ...base.insurance, ...(overrides.insurance ?? {}) },
    mortgageInsurance: { ...base.mortgageInsurance, ...(overrides.mortgageInsurance ?? {}) },
  };
}

function vehicleScenario(overrides: Partial<VehiclePurchaseScenario> = {}): VehiclePurchaseScenario {
  return {
    needType: "planned_replacement",
    purchasePrice: 30000,
    tradeInValue: 5000,
    tradeInLoanPayoff: 0,
    cashDownPayment: 10000,
    salesTax: 1800,
    titleRegistrationFees: 300,
    otherPurchaseFees: 100,
    loanApr: 5,
    loanTermMonths: 48,
    monthlyInsuranceChange: 50,
    monthlyFuelChange: -25,
    monthlyMaintenanceChange: -20,
    monthlyRegistrationTaxChange: 10,
    monthlyParkingTollsChange: 0,
    relatedGoalId: "car-goal",
    coreNeedAmount: 25000,
    ...overrides,
  };
}

function genericDefinition(
  specialized: ScenarioSpecializedIntent | null,
  overrides: Partial<ScenarioDefinition> = {},
): ScenarioDefinition {
  return {
    version: SCENARIO_DEFINITION_VERSION,
    scenarioId: "ffh-042-scenario",
    baselineReference: { fingerprint: "opaque", referenceId: "baseline" },
    recurringOverrides: [],
    oneTimeEvents: [],
    specializedIntent: specialized ? { type: specialized.type, intentId: specialized.eventId } : null,
    ...overrides,
  };
}

function definition(
  specialized: ScenarioSpecializedIntent | null,
  overrides: Partial<SpecializedScenarioDefinition> = {},
): SpecializedScenarioDefinition {
  return {
    version: SPECIALIZED_SCENARIO_DEFINITION_VERSION,
    genericDefinition: genericDefinition(specialized),
    specialized,
    operationEventLinks: [],
    yourPlanOverrides: [],
    ...overrides,
  };
}

function engine(raw = baseRaw()) {
  return runMoneyPriorityEngine(raw, AS_OF);
}

function cents(value: number): number {
  return Math.round(value * 100);
}

test("FFH-042 Home adapter is exactly the accepted evaluator over the final generic engine", () => {
  const baseline = engine();
  const intent = { type: "home", eventId: "home-purchase", scenario: homeScenario() } as const;
  const request = definition(intent, {
    genericDefinition: genericDefinition(intent, {
      recurringOverrides: [{ type: "income", id: "raise", incomeId: "income", monthlyTakeHomeAmount: 12500 }],
    }),
  });
  const run = runSpecializedScenario(baseline, request);
  assert.equal(run.status, "valid");
  assert.ok(run.genericEngineResult);
  assert.equal(run.specialized?.type, "home");
  if (!run.genericEngineResult || run.specialized?.type !== "home") return;

  let trace: HomeAffordabilityEvaluationTrace = { postEngine: null, stressedPostEngine: null };
  const direct = evaluateHomeAffordability(run.genericEngineResult, intent.scenario, MONEY_PRIORITY_POLICY_V1, (captured) => { trace = captured; });
  assert.deepEqual(run.specialized.result, direct);
  assert.deepEqual(run.specialized.postEngine, trace.postEngine);
  assert.deepEqual(
    run.specialized.comparison,
    trace.postEngine ? assessRecommendationRefresh(run.genericEngineResult, trace.postEngine) : null,
  );
});

test("FFH-042 Home adapter cannot reuse protected or unrelated earmarked cash", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
    { id: "college-cash", name: "College", account_type: "savings", balance: 250000, cash_purpose: "earmarked_goal", related_goal_id: "college-goal" },
  ];
  const baseline = engine(raw);
  const intent = { type: "home", eventId: "home-purchase", scenario: homeScenario({ relatedGoalId: null }) } as const;
  const run = runSpecializedScenario(baseline, definition(intent));
  assert.equal(run.specialized?.type, "home");
  if (run.specialized?.type !== "home") return;
  assert.equal(run.specialized.result.cashToClose.relatedGoalEarmarkedCash, 0);
  assert.equal(run.specialized.result.cashToClose.legitimateCashAvailable, 0);
  assert.equal(run.specialized.result.cashToClose.cashStillRequiredAtClosing, 67000);
  assert.equal(run.specialized.result.cashToClose.protectedCashRequired, 67000);
  assert.equal(run.specialized.result.purchaseReadiness, "not_recommended");
});

test("FFH-042 Vehicle adapter is exactly the accepted evaluator over the final generic engine", () => {
  const baseline = engine();
  const intent = { type: "vehicle", eventId: "vehicle-purchase", scenario: vehicleScenario() } as const;
  const request = definition(intent, {
    genericDefinition: genericDefinition(intent, {
      recurringOverrides: [{ type: "income", id: "pay-change", incomeId: "income", monthlyTakeHomeAmount: 11800 }],
    }),
  });
  const run = runSpecializedScenario(baseline, request);
  assert.ok(run.genericEngineResult);
  assert.equal(run.specialized?.type, "vehicle");
  if (!run.genericEngineResult || run.specialized?.type !== "vehicle") return;

  let trace: VehicleAffordabilityEvaluationTrace = { postEngine: null };
  const direct = evaluateVehicleAffordability(run.genericEngineResult, intent.scenario, MONEY_PRIORITY_POLICY_V1, (captured) => { trace = captured; });
  assert.deepEqual(run.specialized.result, direct);
  assert.deepEqual(run.specialized.postEngine, trace.postEngine);
  assert.deepEqual(
    run.specialized.comparison,
    trace.postEngine ? assessRecommendationRefresh(run.genericEngineResult, trace.postEngine) : null,
  );
});

test("FFH-042 Vehicle adapter cannot reuse protected or unrelated earmarked cash", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
    { id: "college-cash", name: "College", account_type: "savings", balance: 250000, cash_purpose: "earmarked_goal", related_goal_id: "college-goal" },
  ];
  const baseline = engine(raw);
  const intent = { type: "vehicle", eventId: "vehicle-purchase", scenario: vehicleScenario({ relatedGoalId: null }) } as const;
  const run = runSpecializedScenario(baseline, definition(intent));
  assert.equal(run.specialized?.type, "vehicle");
  if (run.specialized?.type !== "vehicle") return;
  assert.equal(run.specialized.result.cash.relatedGoalEarmarkedCash, 0);
  assert.equal(run.specialized.result.cash.availableVehicleCash, 0);
  assert.equal(run.specialized.result.cash.cashRequired, 10000);
  assert.equal(run.specialized.result.cash.protectedCashRequired, 10000);
  assert.equal(run.specialized.result.affordability, "not_recommended");
});

function windfallRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "windfall-composition",
    people: [{
      id: "p", display_name: "Adult", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 67, estimated_taxable_compensation_annual: 100000,
      covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false,
    }],
    income: [{ id: "i", owner_person_id: "p", name: "Income", monthly_amount: 5000, monthly_gross_amount: 7000, is_active: true }],
    expenses: [{ id: "e", name: "Essentials", category: "housing", monthly_amount: 3000, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" }],
    debts: [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 4000, interest_rate: 25, minimum_payment: 100 }],
    goals: [],
    retirementAccounts: [],
    insuranceExposures: [{ id: "x", name: "Insurance", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy", tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 100000 },
  };
}

test("FFH-042 Windfall is post-engine and starts from the final generic scenario state", () => {
  const baseline = engine(windfallRaw());
  const intent = {
    type: "windfall", eventId: "windfall-1",
    input: { amount: 5000, source: "bonus", taxTreatment: "not_applicable" },
  } as const;
  const request = definition(intent, {
    genericDefinition: genericDefinition(intent, {
      recurringOverrides: [{ type: "debt", id: "debt-cleared", debtId: "card", balance: 0, minimumPayment: 0 }],
    }),
  });
  const run = runSpecializedScenario(baseline, request);
  assert.equal(run.specialized?.type, "windfall");
  assert.ok(run.genericEngineResult);
  if (run.specialized?.type !== "windfall" || !run.genericEngineResult) return;

  const directGeneric = allocateWindfall(run.genericEngineResult, intent.input);
  const directBaseline = allocateWindfall(baseline, intent.input);
  assert.deepEqual(run.specialized.result, directGeneric);
  assert.equal(run.specialized.result.allocations.some((item) => item.relatedEntityId === "card"), false);
  assert.equal(directBaseline.allocations.some((item) => item.relatedEntityId === "card"), true);
});

test("FFH-042 Windfall uncertain-tax semantics remain held for review", () => {
  const baseline = engine(windfallRaw());
  const intent = {
    type: "windfall", eventId: "windfall-uncertain",
    input: { amount: 10000, source: "inheritance", taxTreatment: "uncertain", knownTaxLiability: 1000 },
  } as const;
  const run = runSpecializedScenario(baseline, definition(intent));
  assert.equal(run.specialized?.type, "windfall");
  if (run.specialized?.type !== "windfall") return;
  assert.equal(run.specialized.result.heldForTaxReviewAmount, 9000);
  assert.equal(run.specialized.result.deployableAmount, 0);
  assert.equal(run.specialized.result.state, "more_information_needed");
  assert.equal(run.status, "more_information_needed");
});

test("FFH-042 Windfall reservations, destinations, and residual reconcile exactly in cents", () => {
  const baseline = engine(windfallRaw());
  const intent = {
    type: "windfall", eventId: "windfall-exact",
    input: {
      amount: 12345.67, source: "bonus", taxTreatment: "known_taxable_liability_provided",
      knownTaxLiability: 1000.01, knownOtherLiability: 200, restrictedAmount: 300.03, earmarkedAmount: 400.04,
    },
  } as const;
  const run = runSpecializedScenario(baseline, definition(intent));
  assert.equal(run.specialized?.type, "windfall");
  if (run.specialized?.type !== "windfall") return;
  const result = run.specialized.result;
  assert.equal(
    cents(result.grossAmount ?? 0),
    cents(result.reservedTaxAmount)
      + cents(result.reservedOtherLiabilityAmount)
      + cents(result.restrictedAmount)
      + cents(result.earmarkedAmount)
      + cents(result.heldForTaxReviewAmount)
      + cents(result.totalAllocated)
      + cents(result.remainingUnallocated),
  );
  assert.equal(cents(result.deployableAmount), cents(result.totalAllocated) + cents(result.remainingUnallocated));
  assert.equal(result.deployableAmount, 10445.59);
  assert.equal(result.totalAllocated, 4000);
  assert.equal(result.remainingUnallocated, 6445.59);
});

test("FFH-042 Your Plan is the exact final allocation layer and exposes funding gaps without clamping", () => {
  const baseline = engine();
  const allocations = deriveRecommendedPlanAllocations(baseline);
  assert.ok(allocations.length > 0);
  const allocationId = allocations[0]!.allocationId;
  const overrides = [{ allocationId, monthlyAmount: baseline.feasibility.monthlyPlanCapacity + 1000 }];
  const request = definition(null, { yourPlanOverrides: overrides });
  const run = runSpecializedScenario(baseline, request);
  assert.ok(run.genericEngineResult);
  assert.ok(run.yourPlan);
  if (!run.genericEngineResult || !run.yourPlan) return;

  assert.deepEqual(run.yourPlan.result, evaluateUserPlan(run.genericEngineResult, overrides));
  assert.equal(run.yourPlan.engineBasis, "generic");
  assert.equal(run.yourPlan.result.yourPlan.fundingStatus, "funding_gap");
  assert.equal(
    cents(run.yourPlan.result.yourPlan.fundingGap),
    cents(run.yourPlan.result.yourPlan.totalAllocated) - cents(run.yourPlan.result.yourPlan.monthlyCapacity),
  );
  assert.deepEqual(
    run.yourPlan.refresh,
    assessRecommendationRefresh(run.genericEngineResult, run.genericEngineResult, overrides),
  );
});

test("FFH-042 duplicate Your Plan allocation IDs fail closed before allocation", () => {
  const baseline = engine();
  const allocationId = deriveRecommendedPlanAllocations(baseline)[0]?.allocationId;
  assert.ok(allocationId);
  const request = definition(null, {
    yourPlanOverrides: [
      { allocationId: allocationId!, monthlyAmount: 10 },
      { allocationId: allocationId!, monthlyAmount: 20 },
    ],
  });
  const conflicts = detectScenarioCompositionConflicts(request);
  assert.equal(conflicts.valid, false);
  assert.ok(conflicts.issues.some((item) => item.code === "duplicate_plan_override"));
  const run = runSpecializedScenario(baseline, request);
  assert.equal(run.status, "invalid");
  assert.equal(run.yourPlan, null);
});

test("FFH-042 missing Your Plan allocation IDs are superseded without display-name retargeting", () => {
  const baseline = engine();
  const overrides = [{ allocationId: "gone-recommendation::goal::gone-goal", monthlyAmount: 123.45 }];
  const run = runSpecializedScenario(baseline, definition(null, { yourPlanOverrides: overrides }));
  assert.ok(run.yourPlan);
  assert.equal(run.status, "valid");
  assert.equal(run.yourPlan?.result.overrides.active.length, 0);
  assert.equal(run.yourPlan?.result.overrides.superseded.length, 1);
  assert.equal(run.yourPlan?.result.overrides.superseded[0]?.allocationId, overrides[0]!.allocationId);
  assert.equal(run.yourPlan?.refresh.overrideStatuses[0]?.allocationId, overrides[0]!.allocationId);
  assert.notEqual(run.yourPlan?.refresh.overrideStatuses[0]?.status, "active");
});

test("FFH-042 Recommendation Refresh remains authoritative for generic and specialized comparisons", () => {
  const baseline = engine();
  const intent = { type: "home", eventId: "home-refresh", scenario: homeScenario() } as const;
  const request = definition(intent, {
    genericDefinition: genericDefinition(intent, {
      recurringOverrides: [{ type: "income", id: "income-change", incomeId: "income", monthlyTakeHomeAmount: 11000 }],
    }),
  });
  const run = runSpecializedScenario(baseline, request);
  assert.ok(run.genericEngineResult);
  assert.equal(run.specialized?.type, "home");
  if (!run.genericEngineResult || run.specialized?.type !== "home") return;

  assert.deepEqual(run.genericComparison, assessRecommendationRefresh(baseline, run.genericEngineResult));
  assert.ok(run.genericComparison?.detectedChanges.some((item) => item.category === "income"));
  if (run.specialized.postEngine) {
    assert.deepEqual(
      run.specialized.comparison,
      assessRecommendationRefresh(run.genericEngineResult, run.specialized.postEngine),
    );
  }
});

test("FFH-042 conflict detector rejects duplicate Home/Vehicle/Windfall event representations by explicit event ID", () => {
  const homeIntent = { type: "home", eventId: "home-event", scenario: homeScenario() } as const;
  const homeRequest = definition(homeIntent, {
    genericDefinition: genericDefinition(homeIntent, {
      oneTimeEvents: [{ type: "cash_use", id: "home-cash", amount: 1000, purpose: "generic" }],
    }),
    operationEventLinks: [{ operationId: "home-cash", eventId: "home-event" }],
  });
  assert.ok(detectScenarioCompositionConflicts(homeRequest).issues.some((item) => item.code === "duplicate_event_representation"));

  const vehicleIntent = { type: "vehicle", eventId: "vehicle-event", scenario: vehicleScenario() } as const;
  const vehicleRequest = definition(vehicleIntent, {
    genericDefinition: genericDefinition(vehicleIntent, {
      recurringOverrides: [{
        type: "synthetic_expense", id: "vehicle-cost", expenseId: "vehicle-cost-expense", name: "Vehicle cost",
        category: "transportation", monthlyAmount: 100, isEssential: true, cashFlowTreatment: "required",
      }],
    }),
    operationEventLinks: [{ operationId: "vehicle-cost", eventId: "vehicle-event" }],
  });
  assert.ok(detectScenarioCompositionConflicts(vehicleRequest).issues.some((item) => item.code === "duplicate_event_representation"));

  const windfallIntent = {
    type: "windfall", eventId: "windfall-event",
    input: { amount: 5000, source: "bonus", taxTreatment: "not_applicable" },
  } as const;
  const windfallRequest = definition(windfallIntent, {
    genericDefinition: genericDefinition(windfallIntent, {
      oneTimeEvents: [{ type: "cash_inflow", id: "bonus-cash", amount: 5000, label: "Bonus" }],
    }),
    operationEventLinks: [{ operationId: "bonus-cash", eventId: "windfall-event" }],
  });
  assert.ok(detectScenarioCompositionConflicts(windfallRequest).issues.some((item) => item.code === "duplicate_event_representation"));
});

test("FFH-042 ambiguous cash/expense ownership fails closed while explicit independent event IDs avoid false conflicts", () => {
  const baseline = engine();
  const intent = { type: "home", eventId: "home-event", scenario: homeScenario() } as const;
  const generic = genericDefinition(intent, {
    recurringOverrides: [{
      type: "synthetic_expense", id: "independent-expense", expenseId: "independent-expense-id",
      name: "Independent expense", category: "other", monthlyAmount: 10, isEssential: false, cashFlowTreatment: "discretionary",
    }],
    oneTimeEvents: [{ type: "cash_use", id: "independent-cash", amount: 100, purpose: "generic" }],
  });

  const ambiguous = definition(intent, { genericDefinition: generic });
  assert.ok(detectScenarioCompositionConflicts(ambiguous).issues.some((item) => item.code === "ambiguous_event_ownership"));

  const explicit = definition(intent, {
    genericDefinition: generic,
    operationEventLinks: [
      { operationId: "independent-cash", eventId: "other-cash-event" },
      { operationId: "independent-expense", eventId: "other-expense-event" },
    ],
  });
  assert.equal(detectScenarioCompositionConflicts(explicit).valid, true);
  assert.notEqual(runSpecializedScenario(baseline, explicit).status, "invalid");
});

test("FFH-042 adapter-owned stable goal cash cannot also be consumed generically", () => {
  const intent = { type: "home", eventId: "home-event", scenario: homeScenario() } as const;
  const request = definition(intent, {
    genericDefinition: genericDefinition(intent, {
      oneTimeEvents: [{ type: "cash_use", id: "goal-cash-use", amount: 100, relatedGoalId: "house-goal", purpose: "generic" }],
    }),
    operationEventLinks: [{ operationId: "goal-cash-use", eventId: "independent-event" }],
  });
  const conflicts = detectScenarioCompositionConflicts(request);
  assert.equal(conflicts.valid, false);
  assert.ok(conflicts.issues.some((item) => item.code === "stable_entity_overlap"));
});

test("FFH-042 adapter-owned stable debt and expense IDs cannot be remodeled generically", () => {
  const intent = {
    type: "home",
    eventId: "home-owned-ids",
    scenario: homeScenario(),
    ownedStableIds: { debtIds: ["card"], expenseIds: ["housing"] },
  } as const;
  const request = definition(intent, {
    genericDefinition: genericDefinition(intent, {
      recurringOverrides: [
        { type: "debt", id: "mortgage-duplicate", debtId: "card", balance: 100000 },
        { type: "expense", id: "housing-duplicate", expenseId: "housing", monthlyAmount: 3000 },
      ],
    }),
  });
  const conflicts = detectScenarioCompositionConflicts(request);
  assert.equal(conflicts.valid, false);
  assert.equal(conflicts.issues.filter((item) => item.code === "stable_entity_overlap").length, 2);
});

test("FFH-042 baseline and generic engine remain immutable and equivalent runs/orderings are deterministic", () => {
  const baseline = engine();
  const frozen = structuredClone(baseline);
  const intent = { type: "home", eventId: "home-determinism", scenario: homeScenario() } as const;
  const generic = genericDefinition(intent, {
    recurringOverrides: [{
      type: "synthetic_expense", id: "other-expense", expenseId: "other-expense-id",
      name: "Other expense", category: "other", monthlyAmount: 10.01, isEssential: false, cashFlowTreatment: "discretionary",
    }],
    oneTimeEvents: [{ type: "cash_use", id: "other-cash", amount: 33.34, purpose: "generic" }],
  });
  const first = definition(intent, {
    genericDefinition: generic,
    operationEventLinks: [
      { operationId: "other-expense", eventId: "independent-expense" },
      { operationId: "other-cash", eventId: "independent-cash" },
    ],
  });
  const second = definition(intent, {
    genericDefinition: generic,
    operationEventLinks: [...first.operationEventLinks].reverse(),
  });

  const runA = runSpecializedScenario(baseline, first);
  const runB = runSpecializedScenario(baseline, second);
  const runC = runSpecializedScenario(baseline, first);
  assert.deepEqual(runA, runB);
  assert.deepEqual(runA, runC);
  assert.deepEqual(baseline, frozen);

  const genericOnly = runMoneyPriorityScenario(baseline, { ...generic, specializedIntent: null });
  assert.deepEqual(runA.genericEngineResult, genericOnly.scenarioEngineResult);
});

function hsaRaw(): MoneyPriorityRawSnapshot {
  const months = (personId: string) => Array.from({ length: 12 }, (_, index) => ({
    id: "month-" + personId + "-" + (index + 1), person_id: personId, tax_year: 2026, month: index + 1,
    eligibility_status: "eligible", coverage_status: "family", evidence_status: "confirmed",
  }));
  return {
    householdId: "hsa-specialized",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1970-01-01", estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1970-01-01", estimated_taxable_compensation_annual: 100000, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    income: [], expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: [
      { id: "hsa-a", owner_person_id: "a", name: "A HSA", account_type: "hsa", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, hsa_ytd_tax_year: 2026 },
      { id: "hsa-b", owner_person_id: "b", name: "B HSA", account_type: "hsa", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0, hsa_ytd_tax_year: 2026 },
    ],
    hsaTaxYearProfiles: [
      { id: "profile-a", person_id: "a", tax_year: 2026, medicare_effective_on: null, last_month_rule_status: "not_elected", testing_period_status: "not_applicable", data_version: 1 },
      { id: "profile-b", person_id: "b", tax_year: 2026, medicare_effective_on: null, last_month_rule_status: "not_elected", testing_period_status: "not_applicable", data_version: 1 },
    ],
    hsaMonthStatuses: [...months("a"), ...months("b")],
    hsaLegalSpouseAuthorities: [{
      id: "authority", tax_year: 2026, person_one_id: "a", person_two_id: "b",
      authority_status: "confirmed_legal_spouses", confirmation_source: "ffh-042",
      confirmed_at: "2026-01-01T00:00:00.000Z", data_version: 1,
    }],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 200000 },
  };
}

test("FFH-042 HSA family/shared/catch-up capacity is not recreated by specialized Windfall composition", () => {
  const baseline = engine(hsaRaw());
  const intent = {
    type: "windfall", eventId: "hsa-windfall",
    input: { amount: 1000, source: "gift", taxTreatment: "known_non_taxable" },
  } as const;
  const run = runSpecializedScenario(baseline, definition(intent));
  assert.ok(run.genericEngineResult);
  assert.equal(run.specialized?.type, "windfall");
  if (!run.genericEngineResult || run.specialized?.type !== "windfall") return;

  const group = run.genericEngineResult.retirementCapacityLedger.groups.find((item) => item.id === "hsa:married-family");
  assert.equal(group?.originalRemainingAnnualRoom, 10750);
  assert.deepEqual(run.genericEngineResult.retirementCapacityLedger.entries.map((entry) => entry.sharedOrdinaryRemainingRoom), [8750, 8750]);
  assert.deepEqual(run.genericEngineResult.retirementCapacityLedger.entries.map((entry) => entry.catchUpRemainingRoom), [1000, 1000]);
  const before = structuredClone(run.genericEngineResult);
  assert.deepEqual(run.specialized.result, allocateWindfall(run.genericEngineResult, intent.input));
  assert.deepEqual(run.genericEngineResult, before);
  assert.ok(retirementCapacityInvariantHolds(run.genericEngineResult.retirementCapacityLedger));
});

function spousalIraRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "ira-specialized",
    people: [
      { id: "a", display_name: "A", relationship: "self", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 10000.01, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
      { id: "b", display_name: "B", relationship: "spouse_partner", birth_date: "1990-01-01", estimated_taxable_compensation_annual: 0, covered_by_workplace_retirement_plan: false, is_active: true, is_dependent: false },
    ],
    income: [{ id: "income", owner_person_id: "a", name: "Income", monthly_amount: 5000, monthly_gross_amount: 6000, is_active: true }],
    expenses: [], accounts: [], debts: [], goals: [], insuranceExposures: [],
    retirementAccounts: [
      { id: "ira-a", owner_person_id: "a", name: "A IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
      { id: "ira-b", owner_person_id: "b", name: "B IRA", account_type: "traditional_ira", balance: 0, monthly_employee_contribution: 0, monthly_employer_contribution: 0, employee_contributed_ytd: 0, employer_contributed_ytd: 0 },
    ],
    preferences: { tax_profile_year: 2026, tax_filing_status: "married_filing_jointly", estimated_modified_agi: 10000.01, retirement_spending_basis: "today_dollars" },
  };
}

test("FFH-042 spousal-IRA shared compensation remains exact under generic then specialized composition", () => {
  const baseline = engine(spousalIraRaw());
  const intent = {
    type: "windfall", eventId: "ira-windfall",
    input: { amount: 1000, source: "gift", taxTreatment: "known_non_taxable" },
  } as const;
  const request = definition(intent, {
    genericDefinition: genericDefinition(intent, {
      recurringOverrides: [{
        type: "synthetic_expense", id: "unrelated", expenseId: "unrelated-expense",
        name: "Unrelated", category: "other", monthlyAmount: 1.01, isEssential: false, cashFlowTreatment: "discretionary",
      }],
    }),
    operationEventLinks: [{ operationId: "unrelated", eventId: "unrelated-event" }],
  });
  const run = runSpecializedScenario(baseline, request);
  assert.ok(run.genericEngineResult);
  assert.equal(run.specialized?.type, "windfall");
  if (!run.genericEngineResult || run.specialized?.type !== "windfall") return;

  const group = run.genericEngineResult.retirementCapacityLedger.groups.find((item) => item.id.startsWith("ira:mfj-compensation:"));
  assert.equal(group?.originalRemainingAnnualRoom, 10000.01);
  const before = structuredClone(run.genericEngineResult);
  assert.deepEqual(run.specialized.result, allocateWindfall(run.genericEngineResult, intent.input));
  assert.deepEqual(run.genericEngineResult, before);
  assert.ok(retirementCapacityInvariantHolds(run.genericEngineResult.retirementCapacityLedger));
});
