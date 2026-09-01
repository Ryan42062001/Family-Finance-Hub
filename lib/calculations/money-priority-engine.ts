import { buildMoneyPrioritySnapshot, type MoneyPriorityRawSnapshot, type MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { calculatePlanFeasibility, type PlanFeasibility } from "./money-priority-core.ts";
import { evaluateSecureStage, type SecureStageResult } from "./money-priority-secure.ts";
import { evaluateBuildStage, type BuildStageResult } from "./money-priority-build.ts";
import { evaluateOptimizeStage, type OptimizeStageResult } from "./money-priority-optimize.ts";
import { evaluateExistingCashDeployment, type ExistingCashDeploymentResult } from "./money-priority-existing-cash.ts";
import { buildResidualNeedsSnapshot, deriveResidualNeedsContext, type ResidualNeedsContext } from "./money-priority-residual-needs.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";
import { MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1 } from "./money-priority-planning-assumptions.ts";
import { evaluateRetirementAccountOpportunities } from "./money-priority-retirement-accounts.ts";
import {
  cloneRetirementCapacityLedger,
  consumeRetirementCapacity,
  createRetirementCapacityLedger,
  remainingRetirementCapacity,
  retirementCapacityInvariantHolds,
  type RetirementCapacityLedger,
} from "./money-priority-retirement-capacity.ts";

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
  taxPolicyVersion: string;
  taxYear: number;
  asOfDate: string;
  snapshot: MoneyPrioritySnapshot;
  feasibility: PlanFeasibility;
  existingCash: ExistingCashDeploymentResult;
  residualNeeds: ResidualNeedsContext;
  retirementCapacityLedger: RetirementCapacityLedger;
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

function remainingContributionMonths(asOfDate: string, taxYear: number): number {
  const date = new Date(`${asOfDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== taxYear) return 12;
  return 12 - date.getUTCMonth();
}

function allocateSecureRecommendations(
  secure: SecureStageResult,
  monthlyCapacity: number,
  asOfDate: string,
  retirementCapacityLedger: RetirementCapacityLedger,
): SecureAllocationPlan {
  let remainingMonthlyCapacity = roundMoney(Math.max(0, monthlyCapacity));
  let protectedMonthlyNeed = 0;
  let hasUnfundedPriority = false;
  let reserveAllocatedThisPlan = 0;
  const recommendations: MoneyPriorityRecommendation[] = [];

  for (const item of secure.recommendations) {
    const isProtectedPriority = item.state === "recommended" && (item.urgency === "required" || item.urgency === "high");
    const explicitMonthlyNeed = isProtectedPriority && item.monthlyAmount && item.monthlyAmount > 0 ? item.monthlyAmount : 0;
    protectedMonthlyNeed = roundMoney(protectedMonthlyNeed + explicitMonthlyNeed);

    const category = item.id.includes("match") ? "employer_match" : item.id.includes("debt") || item.id.includes("promo") ? "debt" : "reserve";
    let allocatedMonthlyAmount = 0;
    let legalConsumedAnnualAmount: number | null = null;
    let tradeoffs: string[] = [];
    const rawBalanceGap = Math.max(0, item.gapAmount ?? 0);
    const effectiveBalanceGap = category === "reserve" ? Math.max(0, rawBalanceGap - reserveAllocatedThisPlan) : rawBalanceGap;

    if (isProtectedPriority && remainingMonthlyCapacity > 0) {
      let requestedThisMonth = explicitMonthlyNeed > 0 ? explicitMonthlyNeed : effectiveBalanceGap;
      if (category === "employer_match" && item.relatedEntityId) {
        const annualRoom = remainingRetirementCapacity(retirementCapacityLedger, item.relatedEntityId) ?? 0;
        const contributionMonths = remainingContributionMonths(
          asOfDate,
          retirementCapacityLedger.taxYear,
        );
        requestedThisMonth = Math.min(requestedThisMonth, roundMoney(annualRoom / contributionMonths));
      }
      allocatedMonthlyAmount = roundMoney(Math.min(requestedThisMonth, remainingMonthlyCapacity));
      if (category === "employer_match" && item.relatedEntityId && allocatedMonthlyAmount > 0) {
        const contributionMonths = remainingContributionMonths(
          asOfDate,
          retirementCapacityLedger.taxYear,
        );
        const consumption = consumeRetirementCapacity(
          retirementCapacityLedger,
          item.relatedEntityId,
          "secure",
          roundMoney(allocatedMonthlyAmount * contributionMonths),
        );
        legalConsumedAnnualAmount = consumption.consumedAnnualAmount;
        allocatedMonthlyAmount = roundMoney(consumption.consumedAnnualAmount / contributionMonths);
      }
      remainingMonthlyCapacity = roundMoney(Math.max(0, remainingMonthlyCapacity - allocatedMonthlyAmount));
      if (category === "reserve") reserveAllocatedThisPlan = roundMoney(reserveAllocatedThisPlan + allocatedMonthlyAmount);
      if (explicitMonthlyNeed > allocatedMonthlyAmount) {
        const gap = roundMoney(explicitMonthlyNeed - allocatedMonthlyAmount);
        tradeoffs = [`$${gap.toFixed(2)} of the required monthly pace remains unfunded at current capacity.`];
        hasUnfundedPriority = true;
      } else if (explicitMonthlyNeed === 0 && effectiveBalanceGap > allocatedMonthlyAmount) {
        const balanceRemaining = roundMoney(effectiveBalanceGap - allocatedMonthlyAmount);
        tradeoffs = [`$${balanceRemaining.toFixed(2)} of this higher-priority balance remains after the current monthly allocation.`];
        hasUnfundedPriority = true;
      }
    } else if (isProtectedPriority && (explicitMonthlyNeed > 0 || effectiveBalanceGap > 0)) {
      hasUnfundedPriority = true;
    }

    recommendations.push({
      id: item.id, rank: 0, stage: "secure", state: item.state, urgency: item.urgency, title: item.title,
      explanation: item.reasons.join(" "),
      allocations: allocatedMonthlyAmount > 0 ? [{
        category,
        relatedEntityId: item.relatedEntityId,
        monthlyAmount: allocatedMonthlyAmount,
        annualAmount: legalConsumedAnnualAmount !== null
          ? legalConsumedAnnualAmount
          : item.legalRemainingAnnualRoom === undefined || item.legalRemainingAnnualRoom === null
          ? roundMoney(allocatedMonthlyAmount * 12)
          : roundMoney(Math.min(allocatedMonthlyAmount * 12, item.legalRemainingAnnualRoom)),
        rationale: item.reasons,
      }] : [],
      whyNow: item.reasons, tradeoffs,
      sourceInputs: [item.relatedEntityId ? `entity:${item.relatedEntityId}` : "household_snapshot"], assumptions: [],
      missingData: item.state === "more_information_needed" ? item.reasons : [],
    });
  }
  return { recommendations, remainingMonthlyCapacity, protectedMonthlyNeed, hasUnfundedPriority };
}

function buildRecommendations(build: BuildStageResult): MoneyPriorityRecommendation[] {
  const recommendations: MoneyPriorityRecommendation[] = [];
  if (build.retirement.state === "more_information_needed") recommendations.push({ id: "build-retirement-missing-data", rank: 0, stage: "build", state: "more_information_needed", urgency: "medium", title: "Complete retirement planning data", explanation: build.retirement.missingData.join(" "), allocations: [], whyNow: [], tradeoffs: [], sourceInputs: ["retirementProfile", "monthlyGrossIncomeKnown"], assumptions: build.retirement.projection.assumptions, missingData: build.retirement.missingData });
  if (build.retirement.guidanceMode === "projection") {
    const projection = build.retirement.projection;
    recommendations.push({ id: "build-retirement-projection", rank: 0, stage: "build", state: projection.state === "shortfall" ? "recommended" : "worth_considering", urgency: projection.state === "shortfall" ? "high" : "optional", title: projection.state === "shortfall" ? "Close the modeled retirement projection gap" : "Retirement projection is currently on track", explanation: projection.state === "shortfall" ? `The modeled portfolio shortfall is $${(projection.projectedShortfall ?? 0).toFixed(2)} under the current planning assumptions.` : "Current assets and ongoing contributions meet or exceed the modeled portfolio target under the current planning assumptions.", allocations: [], whyNow: projection.state === "shortfall" && projection.requiredAdditionalMonthlyContribution !== null ? [`The projection estimates approximately $${projection.requiredAdditionalMonthlyContribution.toFixed(2)} of additional monthly retirement funding.`] : [], tradeoffs: ["Long-range retirement projections are sensitive to spending, returns, retirement age, and guaranteed-income assumptions."], sourceInputs: ["retirementAccounts", "plannedRetirementAge", "desiredRetirementMonthlySpending", "planningGuaranteedIncome"], assumptions: projection.assumptions, missingData: projection.missingData });
  }
  for (const allocation of build.allocations) {
    if (allocation.allocatedMonthlyAmount <= 0 && allocation.unfundedMonthlyAmount <= 0) continue;
    const urgency = allocation.category === "retirement"
      ? "high"
      : allocation.rankingFactors?.economicTier === "required_protective"
        ? "high"
        : allocation.rankingFactors?.economicTier === "important"
          ? "medium"
          : "optional";
    const actionableAllocations: MoneyPriorityAllocation[] = allocation.category === "retirement"
      ? build.retirementAccountAllocations.map((accountAllocation) => ({
          category: "retirement",
          relatedEntityId: accountAllocation.accountId,
          monthlyAmount: accountAllocation.allocatedMonthlyAmount,
          annualAmount: roundMoney(accountAllocation.allocatedMonthlyAmount * 12),
          rationale: [
            ...allocation.reasons,
            "This account-specific amount is backed by the shared retirement legal-capacity ledger.",
          ],
        }))
      : allocation.allocatedMonthlyAmount > 0
        ? [{
            category: allocation.category,
            relatedEntityId: allocation.relatedEntityId,
            monthlyAmount: allocation.allocatedMonthlyAmount,
            annualAmount: roundMoney(allocation.allocatedMonthlyAmount * 12),
            rationale: allocation.reasons,
          }]
        : [];
    recommendations.push({ id: `build-${allocation.category}-${allocation.relatedEntityId ?? "household"}`, rank: 0, stage: "build", state: actionableAllocations.length > 0 ? "recommended" : "worth_considering", urgency, title: allocation.title, explanation: allocation.reasons.join(" "), allocations: actionableAllocations, whyNow: allocation.reasons, tradeoffs: allocation.unfundedMonthlyAmount > 0 ? [`$${allocation.unfundedMonthlyAmount.toFixed(2)} per month remains an unfunded planning need; it is not an actionable contribution without verified legal account room.`] : [], sourceInputs: [allocation.category === "retirement" ? "retirementAccounts" : `goal:${allocation.relatedEntityId}`], assumptions: allocation.category === "retirement" ? build.retirement.projection.assumptions : [], missingData: [] });
  }
  const availableAccounts = build.retirementAccounts.opportunities.filter((item) =>
    item.state === "available"
      && (remainingRetirementCapacity(build.retirementCapacityLedger, item.accountId) ?? 0) > 0);
  const accountDataNeeded = build.retirementAccounts.opportunities.filter((item) => item.state === "more_information_needed");
  if (availableAccounts.length || accountDataNeeded.length) {
    const roomSummary = availableAccounts.map((item) => `${item.accountName}: $${(remainingRetirementCapacity(build.retirementCapacityLedger, item.accountId) ?? 0).toFixed(2)} of known ${build.retirementAccounts.taxYear} contribution room`).join("; ");
    const missing = accountDataNeeded.flatMap((item) => item.missingData.map((value) => `${item.accountName}: ${value}`));
    recommendations.push({ id: "build-retirement-account-options", rank: 0, stage: "build", state: availableAccounts.length ? "worth_considering" : "more_information_needed", urgency: "medium", title: "Choose the accounts for additional retirement funding", explanation: availableAccounts.length ? `Known account room: ${roomSummary}. The engine does not impose a universal account sequence.` : "Contribution room cannot yet be translated into an account-specific allocation safely.", allocations: [], whyNow: availableAccounts.length ? ["Account-specific room is known for at least one tax-advantaged account."] : [], tradeoffs: ["Tax treatment, eligibility, plan quality, and diversification can change which account is the better destination for the next dollar."], sourceInputs: build.retirementAccounts.opportunities.map((item) => `retirementAccount:${item.accountId}`), assumptions: [`Tax policy version ${build.retirementAccounts.taxPolicyVersion} for tax year ${build.retirementAccounts.taxYear}.`], missingData: missing });
  }
  for (const goal of build.goals) if (goal.missingData.length) recommendations.push({ id: `build-goal-missing-${goal.goalId}`, rank: 0, stage: "build", state: "more_information_needed", urgency: "medium", title: `Complete planning details for ${goal.goalName}`, explanation: goal.missingData.join(" "), allocations: [], whyNow: [], tradeoffs: [], sourceInputs: [`goal:${goal.goalId}`], assumptions: [], missingData: goal.missingData });
  return recommendations;
}

function optimizeRecommendations(optimize: OptimizeStageResult): MoneyPriorityRecommendation[] {
  return optimize.recommendations.map((item) => ({ id: item.id, rank: 0, stage: "optimize" as const, state: item.state, urgency: item.urgency, title: item.title, explanation: item.reasons.join(" "), allocations: [...(item.debtMonthlyAmount > 0 ? [{ category: "debt", relatedEntityId: item.relatedDebtId, monthlyAmount: item.debtMonthlyAmount, annualAmount: roundMoney(item.debtMonthlyAmount * 12), rationale: item.reasons }] : []), ...(item.investingMonthlyAmount > 0 ? [{ category: "investing", relatedEntityId: null, monthlyAmount: item.investingMonthlyAmount, annualAmount: roundMoney(item.investingMonthlyAmount * 12), rationale: item.reasons }] : [])], whyNow: item.reasons, tradeoffs: item.tradeoffs, sourceInputs: [item.relatedDebtId ? `debt:${item.relatedDebtId}` : "household_snapshot", "debtVsInvesting"], assumptions: ["No assumed market return is used; the decision compares the guaranteed avoided debt interest with liquidity, horizon, and household preference."], missingData: item.missingData }));
}

export type MoneyPriorityEngineOptions = { allowSignedHypotheticalExpenseAdjustments?: boolean };

export function runMoneyPriorityEngine(raw: MoneyPriorityRawSnapshot, asOfDate: string, policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1, options: MoneyPriorityEngineOptions = {}): MoneyPriorityEngineResult {
  const snapshot = buildMoneyPrioritySnapshot(raw, options);
  const monthlyPlanCapacity = Math.max(0, snapshot.aggregates.monthlyCashFlowBeforeSavings);
  const retirementOpportunities = evaluateRetirementAccountOpportunities(snapshot);
  const retirementCapacityLedger = createRetirementCapacityLedger(retirementOpportunities);

  // Build a provisional recurring plan only to identify eligible one-time cash uses.
  // The authoritative recurring plan is recomputed from immutable residual needs below.
  const provisionalCapacityLedger = cloneRetirementCapacityLedger(retirementCapacityLedger);
  const provisionalSecure = evaluateSecureStage(
    snapshot,
    asOfDate,
    policy,
    retirementOpportunities,
    provisionalCapacityLedger,
  );
  const provisionalSecurePlan = allocateSecureRecommendations(
    provisionalSecure,
    monthlyPlanCapacity,
    asOfDate,
    provisionalCapacityLedger,
  );
  const provisionalBuild = evaluateBuildStage(
    snapshot,
    asOfDate,
    policy,
    provisionalSecurePlan.remainingMonthlyCapacity,
    MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
    undefined,
    retirementOpportunities,
    provisionalCapacityLedger,
  );
  const provisionalFeasibility = calculatePlanFeasibility(
    snapshot,
    roundMoney(provisionalSecurePlan.protectedMonthlyNeed + provisionalBuild.protectedMonthlyFundingNeed),
  );
  const provisionalOptimize = evaluateOptimizeStage(
    snapshot,
    provisionalBuild,
    !provisionalSecurePlan.hasUnfundedPriority && provisionalFeasibility.status !== "funding_gap",
    policy,
  );

  const existingCash = evaluateExistingCashDeployment(
    snapshot,
    provisionalSecure,
    provisionalBuild,
    provisionalOptimize,
    policy,
    retirementCapacityLedger,
  );
  const residualNeeds = deriveResidualNeedsContext(existingCash);
  const residualSnapshot = buildResidualNeedsSnapshot(snapshot, residualNeeds);

  const secure = evaluateSecureStage(
    residualSnapshot,
    asOfDate,
    policy,
    retirementOpportunities,
    retirementCapacityLedger,
  );
  const securePlan = allocateSecureRecommendations(
    secure,
    monthlyPlanCapacity,
    asOfDate,
    retirementCapacityLedger,
  );
  const build = evaluateBuildStage(
    residualSnapshot,
    asOfDate,
    policy,
    securePlan.remainingMonthlyCapacity,
    MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
    undefined,
    retirementOpportunities,
    retirementCapacityLedger,
  );
  if (!retirementCapacityInvariantHolds(retirementCapacityLedger)) {
    throw new Error("Cross-stage retirement legal-capacity invariant failed.");
  }
  const feasibility = calculatePlanFeasibility(
    residualSnapshot,
    roundMoney(securePlan.protectedMonthlyNeed + build.protectedMonthlyFundingNeed),
  );
  const optimizeUnlocked = !securePlan.hasUnfundedPriority && feasibility.status !== "funding_gap";
  const optimize = evaluateOptimizeStage(residualSnapshot, build, optimizeUnlocked, policy);
  const recommendations = normalizeRanks([
    ...stabilizeRecommendations(snapshot, feasibility),
    ...securePlan.recommendations,
    ...buildRecommendations(build),
    ...optimizeRecommendations(optimize),
  ]);

  return {
    policyVersion: policy.version,
    planningAssumptionsVersion: MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1.version,
    taxPolicyVersion: build.retirementAccounts.taxPolicyVersion,
    taxYear: build.retirementAccounts.taxYear,
    asOfDate,
    snapshot,
    feasibility,
    existingCash,
    residualNeeds,
    retirementCapacityLedger: cloneRetirementCapacityLedger(retirementCapacityLedger),
    secure,
    build,
    optimize,
    recommendations,
    warnings: [...snapshot.warnings, ...build.warnings],
  };
}
