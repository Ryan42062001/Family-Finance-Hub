import test from "node:test";
import assert from "node:assert/strict";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import {
  compareVehiclePurchaseScenarios,
  evaluateVehicleAffordability,
  type VehiclePurchaseScenario,
} from "./vehicle-affordability.ts";

const AS_OF = "2026-08-30";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "vehicle-household",
    people: [{ id: "person-1", display_name: "Alex", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 65, is_active: true, is_dependent: false }],
    income: [{ id: "income-1", owner_person_id: "person-1", name: "Salary", monthly_amount: 8000, monthly_gross_amount: 10000, is_variable: false, is_active: true }],
    expenses: [
      { id: "expense-1", name: "Essentials", category: "housing", monthly_amount: 3000, is_essential: true },
      { id: "expense-2", name: "Lifestyle", category: "other", monthly_amount: 1000, is_essential: false },
    ],
    accounts: [
      { id: "reserve", name: "Emergency fund", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" },
      { id: "cash", name: "Unallocated cash", account_type: "savings", balance: 30000, cash_purpose: "unallocated" },
    ],
    retirementAccounts: [{
      id: "retirement-1", owner_person_id: "person-1", name: "401(k)", account_type: "401k", balance: 250000,
      monthly_employee_contribution: 1200, monthly_employer_contribution: 300,
      full_match_employee_contribution_monthly: 600, match_status: "fully_captured",
    }],
    insuranceExposures: [{ id: "insurance-1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", risk_tolerance: "moderate",
      retirement_priority: "normal", job_replacement_difficulty: "easy", known_income_disruption: false,
      desired_retirement_monthly_spending: null, retirement_spending_basis: "unknown",
    },
  };
}

function scenario(overrides: Partial<VehiclePurchaseScenario> = {}): VehiclePurchaseScenario {
  return {
    needType: "planned_replacement",
    purchasePrice: 20000,
    tradeInValue: 0,
    tradeInLoanPayoff: 0,
    cashDownPayment: 5000,
    salesTax: 1200,
    titleRegistrationFees: 300,
    otherPurchaseFees: 0,
    loanApr: 3,
    loanTermMonths: 48,
    monthlyInsuranceChange: 50,
    monthlyFuelChange: -20,
    monthlyMaintenanceChange: 20,
    monthlyRegistrationTaxChange: 10,
    monthlyParkingTollsChange: 0,
    ...overrides,
  };
}

function engine(raw = baseRaw()) {
  return runMoneyPriorityEngine(raw, AS_OF);
}

test("cash purchase preserves protected liquidity", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({
    purchasePrice: 10000, cashDownPayment: 10000, salesTax: 0, titleRegistrationFees: 0,
    loanApr: null, loanTermMonths: null,
  }));
  assert.equal(result.cash.protectedCashRequired, 0);
  assert.equal(result.financing.quality, "not_applicable");
  assert.notEqual(result.affordability, "not_recommended");
});

test("cash purchase consuming protected cash is not recommended", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({
    purchasePrice: 35000, cashDownPayment: 35000, salesTax: 0, titleRegistrationFees: 0,
    loanApr: null, loanTermMonths: null,
  }));
  assert.ok(result.cash.protectedCashRequired > 0);
  assert.equal(result.affordability, "not_recommended");
});

test("affordable financing retains positive post-purchase capacity", () => {
  const result = evaluateVehicleAffordability(engine(), scenario());
  assert.ok(result.monthlyImpact.postPurchaseCashFlow > 0);
  assert.ok(["comfortably_affordable", "affordable"].includes(result.affordability));
});

test("all-in ownership costs can fail even when loan payment fits", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ monthlyInsuranceChange: 4500 }));
  assert.ok(result.monthlyImpact.loanPayment < 1000);
  assert.ok(result.monthlyImpact.postPurchaseCashFlow < 0);
  assert.equal(result.affordability, "not_recommended");
});

test("zero-percent financing uses principal divided by term", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ loanApr: 0, purchasePrice: 12000, cashDownPayment: 0, salesTax: 0, titleRegistrationFees: 0 }));
  assert.equal(result.acquisition.monthlyPayment, 250);
  assert.equal(result.acquisition.totalInterest, 0);
});

