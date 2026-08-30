import { compareGoalRankingFactors } from "./money-priority-build.ts";
import { assessDebtAction } from "./money-priority-core.ts";
import type { MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";
import { buildResidualNeedsSnapshot } from "./money-priority-residual-needs.ts";

export const WINDFALL_POLICY_VERSION = "2026.1";

export type WindfallSource =
  | "bonus" | "inheritance" | "tax_refund" | "gift" | "asset_sale"
  | "insurance_proceeds" | "legal_settlement" | "business_distribution" | "other";

export type WindfallTaxTreatment =
  | "known_non_taxable" | "known_taxable_liability_provided" | "uncertain" | "not_applicable";

export type WindfallInput = {
  amount: number;
  source: WindfallSource;
  knownTaxLiability?: number | null;
  knownOtherLiability?: number | null;
  restrictedAmount?: number | null;
  earmarkedAmount?: number | null;
  taxTreatment?: WindfallTaxTreatment | null;
  note?: string | null;
};

export type WindfallPhase =
  | "secure" | "required_goal" | "debt" | "retirement"
  | "important_goal" | "optimize" | "optional_goal";

export type WindfallAllocation = {
  id: string;
  phase: WindfallPhase;
  category: "reserve" | "debt" | "goal" | "retirement";
  relatedEntityId: string | null;
  title: string;
  requestedAmount: number;
  remainingNeedBefore: number;
  allocatedAmount: number;
  remainingNeedAfter: number;
  reasons: string[];
};

export type WindfallAllocationResult = {
  state: "valid" | "invalid" | "more_information_needed";
  policyVersion: string;
  priorityEnginePolicyVersion: string;
  source: WindfallSource | null;
  grossAmount: number | null;
  reservedTaxAmount: number;
  reservedOtherLiabilityAmount: number;
  restrictedAmount: number;
  earmarkedAmount: number;
  heldForTaxReviewAmount: number;
  deployableAmount: number;
  allocations: WindfallAllocation[];
  totalAllocated: number;
  remainingUnallocated: number;
  warnings: string[];
  missingData: string[];
};

const SOURCES = new Set<WindfallSource>([
  "bonus", "inheritance", "tax_refund", "gift", "asset_sale", "insurance_proceeds",
  "legal_settlement", "business_distribution", "other",
]);

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validNonnegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function invalidResult(input: WindfallInput, missingData: string[]): WindfallAllocationResult {
  return {
    state: "invalid", policyVersion: WINDFALL_POLICY_VERSION,
    priorityEnginePolicyVersion: "unknown", source: SOURCES.has(input.source) ? input.source : null,
    grossAmount: typeof input.amount === "number" && Number.isFinite(input.amount) ? roundMoney(input.amount) : null,
    reservedTaxAmount: 0, reservedOtherLiabilityAmount: 0, restrictedAmount: 0, earmarkedAmount: 0,
    heldForTaxReviewAmount: 0, deployableAmount: 0, allocations: [], totalAllocated: 0,
    remainingUnallocated: 0, warnings: [], missingData,
  };
}

export function allocateWindfall(
  engine: MoneyPriorityEngineResult,
  input: WindfallInput,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): WindfallAllocationResult {
  const errors: string[] = [];
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push("Windfall amount must be a finite positive number.");
  }
  if (!SOURCES.has(input.source)) errors.push("Windfall source must be a supported explicit classification.");
  const components = [
    ["Known tax liability", input.knownTaxLiability ?? 0],
    ["Known other liability", input.knownOtherLiability ?? 0],
    ["Restricted amount", input.restrictedAmount ?? 0],
    ["Earmarked amount", input.earmarkedAmount ?? 0],
  ] as const;
  for (const [label, value] of components) if (!validNonnegative(value)) errors.push(`${label} must be a finite nonnegative number.`);
  if (errors.length) return invalidResult(input, errors);

  const grossAmount = roundMoney(input.amount);
  const reservedTaxAmount = roundMoney(input.knownTaxLiability ?? 0);
  const reservedOtherLiabilityAmount = roundMoney(input.knownOtherLiability ?? 0);
  const restrictedAmount = roundMoney(input.restrictedAmount ?? 0);
  const earmarkedAmount = roundMoney(input.earmarkedAmount ?? 0);
  const knownReservations = roundMoney(reservedTaxAmount + reservedOtherLiabilityAmount + restrictedAmount + earmarkedAmount);
  if (knownReservations > grossAmount) {
    const result = invalidResult(input, ["Known liabilities, restrictions, and earmarks exceed the gross windfall."]);
    return { ...result, priorityEnginePolicyVersion: engine.policyVersion, grossAmount,
      reservedTaxAmount, reservedOtherLiabilityAmount, restrictedAmount, earmarkedAmount };
  }

  const warnings: string[] = [];
  const missingData: string[] = [];
  const afterKnownReservations = roundMoney(grossAmount - knownReservations);
  const uncertainTax = input.taxTreatment === "uncertain" || input.taxTreatment == null;
  const heldForTaxReviewAmount = uncertainTax ? afterKnownReservations : 0;
  if (uncertainTax && afterKnownReservations > 0) {
    missingData.push("Confirm the windfall's tax treatment or provide a known tax liability before deploying the remaining proceeds.");
    warnings.push("No tax percentage was estimated; the otherwise deployable amount is held for tax review.");
  }
  const deployableAmount = uncertainTax ? 0 : afterKnownReservations;
  let remaining = deployableAmount;
  const allocations: WindfallAllocation[] = [];
  const residualSnapshot = buildResidualNeedsSnapshot(engine.snapshot, engine.residualNeeds);
  const debtRemaining = new Map(residualSnapshot.debts.map((debt) => [debt.id, debt.balance]));
  const goalRemaining = new Map(residualSnapshot.goals.map((goal) => [goal.id, roundMoney(Math.max(0, goal.targetAmount - goal.currentAmount))]));

  const deploy = (phase: WindfallPhase, category: WindfallAllocation["category"], relatedEntityId: string | null,
    title: string, requested: number, reasons: string[]) => {
    const remainingNeedBefore = roundMoney(Math.max(0, requested));
    const allocatedAmount = roundMoney(Math.min(remaining, remainingNeedBefore));
    if (allocatedAmount <= 0) return 0;
    allocations.push({ id: `windfall-${phase}-${relatedEntityId ?? category}`, phase, category, relatedEntityId, title,
      requestedAmount: remainingNeedBefore, remainingNeedBefore, allocatedAmount,
      remainingNeedAfter: roundMoney(remainingNeedBefore - allocatedAmount), reasons });
    remaining = roundMoney(remaining - allocatedAmount);
    return allocatedAmount;
  };

  // Secure outputs already reflect prior existing-cash deployment. Reserve recommendations
  // share one protected pool, so each dollar can satisfy the deductible and broader reserve only once.
  let reserveAllocated = 0;
  for (const recommendation of [...engine.secure.recommendations].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))) {
    if (remaining <= 0 || recommendation.state !== "recommended"
      || (recommendation.urgency !== "required" && recommendation.urgency !== "high")
      || recommendation.id.includes("match")) continue;
    const isDebt = recommendation.id.includes("debt") || recommendation.id.includes("promo");
    if (isDebt && recommendation.relatedEntityId) {
      const need = Math.min(recommendation.gapAmount ?? 0, debtRemaining.get(recommendation.relatedEntityId) ?? 0);
      const amount = deploy("secure", "debt", recommendation.relatedEntityId, recommendation.title, need, recommendation.reasons);
      debtRemaining.set(recommendation.relatedEntityId, roundMoney((debtRemaining.get(recommendation.relatedEntityId) ?? 0) - amount));
    } else {
      const need = Math.max(0, (recommendation.gapAmount ?? 0) - reserveAllocated);
      reserveAllocated = roundMoney(reserveAllocated + deploy("secure", "reserve", null, recommendation.title, need, recommendation.reasons));
    }
  }

  const rankedGoals = [...engine.build.goals].sort((a, b) => compareGoalRankingFactors(a.rankingFactors, b.rankingFactors));
  const fundGoals = (tier: "required_protective" | "important" | "optional_lifestyle", phase: WindfallPhase) => {
    for (const assessment of rankedGoals.filter((goal) => goal.rankingFactors.economicTier === tier)) {
      if (remaining <= 0) break;
      const need = goalRemaining.get(assessment.goalId) ?? 0;
      const amount = deploy(phase, "goal", assessment.goalId, `Fund ${assessment.goalName}`, need,
        ["The remaining target need is funded in the existing lexicographic goal order."]);
      goalRemaining.set(assessment.goalId, roundMoney(need - amount));
    }
  };
  fundGoals("required_protective", "required_goal");

  // All high-confidence acceleration currently surfaces in Secure. This phase is retained
  // explicitly but does not duplicate those balances. Only a residual accelerate action can enter it.
  for (const debt of [...residualSnapshot.debts].sort((a, b) => a.id.localeCompare(b.id))) {
    if (remaining <= 0) break;
    const need = debtRemaining.get(debt.id) ?? 0;
    const studentStrategy = engine.secure.studentLoanStrategies.find((item) => item.debtId === debt.id);
    if (studentStrategy && !studentStrategy.ordinaryDebtPolicyAllowed) continue;
    if (need <= 0 || assessDebtAction(residualSnapshot, debt, engine.asOfDate, policy).action !== "accelerate") continue;
    const alreadySecure = engine.secure.recommendations.some((item) => item.relatedEntityId === debt.id && item.state === "recommended");
    if (alreadySecure) continue;
    const amount = deploy("debt", "debt", debt.id, `Accelerate payoff of ${debt.name}`, need,
      ["The authoritative debt action supports acceleration with one-time capital."]);
    debtRemaining.set(debt.id, roundMoney(need - amount));
  }

  const directTypes = new Set(["traditional_ira", "roth_ira", "hsa"]);
  const opportunityOrder = new Map([
    ["strong_tax_advantaged", 1], ["diversification_opportunity", 2], ["secondary_tax_advantaged", 3],
  ]);
  const directOpportunities = engine.build.retirementAccounts.opportunities
    .filter((item) => item.state === "available" && directTypes.has(item.accountType)
      && item.contributionSource !== "employer" && (item.remainingAnnualRoom ?? 0) > 0)
    .sort((a, b) => (opportunityOrder.get(a.opportunityTier ?? "") ?? 99) - (opportunityOrder.get(b.opportunityTier ?? "") ?? 99)
      || a.accountId.localeCompare(b.accountId));
  const roomByGroup = new Map<string, number>();
  for (const item of directOpportunities) {
    const key = item.sharedCapacityGroup ?? `account:${item.accountId}`;
    roomByGroup.set(key, Math.max(roomByGroup.get(key) ?? 0, item.remainingAnnualRoom ?? 0));
  }
  let priorCatchUp = engine.residualNeeds.retirementCatchUpApplied;
  for (const key of [...roomByGroup.keys()].sort()) {
    const room = roomByGroup.get(key) ?? 0;
    const consumed = Math.min(room, priorCatchUp);
    roomByGroup.set(key, roundMoney(room - consumed));
    priorCatchUp = roundMoney(priorCatchUp - consumed);
  }
  let retirementNeed = roundMoney(Math.max(0,
    engine.build.retirement.recommendedMonthlyIncrease * policy.existingCash.retirementCatchUpMonths
      - engine.residualNeeds.retirementCatchUpApplied,
  ));
  for (const opportunity of directOpportunities) {
    if (remaining <= 0 || retirementNeed <= 0) break;
    const key = opportunity.sharedCapacityGroup ?? `account:${opportunity.accountId}`;
    const room = roomByGroup.get(key) ?? 0;
    const requested = Math.min(retirementNeed, room);
    const amount = deploy("retirement", "retirement", opportunity.accountId,
      `Use the windfall for ${opportunity.accountName}`, requested,
      [...opportunity.reasons, `This is a modeled direct one-time contribution destination in the ${opportunity.opportunityTier} tier.`]);
    retirementNeed = roundMoney(retirementNeed - amount);
    roomByGroup.set(key, roundMoney(room - amount));
  }
  if (retirementNeed > 0 && engine.build.retirement.recommendedMonthlyIncrease > 0) {
    warnings.push(`$${retirementNeed.toFixed(2)} of modeled one-time retirement need has no known direct legal destination.`);
  }

  fundGoals("important", "important_goal");

  // Optimize remains conservative: only a clear pay-debt decision is acted on. Investing and
  // split decisions remain unallocated preferences rather than mandatory sinks.
  for (const recommendation of [...engine.optimize.recommendations].sort((a, b) => a.id.localeCompare(b.id))) {
    if (remaining <= 0 || recommendation.decision !== "pay_debt" || !recommendation.relatedDebtId) continue;
    const need = debtRemaining.get(recommendation.relatedDebtId) ?? 0;
    const amount = deploy("optimize", "debt", recommendation.relatedDebtId, recommendation.title, need, recommendation.reasons);
    debtRemaining.set(recommendation.relatedDebtId, roundMoney(need - amount));
  }

  fundGoals("optional_lifestyle", "optional_goal");
  if (remaining > 0) warnings.push(`$${remaining.toFixed(2)} remains unallocated after high-confidence one-time uses were exhausted.`);

  const totalAllocated = roundMoney(allocations.reduce((sum, item) => sum + item.allocatedAmount, 0));
  return {
    state: missingData.length ? "more_information_needed" : "valid",
    policyVersion: WINDFALL_POLICY_VERSION, priorityEnginePolicyVersion: engine.policyVersion,
    source: input.source, grossAmount, reservedTaxAmount, reservedOtherLiabilityAmount,
    restrictedAmount, earmarkedAmount, heldForTaxReviewAmount, deployableAmount,
    allocations, totalAllocated, remainingUnallocated: roundMoney(deployableAmount - totalAllocated),
    warnings, missingData,
  };
}
