import test from "node:test";
import assert from "node:assert/strict";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { withConfirmedLegacyGoalFacts } from "./legacy-goal-test-fixtures.ts";
import {
  buildPlanAllocationId,
  deriveRecommendedPlanAllocations,
  evaluateUserPlan,
  removeMoneyPlanOverride,
  type MoneyPlanOverride,
  type PlanAllocation,
} from "./money-priority-user-plan.ts";

const AS_OF = "2026-08-30";

function baseRaw(): MoneyPriorityRawSnapshot {
  return {
    householdId: "user-plan-household",
    people: [{
      id: "p1", display_name: "Alex", relationship: "self", birth_date: "1990-01-01",
      planned_retirement_age: 65, covered_by_workplace_retirement_plan: true,
      estimated_taxable_compensation_annual: 120000, is_active: true, is_dependent: false,
    }],
    income: [{
      id: "income", owner_person_id: "p1", name: "Salary", monthly_amount: 8000,
      monthly_gross_amount: 10000, is_variable: false, is_active: true,
    }],
    expenses: [
      { id: "essential", name: "Essentials", category: "housing", monthly_amount: 3000, is_essential: true },
      { id: "optional", name: "Lifestyle", category: "other", monthly_amount: 1000, is_essential: false },
    ],
    accounts: [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" }],
    debts: [],
    retirementAccounts: [{
      id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 250000,
      monthly_employee_contribution: 1200, monthly_employer_contribution: 300,
      employee_contributed_ytd: 12000, employer_contributed_ytd: 3000,
      plan_eligible_compensation_annual: 120000,
      full_match_employee_contribution_monthly: 600, match_status: "fully_captured",
    }],
    goals: [
      {
        id: "required-goal", name: "Required vehicle", target_amount: 12000, current_amount: 0,
        target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective",
        necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
      },
      {
        id: "optional-goal", name: "Vacation", target_amount: 6000, current_amount: 0,
        target_date: "2027-08-30", priority: 5, goal_class: "lifestyle_optional",
        necessity: "optional", deadline_flexibility: "flexible", consequence_level: "low",
      },
    ],
    insuranceExposures: [{ id: "insurance", name: "Auto", insurance_type: "auto", deductible_amount: 1000, is_relevant_to_reserve: true }],
    preferences: {
      emergency_fund_months_override: 3, debt_vs_investing: "balanced", risk_tolerance: "moderate",
      retirement_priority: "normal", job_replacement_difficulty: "easy", known_income_disruption: false,
      desired_retirement_monthly_spending: 5000, retirement_spending_basis: "today_dollars",
      planning_social_security_monthly: 2500, planning_pension_monthly: 0,
      tax_profile_year: 2026, tax_filing_status: "single", estimated_modified_agi: 120000,
    },
  };
}

function engine(raw = baseRaw()) {
  return runMoneyPriorityEngine(withConfirmedLegacyGoalFacts(raw), AS_OF);
}

function findAllocation(
  plan: ReturnType<typeof engine>,
  predicate: (allocation: PlanAllocation) => boolean,
): PlanAllocation {
  const allocation = deriveRecommendedPlanAllocations(plan).find(predicate);
  assert.ok(allocation, "Expected allocation was not produced by the engine fixture.");
  return allocation;
}

function goalAllocation(plan: ReturnType<typeof engine>, id = "required-goal") {
  return findAllocation(plan, (item) => item.category === "goal" && item.relatedEntityId === id);
}

function matchEngine() {
  const raw = baseRaw();
  raw.goals = [];
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 250000,
    monthly_employee_contribution: 300, monthly_employer_contribution: 0,
    employee_contributed_ytd: 3000, employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 120000,
    full_match_employee_contribution_monthly: 600, match_status: "not_fully_captured",
  }];
  return engine(raw);
}

function reserveEngine() {
  const raw = baseRaw();
  raw.goals = [];
  raw.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" }];
  return engine(raw);
}

function debtEngine() {
  const raw = baseRaw();
  raw.goals = [];
  raw.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings", balance: 9300, cash_purpose: "protected_reserve" }];
  raw.debts = [{
    id: "card", name: "Credit card", debt_type: "credit_card", current_balance: 5000,
    interest_rate: 20, minimum_payment: 100, rate_type: "fixed",
  }];
  return engine(raw);
}

