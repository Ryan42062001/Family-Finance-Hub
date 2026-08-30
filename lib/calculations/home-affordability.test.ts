import test from "node:test";
import assert from "node:assert/strict";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import {
  compareHomePurchaseScenarios,
  evaluateHomeAffordability,
  type HomePurchaseScenario,
  type HomeSaleProceedsState,
} from "./home-affordability.ts";

const AS_OF = "2026-08-30";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "home-household",
    people: [{ id: "person-1", display_name: "Alex", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 65, is_active: true, is_dependent: false }],
    income: [{ id: "income-1", owner_person_id: "person-1", name: "Salary", monthly_amount: 12000, monthly_gross_amount: 15000, is_variable: false, is_active: true }],
    expenses: [
      { id: "housing", name: "Current rent", category: "housing", monthly_amount: 2000, is_essential: true },
      { id: "essentials", name: "Other essentials", category: "other", monthly_amount: 2000, is_essential: true },
      { id: "lifestyle", name: "Lifestyle", category: "other", monthly_amount: 1000, is_essential: false },
    ],
    accounts: [
      { id: "reserve", name: "Emergency fund", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
      { id: "cash", name: "Unallocated cash", account_type: "savings", balance: 100000, cash_purpose: "unallocated" },
    ],
    retirementAccounts: [{
      id: "retirement-1", owner_person_id: "person-1", name: "401(k)", account_type: "401k", balance: 300000,
      monthly_employee_contribution: 1500, monthly_employer_contribution: 300,
      full_match_employee_contribution_monthly: 1000, match_status: "fully_captured",
    }],
    insuranceExposures: [{ id: "insurance-1", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", risk_tolerance: "moderate",
      retirement_priority: "normal", job_replacement_difficulty: "easy", known_income_disruption: false,
      desired_retirement_monthly_spending: null, retirement_spending_basis: "unknown",
    },
  };
}

function scenario(overrides: Partial<HomePurchaseScenario> = {}): HomePurchaseScenario {
  const base: HomePurchaseScenario = {
    purchasePrice: 300000,
    downPayment: 60000,
    mortgage: {
      rateType: "fixed",
      interestRate: 4,
      termYears: 30,
      arm: null,
      hasBalloonPayment: false,
      allowsNegativeAmortization: false,
    },
    closing: {
      closingCosts: 8000,
      prepaidCosts: 2000,
      initialEscrowDeposit: 2000,
      earnestMoneyAlreadyPaid: 5000,
      sellerCredits: 0,
      lenderCredits: 0,
      otherCredits: 0,
    },
    propertyTaxesAnnual: 6000,
    insurance: {
      homeownersAnnual: 1800,
      floodAnnual: 0,
      otherRequiredAnnual: 0,
    },
    hoaMonthly: 0,
    mortgageInsurance: { type: "none", monthlyAmount: 0 },
    monthlyMaintenancePlanningAmount: 300,
    monthlyUtilityChange: 100,
    otherMonthlyPropertyCosts: 0,
    immediateRequiredRepairs: 0,
    plannedNearTermRepairs: 0,
    currentHousingMonthlyCost: 2000,
    currentHousingCostDisappears: true,
    relatedGoalId: null,
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

function engine(raw = baseRaw()) {
  return runMoneyPriorityEngine(raw, AS_OF);
}

function sale(proceedsState: HomeSaleProceedsState, overrides: Partial<NonNullable<HomePurchaseScenario["homeSale"]>> = {}): NonNullable<HomePurchaseScenario["homeSale"]> {
  return {
    proceedsState,
    expectedNetSaleProceeds: 80000,
    proceedsAlreadyIncludedInSnapshotCash: false,
    currentHomeMonthlyCarryingCost: 2000,
    expectedHousingOverlapMonths: 0,
    ...overrides,
  };
}

test("strong cash-to-close scenario preserves reserves", () => {
  const result = evaluateHomeAffordability(engine(), scenario());
  assert.equal(result.cashToClose.protectedCashRequired, 0);
  assert.notEqual(result.purchaseReadiness, "not_recommended");
});

test("technical closing cash that would consume emergency reserves is rejected", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Emergency fund", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 60000, cash_purpose: "unallocated" },
  ];
  const result = evaluateHomeAffordability(engine(raw), scenario());
  assert.ok(result.cashToClose.protectedCashRequired > 0);
  assert.equal(result.purchaseReadiness, "not_recommended");
});

