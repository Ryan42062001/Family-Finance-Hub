import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGoalRankingFactors,
  compareGoalRankingFactors,
  evaluateBuildStage,
} from "./money-priority-build.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";

type RawGoal = NonNullable<MoneyPriorityRawSnapshot["goals"]>[number];

function goal(id: string, overrides: Partial<RawGoal> = {}): RawGoal {
  return {
    id,
    name: `Goal ${id}`,
    target_amount: 12000,
    current_amount: 0,
    target_date: "2027-08-30",
    priority: 5,
    goal_class: "major_life_goal",
    necessity: "important",
    deadline_flexibility: "flexible",
    consequence_level: "moderate",
    ...overrides,
  };
}

function raw(goals: RawGoal[], gross: number | null = null): MoneyPriorityRawSnapshot {
  return {
    householdId: "h",
    people: [{ id: "p", display_name: "Adult", relationship: "self", estimated_taxable_compensation_annual: 100000, is_active: true, is_dependent: false }],
    income: [{ id: "i", owner_person_id: "p", monthly_amount: 5000, monthly_gross_amount: gross, is_active: true }],
    expenses: [], accounts: [], debts: [], retirementAccounts: [{
      id: "retirement", owner_person_id: "p", name: "401(k)", account_type: "401k", balance: 0,
      monthly_employee_contribution: 0, monthly_employer_contribution: 0,
      employee_contributed_ytd: 0, employer_contributed_ytd: 0,
      plan_eligible_compensation_annual: 100000, match_status: "fully_captured",
    }], goals,
    insuranceExposures: [], preferences: null,
  };
}

function rank(overrides: Partial<RawGoal>) {
  const value = buildMoneyPrioritySnapshot(raw([goal("rank", overrides)])).goals[0]!;
  return buildGoalRankingFactors(value, value.targetDate ? 12 : null);
}

test("economic tier is lexicographically stronger than every lower-order factor", () => {
  const requiredWorst = rank({ necessity: "required", deadline_flexibility: "flexible", consequence_level: "low", priority: 5 });
  const importantBest = rank({ necessity: "important", deadline_flexibility: "fixed", consequence_level: "high", priority: 1 });
  const optionalBest = rank({ necessity: "optional", goal_class: "lifestyle_optional", deadline_flexibility: "fixed", consequence_level: "high", priority: 1 });
  assert.ok(compareGoalRankingFactors(requiredWorst, importantBest) < 0);
  assert.ok(compareGoalRankingFactors(requiredWorst, optionalBest) < 0);
  assert.ok(compareGoalRankingFactors(importantBest, optionalBest) < 0);
});

test("necessary_protective metadata independently maps to the strongest tier", () => {
  assert.equal(rank({ necessity: "optional", goal_class: "necessary_protective" }).economicTier, "required_protective");
});

test("fixed deadline outranks flexible even when flexible is sooner", () => {
  const fixed = { ...rank({ deadline_flexibility: "fixed" }), monthsRemaining: 8 };
  const flexible = { ...rank({ deadline_flexibility: "flexible" }), monthsRemaining: 3 };
  assert.ok(compareGoalRankingFactors(fixed, flexible) < 0);
});

test("consequence and proximity compare only after higher factors", () => {
  const high = rank({ consequence_level: "high" });
  const moderate = rank({ consequence_level: "moderate" });
  const low = rank({ consequence_level: "low" });
  assert.ok(compareGoalRankingFactors(high, moderate) < 0);
  assert.ok(compareGoalRankingFactors(moderate, low) < 0);
  assert.ok(compareGoalRankingFactors({ ...high, monthsRemaining: 3 }, { ...high, monthsRemaining: 9 }) < 0);
});

test("unknown ranking metadata never outranks known high or fixed metadata", () => {
  assert.ok(compareGoalRankingFactors(rank({ consequence_level: "unknown" }), rank({ consequence_level: "high" })) > 0);
  assert.ok(compareGoalRankingFactors(rank({ deadline_flexibility: "unknown" }), rank({ deadline_flexibility: "fixed" })) > 0);
});

