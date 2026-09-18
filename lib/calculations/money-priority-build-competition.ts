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

export type BuildCompetitionGoalTrancheType = "core" | "desired_excess";

export type BuildCompetitionGoalTranche = {
  trancheId: string;
  trancheType: BuildCompetitionGoalTrancheType;
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

function isLegacyUnconfirmedGoal(goal: GoalIntelligenceResult): boolean {
  return goal.missingData.some((item) => item.includes("legacy defaults are not treated as user evidence"));
}

function hasKnownCoreRecurringPace(goal: GoalIntelligenceResult): boolean {
  return goal.remainingCoreNeedAmount !== null && hasUsableRecurringPace(goal);
}

export function determineGoalRetirementDisposition(
  goal: GoalIntelligenceResult,
  retirementStatus: HybridRetirementStatus,
): BuildCompetitionDisposition {
  if (goal.remainingTargetAmount <= 0 || goal.remainingCoreNeedAmount === 0) return "BELOW";
  if (retirementStatus === "more_information_needed") return "MORE_INFORMATION_NEEDED";

  // Legacy/unconfirmed rows cannot gain a new cross-domain elevation. They are retirement-junior
  // while any unresolved amount/pacing remains local to that goal.
  if (isLegacyUnconfirmedGoal(goal)) return "BELOW";
  if (goal.necessity === "optional") return "BELOW";
  if (goal.necessity === "unknown") return "MORE_INFORMATION_NEEDED";

  if (goal.necessity === "essential") {
    const urgencyDefinite = goal.deadlineFlexibility === "fixed" || goal.consequenceSeverity === "critical";
    const urgencyPossible = urgencyDefinite
      || goal.deadlineFlexibility === "unknown"
      || goal.consequenceSeverity === "unknown";
    const harmDefinite = isHighOrCritical(goal.consequenceSeverity) || goal.debtExposure === "high";
    const harmPossible = harmDefinite
      || goal.consequenceSeverity === "unknown"
      || goal.debtExposure === "unknown";

    if (urgencyDefinite && harmDefinite) {
      return hasKnownCoreRecurringPace(goal) ? "OUTRANKS" : "MORE_INFORMATION_NEEDED";
    }
    if (urgencyPossible && harmPossible) return "MORE_INFORMATION_NEEDED";

    const coPriorityDefinite = goal.deadlineFlexibility === "limited"
      || isModerateOrHigherConsequence(goal.consequenceSeverity)
      || isModerateOrHigherDebt(goal.debtExposure);
    const coPriorityPossible = coPriorityDefinite
      || goal.deadlineFlexibility === "unknown"
      || goal.consequenceSeverity === "unknown"
      || goal.debtExposure === "unknown";
    if (coPriorityDefinite) {
      return hasKnownCoreRecurringPace(goal) ? "CO_PRIORITY" : "MORE_INFORMATION_NEEDED";
    }
    if (coPriorityPossible) return "MORE_INFORMATION_NEEDED";
    return "BELOW";
  }

  if (goal.necessity === "important") {
    if (retirementStatus === "behind") return "BELOW";
    const definitelyBelow = goal.goalNature === "improvement"
      || goal.deadlineFlexibility === "flexible"
      || goal.consequenceSeverity === "moderate"
      || goal.consequenceSeverity === "low";
    if (definitelyBelow) return "BELOW";

    const coPriorityDefinite = (goal.goalNature === "preservation" || goal.goalNature === "mixed")
      && (goal.deadlineFlexibility === "fixed" || goal.deadlineFlexibility === "limited")
      && isHighOrCritical(goal.consequenceSeverity);
    if (coPriorityDefinite) {
      return hasKnownCoreRecurringPace(goal) ? "CO_PRIORITY" : "MORE_INFORMATION_NEEDED";
    }
    if (
      goal.goalNature === "unknown"
      || goal.deadlineFlexibility === "unknown"
      || goal.consequenceSeverity === "unknown"
    ) return "MORE_INFORMATION_NEEDED";
    return "BELOW";
  }

  return "MORE_INFORMATION_NEEDED";
}

type GoalMonthlyPaces = { core: number | null; excess: number | null };

function goalMonthlyPaces(goal: GoalIntelligenceResult): GoalMonthlyPaces {
  if (goal.remainingTargetAmount <= 0) return { core: 0, excess: 0 };
  if (goal.remainingCoreNeedAmount === null) return { core: null, excess: null };
  const remainingExcess = roundMoney(Math.max(0, goal.remainingTargetAmount - goal.remainingCoreNeedAmount));
  if (goal.monthsRemaining === null || goal.monthsRemaining <= 0) {
    return {
      core: goal.remainingCoreNeedAmount <= 0 ? 0 : null,
      excess: remainingExcess <= 0 ? 0 : null,
    };
  }
  const fullTargetMonthlyCents = toCents(goal.remainingTargetAmount / goal.monthsRemaining);
  const coreMonthlyCents = Math.min(
    fullTargetMonthlyCents,
    toCents(goal.remainingCoreNeedAmount / goal.monthsRemaining),
  );
  return {
    core: fromCents(coreMonthlyCents),
    excess: fromCents(Math.max(0, fullTargetMonthlyCents - coreMonthlyCents)),
  };
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

function canResolveToOutrank(goal: GoalIntelligenceResult): boolean {
  if (
    isLegacyUnconfirmedGoal(goal)
    || (goal.necessity !== "essential" && goal.necessity !== "unknown")
  ) return false;
  if (goal.remainingTargetAmount <= 0 || goal.remainingCoreNeedAmount === 0) return false;

  const urgencyPossible = goal.deadlineFlexibility === "fixed"
    || goal.consequenceSeverity === "critical"
    || goal.deadlineFlexibility === "unknown"
    || goal.consequenceSeverity === "unknown";
  const harmPossible = isHighOrCritical(goal.consequenceSeverity)
    || goal.debtExposure === "high"
    || goal.consequenceSeverity === "unknown"
    || goal.debtExposure === "unknown";
  return urgencyPossible && harmPossible;
}

function strongestPotentialOutrankOrdering(goal: GoalIntelligenceResult): GoalIntelligenceResult {
  return {
    ...goal,
    necessity: goal.necessity === "unknown" ? "essential" : goal.necessity,
    deadlineFlexibility: goal.deadlineFlexibility === "unknown" ? "fixed" : goal.deadlineFlexibility,
    consequenceSeverity: goal.consequenceSeverity === "unknown" ? "critical" : goal.consequenceSeverity,
    debtExposure: goal.debtExposure === "unknown" ? "high" : goal.debtExposure,
    goalNature: goal.goalNature === "unknown" ? "preservation" : goal.goalNature,
    monthsRemaining: goal.monthsRemaining !== null && goal.monthsRemaining > 0 ? goal.monthsRemaining : 1,
  };
}

function maximumPotentialCoreMonthlyCents(goal: GoalIntelligenceResult): number {
  if (goal.remainingTargetAmount <= 0 || goal.remainingCoreNeedAmount === 0) return 0;
  const maximumRemainingCore = goal.remainingCoreNeedAmount === null
    ? goal.remainingTargetAmount
    : Math.min(goal.remainingCoreNeedAmount, goal.remainingTargetAmount);
  const months = goal.monthsRemaining !== null && goal.monthsRemaining > 0 ? goal.monthsRemaining : 1;
  return toCents(maximumRemainingCore / months);
}

type MaterialGoalResolution = {
  possibleDispositions: ReadonlySet<BuildCompetitionDisposition>;
  strongestBelowOrdering: GoalIntelligenceResult | null;
};

function analyzeMaterialGoalResolutions(
  goal: GoalIntelligenceResult,
  retirementStatus: HybridRetirementStatus,
  userPriorityById: ReadonlyMap<string, number>,
): MaterialGoalResolution {
  if (isLegacyUnconfirmedGoal(goal)) {
    return { possibleDispositions: new Set(["BELOW"]), strongestBelowOrdering: goal };
  }

  const necessities: GoalNecessity[] = goal.necessity === "unknown"
    ? ["essential", "important", "optional"]
    : [goal.necessity];
  const natures: GoalNature[] = goal.goalNature === "unknown"
    ? ["preservation", "mixed", "improvement"]
    : [goal.goalNature];
  const deadlines: GoalDeadlineFlexibility[] = goal.deadlineFlexibility === "unknown"
    ? ["fixed", "limited", "flexible"]
    : [goal.deadlineFlexibility];
  const consequences: GoalConsequenceSeverity[] = goal.consequenceSeverity === "unknown"
    ? ["critical", "high", "moderate", "low"]
    : [goal.consequenceSeverity];
  const debts: GoalDebtExposure[] = goal.debtExposure === "unknown"
    ? ["high", "moderate", "low", "none"]
    : [goal.debtExposure];

  const possibleDispositions = new Set<BuildCompetitionDisposition>();
  let strongestBelowOrdering: GoalIntelligenceResult | null = null;
  const boundedCore = goal.remainingCoreNeedAmount === null
    ? Math.max(0.01, goal.remainingTargetAmount)
    : goal.remainingCoreNeedAmount;
  const boundedMonths = goal.monthsRemaining !== null && goal.monthsRemaining > 0
    ? goal.monthsRemaining
    : 1;

  for (const necessity of necessities) {
    for (const goalNature of natures) {
      for (const deadlineFlexibility of deadlines) {
        for (const consequenceSeverity of consequences) {
          for (const debtExposure of debts) {
            const resolved: GoalIntelligenceResult = {
              ...goal,
              necessity,
              goalNature,
              deadlineFlexibility,
              consequenceSeverity,
              debtExposure,
              remainingCoreNeedAmount: boundedCore,
              monthsRemaining: boundedMonths,
            };
            const disposition = determineGoalRetirementDisposition(resolved, retirementStatus);
            possibleDispositions.add(disposition);
            if (
              disposition === "BELOW"
              && (
                strongestBelowOrdering === null
                || compareFinancialGoalOrder(resolved, strongestBelowOrdering, userPriorityById) < 0
              )
            ) {
              strongestBelowOrdering = resolved;
            }
          }
        }
      }
    }
  }

  return { possibleDispositions, strongestBelowOrdering };
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

  const coreTranches: BuildCompetitionGoalTranche[] = goalIntelligence.map((goal) => {
    const disposition = determineGoalRetirementDisposition(goal, retirementStatus);
    const paces = goalMonthlyPaces(goal);
    const excess = goal.remainingCoreNeedAmount === null
      ? 0
      : roundMoney(Math.max(0, goal.remainingTargetAmount - goal.remainingCoreNeedAmount));
    const requestUnresolved = paces.core === null
      && (goal.remainingCoreNeedAmount === null || goal.remainingCoreNeedAmount > 0);
    const missingData = disposition === "MORE_INFORMATION_NEEDED" || requestUnresolved
      ? [
          ...goal.missingData,
          ...(requestUnresolved ? ["A usable recurring core-need pace is required for this goal tranche."] : []),
        ]
      : [];
    return {
      trancheId: `${goal.goalId}:core`,
      trancheType: "core",
      goalId: goal.goalId,
      goalName: goal.goalName,
      disposition,
      requestedMonthlyAmount: paces.core,
      allocatedMonthlyAmount: 0,
      unfundedMonthlyAmount: paces.core,
      remainingCoreNeedAmount: goal.remainingCoreNeedAmount,
      remainingDesiredExcessAmount: excess,
      missingData: [...new Set(missingData)].sort(),
      stableTieBreaker: `${goal.stableTieBreaker}:core`,
    };
  });

  const excessTranches: BuildCompetitionGoalTranche[] = goalIntelligence.flatMap((goal) => {
    if (goal.remainingCoreNeedAmount === null) return [];
    const excess = roundMoney(Math.max(0, goal.remainingTargetAmount - goal.remainingCoreNeedAmount));
    if (excess <= 0) return [];
    const requested = goalMonthlyPaces(goal).excess;
    return [{
      trancheId: `${goal.goalId}:desired_excess`,
      trancheType: "desired_excess" as const,
      goalId: goal.goalId,
      goalName: goal.goalName,
      disposition: "BELOW" as const,
      requestedMonthlyAmount: requested,
      allocatedMonthlyAmount: 0,
      unfundedMonthlyAmount: requested,
      remainingCoreNeedAmount: goal.remainingCoreNeedAmount,
      remainingDesiredExcessAmount: excess,
      missingData: requested === null
        ? ["A usable recurring desired-excess pace is required for this retirement-junior tranche."]
        : [],
      stableTieBreaker: `${goal.stableTieBreaker}:desired_excess`,
    }];
  });
  const goals = [...coreTranches, ...excessTranches];

  const materialMissingGoals = coreTranches.filter((goal) =>
    goal.disposition === "MORE_INFORMATION_NEEDED"
    && (goal.remainingCoreNeedAmount === null || goal.remainingCoreNeedAmount > 0));
  const definitiveBelowRequestUnresolvedGoals = coreTranches.filter((tranche) => {
    if (
      tranche.disposition !== "BELOW"
      || tranche.requestedMonthlyAmount !== null
      || !(tranche.remainingCoreNeedAmount === null || tranche.remainingCoreNeedAmount > 0)
    ) return false;
    const source = byId.get(tranche.goalId);
    return source !== undefined && !isLegacyUnconfirmedGoal(source);
  });
  const materialGoalAnalyses = [
    ...materialMissingGoals.flatMap((tranche) => {
      const source = byId.get(tranche.goalId);
      if (!source) return [];
      const resolution = analyzeMaterialGoalResolutions(source, retirementStatus, userPriorityById);
      return [{
        tranche,
        source,
        resolution,
        maximumRequestedCents: maximumPotentialCoreMonthlyCents(source),
      }];
    }),
    ...definitiveBelowRequestUnresolvedGoals.flatMap((tranche) => {
      const source = byId.get(tranche.goalId);
      if (!source) return [];
      return [{
        tranche,
        source,
        resolution: {
          possibleDispositions: new Set<BuildCompetitionDisposition>(["BELOW"]),
          strongestBelowOrdering: source,
        },
        maximumRequestedCents: maximumPotentialCoreMonthlyCents(source),
      }];
    }),
  ];
  const potentialOutrankPeers = materialMissingGoals.flatMap((tranche) => {
    const source = byId.get(tranche.goalId);
    if (!source || !canResolveToOutrank(source)) return [];
    return [{
      source,
      strongestOrdering: strongestPotentialOutrankOrdering(source),
      maximumRequestedCents: maximumPotentialCoreMonthlyCents(source),
    }];
  });
  const localUnresolvedTranches = goals.filter((goal) =>
    goal.requestedMonthlyAmount === null
    && (goal.trancheType === "core"
      ? goal.remainingCoreNeedAmount === null || goal.remainingCoreNeedAmount > 0
      : goal.remainingDesiredExcessAmount > 0));
  const retirementMissing = retirementStatus === "more_information_needed" || retirementRequestCents === null;
  if (retirementMissing) {
    const missingData = [
      "Material retirement facts are required before allocating contested Phase 5C recurring capacity.",
      ...materialMissingGoals.flatMap((goal) => goal.missingData.map((item) => `${goal.goalName}: ${item}`)),
      ...localUnresolvedTranches.flatMap((goal) => goal.missingData.map((item) => `${goal.goalName}: ${item}`)),
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
      missingData: [...new Set(missingData)].sort(),
    };
  }

  let remainingCents = availableCents;
  const allocatedGoalCents = new Map<string, number>();
  for (const goal of goals) allocatedGoalCents.set(goal.trancheId, 0);
  let retirementAllocatedCents = 0;

  const compareTranches = (a: BuildCompetitionGoalTranche, b: BuildCompetitionGoalTranche): number =>
    compareFinancialGoalOrder(byId.get(a.goalId)!, byId.get(b.goalId)!, userPriorityById)
    || (a.trancheType === "core" ? 0 : 1) - (b.trancheType === "core" ? 0 : 1)
    || a.trancheId.localeCompare(b.trancheId);

  const outrank = coreTranches
    .filter((goal) => goal.disposition === "OUTRANKS" && (goal.requestedMonthlyAmount ?? 0) > 0)
    .sort(compareTranches);
  for (const goal of outrank) {
    const requested = toCents(goal.requestedMonthlyAmount ?? 0);
    const source = byId.get(goal.goalId)!;
    const reservedForHigherPotentialPeers = potentialOutrankPeers
      .filter((peer) =>
        compareFinancialGoalOrder(peer.strongestOrdering, source, userPriorityById) < 0)
      .reduce((sum, peer) => sum + peer.maximumRequestedCents, 0);
    const guaranteedIndependentCents = Math.max(
      0,
      remainingCents - Math.min(remainingCents, reservedForHigherPotentialPeers),
    );
    const allocated = Math.min(requested, guaranteedIndependentCents);
    allocatedGoalCents.set(goal.trancheId, allocated);
    remainingCents -= allocated;

    // Once a known OUTRANK tranche cannot be fully funded independently of a higher
    // unresolved peer, lower-ranked known OUTRANK tranches cannot have independent
    // entitlement to the same scarce Bucket-1 capacity.
    if (allocated < requested) break;
  }

  const applyGoalAllocations = () => {
    for (const goal of goals) {
      const allocated = allocatedGoalCents.get(goal.trancheId) ?? 0;
      goal.allocatedMonthlyAmount = fromCents(allocated);
      goal.unfundedMonthlyAmount = goal.requestedMonthlyAmount === null
        ? null
        : fromCents(Math.max(0, toCents(goal.requestedMonthlyAmount) - allocated));
    }
  };

  if (materialGoalAnalyses.length) {
    const unresolvedOutrankReserveCents = Math.min(
      remainingCents,
      materialGoalAnalyses
        .filter((item) => item.resolution.possibleDispositions.has("OUTRANKS"))
        .reduce((sum, item) => sum + item.maximumRequestedCents, 0),
    );
    const lowerBucketCapacityCents = Math.max(0, remainingCents - unresolvedOutrankReserveCents);
    const knownCoPriorityGoals = coreTranches.filter((goal) =>
      goal.disposition === "CO_PRIORITY" && (goal.requestedMonthlyAmount ?? 0) > 0);
    const potentialCoPriorityGoals = materialGoalAnalyses.filter((item) =>
      !item.resolution.possibleDispositions.has("OUTRANKS")
      && item.resolution.possibleDispositions.has("CO_PRIORITY"));
    const potentialCoPriorityRequestCents = potentialCoPriorityGoals
      .reduce((sum, item) => sum + item.maximumRequestedCents, 0);
    const knownCoPriorityRequestCents = knownCoPriorityGoals
      .reduce((sum, goal) => sum + toCents(goal.requestedMonthlyAmount ?? 0), 0);
    const allSeniorLowerRequestsFit = retirementRequestCents
      + knownCoPriorityRequestCents
      + potentialCoPriorityRequestCents <= lowerBucketCapacityCents;

    let stableBelowCapacityCents = 0;
    const lowerBucketCanVary = unresolvedOutrankReserveCents > 0 || potentialCoPriorityGoals.length > 0;

    if (lowerBucketCanVary) {
      if (allSeniorLowerRequestsFit) {
        retirementAllocatedCents = retirementRequestCents;
        remainingCents -= retirementAllocatedCents;
        for (const goal of knownCoPriorityGoals) {
          const requested = toCents(goal.requestedMonthlyAmount ?? 0);
          allocatedGoalCents.set(goal.trancheId, requested);
          remainingCents -= requested;
        }
        stableBelowCapacityCents = lowerBucketCapacityCents
          - retirementRequestCents
          - knownCoPriorityRequestCents
          - potentialCoPriorityRequestCents;
      }
      // If the senior lower-bucket requests do not all fit at their supported maxima,
      // the retirement/co-priority dollar shares can change with the missing fact.
      // Those dollars therefore remain unresolved rather than exposing a partial floor.
    } else {
      const coItems: EqualFulfillmentItem[] = knownCoPriorityGoals.length
        ? [
            ...(retirementRequestCents > 0
              ? [{ id: "__retirement__", requestedCents: retirementRequestCents, stableTieBreaker: "retirement" }]
              : []),
            ...knownCoPriorityGoals.map((goal) => ({
              id: goal.trancheId,
              requestedCents: toCents(goal.requestedMonthlyAmount ?? 0),
              stableTieBreaker: goal.stableTieBreaker,
            })),
          ]
        : [];
      if (coItems.length) {
        const allocations = allocateEqualFulfillmentCents(coItems, lowerBucketCapacityCents);
        for (const item of coItems) {
          const allocated = allocations.get(item.id) ?? 0;
          if (item.id === "__retirement__") retirementAllocatedCents = allocated;
          else allocatedGoalCents.set(item.id, allocated);
          remainingCents -= allocated;
        }
      }
      if (!knownCoPriorityGoals.length && retirementRequestCents > 0) {
        retirementAllocatedCents = Math.min(retirementRequestCents, lowerBucketCapacityCents);
        remainingCents -= retirementAllocatedCents;
      } else if (
        knownCoPriorityGoals.length
        && retirementAllocatedCents < retirementRequestCents
        && remainingCents > unresolvedOutrankReserveCents
      ) {
        const retirementStillNeeded = retirementRequestCents - retirementAllocatedCents;
        const independentCapacity = Math.max(0, remainingCents - unresolvedOutrankReserveCents);
        const allocated = Math.min(retirementStillNeeded, independentCapacity);
        retirementAllocatedCents += allocated;
        remainingCents -= allocated;
      }
      stableBelowCapacityCents = Math.max(
        0,
        lowerBucketCapacityCents
          - knownCoPriorityGoals.reduce(
            (sum, goal) => sum + (allocatedGoalCents.get(goal.trancheId) ?? 0),
            0,
          )
          - retirementAllocatedCents,
      );
    }

    const potentialBelowOnlyGoals = materialGoalAnalyses.filter((item) =>
      !item.resolution.possibleDispositions.has("OUTRANKS")
      && !item.resolution.possibleDispositions.has("CO_PRIORITY")
      && item.resolution.possibleDispositions.has("BELOW"));
    const knownBelowGoals = goals
      .filter((goal) => goal.disposition === "BELOW" && (goal.requestedMonthlyAmount ?? 0) > 0)
      .sort(compareTranches);

    for (const goal of knownBelowGoals) {
      if (stableBelowCapacityCents <= 0) break;
      const requested = toCents(goal.requestedMonthlyAmount ?? 0);
      const source = byId.get(goal.goalId)!;
      const reservedForHigherPotentialBelow = potentialBelowOnlyGoals
        .filter((peer) => {
          const strongest = peer.resolution.strongestBelowOrdering;
          if (!strongest) return false;
          const order = compareFinancialGoalOrder(strongest, source, userPriorityById);
          return order < 0 || (order === 0 && peer.source.goalId === goal.goalId);
        })
        .reduce((sum, peer) => sum + peer.maximumRequestedCents, 0);

      const independentCapacity = reservedForHigherPotentialBelow > 0
        ? Math.max(
            0,
            stableBelowCapacityCents
              - Math.min(stableBelowCapacityCents, reservedForHigherPotentialBelow),
          )
        : stableBelowCapacityCents;
      const allocated = Math.min(requested, independentCapacity);
      if (allocated <= 0) break;

      allocatedGoalCents.set(goal.trancheId, allocated);
      stableBelowCapacityCents -= allocated;
      remainingCents -= allocated;

      // A partially funded known BELOW tranche consumes all Bucket-3 capacity
      // proven independent of stronger unresolved claimants. Its remaining request,
      // and all weaker known BELOW requests, stay behind the unresolved reserve.
      if (allocated < requested) break;
    }

    applyGoalAllocations();
    const totalGoalAllocatedCents = [...allocatedGoalCents.values()].reduce((sum, value) => sum + value, 0);
    const totalAllocatedCents = totalGoalAllocatedCents + retirementAllocatedCents;
    if (totalAllocatedCents + remainingCents !== availableCents) {
      throw new Error("Phase 5C targeted missing-data capacity reconciliation failed.");
    }
    const missingData = [
      ...materialMissingGoals.flatMap((goal) => goal.missingData.map((item) => `${goal.goalName}: ${item}`)),
      ...localUnresolvedTranches.flatMap((goal) => goal.missingData.map((item) => `${goal.goalName}: ${item}`)),
    ];
    return {
      state: "more_information_needed",
      availableMonthlyCapacity: fromCents(availableCents),
      additionalRetirementRequestedMonthly: fromCents(retirementRequestCents),
      additionalRetirementAllocatedMonthly: fromCents(retirementAllocatedCents),
      additionalRetirementUnfundedMonthly: fromCents(
        Math.max(0, retirementRequestCents - retirementAllocatedCents),
      ),
      goals,
      totalAllocatedMonthly: fromCents(totalAllocatedCents),
      remainingMonthlyCapacity: fromCents(remainingCents),
      missingData: [...new Set(missingData)].sort(),
    };
  }

  const coPriorityGoals = coreTranches.filter((goal) =>
    goal.disposition === "CO_PRIORITY" && (goal.requestedMonthlyAmount ?? 0) > 0);
  const coItems: EqualFulfillmentItem[] = coPriorityGoals.length
    ? [
        ...(retirementRequestCents > 0
          ? [{ id: "__retirement__", requestedCents: retirementRequestCents, stableTieBreaker: "retirement" }]
          : []),
        ...coPriorityGoals.map((goal) => ({
          id: goal.trancheId,
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

  if (!coPriorityGoals.length && retirementRequestCents > 0) {
    retirementAllocatedCents = Math.min(retirementRequestCents, remainingCents);
    remainingCents -= retirementAllocatedCents;
  } else if (coPriorityGoals.length && retirementAllocatedCents < retirementRequestCents && remainingCents > 0) {
    const retirementStillNeeded = retirementRequestCents - retirementAllocatedCents;
    const allocated = Math.min(retirementStillNeeded, remainingCents);
    retirementAllocatedCents += allocated;
    remainingCents -= allocated;
  }

  const below = goals
    .filter((goal) => goal.disposition === "BELOW" && (goal.requestedMonthlyAmount ?? 0) > 0)
    .sort(compareTranches);
  for (const goal of below) {
    if (remainingCents <= 0) break;
    const requested = toCents(goal.requestedMonthlyAmount ?? 0);
    const allocated = Math.min(requested, remainingCents);
    allocatedGoalCents.set(goal.trancheId, allocated);
    remainingCents -= allocated;
  }

  applyGoalAllocations();
  const totalGoalAllocatedCents = [...allocatedGoalCents.values()].reduce((sum, value) => sum + value, 0);
  const totalAllocatedCents = totalGoalAllocatedCents + retirementAllocatedCents;
  if (totalAllocatedCents + remainingCents !== availableCents) {
    throw new Error("Phase 5C recurring competition capacity reconciliation failed.");
  }
  const missingData = localUnresolvedTranches.flatMap((goal) =>
    goal.missingData.map((item) => `${goal.goalName}: ${item}`));

  return {
    state: localUnresolvedTranches.length ? "more_information_needed" : "calculated",
    availableMonthlyCapacity: fromCents(availableCents),
    additionalRetirementRequestedMonthly: fromCents(retirementRequestCents),
    additionalRetirementAllocatedMonthly: fromCents(retirementAllocatedCents),
    additionalRetirementUnfundedMonthly: fromCents(Math.max(0, retirementRequestCents - retirementAllocatedCents)),
    goals,
    totalAllocatedMonthly: fromCents(totalAllocatedCents),
    remainingMonthlyCapacity: fromCents(remainingCents),
    missingData: [...new Set(missingData)].sort(),
  };
}
