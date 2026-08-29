import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot, type MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { calculatePlanFeasibility, type PlanFeasibility } from "./money-priority-core.ts";
import { evaluateSecureStage, type SecureStageResult } from "./money-priority-secure.ts";
import { evaluateBuildStage, type BuildStageResult } from "./money-priority-build.ts";
import { evaluateOptimizeStage, type OptimizeStageResult } from "./money-priority-optimize.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";

export type RecommendationState = "recommended" | "worth_considering" | "more_information_needed";

export type MoneyPriorityAllocation = {
  category: string;
  relatedEntityId: string | null;
  monthlyAmount: number;
  annualAmount: number | null;
  rationale: string[];
};

export type MoneyPriorityRecommendation = {
  id: string;
  rank: number;
  stage: "stabilize" | "secure" | "build" | "optimize";
  state: RecommendationState;
  urgency: "required" | "high" | "medium" | "optional";
  title: string;
  explanation: string;
  allocations: MoneyPriorityAllocation[];
  whyNow: string[];
  tradeoffs: string[];
  sourceInputs: string[];
  assumptions: string[];
  missingData: string[];
};

export type MoneyPriorityEngineResult = {
  policyVersion: string;
  planningAssumptionsVersion: string;
  asOfDate: string;
  snapshot: MoneyPrioritySnapshot;
  feasibility: PlanFeasibility;
  secure: SecureStageResult;
  build: BuildStageResult;
  optimize: OptimizeStageResult;
  recommendations: MoneyPriorityRecommendation[];
  warnings: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeRanks(recommendations: MoneyPriorityRecommendation[]): MoneyPriorityRecommendation[] {
  return recommendations.map((recommendation, index) => ({ ...recommendation, rank: index + 1 }));
}

function stabilizeRecommendations(snapshot: MoneyPrioritySnapshot, feasibility: PlanFeasibility): MoneyPriorityRecommendation[] {
  if (snapshot.aggregates.monthlyCashFlowBeforeSavings >= 0 && feasibility.status !== "funding_gap") return [];
  return [{
    id: "stabilize-cash-flow-gap", rank: 0, stage: "stabilize", state: "recommended", urgency: "required",
    title: "Close the monthly funding gap before adding new commitments",
    explanation: "Current required spending and protected funding needs exceed available monthly capacity.", allocations: [],
    whyNow: ["A structurally negative plan cannot safely support additional savings, investing, or debt-acceleration commitments."],
    tradeoffs: ["The plan may need lower discretionary spending, adjusted goal timelines, reduced above-floor contributions, or higher income."],
    sourceInputs: ["monthlyCashFlowBeforeSavings", "protectedMonthlyFundingNeed"], assumptions: [], missingData: [],
  }];
}

type SecureAllocationPlan = {
  recommendations: MoneyPriorityRecommendation[];
  remainingMonthlyCapacity: number;
  protectedMonthlyNeed: number;
  hasUnfundedPriority: boolean;
};

function allocateSecureRecommendations(secure: SecureStageResult, monthlyCapacity: number): SecureAllocationPlan {
  let remainingMonthlyCapacity = roundMoney(Math.max(0, monthlyCapacity));
  let protectedMonthlyNeed = 0;
  let hasUnfundedPriority = false;
  const recommendations: MoneyPriorityRecommendation[] = [];

  for (const item of secure.recommendations) {
    const isProtectedPriority = item.state === "recommended" && (item.urgency === "required" || item.urgency === "high");
    const explicitMonthlyNeed = isProtectedPriority && item.monthlyAmount && item.monthlyAmount > 0 ? item.monthlyAmount : 0;
    protectedMonthlyNeed = roundMoney(protectedMonthlyNeed + explicitMonthlyNeed);

    let allocatedMonthlyAmount = 0;
    let tradeoffs: string[] = [];

    if (isProtectedPriority && remainingMonthlyCapacity > 0) {
      const requestedThisMonth = explicitMonthlyNeed > 0
        ? explicitMonthlyNeed
        : Math.max(0, item.gapAmount ?? 0);
      allocatedMonthlyAmount = roundMoney(Math.min(requestedThisMonth, remainingMonthlyCapacity));
      remainingMonthlyCapacity = roundMoney(Math.max(0, remainingMonthlyCapacity - allocatedMonthlyAmount));

      if (explicitMonthlyNeed > allocatedMonthlyAmount) {
        const gap = roundMoney(explicitMonthlyNeed - allocatedMonthlyAmount);
        tradeoffs = [`$${gap.toFixed(2)} of the required monthly pace remains unfunded at current capacity.`];
        hasUnfundedPriority = true;
      } else if (explicitMonthlyNeed === 0 && (item.gapAmount ?? 0) > allocatedMonthlyAmount) {
        const balanceRemaining = roundMoney((item.gapAmount ?? 0) - allocatedMonthlyAmount);
        tradeoffs = [`$${balanceRemaining.toFixed(2)} of this higher-priority balance remains after the current monthly allocation.`];
        hasUnfundedPriority = true;
      }
    } else if (isProtectedPriority) {
      hasUnfundedPriority = true;
    }

    const category = item.id.includes("match")
      ? "employer_match"
      : item.id.includes("debt") || item.id.includes("promo")
        ? "debt"
        : "reserve";

    recommendations.push({
      id: item.id, rank: 0, stage: "secure", state: item.state, urgency: item.urgency, title: item.title,
      explanation: item.reasons.join(" "),
      allocations: allocatedMonthlyAmount > 0 ? [{
        category, relatedEntityId: item.relatedEntityId, monthlyAmount: allocatedMonthlyAmount,
        annualAmount: roundMoney(allocatedMonthlyAmount * 12), rationale: item.reasons,
      }] : [],
      whyNow: item.reasons, tradeoffs,
      sourceInputs: [item.relatedEntityId ? `entity:${item.relatedEntityId}` : "household_snapshot"],
      assumptions: [], missingData: item.state === "more_information_needed" ? item.reasons : [],
    });
  }

  return { recommendations, remainingMonthlyCapacity, protectedMonthlyNeed, hasUnfundedPriority };
}

function buildRecommendations(build: BuildStageResult): MoneyPriorityRecommendation[] {
  const recommendations: MoneyPriorityRecommendation[] = [];
  if (build.retirement.state === "more_information_needed") {
    recommendations.push({
      id: "build-retirement-missing-data", rank: 0, stage: "build", state: "more_information_needed", urgency: "medium",
      title: "Complete gross-income data for retirement benchmarking", explanation: build.retirement.missingData.join(" "), allocations: [], whyNow: [], tradeoffs: [],
      sourceInputs: ["monthlyGrossIncomeKnown", "hasIncompleteGrossIncome"], assumptions: [], missingData: build.retirement.missingData,
    });
  }
  for (const allocation of build.allocations) {
    if (allocation.allocatedMonthlyAmount <= 0 && allocation.unfundedMonthlyAmount <= 0) continue;
    const state: RecommendationState = allocation.allocatedMonthlyAmount > 0 ? "recommended" : "worth_considering";
    recommendations.push({
      id: `build-${allocation.category}-${allocation.relatedEntityId ?? "household"}`, rank: 0, stage: "build", state,
      urgency: allocation.priority >= 100 ? "high" : allocation.priority >= 50 ? "medium" : "optional", title: allocation.title,
      explanation: allocation.reasons.join(" "),
      allocations: allocation.allocatedMonthlyAmount > 0 ? [{
        category: allocation.category, relatedEntityId: allocation.relatedEntityId, monthlyAmount: allocation.allocatedMonthlyAmount,
        annualAmount: roundMoney(allocation.allocatedMonthlyAmount * 12), rationale: allocation.reasons,
      }] : [],
      whyNow: allocation.reasons,
      tradeoffs: allocation.unfundedMonthlyAmount > 0 ? [`$${allocation.unfundedMonthlyAmount.toFixed(2)} per month remains unfunded at current capacity.`] : [],
      sourceInputs: [allocation.category === "retirement" ? "retirementAccounts" : `goal:${allocation.relatedEntityId}`], assumptions: [], missingData: [],
    });
  }
  for (const goal of build.goals) {
    if (!goal.missingData.length) continue;
    recommendations.push({
      id: `build-goal-missing-${goal.goalId}`, rank: 0, stage: "build", state: "more_information_needed", urgency: "medium",
      title: `Complete planning details for ${goal.goalName}`, explanation: goal.missingData.join(" "), allocations: [], whyNow: [], tradeoffs: [],
      sourceInputs: [`goal:${goal.goalId}`], assumptions: [], missingData: goal.missingData,
    });
  }
  return recommendations;
}

function optimizeRecommendations(optimize: OptimizeStageResult): MoneyPriorityRecommendation[] {
  return optimize.recommendations.map((item) => ({
    id: item.id, rank: 0, stage: "optimize" as const, state: item.state, urgency: item.urgency, title: item.title,
    explanation: item.reasons.join(" "),
    allocations: [
      ...(item.debtMonthlyAmount > 0 ? [{ category: "debt", relatedEntityId: item.relatedDebtId, monthlyAmount: item.debtMonthlyAmount, annualAmount: roundMoney(item.debtMonthlyAmount * 12), rationale: item.reasons }] : []),
      ...(item.investingMonthlyAmount > 0 ? [{ category: "investing", relatedEntityId: null, monthlyAmount: item.investingMonthlyAmount, annualAmount: roundMoney(item.investingMonthlyAmount * 12), rationale: item.reasons }] : []),
    ],
    whyNow: item.reasons, tradeoffs: item.tradeoffs,
    sourceInputs: [item.relatedDebtId ? `debt:${item.relatedDebtId}` : "household_snapshot", "debtVsInvesting"],
    assumptions: ["No assumed market return is used; the decision compares the guaranteed avoided debt interest with liquidity, horizon, and household preference."],
    missingData: item.missingData,
  }));
}

export function runMoneyPriorityEngine(raw: MoneyPriorityRawSnapshot, asOfDate: string, policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1): MoneyPriorityEngineResult {
  const snapshot = buildMoneyPrioritySnapshot(raw);
  const secure = evaluateSecureStage(snapshot, asOfDate);
  const monthlyPlanCapacity = Math.max(0, snapshot.aggregates.monthlyCashFlowBeforeSavings);
  const securePlan = allocateSecureRecommendations(secure, monthlyPlanCapacity);
  const build = evaluateBuildStage(snapshot, asOfDate, policy, securePlan.remainingMonthlyCapacity);
  const feasibility = calculatePlanFeasibility(
    snapshot,
    roundMoney(securePlan.protectedMonthlyNeed + build.protectedMonthlyFundingNeed),
  );
  const optimizeUnlocked = !securePlan.hasUnfundedPriority && feasibility.status !== "funding_gap";
  const optimize = evaluateOptimizeStage(snapshot, build, optimizeUnlocked);

  const recommendations = normalizeRanks([
    ...stabilizeRecommendations(snapshot, feasibility),
    ...securePlan.recommendations,
    ...buildRecommendations(build),
    ...optimizeRecommendations(optimize),
  ]);

  return {
    policyVersion: policy.version, planningAssumptionsVersion: policy.planningAssumptionsVersion, asOfDate, snapshot, feasibility, secure, build, optimize,
    recommendations, warnings: [...snapshot.warnings, ...build.warnings],
  };
}
