import type { ExistingCashDeploymentResult } from "./money-priority-existing-cash.ts";
import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";

export type ResidualNeedsContext = {
  secureReserveApplied: number;
  debtAppliedById: Readonly<Record<string, number>>;
  goalAppliedById: Readonly<Record<string, number>>;
  retirementCatchUpApplied: number;
  totalOneTimeDeployed: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addAmount(target: Record<string, number>, id: string | null, amount: number): void {
  if (!id || amount <= 0) return;
  target[id] = roundMoney((target[id] ?? 0) + amount);
}

export function deriveResidualNeedsContext(
  existingCash: ExistingCashDeploymentResult,
): ResidualNeedsContext {
  const debtAppliedById: Record<string, number> = {};
  const goalAppliedById: Record<string, number> = {};
  let secureReserveApplied = 0;
  let retirementCatchUpApplied = 0;

  for (const deployment of existingCash.deployments) {
    if (deployment.category === "reserve" && deployment.stage === "secure") {
      secureReserveApplied = roundMoney(secureReserveApplied + deployment.amount);
    } else if (deployment.category === "debt") {
      addAmount(debtAppliedById, deployment.relatedEntityId, deployment.amount);
    } else if (deployment.category === "goal") {
      addAmount(goalAppliedById, deployment.relatedEntityId, deployment.amount);
    } else if (deployment.category === "retirement") {
      retirementCatchUpApplied = roundMoney(retirementCatchUpApplied + deployment.amount);
    }
  }

  return {
    secureReserveApplied,
    debtAppliedById: Object.freeze({ ...debtAppliedById }),
    goalAppliedById: Object.freeze({ ...goalAppliedById }),
    retirementCatchUpApplied,
    totalOneTimeDeployed: roundMoney(existingCash.deployedCash),
  };
}

export function buildResidualNeedsSnapshot(
  snapshot: MoneyPrioritySnapshot,
  residual: ResidualNeedsContext,
): MoneyPrioritySnapshot {
  const debts = snapshot.debts
    .map((debt) => ({
      ...debt,
      balance: roundMoney(Math.max(0, debt.balance - (residual.debtAppliedById[debt.id] ?? 0))),
    }))
    .filter((debt) => debt.balance > 0);

  const goals = snapshot.goals.map((goal) => ({
    ...goal,
    currentAmount: roundMoney(Math.min(
      goal.targetAmount,
      goal.currentAmount + (residual.goalAppliedById[goal.id] ?? 0),
    )),
  }));

  return {
    ...snapshot,
    debts,
    goals,
    aggregates: {
      ...snapshot.aggregates,
      protectedCash: roundMoney(snapshot.aggregates.protectedCash + residual.secureReserveApplied),
      unallocatedCash: roundMoney(Math.max(
        0,
        snapshot.aggregates.unallocatedCash - residual.totalOneTimeDeployed,
      )),
    },
  };
}
