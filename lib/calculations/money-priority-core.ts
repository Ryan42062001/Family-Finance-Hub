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

  return { status, monthlyPlanCapacity, protectedMonthlyFundingNeed, planFundingGap };
}

export type EmergencyRiskAssessment = {
  tier: EmergencyRiskTier;
  recommendedMonths: number;
  reasons: string[];
};

export type ExceptionalEmergencyReserveMode =
  | "none"
  | "temporary_exception"
  | "severe_exception"
  | "more_information_needed";

export type EmergencyReserveTargetSource = "ordinary_policy" | "exceptional_policy" | "household_override";

export type EmergencyReserveAssessment = {
  ordinaryRiskTier: EmergencyRiskTier;
  ordinaryRecommendedMonths: number;
  ordinaryReasons: string[];
  exceptionalTriggerExists: boolean;
  disruptionMonths: number | null;
  recoveryBufferMonths: number;
  exceptionalCandidateMonths: number | null;
  exceptionalRecommendedMonths: number | null;
  exceptionalMode: ExceptionalEmergencyReserveMode;
  exceptionalReasons: string[];
  missingData: string[];
  warnings: string[];
  engineRecommendedMonths: number;
  householdOverrideMonths: number | null;
  effectiveRecommendedMonths: number;
  source: EmergencyReserveTargetSource;
};

function classifyOrdinaryEmergencyRisk(
  snapshot: MoneyPrioritySnapshot,
  policy: MoneyPriorityPolicy,
): { tier: EmergencyRiskTier; recommendedMonths: number; reasons: string[] } {
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
    reasons.push("A known income disruption is recorded as an ordinary risk factor.");
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
  return { tier, recommendedMonths: policy.emergencyReserveMonthsByRisk[tier], reasons };
}

export function classifyEmergencyRisk(
  snapshot: MoneyPrioritySnapshot,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): EmergencyRiskAssessment {
  const ordinary = classifyOrdinaryEmergencyRisk(snapshot, policy);
  const override = snapshot.preferences?.emergencyFundMonthsOverride;
  const validOverride = override !== null && override !== undefined && override >= 0 ? override : null;
  const reasons = [...ordinary.reasons];
  if (validOverride !== null) reasons.push("Household emergency-fund override applied.");
  return { tier: ordinary.tier, recommendedMonths: validOverride ?? ordinary.recommendedMonths, reasons };
}

function parseStrictIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function monthsBetweenCeiling(start: Date, end: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs / 30.4375));
}

export function assessEmergencyReserve(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): EmergencyReserveAssessment {
  const asOf = parseStrictIsoDate(asOfDate);
  if (!asOf) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");

  const ordinary = classifyOrdinaryEmergencyRisk(snapshot, policy);
  const exceptionalReasons: string[] = [];
  const missingData: string[] = [];
  const warnings: string[] = [];
  const triggerExists = snapshot.preferences?.knownIncomeDisruption === true;
  const endDateValue = snapshot.preferences?.knownIncomeDisruptionEndDate;
  const invalidEndDateWasNormalized = snapshot.warnings.some((warning) => warning.includes("preferences.known_income_disruption_end_date must be a real YYYY-MM-DD"));
  let disruptionMonths: number | null = null;
  let exceptionalCandidateMonths: number | null = null;
  let exceptionalRecommendedMonths: number | null = null;
  let exceptionalMode: ExceptionalEmergencyReserveMode = "none";
  let engineRecommendedMonths = ordinary.recommendedMonths;

  if (triggerExists) {
    if (!endDateValue) {
      exceptionalMode = "more_information_needed";
      missingData.push(invalidEndDateWasNormalized
        ? "The known income disruption end date is invalid. Add a valid expected end date to evaluate exceptional reserve needs."
        : "A known income disruption is recorded, but its expected duration is unknown. Add an estimated end date to evaluate whether more than six months of reserves is warranted.");
    } else {
      const endDate = parseStrictIsoDate(endDateValue);
      if (!endDate) {
        exceptionalMode = "more_information_needed";
        missingData.push("The known income disruption end date is invalid. Add a valid expected end date to evaluate exceptional reserve needs.");
      } else if (endDate <= asOf) {
        warnings.push("The known income disruption end date is on or before the as-of date. Review whether the disruption record is stale.");
      } else {
        disruptionMonths = monthsBetweenCeiling(asOf, endDate);
        exceptionalCandidateMonths = disruptionMonths + policy.exceptionalEmergencyReserve.recoveryBufferMonths;
        exceptionalRecommendedMonths = Math.min(
          policy.exceptionalEmergencyReserve.automaticMaxMonths,
          exceptionalCandidateMonths,
        );
        engineRecommendedMonths = Math.max(ordinary.recommendedMonths, exceptionalRecommendedMonths);
        exceptionalMode = engineRecommendedMonths <= 6
          ? "none"
          : engineRecommendedMonths <= policy.exceptionalEmergencyReserve.temporaryMaxMonths
            ? "temporary_exception"
            : "severe_exception";
        exceptionalReasons.push(
          `The known income disruption has ${disruptionMonths} month${disruptionMonths === 1 ? "" : "s"} remaining as of ${asOfDate}.`,
          `Policy adds a ${policy.exceptionalEmergencyReserve.recoveryBufferMonths}-month recovery buffer.`,
        );
        if (exceptionalCandidateMonths > policy.exceptionalEmergencyReserve.automaticMaxMonths) {
          exceptionalReasons.push(`The automatic exceptional recommendation is capped at ${policy.exceptionalEmergencyReserve.automaticMaxMonths} months.`);
        }
      }
    }
  }

  const rawOverride = snapshot.preferences?.emergencyFundMonthsOverride;
  const householdOverrideMonths = rawOverride !== null && rawOverride !== undefined && rawOverride >= 0
    ? rawOverride
    : null;
  if (rawOverride !== null && rawOverride !== undefined && rawOverride < 0) {
    warnings.push("A negative emergency-fund override is invalid and was ignored.");
  }
  const effectiveRecommendedMonths = householdOverrideMonths === null
    ? engineRecommendedMonths
    : engineRecommendedMonths > 6
      ? Math.max(engineRecommendedMonths, householdOverrideMonths)
      : householdOverrideMonths;
  const source: EmergencyReserveTargetSource = householdOverrideMonths !== null
    && effectiveRecommendedMonths !== engineRecommendedMonths
    ? "household_override"
    : engineRecommendedMonths > ordinary.recommendedMonths
      ? "exceptional_policy"
      : "ordinary_policy";

  return {
    ordinaryRiskTier: ordinary.tier,
    ordinaryRecommendedMonths: ordinary.recommendedMonths,
    ordinaryReasons: ordinary.reasons,
    exceptionalTriggerExists: triggerExists,
    disruptionMonths,
    recoveryBufferMonths: policy.exceptionalEmergencyReserve.recoveryBufferMonths,
    exceptionalCandidateMonths,
    exceptionalRecommendedMonths,
    exceptionalMode,
    exceptionalReasons,
    missingData,
    warnings,
    engineRecommendedMonths,
    householdOverrideMonths,
    effectiveRecommendedMonths,
    source,
  };
}

