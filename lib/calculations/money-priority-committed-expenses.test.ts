import test from "node:test";
import assert from "node:assert/strict";
import { buildMoneyPrioritySnapshot, MoneyPrioritySnapshotValidationError, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { withConfirmedLegacyGoalFacts } from "./legacy-goal-test-fixtures.ts";
import { evaluateUserPlan, deriveRecommendedPlanAllocations } from "./money-priority-user-plan.ts";
import { evaluateHomeAffordability, type HomePurchaseScenario } from "./home-affordability.ts";
import { evaluateVehicleAffordability, type VehiclePurchaseScenario } from "./vehicle-affordability.ts";

const AS_OF = "2026-08-30";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "committed-expense-household",
    people: [{ id: "p1", display_name: "Alex", relationship: "self", birth_date: "1990-01-01", planned_retirement_age: 65, is_active: true, is_dependent: false }],
    income: [{ id: "income", owner_person_id: "p1", name: "Salary", monthly_amount: 6000, monthly_gross_amount: 7500, is_active: true }],
    expenses: [
      { id: "essential", name: "Housing", category: "housing", monthly_amount: 3000, is_essential: true },
      { id: "lifestyle", name: "Lifestyle", category: "other", monthly_amount: 500, is_essential: false },
    ],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [{
      id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 200000,
      monthly_employee_contribution: 900, monthly_employer_contribution: 225,
      full_match_employee_contribution_monthly: 500, match_status: "fully_captured",
    }],
    goals: [],
    insuranceExposures: [{ id: "insurance", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: { emergency_fund_months_override: 3, debt_vs_investing: "balanced", job_replacement_difficulty: "easy", known_income_disruption: false },
  };
}

function withCommitted(amount = 800): MoneyPriorityRawSnapshot {
  const raw = baseRaw();
  raw.expenses = [...(raw.expenses ?? []), {
    id: "childcare", name: "Required childcare", category: "childcare",
    monthly_amount: amount, is_essential: false, cash_flow_treatment: "required",
  }];
  return raw;
}

function engine(raw = baseRaw()) {
  return runMoneyPriorityEngine(withConfirmedLegacyGoalFacts(raw), AS_OF);
}

function homeScenario(): HomePurchaseScenario {
  return {
    purchasePrice: 250000, downPayment: 50000,
    mortgage: { rateType: "fixed", interestRate: 4, termYears: 30, arm: null, hasBalloonPayment: false, allowsNegativeAmortization: false },
    closing: { closingCosts: 6000, prepaidCosts: 1500, initialEscrowDeposit: 1500, earnestMoneyAlreadyPaid: 3000, sellerCredits: 0, lenderCredits: 0, otherCredits: 0 },
    propertyTaxesAnnual: 4800,
    insurance: { homeownersAnnual: 1500, floodAnnual: 0, otherRequiredAnnual: 0 },
    hoaMonthly: 0,
    mortgageInsurance: { type: "none", monthlyAmount: 0 },
    monthlyMaintenancePlanningAmount: 250, monthlyUtilityChange: 50, otherMonthlyPropertyCosts: 0,
    immediateRequiredRepairs: 0, plannedNearTermRepairs: 0,
    currentHousingMonthlyCost: 1500, currentHousingCostDisappears: true,
    homeSale: null,
  };
}

function vehicleScenario(): VehiclePurchaseScenario {
  return {
    needType: "planned_replacement", purchasePrice: 20000, tradeInValue: 0, tradeInLoanPayoff: 0,
    cashDownPayment: 5000, salesTax: 1200, titleRegistrationFees: 300, otherPurchaseFees: 0,
    loanApr: 3, loanTermMonths: 48, monthlyInsuranceChange: 50, monthlyFuelChange: -20,
    monthlyMaintenanceChange: 20, monthlyRegistrationTaxChange: 10, monthlyParkingTollsChange: 0,
  };
}

test("existing essential-only household preserves prior aggregate behavior", () => {
  const raw = baseRaw();
  raw.expenses = [{ id: "e", name: "Housing", category: "housing", monthly_amount: 3000, is_essential: true }];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.aggregates.monthlyRequiredOutflow, 3000);
  assert.equal(snapshot.aggregates.monthlyCashFlowBeforeSavings, 3000);
});

