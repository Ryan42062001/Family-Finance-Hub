// FFH-P10 — Can We Afford It? (issue #171): canonical equivalence, option isolation, missing information,
// advisory thresholds at exact boundaries, server-side authority and read-only behaviour.
import assert from "node:assert/strict";
import test from "node:test";

import { evaluateHomeAffordability, type HomeAffordabilityResult } from "./home-affordability.ts";
import { evaluateVehicleAffordability, type VehicleAffordabilityResult } from "./vehicle-affordability.ts";
import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot, MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { SCENARIO_DEFINITION_VERSION } from "../scenarios/scenario-definition.ts";
import { scenarioBaselineDescriptor } from "../scenarios/scenario-fingerprint.ts";
import { SPECIALIZED_SCENARIO_DEFINITION_VERSION, type ScenarioSpecializedIntent } from "../scenarios/scenario-specialized-contract.ts";
import { executeSpecializedScenarioRun } from "../scenarios/scenario-specialized-execution.ts";
import type { ScenarioExecutionDependencies } from "../scenarios/scenario-execution.ts";
import { executePurchaseCheck, purchaseCheckBootstrap, recordedHousingCents, type PurchaseOptionResult } from "../purchase-check/purchase-check-execution.ts";
import { parseMoneyText, parsePurchaseCheck, type ParsedHomeOption, type ParsedVehicleOption } from "../purchase-check/purchase-check-input.ts";
import { homeGuidance, vehicleGuidance, type GuidelineCheck } from "../purchase-check/guidance.ts";

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
      { id: "housing", name: "Rent", category: "housing", monthly_amount: 2000, is_essential: true, cash_flow_treatment: "required" },
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

function baseline(source = raw()): MoneyPriorityEngineResult { return runMoneyPriorityEngine(source, AS_OF); }

function homeFields(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    purchasePrice: "300000", downPayment: "60000", rateType: "fixed", interestRate: "4", termYears: "30",
    armInitialFixedMonths: "", armAdjustmentFrequencyMonths: "", armInitialCap: "", armSubsequentCap: "", armLifetimeCap: "",
    hasBalloonPayment: "no", allowsNegativeAmortization: "no",
    closingCosts: "8000", prepaidCosts: "2000", initialEscrowDeposit: "2000", earnestMoneyAlreadyPaid: "5000",
    sellerCredits: "0", lenderCredits: "0", otherCredits: "0",
    propertyTaxesAnnual: "6000", homeownersInsuranceAnnual: "1800", floodInsuranceAnnual: "0", otherInsuranceAnnual: "0", hoaMonthly: "0",
    mortgageInsuranceType: "none", mortgageInsuranceMonthly: "0",
    maintenanceMonthly: "300", utilityChangeMonthly: "100", otherPropertyCostsMonthly: "0",
    immediateRequiredRepairs: "0", plannedNearTermRepairs: "0",
    currentHousingMonthlyCost: "2000", currentHousingEnds: "yes", relatedGoalId: "house-goal",
    ...overrides,
  };
}

function vehicleFields(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    needType: "planned_replacement", purchasePrice: "30000", tradeInValue: "5000", tradeInLoanPayoff: "0", cashDownPayment: "10000",
    salesTax: "1800", titleRegistrationFees: "300", otherPurchaseFees: "100", loanApr: "5", loanTermMonths: "48",
    monthlyInsuranceChange: "50", monthlyFuelChange: "-25", monthlyMaintenanceChange: "-20", monthlyRegistrationTaxChange: "10", monthlyParkingTollsChange: "0",
    relatedGoalId: "car-goal", otherVehiclesValue: "15000",
    ...overrides,
  };
}

function request(engine: MoneyPriorityEngineResult, kind: "home" | "vehicle", options: Array<Record<string, string>>, extra: Record<string, unknown> = {}) {
  return {
    kind,
    baselineFingerprint: scenarioBaselineDescriptor(engine).fingerprint,
    options: options.map((fields, index) => ({ label: index === 0 ? "A" : "B", fields })),
    ...extra,
  };
}

function deps(snapshot: MoneyPrioritySnapshot, options: { authenticated?: boolean; householdId?: string | null; onLoad?: (id: string) => void } = {}): ScenarioExecutionDependencies {
  return {
    resolveAuthority: async () => ({ authenticated: options.authenticated ?? true, householdId: options.householdId === undefined ? "server-household" : options.householdId }),
    loadSnapshot: async (id) => { options.onLoad?.(id); return structuredClone(snapshot); },
    asOfDate: () => AS_OF,
  };
}

