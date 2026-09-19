import assert from "node:assert/strict";
import test from "node:test";

import type { HomePurchaseScenario } from "./home-affordability.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { deriveRecommendedPlanAllocations } from "./money-priority-user-plan.ts";
import type { MoneyPriorityRawSnapshot, MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import type { VehiclePurchaseScenario } from "./vehicle-affordability.ts";
import { SCENARIO_DEFINITION_VERSION, type ScenarioDefinition } from "../scenarios/scenario-definition.ts";
import { scenarioBaselineDescriptor } from "../scenarios/scenario-fingerprint.ts";
import {
  SPECIALIZED_SCENARIO_DEFINITION_VERSION,
  type ScenarioSpecializedIntent,
  type SpecializedScenarioDefinition,
} from "../scenarios/scenario-specialized-contract.ts";
import {
  executeSpecializedScenarioRebase,
  executeSpecializedScenarioRun,
} from "../scenarios/scenario-specialized-execution.ts";
import { runSpecializedScenario } from "../scenarios/scenario-specialized-runner.ts";
import type { ScenarioExecutionDependencies } from "../scenarios/scenario-execution.ts";

const AS_OF = "2026-09-19";

function raw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "server-household",
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
      { id: "housing", name: "Housing", category: "housing", monthly_amount: 2000, is_essential: true, cash_flow_treatment: "required" },
      { id: "essentials", name: "Essentials", category: "other", monthly_amount: 2000, is_essential: true, cash_flow_treatment: "required" },
    ],
    accounts: [
      { id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
      { id: "cash", name: "Cash", account_type: "savings", balance: 250000, cash_purpose: "unallocated" },
      { id: "house-cash", name: "House fund", account_type: "savings", balance: 20000, cash_purpose: "earmarked_goal", related_goal_id: "house-goal" },
      { id: "car-cash", name: "Car fund", account_type: "savings", balance: 10000, cash_purpose: "earmarked_goal", related_goal_id: "car-goal" },
    ],
    debts: [{ id: "card", name: "Card", debt_type: "credit_card", current_balance: 4000, interest_rate: 20, minimum_payment: 100 }],
    retirementAccounts: [{
      id: "work", owner_person_id: "p", name: "401k", account_type: "401k", balance: 300000,
      monthly_employee_contribution: 1500, monthly_employer_contribution: 300,
      employee_contributed_ytd: 10000, employer_contributed_ytd: 2000,
      plan_eligible_compensation_annual: 180000, full_match_employee_contribution_monthly: 1000,
      match_status: "fully_captured",
    }],
    goals: [
      { id: "house-goal", name: "House", target_amount: 60000, current_amount: 20000, target_date: "2027-09-19",
        priority: 1, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "somewhat_flexible",
        consequence_level: "moderate", planned_monthly_contribution: 500, core_need_amount: 50000,
        goal_intelligence_confirmed: true, underlying_need: "Housing", desired_solution: "Purchase", goal_nature: "mixed",
        underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null },
      { id: "car-goal", name: "Vehicle", target_amount: 30000, current_amount: 10000, target_date: "2027-06-19",
        priority: 2, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "somewhat_flexible",
        consequence_level: "moderate", planned_monthly_contribution: 300, core_need_amount: 20000,
        goal_intelligence_confirmed: true, underlying_need: "Transportation", desired_solution: "Purchase", goal_nature: "mixed",
        underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null },
    ],
    insuranceExposures: [{ id: "insurance", person_id: "p", name: "Auto", insurance_type: "auto", deductible_amount: 1000,
      family_deductible_amount: null, out_of_pocket_max: null, percentage_deductible: null, insured_value: 30000, is_relevant_to_reserve: true }],
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

function homeScenario(goalId: string | null = "house-goal"): HomePurchaseScenario {
  return {
    purchasePrice: 300000, downPayment: 60000,
    mortgage: { rateType: "fixed", interestRate: 4, termYears: 30, arm: null, hasBalloonPayment: false, allowsNegativeAmortization: false },
    closing: { closingCosts: 8000, prepaidCosts: 2000, initialEscrowDeposit: 2000, earnestMoneyAlreadyPaid: 5000, sellerCredits: 0, lenderCredits: 0, otherCredits: 0 },
    propertyTaxesAnnual: 6000,
    insurance: { homeownersAnnual: 1800, floodAnnual: 0, otherRequiredAnnual: 0 },
    hoaMonthly: 0, mortgageInsurance: { type: "none", monthlyAmount: 0 },
    monthlyMaintenancePlanningAmount: 300, monthlyUtilityChange: 100, otherMonthlyPropertyCosts: 0,
    immediateRequiredRepairs: 0, plannedNearTermRepairs: 0, currentHousingMonthlyCost: 2000,
    currentHousingCostDisappears: true, relatedGoalId: goalId, homeSale: null,
  };
}

function vehicleScenario(): VehiclePurchaseScenario {
  return {
    needType: "planned_replacement", purchasePrice: 30000, tradeInValue: 5000, tradeInLoanPayoff: 0,
    cashDownPayment: 10000, salesTax: 1800, titleRegistrationFees: 300, otherPurchaseFees: 100,
    loanApr: 5, loanTermMonths: 48, monthlyInsuranceChange: 50, monthlyFuelChange: -25,
    monthlyMaintenanceChange: -20, monthlyRegistrationTaxChange: 10, monthlyParkingTollsChange: 0,
    relatedGoalId: "car-goal", coreNeedAmount: 25000,
  };
}

function baseline(source = raw()) { return runMoneyPriorityEngine(source, AS_OF); }

function generic(fingerprint: string, specialized: ScenarioSpecializedIntent | null, overrides: Partial<ScenarioDefinition> = {}): ScenarioDefinition {
  return {
    version: SCENARIO_DEFINITION_VERSION, scenarioId: "scenario",
    baselineReference: { fingerprint, referenceId: null }, recurringOverrides: [], oneTimeEvents: [],
    specializedIntent: specialized ? { type: specialized.type, intentId: specialized.eventId } : null,
    ...overrides,
  };
}

function request(engine = baseline(), specialized: ScenarioSpecializedIntent | null = null, extras: Partial<SpecializedScenarioDefinition> = {}) {
  const descriptor = scenarioBaselineDescriptor(engine);
  const definition: SpecializedScenarioDefinition = {
    version: SPECIALIZED_SCENARIO_DEFINITION_VERSION,
    genericDefinition: generic(descriptor.fingerprint, specialized),
    specialized, operationEventLinks: [], yourPlanOverrides: [], ...extras,
  };
  return { definition, baselineFingerprint: descriptor.fingerprint, baselinePolicyBasis: descriptor.policyBasis };
}

function deps(snapshot: MoneyPrioritySnapshot, options: { authenticated?: boolean; householdId?: string | null; onLoad?: (id: string) => void } = {}): ScenarioExecutionDependencies {
  return {
    resolveAuthority: async () => ({ authenticated: options.authenticated ?? true, householdId: options.householdId === undefined ? "server-household" : options.householdId }),
    loadSnapshot: async (id) => { options.onLoad?.(id); return structuredClone(snapshot); },
    asOfDate: () => AS_OF,
  };
}

test("FFH-043 unauthenticated specialized run rejects before household loading", async () => {
  let loads = 0;
  const engine = baseline();
  const result = await executeSpecializedScenarioRun(request(engine), deps(engine.snapshot, { authenticated: false, householdId: null, onLoad: () => { loads += 1; } }));
  assert.equal(result.status, "unauthorized");
  assert.equal(loads, 0);
});

test("FFH-043 client household spoof is rejected while server household remains authoritative", async () => {
  const engine = baseline();
  const loaded: string[] = [];
  const result = await executeSpecializedScenarioRun({ ...request(engine), householdId: "attacker" }, deps(engine.snapshot, { onLoad: (id) => loaded.push(id) }));
  assert.equal(result.status, "invalid");
  assert.deepEqual(loaded, ["server-household"]);
  assert.ok(result.issues.some((item) => item.path === "request.householdId"));
});

test("FFH-043 stale specialized run fails closed before specialized output", async () => {
  const old = baseline();
  const intent = { type: "home", eventId: "home-1", scenario: homeScenario() } as const;
  const payload = request(old, intent);
  const changedRaw = raw(); changedRaw.income![0].monthly_amount = 11000;
  const result = await executeSpecializedScenarioRun(payload, deps(baseline(changedRaw).snapshot));
  assert.equal(result.status, "stale_baseline");
  assert.equal(result.specialized, null);
  assert.equal(result.provenance, null);
});

test("FFH-043 Home and Vehicle DTOs preserve direct FFH-042 specialized evaluator outputs", async () => {
  const engine = baseline();
  const home = { type: "home", eventId: "home-1", scenario: homeScenario() } as const;
  const homePayload = request(engine, home);
  const homeDirect = runSpecializedScenario(engine, homePayload.definition);
  const homeTransport = await executeSpecializedScenarioRun(homePayload, deps(engine.snapshot));
  assert.equal(homeTransport.specialized?.type, "home");
  assert.equal(homeDirect.specialized?.type, "home");
  if (homeTransport.specialized?.type === "home" && homeDirect.specialized?.type === "home") {
    assert.deepEqual(homeTransport.specialized.result, homeDirect.specialized.result);
  }

  const vehicle = { type: "vehicle", eventId: "vehicle-1", scenario: vehicleScenario() } as const;
  const vehiclePayload = request(engine, vehicle);
  const vehicleDirect = runSpecializedScenario(engine, vehiclePayload.definition);
  const vehicleTransport = await executeSpecializedScenarioRun(vehiclePayload, deps(engine.snapshot));
  assert.equal(vehicleTransport.specialized?.type, "vehicle");
  assert.equal(vehicleDirect.specialized?.type, "vehicle");
  if (vehicleTransport.specialized?.type === "vehicle" && vehicleDirect.specialized?.type === "vehicle") {
    assert.deepEqual(vehicleTransport.specialized.result, vehicleDirect.specialized.result);
  }
});

test("FFH-043 Windfall transport preserves exact reservations, allocations, and residual", async () => {
  const engine = baseline();
  const intent = { type: "windfall", eventId: "windfall-1", input: {
    amount: 12345.67, source: "bonus", taxTreatment: "known_taxable_liability_provided",
    knownTaxLiability: 1000.01, knownOtherLiability: 200, restrictedAmount: 300.03, earmarkedAmount: 400.04,
  } } as const;
  const payload = request(engine, intent);
  const direct = runSpecializedScenario(engine, payload.definition);
  const transported = await executeSpecializedScenarioRun(payload, deps(engine.snapshot));
  assert.equal(transported.specialized?.type, "windfall");
  assert.equal(direct.specialized?.type, "windfall");
  if (transported.specialized?.type !== "windfall" || direct.specialized?.type !== "windfall") return;
  assert.deepEqual(transported.specialized.result, direct.specialized.result);
  const result = transported.specialized.result;
  const cents = (value: number) => Math.round(value * 100);
  assert.equal(cents(result.grossAmount ?? 0), cents(result.reservedTaxAmount) + cents(result.reservedOtherLiabilityAmount)
    + cents(result.restrictedAmount) + cents(result.earmarkedAmount) + cents(result.heldForTaxReviewAmount)
    + cents(result.totalAllocated) + cents(result.remainingUnallocated));
});

test("FFH-043 Your Plan transports active, superseded, invalid, and funding-gap states", async () => {
  const engine = baseline();
  const allocationId = deriveRecommendedPlanAllocations(engine)[0]!.allocationId;
  const descriptor = scenarioBaselineDescriptor(engine);

  const activePayload = request(engine, null, { yourPlanOverrides: [{ allocationId, monthlyAmount: engine.feasibility.monthlyPlanCapacity + 1000 }] });
  const active = await executeSpecializedScenarioRun(activePayload, deps(engine.snapshot));
  assert.equal(active.yourPlan?.result.overrides.active.length, 1);
  assert.equal(active.yourPlan?.result.yourPlan.fundingStatus, "funding_gap");
  assert.ok((active.yourPlan?.result.yourPlan.fundingGap ?? 0) > 0);

  const superseded = await executeSpecializedScenarioRun(request(engine, null, { yourPlanOverrides: [{ allocationId: "gone::goal::gone", monthlyAmount: 10 }] }), deps(engine.snapshot));
  assert.equal(superseded.yourPlan?.result.overrides.superseded.length, 1);

  const invalid = await executeSpecializedScenarioRun({
    definition: { ...request(engine).definition, yourPlanOverrides: [{ allocationId, monthlyAmount: -1 }] },
    baselineFingerprint: descriptor.fingerprint, baselinePolicyBasis: descriptor.policyBasis,
  }, deps(engine.snapshot));
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.yourPlan?.result.overrides.invalid.length, 1);
});

