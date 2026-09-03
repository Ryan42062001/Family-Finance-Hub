import test from "node:test";
import assert from "node:assert/strict";
import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { evaluateGoalIntelligence } from "./money-priority-goal-intelligence.ts";
import { runMoneyPriorityEngine } from "./money-priority-engine.ts";
import { assessRecommendationRefresh } from "./money-priority-recommendation-refresh.ts";
import { runHypotheticalMoneyPriorityEngine } from "./money-priority-hypothetical.ts";

const AS_OF = "2026-09-01";

function goal(id = "goal", overrides: Record<string, unknown> = {}) {
  return {
    id, name: `Goal ${id}`, target_amount: 12000, current_amount: 0,
    target_date: "2027-09-01", priority: 3, goal_class: "other",
    necessity: "important", deadline_flexibility: "somewhat_flexible",
    consequence_level: "moderate", planned_monthly_contribution: 1000,
    core_need_amount: 12000, goal_intelligence_confirmed: true,
    underlying_need: "A stated household need", desired_solution: "The selected solution",
    goal_nature: "preservation", underfunding_consequence: "inconvenience",
    borrowing_likelihood: "unlikely", expected_borrowing_amount: null,
    expected_borrowing_apr: null, ...overrides,
  };
}

function raw(goals: Record<string, unknown>[]): MoneyPriorityRawSnapshot {
  return {
    householdId: "h", people: [],
    income: [{ id: "income", name: "Income", monthly_amount: 8000,
      monthly_gross_amount: 10000, is_variable: false, is_active: true }],
    expenses: [{ id: "expense", name: "Required", category: "housing",
      monthly_amount: 4000, is_essential: true, cash_flow_treatment: "required" }],
    accounts: [], debts: [], retirementAccounts: [], goals, insuranceExposures: [], preferences: {},
  };
}

function intelligence(overrides: Record<string, unknown> = {}) {
  return evaluateGoalIntelligence(buildMoneyPrioritySnapshot(raw([goal("goal", overrides)])), AS_OF)[0];
}

test("essential vehicle need with a reasonable target is high priority", () => {
  const value = intelligence({ necessity: "required", goal_class: "other",
    underlying_need: "Reliable transportation to work", desired_solution: "Used vehicle",
    goal_nature: "preservation", underfunding_consequence: "employment_disruption",
    consequence_level: "high", core_need_amount: 24000, target_amount: 24000 });
  assert.equal(value.necessity, "essential"); assert.equal(value.priorityBand, "high");
  assert.equal(value.targetReasonableness, "reasonable");
});

test("essential $70k vehicle keeps the $25k core need distinct", () => {
  const value = intelligence({ necessity: "required", target_amount: 70000,
    core_need_amount: 25000, target_date: "2028-03-01", underlying_need: "Reliable transportation",
    desired_solution: "$70,000 vehicle", goal_nature: "mixed",
    underfunding_consequence: "employment_disruption", consequence_level: "high",
    borrowing_likelihood: "likely", expected_borrowing_amount: 45000,
    expected_borrowing_apr: 10 });
  assert.equal(value.necessity, "essential"); assert.equal(value.coreNeedAmount, 25000);
  assert.equal(value.targetReasonableness, "potentially_high");
  assert.ok(value.reasonCodes.includes("desired_solution_exceeds_core_need"));
});

test("essential roof preservation receives high intelligence", () => {
  const value = intelligence({ necessity: "required", goal_nature: "preservation",
    underlying_need: "Keep the home weather-tight", underfunding_consequence: "housing_disruption",
    consequence_level: "critical" });
  assert.equal(value.priorityBand, "high"); assert.equal(value.consequenceSeverity, "critical");
});

test("optional cosmetic remodel remains discretionary", () => {
  const value = intelligence({ necessity: "optional", goal_nature: "improvement",
    underlying_need: "Cosmetic preference", underfunding_consequence: "safely_delay",
    consequence_level: "low" });
  assert.equal(value.priorityBand, "discretionary");
});

test("important flexible goal is medium priority", () => {
  const value = intelligence({ necessity: "important", deadline_flexibility: "flexible",
    goal_nature: "improvement", consequence_level: "moderate" });
  assert.equal(value.priorityBand, "medium");
});

