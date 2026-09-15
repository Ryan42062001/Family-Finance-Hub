import type {
  GoalConsequenceSeverity,
  GoalDeadlineFlexibility,
  GoalDebtExposure,
  GoalIntelligenceResult,
  GoalNature,
  GoalNecessity,
} from "./money-priority-goal-intelligence.ts";
import type { HybridRetirementStatus } from "./money-priority-retirement-floor.ts";

export type BuildCompetitionDisposition =
  | "OUTRANKS"
  | "CO_PRIORITY"
  | "BELOW"
  | "MORE_INFORMATION_NEEDED";

export type BuildCompetitionGoalTranche = {
  goalId: string;
  goalName: string;
  disposition: BuildCompetitionDisposition;
  requestedMonthlyAmount: number | null;
  allocatedMonthlyAmount: number;
  unfundedMonthlyAmount: number | null;
  remainingCoreNeedAmount: number | null;
  remainingDesiredExcessAmount: number;
  missingData: string[];
  stableTieBreaker: string;
};

export type BuildCompetitionPlan = {
  state: "calculated" | "more_information_needed";
  availableMonthlyCapacity: number;
  additionalRetirementRequestedMonthly: number | null;
  additionalRetirementAllocatedMonthly: number;
  additionalRetirementUnfundedMonthly: number | null;
  goals: BuildCompetitionGoalTranche[];
  totalAllocatedMonthly: number;
  remainingMonthlyCapacity: number;
  missingData: string[];
};

export type BuildCompetitionOptions = {
  goalUserPriorityById?: ReadonlyMap<string, number>;
};

