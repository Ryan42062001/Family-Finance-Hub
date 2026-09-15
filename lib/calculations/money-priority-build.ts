import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { calculatePlanFeasibility, type PlanFeasibility } from "./money-priority-core.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";
import { projectRetirement, type RetirementProjectionResult } from "./money-priority-retirement-projection.ts";
import {
  MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
  type MoneyPriorityPlanningAssumptions,
} from "./money-priority-planning-assumptions.ts";
import {
  evaluateRetirementAccountOpportunities,
  type RetirementAccountOpportunityResult,
} from "./money-priority-retirement-accounts.ts";
import {
  cloneRetirementCapacityLedger,
  consumeRetirementCapacity,
  consumeRetirementCapacityForEqualOwnerTieRecurringMonthly,
  createRetirementCapacityLedger,
  remainingRetirementCapacity,
  type RetirementCapacityLedger,
} from "./money-priority-retirement-capacity.ts";
import {
  MONEY_PRIORITY_TAX_POLICY_2026,
  type MoneyPriorityTaxPolicy,
} from "./money-priority-tax-policy.ts";
import {
  evaluateHybridRetirementFloor,
  type HybridRetirementFloorResult,
} from "./money-priority-retirement-floor.ts";
import {
  evaluateGoalIntelligence,
  type GoalIntelligenceResult,
} from "./money-priority-goal-intelligence.ts";
import {
  buildRecurringGoalRetirementCompetition,
  type BuildCompetitionDisposition,
  type BuildCompetitionPlan,
} from "./money-priority-build-competition.ts";

export type BuildAllocationCategory = "retirement" | "goal";

export type GoalEconomicTier = "required_protective" | "important" | "optional_lifestyle";
export type GoalDeadlineTier = "fixed" | "flexible" | "unknown";
export type GoalConsequenceTier = "high" | "moderate" | "low" | "unknown";

export type GoalRankingFactors = {
  economicTier: GoalEconomicTier;
  deadlineTier: GoalDeadlineTier;
  consequenceTier: GoalConsequenceTier;
  monthsRemaining: number | null;
  userPriority: number;
  stableTieBreaker: string;
};

export type BuildStageAllocation = {
  category: BuildAllocationCategory;
  relatedEntityId: string | null;
  title: string;
  requestedMonthlyAmount: number;
  allocatedMonthlyAmount: number;
  unfundedMonthlyAmount: number;
  rankingFactors: GoalRankingFactors | null;
  protectedAllocatedMonthlyAmount: number;
  allocationPhase: "required_goal" | "retirement" | "important_goal" | "optional_goal";
  competitionDisposition?: BuildCompetitionDisposition;
  reasons: string[];
};

export type GoalFundingAssessment = {
  goalId: string;
  goalName: string;
  requiredMonthlyPace: number | null;
  protectedMonthlyNeed: number;
  monthsRemaining: number | null;
  isFunded: boolean;
  missingData: string[];
  rankingFactors: GoalRankingFactors;
};

export type RetirementBuildAssessment = {
  state: "projection_on_track" | "projection_shortfall" | "benchmark_met" | "below_benchmark" | "more_information_needed";
  guidanceMode: "projection" | "benchmark" | "unavailable";
  monthlyGrossIncome: number | null;
  currentEmployeeMonthlyContribution: number;
  currentEmployerMonthlyContribution: number;
  currentTotalMonthlyContribution: number;
  currentPersonalSavingsRate: number | null;
  currentTotalSavingsRate: number | null;
  healthyBenchmarkMonthlyTarget: number | null;
  healthyBenchmarkMonthlyGap: number;
  recommendedMonthlyIncrease: number;
  projection: RetirementProjectionResult;
  missingData: string[];
};

