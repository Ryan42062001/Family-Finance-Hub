import test from "node:test";
import assert from "node:assert/strict";
import {
  allocateEqualFulfillmentCents,
  buildRecurringGoalRetirementCompetition,
  determineGoalRetirementDisposition,
} from "./money-priority-build-competition.ts";
import type { GoalIntelligenceResult } from "./money-priority-goal-intelligence.ts";

function goal(id: string, overrides: Partial<GoalIntelligenceResult> = {}): GoalIntelligenceResult {
  return {
    goalId: id,
    goalName: id,
    goalClass: "other",
    underlyingNeed: "Need",
    desiredSolution: "Solution",
    necessity: "essential",
    goalNature: "preservation",
    deadline: "2027-09-01",
    deadlineFlexibility: "limited",
    targetAmount: 12000,
    coreNeedAmount: 12000,
    eligibleSavedAmount: 0,
    remainingTargetAmount: 12000,
    remainingCoreNeedAmount: 12000,
    percentFunded: 0,
    monthsRemaining: 12,
    requiredMonthlyFunding: 1000,
    plannedMonthlyContribution: 0,
    scheduleState: "behind",
    underfundingConsequence: "inconvenience",
    consequenceSeverity: "moderate",
    borrowingLikelihood: "unlikely",
    expectedBorrowingAmount: null,
    expectedBorrowingApr: null,
    debtExposure: "none",
    targetReasonableness: "reasonable",
    priorityBand: "high",
    state: "calculated",
    missingData: [],
    reasonCodes: [],
    explanations: [],
    stableTieBreaker: id,
    ...overrides,
  };
}

test("FFH-017 goal OUTRANKS additional retirement only with approved essential evidence", () => {
  const value = goal("roof", {
    deadlineFlexibility: "fixed",
    consequenceSeverity: "high",
  });
  assert.equal(determineGoalRetirementDisposition(value, "behind"), "OUTRANKS");
  const plan = buildRecurringGoalRetirementCompetition([value], "behind", 1000, 1200);
  assert.equal(plan.goals[0].allocatedMonthlyAmount, 1000);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 200);
});

test("FFH-017 retirement OUTRANKS optional goal core", () => {
  const value = goal("optional", {
    necessity: "optional",
    priorityBand: "discretionary",
    consequenceSeverity: "low",
  });
  assert.equal(determineGoalRetirementDisposition(value, "behind"), "BELOW");
  const plan = buildRecurringGoalRetirementCompetition([value], "behind", 1000, 1200);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 1000);
  assert.equal(plan.goals[0].allocatedMonthlyAmount, 200);
});

test("FFH-017 CO_PRIORITY with sufficient capacity fulfills both tranches", () => {
  const value = goal("essential-limited");
  assert.equal(determineGoalRetirementDisposition(value, "behind"), "CO_PRIORITY");
  const plan = buildRecurringGoalRetirementCompetition([value], "behind", 750, 1750);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 750);
  assert.equal(plan.goals[0].allocatedMonthlyAmount, 1000);
  assert.equal(plan.remainingMonthlyCapacity, 0);
});

test("FFH-017 CO_PRIORITY scarcity applies one equal fulfillment ratio", () => {
  const value = goal("essential-limited");
  const plan = buildRecurringGoalRetirementCompetition([value], "behind", 500, 750);
  assert.equal(plan.goals[0].allocatedMonthlyAmount, 500);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 250);
  assert.equal(plan.totalAllocatedMonthly, 750);
});

test("FFH-017 odd-cent and one-cent co-priority boundaries reconcile exactly", () => {
  const split = allocateEqualFulfillmentCents([
    { id: "goal", requestedCents: 100, stableTieBreaker: "goal" },
    { id: "retirement", requestedCents: 100, stableTieBreaker: "retirement" },
  ], 1);
  assert.equal((split.get("goal") ?? 0) + (split.get("retirement") ?? 0), 1);
  assert.deepEqual([...split.entries()].sort(), [["goal", 1], ["retirement", 0]]);

  const odd = buildRecurringGoalRetirementCompetition([
    goal("g", { remainingCoreNeedAmount: 12000, monthsRemaining: 12 }),
  ], "behind", 1000, 1000.01);
  assert.equal(odd.totalAllocatedMonthly, 1000.01);
  assert.equal(odd.goals[0].allocatedMonthlyAmount + odd.additionalRetirementAllocatedMonthly, 1000.01);
});

test("FFH-017 input ordering does not change co-priority material allocation", () => {
  const a = goal("a", { remainingCoreNeedAmount: 6000, monthsRemaining: 12 });
  const b = goal("b", { remainingCoreNeedAmount: 6000, monthsRemaining: 12 });
  const left = buildRecurringGoalRetirementCompetition([a, b], "on_track", 500, 900);
  const right = buildRecurringGoalRetirementCompetition([b, a], "on_track", 500, 900);
  const amounts = (plan: typeof left) => Object.fromEntries(plan.goals.map((item) => [item.goalId, item.allocatedMonthlyAmount]));
  assert.deepEqual(amounts(left), amounts(right));
  assert.equal(left.additionalRetirementAllocatedMonthly, right.additionalRetirementAllocatedMonthly);
});

test("FFH-017 material missing goal facts fail closed without assuming zero", () => {
  const unknown = goal("unknown", {
    coreNeedAmount: null,
    remainingCoreNeedAmount: null,
    state: "more_information_needed",
    missingData: ["Core amount required."],
  });
  const plan = buildRecurringGoalRetirementCompetition([unknown], "behind", 500, 1000);
  assert.equal(plan.state, "more_information_needed");
  assert.equal(plan.totalAllocatedMonthly, 0);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 0);
});

test("FFH-017 material missing retirement facts fail closed contested capacity", () => {
  const plan = buildRecurringGoalRetirementCompetition([goal("g")], "more_information_needed", null, 1000);
  assert.equal(plan.state, "more_information_needed");
  assert.equal(plan.totalAllocatedMonthly, 0);
  assert.equal(plan.goals[0].allocatedMonthlyAmount, 0);
});

test("FFH-017 desired excess never becomes goal-core competition demand", () => {
  const value = goal("car", {
    targetAmount: 70000,
    coreNeedAmount: 25000,
    remainingTargetAmount: 70000,
    remainingCoreNeedAmount: 25000,
    monthsRemaining: 25,
  });
  const plan = buildRecurringGoalRetirementCompetition([value], "behind", 1000, 2000);
  assert.equal(plan.goals[0].requestedMonthlyAmount, 1000);
  assert.equal(plan.goals[0].remainingDesiredExcessAmount, 45000);
});

test("FFH-017 important core is below when behind and narrowly co-priority on track", () => {
  const important = goal("important", {
    necessity: "important",
    goalNature: "preservation",
    deadlineFlexibility: "limited",
    consequenceSeverity: "high",
    priorityBand: "medium",
  });
  assert.equal(determineGoalRetirementDisposition(important, "behind"), "BELOW");
  assert.equal(determineGoalRetirementDisposition(important, "on_track"), "CO_PRIORITY");
  assert.equal(determineGoalRetirementDisposition(important, "ahead"), "CO_PRIORITY");
});

test("FFH-017 past-due core does not fabricate catch-up pace", () => {
  const pastDue = goal("past", { monthsRemaining: 0, scheduleState: "past_due" });
  const plan = buildRecurringGoalRetirementCompetition([pastDue], "behind", 500, 1000);
  assert.equal(plan.state, "more_information_needed");
  assert.equal(plan.goals[0].requestedMonthlyAmount, null);
});