test("high APR conflicts with Secure debt policy", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ loanApr: 12 }));
  assert.equal(result.financing.quality, "not_recommended");
  assert.equal(result.affordability, "not_recommended");
});

test("long low-APR term produces caution without automatic failure", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ loanApr: 2, loanTermMonths: 84 }));
  assert.equal(result.financing.termSignal, "strong_caution");
  assert.equal(result.financing.quality, "caution");
  assert.notEqual(result.affordability, "not_recommended");
});

test("optional upgrade with negative trade equity is not recommended", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({
    needType: "optional_upgrade", tradeInValue: 5000, tradeInLoanPayoff: 9000,
  }));
  assert.equal(result.acquisition.negativeEquityRolledIn, 4000);
  assert.equal(result.affordability, "not_recommended");
});

test("necessary replacement with negative equity remains possible but is not comfortable", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({
    needType: "necessary", tradeInValue: 5000, tradeInLoanPayoff: 9000,
  }));
  assert.equal(result.acquisition.negativeEquityRolledIn, 4000);
  assert.equal(result.affordability, "stretch");
});

test("LTV above 100 percent is exposed", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ cashDownPayment: 0, salesTax: 3000 }));
  assert.ok((result.acquisition.loanToValue ?? 0) > 1);
  assert.equal(result.financing.equitySignal, "underwater");
});

test("positive trade equity reduces net acquisition cost", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ tradeInValue: 8000, tradeInLoanPayoff: 2000 }));
  assert.equal(result.acquisition.tradeEquity, 6000);
  assert.equal(result.acquisition.netAcquisitionCost, 15500);
});

test("required unrelated goal becoming infeasible fails affordability", () => {
  const raw = baseRaw();
  raw.goals = [{
    id: "required-goal", name: "Required repair", target_amount: 36000, current_amount: 0,
    target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective",
    necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
  }];
  const result = evaluateVehicleAffordability(engine(raw), scenario({
    purchasePrice: 50000, cashDownPayment: 0, monthlyInsuranceChange: 800,
  }));
  assert.equal(result.planImpact.requiredGoalsPreserved, false);
  assert.equal(result.affordability, "not_recommended");
});

test("related vehicle goal is recognized and excluded from broken goals", () => {
  const raw = baseRaw();
  raw.accounts = [...(raw.accounts ?? []), {
    id: "vehicle-cash", name: "Vehicle fund", account_type: "savings", balance: 10000,
    cash_purpose: "earmarked_goal", related_goal_id: "vehicle-goal",
  }];
  raw.goals = [{
    id: "vehicle-goal", name: "Replace vehicle", target_amount: 10000, current_amount: 10000,
    target_date: "2026-09-30", priority: 1, goal_class: "necessary_protective",
    necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
  }];
  const result = evaluateVehicleAffordability(engine(raw), scenario({
    relatedGoalId: "vehicle-goal", purchasePrice: 10000, cashDownPayment: 10000,
    salesTax: 0, titleRegistrationFees: 0, loanApr: null, loanTermMonths: null,
  }));
  assert.equal(result.cash.relatedGoalEarmarkedCash, 10000);
  assert.equal(result.planImpact.requiredGoalsPreserved, true);
  assert.notEqual(result.affordability, "not_recommended");
});

test("employer match is preserved in a normal scenario", () => {
  const result = evaluateVehicleAffordability(engine(), scenario());
  assert.equal(result.planImpact.employerMatchPreserved, true);
});

test("loss of employer-match capacity is not recommended", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "retirement-1", owner_person_id: "person-1", name: "401(k)", account_type: "401k", balance: 10000,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 1000, match_status: "not_fully_captured",
  }];
  const result = evaluateVehicleAffordability(engine(raw), scenario({
    purchasePrice: 150000, cashDownPayment: 0, salesTax: 0, titleRegistrationFees: 0,
  }));
  assert.equal(result.planImpact.employerMatchPreserved, false);
  assert.equal(result.affordability, "not_recommended");
});

test("on-track retirement stays intact for a modest purchase", () => {
  const result = evaluateVehicleAffordability(engine(), scenario());
  assert.equal(result.planImpact.retirementMateriallyWorsened, false);
});