test("legacy nonessential expense defaults to discretionary", () => {
  const snapshot = buildMoneyPrioritySnapshot(baseRaw());
  assert.equal(snapshot.expenses.find((item) => item.id === "lifestyle")?.cashFlowTreatment, "discretionary");
});

test("legacy essential expense defaults to required", () => {
  const snapshot = buildMoneyPrioritySnapshot(baseRaw());
  assert.equal(snapshot.expenses.find((item) => item.id === "essential")?.cashFlowTreatment, "required");
});

test("required nonessential expense lowers plan capacity", () => {
  assert.equal(engine().feasibility.monthlyPlanCapacity - engine(withCommitted()).feasibility.monthlyPlanCapacity, 800);
});

test("required nonessential expense lowers monthly cash flow", () => {
  assert.equal(
    buildMoneyPrioritySnapshot(baseRaw()).aggregates.monthlyCashFlowBeforeSavings
      - buildMoneyPrioritySnapshot(withCommitted()).aggregates.monthlyCashFlowBeforeSavings,
    800,
  );
});

test("required nonessential expense increases required outflow", () => {
  assert.equal(
    buildMoneyPrioritySnapshot(withCommitted()).aggregates.monthlyRequiredOutflow
      - buildMoneyPrioritySnapshot(baseRaw()).aggregates.monthlyRequiredOutflow,
    800,
  );
});

test("required nonessential expense does not increase essential aggregate", () => {
  assert.equal(buildMoneyPrioritySnapshot(withCommitted()).aggregates.monthlyEssentialExpenses, 3000);
});

test("required nonessential expense does not increase emergency target", () => {
  assert.equal(engine(withCommitted()).secure.fullEmergencyTarget, engine().secure.fullEmergencyTarget);
});

test("required classification alone does not change emergency risk tier behavior", () => {
  const normal = engine();
  const committed = engine(withCommitted());
  assert.equal(normal.secure.fullEmergencyTarget / 3, committed.secure.fullEmergencyTarget / 3);
});

test("essential expense counts once in required outflow", () => {
  const snapshot = buildMoneyPrioritySnapshot(baseRaw());
  assert.equal(snapshot.aggregates.monthlyRequiredOutflow, 3000);
});

test("essential plus explicit required is not double-counted", () => {
  const raw = baseRaw();
  raw.expenses = [{ id: "e", name: "Housing", category: "housing", monthly_amount: 3000, is_essential: true, cash_flow_treatment: "required" }];
  assert.equal(buildMoneyPrioritySnapshot(raw).aggregates.monthlyRequiredOutflow, 3000);
});

test("essential plus discretionary normalizes to required", () => {
  const raw = baseRaw();
  raw.expenses = [{ id: "e", name: "Housing", category: "housing", monthly_amount: 3000, is_essential: true, cash_flow_treatment: "discretionary" }];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.expenses[0]?.cashFlowTreatment, "required");
  assert.equal(snapshot.aggregates.monthlyRequiredOutflow, 3000);
});

test("debt minimum counts exactly once", () => {
  const raw = baseRaw();
  raw.debts = [{ id: "d", name: "Debt", debt_type: "personal", current_balance: 1000, interest_rate: 3, minimum_payment: 200, rate_type: "fixed" }];
  const snapshot = buildMoneyPrioritySnapshot(raw);
  assert.equal(snapshot.aggregates.monthlyMinimumDebtPayments, 200);
  assert.equal(snapshot.aggregates.monthlyRequiredOutflow, 3200);
});

test("discretionary expense is excluded from required outflow", () => {
  const snapshot = buildMoneyPrioritySnapshot(baseRaw());
  assert.equal(snapshot.aggregates.monthlyDiscretionaryExpenses, 500);
  assert.equal(snapshot.aggregates.monthlyRequiredOutflow, 3000);
});

test("multiple required nonessential expenses sum correctly", () => {
  const raw = withCommitted(800);
  raw.expenses = [...(raw.expenses ?? []), { id: "hoa", name: "HOA", category: "housing", monthly_amount: 125, is_essential: false, cash_flow_treatment: "required" }];
  assert.equal(buildMoneyPrioritySnapshot(raw).aggregates.monthlyCommittedNonEssentialExpenses, 925);
});