test("unrelated earmarked cash is not purchase cash", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 60000, cash_purpose: "unallocated" },
    { id: "college", name: "College", account_type: "savings", balance: 50000, cash_purpose: "earmarked_goal", related_goal_id: "college-goal" },
  ];
  const result = evaluateHomeAffordability(engine(raw), scenario());
  assert.equal(result.cashToClose.relatedGoalEarmarkedCash, 0);
  assert.equal(result.purchaseReadiness, "not_recommended");
});

test("related home goal cash is available exactly once", () => {
  const raw = baseRaw();
  raw.accounts = [...(raw.accounts ?? []), {
    id: "house-fund", name: "House fund", account_type: "savings", balance: 30000,
    cash_purpose: "earmarked_goal", related_goal_id: "house-goal",
  }];
  raw.goals = [{
    id: "house-goal", name: "House down payment", target_amount: 30000, current_amount: 30000,
    target_date: "2026-09-30", priority: 1, goal_class: "major_life_goal",
    necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
  }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ relatedGoalId: "house-goal" }));
  assert.equal(result.cashToClose.relatedGoalEarmarkedCash, 30000);
  assert.equal(result.cashToClose.legitimateCashAvailable, 128000);
});

test("related home goal is not falsely treated as broken", () => {
  const raw = baseRaw();
  raw.goals = [{
    id: "house-goal", name: "House", target_amount: 10000, current_amount: 0,
    target_date: "2026-09-30", priority: 1, goal_class: "necessary_protective",
    necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
  }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ relatedGoalId: "house-goal" }));
  assert.equal(result.planImpact.requiredGoalsPreserved, true);
});

test("immediate required repair can make purchase unsafe", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ immediateRequiredRepairs: 40000 }));
  assert.equal(result.purchaseReadiness, "not_recommended");
  assert.ok(result.cashToClose.totalAcquisitionCashCommitted > 100000);
});

test("fixed mortgage amortization is calculated", () => {
  const result = evaluateHomeAffordability(engine(), scenario());
  assert.equal(result.mortgage.loanAmount, 240000);
  assert.ok(Math.abs(result.mortgage.initialPrincipalAndInterest - 1145.8) < 0.1);
  assert.ok(result.mortgage.totalInterest > 170000);
});

test("zero-percent mortgage divides principal by term", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    purchasePrice: 180000, downPayment: 60000,
    mortgage: { ...scenario().mortgage, interestRate: 0 },
  }));
  assert.equal(result.mortgage.initialPrincipalAndInterest, 333.33);
  assert.equal(result.mortgage.totalInterest, 0);
});

test("all-in housing cost is visibly greater than principal and interest", () => {
  const result = evaluateHomeAffordability(engine(), scenario());
  assert.ok(result.monthly.allInHousingCost > result.monthly.principalAndInterest);
  assert.ok(result.monthly.taxesInsuranceHoaAndMortgageInsurance > 0);
});

test("current rent that disappears reduces incremental impact", () => {
  const result = evaluateHomeAffordability(engine(), scenario());
  assert.ok(Math.abs(result.monthly.incrementalHousingImpact - (result.monthly.allInHousingCost - 2000)) < 0.01);
});

test("current housing cost is not subtracted when it remains", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ currentHousingCostDisappears: false }));
  assert.equal(result.monthly.incrementalHousingImpact, result.monthly.allInHousingCost);
});