export function calculateFullEmergencyTarget(snapshot: MoneyPrioritySnapshot, recommendedMonths: number): number {
  return recommendedMonths * (snapshot.aggregates.monthlyEssentialExpenses + snapshot.aggregates.monthlyMinimumDebtPayments);
}

export type DebtPriorityBand = "special_priority" | "high_interest" | "payoff_favored" | "gray_zone" | "optimize" | "unknown";
export type DebtClassification = { debtId: string; band: DebtPriorityBand; reasons: string[] };
export type DebtAction = "special" | "accelerate" | "split" | "scheduled" | "optimize" | "unknown";
export type DebtActionAssessment = DebtClassification & { action: DebtAction; reasons: string[] };

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
    ? (apr >= policy.debtDecision.accelerateStartingApr ? "accelerate" : "split")
    : "scheduled";
  reasons.push(baseline === "accelerate"
    ? `APR is at or above the ${(policy.debtDecision.accelerateStartingApr * 100).toFixed(0)}% accelerate starting threshold.`
    : baseline === "split"
      ? "APR starts in the split/payoff-favored posture."
      : "APR starts in the scheduled/context posture.");

  let modifierScore = 0;
  const retirementHorizon = householdRetirementHorizon(snapshot, asOfDate);
  if (retirementHorizon !== null && retirementHorizon <= policy.debtDecision.retirementNearYears) {
    modifierScore += 2;
    reasons.push(`Retirement is within ${policy.debtDecision.retirementNearYears} years, a strong factor favoring debt reduction.`);
  } else if (retirementHorizon !== null && retirementHorizon >= policy.debtDecision.longInvestmentHorizonYears) {
    modifierScore -= 1;
    reasons.push(`A ${policy.debtDecision.longInvestmentHorizonYears}+ year retirement horizon modestly favors investing flexibility.`);
  }

  if (debt.rateType === "variable") {
    modifierScore += 2;
    reasons.push("Variable-rate debt has reset risk, a strong factor favoring faster payoff.");
  }

  const debtBurden = snapshot.aggregates.monthlyTakeHomeIncome > 0
    ? snapshot.aggregates.monthlyMinimumDebtPayments / snapshot.aggregates.monthlyTakeHomeIncome
    : 0;
  if (debtBurden >= policy.debtDecision.severeDebtBurdenTakeHome) {
    modifierScore += 2;
    reasons.push(`Minimum debt payments consume at least ${(policy.debtDecision.severeDebtBurdenTakeHome * 100).toFixed(0)}% of take-home income.`);
  }

  if (debt.minimumPayment > 0 && debt.balance / debt.minimumPayment <= policy.debtDecision.nearPayoffMonths) {
    modifierScore += 1;
    reasons.push(`The balance could be cleared in roughly ${policy.debtDecision.nearPayoffMonths} scheduled-payment months or less.`);
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