test("zero-dollar required expense is safe", () => {
  assert.equal(buildMoneyPrioritySnapshot(withCommitted(0)).aggregates.monthlyCommittedNonEssentialExpenses, 0);
});

test("negative raw expense is rejected before it can inflate plan capacity", () => {
  assert.throws(() => buildMoneyPrioritySnapshot(withCommitted(-25)), (error) => error instanceof MoneyPrioritySnapshotValidationError
    && error.issues.some((issue) => issue.path.includes("monthly_amount") && issue.code === "invalid_number"));
});

test("decimal cents arithmetic is stable", () => {
  const raw = withCommitted(123.45);
  raw.expenses = [...(raw.expenses ?? []), { id: "medical", name: "Medical", category: "medical", monthly_amount: 76.55, is_essential: false, cash_flow_treatment: "required" }];
  assert.equal(buildMoneyPrioritySnapshot(raw).aggregates.monthlyCommittedNonEssentialExpenses, 200);
});

test("required expense reduces Secure allocation capacity", () => {
  const rawA = baseRaw();
  rawA.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" }];
  const rawB = structuredClone(rawA);
  rawB.expenses = [...(rawB.expenses ?? []), { id: "c", name: "Commitment", category: "other", monthly_amount: 800, is_essential: false, cash_flow_treatment: "required" }];
  const secureTotal = (raw: MoneyPriorityRawSnapshot) => engine(raw).recommendations.filter((item) => item.stage === "secure").flatMap((item) => item.allocations).reduce((sum, item) => sum + item.monthlyAmount, 0);
  assert.equal(secureTotal(rawA) - secureTotal(rawB), 800);
});

test("required expense reduces Build goal allocation", () => {
  const addGoal = (raw: MoneyPriorityRawSnapshot) => {
    raw.goals = [{ id: "g", name: "Required goal", target_amount: 36000, current_amount: 0, target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective", necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" }];
    return raw;
  };
  const a = engine(addGoal(baseRaw()));
  const b = engine(addGoal(withCommitted(1500)));
  assert.ok((a.build.allocations.find((item) => item.relatedEntityId === "g")?.allocatedMonthlyAmount ?? 0)
    > (b.build.allocations.find((item) => item.relatedEntityId === "g")?.allocatedMonthlyAmount ?? 0));
});

test("required expense reduces Optimize allocation", () => {
  const optimizeRaw = (committed: boolean) => {
    const raw = committed ? withCommitted() : baseRaw();
    raw.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 9600, cash_purpose: "protected_reserve" }];
    raw.debts = [{ id: "loan", name: "Low-rate loan", debt_type: "personal", current_balance: 10000, interest_rate: 3, minimum_payment: 200, rate_type: "fixed" }];
    return raw;
  };
  const optimizeTotal = (raw: MoneyPriorityRawSnapshot) => engine(raw).recommendations.filter((item) => item.stage === "optimize").flatMap((item) => item.allocations).reduce((sum, item) => sum + item.monthlyAmount, 0);
  assert.ok(optimizeTotal(optimizeRaw(false)) > optimizeTotal(optimizeRaw(true)));
});

test("Recommended Plan respects corrected capacity", () => {
  const plan = engine(withCommitted());
  const result = evaluateUserPlan(plan, []);
  assert.ok(result.recommendedPlan.totalAllocated <= result.recommendedPlan.monthlyCapacity);
});

test("Your Plan receives corrected monthly capacity", () => {
  const plan = engine(withCommitted());
  assert.equal(evaluateUserPlan(plan, []).yourPlan.monthlyCapacity, plan.feasibility.monthlyPlanCapacity);
});

test("Your Plan reports funding gap above corrected capacity", () => {
  const raw = withCommitted();
  raw.goals = [{ id: "g", name: "Goal", target_amount: 12000, current_amount: 0, target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective", necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" }];
  const plan = engine(raw);
  const allocation = deriveRecommendedPlanAllocations(plan)[0]!;
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: plan.feasibility.monthlyPlanCapacity + 300 }]);
  assert.equal(result.yourPlan.fundingGap, 300);
});