test("FFH-043 accepted same-event/stable-ID conflicts surface without specialized execution, while unrelated goal changes remain allowed", async () => {
  const engine = baseline();
  const intent = { type: "home", eventId: "home-event", scenario: homeScenario() } as const;
  const descriptor = scenarioBaselineDescriptor(engine);

  const conflictDefinition = request(engine, intent).definition;
  conflictDefinition.genericDefinition = generic(descriptor.fingerprint, intent, {
    recurringOverrides: [{ type: "goal", id: "same-goal", goalId: "house-goal", currentAmount: 25000 }],
  });
  const conflict = await executeSpecializedScenarioRun({ definition: conflictDefinition, baselineFingerprint: descriptor.fingerprint, baselinePolicyBasis: descriptor.policyBasis }, deps(engine.snapshot));
  assert.equal(conflict.status, "invalid");
  assert.equal(conflict.specialized, null);
  assert.ok(conflict.issues.some((item) => item.code === "stable_entity_overlap"));

  const allowedDefinition = request(engine, intent).definition;
  allowedDefinition.genericDefinition = generic(descriptor.fingerprint, intent, {
    recurringOverrides: [{ type: "goal", id: "other-goal", goalId: "car-goal", currentAmount: 9000 }],
  });
  const allowed = await executeSpecializedScenarioRun({ definition: allowedDefinition, baselineFingerprint: descriptor.fingerprint, baselinePolicyBasis: descriptor.policyBasis }, deps(engine.snapshot));
  assert.notEqual(allowed.status, "invalid");
  assert.equal(allowed.specialized?.type, "home");
});