export type BuildStageResult = {
  asOfDate: string;
  monthlyPlanCapacity: number;
  allocationMonthlyCapacity: number;
  protectedMonthlyFundingNeed: number;
  protectedRetirementFloorRequestedMonthly: number | null;
  protectedRetirementFloorAllocatedMonthly: number;
  unresolvedProtectedRetirementFloorMonthly: number | null;
  feasibility: PlanFeasibility;
  retirement: RetirementBuildAssessment;
  retirementFloor: HybridRetirementFloorResult;
  competition: BuildCompetitionPlan;
  retirementAccounts: RetirementAccountOpportunityResult;
  retirementCapacityLedger: RetirementCapacityLedger;
  retirementAccountAllocations: Array<{
    accountId: string;
    opportunityTier: string;
    allocatedMonthlyAmount: number;
    allocatedAnnualAmount: number;
  }>;
  unresolvedRetirementMonthlyAmount: number;
  goals: GoalFundingAssessment[];
  goalIntelligence: GoalIntelligenceResult[];
  allocations: BuildStageAllocation[];
  totalAllocatedMonthly: number;
  remainingMonthlyCapacity: number;
  warnings: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function monthsUntil(asOfDate: string, targetDate: string): number | null {
  const start = parseIsoDate(asOfDate);
  const target = parseIsoDate(targetDate);
  if (!start || !target) return null;
  if (target <= start) return 0;

  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  let months = (targetYear - startYear) * 12 + (targetMonth - startMonth);
  if (target.getUTCDate() > start.getUTCDate()) months += 1;
  return Math.max(1, months);
}

function goalProtectionMultiplier(goal: MoneyPrioritySnapshot["goals"][number]): number {
  if (goal.necessity === "required" && goal.deadlineFlexibility === "fixed") return 1;
  if (goal.necessity === "required") return 0.75;
  if (goal.goalClass === "necessary_protective" && goal.deadlineFlexibility === "fixed") return 1;
  if (goal.goalClass === "necessary_protective") return 0.75;
  if (goal.necessity === "important" && goal.deadlineFlexibility === "fixed") return 0.5;
  return 0;
}

const ECONOMIC_ORDER: Record<GoalEconomicTier, number> = {
  required_protective: 1,
  important: 2,
  optional_lifestyle: 3,
};
const DEADLINE_ORDER: Record<GoalDeadlineTier, number> = { fixed: 1, flexible: 2, unknown: 3 };
const CONSEQUENCE_ORDER: Record<GoalConsequenceTier, number> = { high: 1, moderate: 2, low: 3, unknown: 4 };

export function buildGoalRankingFactors(
  goal: MoneyPrioritySnapshot["goals"][number],
  monthsRemaining: number | null,
): GoalRankingFactors {
  const economicTier: GoalEconomicTier = goal.necessity === "required" || goal.goalClass === "necessary_protective"
    ? "required_protective"
    : goal.necessity === "important"
      ? "important"
      : "optional_lifestyle";
  const deadlineTier: GoalDeadlineTier = goal.deadlineFlexibility === "fixed" || goal.deadlineFlexibility === "inflexible"
    ? "fixed"
    : goal.deadlineFlexibility === "flexible"
      ? "flexible"
      : "unknown";
  const consequenceTier: GoalConsequenceTier = goal.consequenceLevel === "high"
    ? "high"
    : goal.consequenceLevel === "moderate"
      ? "moderate"
      : goal.consequenceLevel === "low"
        ? "low"
        : "unknown";
  return {
    economicTier,
    deadlineTier,
    consequenceTier,
    monthsRemaining,
    userPriority: goal.priority,
    stableTieBreaker: goal.id,
  };
}

export function compareGoalRankingFactors(a: GoalRankingFactors, b: GoalRankingFactors): number {
  const meaningful = ECONOMIC_ORDER[a.economicTier] - ECONOMIC_ORDER[b.economicTier]
    || DEADLINE_ORDER[a.deadlineTier] - DEADLINE_ORDER[b.deadlineTier]
    || CONSEQUENCE_ORDER[a.consequenceTier] - CONSEQUENCE_ORDER[b.consequenceTier];
  if (meaningful) return meaningful;
  if (a.monthsRemaining !== b.monthsRemaining) {
    if (a.monthsRemaining === null) return 1;
    if (b.monthsRemaining === null) return -1;
    return a.monthsRemaining - b.monthsRemaining;
  }
  return a.userPriority - b.userPriority || a.stableTieBreaker.localeCompare(b.stableTieBreaker);
}

export function assessRetirementBuild(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
  planningAssumptions: MoneyPriorityPlanningAssumptions = MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
): RetirementBuildAssessment {
  const currentEmployeeMonthlyContribution = roundMoney(
    snapshot.retirementAccounts.reduce((sum, account) => sum + account.monthlyEmployeeContribution, 0),
  );
  const currentEmployerMonthlyContribution = roundMoney(
    snapshot.retirementAccounts.reduce((sum, account) => sum + account.monthlyEmployerContribution, 0),
  );
  const currentTotalMonthlyContribution = roundMoney(
    currentEmployeeMonthlyContribution + currentEmployerMonthlyContribution,
  );
  const projection = projectRetirement(snapshot, asOfDate, planningAssumptions);

  const grossAvailable = !snapshot.aggregates.hasIncompleteGrossIncome && snapshot.aggregates.monthlyGrossIncomeKnown > 0;
  const monthlyGrossIncome = grossAvailable ? snapshot.aggregates.monthlyGrossIncomeKnown : null;
  const healthyBenchmarkMonthlyTarget = monthlyGrossIncome === null
    ? null
    : roundMoney(monthlyGrossIncome * policy.retirementBenchmark.healthyLower);
  const healthyBenchmarkMonthlyGap = healthyBenchmarkMonthlyTarget === null
    ? 0
    : roundMoney(Math.max(0, healthyBenchmarkMonthlyTarget - currentTotalMonthlyContribution));

  const common = {
    monthlyGrossIncome,
    currentEmployeeMonthlyContribution,
    currentEmployerMonthlyContribution,
    currentTotalMonthlyContribution,
    currentPersonalSavingsRate: monthlyGrossIncome === null ? null : currentEmployeeMonthlyContribution / monthlyGrossIncome,
    currentTotalSavingsRate: monthlyGrossIncome === null ? null : currentTotalMonthlyContribution / monthlyGrossIncome,
    healthyBenchmarkMonthlyTarget,
    healthyBenchmarkMonthlyGap,
    projection,
  };

  if (projection.state === "on_track") {
    return {
      ...common,
      state: "projection_on_track",
      guidanceMode: "projection",
      recommendedMonthlyIncrease: 0,
      missingData: [],
    };
  }

  if (projection.state === "shortfall" && projection.requiredAdditionalMonthlyContribution !== null) {
    return {
      ...common,
      state: "projection_shortfall",
      guidanceMode: "projection",
      recommendedMonthlyIncrease: projection.requiredAdditionalMonthlyContribution,
      missingData: [],
    };
  }

  if (monthlyGrossIncome !== null) {
    return {
      ...common,
      state: healthyBenchmarkMonthlyGap > 0 ? "below_benchmark" : "benchmark_met",
      guidanceMode: "benchmark",
      recommendedMonthlyIncrease: healthyBenchmarkMonthlyGap,
      missingData: projection.missingData,
    };
  }

  return {
    ...common,
    state: "more_information_needed",
    guidanceMode: "unavailable",
    recommendedMonthlyIncrease: 0,
    missingData: [
      ...projection.missingData,
      "Complete gross-income data is required for benchmark guidance when projection-based guidance is unavailable.",
    ],
  };
}

export function assessGoalFunding(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
): GoalFundingAssessment[] {
  return snapshot.goals.map((goal) => {
    const remaining = roundMoney(Math.max(0, goal.targetAmount - goal.currentAmount));
    const preliminaryMonths = goal.targetDate ? monthsUntil(asOfDate, goal.targetDate) : null;
    const rankingFactors = buildGoalRankingFactors(goal, preliminaryMonths);
    if (remaining === 0) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        requiredMonthlyPace: 0,
        protectedMonthlyNeed: 0,
        monthsRemaining: goal.targetDate ? monthsUntil(asOfDate, goal.targetDate) : null,
        isFunded: true,
        missingData: [],
        rankingFactors,
      };
    }

    if (!goal.targetDate) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        requiredMonthlyPace: null,
        protectedMonthlyNeed: 0,
        monthsRemaining: null,
        isFunded: false,
        missingData: ["A target date is required to calculate the monthly funding pace."],
        rankingFactors,
      };
    }

    const monthsRemaining = monthsUntil(asOfDate, goal.targetDate);
    if (monthsRemaining === null) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        requiredMonthlyPace: null,
        protectedMonthlyNeed: 0,
        monthsRemaining: null,
        isFunded: false,
        missingData: ["The goal target date is invalid."],
        rankingFactors,
      };
    }

    const requiredMonthlyPace = monthsRemaining === 0 ? remaining : roundMoney(remaining / monthsRemaining);
    const protectedMonthlyNeed = roundMoney(requiredMonthlyPace * goalProtectionMultiplier(goal));

    return {
      goalId: goal.id,
      goalName: goal.name,
      requiredMonthlyPace,
      protectedMonthlyNeed,
      monthsRemaining,
      isFunded: false,
      missingData: [],
      rankingFactors,
    };
  }).sort((a, b) => compareGoalRankingFactors(a.rankingFactors, b.rankingFactors));
}