function retirementEngine(overrides: Partial<MoneyPriorityRawSnapshot> = {}) {
  const raw = baseRaw();
  raw.goals = [];
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 500, monthly_employer_contribution: 0,
    employee_contributed_ytd: 6000, employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 120000,
    full_match_employee_contribution_monthly: 0, match_status: "fully_captured",
  }];
  Object.assign(raw, overrides);
  return engine(raw);
}

test("no overrides makes Your Plan equal Recommended Plan", () => {
  const result = evaluateUserPlan(engine(), []);
  assert.equal(result.yourPlan.totalAllocated, result.recommendedPlan.totalAllocated);
  assert.deepEqual(
    result.yourPlan.allocations.map((item) => item.userMonthlyAmount),
    result.recommendedPlan.allocations.map((item) => item.recommendedMonthlyAmount),
  );
});

test("increasing one allocation changes only that user allocation", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: allocation.recommendedMonthlyAmount + 100 }]);
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === allocation.allocationId)?.monthlyDifference, 100);
});

test("decreasing one allocation is preserved", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: allocation.recommendedMonthlyAmount - 100 }]);
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === allocation.allocationId)?.monthlyDifference, -100);
});

test("zero-dollar override remains an intentional active override", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 0 }]);
  assert.equal(result.overrides.active.length, 1);
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === allocation.allocationId)?.userMonthlyAmount, 0);
});

test("optional allocation can be removed without redistribution", () => {
  const plan = engine();
  const allocation = goalAllocation(plan, "optional-goal");
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 0 }]);
  assert.equal(result.yourPlan.fundingStatus, "unallocated_capacity");
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === allocation.allocationId)?.userMonthlyAmount, 0);
});

test("underallocation leaves explicit unallocated capacity", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 0 }]);
  assert.equal(result.yourPlan.fundingStatus, "unallocated_capacity");
  assert.ok(result.yourPlan.remainingCapacity > result.recommendedPlan.remainingCapacity);
});

test("overallocation creates an explicit funding gap", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 10000 }]);
  assert.equal(result.yourPlan.fundingStatus, "funding_gap");
  assert.ok(result.yourPlan.fundingGap > 0);
  assert.equal(result.impacts[0]?.severity, "infeasible");
});

test("overallocated plan does not silently reduce another category", () => {
  const plan = engine();
  const target = goalAllocation(plan);
  const untouched = goalAllocation(plan, "optional-goal");
  const result = evaluateUserPlan(plan, [{ allocationId: target.allocationId, monthlyAmount: 10000 }]);
  assert.equal(
    result.yourPlan.allocations.find((item) => item.allocationId === untouched.allocationId)?.userMonthlyAmount,
    untouched.recommendedMonthlyAmount,
  );
});

test("employer-match reduction produces high-severity shortfall", () => {
  const plan = matchEngine();
  const allocation = findAllocation(plan, (item) => item.category === "employer_match");
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 100 }]);
  const impact = result.impacts.find((item) => item.allocationId === allocation.allocationId);
  assert.equal(impact?.severity, "high");
  assert.equal(impact?.employerMatchShortfall, allocation.recommendedMonthlyAmount - 100);
});

test("employer-match recommendation remains authoritative", () => {
  const plan = matchEngine();
  const before = structuredClone(plan.recommendations);
  const allocation = findAllocation(plan, (item) => item.category === "employer_match");
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 0 }]);
  assert.equal(result.recommendedPlan.allocations.find((item) => item.allocationId === allocation.allocationId)?.recommendedMonthlyAmount, allocation.recommendedMonthlyAmount);
  assert.deepEqual(plan.recommendations, before);
});

test("deductible reserve reduction is high severity", () => {
  const plan = reserveEngine();
  const allocation = findAllocation(plan, (item) => item.recommendationId === "secure-deductible-gap");
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 0 }]);
  assert.equal(result.impacts.find((item) => item.allocationId === allocation.allocationId)?.severity, "high");
});

test("emergency reserve reduction is high severity", () => {
  const plan = reserveEngine();
  const allocation = findAllocation(plan, (item) => item.recommendationId === "secure-full-emergency-fund");
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 0 }]);
  assert.equal(result.impacts.find((item) => item.allocationId === allocation.allocationId)?.severity, "high");
});

test("high-interest debt reduction exposes payoff consequence", () => {
  const plan = debtEngine();
  const allocation = findAllocation(plan, (item) => item.category === "debt" && item.stage === "secure");
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 500 }]);
  const impact = result.impacts.find((item) => item.allocationId === allocation.allocationId);
  assert.equal(impact?.severity, "high");
  assert.ok((impact?.debt?.payoffDelayMonths ?? 0) > 0);
  assert.ok((impact?.debt?.increasedInterest ?? 0) > 0);
});

