import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import {
  MONEY_PRIORITY_POLICY_V1,
  type EmergencyRiskTier,
  type MoneyPriorityPolicy,
} from "./money-priority-policy.ts";

export type PlanFeasibility = {
  status: "feasible" | "tight" | "funding_gap";
  monthlyPlanCapacity: number;
  protectedMonthlyFundingNeed: number;
  planFundingGap: number;
};

export function calculatePlanFeasibility(
  snapshot: MoneyPrioritySnapshot,
  protectedMonthlyFundingNeed = 0,
): PlanFeasibility {
  const monthlyPlanCapacity = snapshot.aggregates.monthlyCashFlowBeforeSavings;
  const planFundingGap = Math.max(0, protectedMonthlyFundingNeed - Math.max(0, monthlyPlanCapacity));
  const status = planFundingGap > 0
    ? "funding_gap"
    : monthlyPlanCapacity <= Math.max(100, snapshot.aggregates.monthlyTakeHomeIncome * 0.05)
      ? "tight"
      : "feasible";

  return {
    status,
    monthlyPlanCapacity,
    protectedMonthlyFundingNeed,
    planFundingGap,
  };
}

export type EmergencyRiskAssessment = {
  tier: EmergencyRiskTier;
  recommendedMonths: number;
  reasons: string[];
};

export function classifyEmergencyRisk(
  snapshot: MoneyPrioritySnapshot,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): EmergencyRiskAssessment {
  const reasons: string[] = [];
  let score = 0;

  const activeIncome = snapshot.income.filter((item) => item.isActive);
  const totalTakeHome = activeIncome.reduce((sum, item) => sum + item.monthlyTakeHomeAmount, 0);
  const largestIncome = activeIncome.reduce((max, item) => Math.max(max, item.monthlyTakeHomeAmount), 0);
  const incomeConcentration = totalTakeHome > 0 ? largestIncome / totalTakeHome : 1;

  if (activeIncome.length <= 1 || incomeConcentration >= 0.8) {
    score += 1;
    reasons.push("Household income is concentrated in one primary source.");
  }
  if (activeIncome.some((item) => item.isVariable)) {
    score += 1;
    reasons.push("At least one active income source is variable.");
  }
  if (snapshot.people.some((person) => person.isActive && person.isDependent)) {
    score += 1;
    reasons.push("The household has financial dependents.");
  }
  if (snapshot.preferences?.knownIncomeDisruption) {
    score += 2;
    reasons.push("A known income disruption is recorded.");
  }
  if (snapshot.preferences?.jobReplacementDifficulty === "hard") {
    score += 2;
    reasons.push("Job replacement is expected to be difficult.");
  } else if (snapshot.preferences?.jobReplacementDifficulty === "moderate") {
    score += 1;
    reasons.push("Job replacement may take meaningful time.");
  }

  let tier: EmergencyRiskTier = "low";
  if (score >= 5) tier = "high";
  else if (score >= 3) tier = "elevated";
  else if (score >= 1) tier = "moderate";

  const override = snapshot.preferences?.emergencyFundMonthsOverride;
  const recommendedMonths = override ?? policy.emergencyReserveMonthsByRisk[tier];
  if (override !== null && override !== undefined) reasons.push("Household emergency-fund override applied.");

  return { tier, recommendedMonths, reasons };
}

export function calculateFullEmergencyTarget(
  snapshot: MoneyPrioritySnapshot,
  recommendedMonths: number,
): number {
  return recommendedMonths * (
    snapshot.aggregates.monthlyEssentialExpenses
    + snapshot.aggregates.monthlyMinimumDebtPayments
  );
}

export type DebtPriorityBand =
  | "special_priority"
  | "high_interest"
  | "payoff_favored"
  | "gray_zone"
  | "optimize"
  | "unknown";

export type DebtClassification = {
  debtId: string;
  band: DebtPriorityBand;
  reasons: string[];
};

export function classifyDebt(
  debt: MoneyPrioritySnapshot["debts"][number],
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): DebtClassification {
  const reasons: string[] = [];

  if (debt.isPastDue || debt.isInCollections || debt.hasLegalOrTaxPriority) {
    if (debt.isPastDue) reasons.push("Debt is past due.");
    if (debt.isInCollections) reasons.push("Debt is in collections.");
    if (debt.hasLegalOrTaxPriority) reasons.push("Debt has legal or tax priority.");
    return { debtId: debt.id, band: "special_priority", reasons };
  }

  if (debt.rateType === "promotional" || debt.forgivenessOrRepaymentProgram) {
    reasons.push("Debt requires special-policy handling before ordinary APR ranking.");
    return { debtId: debt.id, band: "special_priority", reasons };
  }

  if (debt.type === "mortgage") {
    reasons.push("Mortgage debt is handled in Optimize rather than ordinary high-interest ranking.");
    return { debtId: debt.id, band: "optimize", reasons };
  }

  if (debt.annualInterestRate === null) {
    reasons.push("APR is missing.");
    return { debtId: debt.id, band: "unknown", reasons };
  }

  const apr = debt.annualInterestRate / 100;
  if (apr >= policy.highInterestDebtApr) {
    reasons.push("APR is at or above the high-interest threshold.");
    return { debtId: debt.id, band: "high_interest", reasons };
  }
  if (apr >= policy.payoffFavoredDebtApr) {
    reasons.push("APR falls in the payoff-favored range.");
    return { debtId: debt.id, band: "payoff_favored", reasons };
  }
  if (apr >= policy.grayZoneDebtApr) {
    reasons.push("APR falls in the debt-vs-investing gray zone.");
    return { debtId: debt.id, band: "gray_zone", reasons };
  }

  reasons.push("APR is below the ordinary debt-acceleration thresholds.");
  return { debtId: debt.id, band: "optimize", reasons };
}