function retirementDestinations(retirementAccounts: RetirementAccountOpportunityResult) {
  const tierOrder = new Map([
    ["strong_tax_advantaged", 1], ["diversification_opportunity", 2], ["secondary_tax_advantaged", 3],
  ]);
  return retirementAccounts.opportunities
    .filter((item) => item.state === "available" && item.contributionSource !== "employer"
      && item.opportunityTier !== "unavailable_or_unknown")
    .sort((a, b) => (tierOrder.get(a.opportunityTier ?? "") ?? 99)
      - (tierOrder.get(b.opportunityTier ?? "") ?? 99)
      || a.accountId.localeCompare(b.accountId));
}

function routableRetirementMonthlyCapacity(
  ledger: RetirementCapacityLedger,
  destinations: ReturnType<typeof retirementDestinations>,
): number {
  const clone = cloneRetirementCapacityLedger(ledger);
  let monthly = 0;
  const plannedTieGroups = new Set<string>();
  for (const destination of destinations) {
    const isMfjTie = destination.sharedCapacityGroup?.startsWith("ira:mfj-compensation:") === true;
    const tieKey = isMfjTie ? `${destination.sharedCapacityGroup}:${destination.opportunityTier}` : null;
    if (tieKey && plannedTieGroups.has(tieKey)) continue;
    if (tieKey) {
      plannedTieGroups.add(tieKey);
      const tiedAccountIds = destinations
        .filter((item) => item.sharedCapacityGroup === destination.sharedCapacityGroup
          && item.opportunityTier === destination.opportunityTier)
        .map((item) => item.accountId);
      const planned = consumeRetirementCapacityForEqualOwnerTieRecurringMonthly(
        clone,
        tiedAccountIds,
        "build",
        null,
      );
      monthly = roundMoney(monthly + planned.consumedMonthlyAmount);
      continue;
    }
    const room = remainingRetirementCapacity(clone, destination.accountId);
    if (room === null || room <= 0) continue;
    const consumed = consumeRetirementCapacity(clone, destination.accountId, "build", room);
    monthly = roundMoney(monthly + roundMoney(consumed.consumedAnnualAmount / 12));
  }
  return monthly;
}