test("conventional PMI is included in monthly cost", () => {
  const without = evaluateHomeAffordability(engine(), scenario());
  const withPmi = evaluateHomeAffordability(engine(), scenario({
    mortgageInsurance: { type: "conventional_pmi", monthlyAmount: 180 },
  }));
  assert.equal(withPmi.monthly.allInHousingCost - without.monthly.allInHousingCost, 180);
});

test("smaller down payment with PMI can preserve healthier liquidity", () => {
  const plan = engine();
  const large = evaluateHomeAffordability(plan, scenario({ downPayment: 95000 }));
  const small = evaluateHomeAffordability(plan, scenario({
    downPayment: 30000,
    mortgageInsurance: { type: "conventional_pmi", monthlyAmount: 220 },
  }));
  assert.ok(small.cashToClose.postClosingAvailableLiquidity > large.cashToClose.postClosingAvailableLiquidity);
  assert.notEqual(small.purchaseReadiness, "not_recommended");
});

test("missing PMI amount produces missing-data result", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    mortgageInsurance: { type: "conventional_pmi", monthlyAmount: null },
  }));
  assert.equal(result.financing.quality, "more_information_needed");
  assert.equal(result.overallAffordability, "more_information_needed");
});

test("ARM initial payment can fit while contractual stress payment fails", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Emergency fund", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Unallocated cash", account_type: "savings", balance: 200000, cash_purpose: "unallocated" },
  ];
  const result = evaluateHomeAffordability(engine(raw), scenario({
    purchasePrice: 1200000,
    downPayment: 100000,
    mortgage: {
      rateType: "adjustable", interestRate: 3, termYears: 30,
      arm: { initialFixedMonths: 60, adjustmentFrequencyMonths: 12, initialAdjustmentCap: 2, subsequentAdjustmentCap: 2, lifetimeAdjustmentCap: 7 },
      hasBalloonPayment: false, allowsNegativeAmortization: false,
    },
  }));
  assert.ok((result.monthly.stressedAllInHousingCost ?? 0) > result.monthly.allInHousingCost);
  assert.equal(result.financing.quality, "not_recommended");
  assert.equal(result.ongoingAffordability, "not_recommended");
});

test("ARM missing cap information needs more information", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    mortgage: { ...scenario().mortgage, rateType: "adjustable", arm: null },
  }));
  assert.ok(result.missingData.includes("mortgage.arm"));
  assert.equal(result.financing.quality, "more_information_needed");
});

test("negative-amortization mortgage financing is not recommended", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    mortgage: { ...scenario().mortgage, allowsNegativeAmortization: true },
  }));
  assert.equal(result.financing.quality, "not_recommended");
  assert.equal(result.overallAffordability, "not_recommended");
});

test("balloon-payment mortgage financing is not recommended", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    mortgage: { ...scenario().mortgage, hasBalloonPayment: true },
  }));
  assert.equal(result.financing.quality, "not_recommended");
});

test("already received home-sale proceeds are available", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ homeSale: sale("already_received") }));
  assert.equal(result.cashToClose.availableSaleProceeds, 80000);
});

test("sale proceeds closing before purchase are available", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ homeSale: sale("closing_before_purchase") }));
  assert.equal(result.cashToClose.availableSaleProceeds, 80000);
});

test("simultaneous closing exposes dependency", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ homeSale: sale("simultaneous_closing") }));
  assert.equal(result.cashToClose.dependsOnSimultaneousClosing, true);
  assert.equal(result.purchaseReadiness, "stretch");
});

test("sale proceeds expected after purchase cannot fund current closing", () => {
  const raw = baseRaw();
  raw.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ homeSale: sale("expected_after_purchase") }));
  assert.equal(result.cashToClose.availableSaleProceeds, 0);
  assert.equal(result.cashToClose.unavailableSaleProceeds, 80000);
  assert.equal(result.purchaseReadiness, "not_recommended");
});