test("optional fixed deadline does not become essential", () => {
  const value = intelligence({ necessity: "optional", deadline_flexibility: "fixed",
    goal_nature: "improvement", consequence_level: "low" });
  assert.equal(value.necessity, "optional"); assert.equal(value.priorityBand, "discretionary");
});

test("fixed essential deadline retains strong urgency evidence", () => {
  const value = intelligence({ necessity: "required", deadline_flexibility: "fixed" });
  assert.equal(value.priorityBand, "high"); assert.ok(value.reasonCodes.includes("deadline_fixed"));
});

test("somewhat flexible maps to limited", () => assert.equal(intelligence().deadlineFlexibility, "limited"));
test("flexible deadline remains flexible", () => assert.equal(intelligence({ deadline_flexibility: "flexible" }).deadlineFlexibility, "flexible"));

test("fully funded goal requires zero monthly funding", () => {
  const value = intelligence({ current_amount: 12000 });
  assert.equal(value.remainingTargetAmount, 0); assert.equal(value.requiredMonthlyFunding, 0);
  assert.equal(value.scheduleState, "funded");
});

test("partially funded dated goal calculates calendar-month funding", () => {
  const value = intelligence({ target_amount: 24000, current_amount: 6000,
    core_need_amount: 24000, target_date: "2029-09-01" });
  assert.equal(value.monthsRemaining, 36); assert.equal(value.requiredMonthlyFunding, 500);
});

test("unfunded dated goal calculates required funding", () => assert.equal(intelligence().requiredMonthlyFunding, 1000));
test("past-due funded goal is funded", () => assert.equal(intelligence({ current_amount: 12000, target_date: "2026-08-01" }).scheduleState, "funded"));
test("past-due unfunded goal has no fabricated monthly pace", () => {
  const value = intelligence({ target_date: "2026-08-01" });
  assert.equal(value.scheduleState, "past_due"); assert.equal(value.requiredMonthlyFunding, null);
});
test("same-day unfunded deadline is past due", () => assert.equal(intelligence({ target_date: AS_OF }).scheduleState, "past_due"));
test("planned pace at requirement is on track", () => assert.equal(intelligence().scheduleState, "on_track"));
test("planned pace below requirement is behind", () => assert.equal(intelligence({ planned_monthly_contribution: 999.99 }).scheduleState, "behind"));
test("missing planned pace keeps schedule state separate from priority", () => {
  const value = intelligence({ planned_monthly_contribution: null });
  assert.equal(value.scheduleState, "more_information_needed"); assert.equal(value.priorityBand, "high");
});
test("core need zero is valid", () => assert.equal(intelligence({ core_need_amount: 0 }).coreNeedAmount, 0));
test("core need equal to target is reasonable", () => assert.equal(intelligence().targetReasonableness, "reasonable"));

test("core need above target is rejected", () => {
  assert.throws(() => buildMoneyPrioritySnapshot(raw([goal("bad", { core_need_amount: 12001 })])));
});

test("missing essential core need creates material uncertainty", () => {
  const value = intelligence({ necessity: "required", core_need_amount: null });
  assert.equal(value.state, "more_information_needed");
  assert.ok(value.missingData.some((item) => item.includes("core-need")));
});

test("low concrete consequence remains low", () => assert.equal(intelligence({ consequence_level: "low" }).consequenceSeverity, "low"));
test("employment consequence remains explicit", () => assert.equal(intelligence({ underfunding_consequence: "employment_disruption", consequence_level: "high" }).underfundingConsequence, "employment_disruption"));
test("housing safety consequence supports critical severity", () => assert.equal(intelligence({ underfunding_consequence: "health_safety", consequence_level: "critical" }).consequenceSeverity, "critical"));

test("likely high-cost debt is high exposure for an essential need", () => {
  const value = intelligence({ necessity: "required", borrowing_likelihood: "likely",
    expected_borrowing_amount: 18000, expected_borrowing_apr: 10 });
  assert.equal(value.debtExposure, "high");
});

test("optional financed vacation remains discretionary", () => {
  const value = intelligence({ necessity: "optional", goal_nature: "improvement",
    target_amount: 10000, core_need_amount: 0, deadline_flexibility: "fixed",
    underfunding_consequence: "likely_financing", consequence_level: "moderate",
    borrowing_likelihood: "likely", expected_borrowing_amount: 10000,
    expected_borrowing_apr: 24 });
  assert.equal(value.priorityBand, "discretionary");
  assert.ok(value.reasonCodes.includes("optional_borrowing_does_not_raise_necessity"));
});