test("lower numeric user priority wins only after economic factors, rigidity, consequence, and proximity", () => {
  assert.ok(compareGoalRankingFactors(rank({ priority: 1 }), rank({ priority: 5 })) < 0);
  assert.ok(compareGoalRankingFactors(
    rank({ necessity: "optional", goal_class: "lifestyle_optional", priority: 1 }),
    rank({ necessity: "required", priority: 5 }),
  ) > 0);
  assert.ok(compareGoalRankingFactors(
    rank({ deadline_flexibility: "flexible", priority: 1 }),
    rank({ deadline_flexibility: "fixed", priority: 5 }),
  ) > 0);
});

test("stable goal id is the final deterministic tie-break", () => {
  assert.ok(compareGoalRankingFactors(rank({ id: "a" }), rank({ id: "b" })) < 0);
});

test("ranking never infers policy from goal-name keywords", () => {
  assert.deepEqual(
    rank({ name: "Medical roof replacement" }),
    rank({ name: "Vacation wedding car" }),
  );
});

test("goal assessment exposes all explainability factors", () => {
  const result = evaluateBuildStage(buildMoneyPrioritySnapshot(raw([goal("g")])), "2026-08-30", undefined, 0);
  assert.deepEqual(result.goals[0]?.rankingFactors, {
    economicTier: "important", deadlineTier: "flexible", consequenceTier: "moderate",
    monthsRemaining: 12, userPriority: 5, stableTieBreaker: "g",
  });
});

test("protected pass covers multiple qualifying goals before any top-up", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw([
    goal("a", { target_amount: 7200, necessity: "required", deadline_flexibility: "flexible" }),
    goal("b", { target_amount: 6000, necessity: "important", deadline_flexibility: "fixed" }),
  ]));
  const result = evaluateBuildStage(snapshot, "2026-08-30", undefined, 700);
  const byId = new Map(result.allocations.map((item) => [item.relatedEntityId, item]));
  assert.equal(byId.get("a")?.allocatedMonthlyAmount, 450);
  assert.equal(byId.get("b")?.allocatedMonthlyAmount, 250);
  assert.equal(byId.get("a")?.protectedAllocatedMonthlyAmount, 450);
  assert.equal(byId.get("b")?.protectedAllocatedMonthlyAmount, 250);
});

test("insufficient protected capacity follows rank order without pro-rata allocation", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw([
    goal("a", { target_amount: 7200, necessity: "required", deadline_flexibility: "flexible" }),
    goal("b", { target_amount: 6000, necessity: "important", deadline_flexibility: "fixed" }),
  ]));
  const result = evaluateBuildStage(snapshot, "2026-08-30", undefined, 500);
  const byId = new Map(result.allocations.map((item) => [item.relatedEntityId, item]));
  assert.equal(byId.get("a")?.allocatedMonthlyAmount, 450);
  assert.equal(byId.get("b")?.allocatedMonthlyAmount, 50);
});

test("required goal reaches full legitimate pace before additional retirement", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw([
    goal("required", { target_amount: 7200, necessity: "required", deadline_flexibility: "flexible" }),
  ], 10000));
  const result = evaluateBuildStage(snapshot, "2026-08-30", undefined, 700);
  const required = result.allocations.find((item) => item.relatedEntityId === "required");
  const retirement = result.allocations.find((item) => item.category === "retirement");
  assert.equal(required?.allocatedMonthlyAmount, 600);
  assert.equal(retirement?.allocatedMonthlyAmount, 100);
});

test("protected important funding precedes retirement, while retirement precedes its top-up", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw([
    goal("important", { target_amount: 6000, necessity: "important", deadline_flexibility: "fixed" }),
  ], 10000));
  const result = evaluateBuildStage(snapshot, "2026-08-30", undefined, 700);
  const important = result.allocations.find((item) => item.relatedEntityId === "important");
  const retirement = result.allocations.find((item) => item.category === "retirement");
  assert.equal(important?.protectedAllocatedMonthlyAmount, 250);
  assert.equal(important?.allocatedMonthlyAmount, 250);
  assert.equal(retirement?.allocatedMonthlyAmount, 450);
});