function toCents(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

function fromCents(value: number): number {
  return value / 100;
}

function roundMoney(value: number): number {
  return fromCents(toCents(value));
}

function isHighOrCritical(value: GoalConsequenceSeverity): boolean {
  return value === "high" || value === "critical";
}

function isModerateOrHigherConsequence(value: GoalConsequenceSeverity): boolean {
  return value === "moderate" || value === "high" || value === "critical";
}

function isModerateOrHigherDebt(value: GoalDebtExposure): boolean {
  return value === "moderate" || value === "high";
}

function hasUsableRecurringPace(goal: GoalIntelligenceResult): boolean {
  return goal.remainingCoreNeedAmount === 0
    || (goal.monthsRemaining !== null && goal.monthsRemaining > 0);
}

export function determineGoalRetirementDisposition(
  goal: GoalIntelligenceResult,
  retirementStatus: HybridRetirementStatus,
): BuildCompetitionDisposition {
  if (goal.remainingTargetAmount <= 0 || goal.remainingCoreNeedAmount === 0) return "BELOW";
  if (retirementStatus === "more_information_needed") return "MORE_INFORMATION_NEEDED";
  if (
    goal.state === "more_information_needed"
    || goal.necessity === "unknown"
    || goal.coreNeedAmount === null
    || goal.remainingCoreNeedAmount === null
    || !hasUsableRecurringPace(goal)
  ) {
    return "MORE_INFORMATION_NEEDED";
  }

  if (goal.necessity === "optional") return "BELOW";

  if (goal.necessity === "essential") {
    const materialUrgency = goal.deadlineFlexibility === "fixed" || goal.consequenceSeverity === "critical";
    const materialHarm = isHighOrCritical(goal.consequenceSeverity) || goal.debtExposure === "high";
    if (materialUrgency && materialHarm) return "OUTRANKS";

    if (
      goal.deadlineFlexibility === "limited"
      || isModerateOrHigherConsequence(goal.consequenceSeverity)
      || isModerateOrHigherDebt(goal.debtExposure)
    ) {
      return "CO_PRIORITY";
    }
    return "BELOW";
  }

  if (goal.necessity === "important") {
    if (retirementStatus === "behind") return "BELOW";
    const preservationLike = goal.goalNature === "preservation" || goal.goalNature === "mixed";
    const urgentEnough = goal.deadlineFlexibility === "fixed" || goal.deadlineFlexibility === "limited";
    if (preservationLike && urgentEnough && isHighOrCritical(goal.consequenceSeverity)) {
      return "CO_PRIORITY";
    }
    return "BELOW";
  }

  return "MORE_INFORMATION_NEEDED";
}

function goalRequestMonthly(goal: GoalIntelligenceResult): number | null {
  if (goal.remainingCoreNeedAmount === null) return null;
  if (goal.remainingCoreNeedAmount <= 0) return 0;
  if (goal.monthsRemaining === null || goal.monthsRemaining <= 0) return null;
  return roundMoney(goal.remainingCoreNeedAmount / goal.monthsRemaining);
}

const DEADLINE_ORDER: Record<GoalDeadlineFlexibility, number> = {
  fixed: 1,
  limited: 2,
  flexible: 3,
  unknown: 4,
};
const CONSEQUENCE_ORDER: Record<GoalConsequenceSeverity, number> = {
  critical: 1,
  high: 2,
  moderate: 3,
  low: 4,
  unknown: 5,
};
const DEBT_ORDER: Record<GoalDebtExposure, number> = {
  high: 1,
  moderate: 2,
  low: 3,
  none: 4,
  unknown: 5,
};
const NATURE_ORDER: Record<GoalNature, number> = {
  preservation: 1,
  mixed: 2,
  improvement: 3,
  unknown: 4,
};
const NECESSITY_ORDER: Record<GoalNecessity, number> = {
  essential: 1,
  important: 2,
  optional: 3,
  unknown: 4,
};

function compareFinancialGoalOrder(
  a: GoalIntelligenceResult,
  b: GoalIntelligenceResult,
  userPriorityById: ReadonlyMap<string, number>,
): number {
  const financial = NECESSITY_ORDER[a.necessity] - NECESSITY_ORDER[b.necessity]
    || DEADLINE_ORDER[a.deadlineFlexibility] - DEADLINE_ORDER[b.deadlineFlexibility]
    || CONSEQUENCE_ORDER[a.consequenceSeverity] - CONSEQUENCE_ORDER[b.consequenceSeverity]
    || DEBT_ORDER[a.debtExposure] - DEBT_ORDER[b.debtExposure]
    || NATURE_ORDER[a.goalNature] - NATURE_ORDER[b.goalNature];
  if (financial) return financial;

  if (a.monthsRemaining !== b.monthsRemaining) {
    if (a.monthsRemaining === null) return 1;
    if (b.monthsRemaining === null) return -1;
    if (a.monthsRemaining !== b.monthsRemaining) return a.monthsRemaining - b.monthsRemaining;
  }

  const userPriority = (userPriorityById.get(a.goalId) ?? 5) - (userPriorityById.get(b.goalId) ?? 5);
  return userPriority || a.stableTieBreaker.localeCompare(b.stableTieBreaker);
}

type EqualFulfillmentItem = {
  id: string;
  requestedCents: number;
  stableTieBreaker: string;
};

/**
 * Applies one common fulfillment ratio to every financially equivalent request.
 * Integer cents are floored from the exact ratio and only the unavoidable final
 * cent remainder uses fractional remainder, then stable identity.
 */
export function allocateEqualFulfillmentCents(
  items: readonly EqualFulfillmentItem[],
  capacityCents: number,
): Map<string, number> {
  const result = new Map<string, number>();
  const normalizedCapacity = Math.max(0, Math.trunc(capacityCents));
  const active = items.filter((item) => item.requestedCents > 0);
  for (const item of items) result.set(item.id, 0);
  if (!active.length || normalizedCapacity === 0) return result;

  const totalRequested = active.reduce((sum, item) => sum + item.requestedCents, 0);
  const allocatable = Math.min(normalizedCapacity, totalRequested);
  if (allocatable === totalRequested) {
    for (const item of active) result.set(item.id, item.requestedCents);
    return result;
  }

  const remainders: Array<{ item: EqualFulfillmentItem; remainder: number }> = [];
  let allocated = 0;
  for (const item of active) {
    const numerator = allocatable * item.requestedCents;
    const base = Math.floor(numerator / totalRequested);
    result.set(item.id, base);
    allocated += base;
    remainders.push({ item, remainder: numerator % totalRequested });
  }

  let centsLeft = allocatable - allocated;
  remainders.sort((a, b) => b.remainder - a.remainder
    || a.item.stableTieBreaker.localeCompare(b.item.stableTieBreaker));
  for (const { item } of remainders) {
    if (centsLeft <= 0) break;
    const current = result.get(item.id) ?? 0;
    if (current < item.requestedCents) {
      result.set(item.id, current + 1);
      centsLeft -= 1;
    }
  }
  if (centsLeft !== 0) throw new Error("Equal-fulfillment cent reconciliation failed.");
  return result;
}

export function buildRecurringGoalRetirementCompetition(
  goalIntelligence: readonly GoalIntelligenceResult[],
  retirementStatus: HybridRetirementStatus,
  additionalRetirementRequestedMonthly: number | null,
  availableMonthlyCapacity: number,
  options: BuildCompetitionOptions = {},
): BuildCompetitionPlan {
  const userPriorityById = options.goalUserPriorityById ?? new Map<string, number>();
  const availableCents = toCents(availableMonthlyCapacity);
  const retirementRequestCents = additionalRetirementRequestedMonthly === null
    ? null
    : toCents(additionalRetirementRequestedMonthly);

  const byId = new Map(goalIntelligence.map((goal) => [goal.goalId, goal]));
  const goals: BuildCompetitionGoalTranche[] = goalIntelligence.map((goal) => {
    const disposition = determineGoalRetirementDisposition(goal, retirementStatus);
    const requested = goalRequestMonthly(goal);
    const excess = roundMoney(Math.max(
      0,
      goal.remainingTargetAmount - (goal.remainingCoreNeedAmount ?? 0),
    ));
    const missingData = disposition === "MORE_INFORMATION_NEEDED"
      ? [...goal.missingData, ...(requested === null ? ["A usable recurring core-need pace is required for Phase 5C competition."] : [])]
      : [];
    return {
      goalId: goal.goalId,
      goalName: goal.goalName,
      disposition,
      requestedMonthlyAmount: requested,
      allocatedMonthlyAmount: 0,
      unfundedMonthlyAmount: requested,
      remainingCoreNeedAmount: goal.remainingCoreNeedAmount,
      remainingDesiredExcessAmount: excess,
      missingData,
      stableTieBreaker: goal.stableTieBreaker,
    };
  });

  const materialMissingGoals = goals.filter((goal) =>
    goal.disposition === "MORE_INFORMATION_NEEDED"
    && (goal.remainingCoreNeedAmount === null || goal.remainingCoreNeedAmount > 0));
  const retirementMissing = retirementStatus === "more_information_needed" || retirementRequestCents === null;
  if (retirementMissing || materialMissingGoals.length) {
    const missingData = [
      ...(retirementMissing ? ["Material retirement facts are required before allocating contested Phase 5C recurring capacity."] : []),
      ...materialMissingGoals.flatMap((goal) => goal.missingData.map((item) => `${goal.goalName}: ${item}`)),
    ];
    return {
      state: "more_information_needed",
      availableMonthlyCapacity: fromCents(availableCents),
      additionalRetirementRequestedMonthly,
      additionalRetirementAllocatedMonthly: 0,
      additionalRetirementUnfundedMonthly: additionalRetirementRequestedMonthly,
      goals,
      totalAllocatedMonthly: 0,
      remainingMonthlyCapacity: fromCents(availableCents),
      missingData,
    };
  }

  let remainingCents = availableCents;
  const allocatedGoalCents = new Map<string, number>();
  for (const goal of goals) allocatedGoalCents.set(goal.goalId, 0);
  let retirementAllocatedCents = 0;

  const outrank = goals
    .filter((goal) => goal.disposition === "OUTRANKS" && (goal.requestedMonthlyAmount ?? 0) > 0)
    .sort((a, b) => compareFinancialGoalOrder(byId.get(a.goalId)!, byId.get(b.goalId)!, userPriorityById));
  for (const goal of outrank) {
    const requested = toCents(goal.requestedMonthlyAmount ?? 0);
    const allocated = Math.min(requested, remainingCents);
    allocatedGoalCents.set(goal.goalId, allocated);
    remainingCents -= allocated;
  }

  const coPriorityGoals = goals.filter((goal) =>
    goal.disposition === "CO_PRIORITY" && (goal.requestedMonthlyAmount ?? 0) > 0);
  const coItems: EqualFulfillmentItem[] = coPriorityGoals.length
    ? [
        ...(retirementRequestCents! > 0
          ? [{ id: "__retirement__", requestedCents: retirementRequestCents!, stableTieBreaker: "retirement" }]
          : []),
        ...coPriorityGoals.map((goal) => ({
          id: goal.goalId,
          requestedCents: toCents(goal.requestedMonthlyAmount ?? 0),
          stableTieBreaker: goal.stableTieBreaker,
        })),
      ]
    : [];
  if (coItems.length) {
    const allocations = allocateEqualFulfillmentCents(coItems, remainingCents);
    let consumed = 0;
    for (const item of coItems) {
      const allocated = allocations.get(item.id) ?? 0;
      consumed += allocated;
      if (item.id === "__retirement__") retirementAllocatedCents = allocated;
      else allocatedGoalCents.set(item.id, allocated);
    }
    remainingCents -= consumed;
  }

  if (!coPriorityGoals.length && retirementRequestCents! > 0) {
    retirementAllocatedCents = Math.min(retirementRequestCents!, remainingCents);
    remainingCents -= retirementAllocatedCents;
  } else if (coPriorityGoals.length && retirementAllocatedCents < retirementRequestCents! && remainingCents > 0) {
    const retirementStillNeeded = retirementRequestCents! - retirementAllocatedCents;
    const allocated = Math.min(retirementStillNeeded, remainingCents);
    retirementAllocatedCents += allocated;
    remainingCents -= allocated;
  }

  const below = goals
    .filter((goal) => goal.disposition === "BELOW" && (goal.requestedMonthlyAmount ?? 0) > 0)
    .sort((a, b) => compareFinancialGoalOrder(byId.get(a.goalId)!, byId.get(b.goalId)!, userPriorityById));
  for (const goal of below) {
    if (remainingCents <= 0) break;
    const requested = toCents(goal.requestedMonthlyAmount ?? 0);
    const allocated = Math.min(requested, remainingCents);
    allocatedGoalCents.set(goal.goalId, allocated);
    remainingCents -= allocated;
  }

  for (const goal of goals) {
    const allocated = allocatedGoalCents.get(goal.goalId) ?? 0;
    goal.allocatedMonthlyAmount = fromCents(allocated);
    goal.unfundedMonthlyAmount = goal.requestedMonthlyAmount === null
      ? null
      : fromCents(Math.max(0, toCents(goal.requestedMonthlyAmount) - allocated));
  }

  const totalGoalAllocatedCents = [...allocatedGoalCents.values()].reduce((sum, value) => sum + value, 0);
  const totalAllocatedCents = totalGoalAllocatedCents + retirementAllocatedCents;
  if (totalAllocatedCents + remainingCents !== availableCents) {
    throw new Error("Phase 5C recurring competition capacity reconciliation failed.");
  }

  return {
    state: "calculated",
    availableMonthlyCapacity: fromCents(availableCents),
    additionalRetirementRequestedMonthly: fromCents(retirementRequestCents!),
    additionalRetirementAllocatedMonthly: fromCents(retirementAllocatedCents),
    additionalRetirementUnfundedMonthly: fromCents(Math.max(0, retirementRequestCents! - retirementAllocatedCents)),
    goals,
    totalAllocatedMonthly: fromCents(totalAllocatedCents),
    remainingMonthlyCapacity: fromCents(remainingCents),
    missingData: [],
  };
}