test("missing likely-financing facts are conservative", () => {
  const value = intelligence({ borrowing_likelihood: "likely",
    expected_borrowing_amount: null, expected_borrowing_apr: null });
  assert.equal(value.debtExposure, "unknown"); assert.equal(value.state, "more_information_needed");
});

test("preservation outranks comparable important improvement", () => {
  const values = evaluateGoalIntelligence(buildMoneyPrioritySnapshot(raw([
    goal("improve", { goal_nature: "improvement" }),
    goal("preserve", { goal_nature: "preservation" }),
  ])), AS_OF);
  assert.deepEqual(values.map((item) => item.goalId), ["preserve", "improve"]);
});

test("category alone does not determine necessity", () => {
  const optionalHome = intelligence({ goal_class: "home_purchase", necessity: "optional" });
  const essentialOther = intelligence({ goal_class: "other", necessity: "required" });
  assert.equal(optionalHome.necessity, "optional"); assert.equal(essentialOther.necessity, "essential");
});

test("three-goal scenario yields 500, 300, and 250 without allocating by intelligence", () => {
  const snapshot = raw([
    goal("vehicle", { target_amount: 24000, current_amount: 6000, core_need_amount: 24000,
      target_date: "2029-09-01", planned_monthly_contribution: 500, necessity: "required",
      deadline_flexibility: "somewhat_flexible", underfunding_consequence: "employment_disruption",
      consequence_level: "high", borrowing_likelihood: "likely", expected_borrowing_amount: 18000,
      expected_borrowing_apr: 10 }),
    goal("home", { target_amount: 9000, core_need_amount: 9000, target_date: "2029-03-01",
      planned_monthly_contribution: 300, necessity: "important", deadline_flexibility: "flexible",
      goal_nature: "improvement", consequence_level: "moderate" }),
    goal("vacation", { target_amount: 6000, core_need_amount: 0, target_date: "2028-09-01",
      planned_monthly_contribution: 250, necessity: "optional", deadline_flexibility: "fixed",
      goal_nature: "improvement", consequence_level: "low" }),
  ]);
  const engine = runMoneyPriorityEngine(snapshot, AS_OF);
  const byId = new Map(engine.build.goalIntelligence.map((item) => [item.goalId, item]));
  assert.equal(byId.get("vehicle")?.requiredMonthlyFunding, 500);
  assert.equal(byId.get("home")?.requiredMonthlyFunding, 300);
  assert.equal(byId.get("vacation")?.requiredMonthlyFunding, 250);
  assert.deepEqual(engine.build.goalIntelligence.map((item) => item.priorityBand), ["high", "medium", "discretionary"]);
});

test("funding percentage alone does not control priority", () => {
  const values = evaluateGoalIntelligence(buildMoneyPrioritySnapshot(raw([
    goal("optional-90", { necessity: "optional", goal_nature: "improvement", current_amount: 10800 }),
    goal("essential-10", { necessity: "required", current_amount: 1200 }),
  ])), AS_OF);
  assert.equal(values[0].goalId, "essential-10");
});

test("legacy goal defaults are not accepted as confirmed intelligence", () => {
  const { goal_intelligence_confirmed: _confirmation, ...legacy } = goal("legacy");
  assert.equal(_confirmation, true);
  const value = evaluateGoalIntelligence(buildMoneyPrioritySnapshot(raw([legacy])), AS_OF)[0];
  assert.equal(value.priorityBand, "unclassified"); assert.equal(value.state, "more_information_needed");
});

test("goal intelligence never counts protected reserve as saved goal money", () => {
  const value = raw([goal()]);
  value.accounts = [{ id: "reserve", name: "Reserve", account_type: "savings",
    balance: 12000, cash_purpose: "protected_reserve" }];
  const result = evaluateGoalIntelligence(buildMoneyPrioritySnapshot(value), AS_OF)[0];
  assert.equal(result.eligibleSavedAmount, 0); assert.equal(result.remainingTargetAmount, 12000);
});

test("goal intelligence evaluation does not mutate the snapshot", () => {
  const snapshot = buildMoneyPrioritySnapshot(raw([goal()]));
  const before = structuredClone(snapshot);
  evaluateGoalIntelligence(snapshot, AS_OF);
  assert.deepEqual(snapshot, before);
});

