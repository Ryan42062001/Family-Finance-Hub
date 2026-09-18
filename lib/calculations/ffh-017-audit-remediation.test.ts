import test from "node:test";
import assert from "node:assert/strict";
import { buildRecurringGoalRetirementCompetition } from "./money-priority-build-competition.ts";
import type { GoalIntelligenceResult } from "./money-priority-goal-intelligence.ts";
import {
  consumeRetirementCapacityRecurringMonthly,
  retirementCapacityInvariantHolds,
  type RetirementCapacityLedger,
} from "./money-priority-retirement-capacity.ts";

function goal(id: string, overrides: Partial<GoalIntelligenceResult> = {}): GoalIntelligenceResult {
  return {
    goalId: id, goalName: id, goalClass: "other", underlyingNeed: "need", desiredSolution: "solution",
    necessity: "essential", goalNature: "preservation", deadline: "2027-09-01", deadlineFlexibility: "fixed",
    targetAmount: 12000, coreNeedAmount: 12000, eligibleSavedAmount: 0, remainingTargetAmount: 12000,
    remainingCoreNeedAmount: 12000, percentFunded: 0, monthsRemaining: 12, requiredMonthlyFunding: 1000,
    plannedMonthlyContribution: 0, scheduleState: "behind", underfundingConsequence: "material",
    consequenceSeverity: "high", borrowingLikelihood: "unlikely", expectedBorrowingAmount: null,
    expectedBorrowingApr: null, debtExposure: "none", targetReasonableness: "reasonable", priorityBand: "high",
    state: "calculated", missingData: [], reasonCodes: [], explanations: [], stableTieBreaker: id, ...overrides,
  };
}

function core(plan: ReturnType<typeof buildRecurringGoalRetirementCompetition>, id: string) {
  return plan.goals.find((item) => item.goalId === id && item.trancheType === "core")!;
}
function excess(plan: ReturnType<typeof buildRecurringGoalRetirementCompetition>, id: string) {
  return plan.goals.find((item) => item.goalId === id && item.trancheType === "desired_excess")!;
}

test("R01 Optional unknown core amount stays local while verified retirement allocates", () => {
  const optional = goal("optional", { necessity: "optional", goalNature: "improvement", coreNeedAmount: null, remainingCoreNeedAmount: null, state: "calculated" });
  const plan = buildRecurringGoalRetirementCompetition([optional], "on_track", 500, 1000);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 500);
  assert.equal(core(plan, "optional").disposition, "BELOW");
  assert.equal(core(plan, "optional").requestedMonthlyAmount, null);
  assert.equal(core(plan, "optional").allocatedMonthlyAmount, 0);
  assert.equal(plan.remainingMonthlyCapacity, 500);
});

test("R01 Optional irrelevant missing borrowing detail cannot suppress retirement", () => {
  const optional = goal("optional", { necessity: "optional", goalNature: "improvement", targetAmount: 1200, coreNeedAmount: 1200, remainingTargetAmount: 1200, remainingCoreNeedAmount: 1200, requiredMonthlyFunding: 100, borrowingLikelihood: "likely", debtExposure: "moderate", state: "more_information_needed", missingData: ["Expected borrowing amount and APR are required to quantify likely financing exposure."] });
  const plan = buildRecurringGoalRetirementCompetition([optional], "on_track", 500, 1000);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 500);
  assert.equal(core(plan, "optional").disposition, "BELOW");
  assert.equal(core(plan, "optional").allocatedMonthlyAmount, 100);
  assert.equal(plan.remainingMonthlyCapacity, 400);
});

test("R01 unconfirmed legacy goal does not freeze verified retirement or known goal", () => {
  const legacy = goal("legacy", { necessity: "unknown", coreNeedAmount: null, remainingCoreNeedAmount: null, state: "more_information_needed", missingData: ["Confirm the goal-intelligence details; legacy defaults are not treated as user evidence."] });
  const outrank = goal("known", { targetAmount: 2400, coreNeedAmount: 2400, remainingTargetAmount: 2400, remainingCoreNeedAmount: 2400, requiredMonthlyFunding: 200 });
  const plan = buildRecurringGoalRetirementCompetition([legacy, outrank], "on_track", 300, 600);
  assert.equal(core(plan, "legacy").disposition, "BELOW");
  assert.equal(core(plan, "legacy").allocatedMonthlyAmount, 0);
  assert.equal(core(plan, "known").allocatedMonthlyAmount, 200);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 300);
  assert.equal(plan.remainingMonthlyCapacity, 100);
});