test("additional retirement beats ordinary optional goal funding", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw([
    goal("optional", { necessity: "optional", goal_class: "lifestyle_optional" }),
  ], 10000));
  const result = evaluateBuildStage(snapshot, "2026-08-30", undefined, 700);
  assert.equal(result.allocations.find((item) => item.category === "retirement")?.allocatedMonthlyAmount, 700);
  assert.equal(result.allocations.find((item) => item.relatedEntityId === "optional")?.allocatedMonthlyAmount, 0);
});

test("missing and invalid dates invent no pace and do not block valid goals", () => {
  const result = evaluateBuildStage(buildMoneyPrioritySnapshot(raw([
    goal("missing", { target_date: null }),
    goal("invalid", { target_date: "2027-02-30" }),
    goal("valid", { target_amount: 1200 }),
  ])), "2026-08-30", undefined, 100);
  assert.equal(result.goals.find((item) => item.goalId === "missing")?.requiredMonthlyPace, null);
  assert.equal(result.goals.find((item) => item.goalId === "invalid")?.requiredMonthlyPace, null);
  assert.equal(result.allocations.find((item) => item.relatedEntityId === "valid")?.allocatedMonthlyAmount, 100);
});

test("fully funded goals consume no recurring capacity", () => {
  const result = evaluateBuildStage(buildMoneyPrioritySnapshot(raw([
    goal("funded", { target_amount: 1000, current_amount: 1000 }),
  ])), "2026-08-30", undefined, 100);
  assert.equal(result.allocations.length, 0);
  assert.equal(result.remainingMonthlyCapacity, 100);
});

test("reversing and shuffling input preserves ranking, allocation, and recommendations", () => {
  const goals = [
    goal("required", { necessity: "required" }),
    goal("important", { necessity: "important", deadline_flexibility: "fixed" }),
    goal("optional", { necessity: "optional", goal_class: "lifestyle_optional", priority: 1 }),
  ];
  const signatures = [goals, [...goals].reverse(), [goals[1]!, goals[2]!, goals[0]!]].map((ordered) => {
    const result = runMoneyPriorityEngine(raw(ordered), "2026-08-30");
    return {
      goals: result.build.goals.map((item) => [item.goalId, item.requiredMonthlyPace, item.rankingFactors]),
      allocations: result.build.allocations.map((item) => [item.category, item.relatedEntityId, item.requestedMonthlyAmount, item.allocatedMonthlyAmount]),
      remaining: result.build.remainingMonthlyCapacity,
      recommendations: result.recommendations.map((item) => item.id),
    };
  });
  assert.deepEqual(signatures[0], signatures[1]);
  assert.deepEqual(signatures[0], signatures[2]);
});

test("allocation accounting is cents-safe and never exceeds capacity or requested pace", () => {
  const result = evaluateBuildStage(buildMoneyPrioritySnapshot(raw([
    goal("a", { target_amount: 100 }), goal("b", { target_amount: 100 }),
  ])), "2026-08-30", undefined, 10.01);
  assert.ok(result.allocations.every((item) => item.allocatedMonthlyAmount >= 0
    && item.allocatedMonthlyAmount <= item.requestedMonthlyAmount
    && item.unfundedMonthlyAmount === Math.round((item.requestedMonthlyAmount - item.allocatedMonthlyAmount) * 100) / 100));
  assert.ok(result.totalAllocatedMonthly <= result.allocationMonthlyCapacity);
  assert.equal(result.remainingMonthlyCapacity, 0);
});

test("Build and residual reconciliation do not mutate normalized or raw snapshots", () => {
  const input = raw([goal("g")]);
  const rawBefore = structuredClone(input);
  const normalized = buildMoneyPrioritySnapshot(input);
  const normalizedBefore = structuredClone(normalized);
  evaluateBuildStage(normalized, "2026-08-30", undefined, 100);
  runMoneyPriorityEngine(input, "2026-08-30");
  assert.deepEqual(input, rawBefore);
  assert.deepEqual(normalized, normalizedBefore);
});