test("Your Plan does not squeeze untouched allocations", () => {
  const raw = withCommitted();
  raw.goals = [
    { id: "g1", name: "Required", target_amount: 12000, current_amount: 0, target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective", necessity: "required", deadline_flexibility: "fixed", consequence_level: "high" },
    { id: "g2", name: "Optional", target_amount: 6000, current_amount: 0, target_date: "2027-08-30", priority: 5, goal_class: "lifestyle_optional", necessity: "optional", deadline_flexibility: "flexible", consequence_level: "low" },
  ];
  const plan = engine(raw);
  const allocations = deriveRecommendedPlanAllocations(plan);
  const target = allocations[0]!;
  const untouched = allocations[1]!;
  const result = evaluateUserPlan(plan, [{ allocationId: target.allocationId, monthlyAmount: plan.feasibility.monthlyPlanCapacity + 300 }]);
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === untouched.allocationId)?.userMonthlyAmount, untouched.recommendedMonthlyAmount);
});

test("existing-cash balances remain normalized identically", () => {
  assert.deepEqual(engine(withCommitted()).snapshot.accounts, engine(baseRaw()).snapshot.accounts);
});

test("required expense increases existing-cash liquidity floor", () => {
  const rawA = baseRaw();
  rawA.accounts = [...(rawA.accounts ?? []), { id: "cash", name: "Cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" }];
  const rawB = withCommitted();
  rawB.accounts = [...(rawB.accounts ?? []), { id: "cash", name: "Cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" }];
  assert.equal(engine(rawB).existingCash.liquidityFloor - engine(rawA).existingCash.liquidityFloor, 400);
});

test("emergency target stays unchanged while liquidity floor rises", () => {
  const a = engine(baseRaw());
  const b = engine(withCommitted());
  assert.equal(b.secure.fullEmergencyTarget, a.secure.fullEmergencyTarget);
  assert.ok(b.existingCash.liquidityFloor > a.existingCash.liquidityFloor);
});

test("residual-needs reconciliation remains deterministic", () => {
  const plan = engine(withCommitted());
  assert.equal(plan.residualNeeds.totalOneTimeDeployed, plan.existingCash.deployedCash);
});

test("protected cash remains unchanged", () => {
  assert.equal(engine(withCommitted()).snapshot.aggregates.protectedCash, 9000);
});

test("earmarked cash remains unchanged", () => {
  const raw = withCommitted();
  raw.accounts = [...(raw.accounts ?? []), { id: "goal-cash", name: "Goal", account_type: "savings", balance: 1000, cash_purpose: "earmarked_goal" }];
  assert.equal(engine(raw).snapshot.aggregates.earmarkedCash, 1000);
});

test("debt-backed cash remains unchanged", () => {
  const raw = withCommitted();
  raw.accounts = [...(raw.accounts ?? []), { id: "debt-cash", name: "Debt", account_type: "savings", balance: 1000, cash_purpose: "debt_backed_reserve" }];
  assert.equal(engine(raw).snapshot.aggregates.debtBackedCash, 1000);
});

test("ordinary student-loan routing is unchanged", () => {
  const raw = withCommitted();
  raw.debts = [{ id: "s", name: "Student", debt_type: "student_loan", current_balance: 5000, interest_rate: 12, minimum_payment: 100, rate_type: "fixed", student_loan_source: "private", student_loan_repayment_plan: "standard", student_loan_forgiveness_strategy: "none" }];
  assert.equal(engine(raw).secure.studentLoanStrategies[0]?.state, "ordinary_debt_policy");
});

test("PSLF preservation is unchanged", () => {
  const raw = withCommitted();
  raw.debts = [{ id: "s", name: "Student", debt_type: "student_loan", current_balance: 20000, interest_rate: 12, minimum_payment: 200, rate_type: "fixed", student_loan_source: "federal", student_loan_repayment_plan: "ibr", student_loan_forgiveness_strategy: "pslf", student_loan_strategy_active: true, current_required_monthly_payment: 200, qualifying_payments_made: 60, qualifying_payments_required: 120, estimated_forgiveness_amount: 15000, estimated_forgiveness_date: "2031-08-30" }];
  assert.equal(engine(raw).secure.studentLoanStrategies[0]?.state, "preserve_current_strategy");
});

