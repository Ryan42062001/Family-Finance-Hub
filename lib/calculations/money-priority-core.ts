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
  if (snapshot.preferences?.jobReplacementDifficulty === "difficult") {
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

export type DebtAction =
  | "special"
  | "accelerate"
  | "split"
  | "scheduled"
  | "optimize"
  | "unknown";

export type DebtActionAssessment = DebtClassification & {
  action: DebtAction;
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

function parseIsoDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageOnDate(birthDate: string, asOfDate: string): number | null {
  const birth = parseIsoDate(birthDate);
  const asOf = parseIsoDate(asOfDate);
  if (!birth || !asOf || birth > asOf) return null;
  let age = asOf.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = asOf.getUTCMonth() < birth.getUTCMonth()
    || (asOf.getUTCMonth() === birth.getUTCMonth() && asOf.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function householdRetirementHorizon(snapshot: MoneyPrioritySnapshot, asOfDate: string): number | null {
  const horizons = snapshot.people
    .filter((person) => person.isActive && person.birthDate && person.plannedRetirementAge !== null)
    .map((person) => {
      const age = ageOnDate(person.birthDate!, asOfDate);
      return age === null ? null : Math.max(0, person.plannedRetirementAge! - age);
    })
    .filter((value): value is number => value !== null);
  return horizons.length ? Math.min(...horizons) : null;
}

export function assessDebtAction(
  snapshot: MoneyPrioritySnapshot,
  debt: MoneyPrioritySnapshot["debts"][number],
  asOfDate: string,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): DebtActionAssessment {
  const classification = classifyDebt(debt, policy);
  const reasons = [...classification.reasons];

  if (classification.band === "special_priority") return { ...classification, action: "special", reasons };
  if (classification.band === "high_interest") return { ...classification, action: "accelerate", reasons };
  if (classification.band === "unknown") return { ...classification, action: "unknown", reasons };
  if (classification.band === "optimize") return { ...classification, action: "optimize", reasons };

  const apr = (debt.annualInterestRate ?? 0) / 100;
  const baseline: "accelerate" | "split" | "scheduled" = classification.band === "payoff_favored"
    ? (apr >= 0.08 ? "accelerate" : "split")
    : "scheduled";
  reasons.push(baseline === "accelerate"
    ? "An 8–9.99% APR starts in the accelerate posture."
    : baseline === "split"
      ? "A 6–7.99% APR starts in the split/payoff-favored posture."
      : "A 4–5.99% APR starts in the scheduled/context posture.");

  let modifierScore = 0;
  const retirementHorizon = householdRetirementHorizon(snapshot, asOfDate);
  if (retirementHorizon !== null && retirementHorizon <= 10) {
    modifierScore += 2;
    reasons.push("Retirement is within 10 years, a strong factor favoring debt reduction.");
  } else if (retirementHorizon !== null && retirementHorizon >= 25) {
    modifierScore -= 1;
    reasons.push("A 25+ year retirement horizon modestly favors investing flexibility.");
  }

  if (debt.rateType === "variable") {
    modifierScore += 2;
    reasons.push("Variable-rate debt has reset risk, a strong factor favoring faster payoff.");
  }

  const debtBurden = snapshot.aggregates.monthlyTakeHomeIncome > 0
    ? snapshot.aggregates.monthlyMinimumDebtPayments / snapshot.aggregates.monthlyTakeHomeIncome
    : 0;
  if (debtBurden >= 0.2) {
    modifierScore += 2;
    reasons.push("Minimum debt payments consume at least 20% of take-home income, a strong debt-burden signal.");
  }

  if (debt.minimumPayment > 0 && debt.balance / debt.minimumPayment <= 12) {
    modifierScore += 1;
    reasons.push("The balance is close enough to payoff that eliminating the payment could free cash flow soon.");
  }

  if (snapshot.preferences?.debtVsInvesting === "debt_focused") {
    modifierScore += 1;
    reasons.push("Household preference leans toward debt payoff.");
  } else if (snapshot.preferences?.debtVsInvesting === "growth_focused") {
    modifierScore -= 1;
    reasons.push("Household preference leans toward long-term growth.");
  }

  let action: "accelerate" | "split" | "scheduled" = baseline;
  if (baseline === "accelerate") {
    if (modifierScore <= -2) action = "split";
  } else if (baseline === "split") {
    if (modifierScore >= 2) action = "accelerate";
    else if (modifierScore <= -2) action = "scheduled";
  } else if (modifierScore >= 2) {
    action = "split";
  }

  if (action !== baseline) reasons.push("Context modifiers moved the debt exactly one posture from its APR baseline.");
  return { ...classification, action, reasons };
}