function routeRetirementMonthlyAmount(
  ledger: RetirementCapacityLedger,
  destinations: ReturnType<typeof retirementDestinations>,
  requestedMonthlyAmount: number,
): BuildStageResult["retirementAccountAllocations"] {
  const allocations: BuildStageResult["retirementAccountAllocations"] = [];
  let remainingMonthly = roundMoney(requestedMonthlyAmount);
  const routedTieGroups = new Set<string>();
  for (const destination of destinations) {
    if (remainingMonthly <= 0) break;
    const isMfjTie = destination.sharedCapacityGroup?.startsWith("ira:mfj-compensation:") === true;
    const tieKey = isMfjTie ? `${destination.sharedCapacityGroup}:${destination.opportunityTier}` : null;
    if (tieKey && routedTieGroups.has(tieKey)) continue;
    if (tieKey) {
      routedTieGroups.add(tieKey);
      const tiedAccountIds = destinations
        .filter((item) => item.sharedCapacityGroup === destination.sharedCapacityGroup
          && item.opportunityTier === destination.opportunityTier)
        .map((item) => item.accountId);
      const tied = consumeRetirementCapacityForEqualOwnerTieRecurringMonthly(
        ledger,
        tiedAccountIds,
        "build",
        remainingMonthly,
      );
      for (const allocation of tied.allocations) {
        allocations.push({
          accountId: allocation.accountId,
          opportunityTier: destination.opportunityTier!,
          allocatedMonthlyAmount: allocation.allocatedMonthlyAmount,
          allocatedAnnualAmount: allocation.consumedAnnualAmount,
        });
      }
      remainingMonthly = roundMoney(remainingMonthly - tied.consumedMonthlyAmount);
      continue;
    }

    const annualRoom = remainingRetirementCapacity(ledger, destination.accountId);
    if (annualRoom === null || annualRoom <= 0) continue;
    const requestedAnnual = roundMoney(Math.min(remainingMonthly * 12, annualRoom));
    const consumed = consumeRetirementCapacity(
      ledger,
      destination.accountId,
      "build",
      requestedAnnual,
    );
    const allocatedMonthly = roundMoney(consumed.consumedAnnualAmount / 12);
    if (allocatedMonthly <= 0) continue;
    allocations.push({
      accountId: destination.accountId,
      opportunityTier: destination.opportunityTier!,
      allocatedMonthlyAmount: allocatedMonthly,
      allocatedAnnualAmount: consumed.consumedAnnualAmount,
    });
    remainingMonthly = roundMoney(remainingMonthly - allocatedMonthly);
  }

  const routed = roundMoney(allocations.reduce((sum, item) => sum + item.allocatedMonthlyAmount, 0));
  if (remainingMonthly !== 0 || routed !== roundMoney(requestedMonthlyAmount)) {
    throw new Error("Retirement capacity ledger routing invariant failed.");
  }
  return allocations;
}