test("home affordability margin falls by committed expense", () => {
  const a = evaluateHomeAffordability(engine(), homeScenario());
  const b = evaluateHomeAffordability(engine(withCommitted()), homeScenario());
  assert.equal(a.monthly.postPurchasePlanMargin - b.monthly.postPurchasePlanMargin, 800);
});

test("home emergency-reserve basis remains unchanged", () => {
  assert.equal(engine().secure.fullEmergencyTarget, engine(withCommitted()).secure.fullEmergencyTarget);
});

test("vehicle affordability margin falls by committed expense", () => {
  const a = evaluateVehicleAffordability(engine(), vehicleScenario());
  const b = evaluateVehicleAffordability(engine(withCommitted()), vehicleScenario());
  assert.ok(Math.abs((a.monthlyImpact.postPurchasePlanMargin - b.monthlyImpact.postPurchasePlanMargin) - 800) < 0.01);
});

test("retirement projection itself is unchanged by classification", () => {
  assert.deepEqual(engine().build.retirement.projection, engine(withCommitted()).build.retirement.projection);
});

test("goal contributions are not expense aggregates", () => {
  const raw = baseRaw();
  raw.goals = [{ id: "g", name: "Goal", target_amount: 12000, current_amount: 0, target_date: "2027-08-30", priority: 1, goal_class: "major_life_goal", necessity: "important", deadline_flexibility: "fixed", consequence_level: "moderate", planned_monthly_contribution: 500 }];
  assert.equal(buildMoneyPrioritySnapshot(raw).aggregates.monthlyRequiredOutflow, 3000);
});

test("retirement contributions are not expense aggregates", () => {
  assert.equal(buildMoneyPrioritySnapshot(baseRaw()).aggregates.monthlyRequiredOutflow, 3000);
});

test("same inputs produce identical normalized snapshot and engine", () => {
  const raw = withCommitted(123.45);
  assert.deepEqual(buildMoneyPrioritySnapshot(raw), buildMoneyPrioritySnapshot(raw));
  assert.deepEqual(engine(raw), engine(raw));
});

test("raw snapshot remains unchanged", () => {
  const raw = withCommitted();
  const before = structuredClone(raw);
  engine(raw);
  assert.deepEqual(raw, before);
});

test("normalized snapshot remains unchanged during downstream execution", () => {
  const result = engine(withCommitted());
  const before = structuredClone(result.snapshot);
  evaluateUserPlan(result, []);
  evaluateHomeAffordability(result, homeScenario());
  evaluateVehicleAffordability(result, vehicleScenario());
  assert.deepEqual(result.snapshot, before);
});

test("required-outflow canonical invariant holds", () => {
  const a = buildMoneyPrioritySnapshot(withCommitted());
  assert.equal(a.aggregates.monthlyRequiredOutflow,
    a.aggregates.monthlyEssentialExpenses
      + a.aggregates.monthlyCommittedNonEssentialExpenses
      + a.aggregates.monthlyMinimumDebtPayments);
});

test("cash-flow canonical invariant includes discretionary spending once", () => {
  const a = buildMoneyPrioritySnapshot(withCommitted());
  assert.equal(a.aggregates.monthlyCashFlowBeforeSavings,
    a.aggregates.monthlyTakeHomeIncome
      - a.aggregates.monthlyRequiredOutflow
      - a.aggregates.monthlyDiscretionaryExpenses);
});

test("monthly plan capacity does not exceed positive cash flow", () => {
  const result = engine(withCommitted());
  assert.ok(result.feasibility.monthlyPlanCapacity <= Math.max(0, result.snapshot.aggregates.monthlyCashFlowBeforeSavings));
});

test("explicit required treatment does not mutate expense essentiality", () => {
  const expense = buildMoneyPrioritySnapshot(withCommitted()).expenses.find((item) => item.id === "childcare");
  assert.equal(expense?.isEssential, false);
  assert.equal(expense?.cashFlowTreatment, "required");
});

test("invalid treatment on nonessential expense falls back to discretionary", () => {
  const raw = baseRaw();
  raw.expenses = [{ id: "x", name: "Unknown", category: "other", monthly_amount: 100, is_essential: false, cash_flow_treatment: "other" }];
  assert.equal(buildMoneyPrioritySnapshot(raw).expenses[0]?.cashFlowTreatment, "discretionary");
});
