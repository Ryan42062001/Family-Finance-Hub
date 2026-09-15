import test from "node:test";
import assert from "node:assert/strict";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateBuildStage } from "./money-priority-build.ts";
import { createRetirementCapacityLedger } from "./money-priority-retirement-capacity.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";

const AS_OF = "2026-09-01";

function confirmedGoal(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    target_amount: 12000,
    current_amount: 0,
    target_date: "2027-09-01",
    priority: 3,
    goal_class: "other",
    necessity: "required",
    deadline_flexibility: "somewhat_flexible",
    consequence_level: "moderate",
    planned_monthly_contribution: 0,
    core_need_amount: 12000,
    goal_intelligence_confirmed: true,
    underlying_need: "Household need",
    desired_solution: "Chosen solution",
    goal_nature: "preservation",
    underfunding_consequence: "inconvenience",
    borrowing_likelihood: "unlikely",
    expected_borrowing_amount: null,
    expected_borrowing_apr: null,
    ...overrides,
  };
}

function workplaceAccount(id = "work", overrides: Record<string, unknown> = {}) {
  return {
    id,
    account_name: id,
    account_type: "401k",
    owner_person_id: "p1",
    balance: 100000,
    monthly_employee_contribution: 0,
    monthly_employer_contribution: 0,
    employee_contributed_ytd: 0,
    employer_contributed_ytd: 0,
    annual_employee_limit: 24500,
    annual_combined_limit: 73500,
    plan_limit_confirmed: true,
    workplace_plan_access: true,
    ...overrides,
  };
}

function raw(goals: Record<string, unknown>[], overrides: Partial<MoneyPriorityRawSnapshot> = {}): MoneyPriorityRawSnapshot {
  return {
    householdId: "h",
    people: [{
      id: "p1", display_name: "Person", is_active: true, is_dependent: false,
      birth_date: "1990-01-01", annual_compensation: 120000,
      planned_retirement_age: 67,
    }],
    income: [{ id: "income", name: "Income", monthly_amount: 9000, monthly_gross_amount: 10000, is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Required", category: "housing", monthly_amount: 6500, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [], debts: [], retirementAccounts: [workplaceAccount()], goals,
    insuranceExposures: [], preferences: {},
    ...overrides,
  };
}

function build(goals: Record<string, unknown>[], overrides: Partial<MoneyPriorityRawSnapshot> = {}, cap?: number) {
  const snapshot = buildMoneyPrioritySnapshot(raw(goals, overrides));
  const opportunities = evaluateRetirementAccountOpportunities(snapshot);
  const ledger = createRetirementCapacityLedger(opportunities);
  return evaluateBuildStage(snapshot, AS_OF, undefined, cap, undefined, undefined, opportunities, ledger);
}

test("FFH-017 Build uses core need rather than desired excess", () => {
  const result = build([confirmedGoal("car", {
    target_amount: 70000,
    core_need_amount: 25000,
    target_date: "2028-10-01",
    necessity: "required",
    deadline_flexibility: "fixed",
    consequence_level: "high",
    underfunding_consequence: "employment_disruption",
  })]);
  const goal = result.competition.goals.find((item) => item.goalId === "car")!;
  assert.equal(goal.remainingDesiredExcessAmount, 45000);
  assert.ok((goal.requestedMonthlyAmount ?? 0) < 70000 / 25);
  assert.equal(goal.disposition, "OUTRANKS");
});

test("FFH-017 protected retirement floor is outside ordinary goal competition", () => {
  const result = build([confirmedGoal("optional", {
    necessity: "optional", deadline_flexibility: "fixed", consequence_level: "low",
    goal_nature: "improvement",
  })], {}, 500);
  assert.ok(result.protectedRetirementFloorAllocatedMonthly <= 500);
  if ((result.unresolvedProtectedRetirementFloorMonthly ?? 0) > 0) {
    assert.equal(result.competition.totalAllocatedMonthly, 0);
    assert.equal(result.allocations.find((item) => item.category === "goal")?.allocatedMonthlyAmount ?? 0, 0);
  }
});

test("FFH-017 missing goal facts do not manufacture a definite allocation", () => {
  const result = build([confirmedGoal("unknown", {
    core_need_amount: null,
    necessity: "required",
  })]);
  assert.equal(result.competition.state, "more_information_needed");
  const goal = result.competition.goals.find((item) => item.goalId === "unknown")!;
  assert.equal(goal.disposition, "MORE_INFORMATION_NEEDED");
  assert.equal(goal.allocatedMonthlyAmount, 0);
});

test("FFH-017 goal input order does not change Build allocations", () => {
  const a = confirmedGoal("a", { core_need_amount: 6000, target_amount: 6000, priority: 3 });
  const b = confirmedGoal("b", { core_need_amount: 6000, target_amount: 6000, priority: 3 });
  const left = build([a, b], {}, 800);
  const right = build([b, a], {}, 800);
  const normalize = (value: ReturnType<typeof build>) => Object.fromEntries(
    value.competition.goals.map((item) => [item.goalId, item.allocatedMonthlyAmount]),
  );
  assert.deepEqual(normalize(left), normalize(right));
  assert.equal(left.competition.additionalRetirementAllocatedMonthly, right.competition.additionalRetirementAllocatedMonthly);
});

test("FFH-017 retirement account input order preserves aggregate recurring routing", () => {
  const accounts = [workplaceAccount("b"), workplaceAccount("a")];
  const reverse = [...accounts].reverse();
  const first = build([], { retirementAccounts: accounts }, 900);
  const second = build([], { retirementAccounts: reverse }, 900);
  assert.equal(first.totalAllocatedMonthly, second.totalAllocatedMonthly);
  assert.equal(
    first.retirementAccountAllocations.reduce((sum, item) => sum + item.allocatedMonthlyAmount, 0),
    second.retirementAccountAllocations.reduce((sum, item) => sum + item.allocatedMonthlyAmount, 0),
  );
});

test("FFH-017 aggregate recurring allocation equals concrete destinations to the cent", () => {
  const result = build([confirmedGoal("g")], {}, 1000.01);
  const retirement = result.retirementAccountAllocations.reduce((sum, item) => sum + item.allocatedMonthlyAmount, 0);
  const goals = result.allocations.filter((item) => item.category === "goal")
    .reduce((sum, item) => sum + item.allocatedMonthlyAmount, 0);
  assert.equal(Number((retirement + goals).toFixed(2)), result.totalAllocatedMonthly);
  assert.equal(Number((result.totalAllocatedMonthly + result.remainingMonthlyCapacity).toFixed(2)), result.allocationMonthlyCapacity);
});