function context(engine: MoneyPriorityEngineResult) {
  return { goalIds: new Set(engine.snapshot.goals.map((goal) => goal.id)), recordedHousingCents: recordedHousingCents(engine) };
}

function parsedHome(engine: MoneyPriorityEngineResult, fields = homeFields()): ParsedHomeOption {
  const { parsed, issues } = parsePurchaseCheck(request(engine, "home", [fields]), context(engine));
  assert.deepEqual(issues, []);
  return parsed!.options[0] as ParsedHomeOption;
}

function parsedVehicle(engine: MoneyPriorityEngineResult, fields = vehicleFields()): ParsedVehicleOption {
  const { parsed, issues } = parsePurchaseCheck(request(engine, "vehicle", [fields]), context(engine));
  assert.deepEqual(issues, []);
  return parsed!.options[0] as ParsedVehicleOption;
}

async function scenarioLabResult(engine: MoneyPriorityEngineResult, intent: ScenarioSpecializedIntent) {
  const descriptor = scenarioBaselineDescriptor(engine);
  const run = await executeSpecializedScenarioRun({
    definition: {
      version: SPECIALIZED_SCENARIO_DEFINITION_VERSION,
      genericDefinition: {
        version: SCENARIO_DEFINITION_VERSION, scenarioId: "lab", baselineReference: { fingerprint: descriptor.fingerprint, referenceId: null },
        recurringOverrides: [], oneTimeEvents: [], specializedIntent: { type: intent.type, intentId: intent.eventId },
      },
      specialized: intent, operationEventLinks: [], yourPlanOverrides: [],
    },
    baselineFingerprint: descriptor.fingerprint,
    baselinePolicyBasis: descriptor.policyBasis,
  }, deps(engine.snapshot));
  return run.specialized && "result" in run.specialized ? run.specialized.result : null;
}

function check(checks: GuidelineCheck[], id: GuidelineCheck["id"]): GuidelineCheck {
  const found = checks.find((item) => item.id === id);
  assert.ok(found, id);
  return found;
}

// ---- canonical equivalence -----------------------------------------------------------------------------------------

test("FFH-P10 home check returns exactly the canonical evaluator and Scenario Lab result for the same baseline and inputs", async () => {
  const engine = baseline();
  const option = parsedHome(engine);
  const response = await executePurchaseCheck(request(engine, "home", [homeFields()]), deps(engine.snapshot));
  assert.equal(response.status, "ok");
  assert.equal(response.hypothetical, true);
  const p10 = response.options[0];
  assert.equal(p10.kind, "home");
  const direct = evaluateHomeAffordability(engine, option.scenario);
  assert.deepEqual(p10.canonical, direct);
  const lab = await scenarioLabResult(engine, { type: "home", eventId: "lab-home", scenario: option.scenario });
  assert.deepEqual(p10.canonical, lab);
  assert.notEqual((p10.canonical as HomeAffordabilityResult).overallAffordability, "more_information_needed");
});

test("FFH-P10 vehicle check returns exactly the canonical evaluator and Scenario Lab result", async () => {
  const engine = baseline();
  const option = parsedVehicle(engine);
  const response = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields()]), deps(engine.snapshot));
  assert.equal(response.status, "ok");
  const p10 = response.options[0];
  assert.deepEqual(p10.canonical, evaluateVehicleAffordability(engine, option.scenario));
  assert.deepEqual(p10.canonical, await scenarioLabResult(engine, { type: "vehicle", eventId: "lab-vehicle", scenario: option.scenario }));
});

test("FFH-P10 advisory inputs never change the canonical verdict", async () => {
  const engine = baseline();
  const a = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields({ otherVehiclesValue: "" })]), deps(engine.snapshot));
  const b = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields({ otherVehiclesValue: "900000" })]), deps(engine.snapshot));
  assert.deepEqual(a.options[0].canonical, b.options[0].canonical);
  assert.equal(check(a.options[0].guidance, "vehicle_value_50").status, "insufficient_information");
  assert.equal(check(b.options[0].guidance, "vehicle_value_50").status, "exceeds");
});

// ---- comparison isolation ------------------------------------------------------------------------------------------