test("required goal reduction creates a consequence impact", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 500 }]);
  assert.ok(["tradeoff", "high"].includes(result.impacts.find((item) => item.allocationId === allocation.allocationId)?.severity ?? ""));
});

test("required goal becomes infeasible at a reduced pace", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 100 }]);
  const impact = result.impacts.find((item) => item.allocationId === allocation.allocationId);
  assert.equal(impact?.goal?.deadlineFeasible, false);
  assert.equal(impact?.severity, "high");
});

test("required goal can be increased while optional goal is reduced", () => {
  const plan = engine();
  const required = goalAllocation(plan);
  const optional = goalAllocation(plan, "optional-goal");
  const result = evaluateUserPlan(plan, [
    { allocationId: required.allocationId, monthlyAmount: required.recommendedMonthlyAmount + 200 },
    { allocationId: optional.allocationId, monthlyAmount: Math.max(0, optional.recommendedMonthlyAmount - 200) },
  ]);
  assert.equal(result.yourPlan.totalAllocated, result.recommendedPlan.totalAllocated);
  assert.ok(result.impacts.some((item) => item.relatedEntityId === "required-goal" && item.monthlyDifference === 200));
});

test("necessary goal increase can be funded by retirement reduction", () => {
  const plan = retirementEngine({
    goals: [{
      id: "required-goal", name: "Vehicle", target_amount: 6000, current_amount: 0,
      target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective",
      necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
    }],
  });
  const goal = goalAllocation(plan);
  const retirement = findAllocation(plan, (item) => item.category === "retirement");
  const amount = Math.min(100, retirement.recommendedMonthlyAmount);
  const result = evaluateUserPlan(plan, [
    { allocationId: goal.allocationId, monthlyAmount: goal.recommendedMonthlyAmount + amount },
    { allocationId: retirement.allocationId, monthlyAmount: retirement.recommendedMonthlyAmount - amount },
  ]);
  assert.equal(result.yourPlan.totalAllocated, result.recommendedPlan.totalAllocated);
  assert.ok(result.tradeoffs.length >= 2);
});

test("retirement reduction may remain the same projection state", () => {
  const raw = baseRaw();
  raw.goals = [];
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 1000000,
    monthly_employee_contribution: 500, monthly_employer_contribution: 0,
    employee_contributed_ytd: 6000, employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 120000,
    full_match_employee_contribution_monthly: 0, match_status: "fully_captured",
  }];
  raw.preferences = {
    ...(raw.preferences ?? {}),
    desired_retirement_monthly_spending: null,
    retirement_spending_basis: "unknown",
  };
  const plan = engine(raw);
  const retirement = findAllocation(plan, (item) => item.category === "retirement");
  const result = evaluateUserPlan(plan, [{ allocationId: retirement.allocationId, monthlyAmount: 0 }]);
  const impact = result.impacts.find((item) => item.allocationId === retirement.allocationId);
  assert.equal(impact?.retirement?.recommendedProjection?.state, impact?.retirement?.userProjection?.state);
  assert.equal(impact?.severity, "tradeoff");
});

test("retirement reduction can worsen a projected shortfall", () => {
  const plan = retirementEngine();
  const retirement = findAllocation(plan, (item) => item.category === "retirement");
  const result = evaluateUserPlan(plan, [{ allocationId: retirement.allocationId, monthlyAmount: 0 }]);
  const impact = result.impacts.find((item) => item.allocationId === retirement.allocationId);
  assert.equal(impact?.retirement?.userProjection?.state, "shortfall");
  assert.equal(impact?.severity, "high");
});

test("retirement allocation can increase above recommendation", () => {
  const plan = retirementEngine();
  const retirement = findAllocation(plan, (item) => item.category === "retirement");
  const result = evaluateUserPlan(plan, [{ allocationId: retirement.allocationId, monthlyAmount: retirement.recommendedMonthlyAmount + 100 }]);
  assert.equal(result.impacts.find((item) => item.allocationId === retirement.allocationId)?.severity, "informational");
});

test("optional lifestyle goal change is informational", () => {
  const plan = engine();
  const optional = goalAllocation(plan, "optional-goal");
  const result = evaluateUserPlan(plan, [{ allocationId: optional.allocationId, monthlyAmount: 0 }]);
  assert.equal(result.impacts.find((item) => item.allocationId === optional.allocationId)?.severity, "informational");
});

