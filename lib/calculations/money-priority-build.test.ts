import assert from "node:assert/strict";
import test from "node:test";

import { evaluateBuildStage } from "./money-priority-build.ts";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

function makeSnapshot(overrides: Partial<MoneyPriorityRawSnapshot> = {}) {
  return buildMoneyPrioritySnapshot({
    householdId: "household-1",
    people: [{
      id: "person-1", display_name: "Adult", relationship: "self",
      estimated_taxable_compensation_annual: 120000,
      is_active: true, is_dependent: false,
    }],
    income: [
      {
        id: "income-1",
        name: "Paycheck",
        monthly_amount: 6000,
        monthly_gross_amount: 10000,
        is_active: true,
      },
    ],
    expenses: [
      { id: "expense-1", name: "Essentials", monthly_amount: 3500, is_essential: true },
      { id: "expense-2", name: "Discretionary", monthly_amount: 700, is_essential: false },
    ],
    accounts: [],
    debts: [
      {
        id: "debt-1",
        debt_type: "auto",
        name: "Auto loan",
        current_balance: 10000,
        minimum_payment: 300,
        interest_rate: 4,
      },
    ],
    retirementAccounts: [
      {
        id: "retirement-1",
        owner_person_id: "person-1",
        name: "401k",
        account_type: "401k",
        balance: 0,
        monthly_employee_contribution: 400,
        monthly_employer_contribution: 100,
        employee_contributed_ytd: 0,
        employer_contributed_ytd: 0,
        plan_eligible_compensation_annual: 120000,
        match_status: "fully_captured",
      },
    ],
    goals: [],
    insuranceExposures: [],
    preferences: null,
    ...overrides,
  });
}

const competitionReadyPerson = {
  id: "person-1",
  display_name: "Adult",
  relationship: "self",
  birth_date: "1990-01-01",
  planned_retirement_age: 67,
  estimated_taxable_compensation_annual: 120000,
  is_active: true,
  is_dependent: false,
};

const competitionReadyPreferences = {
  desired_retirement_monthly_spending: 1000,
  retirement_spending_basis: "today_dollars",
  planning_social_security_monthly: 0,
  planning_pension_monthly: 0,
};

function confirmedGoal(overrides: Record<string, unknown>) {
  return {
    planned_monthly_contribution: 0,
    goal_intelligence_confirmed: true,
    underlying_need: "Maintain a necessary household function",
    desired_solution: "Fund the recorded goal",
    goal_nature: "preservation",
    underfunding_consequence: "other_material",
    borrowing_likelihood: "unlikely",
    expected_borrowing_amount: null,
    expected_borrowing_apr: null,
    ...overrides,
  };
}

test("calculates retirement benchmark gap from complete gross income", () => {
  const result = evaluateBuildStage(makeSnapshot(), "2026-08-29");

  assert.equal(result.retirement.state, "below_benchmark");
  assert.equal(result.retirement.healthyBenchmarkMonthlyTarget, 1200);
  assert.equal(result.retirement.currentTotalMonthlyContribution, 500);
  assert.equal(result.retirement.healthyBenchmarkMonthlyGap, 700);
  assert.equal(result.retirement.currentPersonalSavingsRate, 0.04);
  assert.equal(result.retirement.currentTotalSavingsRate, 0.05);
});

test("required fixed goal outranks only additional retirement after the protected floor", () => {
  const snapshot = makeSnapshot({
    people: [competitionReadyPerson],
    preferences: competitionReadyPreferences,
    goals: [
      confirmedGoal({
        id: "goal-car",
        name: "Replacement car",
        target_amount: 12000,
        current_amount: 0,
        target_date: "2027-08-29",
        priority: 1,
        goal_class: "necessary_protective",
        necessity: "required",
        deadline_flexibility: "fixed",
        consequence_level: "high",
        core_need_amount: 12000,
      }),
    ],
  });

  const result = evaluateBuildStage(snapshot, "2026-08-29");
  const goalAllocation = result.allocations.find((allocation) => allocation.relatedEntityId === "goal-car");
  const retirementAllocation = result.allocations.find((allocation) => allocation.category === "retirement");

  assert.equal(result.monthlyPlanCapacity, 1500);
  assert.equal(result.goals[0]?.requiredMonthlyPace, 1000);
  assert.equal(result.protectedRetirementFloorRequestedMonthly, 700);
  assert.equal(result.protectedMonthlyFundingNeed, 700);
  assert.equal(result.feasibility.status, "feasible");
  assert.equal(result.feasibility.planFundingGap, 0);
  assert.equal(result.competition.goals[0]?.disposition, "OUTRANKS");
  assert.equal(result.protectedRetirementFloorAllocatedMonthly, 700);
  assert.equal(goalAllocation?.allocatedMonthlyAmount, 800);
  assert.equal(goalAllocation?.unfundedMonthlyAmount, 200);
  assert.equal(retirementAllocation?.allocatedMonthlyAmount, 700);
  assert.equal(result.competition.additionalRetirementAllocatedMonthly, 0);
  assert.equal(result.totalAllocatedMonthly, 1500);
  assert.equal(result.remainingMonthlyCapacity, 0);
});