test("FFH-P10 two options are evaluated independently: each equals its own single-option run", async () => {
  const engine = baseline();
  const a = homeFields();
  const b = homeFields({ purchasePrice: "450000", downPayment: "45000", interestRate: "7.5", relatedGoalId: "", mortgageInsuranceType: "conventional_pmi", mortgageInsuranceMonthly: "180" });
  const before = structuredClone([a, b]);
  const pair = await executePurchaseCheck(request(engine, "home", [a, b]), deps(engine.snapshot));
  const onlyA = await executePurchaseCheck(request(engine, "home", [a]), deps(engine.snapshot));
  const onlyB = await executePurchaseCheck(request(engine, "home", [b]), deps(engine.snapshot));
  assert.equal(pair.options.length, 2);
  assert.deepEqual(pair.options[0], onlyA.options[0]);
  assert.deepEqual({ ...pair.options[1], label: "A" }, { ...onlyB.options[0] });
  assert.notDeepEqual(pair.options[0].canonical, pair.options[1].canonical);
  assert.deepEqual([a, b], before, "inputs are not mutated");
});

test("FFH-P10 more than two options, or mixed shapes, are refused", async () => {
  const engine = baseline();
  const three = await executePurchaseCheck(request(engine, "home", [homeFields(), homeFields(), homeFields()]), deps(engine.snapshot));
  assert.equal(three.status, "invalid");
  const mixed = await executePurchaseCheck(request(engine, "home", [homeFields(), vehicleFields()]), deps(engine.snapshot));
  assert.equal(mixed.status, "invalid");
  assert.deepEqual(mixed.options, []);
});

// ---- server authority, forged and stale requests ---------------------------------------------------------------------

test("FFH-P10 unauthenticated or household-less requests are refused before any household data loads", async () => {
  const engine = baseline();
  for (const authority of [{ authenticated: false, householdId: null }, { authenticated: true, householdId: null }]) {
    let loads = 0;
    const result = await executePurchaseCheck(request(engine, "home", [homeFields()]), deps(engine.snapshot, { ...authority, onLoad: () => { loads += 1; } }));
    assert.equal(result.status, "unauthorized");
    assert.equal(result.baselineFingerprint, null);
    assert.deepEqual(result.options, []);
    assert.equal(loads, 0);
  }
});

test("FFH-P10 forged household IDs, snapshots or results are refused; the server household stays authoritative", async () => {
  const engine = baseline();
  for (const extra of [{ householdId: "attacker" }, { snapshot: engine.snapshot }, { result: { overallAffordability: "comfortably_affordable" } }]) {
    const loaded: string[] = [];
    const result = await executePurchaseCheck(request(engine, "home", [homeFields()], extra), deps(engine.snapshot, { onLoad: (id) => loaded.push(id) }));
    assert.equal(result.status, "invalid");
    assert.deepEqual(result.options, []);
    assert.deepEqual(loaded, ["server-household"]);
  }
  const nested = request(engine, "home", [homeFields({ householdId: "attacker" } as Record<string, string>)]);
  assert.equal((await executePurchaseCheck(nested, deps(engine.snapshot))).status, "invalid");
  const optionExtra = { ...request(engine, "home", [homeFields()]) };
  (optionExtra.options[0] as Record<string, unknown>).canonical = {};
  assert.equal((await executePurchaseCheck(optionExtra, deps(engine.snapshot))).status, "invalid");
});

test("FFH-P10 another household's fingerprint (or a changed baseline) is stale and returns nothing about that household", async () => {
  const engine = baseline();
  const other = raw();
  other.householdId = "other-household";
  other.accounts![1].balance = 1;
  const otherEngine = baseline(other);
  const result = await executePurchaseCheck(request(otherEngine, "home", [homeFields()]), deps(engine.snapshot));
  assert.equal(result.status, "stale_baseline");
  assert.deepEqual(result.options, []);
  assert.equal(result.baselineFingerprint, scenarioBaselineDescriptor(engine).fingerprint);
});

test("FFH-P10 a goal ID that is not in the server household is refused", async () => {
  const engine = baseline();
  const result = await executePurchaseCheck(request(engine, "home", [homeFields({ relatedGoalId: "someone-elses-goal" })]), deps(engine.snapshot));
  assert.equal(result.status, "invalid");
  assert.ok(result.issues.some((issue) => issue.path.endsWith("relatedGoalId")));
});