test("unknown allocation ID is superseded and not applied", () => {
  const result = evaluateUserPlan(engine(), [{ allocationId: "old::goal::gone", monthlyAmount: 100 }]);
  assert.equal(result.overrides.superseded.length, 1);
  assert.equal(result.overrides.active.length, 0);
});

test("duplicate overrides are all invalid", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [
    { allocationId: allocation.allocationId, monthlyAmount: 100 },
    { allocationId: allocation.allocationId, monthlyAmount: 200 },
  ]);
  assert.equal(result.overrides.invalid.length, 2);
  assert.equal(result.overrides.active.length, 0);
});

test("negative override is invalid", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: -1 }]);
  assert.equal(result.overrides.invalid.length, 1);
});

test("non-finite override is invalid", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: Number.NaN }]);
  assert.equal(result.overrides.invalid.length, 1);
});

test("disappearing recommendation supersedes old override", () => {
  const before = engine();
  const old = goalAllocation(before);
  const raw = baseRaw();
  raw.goals = [];
  const result = evaluateUserPlan(engine(raw), [{ allocationId: old.allocationId, monthlyAmount: 100 }]);
  assert.equal(result.overrides.superseded[0]?.status, "superseded");
});

test("completed goal supersedes old override", () => {
  const before = engine();
  const old = goalAllocation(before);
  const raw = baseRaw();
  raw.goals = [{
    id: "required-goal", name: "Required vehicle", target_amount: 12000, current_amount: 12000,
    target_date: "2027-08-30", priority: 1, goal_class: "necessary_protective",
    necessity: "required", deadline_flexibility: "fixed", consequence_level: "high",
  }];
  const result = evaluateUserPlan(engine(raw), [{ allocationId: old.allocationId, monthlyAmount: 100 }]);
  assert.equal(result.overrides.superseded.length, 1);
});

test("paid debt supersedes old override", () => {
  const before = debtEngine();
  const old = findAllocation(before, (item) => item.category === "debt");
  const raw = baseRaw();
  raw.goals = [];
  raw.debts = [];
  const result = evaluateUserPlan(engine(raw), [{ allocationId: old.allocationId, monthlyAmount: 100 }]);
  assert.equal(result.overrides.superseded.length, 1);
});

test("missing-information recommendation cannot be bypassed", () => {
  const raw = baseRaw();
  raw.goals = [];
  raw.income = [{ id: "income", owner_person_id: "p1", name: "Salary", monthly_amount: 8000, monthly_gross_amount: null, is_active: true }];
  raw.preferences = {
    ...(raw.preferences ?? {}),
    desired_retirement_monthly_spending: null,
    retirement_spending_basis: "unknown",
  };
  const plan = engine(raw);
  const id = buildPlanAllocationId("build-retirement-missing-data", "retirement", null);
  const result = evaluateUserPlan(plan, [{ allocationId: id, monthlyAmount: 500 }]);
  assert.equal(result.overrides.invalid.length, 1);
  assert.equal(result.overrides.active.length, 0);
});

test("known retirement contribution-room conflict is surfaced without clamping", () => {
  const raw = baseRaw();
  raw.goals = [];
  raw.retirementAccounts = [{
    id: "r1", owner_person_id: "p1", name: "401(k)", account_type: "401k", balance: 0,
    monthly_employee_contribution: 500, monthly_employer_contribution: 0,
    employee_contributed_ytd: 24000, employer_contributed_ytd: 0,
    plan_eligible_compensation_annual: 100000,
    full_match_employee_contribution_monthly: 0, match_status: "fully_captured",
  }];
  const plan = engine(raw);
  const retirement = findAllocation(plan, (item) => item.category === "retirement");
  const requested = retirement.recommendedMonthlyAmount + 500;
  const result = evaluateUserPlan(plan, [{ allocationId: retirement.allocationId, monthlyAmount: requested }]);
  assert.ok(result.impacts.some((item) => item.id === "user-plan-retirement-room-conflict"));
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === retirement.allocationId)?.userMonthlyAmount, requested);
});

test("existing one-time deployments remain identical", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "reserve", name: "Reserve", account_type: "savings", balance: 0, cash_purpose: "protected_reserve" },
    { id: "cash", name: "Cash", account_type: "savings", balance: 5000, cash_purpose: "unallocated" },
  ];
  const plan = engine(raw);
  const before = structuredClone(plan.existingCash);
  evaluateUserPlan(plan, []);
  assert.deepEqual(plan.existingCash, before);
});

