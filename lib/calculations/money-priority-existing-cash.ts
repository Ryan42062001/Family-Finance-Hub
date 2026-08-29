import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import type { SecureStageResult } from "./money-priority-secure.ts";

export type ExistingCashDeployment = {
  id: string;
  rank: number;
  category: "reserve" | "debt";
  relatedEntityId: string | null;
  title: string;
  amount: number;
  reasons: string[];
};

export type ExistingCashDeploymentResult = {
  availableUnallocatedCash: number;
  deployedCash: number;
  remainingUnallocatedCash: number;
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
): number {
  const amount = roundMoney(Math.min(Math.max(0, requested), Math.max(0, remaining)));
  if (amount <= 0) return remaining;
  deployments.push({ ...input, rank: deployments.length + 1, amount });
  return roundMoney(remaining - amount);
}

export function evaluateExistingCashDeployment(
  snapshot: MoneyPrioritySnapshot,
  secure: SecureStageResult,
): ExistingCashDeploymentResult {
  const availableUnallocatedCash = roundMoney(Math.max(0, snapshot.aggregates.unallocatedCash));
  let remaining = availableUnallocatedCash;
  const deployments: ExistingCashDeployment[] = [];

  if (remaining <= 0) {
    return { availableUnallocatedCash, deployedCash: 0, remainingUnallocatedCash: 0, deployments };
  }

  // Existing cash follows the same Secure ordering as future monthly cash flow. Only
  // cash explicitly marked unallocated is deployable; protected, earmarked, operating,
  // and debt-backed balances remain untouched.
  for (const recommendation of secure.recommendations) {
    if (remaining <= 0) break;
    if (recommendation.state !== "recommended") continue;
    if (recommendation.urgency !== "required" && recommendation.urgency !== "high") continue;
    if (recommendation.id.includes("match")) continue; // employer match is a recurring payroll decision, not a one-time cash destination.

    const requested = Math.max(0, recommendation.gapAmount ?? 0);
    if (requested <= 0) continue;

    const category: "reserve" | "debt" = recommendation.id.includes("debt") || recommendation.id.includes("promo")
      ? "debt"
      : "reserve";

    // The deductible reserve is a subset of the full emergency reserve. Cash deployed
    // to the deductible therefore reduces the later emergency-fund gap in this same pass.
    const reserveAlreadyDeployed = category === "reserve"
      ? deployments.filter((item) => item.category === "reserve").reduce((sum, item) => sum + item.amount, 0)
      : 0;
    const effectiveRequested = category === "reserve" ? Math.max(0, requested - reserveAlreadyDeployed) : requested;

    remaining = deploy(deployments, remaining, effectiveRequested, {
      id: `existing-cash-${recommendation.id}`,
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
  }

  const deployedCash = roundMoney(availableUnallocatedCash - remaining);
  return {
    availableUnallocatedCash,
    deployedCash,
    remainingUnallocatedCash: remaining,
    deployments,
  };
}