test("FFH-P10 the check is read-only: the loaded snapshot and baseline are not mutated", async () => {
  const engine = baseline();
  const snapshot = structuredClone(engine.snapshot);
  const frozen = structuredClone(snapshot);
  const dependencies: ScenarioExecutionDependencies = {
    resolveAuthority: async () => ({ authenticated: true, householdId: "server-household" }),
    loadSnapshot: async () => snapshot,
    asOfDate: () => AS_OF,
  };
  await executePurchaseCheck(request(engine, "home", [homeFields(), homeFields({ purchasePrice: "500000" })]), dependencies);
  await executePurchaseCheck(request(engine, "vehicle", [vehicleFields()]), dependencies);
  assert.deepEqual(snapshot, frozen);
});

// ---- missing information and exact input parsing ---------------------------------------------------------------------

test("FFH-P10 blank costs stay unknown (never zero): canonical verdict is more information needed and guidance is insufficient", async () => {
  const engine = baseline();
  const result = await executePurchaseCheck(request(engine, "home", [homeFields({ propertyTaxesAnnual: "", homeownersInsuranceAnnual: "" })]), deps(engine.snapshot));
  assert.equal(result.status, "ok");
  const option = result.options[0] as Extract<PurchaseOptionResult, { kind: "home" }>;
  assert.equal(option.canonical.overallAffordability, "more_information_needed");
  assert.ok(option.canonical.missingData.includes("propertyTaxesAnnual"));
  assert.ok(option.missing.includes("Yearly property taxes"));
  for (const id of ["housing_28", "debt_36", "emergency_reserve"] as const) {
    const item = check(option.guidance, id);
    assert.equal(item.status, "insufficient_information", id);
    assert.equal(item.actual, null, id);
  }
});

test("FFH-P10 vehicle: blank fees and unknown loan terms stay unknown", async () => {
  const engine = baseline();
  const result = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields({ salesTax: "", loanApr: "" })]), deps(engine.snapshot));
  const option = result.options[0] as Extract<PurchaseOptionResult, { kind: "vehicle" }>;
  assert.equal(option.canonical.affordability, "more_information_needed");
  assert.ok(option.canonical.missingData.includes("salesTax"));
  assert.equal(check(option.guidance, "vehicle_payments_8").status, "insufficient_information");
});

test("FFH-P10 required fields, malformed amounts and contradictory inputs are refused with plain messages", async () => {
  const engine = baseline();
  const cases: Array<[Record<string, string>, string]> = [
    [homeFields({ purchasePrice: "" }), "purchasePrice"],
    [homeFields({ downPayment: "abc" }), "downPayment"],
    [homeFields({ closingCosts: "-5" }), "closingCosts"],
    [homeFields({ interestRate: "99" }), "interestRate"],
    [homeFields({ termYears: "2.5" }), "termYears"],
    [homeFields({ immediateRequiredRepairs: "" }), "immediateRequiredRepairs"],
    [homeFields({ hoaMonthly: "1.234" }), "hoaMonthly"],
    [homeFields({ rateType: "teaser" }), "rateType"],
  ];
  for (const [fields, field] of cases) {
    const result = await executePurchaseCheck(request(engine, "home", [fields]), deps(engine.snapshot));
    assert.equal(result.status, "invalid", field);
    assert.ok(result.issues.some((issue) => issue.path.endsWith(`.${field}`)), field);
  }
  const contradictory = await executePurchaseCheck(request(engine, "home", [homeFields({ downPayment: "300000.01" })]), deps(engine.snapshot));
  assert.equal(contradictory.status, "invalid");
  assert.ok(contradictory.issues.some((issue) => issue.path.endsWith(".downPayment")));
  assert.equal((await executePurchaseCheck(request(engine, "home", [homeFields({ downPayment: "300000" })]), deps(engine.snapshot))).status, "ok");
  const vehicleOver = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields({ cashDownPayment: "32200.01", tradeInValue: "0" })]), deps(engine.snapshot));
  assert.equal(vehicleOver.status, "invalid");
  const trade = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields({ tradeInLoanPayoff: "" })]), deps(engine.snapshot));
  assert.equal(trade.status, "invalid");
});