test("FFH-043 successful explicit rebase refreshes entity options; deleted referenced stable IDs remain unresolved without name retargeting", async () => {
  const original = baseline();
  const home = { type: "home", eventId: "home-rebase", scenario: homeScenario() } as const;
  const payload = request(original, home);

  const changed = raw();
  changed.goals!.push({
    id: "new-goal", name: "New goal", target_amount: 1000, current_amount: 0, target_date: "2027-12-31",
    priority: 3, goal_class: "other", necessity: "important", deadline_flexibility: "flexible", consequence_level: "moderate",
    planned_monthly_contribution: 10, core_need_amount: 1000, goal_intelligence_confirmed: true,
    underlying_need: "Need", desired_solution: "Fund", goal_nature: "mixed", underfunding_consequence: "inconvenience",
    borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null,
  });
  const rebased = await executeSpecializedScenarioRebase(payload, deps(baseline(changed).snapshot));
  assert.equal(rebased.status, "rebased");
  assert.ok(rebased.bootstrap?.entities.goals.some((goal) => goal.id === "new-goal"));

  const deleted = raw();
  deleted.goals = deleted.goals!.filter((goal) => goal.id !== "house-goal");
  deleted.accounts = deleted.accounts!.filter((account) => account.related_goal_id !== "house-goal");
  deleted.goals!.push({
    id: "replacement-house-goal", name: "House", target_amount: 60000, current_amount: 20000, target_date: "2027-09-19",
    priority: 1, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "somewhat_flexible",
    consequence_level: "moderate", planned_monthly_contribution: 500, core_need_amount: 50000,
    goal_intelligence_confirmed: true, underlying_need: "Housing", desired_solution: "Purchase", goal_nature: "mixed",
    underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely", expected_borrowing_amount: null, expected_borrowing_apr: null,
  });
  const unresolved = await executeSpecializedScenarioRebase(payload, deps(baseline(deleted).snapshot));
  assert.equal(unresolved.status, "unresolved");
  assert.equal(unresolved.definition, null);
  assert.ok(unresolved.issues.some((item) => item.code === "missing_entity"));
  assert.ok(unresolved.bootstrap?.entities.goals.some((goal) => goal.id === "replacement-house-goal"));
});
