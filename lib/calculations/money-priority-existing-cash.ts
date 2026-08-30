import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import type { SecureStageResult } from "./money-priority-secure.ts";
import type { BuildStageResult } from "./money-priority-build.ts";
import type { OptimizeStageResult } from "./money-priority-optimize.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";

export type ExistingCashDeployment = {
  id: string;
  rank: number;
  stage: "secure" | "build" | "optimize";
  category: "reserve" | "debt" | "retirement" | "goal" | "investing";
  relatedEntityId: string | null;
  title: string;
  amount: number;
  reasons: string[];
};

export type ExistingCashDeploymentResult = {
  availableUnallocatedCash: number;
  liquidityFloor: number;
  deployableAfterSecure: number;
  deployedCash: number;
  remainingUnallocatedCash: number;
  secureFullyCovered: boolean;
  deployments: ExistingCashDeployment[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function deploy(
  deployments: ExistingCashDeployment[],
  remaining: number,
  requested: number,
  input: Omit<ExistingCashDeployment, "rank" | "amount">,
): { remaining: number; amount: number } {
  const amount = roundMoney(Math.min(Math.max(0, requested), Math.max(0, remaining)));
  if (amount <= 0) return { remaining, amount: 0 };
  deployments.push({ ...input, rank: deployments.length + 1, amount });
  return { remaining: roundMoney(remaining - amount), amount };
}

function liquidityFloor(snapshot: MoneyPrioritySnapshot, policy: MoneyPriorityPolicy): number {
  return roundMoney(Math.max(
    policy.existingCash.minimumUnallocatedLiquidityFloor,
    snapshot.aggregates.monthlyRequiredOutflow * policy.existingCash.minimumUnallocatedLiquidityMonths,
  ));
}

function goalRemainingAmount(snapshot: MoneyPrioritySnapshot, goalId: string): number {
  const goal = snapshot.goals.find((item) => item.id === goalId);
  return goal ? roundMoney(Math.max(0, goal.targetAmount - goal.currentAmount)) : 0;
}

function debtRemainingAmount(snapshot: MoneyPrioritySnapshot, debtId: string | null): number {
  if (!debtId) return 0;
  return roundMoney(Math.max(0, snapshot.debts.find((item) => item.id === debtId)?.balance ?? 0));
}

export function evaluateExistingCashDeployment(
  snapshot: MoneyPrioritySnapshot,
  secure: SecureStageResult,
  build?: BuildStageResult,
  optimize?: OptimizeStageResult,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): ExistingCashDeploymentResult {
  const availableUnallocatedCash = roundMoney(Math.max(0, snapshot.aggregates.unallocatedCash));
  let remaining = availableUnallocatedCash;
  const deployments: ExistingCashDeployment[] = [];
  let secureFullyCovered = true;
  let reserveAlreadyDeployed = 0;

  if (remaining <= 0) {
    return {
      availableUnallocatedCash,
      liquidityFloor: liquidityFloor(snapshot, policy),
      deployableAfterSecure: 0,
      deployedCash: 0,
      remainingUnallocatedCash: 0,
      secureFullyCovered: !secure.recommendations.some((item) => item.state === "recommended" && (item.urgency === "required" || item.urgency === "high") && !item.id.includes("match")),
      deployments,
    };
  }

  // Secure may use all truly unallocated cash. Liquidity protection activates only
  // after required/high-priority Secure balance needs are covered.
  for (const recommendation of secure.recommendations) {
    if (recommendation.state !== "recommended") continue;
    if (recommendation.urgency !== "required" && recommendation.urgency !== "high") continue;
    if (recommendation.id.includes("match")) continue; // recurring payroll decision

    const category: "reserve" | "debt" = recommendation.id.includes("debt") || recommendation.id.includes("promo")
      ? "debt"
      : "reserve";
    const rawRequested = Math.max(0, recommendation.gapAmount ?? 0);
    const requested = category === "reserve" ? Math.max(0, rawRequested - reserveAlreadyDeployed) : rawRequested;
    if (requested <= 0) continue;

    const result = deploy(deployments, remaining, requested, {
      id: `existing-cash-${recommendation.id}`,
      stage: "secure",
      category,
      relatedEntityId: recommendation.relatedEntityId,
      title: category === "debt"
        ? `Use existing unallocated cash toward ${recommendation.title.toLowerCase()}`
        : `Move existing unallocated cash into ${recommendation.title.toLowerCase()}`,
      reasons: [
        ...recommendation.reasons,
        "Only cash explicitly marked unallocated is being redeployed; protected, earmarked, operating, and debt-backed cash remains reserved for its recorded purpose.",
      ],
    });
    remaining = result.remaining;
    if (category === "reserve") reserveAlreadyDeployed = roundMoney(reserveAlreadyDeployed + result.amount);
    if (result.amount < requested) secureFullyCovered = false;
  }

  if (!secureFullyCovered) {
    return {
      availableUnallocatedCash,
      liquidityFloor: liquidityFloor(snapshot, policy),
      deployableAfterSecure: 0,
      deployedCash: roundMoney(availableUnallocatedCash - remaining),
      remainingUnallocatedCash: remaining,
      secureFullyCovered: false,
      deployments,
    };
  }

  const floor = liquidityFloor(snapshot, policy);
  let deployable = roundMoney(Math.max(0, remaining - floor));
  const deployableAfterSecure = deployable;

  if (build && deployable > 0) {
    const goalAssessment = new Map(build.goals.map((goal) => [goal.goalId, goal]));
    const availableRetirementRoom = roundMoney(build.retirementAccounts.opportunities
      .filter((item) => item.state === "available" && item.remainingAnnualRoom !== null)
      .reduce((sum, item) => sum + Math.max(0, item.remainingAnnualRoom ?? 0), 0));

    for (const allocation of build.allocations) {
      if (deployable <= 0) break;
      if (allocation.unfundedMonthlyAmount <= 0) continue;

      if (allocation.category === "goal" && allocation.relatedEntityId) {
        // Only close meaningful Build shortfalls. Optional/lifestyle goals stay residual.
        if (allocation.priority < 50) continue;
        const assessment = goalAssessment.get(allocation.relatedEntityId);
        const remainingGoal = goalRemainingAmount(snapshot, allocation.relatedEntityId);
        const shortfallThroughDeadline = assessment?.monthsRemaining === null
          ? 0
          : assessment?.monthsRemaining === 0
            ? remainingGoal
            : roundMoney(allocation.unfundedMonthlyAmount * assessment.monthsRemaining);
        const requested = Math.min(remainingGoal, shortfallThroughDeadline);
        if (requested <= 0) continue;

        const result = deploy(deployments, deployable, requested, {
          id: `existing-cash-build-goal-${allocation.relatedEntityId}`,
          stage: "build",
          category: "goal",
          relatedEntityId: allocation.relatedEntityId,
          title: `Use existing cash to close the funding gap for ${allocation.title.replace(/^Fund /, "")}`,
          reasons: [
            ...allocation.reasons,
            "This one-time allocation closes part of a Build-stage funding shortfall without creating a new recurring commitment.",
          ],
        });
        deployable = result.remaining;
        remaining = roundMoney(remaining - result.amount);
      } else if (allocation.category === "retirement" && availableRetirementRoom > 0) {
        const requested = Math.min(
          availableRetirementRoom,
          roundMoney(allocation.unfundedMonthlyAmount * policy.existingCash.retirementCatchUpMonths),
        );
        if (requested <= 0) continue;
        const result = deploy(deployments, deployable, requested, {
          id: "existing-cash-build-retirement",
          stage: "build",
          category: "retirement",
          relatedEntityId: null,
          title: "Use existing cash for a one-time retirement catch-up contribution",
          reasons: [
            ...allocation.reasons,
            `The one-time catch-up is capped at ${policy.existingCash.retirementCatchUpMonths} months of the unfunded retirement pace and known tax-advantaged contribution room.`,
            "Account selection remains separate so tax treatment and eligibility can be respected.",
          ],
        });
        deployable = result.remaining;
        remaining = roundMoney(remaining - result.amount);
      }
    }
  }

  if (optimize?.isUnlocked && deployable > 0) {
    const recommendation = optimize.recommendations.find((item) => item.decision !== "more_information_needed");
    if (recommendation) {
      const debtRoom = debtRemainingAmount(snapshot, recommendation.relatedDebtId);
      let debtAmount = 0;
      let investingAmount = 0;

      if (recommendation.decision === "pay_debt") {
        debtAmount = Math.min(deployable, debtRoom);
      } else if (recommendation.decision === "invest") {
        investingAmount = deployable;
      } else if (recommendation.decision === "split") {
        debtAmount = Math.min(roundMoney(deployable / 2), debtRoom);
        investingAmount = roundMoney(deployable - debtAmount);
      }

      if (debtAmount > 0) {
        const result = deploy(deployments, deployable, debtAmount, {
          id: `existing-cash-optimize-debt-${recommendation.relatedDebtId ?? "household"}`,
          stage: "optimize",
          category: "debt",
          relatedEntityId: recommendation.relatedDebtId,
          title: `Use optional existing cash toward ${recommendation.title.toLowerCase()}`,
          reasons: [
            ...recommendation.reasons,
            `The $${floor.toFixed(2)} unallocated liquidity floor remains untouched before Optimize deployment.`,
          ],
        });
        deployable = result.remaining;
        remaining = roundMoney(remaining - result.amount);
      }

      if (investingAmount > 0 && deployable > 0) {
        const requested = Math.min(investingAmount, deployable);
        const result = deploy(deployments, deployable, requested, {
          id: "existing-cash-optimize-investing",
          stage: "optimize",
          category: "investing",
          relatedEntityId: null,
          title: "Use optional existing cash for long-term investing",
          reasons: [
            ...recommendation.reasons,
            `The $${floor.toFixed(2)} unallocated liquidity floor remains untouched before Optimize deployment.`,
          ],
        });
        deployable = result.remaining;
        remaining = roundMoney(remaining - result.amount);
      }
    }
  }

  return {
    availableUnallocatedCash,
    liquidityFloor: floor,
    deployableAfterSecure,
    deployedCash: roundMoney(availableUnallocatedCash - remaining),
    remainingUnallocatedCash: remaining,
    secureFullyCovered,
    deployments,
  };
}