test("FFH-P10 money text parses to exact cents", () => {
  assert.equal(parseMoneyText("1,234.56", false), 1234.56);
  assert.equal(parseMoneyText("$10", false), 10);
  assert.equal(parseMoneyText(" 0.1 ", false), 0.1);
  assert.equal(parseMoneyText("", false), null);
  assert.ok(Number.isNaN(parseMoneyText("1.234", false)));
  assert.ok(Number.isNaN(parseMoneyText("-5", false)));
  assert.equal(parseMoneyText("-5.25", true), -5.25);
  assert.ok(Number.isNaN(parseMoneyText("1e5", false)));
  assert.ok(Number.isNaN(parseMoneyText("12,34", false)));
});

// ---- P09 noninterference: housing costs counted once ------------------------------------------------------------------

test("FFH-P10 removing more current housing cost than the plan records is refused (no double counting)", async () => {
  const engine = baseline();
  assert.equal(purchaseCheckBootstrap(engine).recordedHousingMonthly, 2000);
  const tooMuch = await executePurchaseCheck(request(engine, "home", [homeFields({ currentHousingMonthlyCost: "2000.01" })]), deps(engine.snapshot));
  assert.equal(tooMuch.status, "invalid");
  const exact = await executePurchaseCheck(request(engine, "home", [homeFields({ currentHousingMonthlyCost: "2000.00" })]), deps(engine.snapshot));
  assert.equal(exact.status, "ok");
  const keeps = await executePurchaseCheck(request(engine, "home", [homeFields({ currentHousingMonthlyCost: "9000", currentHousingEnds: "no" })]), deps(engine.snapshot));
  assert.equal(keeps.status, "ok");
});

test("FFH-P10 the baseline uses the P09 monthly equivalent of a yearly bill once", async () => {
  const source = raw();
  // A yearly $1,200 housing bill is stored by P09 as a $100/month planning amount (monthly_amount).
  source.expenses!.push({ id: "yearly", name: "Yearly HOA", category: "housing", monthly_amount: 100, is_essential: true, cash_flow_treatment: "required" });
  const engine = baseline(source);
  assert.equal(purchaseCheckBootstrap(engine).recordedHousingMonthly, 2100);
  const result = await executePurchaseCheck(request(engine, "home", [homeFields({ currentHousingMonthlyCost: "2100" })]), deps(engine.snapshot));
  assert.equal(result.status, "ok");
  const direct = evaluateHomeAffordability(engine, parsedHome(engine, homeFields({ currentHousingMonthlyCost: "2100" })).scenario);
  assert.deepEqual(result.options[0].canonical, direct);
});

// ---- advisory thresholds at exact boundaries --------------------------------------------------------------------------

function homeResultWith(engine: MoneyPriorityEngineResult, principalAndInterest: number, taxesEtc: number): { scenario: ParsedHomeOption["scenario"]; result: HomeAffordabilityResult } {
  const option = parsedHome(engine);
  const result = structuredClone(evaluateHomeAffordability(engine, option.scenario));
  result.monthly.principalAndInterest = principalAndInterest;
  result.monthly.taxesInsuranceHoaAndMortgageInsurance = taxesEtc;
  return { scenario: option.scenario, result };
}

test("FFH-P10 housing 28%: exactly 28% meets; one cent more exceeds", () => {
  const engine = baseline(); // gross $15,000/month -> 28% = $4,200.00
  const at = homeResultWith(engine, 4000, 200);
  assert.equal(check(homeGuidance({ baseline: engine, postEngine: null, ...at }), "housing_28").status, "meets");
  const over = homeResultWith(engine, 4000, 200.01);
  const item = check(homeGuidance({ baseline: engine, postEngine: null, ...over }), "housing_28");
  assert.equal(item.status, "exceeds");
  assert.match(item.actual!, /\$4,200\.01 of \$15,000\.00/);
  assert.equal(item.source.kind, "lender_guideline");
  assert.match(item.source.url, /^https:\/\//);
});

test("FFH-P10 debt 36%: housing plus recorded minimum debt payments, exact boundary", () => {
  const engine = baseline(); // 36% of $15,000 = $5,400; recorded minimums $100
  assert.equal(check(homeGuidance({ baseline: engine, postEngine: null, ...homeResultWith(engine, 5000, 300) }), "debt_36").status, "meets");
  assert.equal(check(homeGuidance({ baseline: engine, postEngine: null, ...homeResultWith(engine, 5000, 300.01) }), "debt_36").status, "exceeds");
});

test("FFH-P10 incomplete gross income makes every income ratio insufficient (never a PASS)", async () => {
  const source = raw();
  source.income!.push({ id: "side", owner_person_id: "p", name: "Side", income_type: "self_employment", monthly_amount: 500, monthly_gross_amount: null, is_variable: true, is_active: true });
  const engine = baseline(source);
  const home = await executePurchaseCheck(request(engine, "home", [homeFields()]), deps(engine.snapshot));
  assert.equal(check(home.options[0].guidance, "housing_28").status, "insufficient_information");
  assert.equal(check(home.options[0].guidance, "debt_36").status, "insufficient_information");
  const vehicle = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields()]), deps(engine.snapshot));
  assert.equal(check(vehicle.options[0].guidance, "vehicle_payments_8").status, "insufficient_information");
  assert.equal(check(vehicle.options[0].guidance, "vehicle_value_50").status, "insufficient_information");
});

