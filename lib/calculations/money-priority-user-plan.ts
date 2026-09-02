import type { MoneyPriorityEngineResult, MoneyPriorityRecommendation } from "./money-priority-engine.ts";
import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { projectRetirement, type RetirementProjectionResult } from "./money-priority-retirement-projection.ts";
import {
  consumeRetirementCapacity,
  createRetirementCapacityLedger,
} from "./money-priority-retirement-capacity.ts";

export type MoneyPlanOverride = {
  allocationId: string;
  monthlyAmount: number;
};

export type OverrideStatus = "active" | "superseded" | "invalid";
export type UserPlanFundingStatus = "balanced" | "unallocated_capacity" | "funding_gap";
export type UserPlanImpactSeverity = "none" | "informational" | "tradeoff" | "high" | "infeasible";

export type PlanAllocation = {
  allocationId: string;
  recommendationId: string;
  stage: MoneyPriorityRecommendation["stage"];
  category: string;
  relatedEntityId: string | null;
  title: string;
  recommendationState: MoneyPriorityRecommendation["state"];
  urgency: MoneyPriorityRecommendation["urgency"];
  recommendedMonthlyAmount: number;
};

export type UserPlanAllocation = PlanAllocation & {
  userMonthlyAmount: number;
  monthlyDifference: number;
  isOverridden: boolean;
  overrideStatus: "active" | "none";
};

export type ReconciledOverride = MoneyPlanOverride & {
  status: OverrideStatus;
  reason: string;
};

export type GoalPlanImpact = {
  monthlyShortfall: number;
  recommendedCompletionMonths: number | null;
  userCompletionMonths: number | null;
  deadlineFeasible: boolean | null;
};

export type DebtPlanImpact = {
  reducedExtraPayment: number;
  recommendedPayoffMonths: number | null;
  userPayoffMonths: number | null;
  payoffDelayMonths: number | null;
  increasedInterest: number | null;
};

export type RetirementPlanImpact = {
  recommendedProjection: RetirementProjectionResult | null;
  userProjection: RetirementProjectionResult | null;
  contributionRoomConflict: number;
  contributionCapacityKnown: boolean;
  contributionCapacityMissingData: string[];
};

export type UserPlanAdditionalRetirementContribution = {
  accountId: string;
  annualAmount: number;
  source: "windfall" | "other";
};

export type UserPlanEvaluationOptions = {
  additionalRetirementContributions?: readonly UserPlanAdditionalRetirementContribution[];
};

export type UserPlanImpact = {
  id: string;
  allocationId: string | null;
  category: string;
  relatedEntityId: string | null;
  severity: UserPlanImpactSeverity;
  title: string;
  explanation: string;
  monthlyDifference: number;
  employerMatchShortfall: number;
  remainingUnfundedNeed: number | null;
  goal: GoalPlanImpact | null;
  debt: DebtPlanImpact | null;
  retirement: RetirementPlanImpact | null;
};