test("optional goals only receive residual capacity after protected and additional retirement", () => {
  const snapshot = makeSnapshot({
    people: [competitionReadyPerson],
    preferences: competitionReadyPreferences,
    goals: [
      confirmedGoal({
        id: "goal-trip",
        name: "Vacation",
        target_amount: 6000,
        current_amount: 0,
        target_date: "2027-08-29",
        priority: 5,
        goal_class: "lifestyle_optional",
        necessity: "optional",
        deadline_flexibility: "flexible",
        consequence_level: "low",
        core_need_amount: 6000,
        goal_nature: "improvement",
        underfunding_consequence: "safely_delay",
      }),
    ],
  });

  const result = evaluateBuildStage(snapshot, "2026-08-29");
  const goalAllocation = result.allocations.find((allocation) => allocation.relatedEntityId === "goal-trip");
  const retirementAllocation = result.allocations.find((allocation) => allocation.category === "retirement");

  assert.equal(result.protectedRetirementFloorAllocatedMonthly, 700);
  assert.equal(result.competition.goals[0]?.disposition, "BELOW");
  assert.equal(result.competition.additionalRetirementAllocatedMonthly, 800);
  assert.equal(retirementAllocation?.allocatedMonthlyAmount, 1500);
  assert.equal(goalAllocation?.requestedMonthlyAmount, 500);
  assert.equal(goalAllocation?.allocatedMonthlyAmount, 0);
  assert.equal(result.totalAllocatedMonthly, 1500);
  assert.equal(result.remainingMonthlyCapacity, 0);
});

test("never allocates more than available monthly capacity", () => {
  const snapshot = makeSnapshot({
    income: [
      {
        id: "income-1",
        name: "Paycheck",
        monthly_amount: 4500,
        monthly_gross_amount: 10000,
        is_active: true,
      },
    ],
    goals: [
      {
        id: "goal-1",
        name: "Necessary goal",
        target_amount: 12000,
        current_amount: 0,
        target_date: "2027-08-29",
        priority: 1,
        goal_class: "necessary_protective",
        necessity: "required",
        deadline_flexibility: "fixed",
        consequence_level: "high",
      },
      {
        id: "goal-2",
        name: "Optional goal",
        target_amount: 12000,
        current_amount: 0,
        target_date: "2027-08-29",
        priority: 5,
        goal_class: "lifestyle_optional",
        necessity: "optional",
        deadline_flexibility: "flexible",
        consequence_level: "low",
      },
    ],
  });

  const result = evaluateBuildStage(snapshot, "2026-08-29");

  assert.equal(result.monthlyPlanCapacity, 0);
  assert.equal(result.totalAllocatedMonthly, 0);
  assert.ok(result.allocations.every((allocation) => allocation.allocatedMonthlyAmount === 0));
});

test("missing gross income fails closed when retirement facts are material to recurring competition", () => {
  const snapshot = makeSnapshot({
    income: [
      {
        id: "income-1",
        name: "Paycheck",
        monthly_amount: 6000,
        monthly_gross_amount: null,
        is_active: true,
      },
    ],
    goals: [
      {
        id: "goal-car",
        name: "Replacement car",
        target_amount: 6000,
        current_amount: 0,
        target_date: "2027-08-29",
        priority: 1,
        goal_class: "necessary_protective",
        necessity: "required",
        deadline_flexibility: "fixed",
        consequence_level: "high",
      },
    ],
  });

  const result = evaluateBuildStage(snapshot, "2026-08-29");
  const goalAllocation = result.allocations.find((allocation) => allocation.relatedEntityId === "goal-car");

  assert.equal(result.retirement.state, "more_information_needed");
  assert.equal(result.retirement.healthyBenchmarkMonthlyGap, 0);
  assert.equal(result.goals[0]?.requiredMonthlyPace, 500);
  assert.equal(result.competition.state, "more_information_needed");
  assert.equal(goalAllocation?.allocatedMonthlyAmount, 0);
  assert.equal(result.totalAllocatedMonthly, 0);
  assert.ok(result.warnings.some((warning) => warning.includes("gross-income")));
});

test("goal without a target date does not fabricate a funding pace", () => {
  const snapshot = makeSnapshot({
    goals: [
      {
        id: "goal-home",
        name: "Home upgrade",
        target_amount: 10000,
        current_amount: 1000,
        target_date: null,
        priority: 3,
        goal_class: "major_life_goal",
        necessity: "important",
        deadline_flexibility: "flexible",
        consequence_level: "moderate",
      },
    ],
  });

  const result = evaluateBuildStage(snapshot, "2026-08-29");
  const goal = result.goals[0];

  assert.equal(goal?.requiredMonthlyPace, null);
  assert.equal(goal?.protectedMonthlyNeed, 0);
  assert.ok(result.warnings.some((warning) => warning.includes("target date")));
  assert.ok(!result.allocations.some((allocation) => allocation.relatedEntityId === "goal-home"));
});