function vehicleCase(engine: MoneyPriorityEngineResult, fields: Record<string, string>, payment?: number) {
  const option = parsedVehicle(engine, fields);
  const result: VehicleAffordabilityResult = structuredClone(evaluateVehicleAffordability(engine, option.scenario));
  if (payment !== undefined) result.acquisition.monthlyPayment = payment;
  return vehicleGuidance({ baseline: engine, postEngine: null, scenario: option.scenario, result, otherVehiclesValue: option.otherVehiclesValue });
}

test("FFH-P10 20/3/8: 20% down exact boundary, 36-month term, and paid-in-full", () => {
  const engine = baseline();
  const base = { tradeInValue: "0", salesTax: "0", titleRegistrationFees: "0", otherPurchaseFees: "0", loanTermMonths: "36" };
  assert.equal(check(vehicleCase(engine, vehicleFields({ ...base, cashDownPayment: "6000" })), "vehicle_down_20").status, "meets");
  assert.equal(check(vehicleCase(engine, vehicleFields({ ...base, cashDownPayment: "5999.99" })), "vehicle_down_20").status, "exceeds");
  assert.equal(check(vehicleCase(engine, vehicleFields({ ...base, cashDownPayment: "6000" })), "vehicle_term_36").status, "meets");
  assert.equal(check(vehicleCase(engine, vehicleFields({ ...base, cashDownPayment: "6000", loanTermMonths: "37" })), "vehicle_term_36").status, "exceeds");
  const cash = vehicleCase(engine, vehicleFields({ ...base, cashDownPayment: "30000", loanApr: "", loanTermMonths: "" }));
  assert.equal(check(cash, "vehicle_down_20").status, "meets");
  assert.equal(check(cash, "vehicle_term_36").status, "not_applicable");
});

test("FFH-P10 20/3/8: all car payments combined vs 8% of gross, exact boundary; trade payoff ambiguity is insufficient", () => {
  const source = raw();
  // The database stores vehicle loans as `auto_loan` (debts.debt_type CHECK).
  source.debts!.push({ id: "car-loan", name: "Car loan", debt_type: "auto_loan", current_balance: 8000, interest_rate: 4, minimum_payment: 200 });
  assert.equal(purchaseCheckBootstrap(baseline(source)).recordedVehicleLoanPaymentsMonthly, 200);
  const engine = baseline(source); // 8% of $15,000 = $1,200; existing car loan $200
  assert.equal(check(vehicleCase(engine, vehicleFields(), 1000), "vehicle_payments_8").status, "meets");
  assert.equal(check(vehicleCase(engine, vehicleFields(), 1000.01), "vehicle_payments_8").status, "exceeds");
  const ambiguous = check(vehicleCase(engine, vehicleFields({ tradeInLoanPayoff: "3000" })), "vehicle_payments_8");
  assert.equal(ambiguous.status, "insufficient_information");
  assert.equal(ambiguous.actual, null);
});

test("FFH-P10 total vehicle value vs half of gross yearly income, exact boundary; unknown other vehicles is insufficient", () => {
  const engine = baseline(); // annual $180,000 -> 50% = $90,000; price $30,000
  assert.equal(check(vehicleCase(engine, vehicleFields({ otherVehiclesValue: "60000" })), "vehicle_value_50").status, "meets");
  assert.equal(check(vehicleCase(engine, vehicleFields({ otherVehiclesValue: "60000.01" })), "vehicle_value_50").status, "exceeds");
  const unknown = check(vehicleCase(engine, vehicleFields({ otherVehiclesValue: "" })), "vehicle_value_50");
  assert.equal(unknown.status, "insufficient_information");
  assert.ok(unknown.missing.some((item) => item.includes("enter 0 if none")));
  assert.equal(check(vehicleCase(engine, vehicleFields({ otherVehiclesValue: "0" })), "vehicle_value_50").status, "meets");
});