test("material retirement allocation displacement caps affordability at stretch", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "retirement-1", owner_person_id: "person-1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 0, match_status: "fully_captured",
  }];
  const result = evaluateVehicleAffordability(engine(raw), scenario({
    purchasePrice: 125000, cashDownPayment: 0, salesTax: 0, titleRegistrationFees: 0,
  }));
  assert.ok(result.planImpact.retirementMonthlyAllocationDisplaced > 0);
  assert.equal(result.affordability, "stretch");
});

test("incremental operating costs may be negative", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({
    monthlyInsuranceChange: -50, monthlyFuelChange: -100, monthlyMaintenanceChange: -50,
    monthlyRegistrationTaxChange: 0, monthlyParkingTollsChange: 0,
  }));
  assert.equal(result.monthlyImpact.operatingCostChange, -200);
  assert.ok(result.monthlyImpact.allInMonthlyImpact < result.monthlyImpact.loanPayment);
});

test("missing APR and term when financing returns more information needed", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ loanApr: null, loanTermMonths: null }));
  assert.equal(result.affordability, "more_information_needed");
  assert.equal(result.financing.quality, "more_information_needed");
  assert.ok(result.missingData.includes("loanApr"));
  assert.ok(result.missingData.includes("loanTermMonths"));
});

test("missing material ownership cost is not fabricated", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ monthlyInsuranceChange: null }));
  assert.equal(result.affordability, "more_information_needed");
  assert.ok(result.missingData.includes("monthlyInsuranceChange"));
});

test("identical inputs produce identical results", () => {
  const plan = engine();
  assert.deepEqual(evaluateVehicleAffordability(plan, scenario()), evaluateVehicleAffordability(plan, scenario()));
});

test("source snapshot and engine result remain unchanged", () => {
  const plan = engine();
  const before = structuredClone(plan);
  evaluateVehicleAffordability(plan, scenario());
  assert.deepEqual(plan, before);
});

test("higher-priority one-time deployments cannot be double-counted as vehicle cash", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Emergency fund", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Unallocated cash", account_type: "savings", balance: 12000, cash_purpose: "unallocated" },
  ];
  const plan = engine(raw);
  const result = evaluateVehicleAffordability(plan, scenario({
    purchasePrice: 6000, cashDownPayment: 6000, salesTax: 0, titleRegistrationFees: 0,
    loanApr: null, loanTermMonths: null,
  }));
  assert.ok(result.cash.higherPriorityOneTimeDeployments > 0);
  assert.equal(result.cash.availableVehicleCash, 1500);
  assert.ok(result.cash.cashRequired > result.cash.availableVehicleCash);
  assert.equal(result.affordability, "not_recommended");
});

test("vehicle evaluation preserves the cross-stage monthly capacity invariant", () => {
  const plan = engine();
  const before = plan.recommendations.flatMap((item) => item.allocations)
    .reduce((sum, allocation) => sum + allocation.monthlyAmount, 0);
  evaluateVehicleAffordability(plan, scenario());
  const after = plan.recommendations.flatMap((item) => item.allocations)
    .reduce((sum, allocation) => sum + allocation.monthlyAmount, 0);
  assert.equal(after, before);
  assert.ok(after <= Math.max(0, plan.snapshot.aggregates.monthlyCashFlowBeforeSavings));
});

test("scenario comparison is deterministic and does not blindly prefer lowest payment", () => {
  const plan = engine();
  const cash = scenario({ purchasePrice: 20000, cashDownPayment: 20000, salesTax: 0, titleRegistrationFees: 0, loanApr: null, loanTermMonths: null });
  const financed = scenario({ cashDownPayment: 5000, loanApr: 2, loanTermMonths: 48 });
  const first = compareVehiclePurchaseScenarios(plan, [cash, financed]);
  const second = compareVehiclePurchaseScenarios(plan, [cash, financed]);
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
});

test("explicit core need excess is reported without inventing a core amount", () => {
  const result = evaluateVehicleAffordability(engine(), scenario({ coreNeedAmount: 15000 }));
  assert.ok(result.risks.some((risk) => risk.includes("core transportation need")));
});
