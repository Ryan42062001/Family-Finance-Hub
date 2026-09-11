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
  feasibility: PlanFeasibility;
  retirement: RetirementBuildAssessment;
  retirementFloor: HybridRetirementFloorResult;
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

  const protectedGoalNeed = roundMoney(goals.reduce((sum, goal) => sum + goal.protectedMonthlyNeed, 0));
  const protectedRetirementNeed = retirement.recommendedMonthlyIncrease;
  const protectedMonthlyFundingNeed = roundMoney(protectedGoalNeed + protectedRetirementNeed);
  const feasibility = calculatePlanFeasibility(snapshot, protectedMonthlyFundingNeed);
  const monthlyPlanCapacity = roundMoney(Math.max(0, feasibility.monthlyPlanCapacity));
  const allocationMonthlyCapacity = roundMoney(Math.max(
    0,
    Math.min(monthlyPlanCapacity, allocationMonthlyCapacityOverride ?? monthlyPlanCapacity),
  ));

  const requests: BuildStageAllocation[] = [];

  if (retirement.recommendedMonthlyIncrease > 0) {
    const usingProjection = retirement.guidanceMode === "projection";
    requests.push({
      category: "retirement",
      relatedEntityId: null,
      title: usingProjection
        ? "Increase retirement contributions toward the projection-based target"
        : "Increase retirement contributions toward the healthy benchmark",
      requestedMonthlyAmount: retirement.recommendedMonthlyIncrease,
      allocatedMonthlyAmount: 0,
      unfundedMonthlyAmount: retirement.recommendedMonthlyIncrease,
      rankingFactors: null,
      protectedAllocatedMonthlyAmount: 0,
      allocationPhase: "retirement",
      reasons: usingProjection
        ? [
            "Projection-based guidance is available and is primary over the generic savings-rate benchmark.",
            `The modeled shortfall requires approximately $${retirement.recommendedMonthlyIncrease.toFixed(2)} of additional monthly retirement funding under the current planning assumptions.`,
          ]
        : ["Projection inputs are incomplete, so the engine is using the policy healthy-lower retirement benchmark as a fallback."],
    });
  }

  if (retirement.guidanceMode === "unavailable") {
    warnings.push(...retirement.missingData);
  } else if (retirement.guidanceMode === "benchmark" && retirement.missingData.length) {
    warnings.push(`Projection-based retirement guidance is unavailable: ${retirement.missingData.join(" ")}`);
  }
  warnings.push(...retirementAccounts.warnings);

  for (const assessment of goals) {
    const goal = sourceGoalById.get(assessment.goalId)!;
    if (assessment.isFunded) continue;
    if (assessment.requiredMonthlyPace === null) {
      warnings.push(`${goal.name}: ${assessment.missingData.join(" ")}`);
      continue;
    }

    requests.push({
      category: "goal",
      relatedEntityId: goal.id,
      title: `Fund ${goal.name}`,
      requestedMonthlyAmount: assessment.requiredMonthlyPace,
      allocatedMonthlyAmount: 0,
      unfundedMonthlyAmount: assessment.requiredMonthlyPace,
      rankingFactors: assessment.rankingFactors,
      protectedAllocatedMonthlyAmount: 0,
      allocationPhase: assessment.rankingFactors.economicTier === "required_protective"
        ? "required_goal"
        : assessment.rankingFactors.economicTier === "important"
          ? "important_goal"
          : "optional_goal",
      reasons: [
        `Required pace is $${assessment.requiredMonthlyPace.toFixed(2)} per month.`,
        goal.necessity === "required"
          ? "This is marked as a required goal."
          : goal.necessity === "important"
            ? "This is marked as an important goal."
            : "This is marked as an optional goal.",
      ],
    });
  }

  let remainingMonthlyCapacity = allocationMonthlyCapacity;
  const goalRequests = requests.filter((request) => request.category === "goal");
  const retirementRequest = requests.find((request) => request.category === "retirement");
  const tierOrder = new Map([
    ["strong_tax_advantaged", 1], ["diversification_opportunity", 2], ["secondary_tax_advantaged", 3],
  ]);
  const retirementDestinations = retirementAccounts.opportunities
    .filter((item) => item.state === "available" && item.contributionSource !== "employer"
      && item.opportunityTier !== "unavailable_or_unknown")
    .sort((a, b) => (tierOrder.get(a.opportunityTier ?? "") ?? 99)
      - (tierOrder.get(b.opportunityTier ?? "") ?? 99)
      || a.accountId.localeCompare(b.accountId));
  const routableLedger = cloneRetirementCapacityLedger(capacityLedger);
  let routableAnnualRoom = 0;
  for (const destination of retirementDestinations) {
    const room = remainingRetirementCapacity(routableLedger, destination.accountId);
    if (room === null || room <= 0) continue;
    const consumed = consumeRetirementCapacity(
      routableLedger,
      destination.accountId,
      "build",
      room,
    );
    routableAnnualRoom = roundMoney(routableAnnualRoom + consumed.consumedAnnualAmount);
  }
  const routableRetirementMonthlyCapacity = roundMoney(routableAnnualRoom / 12);
  const allocate = (request: BuildStageAllocation, maximum: number, isProtected = false) => {
    const stillNeeded = roundMoney(Math.max(0, request.requestedMonthlyAmount - request.allocatedMonthlyAmount));
    const allocated = roundMoney(Math.min(stillNeeded, maximum, remainingMonthlyCapacity));
    request.allocatedMonthlyAmount = roundMoney(request.allocatedMonthlyAmount + allocated);
    if (isProtected) request.protectedAllocatedMonthlyAmount = roundMoney(
      request.protectedAllocatedMonthlyAmount + allocated,
    );
    request.unfundedMonthlyAmount = roundMoney(Math.max(0, request.requestedMonthlyAmount - request.allocatedMonthlyAmount));
    remainingMonthlyCapacity = roundMoney(Math.max(0, remainingMonthlyCapacity - allocated));
  };

  // Pass 1 protects every qualifying goal before any goal is topped up.
  for (const request of goalRequests) {
    const assessment = goalById.get(request.relatedEntityId!)!;
    if (assessment.protectedMonthlyNeed <= 0) continue;
    allocate(request, assessment.protectedMonthlyNeed, true);
  }

  // Required/protective goals retain their legitimate pace before additional retirement.
  for (const request of goalRequests.filter((item) => item.rankingFactors?.economicTier === "required_protective")) {
    request.allocationPhase = "required_goal";
    allocate(request, request.requestedMonthlyAmount);
  }

  if (retirementRequest) allocate(
    retirementRequest,
    Math.min(retirementRequest.requestedMonthlyAmount, routableRetirementMonthlyCapacity),
  );

  for (const request of goalRequests.filter((item) => item.rankingFactors?.economicTier === "important")) {
    request.allocationPhase = "important_goal";
    allocate(request, request.requestedMonthlyAmount);
  }
  for (const request of goalRequests.filter((item) => item.rankingFactors?.economicTier === "optional_lifestyle")) {
    request.allocationPhase = "optional_goal";
    allocate(request, request.requestedMonthlyAmount);
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

  const totalAllocatedMonthly = roundMoney(
    requests.reduce((sum, request) => sum + request.allocatedMonthlyAmount, 0),
  );

  const retirementAccountAllocations: BuildStageResult["retirementAccountAllocations"] = [];
  let retirementToRoute = retirementRequest?.allocatedMonthlyAmount ?? 0;
  for (const destination of retirementDestinations) {
    if (retirementToRoute <= 0) break;
    const annualRoom = remainingRetirementCapacity(capacityLedger, destination.accountId);
    if (annualRoom === null || annualRoom <= 0) continue;
    const requestedAnnualAmount = roundMoney(Math.min(retirementToRoute * 12, annualRoom));
    const consumption = consumeRetirementCapacity(
      capacityLedger,
      destination.accountId,
      "build",
      requestedAnnualAmount,
    );
    const allocatedMonthlyAmount = roundMoney(consumption.consumedAnnualAmount / 12);
    if (allocatedMonthlyAmount <= 0) continue;
    retirementAccountAllocations.push({
      accountId: destination.accountId,
      opportunityTier: destination.opportunityTier!,
      allocatedMonthlyAmount,
      allocatedAnnualAmount: consumption.consumedAnnualAmount,
    });
    retirementToRoute = roundMoney(Math.max(0, retirementToRoute - allocatedMonthlyAmount));
  }
  // Annual legal limits do not always divide evenly into cents per month (for
  // example, $8,750 / 12). A one-cent monthly display residue is not routable
  // without exceeding the exact annual ledger capacity.
  if (retirementToRoute > 0.01) {
    throw new Error("Retirement capacity ledger routing invariant failed.");
  }
  const unresolvedRetirementMonthlyAmount = retirementRequest?.unfundedMonthlyAmount ?? 0;
  if (unresolvedRetirementMonthlyAmount > 0 && (retirementRequest?.requestedMonthlyAmount ?? 0) > 0) {
    warnings.push(`$${unresolvedRetirementMonthlyAmount.toFixed(2)} of monthly retirement planning need exceeds the verified current-year legal account capacity. The shortfall remains descriptive and is not included in actionable allocations.`);
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
    feasibility,
    retirement,
    retirementFloor,
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