export function evaluateBuildStage(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
  allocationMonthlyCapacityOverride?: number,
  planningAssumptions: MoneyPriorityPlanningAssumptions = MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
  taxPolicy: MoneyPriorityTaxPolicy = MONEY_PRIORITY_TAX_POLICY_2026,
  retirementOpportunitiesOverride?: RetirementAccountOpportunityResult,
  retirementCapacityLedger?: RetirementCapacityLedger,
): BuildStageResult {
  if (!parseIsoDate(asOfDate)) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");

  const warnings: string[] = [];
  const retirement = assessRetirementBuild(snapshot, asOfDate, policy, planningAssumptions);
  const retirementAccounts = retirementOpportunitiesOverride
    ?? evaluateRetirementAccountOpportunities(snapshot, taxPolicy);
  const capacityLedger = retirementCapacityLedger
    ?? createRetirementCapacityLedger(retirementAccounts);
  const retirementFloor = evaluateHybridRetirementFloor(
    snapshot,
    asOfDate,
    policy,
    planningAssumptions,
    retirementAccounts,
    capacityLedger,
    taxPolicy,
  );
  const goals = assessGoalFunding(snapshot, asOfDate);
  const goalIntelligence = evaluateGoalIntelligence(snapshot, asOfDate);
  const goalById = new Map(goals.map((goal) => [goal.goalId, goal]));
  const sourceGoalById = new Map(snapshot.goals.map((goal) => [goal.id, goal]));
  const userPriorityById = new Map(snapshot.goals.map((goal) => [goal.id, goal.priority]));

  const protectedRetirementFloorRequestedMonthly = retirementFloor.protectedFloorShortfallAnnual !== null
    ? roundMoney(retirementFloor.protectedFloorShortfallAnnual / 12)
    : null;
  const protectedMonthlyFundingNeed = protectedRetirementFloorRequestedMonthly ?? 0;
  const feasibility = calculatePlanFeasibility(snapshot, protectedMonthlyFundingNeed);
  const monthlyPlanCapacity = roundMoney(Math.max(0, feasibility.monthlyPlanCapacity));
  const allocationMonthlyCapacity = roundMoney(Math.max(
    0,
    Math.min(monthlyPlanCapacity, allocationMonthlyCapacityOverride ?? monthlyPlanCapacity),
  ));

  if (retirement.guidanceMode === "unavailable") warnings.push(...retirement.missingData);
  else if (retirement.guidanceMode === "benchmark" && retirement.missingData.length) {
    warnings.push(`Projection-based retirement guidance is unavailable: ${retirement.missingData.join(" ")}`);
  }
  warnings.push(...retirementAccounts.warnings);

  const destinations = retirementDestinations(retirementAccounts);
  const totalRoutableRetirementMonthly = routableRetirementMonthlyCapacity(capacityLedger, destinations);
  const protectedRetirementFloorAllocatedMonthly = protectedRetirementFloorRequestedMonthly === null
    ? 0
    : roundMoney(Math.min(
        protectedRetirementFloorRequestedMonthly,
        allocationMonthlyCapacity,
        totalRoutableRetirementMonthly,
      ));
  const unresolvedProtectedRetirementFloorMonthly = protectedRetirementFloorRequestedMonthly === null
    ? null
    : roundMoney(Math.max(0, protectedRetirementFloorRequestedMonthly - protectedRetirementFloorAllocatedMonthly));

  let competitionCapacity = roundMoney(Math.max(
    0,
    allocationMonthlyCapacity - protectedRetirementFloorAllocatedMonthly,
  ));
  const routableAfterFloor = roundMoney(Math.max(
    0,
    totalRoutableRetirementMonthly - protectedRetirementFloorAllocatedMonthly,
  ));

  if ((unresolvedProtectedRetirementFloorMonthly ?? 0) > 0) {
    warnings.push(
      `The protected retirement floor still needs $${unresolvedProtectedRetirementFloorMonthly!.toFixed(2)} per month. Ordinary goals cannot consume capacity that would raid this floor.`,
    );
    competitionCapacity = 0;
  }

  const additionalRetirementRequestedMonthly = retirementFloor.state === "more_information_needed"
    ? null
    : roundMoney(Math.min(
        retirementFloor.additionalRetirementOpportunityAnnual / 12,
        routableAfterFloor,
        competitionCapacity,
      ));

  const competition = buildRecurringGoalRetirementCompetition(
    goalIntelligence,
    retirementFloor.status,
    additionalRetirementRequestedMonthly,
    competitionCapacity,
    { goalUserPriorityById: userPriorityById },
  );

  if (retirementFloor.state === "more_information_needed") {
    warnings.push(...retirementFloor.missingData);
  }
  if (competition.state === "more_information_needed") warnings.push(...competition.missingData);

  const requests: BuildStageAllocation[] = [];
  const totalRetirementRequestedMonthly = roundMoney(
    (protectedRetirementFloorRequestedMonthly ?? 0) + (additionalRetirementRequestedMonthly ?? 0),
  );
  const totalRetirementAllocatedMonthly = roundMoney(
    protectedRetirementFloorAllocatedMonthly + competition.additionalRetirementAllocatedMonthly,
  );
  const unresolvedRetirementMonthlyAmount = roundMoney(
    (unresolvedProtectedRetirementFloorMonthly ?? 0)
      + (competition.additionalRetirementUnfundedMonthly ?? 0),
  );

  if (totalRetirementRequestedMonthly > 0 || retirementFloor.state === "more_information_needed") {
    requests.push({
      category: "retirement",
      relatedEntityId: null,
      title: "Fund the protected retirement floor, then additional retirement opportunity",
      requestedMonthlyAmount: totalRetirementRequestedMonthly,
      allocatedMonthlyAmount: totalRetirementAllocatedMonthly,
      unfundedMonthlyAmount: unresolvedRetirementMonthlyAmount,
      rankingFactors: null,
      protectedAllocatedMonthlyAmount: protectedRetirementFloorAllocatedMonthly,
      allocationPhase: "retirement",
      reasons: [
        "The Phase 5A protected retirement floor is funded before ordinary Phase 5C goal competition.",
        "Only verified additional retirement opportunity above that floor participates in FFH-D004 competition.",
      ],
    });
  }

  for (const tranche of competition.goals) {
    const assessment = goalById.get(tranche.goalId);
    const sourceGoal = sourceGoalById.get(tranche.goalId);
    if (!assessment || !sourceGoal) continue;
    if ((tranche.requestedMonthlyAmount ?? 0) <= 0 && tranche.disposition !== "MORE_INFORMATION_NEEDED") continue;

    const phase: BuildStageAllocation["allocationPhase"] = tranche.disposition === "OUTRANKS"
      ? "required_goal"
      : tranche.disposition === "BELOW"
        ? (assessment.rankingFactors.economicTier === "optional_lifestyle" ? "optional_goal" : "important_goal")
        : "important_goal";
    requests.push({
      category: "goal",
      relatedEntityId: tranche.goalId,
      title: `Fund ${tranche.goalName} core need`,
      requestedMonthlyAmount: tranche.requestedMonthlyAmount ?? 0,
      allocatedMonthlyAmount: tranche.allocatedMonthlyAmount,
      unfundedMonthlyAmount: tranche.unfundedMonthlyAmount ?? 0,
      rankingFactors: assessment.rankingFactors,
      protectedAllocatedMonthlyAmount: 0,
      allocationPhase: phase,
      competitionDisposition: tranche.disposition,
      reasons: [
        `FFH-D004 disposition: ${tranche.disposition}.`,
        tranche.requestedMonthlyAmount === null
          ? "A usable recurring core-need pace cannot be established from current authoritative facts."
          : `Actionable remaining goal-core pace is $${tranche.requestedMonthlyAmount.toFixed(2)} per month.`,
        tranche.remainingDesiredExcessAmount > 0
          ? `$${tranche.remainingDesiredExcessAmount.toFixed(2)} of remaining desired/excess principal is excluded from the elevated goal-core competition tranche.`
          : "No remaining desired/excess principal is being elevated into the core tranche.",
      ],
    });
  }

  const phaseOrder: Record<BuildStageAllocation["allocationPhase"], number> = {
    required_goal: 1,
    retirement: 2,
    important_goal: 3,
    optional_goal: 4,
  };
  requests.sort((a, b) => phaseOrder[a.allocationPhase] - phaseOrder[b.allocationPhase]
    || (a.rankingFactors && b.rankingFactors
      ? compareGoalRankingFactors(a.rankingFactors, b.rankingFactors)
      : a.category === "retirement" ? -1 : 1));

  const retirementAccountAllocations = totalRetirementAllocatedMonthly > 0
    ? routeRetirementMonthlyAmount(capacityLedger, destinations, totalRetirementAllocatedMonthly)
    : [];
  const routedRetirementMonthlyAmount = roundMoney(
    retirementAccountAllocations.reduce((sum, allocation) => sum + allocation.allocatedMonthlyAmount, 0),
  );
  if (routedRetirementMonthlyAmount !== totalRetirementAllocatedMonthly) {
    throw new Error("Retirement capacity ledger routing invariant failed.");
  }

  const totalAllocatedMonthly = roundMoney(
    requests.reduce((sum, request) => sum + request.allocatedMonthlyAmount, 0),
  );
  const expectedAllocatedMonthly = roundMoney(
    protectedRetirementFloorAllocatedMonthly + competition.totalAllocatedMonthly,
  );
  if (totalAllocatedMonthly !== expectedAllocatedMonthly) {
    throw new Error("Phase 5C Build allocation reconciliation failed.");
  }
  const remainingMonthlyCapacity = roundMoney(
    allocationMonthlyCapacity - totalAllocatedMonthly,
  );
  if (remainingMonthlyCapacity < 0) {
    throw new Error("Phase 5C Build over-routed recurring capacity.");
  }

  if (unresolvedRetirementMonthlyAmount > 0) {
    warnings.push(`$${unresolvedRetirementMonthlyAmount.toFixed(2)} of monthly retirement need/opportunity remains unresolved after verified Build routing.`);
  }
  if (requests.some((request) => request.unfundedMonthlyAmount > 0)) {
    warnings.push("Available monthly capacity is not enough to fully fund every Build-stage request.");
  }
  if (allocationMonthlyCapacity < monthlyPlanCapacity) {
    warnings.push("Build-stage allocations were limited to capacity remaining after higher-priority stages.");
  }

  return {
    asOfDate,
    monthlyPlanCapacity,
    allocationMonthlyCapacity,
    protectedMonthlyFundingNeed,
    protectedRetirementFloorRequestedMonthly,
    protectedRetirementFloorAllocatedMonthly,
    unresolvedProtectedRetirementFloorMonthly,
    feasibility,
    retirement,
    retirementFloor,
    competition,
    retirementAccounts,
    retirementCapacityLedger: cloneRetirementCapacityLedger(capacityLedger),
    retirementAccountAllocations,
    unresolvedRetirementMonthlyAmount,
    goals,
    goalIntelligence,
    allocations: requests,
    totalAllocatedMonthly,
    remainingMonthlyCapacity,
    warnings,
  };
}
