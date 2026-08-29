import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { classifyDebt } from "./money-priority-core.ts";
import type { BuildStageResult } from "./money-priority-build.ts";

export type OptimizeDecision = "pay_debt" | "invest" | "split" | "more_information_needed";

export type OptimizeStageRecommendation = {
  id: string;
  state: "recommended" | "worth_considering" | "more_information_needed";
  urgency: "medium" | "optional";
  title: string;
  decision: OptimizeDecision;
  relatedDebtId: string | null;
  debtMonthlyAmount: number;
  investingMonthlyAmount: number;
  reasons: string[];
  tradeoffs: string[];
  missingData: string[];
};

export type OptimizeStageResult = {
  isUnlocked: boolean;
  availableMonthlyCapacity: number;
  totalDebtAllocation: number;
  totalInvestingAllocation: number;
  remainingMonthlyCapacity: number;
  recommendations: OptimizeStageRecommendation[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function chooseOptimizeDecision(
  snapshot: MoneyPrioritySnapshot,
  debt: MoneyPrioritySnapshot["debts"][number],
): { decision: OptimizeDecision; reasons: string[]; tradeoffs: string[]; missingData: string[] } {
  if (debt.annualInterestRate === null) {
    return {
      decision: "more_information_needed",
      reasons: [],
      tradeoffs: [],
      missingData: ["APR is required before comparing guaranteed debt payoff with long-term investing."],
    };
  }

  const apr = debt.annualInterestRate / 100;
  const preference = snapshot.preferences?.debtVsInvesting ?? "balanced";
  const reasons: string[] = [];
  const tradeoffs: string[] = [
    "Debt payoff provides a guaranteed return equal to the avoided interest rate.",
    "Investing preserves more liquidity and upside, but future market returns are uncertain.",
  ];

  let decision: OptimizeDecision;

  if (debt.type === "mortgage") {
    if (apr >= 0.06) {
      decision = "pay_debt";
      reasons.push("The mortgage APR is 6% or higher, so the guaranteed return from extra principal is substantial enough to favor payoff before optional investing.");
    } else if (apr < 0.04) {
      decision = "invest";
      reasons.push("The mortgage APR is below 4%, which favors preserving liquidity and long-term investment capacity when higher-priority needs are already satisfied.");
    } else {
      decision = "split";
      reasons.push("A 4–5.99% mortgage sits in a genuine tradeoff range, so a split between extra principal and investing is the balanced default.");
    }
  } else {
    if (apr >= 0.04) {
      decision = "split";
      reasons.push("This low-priority debt is still near the policy gray-zone boundary, so a split approach balances guaranteed payoff with investing flexibility.");
    } else {
      decision = "invest";
      reasons.push("This debt is below 4% APR, so the balanced default is to keep scheduled payments and direct optional dollars toward long-term investing.");
    }
  }

  if (preference === "debt_focused") {
    if (decision === "invest") decision = "split";
    else if (decision === "split") decision = "pay_debt";
    reasons.push("Household preference leans toward debt reduction, moving the recommendation one posture toward payoff.");
  } else if (preference === "growth_focused") {
    if (decision === "pay_debt") decision = "split";
    else if (decision === "split") decision = "invest";
    reasons.push("Household preference leans toward long-term growth, moving the recommendation one posture toward investing.");
  }

  return { decision, reasons, tradeoffs, missingData: [] };
}

export function evaluateOptimizeStage(
  snapshot: MoneyPrioritySnapshot,
  build: BuildStageResult,
  isUnlocked: boolean,
): OptimizeStageResult {
  let remainingMonthlyCapacity = roundMoney(Math.max(0, build.remainingMonthlyCapacity));
  const recommendations: OptimizeStageRecommendation[] = [];

  const eligibleDebts = snapshot.debts
    .filter((debt) => classifyDebt(debt).band === "optimize")
    .sort((a, b) => (b.annualInterestRate ?? -1) - (a.annualInterestRate ?? -1) || a.name.localeCompare(b.name));

  for (const debt of eligibleDebts) {
    const assessment = chooseOptimizeDecision(snapshot, debt);

    if (assessment.decision === "more_information_needed") {
      recommendations.push({
        id: `optimize-debt-missing-${debt.id}`,
        state: "more_information_needed",
        urgency: "medium",
        title: `Add APR information for ${debt.name} before optimizing`,
        decision: assessment.decision,
        relatedDebtId: debt.id,
        debtMonthlyAmount: 0,
        investingMonthlyAmount: 0,
        reasons: assessment.reasons,
        tradeoffs: assessment.tradeoffs,
        missingData: assessment.missingData,
      });
      continue;
    }

    let debtMonthlyAmount = 0;
    let investingMonthlyAmount = 0;

    if (isUnlocked && remainingMonthlyCapacity > 0) {
      if (assessment.decision === "pay_debt") {
        debtMonthlyAmount = remainingMonthlyCapacity;
      } else if (assessment.decision === "invest") {
        investingMonthlyAmount = remainingMonthlyCapacity;
      } else {
        debtMonthlyAmount = roundMoney(remainingMonthlyCapacity / 2);
        investingMonthlyAmount = roundMoney(remainingMonthlyCapacity - debtMonthlyAmount);
      }
      remainingMonthlyCapacity = 0;
    }

    const allocationExists = debtMonthlyAmount > 0 || investingMonthlyAmount > 0;
    recommendations.push({
      id: `optimize-debt-${assessment.decision}-${debt.id}`,
      state: allocationExists ? "recommended" : "worth_considering",
      urgency: "optional",
      title: assessment.decision === "pay_debt"
        ? `Favor extra payoff on ${debt.name}`
        : assessment.decision === "invest"
          ? `Keep ${debt.name} on schedule and favor investing`
          : `Split optional dollars between ${debt.name} and investing`,
      decision: assessment.decision,
      relatedDebtId: debt.id,
      debtMonthlyAmount,
      investingMonthlyAmount,
      reasons: [
        ...assessment.reasons,
        ...(isUnlocked ? [] : ["Optimize allocations are locked until required and high-priority Secure recommendations are resolved."]),
      ],
      tradeoffs: assessment.tradeoffs,
      missingData: [],
    });
  }

  const totalDebtAllocation = roundMoney(recommendations.reduce((sum, item) => sum + item.debtMonthlyAmount, 0));
  const totalInvestingAllocation = roundMoney(recommendations.reduce((sum, item) => sum + item.investingMonthlyAmount, 0));

  return {
    isUnlocked,
    availableMonthlyCapacity: roundMoney(Math.max(0, build.remainingMonthlyCapacity)),
    totalDebtAllocation,
    totalInvestingAllocation,
    remainingMonthlyCapacity,
    recommendations,
  };
}