test("residual-needs result remains unchanged", () => {
  const plan = engine();
  const before = structuredClone(plan.residualNeeds);
  evaluateUserPlan(plan, []);
  assert.deepEqual(plan.residualNeeds, before);
});

test("all cash classifications remain unchanged", () => {
  const raw = baseRaw();
  raw.accounts = [
    { id: "protected", name: "Protected", account_type: "savings", balance: 9000, cash_purpose: "protected_reserve" },
    { id: "earmarked", name: "Earmarked", account_type: "savings", balance: 1000, cash_purpose: "earmarked_goal", related_goal_id: "required-goal" },
    { id: "operating", name: "Operating", account_type: "checking", balance: 2000, cash_purpose: "operating_cash" },
    { id: "debt", name: "Debt reserve", account_type: "savings", balance: 3000, cash_purpose: "debt_backed_reserve" },
  ];
  const plan = engine(raw);
  const before = structuredClone(plan.snapshot.aggregates);
  evaluateUserPlan(plan, []);
  assert.deepEqual(plan.snapshot.aggregates, before);
});

test("original engine result is deeply unchanged", () => {
  const plan = engine();
  const before = structuredClone(plan);
  const allocation = goalAllocation(plan);
  evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: 0 }]);
  assert.deepEqual(plan, before);
});

test("override input array is unchanged", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const overrides: MoneyPlanOverride[] = [{ allocationId: allocation.allocationId, monthlyAmount: 0 }];
  const before = structuredClone(overrides);
  evaluateUserPlan(plan, overrides);
  assert.deepEqual(overrides, before);
});

test("same inputs produce identical output", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const overrides = [{ allocationId: allocation.allocationId, monthlyAmount: 200 }];
  assert.deepEqual(evaluateUserPlan(plan, overrides), evaluateUserPlan(plan, overrides));
});

test("Your Plan allocation arithmetic invariant holds", () => {
  const result = evaluateUserPlan(engine(), []);
  assert.equal(
    result.yourPlan.totalAllocated + result.yourPlan.remainingCapacity - result.yourPlan.fundingGap,
    result.yourPlan.monthlyCapacity,
  );
});

test("Recommended Plan allocation arithmetic invariant holds", () => {
  const result = evaluateUserPlan(engine(), []);
  assert.equal(
    result.recommendedPlan.totalAllocated + result.recommendedPlan.remainingCapacity,
    result.recommendedPlan.monthlyCapacity,
  );
});

test("removing an override resets allocation to recommendation", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const overrides = [{ allocationId: allocation.allocationId, monthlyAmount: 0 }];
  const reset = removeMoneyPlanOverride(overrides, allocation.allocationId);
  const result = evaluateUserPlan(plan, reset);
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === allocation.allocationId)?.userMonthlyAmount, allocation.recommendedMonthlyAmount);
});

test("allocation identity is independent of amount and position", () => {
  assert.equal(
    buildPlanAllocationId("build-goal-g1", "goal", "g1"),
    "build-goal-g1::goal::g1",
  );
});

test("zero-difference override is active without a fabricated impact", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: allocation.recommendedMonthlyAmount }]);
  assert.equal(result.overrides.active.length, 1);
  assert.equal(result.impacts.some((item) => item.allocationId === allocation.allocationId), false);
});

test("recommended plan retains policy and affordability outputs untouched", () => {
  const plan = engine();
  const policyVersion = plan.policyVersion;
  evaluateUserPlan(plan, []);
  assert.equal(plan.policyVersion, policyVersion);
});

test("superseded override cannot create a user allocation", () => {
  const result = evaluateUserPlan(engine(), [{ allocationId: "secure-debt-high-paid::debt::paid", monthlyAmount: 500 }]);
  assert.equal(result.yourPlan.allocations.some((item) => item.relatedEntityId === "paid"), false);
});

test("invalid override inherits recommended amount", () => {
  const plan = engine();
  const allocation = goalAllocation(plan);
  const result = evaluateUserPlan(plan, [{ allocationId: allocation.allocationId, monthlyAmount: -100 }]);
  assert.equal(result.yourPlan.allocations.find((item) => item.allocationId === allocation.allocationId)?.userMonthlyAmount, allocation.recommendedMonthlyAmount);
});