test("R01 lower-priority unknown cannot suppress known OUTRANK", () => {
  const optionalUnknown = goal("unknown-low", { necessity: "optional", coreNeedAmount: null, remainingCoreNeedAmount: null, goalNature: "improvement", state: "calculated" });
  const known = goal("out", { targetAmount: 4800, coreNeedAmount: 4800, remainingTargetAmount: 4800, remainingCoreNeedAmount: 4800, requiredMonthlyFunding: 400 });
  const plan = buildRecurringGoalRetirementCompetition([optionalUnknown, known], "on_track", 400, 800);
  assert.equal(core(plan, "out").disposition, "OUTRANKS");
  assert.equal(core(plan, "out").allocatedMonthlyAmount, 400);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 400);
});

test("R01 lower-priority unknown cannot suppress known CO_PRIORITY", () => {
  const optionalUnknown = goal("unknown-low", { necessity: "optional", coreNeedAmount: null, remainingCoreNeedAmount: null, goalNature: "improvement", state: "calculated" });
  const known = goal("co", { targetAmount: 7200, coreNeedAmount: 7200, remainingTargetAmount: 7200, remainingCoreNeedAmount: 7200, requiredMonthlyFunding: 600, deadlineFlexibility: "limited", consequenceSeverity: "moderate" });
  const plan = buildRecurringGoalRetirementCompetition([optionalUnknown, known], "on_track", 400, 1000);
  assert.equal(core(plan, "co").disposition, "CO_PRIORITY");
  assert.equal(core(plan, "co").allocatedMonthlyAmount, 600);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 400);
  assert.equal(plan.remainingMonthlyCapacity, 0);
});

test("R04 higher-ranked unresolved Essential OUTRANK peer keeps scarce Bucket-1 capacity unresolved", () => {
  const known = goal("known-high", {
    targetAmount: 2400, coreNeedAmount: 2400, remainingTargetAmount: 2400,
    remainingCoreNeedAmount: 2400, requiredMonthlyFunding: 200, consequenceSeverity: "high",
  });
  const unresolved = goal("unresolved-critical", {
    coreNeedAmount: null, remainingCoreNeedAmount: null, consequenceSeverity: "critical",
    state: "more_information_needed", missingData: ["Confirm the remaining core amount."],
  });
  const plan = buildRecurringGoalRetirementCompetition([known, unresolved], "on_track", 100, 200);
  assert.equal(plan.state, "more_information_needed");
  assert.equal(core(plan, "known-high").disposition, "OUTRANKS");
  assert.equal(core(plan, "known-high").allocatedMonthlyAmount, 0);
  assert.equal(core(plan, "unresolved-critical").disposition, "MORE_INFORMATION_NEEDED");
  assert.equal(core(plan, "unresolved-critical").requestedMonthlyAmount, null);
  assert.equal(core(plan, "unresolved-critical").allocatedMonthlyAmount, 0);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 0);
  assert.equal(plan.totalAllocatedMonthly, 0);
  assert.equal(plan.remainingMonthlyCapacity, 200);
});

test("R04 Essential uncertainty provably unable to become OUTRANK does not block independent OUTRANK", () => {
  const known = goal("known", {
    targetAmount: 2400, coreNeedAmount: 2400, remainingTargetAmount: 2400,
    remainingCoreNeedAmount: 2400, requiredMonthlyFunding: 200,
  });
  const unresolved = goal("co-only", {
    deadlineFlexibility: "limited", consequenceSeverity: "moderate", debtExposure: "none",
    coreNeedAmount: null, remainingCoreNeedAmount: null, state: "more_information_needed",
    missingData: ["Confirm the remaining core amount."],
  });
  const plan = buildRecurringGoalRetirementCompetition([known, unresolved], "on_track", 100, 400);
  assert.equal(core(plan, "known").allocatedMonthlyAmount, 200);
  assert.equal(core(plan, "co-only").disposition, "MORE_INFORMATION_NEEDED");
  assert.equal(core(plan, "co-only").requestedMonthlyAmount, null);
  assert.equal(core(plan, "co-only").allocatedMonthlyAmount, 0);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 0);
  assert.equal(plan.remainingMonthlyCapacity, 200);
});

