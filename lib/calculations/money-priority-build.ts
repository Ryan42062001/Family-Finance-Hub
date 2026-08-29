import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { calculatePlanFeasibility, type PlanFeasibility } from "./money-priority-core.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";

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
  state: "benchmark_met" | "below_benchmark" | "more_information_needed";
  monthlyGrossIncome: number | null;
  currentEmployeeMonthlyContribution: number;
  currentEmployerMonthlyContribution: number;
  currentTotalMonthlyContribution: number;
  currentPersonalSavingsRate: number | null;
  currentTotalSavingsRate: number | null;
  healthyBenchmarkMonthlyTarget: number | null;
  healthyBenchmarkMonthlyGap: number;
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
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
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

  if (snapshot.aggregates.hasIncompleteGrossIncome || snapshot.aggregates.monthlyGrossIncomeKnown <= 0) {
    return {
      state: "more_information_needed",
      monthlyGrossIncome: null,
      currentEmployeeMonthlyContribution,
      currentEmployerMonthlyContribution,
      currentTotalMonthlyContribution,
      currentPersonalSavingsRate: null,
      currentTotalSavingsRate: null,
      healthyBenchmarkMonthlyTarget: null,
      healthyBenchmarkMonthlyGap: 0,
      missingData: ["Complete gross-income data is required to evaluate the retirement savings-rate benchmark."],
    };
  }

  const monthlyGrossIncome = snapshot.aggregates.monthlyGrossIncomeKnown;
  const healthyBenchmarkMonthlyTarget = roundMoney(
    monthlyGrossIncome * policy.retirementBenchmark.healthyLower,
  );
  const healthyBenchmarkMonthlyGap = roundMoney(
    Math.max(0, healthyBenchmarkMonthlyTarget - currentTotalMonthlyContribution),
  );

  return {
    state: healthyBenchmarkMonthlyGap > 0 ? "below_benchmark" : "benchmark_met",
    monthlyGrossIncome,
    currentEmployeeMonthlyContribution,
    currentEmployerMonthlyContribution,
    currentTotalMonthlyContribution,
    currentPersonalSavingsRate: currentEmployeeMonthlyContribution / monthlyGrossIncome,
    currentTotalSavingsRate: currentTotalMonthlyContribution / monthlyGrossIncome,
    healthyBenchmarkMonthlyTarget,
    healthyBenchmarkMonthlyGap,
    missingData: [],
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
): BuildStageResult {
  if (!parseIsoDate(asOfDate)) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");

  const warnings: string[] = [];
  const retirement = assessRetirementBuild(snapshot, policy);
  const goals = assessGoalFunding(snapshot, asOfDate);
  const goalById = new Map(goals.map((goal) => [goal.goalId, goal]));

  const protectedGoalNeed = roundMoney(goals.reduce((sum, goal) => sum + goal.protectedMonthlyNeed, 0));
  const protectedRetirementNeed = retirement.state === "below_benchmark"
    ? retirement.healthyBenchmarkMonthlyGap
    : 0;
  const protectedMonthlyFundingNeed = roundMoney(protectedGoalNeed + protectedRetirementNeed);
  const feasibility = calculatePlanFeasibility(snapshot, protectedMonthlyFundingNeed);
  const monthlyPlanCapacity = roundMoney(Math.max(0, feasibility.monthlyPlanCapacity));
  const allocationMonthlyCapacity = roundMoney(Math.max(
    0,
    Math.min(monthlyPlanCapacity, allocationMonthlyCapacityOverride ?? monthlyPlanCapacity),
  ));

  const requests: BuildStageAllocation[] = [];

  if (retirement.state === "below_benchmark" && retirement.healthyBenchmarkMonthlyGap > 0) {
    requests.push({
      category: "retirement",
      relatedEntityId: null,
      title: "Increase retirement contributions toward the healthy benchmark",
      requestedMonthlyAmount: retirement.healthyBenchmarkMonthlyGap,
      allocatedMonthlyAmount: 0,
      unfundedMonthlyAmount: retirement.healthyBenchmarkMonthlyGap,
      priority: 100,
      reasons: ["The current total retirement savings rate is below the policy healthy-lower benchmark."],
    });
  } else if (retirement.state === "more_information_needed") {
    warnings.push(...retirement.missingData);
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
