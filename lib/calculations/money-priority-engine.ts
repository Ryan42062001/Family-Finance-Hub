import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot, type MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { calculatePlanFeasibility, type PlanFeasibility } from "./money-priority-core.ts";
import { evaluateSecureStage, type SecureStageResult } from "./money-priority-secure.ts";
import { evaluateBuildStage, type BuildStageResult } from "./money-priority-build.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";

export type RecommendationState =
  | "recommended"
  | "worth_considering"
  | "more_information_needed";

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
  recommendations: MoneyPriorityRecommendation[];
  warnings: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeRanks(recommendations: MoneyPriorityRecommendation[]): MoneyPriorityRecommendation[] {
  return recommendations.map((recommendation, index) => ({
    ...recommendation,
    rank: index + 1,
  }));
}

function stabilizeRecommendations(
  snapshot: MoneyPrioritySnapshot,
  feasibility: PlanFeasibility,
): MoneyPriorityRecommendation[] {
  if (snapshot.aggregates.monthlyCashFlowBeforeSavings >= 0 && feasibility.status !== "funding_gap") return [];

  const gap = Math.max(0, -snapshot.aggregates.monthlyCashFlowBeforeSavings, feasibility.planFundingGap);
  return [{
    id: "stabilize-cash-flow-gap",
    rank: 0,
    stage: "stabilize",
    state: "recommended",
    urgency: "required",
    title: "Close the monthly funding gap before adding new commitments",
    explanation: "Current required spending and protected funding needs exceed available monthly capacity.",
    allocations: [],
    whyNow: ["A structurally negative plan cannot safely support additional savings, investing, or debt-acceleration commitments."],
    tradeoffs: ["The plan may need lower discretionary spending, adjusted goal timelines, reduced above-floor contributions, or higher income."],
    sourceInputs: ["monthlyCashFlowBeforeSavings", "protectedMonthlyFundingNeed"],
    assumptions: [],
    missingData: [],
  }];
}

function secureRecommendations(secure: SecureStageResult): MoneyPriorityRecommendation[] {
  return secure.recommendations.map((item) => ({
    id: item.id,
    rank: 0,
    stage: "secure" as const,
    state: item.state,
    urgency: item.urgency,
    title: item.title,
    explanation: item.reasons.join(" "),
    allocations: item.monthlyAmount && item.monthlyAmount > 0
      ? [{
          category: item.id.includes("match") ? "employer_match" : item.id.includes("debt") ? "debt" : "reserve",
          relatedEntityId: item.relatedEntityId,
          monthlyAmount: item.monthlyAmount,
          annualAmount: roundMoney(item.monthlyAmount * 12),
          rationale: item.reasons,
        }]
      : [],
    whyNow: item.reasons,
    tradeoffs: [],
    sourceInputs: [
      item.relatedEntityId ? `entity:${item.relatedEntityId}` : "household_snapshot",
    ],
    assumptions: [],
    missingData: item.state === "more_information_needed" ? item.reasons : [],
  }));
}

function buildRecommendations(build: BuildStageResult): MoneyPriorityRecommendation[] {
  const recommendations: MoneyPriorityRecommendation[] = [];

  if (build.retirement.state === "more_information_needed") {
    recommendations.push({
      id: "build-retirement-missing-data",
      rank: 0,
      stage: "build",
      state: "more_information_needed",
      urgency: "medium",
      title: "Complete gross-income data for retirement benchmarking",
      explanation: build.retirement.missingData.join(" "),
      allocations: [],
      whyNow: [],
      tradeoffs: [],
      sourceInputs: ["monthlyGrossIncomeKnown", "hasIncompleteGrossIncome"],
      assumptions: [],
      missingData: build.retirement.missingData,
    });
  }

  for (const allocation of build.allocations) {
    if (allocation.allocatedMonthlyAmount <= 0 && allocation.unfundedMonthlyAmount <= 0) continue;

    const state: RecommendationState = allocation.allocatedMonthlyAmount > 0
      ? "recommended"
      : "worth_considering";

    recommendations.push({
      id: `build-${allocation.category}-${allocation.relatedEntityId ?? "household"}`,
      rank: 0,
      stage: "build",
      state,
      urgency: allocation.priority >= 100 ? "high" : allocation.priority >= 50 ? "medium" : "optional",
      title: allocation.title,
      explanation: allocation.reasons.join(" "),
      allocations: allocation.allocatedMonthlyAmount > 0
        ? [{
            category: allocation.category,
            relatedEntityId: allocation.relatedEntityId,
            monthlyAmount: allocation.allocatedMonthlyAmount,
            annualAmount: roundMoney(allocation.allocatedMonthlyAmount * 12),
            rationale: allocation.reasons,
          }]
        : [],
      whyNow: allocation.reasons,
      tradeoffs: allocation.unfundedMonthlyAmount > 0
        ? [`$${allocation.unfundedMonthlyAmount.toFixed(2)} per month remains unfunded at current capacity.`]
        : [],
      sourceInputs: [allocation.category === "retirement" ? "retirementAccounts" : `goal:${allocation.relatedEntityId}`],
      assumptions: [],
      missingData: [],
    });
  }

  for (const goal of build.goals) {
    if (!goal.missingData.length) continue;
    recommendations.push({
      id: `build-goal-missing-${goal.goalId}`,
      rank: 0,
      stage: "build",
      state: "more_information_needed",
      urgency: "medium",
      title: `Complete planning details for ${goal.goalName}`,
      explanation: goal.missingData.join(" "),
      allocations: [],
      whyNow: [],
      tradeoffs: [],
      sourceInputs: [`goal:${goal.goalId}`],
      assumptions: [],
      missingData: goal.missingData,
    });
  }

  return recommendations;
}

export function runMoneyPriorityEngine(
  raw: MoneyPriorityRawSnapshot,
  asOfDate: string,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): MoneyPriorityEngineResult {
  const snapshot = buildMoneyPrioritySnapshot(raw);
  const secure = evaluateSecureStage(snapshot);
  const build = evaluateBuildStage(snapshot, asOfDate, policy);
  const feasibility = calculatePlanFeasibility(snapshot, build.protectedMonthlyFundingNeed);

  const recommendations = normalizeRanks([
    ...stabilizeRecommendations(snapshot, feasibility),
    ...secureRecommendations(secure),
    ...buildRecommendations(build),
  ]);

  return {
    policyVersion: policy.version,
    planningAssumptionsVersion: policy.planningAssumptionsVersion,
    asOfDate,
    snapshot,
    feasibility,
    secure,
    build,
    recommendations,
    warnings: [...snapshot.warnings, ...build.warnings],
  };
}