test("collection order cannot change entity-level intelligence", () => {
  const source = raw([goal("b"), goal("a")]);
  const reversed = structuredClone(source); reversed.goals = [...reversed.goals!].reverse();
  assert.deepEqual(runMoneyPriorityEngine(source, AS_OF).build.goalIntelligence,
    runMoneyPriorityEngine(reversed, AS_OF).build.goalIntelligence);
});

test("stable ID terminates a complete intelligence tie", () => {
  const values = evaluateGoalIntelligence(buildMoneyPrioritySnapshot(raw([goal("b"), goal("a")])), AS_OF);
  assert.deepEqual(values.map((item) => item.goalId), ["a", "b"]);
});

test("material goal metadata changes Recommendation Refresh", () => {
  const before = runMoneyPriorityEngine(raw([goal()]), AS_OF);
  const changed = raw([goal("goal", { necessity: "required" })]);
  assert.equal(assessRecommendationRefresh(before, runMoneyPriorityEngine(changed, AS_OF)).state,
    "materially_changed");
});

test("goal collection reorder remains current in Recommendation Refresh", () => {
  const source = raw([goal("a"), goal("b")]);
  const reordered = structuredClone(source); reordered.goals = [...reordered.goals!].reverse();
  assert.equal(assessRecommendationRefresh(runMoneyPriorityEngine(source, AS_OF),
    runMoneyPriorityEngine(reordered, AS_OF)).state, "current");
});

test("hypothetical rerun preserves Goal Intelligence metadata", () => {
  const before = runMoneyPriorityEngine(raw([goal("goal", { target_amount: 10000,
    core_need_amount: 6000 })]), AS_OF);
  const rerun = runHypotheticalMoneyPriorityEngine(before, { completeGoalIds: ["goal"] });
  const completed = rerun.engine.build.goalIntelligence[0];
  assert.equal(completed.coreNeedAmount, 6000); assert.equal(completed.scheduleState, "funded");
});

test("Phase 5B metadata does not alter existing Build allocation economics", () => {
  const { goal_intelligence_confirmed: _confirmation, ...legacyGoal } = goal("goal");
  assert.equal(_confirmation, true);
  const confirmedGoal = { ...legacyGoal, goal_intelligence_confirmed: true,
    underlying_need: "Need", desired_solution: "Solution", goal_nature: "preservation",
    underfunding_consequence: "inconvenience", borrowing_likelihood: "unlikely" };
  const before = runMoneyPriorityEngine(raw([legacyGoal]), AS_OF).build.allocations;
  const after = runMoneyPriorityEngine(raw([confirmedGoal]), AS_OF).build.allocations;
  assert.deepEqual(after, before);
});

for (const [field, value] of [
  ["goal_nature", "category_magic"],
  ["underfunding_consequence", "catastrophe"],
  ["borrowing_likelihood", "yes"],
  ["consequence_level", "severe"],
] as const) test(`strict enum validation rejects ${field}`, () => {
  assert.throws(() => buildMoneyPrioritySnapshot(raw([goal("bad", { [field]: value })])));
});

for (const [field, value] of [
  ["expected_borrowing_amount", " "],
  ["expected_borrowing_amount", false],
  ["expected_borrowing_apr", {}],
  ["expected_borrowing_apr", Number.POSITIVE_INFINITY],
] as const) test(`strict numeric validation rejects malformed ${field} ${String(value)}`, () => {
  assert.throws(() => buildMoneyPrioritySnapshot(raw([goal("bad", { [field]: value })])));
});

test("optional future expense stays a planned goal rather than a Secure emergency", () => {
  const engine = runMoneyPriorityEngine(raw([goal("roof", { necessity: "required",
    target_date: "2028-03-01", underfunding_consequence: "housing_disruption",
    consequence_level: "high" })]), AS_OF);
  assert.ok(engine.build.goalIntelligence.some((item) => item.goalId === "roof"));
  assert.ok(!engine.secure.recommendations.some((item) => item.relatedEntityId === "roof"));
});

test("Recommended Plan result remains immutable during intelligence inspection", () => {
  const engine = runMoneyPriorityEngine(raw([goal()]), AS_OF);
  const before = structuredClone(engine);
  void engine.build.goalIntelligence[0];
  assert.deepEqual(engine, before);
});