test("uncertain sale proceeds cannot fund current closing", () => {
  const raw = baseRaw();
  raw.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ homeSale: sale("uncertain") }));
  assert.equal(result.cashToClose.availableSaleProceeds, 0);
  assert.equal(result.purchaseReadiness, "not_recommended");
});

test("temporary double-housing overlap can be affordable", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    homeSale: sale("closing_before_purchase", { expectedHousingOverlapMonths: 2 }),
  }));
  assert.equal(result.overlap.overlapAffordable, true);
});

test("temporary overlap can make transition unsafe", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 75000, cash_purpose: "unallocated" },
  ];
  const result = evaluateHomeAffordability(engine(raw), scenario({
    purchasePrice: 1500000, downPayment: 60000,
    homeSale: sale("expected_after_purchase", { expectedHousingOverlapMonths: 8, expectedNetSaleProceeds: 0 }),
  }));
  assert.equal(result.overlap.overlapAffordable, false);
  assert.equal(result.purchaseReadiness, "not_recommended");
});

test("required unrelated goal becoming infeasible fails ongoing affordability", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Emergency fund", account_type: "savings", balance: 12000, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Unallocated cash", account_type: "savings", balance: 70000, cash_purpose: "unallocated" },
  ];
  raw.goals = [{
    id: "required-goal", name: "Required care", target_amount: 72000, current_amount: 0,
    target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective",
    necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
  }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ purchasePrice: 750000, downPayment: 60000 }));
  assert.equal(result.planImpact.requiredGoalsPreserved, false);
  assert.equal(result.ongoingAffordability, "not_recommended");
});

test("employer match remains preserved in affordable scenario", () => {
  const result = evaluateHomeAffordability(engine(), scenario());
  assert.equal(result.planImpact.employerMatchPreserved, true);
});

test("employer match becoming unfunded fails ongoing affordability", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "retirement-1", owner_person_id: "person-1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 5000, match_status: "not_fully_captured",
  }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ purchasePrice: 900000, downPayment: 60000 }));
  assert.equal(result.planImpact.employerMatchPreserved, false);
  assert.equal(result.ongoingAffordability, "not_recommended");
});

test("retirement remains intact for modest home", () => {
  const result = evaluateHomeAffordability(engine(), scenario());
  assert.equal(result.planImpact.retirementMateriallyWorsened, false);
});

test("purchase can materially displace retirement funding", () => {
  const raw = baseRaw();
  raw.retirementAccounts = [{
    id: "retirement-1", owner_person_id: "person-1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 0, monthly_employer_contribution: 0,
    full_match_employee_contribution_monthly: 0, match_status: "fully_captured",
  }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ purchasePrice: 1500000, downPayment: 60000 }));
  assert.ok(result.planImpact.retirementMonthlyAllocationDisplaced > 0);
  assert.notEqual(result.overallAffordability, "comfortably_affordable");
});

test("high DTI remains diagnostic rather than automatic failure", () => {
  const raw = baseRaw();
  raw.income = [{ id: "income-1", owner_person_id: "person-1", name: "Income", monthly_amount: 12000, monthly_gross_amount: 6000, is_active: true }];
  const result = evaluateHomeAffordability(engine(raw), scenario());
  assert.ok((result.dti.housingDti ?? 0) > 0.35);
  assert.notEqual(result.ongoingAffordability, "not_recommended");
});

test("acceptable DTI does not override an unsafe actual plan", () => {
  const raw = baseRaw();
  raw.income = [{ id: "income-1", owner_person_id: "person-1", name: "Income", monthly_amount: 6000, monthly_gross_amount: 20000, is_active: true }];
  const result = evaluateHomeAffordability(engine(raw), scenario({ immediateRequiredRepairs: 50000 }));
  assert.ok((result.dti.housingDti ?? 1) < 0.2);
  assert.equal(result.purchaseReadiness, "not_recommended");
});

test("missing maintenance is explicitly disclosed for strong capacity", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ monthlyMaintenancePlanningAmount: null }));
  assert.ok(result.warnings.some((warning) => warning.includes("Maintenance")));
});

