import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { calculatePlanFeasibility, type PlanFeasibility } from "./money-priority-core.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";
import { projectRetirement, type RetirementProjectionResult } from "./money-priority-retirement-projection.ts";
import {
  MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
  type MoneyPriorityPlanningAssumptions,
} from "./money-priority-planning-assumptions.ts";

export type BuildAllocationCategory = "retirement" | "goal";

export type BuildStageAllocation = {
  category: BuildAllocationCategory;
  relatedEntityId: string | null;
  title: string;
  requestedMonthlyAmount: number;
  allocatedMonthlyAmount: number;
  unfundedMonthlyAmount: number;
  priority: number;
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
  goals: GoalFundingAssessment[];
  allocations: BuildStageAllocation[];
  totalAllocatedMonthly: number;
  remainingMonthlyCapacity: number;
  warnings: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
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
    if (remaining === 0) {
      return {
        goalId: goal.id,
        goalName: goal.name,
        requiredMonthlyPace: 0,
        protectedMonthlyNeed: 0,
        monthsRemaining: goal.targetDate ? monthsUntil(asOfDate, goal.targetDate) : null,
        isFunded: true,
        missingData: [],
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
    };
  });
}

export function evaluateBuildStage(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
  allocationMonthlyCapacityOverride?: number,
  planningAssumptions: MoneyPriorityPlanningAssumptions = MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
): BuildStageResult {
  if (!parseIsoDate(asOfDate)) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");

  const warnings: string[] = [];
  const retirement = assessRetirementBuild(snapshot, asOfDate, policy, planningAssumptions);
  const goals = assessGoalFunding(snapshot, asOfDate);
  const goalById = new Map(goals.map((goal) => [goal.goalId, goal]));

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
      priority: 100,
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

  for (const goal of snapshot.goals) {
    const assessment = goalById.get(goal.id)!;
    if (assessment.isFunded) continue;
    if (assessment.requiredMonthlyPace === null) {
      warnings.push(`${goal.name}: ${assessment.missingData.join(" ")}`);
      continue;
    }

    let priority = Math.max(0, 50 - goal.priority);
    if (goal.necessity === "required") priority += 100;
    else if (goal.necessity === "important") priority += 40;
    if (goal.goalClass === "necessary_protective") priority += 50;
    if (goal.deadlineFlexibility === "fixed") priority += 30;
    if (goal.consequenceLevel === "high") priority += 20;
    if (goal.necessity === "optional" || goal.goalClass === "lifestyle_optional") priority -= 50;

    requests.push({
      category: "goal",
      relatedEntityId: goal.id,
      title: `Fund ${goal.name}`,
      requestedMonthlyAmount: assessment.requiredMonthlyPace,
      allocatedMonthlyAmount: 0,
      unfundedMonthlyAmount: assessment.requiredMonthlyPace,
      priority,
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

  requests.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

  let remainingMonthlyCapacity = allocationMonthlyCapacity;
  for (const request of requests) {
    const allocated = roundMoney(Math.min(request.requestedMonthlyAmount, remainingMonthlyCapacity));
    request.allocatedMonthlyAmount = allocated;
    request.unfundedMonthlyAmount = roundMoney(Math.max(0, request.requestedMonthlyAmount - allocated));
    remainingMonthlyCapacity = roundMoney(Math.max(0, remainingMonthlyCapacity - allocated));
  }

  const totalAllocatedMonthly = roundMoney(
    requests.reduce((sum, request) => sum + request.allocatedMonthlyAmount, 0),
  );

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
    goals,
    allocations: requests,
    totalAllocatedMonthly,
    remainingMonthlyCapacity,
    warnings,
  };
}