test("R04 unresolved Important goal cannot block an independent OUTRANK allocation", () => {
  const known = goal("known", {
    targetAmount: 2400, coreNeedAmount: 2400, remainingTargetAmount: 2400,
    remainingCoreNeedAmount: 2400, requiredMonthlyFunding: 200,
  });
  const unresolved = goal("important", {
    necessity: "important", goalNature: "unknown", deadlineFlexibility: "fixed",
    consequenceSeverity: "high", targetAmount: 1200, coreNeedAmount: 1200,
    remainingTargetAmount: 1200, remainingCoreNeedAmount: 1200, requiredMonthlyFunding: 100,
    state: "more_information_needed",
    missingData: ["Specify whether the goal preserves a function, improves it, or contains both."],
  });
  const plan = buildRecurringGoalRetirementCompetition([known, unresolved], "on_track", 100, 500);
  assert.equal(core(plan, "known").allocatedMonthlyAmount, 200);
  assert.equal(core(plan, "important").disposition, "MORE_INFORMATION_NEEDED");
  assert.equal(core(plan, "important").allocatedMonthlyAmount, 0);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 0);
  assert.equal(plan.remainingMonthlyCapacity, 300);
});

test("R04 senior known OUTRANK remains actionable ahead of a lower-ranked unresolved OUTRANK peer", () => {
  const known = goal("known-critical", {
    targetAmount: 2400, coreNeedAmount: 2400, remainingTargetAmount: 2400,
    remainingCoreNeedAmount: 2400, requiredMonthlyFunding: 200, consequenceSeverity: "critical",
  });
  const unresolved = goal("unresolved-high", {
    coreNeedAmount: null, remainingCoreNeedAmount: null, consequenceSeverity: "high",
    state: "more_information_needed", missingData: ["Confirm the remaining core amount."],
  });
  const plan = buildRecurringGoalRetirementCompetition([known, unresolved], "on_track", 100, 200);
  assert.equal(core(plan, "known-critical").allocatedMonthlyAmount, 200);
  assert.equal(core(plan, "unresolved-high").disposition, "MORE_INFORMATION_NEEDED");
  assert.equal(core(plan, "unresolved-high").allocatedMonthlyAmount, 0);
  assert.equal(plan.remainingMonthlyCapacity, 0);
});

test("R04 higher-ranked unresolved peer reserves only its bounded maximum before known OUTRANK allocation", () => {
  const known = goal("known-high", {
    targetAmount: 2400, coreNeedAmount: 2400, remainingTargetAmount: 2400,
    remainingCoreNeedAmount: 2400, requiredMonthlyFunding: 200, consequenceSeverity: "high",
  });
  const unresolved = goal("bounded-critical", {
    targetAmount: 1000, coreNeedAmount: null, remainingTargetAmount: 1000,
    remainingCoreNeedAmount: null, monthsRemaining: 10, requiredMonthlyFunding: 100,
    consequenceSeverity: "critical", state: "more_information_needed",
    missingData: ["Confirm the remaining core amount."],
  });
  const plan = buildRecurringGoalRetirementCompetition([known, unresolved], "on_track", 100, 300);
  assert.equal(core(plan, "known-high").allocatedMonthlyAmount, 200);
  assert.equal(core(plan, "bounded-critical").requestedMonthlyAmount, null);
  assert.equal(core(plan, "bounded-critical").allocatedMonthlyAmount, 0);
  assert.equal(plan.remainingMonthlyCapacity, 100);
});

test("R01 genuinely material Essential unknown remains fail-closed for contested capacity", () => {
  const material = goal("material", { coreNeedAmount: null, remainingCoreNeedAmount: null });
  const plan = buildRecurringGoalRetirementCompetition([material], "on_track", 500, 1000);
  assert.equal(plan.state, "more_information_needed");
  assert.equal(core(plan, "material").disposition, "MORE_INFORMATION_NEEDED");
  assert.equal(plan.additionalRetirementAllocatedMonthly, 0);
  assert.equal(plan.totalAllocatedMonthly, 0);
  assert.equal(plan.remainingMonthlyCapacity, 1000);
});

test("R01 genuinely material Important unknown remains fail-closed when it can change co-priority", () => {
  const material = goal("important", { necessity: "important", goalNature: "unknown", deadlineFlexibility: "fixed", consequenceSeverity: "high", state: "more_information_needed", missingData: ["Specify whether the goal preserves a function, improves it, or contains both."] });
  const plan = buildRecurringGoalRetirementCompetition([material], "on_track", 500, 1000);
  assert.equal(core(plan, "important").disposition, "MORE_INFORMATION_NEEDED");
  assert.equal(plan.additionalRetirementAllocatedMonthly, 0);
  assert.equal(plan.remainingMonthlyCapacity, 1000);
});