export type UserMoneyPlanResult = {
  recommendedPlan: {
    allocations: PlanAllocation[];
    monthlyCapacity: number;
    totalAllocated: number;
    remainingCapacity: number;
  };
  yourPlan: {
    allocations: UserPlanAllocation[];
    monthlyCapacity: number;
    totalAllocated: number;
    remainingCapacity: number;
    fundingGap: number;
    fundingStatus: UserPlanFundingStatus;
  };
  impacts: UserPlanImpact[];
  tradeoffs: string[];
  warnings: string[];
  overrides: {
    active: ReconciledOverride[];
    superseded: ReconciledOverride[];
    invalid: ReconciledOverride[];
  };
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Stable override identity contract: recommendation purpose + allocation category
 * + related entity. It intentionally excludes position, amount, date, and random data.
 */
export function buildPlanAllocationId(
  recommendationId: string,
  category: string,
  relatedEntityId: string | null,
): string {
  return `${recommendationId}::${category}::${relatedEntityId ?? "household"}`;
}

export function deriveRecommendedPlanAllocations(
  engine: MoneyPriorityEngineResult,
): PlanAllocation[] {
  return engine.recommendations.flatMap((recommendation) => {
    const recurring = recommendation.allocations.map((allocation) => ({
      allocationId: buildPlanAllocationId(
        recommendation.id,
        allocation.category,
        allocation.relatedEntityId,
      ),
      recommendationId: recommendation.id,
      stage: recommendation.stage,
      category: allocation.category,
      relatedEntityId: allocation.relatedEntityId,
      title: recommendation.title,
      recommendationState: recommendation.state,
      urgency: recommendation.urgency,
      recommendedMonthlyAmount: roundMoney(allocation.monthlyAmount),
    }));
    const studentStrategyEntityId = recommendation.state === "worth_considering"
      && (recommendation.id.startsWith("secure-student-loan-preserve-")
        || recommendation.id.startsWith("secure-student-loan-review-"))
      ? engine.secure.recommendations.find((item) => item.id === recommendation.id)?.relatedEntityId ?? null
      : null;
    if (!studentStrategyEntityId) return recurring;
    return [...recurring, {
      allocationId: buildPlanAllocationId(recommendation.id, "debt", studentStrategyEntityId),
      recommendationId: recommendation.id,
      stage: recommendation.stage,
      category: "debt",
      relatedEntityId: studentStrategyEntityId,
      title: recommendation.title,
      recommendationState: recommendation.state,
      urgency: recommendation.urgency,
      recommendedMonthlyAmount: 0,
    }];
  });
}

export function removeMoneyPlanOverride(
  overrides: readonly MoneyPlanOverride[],
  allocationId: string,
): MoneyPlanOverride[] {
  return overrides.filter((override) => override.allocationId !== allocationId)
    .map((override) => ({ ...override }));
}

function projectionWithAdditionalContribution(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
  additionalMonthlyContribution: number,
): RetirementProjectionResult | null {
  if (!snapshot.retirementAccounts.length) return null;
  const retirementAccounts = snapshot.retirementAccounts.map((account, index) =>
    index === 0
      ? {
          ...account,
          monthlyEmployeeContribution: roundMoney(
            account.monthlyEmployeeContribution + Math.max(0, additionalMonthlyContribution),
          ),
        }
      : { ...account });
  return projectRetirement({ ...snapshot, retirementAccounts }, asOfDate);
}

function payoffProjection(
  balance: number,
  aprPercent: number,
  monthlyPayment: number,
): { months: number; interest: number } | null {
  if (balance <= 0) return { months: 0, interest: 0 };
  if (monthlyPayment <= 0) return null;
  const monthlyRate = aprPercent / 100 / 12;
  if (monthlyRate > 0 && monthlyPayment <= balance * monthlyRate) return null;
  let remaining = balance;
  let interest = 0;
  let months = 0;
  while (remaining > 0.005 && months < 1200) {
    const charged = remaining * monthlyRate;
    interest += charged;
    remaining = Math.max(0, remaining + charged - monthlyPayment);
    months += 1;
  }
  return months >= 1200
    ? null
    : { months, interest: roundMoney(interest) };
}

function goalImpact(
  engine: MoneyPriorityEngineResult,
  allocation: UserPlanAllocation,
): GoalPlanImpact | null {
  if (!allocation.relatedEntityId) return null;
  const goal = engine.snapshot.goals.find((item) => item.id === allocation.relatedEntityId);
  const assessment = engine.build.goals.find((item) => item.goalId === allocation.relatedEntityId);
  if (!goal || !assessment) return null;
  const remaining = roundMoney(Math.max(
    0,
    goal.targetAmount
      - goal.currentAmount
      - (engine.residualNeeds.goalAppliedById[goal.id] ?? 0),
  ));
  const completion = (amount: number): number | null =>
    remaining <= 0 ? 0 : amount > 0 ? Math.ceil(remaining / amount) : null;
  const userCompletionMonths = completion(allocation.userMonthlyAmount);
  return {
    monthlyShortfall: roundMoney(Math.max(
      0,
      (assessment.protectedMonthlyNeed || assessment.requiredMonthlyPace || 0)
        - allocation.userMonthlyAmount,
    )),
    recommendedCompletionMonths: completion(allocation.recommendedMonthlyAmount),
    userCompletionMonths,
    deadlineFeasible: assessment.monthsRemaining === null
      ? null
      : userCompletionMonths !== null && userCompletionMonths <= assessment.monthsRemaining,
  };
}

function debtImpact(
  engine: MoneyPriorityEngineResult,
  allocation: UserPlanAllocation,
): DebtPlanImpact | null {
  if (!allocation.relatedEntityId) return null;
  const debt = engine.snapshot.debts.find((item) => item.id === allocation.relatedEntityId);
  if (!debt || debt.annualInterestRate === null) return null;
  const recommended = payoffProjection(
    debt.balance,
    debt.annualInterestRate,
    debt.minimumPayment + allocation.recommendedMonthlyAmount,
  );
  const user = payoffProjection(
    debt.balance,
    debt.annualInterestRate,
    debt.minimumPayment + allocation.userMonthlyAmount,
  );
  return {
    reducedExtraPayment: roundMoney(Math.max(
      0,
      allocation.recommendedMonthlyAmount - allocation.userMonthlyAmount,
    )),
    recommendedPayoffMonths: recommended?.months ?? null,
    userPayoffMonths: user?.months ?? null,
    payoffDelayMonths: recommended && user ? Math.max(0, user.months - recommended.months) : null,
    increasedInterest: recommended && user
      ? roundMoney(Math.max(0, user.interest - recommended.interest))
      : null,
  };
}

type RetirementRoomAnalysis = {
  conflictAmount: number;
  capacityKnown: boolean;
  missingData: string[];
};

function remainingContributionMonths(asOfDate: string, taxYear: number): number {
  const date = new Date(`${asOfDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== taxYear) return 12;
  return 12 - date.getUTCMonth();
}

function retirementRoomAnalysis(
  engine: MoneyPriorityEngineResult,
  allocations: readonly UserPlanAllocation[],
  options: UserPlanEvaluationOptions,
): RetirementRoomAnalysis {
  // Your Plan amounts replace the corresponding Recommended Plan amounts. Start
  // from original verified room, retain fixed one-time use, then route the user
  // Secure/Build amounts through the same account/shared-group ledger model.
  const ledger = createRetirementCapacityLedger(engine.build.retirementAccounts);
  for (const finalEntry of [...engine.retirementCapacityLedger.entries]
    .sort((a, b) => a.accountId.localeCompare(b.accountId))) {
    consumeRetirementCapacity(
      ledger,
      finalEntry.accountId,
      "one_time",
      finalEntry.consumed.one_time,
    );
  }

  const missingData: string[] = [];
  let conflictAmount = 0;
  const contributionMonths = remainingContributionMonths(engine.asOfDate, ledger.taxYear);
  const employeeAllocations = allocations
    .filter((item) => (item.category === "employer_match" || item.category === "retirement")
      && item.userMonthlyAmount > 0)
    .sort((a, b) => (a.category === "employer_match" ? 0 : 1) - (b.category === "employer_match" ? 0 : 1)
      || (a.relatedEntityId ?? "").localeCompare(b.relatedEntityId ?? "")
      || a.allocationId.localeCompare(b.allocationId));

  for (const allocation of employeeAllocations) {
    if (!allocation.relatedEntityId) {
      missingData.push(`${allocation.title} needs a concrete retirement account destination before legal capacity can be verified.`);
      continue;
    }
    const entry = ledger.entries.find((item) => item.accountId === allocation.relatedEntityId);
    if (!entry?.verified || entry.remainingAnnualRoom === null) {
      missingData.push(...(entry?.informationNeeded.length
        ? entry.informationNeeded
        : [`Legal contribution capacity is not verified for retirement account ${allocation.relatedEntityId}.`]));
      continue;
    }
    const requestedAnnualAmount = roundMoney(allocation.userMonthlyAmount
      * (allocation.category === "employer_match" ? contributionMonths : 12));
    const consumption = consumeRetirementCapacity(
      ledger,
      allocation.relatedEntityId,
      allocation.category === "employer_match" ? "secure" : "build",
      requestedAnnualAmount,
    );
    conflictAmount = roundMoney(conflictAmount
      + Math.max(0, requestedAnnualAmount - consumption.consumedAnnualAmount));
  }

  for (const contribution of [...(options.additionalRetirementContributions ?? [])]
    .sort((a, b) => a.accountId.localeCompare(b.accountId) || a.source.localeCompare(b.source))) {
    if (!Number.isFinite(contribution.annualAmount) || contribution.annualAmount < 0) {
      missingData.push(`Additional ${contribution.source} retirement contribution for ${contribution.accountId} is invalid.`);
      continue;
    }
    const entry = ledger.entries.find((item) => item.accountId === contribution.accountId);
    if (!entry?.verified || entry.remainingAnnualRoom === null) {
      missingData.push(...(entry?.informationNeeded.length
        ? entry.informationNeeded
        : [`Legal contribution capacity is not verified for retirement account ${contribution.accountId}.`]));
      continue;
    }
    const consumption = consumeRetirementCapacity(
      ledger,
      contribution.accountId,
      "windfall",
      contribution.annualAmount,
    );
    conflictAmount = roundMoney(conflictAmount
      + Math.max(0, contribution.annualAmount - consumption.consumedAnnualAmount));
  }

  return {
    conflictAmount,
    capacityKnown: missingData.length === 0,
    missingData: [...new Set(missingData)].sort(),
  };
}

function impactSeverityRank(severity: UserPlanImpactSeverity): number {
  return { none: 0, informational: 1, tradeoff: 2, high: 3, infeasible: 4 }[severity];
}

export function evaluateUserPlan(
  engine: MoneyPriorityEngineResult,
  overrides: readonly MoneyPlanOverride[],
  options: UserPlanEvaluationOptions = {},
): UserMoneyPlanResult {
  const recommendedAllocations = deriveRecommendedPlanAllocations(engine);
  const allocationById = new Map(recommendedAllocations.map((item) => [item.allocationId, item]));
  const duplicates = new Set<string>();
  const overrideCounts = new Map<string, number>();
  for (const override of overrides) {
    overrideCounts.set(override.allocationId, (overrideCounts.get(override.allocationId) ?? 0) + 1);
  }
  for (const [id, count] of overrideCounts) if (count > 1) duplicates.add(id);

  const active: ReconciledOverride[] = [];
  const superseded: ReconciledOverride[] = [];
  const invalid: ReconciledOverride[] = [];
  const activeById = new Map<string, number>();

  for (const override of overrides) {
    if (duplicates.has(override.allocationId)) {
      invalid.push({ ...override, status: "invalid", reason: "Duplicate overrides are ambiguous and none of them were applied." });
      continue;
    }
    if (!Number.isFinite(override.monthlyAmount) || override.monthlyAmount < 0) {
      invalid.push({ ...override, status: "invalid", reason: "Override amount must be finite and nonnegative." });
      continue;
    }
    const allocation = allocationById.get(override.allocationId);
    if (!allocation) {
      const unresolvedRecommendation = engine.recommendations.find((recommendation) =>
        recommendation.state === "more_information_needed"
          && override.allocationId.startsWith(`${recommendation.id}::`));
      if (unresolvedRecommendation) {
        invalid.push({
          ...override,
          status: "invalid",
          reason: "The recommendation needs more information and cannot be converted into an actionable allocation override.",
        });
      } else {
        superseded.push({
          ...override,
          status: "superseded",
          reason: "The current authoritative engine result no longer contains this actionable allocation.",
        });
      }
      continue;
    }
    active.push({ ...override, status: "active", reason: "Override applies to the current authoritative allocation." });
    activeById.set(override.allocationId, roundMoney(override.monthlyAmount));
  }

  const yourAllocations: UserPlanAllocation[] = recommendedAllocations.map((allocation) => {
    const userAmount = activeById.get(allocation.allocationId);
    const isOverridden = userAmount !== undefined;
    const userMonthlyAmount = isOverridden ? userAmount : allocation.recommendedMonthlyAmount;
    return {
      ...allocation,
      userMonthlyAmount,
      monthlyDifference: roundMoney(userMonthlyAmount - allocation.recommendedMonthlyAmount),
      isOverridden,
      overrideStatus: isOverridden ? "active" : "none",
    };
  });

  const monthlyCapacity = roundMoney(Math.max(0, engine.feasibility.monthlyPlanCapacity));
  const recommendedTotal = roundMoney(recommendedAllocations
    .reduce((sum, item) => sum + item.recommendedMonthlyAmount, 0));
  const yourTotal = roundMoney(yourAllocations
    .reduce((sum, item) => sum + item.userMonthlyAmount, 0));
  const recommendedRemaining = roundMoney(Math.max(0, monthlyCapacity - recommendedTotal));
  const rawYourRemaining = roundMoney(monthlyCapacity - yourTotal);
  const fundingGap = roundMoney(Math.max(0, -rawYourRemaining));
  const yourRemaining = roundMoney(Math.max(0, rawYourRemaining));
  const fundingStatus: UserPlanFundingStatus = fundingGap > 0
    ? "funding_gap"
    : yourRemaining > 0
      ? "unallocated_capacity"
      : "balanced";

  const impacts: UserPlanImpact[] = [];
  const tradeoffs: string[] = [];
  const warnings: string[] = [];

  if (fundingGap > 0) {
    impacts.push({
      id: "user-plan-funding-gap",
      allocationId: null,
      category: "plan",
      relatedEntityId: null,
      severity: "infeasible",
      title: "Your Plan exceeds recurring monthly capacity",
      explanation: `Your Plan allocates $${fundingGap.toFixed(2)} more per month than available capacity. No allocation was silently reduced.`,
      monthlyDifference: roundMoney(yourTotal - recommendedTotal),
      employerMatchShortfall: 0,
      remainingUnfundedNeed: fundingGap,
      goal: null,
      debt: null,
      retirement: null,
    });
  }

  const recommendedRetirementMonthly = recommendedAllocations
    .filter((item) => item.category === "retirement")
    .reduce((sum, item) => sum + item.recommendedMonthlyAmount, 0);
  const userRetirementMonthly = yourAllocations
    .filter((item) => item.category === "retirement")
    .reduce((sum, item) => sum + item.userMonthlyAmount, 0);
  const recommendedProjection = projectionWithAdditionalContribution(
    engine.snapshot,
    engine.asOfDate,
    recommendedRetirementMonthly,
  );
  const userProjection = projectionWithAdditionalContribution(
    engine.snapshot,
    engine.asOfDate,
    userRetirementMonthly,
  );
  const roomAnalysis = retirementRoomAnalysis(engine, yourAllocations, options);
  const roomConflict = roomAnalysis.conflictAmount;

  for (const allocation of yourAllocations.filter((item) => item.isOverridden)) {
    const difference = allocation.monthlyDifference;
    if (difference === 0) continue;
    let severity: UserPlanImpactSeverity = "informational";
    let explanation = difference > 0
      ? `Your Plan adds $${difference.toFixed(2)} per month to ${allocation.title}.`
      : `Your Plan reduces ${allocation.title} by $${Math.abs(difference).toFixed(2)} per month.`;
    let employerMatchShortfall = 0;
    let remainingUnfundedNeed: number | null = null;
    let goal: GoalPlanImpact | null = null;
    let debt: DebtPlanImpact | null = null;
    let retirement: RetirementPlanImpact | null = null;

    if (allocation.category === "employer_match" && difference < 0) {
      employerMatchShortfall = roundMoney(Math.abs(difference));
      remainingUnfundedNeed = employerMatchShortfall;
      severity = "high";
      explanation += ` This leaves $${employerMatchShortfall.toFixed(2)} per month of the known employer-match contribution requirement unfunded.`;
    } else if (allocation.stage === "secure" && difference < 0) {
      severity = allocation.urgency === "required" || allocation.urgency === "high" ? "high" : "tradeoff";
      remainingUnfundedNeed = roundMoney(Math.abs(difference));
      explanation += " This slows or leaves unfunded an authoritative Secure-stage need.";
    }

    if (allocation.category === "goal") {
      goal = goalImpact(engine, allocation);
      const sourceGoal = allocation.relatedEntityId
        ? engine.snapshot.goals.find((item) => item.id === allocation.relatedEntityId)
        : null;
      const protectedGoal = sourceGoal?.necessity === "required"
        || sourceGoal?.goalClass === "necessary_protective";
      if (difference < 0 && goal?.deadlineFeasible === false && protectedGoal) severity = "high";
      else if (difference !== 0) severity = protectedGoal ? "tradeoff" : "informational";
      if (goal) {
        explanation += goal.userCompletionMonths === null
          ? " At this amount, the remaining goal has no projected completion month."
          : ` The remaining goal is projected to take ${goal.userCompletionMonths} months at the user pace.`;
      }
    } else if (allocation.category === "debt") {
      debt = debtImpact(engine, allocation);
      if (difference < 0) {
        severity = allocation.stage === "secure" ? "high" : "tradeoff";
        if (debt && debt.payoffDelayMonths !== null) {
          explanation += ` Modeled payoff is delayed by ${debt.payoffDelayMonths} months and adds ${(debt.increasedInterest ?? 0).toFixed(2)} of interest.`;
        }
      } else {
        const studentStrategy = allocation.relatedEntityId
          ? engine.secure.studentLoanStrategies.find((item) => item.debtId === allocation.relatedEntityId)
          : null;
        if (studentStrategy && !studentStrategy.ordinaryDebtPolicyAllowed) {
          severity = "tradeoff";
          explanation += " This extra payment conflicts with the modeled forgiveness, special-repayment, or employer-benefit strategy and may reduce its value.";
        }
      }
    } else if (allocation.category === "retirement") {
      retirement = {
        recommendedProjection,
        userProjection,
        contributionRoomConflict: roomConflict,
        contributionCapacityKnown: roomAnalysis.capacityKnown,
        contributionCapacityMissingData: roomAnalysis.missingData,
      };
      if (difference < 0) {
        const worsensToShortfall = recommendedProjection?.state === "on_track"
          && userProjection?.state === "shortfall";
        const worsensExistingShortfall = recommendedProjection?.state === "shortfall"
          && userProjection?.state === "shortfall"
          && (userProjection.projectedShortfall ?? 0) > (recommendedProjection.projectedShortfall ?? 0);
        severity = worsensToShortfall || worsensExistingShortfall ? "high" : "tradeoff";
        explanation += worsensToShortfall
          ? " The modeled retirement projection changes from on track to shortfall."
          : worsensExistingShortfall
            ? " The modeled retirement shortfall increases."
            : " The reduction does not create a modeled projection-state change with current inputs.";
      } else {
        severity = "informational";
        explanation += " The modeled retirement contribution pace increases.";
      }
    }

    impacts.push({
      id: `user-plan-impact::${allocation.allocationId}`,
      allocationId: allocation.allocationId,
      category: allocation.category,
      relatedEntityId: allocation.relatedEntityId,
      severity,
      title: allocation.title,
      explanation,
      monthlyDifference: difference,
      employerMatchShortfall,
      remainingUnfundedNeed,
      goal,
      debt,
      retirement,
    });
    tradeoffs.push(explanation);
  }

  if (roomConflict > 0) {
    const explanation = `Modeled retirement overrides exceed known annual contribution room by $${roomConflict.toFixed(2)}; the user amount is shown but is not described as legally available room.`;
    impacts.push({
      id: "user-plan-retirement-room-conflict",
      allocationId: null,
      category: "retirement",
      relatedEntityId: null,
      severity: "high",
      title: "Retirement contribution room conflict",
      explanation,
      monthlyDifference: roundMoney(userRetirementMonthly - recommendedRetirementMonthly),
      employerMatchShortfall: 0,
      remainingUnfundedNeed: roomConflict,
      goal: null,
      debt: null,
      retirement: {
        recommendedProjection,
        userProjection,
        contributionRoomConflict: roomConflict,
        contributionCapacityKnown: roomAnalysis.capacityKnown,
        contributionCapacityMissingData: roomAnalysis.missingData,
      },
    });
    warnings.push(explanation);
  }

  if (!roomAnalysis.capacityKnown) {
    const explanation = `Your Plan includes retirement dollars whose legal account capacity cannot be verified: ${roomAnalysis.missingData.join(" ")}`;
    impacts.push({
      id: "user-plan-retirement-room-unknown",
      allocationId: null,
      category: "retirement",
      relatedEntityId: null,
      severity: "high",
      title: "Retirement contribution capacity needs more information",
      explanation,
      monthlyDifference: roundMoney(userRetirementMonthly - recommendedRetirementMonthly),
      employerMatchShortfall: 0,
      remainingUnfundedNeed: null,
      goal: null,
      debt: null,
      retirement: {
        recommendedProjection,
        userProjection,
        contributionRoomConflict: roomConflict,
        contributionCapacityKnown: false,
        contributionCapacityMissingData: roomAnalysis.missingData,
      },
    });
    warnings.push(explanation);
  }

  impacts.sort((a, b) =>
    impactSeverityRank(b.severity) - impactSeverityRank(a.severity)
      || a.id.localeCompare(b.id));

  return {
    recommendedPlan: {
      allocations: recommendedAllocations,
      monthlyCapacity,
      totalAllocated: recommendedTotal,
      remainingCapacity: recommendedRemaining,
    },
    yourPlan: {
      allocations: yourAllocations,
      monthlyCapacity,
      totalAllocated: yourTotal,
      remainingCapacity: yourRemaining,
      fundingGap,
      fundingStatus,
    },
    impacts,
    tradeoffs,
    warnings,
    overrides: { active, superseded, invalid },
  };
}