test("missing maintenance makes a borderline scenario indeterminate", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    purchasePrice: 1600000, downPayment: 60000, monthlyMaintenancePlanningAmount: null,
  }));
  assert.ok(result.missingData.includes("monthlyMaintenancePlanningAmount"));
  assert.equal(result.overallAffordability, "more_information_needed");
});

test("negative incremental utility change is supported", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ monthlyUtilityChange: -150 }));
  assert.equal(result.monthly.maintenanceAndOtherPropertyCosts, 150);
});

test("identical input produces deterministic result", () => {
  const plan = engine();
  assert.deepEqual(evaluateHomeAffordability(plan, scenario()), evaluateHomeAffordability(plan, scenario()));
});

test("source snapshot and engine result remain unchanged", () => {
  const plan = engine();
  const before = structuredClone(plan);
  evaluateHomeAffordability(plan, scenario());
  assert.deepEqual(plan, before);
});

test("residual-needs deployments cannot be reused as closing cash", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 80000, cash_purpose: "unallocated" },
  ];
  const plan = engine(raw);
  const result = evaluateHomeAffordability(plan, scenario());
  assert.ok(result.cashToClose.higherPriorityOneTimeDeployments > 0);
  assert.ok(result.cashToClose.legitimateCashAvailable < plan.existingCash.availableUnallocatedCash);
});

test("home evaluation preserves cross-stage monthly capacity invariant", () => {
  const plan = engine();
  const before = plan.recommendations.flatMap((item) => item.allocations)
    .reduce((sum, allocation) => sum + allocation.monthlyAmount, 0);
  evaluateHomeAffordability(plan, scenario());
  const after = plan.recommendations.flatMap((item) => item.allocations)
    .reduce((sum, allocation) => sum + allocation.monthlyAmount, 0);
  assert.equal(after, before);
  assert.ok(after <= Math.max(0, plan.snapshot.aggregates.monthlyCashFlowBeforeSavings));
});

test("down-payment comparison is deterministic", () => {
  const plan = engine();
  const candidates = [
    scenario({ downPayment: 60000 }),
    scenario({ downPayment: 30000, mortgageInsurance: { type: "conventional_pmi", monthlyAmount: 220 } }),
    scenario({ downPayment: 90000 }),
  ];
  const first = compareHomePurchaseScenarios(plan, candidates);
  const second = compareHomePurchaseScenarios(plan, candidates);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
});

test("credits and earnest money reduce cash still required", () => {
  const baseline = evaluateHomeAffordability(engine(), scenario());
  const credited = evaluateHomeAffordability(engine(), scenario({
    closing: {
      ...scenario().closing,
      earnestMoneyAlreadyPaid: 10000,
      sellerCredits: 3000,
      lenderCredits: 2000,
      otherCredits: 1000,
    },
  }));
  assert.equal(baseline.cashToClose.cashStillRequiredAtClosing - credited.cashToClose.cashStillRequiredAtClosing, 11000);
});

test("planned optional repairs are disclosed but not treated as immediate", () => {
  const result = evaluateHomeAffordability(engine(), scenario({ plannedNearTermRepairs: 15000 }));
  assert.equal(result.cashToClose.totalAcquisitionCashCommitted, 72000);
  assert.ok(result.risks.some((risk) => risk.includes("planned near-term repairs")));
});

test("sale proceeds already represented in snapshot are not added twice", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    homeSale: sale("already_received", { proceedsAlreadyIncludedInSnapshotCash: true }),
  }));
  assert.equal(result.cashToClose.availableSaleProceeds, 0);
});

test("financing quality remains separate from household affordability", () => {
  const result = evaluateHomeAffordability(engine(), scenario({
    purchasePrice: 900000, downPayment: 180000,
    mortgage: { ...scenario().mortgage, interestRate: 3 },
  }));
  assert.equal(result.financing.quality, "preferred");
  assert.notEqual(result.overallAffordability, "comfortably_affordable");
});