function ordinaryLedger(room: number): RetirementCapacityLedger {
  return {
    taxYear: 2026, taxPolicyVersion: "test", groups: [], entries: [{
      accountId: "work", accountType: "401k", ownerPersonId: "p", sharedCapacityGroup: null, ownerCapacityGroup: null,
      verified: true, informationNeeded: [], originalRemainingAnnualRoom: room, remainingAnnualRoom: room,
      employeeElectiveDeferralRemainingRoom: room, annualAdditionsRemainingRoom: null, compensationBasedRemainingRoom: null,
      sharedCapacityRemainingRoom: null, sharedOrdinaryRemainingRoom: null, catchUpRemainingRoom: 0,
      accountSpecificRemainingRoom: room, plannedReservationAnnual: 0,
      consumed: { scheduled: 0, one_time: 0, secure: 0, build: 0, windfall: 0 },
    }],
  };
}

test("R02 ordinary recurring conversion floors annual cents to exact full-year monthly authority", () => {
  const cases = [
    { room: 0.06, monthly: 0, annual: 0, remainder: 0.06 },
    { room: 0.11, monthly: 0, annual: 0, remainder: 0.11 },
    { room: 0.12, monthly: 0.01, annual: 0.12, remainder: 0 },
    { room: 0.13, monthly: 0.01, annual: 0.12, remainder: 0.01 },
    { room: 0.23, monthly: 0.01, annual: 0.12, remainder: 0.11 },
    { room: 0.24, monthly: 0.02, annual: 0.24, remainder: 0 },
    { room: 0.25, monthly: 0.02, annual: 0.24, remainder: 0.01 },
  ];
  for (const expected of cases) {
    const ledger = ordinaryLedger(expected.room);
    const allocation = consumeRetirementCapacityRecurringMonthly(ledger, "work", "build", null);
    assert.equal(allocation.allocatedMonthlyAmount, expected.monthly, "monthly room " + expected.room);
    assert.equal(allocation.consumedAnnualAmount, expected.annual, "annual room " + expected.room);
    assert.equal(allocation.remainingAnnualRoom, expected.remainder, "remainder " + expected.room);
    assert.equal(Math.round(allocation.allocatedMonthlyAmount * 100) * 12, Math.round(allocation.consumedAnnualAmount * 100));
    assert.ok(retirementCapacityInvariantHolds(ledger));
  }
});

test("R02 $0.06 annual room can never present $0.01 per month", () => {
  const ledger = ordinaryLedger(0.06);
  const allocation = consumeRetirementCapacityRecurringMonthly(ledger, "work", "build", 0.01);
  assert.equal(allocation.allocatedMonthlyAmount, 0);
  assert.equal(allocation.consumedAnnualAmount, 0);
  assert.equal(allocation.remainingAnnualRoom, 0.06);
});

test("R03 Scenario 8 emits core-satisfied desired excess as a separate BELOW tranche", () => {
  const scenario8 = goal("scenario8", { targetAmount: 15000, coreNeedAmount: 5000, eligibleSavedAmount: 6000, remainingTargetAmount: 9000, remainingCoreNeedAmount: 0, percentFunded: 0.4, monthsRemaining: 10, requiredMonthlyFunding: 900 });
  const plan = buildRecurringGoalRetirementCompetition([scenario8], "on_track", 400, 1500);
  assert.equal(core(plan, "scenario8").requestedMonthlyAmount, 0);
  assert.equal(excess(plan, "scenario8").disposition, "BELOW");
  assert.equal(excess(plan, "scenario8").requestedMonthlyAmount, 900);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 400);
  assert.equal(excess(plan, "scenario8").allocatedMonthlyAmount, 900);
  assert.equal(plan.totalAllocatedMonthly, 1300);
  assert.equal(plan.remainingMonthlyCapacity, 200);
});

test("R03 mixed core-retirement-excess case conserves all $1,600 exactly", () => {
  const mixed = goal("mixed", { targetAmount: 12000, coreNeedAmount: 6000, remainingTargetAmount: 12000, remainingCoreNeedAmount: 6000, monthsRemaining: 10, requiredMonthlyFunding: 1200 });
  const plan = buildRecurringGoalRetirementCompetition([mixed], "on_track", 400, 1600);
  assert.equal(core(plan, "mixed").disposition, "OUTRANKS");
  assert.equal(core(plan, "mixed").requestedMonthlyAmount, 600);
  assert.equal(core(plan, "mixed").allocatedMonthlyAmount, 600);
  assert.equal(plan.additionalRetirementAllocatedMonthly, 400);
  assert.equal(excess(plan, "mixed").disposition, "BELOW");
  assert.equal(excess(plan, "mixed").requestedMonthlyAmount, 600);
  assert.equal(excess(plan, "mixed").allocatedMonthlyAmount, 600);
  assert.equal(plan.totalAllocatedMonthly, 1600);
  assert.equal(plan.remainingMonthlyCapacity, 0);
});