test("FFH-P10 emergency reserve counts only protected reserve cash, never earmarked, debt-backed or unassigned cash", async () => {
  const engine = baseline();
  const result = await executePurchaseCheck(request(engine, "vehicle", [vehicleFields()]), deps(engine.snapshot));
  const item = check(result.options[0].guidance, "emergency_reserve");
  // Protected reserve $12,000 against post-purchase essentials + minimum debt payments.
  assert.match(item.actual!, /\$12,000\.00 against/);
  const richer = raw();
  richer.accounts!.push({ id: "goal-cash", name: "Trip", account_type: "savings", balance: 500000, cash_purpose: "earmarked_goal", related_goal_id: "house-goal" });
  richer.accounts!.push({ id: "debt-cash", name: "Held", account_type: "savings", balance: 500000, cash_purpose: "debt_backed_reserve" });
  const richerEngine = baseline(richer);
  const richerResult = await executePurchaseCheck(request(richerEngine, "vehicle", [vehicleFields()]), deps(richerEngine.snapshot));
  const richerItem = check(richerResult.options[0].guidance, "emergency_reserve");
  assert.match(richerItem.actual!, /\$12,000\.00 against/);
  assert.equal(richerItem.status, item.status);
});

test("FFH-P10 emergency reserve: protected cash needed for the purchase is flagged; an evaluation without a post-purchase plan is insufficient", async () => {
  const source = raw();
  source.accounts = source.accounts!.filter((account) => account.id !== "cash");
  const engine = baseline(source);
  const result = await executePurchaseCheck(request(engine, "home", [homeFields({ relatedGoalId: "" })]), deps(engine.snapshot));
  const option = result.options[0] as Extract<PurchaseOptionResult, { kind: "home" }>;
  assert.ok(option.canonical.cashToClose.protectedCashRequired > 0);
  assert.equal(option.canonical.overallAffordability, "not_recommended");
  assert.equal(check(option.guidance, "emergency_reserve").status, "exceeds");
});

test("FFH-P10 a guideline PASS never upgrades a canonical not-recommended verdict", async () => {
  const source = raw();
  source.accounts = source.accounts!.filter((account) => account.id !== "cash");
  const engine = baseline(source);
  const result = await executePurchaseCheck(request(engine, "home", [homeFields({ relatedGoalId: "", purchasePrice: "200000", downPayment: "40000" })]), deps(engine.snapshot));
  const option = result.options[0] as Extract<PurchaseOptionResult, { kind: "home" }>;
  assert.equal(check(option.guidance, "housing_28").status, "meets");
  assert.equal(option.canonical.overallAffordability, evaluateHomeAffordability(engine, parsedHome(engine, homeFields({ relatedGoalId: "", purchasePrice: "200000", downPayment: "40000" })).scenario).overallAffordability);
  assert.equal(option.canonical.overallAffordability, "not_recommended");
});

test("FFH-P10 goal effects use names only and mark the goal used for the purchase", async () => {
  const engine = baseline();
  const result = await executePurchaseCheck(request(engine, "home", [homeFields()]), deps(engine.snapshot));
  const used = result.options[0].goalEffects.find((item) => item.usedForPurchase);
  assert.equal(used?.name, "House");
  assert.ok(!JSON.stringify(result.options[0].goalEffects).includes("house-goal"));
});

test("FFH-P10 invalid saved numbers return a structured invalid answer instead of throwing; other errors still fail closed", async () => {
  const engine = baseline();
  const { MoneyPrioritySnapshotValidationError } = await import("./money-priority-snapshot.ts");
  const invalid = await executePurchaseCheck(request(engine, "home", [homeFields()]), {
    resolveAuthority: async () => ({ authenticated: true, householdId: "server-household" }),
    loadSnapshot: async () => { throw new MoneyPrioritySnapshotValidationError([]); },
    asOfDate: () => AS_OF,
  });
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.baselineFingerprint, null);
  assert.deepEqual(invalid.options, []);
  await assert.rejects(executePurchaseCheck(request(engine, "home", [homeFields()]), {
    resolveAuthority: async () => ({ authenticated: true, householdId: "server-household" }),
    loadSnapshot: async () => { throw new Error("database unavailable"); },
    asOfDate: () => AS_OF,
  }));
});
