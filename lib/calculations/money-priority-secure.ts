import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";
import {
  assessDebtAction,
  calculateFullEmergencyTarget,
  classifyDebt,
  classifyEmergencyRisk,
  type DebtActionAssessment,
  type DebtClassification,
} from "./money-priority-core.ts";
import {
  assessStudentLoanStrategy,
  type StudentLoanStrategyAssessment,
} from "./money-priority-student-loans.ts";

export type SecureRecommendationState = "recommended" | "worth_considering" | "more_information_needed";

export type SecureStageRecommendation = {
  id: string;
  rank: number;
  state: SecureRecommendationState;
  urgency: "required" | "high" | "medium";
  title: string;
  monthlyAmount: number | null;
  targetAmount: number | null;
  gapAmount: number | null;
  relatedEntityId: string | null;
  reasons: string[];
};

export type SecureStageResult = {
  deductibleReserveTarget: number | null;
  deductibleReserveGap: number | null;
  employerMatchMonthlyGap: number;
  fullEmergencyTarget: number;
  fullEmergencyGap: number;
  debtClassifications: DebtClassification[];
  debtActionAssessments: DebtActionAssessment[];
  studentLoanStrategies: StudentLoanStrategyAssessment[];
  recommendations: SecureStageRecommendation[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseIsoDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthsUntil(asOfDate: string, targetDate: string): number | null {
  const start = parseIsoDate(asOfDate);
  const target = parseIsoDate(targetDate);
  if (!start || !target) return null;
  if (target <= start) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((target.getTime() - start.getTime()) / dayMs / 30.4375));
}

function debtBackedReserveFor(snapshot: MoneyPrioritySnapshot, debtId: string): number {
  return roundMoney(snapshot.accounts.reduce((sum, account) => {
    if (account.cashPurpose !== "debt_backed_reserve" || account.relatedDebtId !== debtId) return sum;
    return sum + account.balance;
  }, 0));
}

export function evaluateSecureStage(
  snapshot: MoneyPrioritySnapshot,
  asOfDate = "1970-01-01",
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): SecureStageResult {
  if (!parseIsoDate(asOfDate)) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");

  const recommendations: SecureStageRecommendation[] = [];
  let rank = 1;
  const deductibleReserveTarget = snapshot.aggregates.deductibleReserveTarget;
  const protectedReserveCash = snapshot.aggregates.protectedCash;
  const deductibleReserveGap = deductibleReserveTarget === null
    ? null
    : roundMoney(Math.max(0, deductibleReserveTarget - protectedReserveCash));

  if (deductibleReserveTarget === null) {
    recommendations.push({
      id: "secure-deductible-missing", rank: rank++, state: "more_information_needed", urgency: "high",
      title: "Add insurance deductible information", monthlyAmount: null, targetAmount: null, gapAmount: null, relatedEntityId: null,
      reasons: ["The deductible reserve target cannot be verified without deductible data."],
    });
  } else if (deductibleReserveGap !== null && deductibleReserveGap > 0) {
    recommendations.push({
      id: "secure-deductible-gap", rank: rank++, state: "recommended", urgency: "required", title: "Fund your deductible reserve",
      monthlyAmount: null, targetAmount: deductibleReserveTarget, gapAmount: deductibleReserveGap, relatedEntityId: null,
      reasons: ["Stage 1 protects against an immediate insurance deductible before ordinary optimization."],
    });
  }

  let employerMatchMonthlyGap = 0;
  for (const account of snapshot.retirementAccounts) {
    if (account.matchStatus === "not_offered" || account.matchStatus === "fully_captured") continue;
    if (account.matchStatus === "not_fully_captured") {
      if (account.fullMatchEmployeeContributionMonthly === null) {
        recommendations.push({
          id: `secure-match-missing-${account.id}`, rank: rank++, state: "more_information_needed", urgency: "high",
          title: `Confirm the contribution needed for the full match in ${account.name}`, monthlyAmount: null, targetAmount: null, gapAmount: null,
          relatedEntityId: account.id,
          reasons: ["The engine knows the employer match is not fully captured but does not know the required employee contribution."],
        });
        continue;
      }
      const gap = roundMoney(Math.max(0, account.fullMatchEmployeeContributionMonthly - account.monthlyEmployeeContribution));
      employerMatchMonthlyGap = roundMoney(employerMatchMonthlyGap + gap);
      if (gap > 0) {
        recommendations.push({
          id: `secure-match-gap-${account.id}`, rank: rank++, state: "recommended", urgency: "required",
          title: `Increase contributions to capture the full employer match in ${account.name}`,
          monthlyAmount: gap, targetAmount: account.fullMatchEmployeeContributionMonthly, gapAmount: gap, relatedEntityId: account.id,
          reasons: ["Capturing the available employer match is prioritized before ordinary debt-versus-investing optimization."],
        });
      }
    } else if (account.matchStatus === "unknown") {
      recommendations.push({
        id: `secure-match-unknown-${account.id}`, rank: rank++, state: "more_information_needed", urgency: "high",
        title: `Confirm employer-match details for ${account.name}`, monthlyAmount: null, targetAmount: null, gapAmount: null, relatedEntityId: account.id,
        reasons: ["Employer-match availability is unknown."],
      });
    }
  }

  const studentLoanStrategies = snapshot.debts
    .filter((debt) => debt.type === "student_loan" || debt.type === "student")
    .map((debt) => assessStudentLoanStrategy(debt, asOfDate, policy));
  const studentStrategyById = new Map(studentLoanStrategies.map((item) => [item.debtId, item]));
  const debtClassifications = snapshot.debts.map((debt) => {
    const strategy = studentStrategyById.get(debt.id);
    return strategy && !strategy.ordinaryDebtPolicyAllowed
      ? { debtId: debt.id, band: "special_priority" as const, reasons: [...strategy.reasons, ...strategy.warnings] }
      : classifyDebt(debt, policy);
  });
  const debtActionAssessments = snapshot.debts.map((debt) => {
    const strategy = studentStrategyById.get(debt.id);
    return strategy && !strategy.ordinaryDebtPolicyAllowed
      ? { debtId: debt.id, band: "special_priority" as const, action: "special" as const, reasons: [...strategy.reasons, ...strategy.warnings] }
      : assessDebtAction(snapshot, debt, asOfDate, policy);
  });
  const debtById = new Map(snapshot.debts.map((debt) => [debt.id, debt]));
  const actionById = new Map(debtActionAssessments.map((item) => [item.debtId, item]));

  for (const classification of debtClassifications.filter((item) => item.band === "special_priority")) {
    const debt = debtById.get(classification.debtId)!;
    const studentStrategy = studentStrategyById.get(debt.id);
    if (studentStrategy && !studentStrategy.ordinaryDebtPolicyAllowed) {
      const state = studentStrategy.state === "more_information_needed"
        ? "more_information_needed" as const
        : "worth_considering" as const;
      const purpose = studentStrategy.state === "preserve_current_strategy"
        ? "preserve"
        : studentStrategy.state === "special_review"
          ? "review"
          : "missing";
      recommendations.push({
        id: `secure-student-loan-${purpose}-${debt.id}`,
        rank: rank++,
        state,
        urgency: studentStrategy.state === "more_information_needed" ? "high" : "medium",
        title: studentStrategy.state === "preserve_current_strategy"
          ? `Preserve the current strategy for ${debt.name}`
          : studentStrategy.state === "special_review"
            ? `Review the special repayment strategy for ${debt.name}`
            : `Complete student-loan strategy details for ${debt.name}`,
        monthlyAmount: null,
        targetAmount: debt.balance,
        gapAmount: null,
        relatedEntityId: debt.id,
        reasons: [...studentStrategy.reasons, ...studentStrategy.warnings],
      });
      continue;
    }
    if (debt.rateType === "promotional") {
      const backedReserve = debtBackedReserveFor(snapshot, debt.id);
      const remainingPromoBalance = roundMoney(Math.max(0, debt.balance - backedReserve));
      if (remainingPromoBalance === 0) continue;
      if (!debt.promoRateExpiresOn) {
        recommendations.push({
          id: `secure-promo-missing-${debt.id}`, rank: rank++, state: "more_information_needed", urgency: "required",
          title: `Add the promotional-rate expiration date for ${debt.name}`, monthlyAmount: null, targetAmount: debt.balance,
          gapAmount: remainingPromoBalance, relatedEntityId: debt.id,
          reasons: [
            "A promotional debt needs an expiration date before the engine can calculate the required monthly payoff pace.",
            backedReserve > 0 ? `$${backedReserve.toFixed(2)} is already reserved specifically for this debt and is not reused elsewhere.` : "No debt-backed reserve is linked to this debt.",
          ],
        });
        continue;
      }
      const months = monthsUntil(asOfDate, debt.promoRateExpiresOn);
      if (months === null) {
        recommendations.push({
          id: `secure-promo-invalid-${debt.id}`, rank: rank++, state: "more_information_needed", urgency: "required",
          title: `Correct the promotional-rate expiration date for ${debt.name}`, monthlyAmount: null, targetAmount: debt.balance,
          gapAmount: remainingPromoBalance, relatedEntityId: debt.id, reasons: ["The promotional-rate expiration date is invalid."],
        });
        continue;
      }
      const requiredMonthlyPaydown = months === 0 ? remainingPromoBalance : roundMoney(remainingPromoBalance / months);
      const reasons = [
        months === 0 ? "The promotional period has expired or ends today, so the uncovered balance is immediately exposed."
          : `The uncovered promotional balance should be paid over the remaining ${months} month${months === 1 ? "" : "s"}.`,
        backedReserve > 0 ? `$${backedReserve.toFixed(2)} is debt-backed cash reserved for this debt and is excluded from other reserve uses.`
          : "No debt-backed reserve is linked to this debt.",
      ];
      if (debt.postPromoInterestRate !== null) reasons.push(`The recorded post-promotional APR is ${debt.postPromoInterestRate.toFixed(2)}%.`);
      recommendations.push({
        id: `secure-promo-paydown-${debt.id}`, rank: rank++, state: "recommended", urgency: "required",
        title: `Pay ${debt.name} before the promotional rate expires`, monthlyAmount: requiredMonthlyPaydown,
        targetAmount: debt.balance, gapAmount: remainingPromoBalance, relatedEntityId: debt.id, reasons,
      });
      continue;
    }

    recommendations.push({
      id: `secure-debt-special-${debt.id}`, rank: rank++, state: "recommended", urgency: "required",
      title: `Address ${debt.name} before ordinary debt optimization`, monthlyAmount: null, targetAmount: debt.balance,
      gapAmount: debt.balance, relatedEntityId: debt.id, reasons: classification.reasons,
    });
  }

  const highInterestDebts = debtClassifications
    .filter((item) => item.band === "high_interest")
    .sort((a, b) => {
      const debtA = debtById.get(a.debtId)!;
      const debtB = debtById.get(b.debtId)!;
      return (debtB.annualInterestRate ?? 0) - (debtA.annualInterestRate ?? 0);
    });

  for (const classification of highInterestDebts) {
    const debt = debtById.get(classification.debtId)!;
    recommendations.push({
      id: `secure-debt-high-${debt.id}`, rank: rank++, state: "recommended", urgency: "high",
      title: `Accelerate payoff of ${debt.name}`, monthlyAmount: null, targetAmount: debt.balance, gapAmount: debt.balance,
      relatedEntityId: debt.id, reasons: actionById.get(debt.id)?.reasons ?? classification.reasons,
    });
  }

  for (const debt of snapshot.debts) {
    const assessment = actionById.get(debt.id)!;
    if (assessment.band !== "payoff_favored" && assessment.band !== "gray_zone") continue;
    if (assessment.action === "accelerate") {
      recommendations.push({
        id: `secure-debt-context-accelerate-${debt.id}`, rank: rank++, state: "recommended", urgency: "high",
        title: `Favor faster payoff of ${debt.name}`, monthlyAmount: null, targetAmount: debt.balance, gapAmount: debt.balance,
        relatedEntityId: debt.id, reasons: assessment.reasons,
      });
    } else if (assessment.action === "split") {
      recommendations.push({
        id: `secure-debt-context-split-${debt.id}`, rank: rank++, state: "worth_considering", urgency: "medium",
        title: `Use a split payoff-and-investing approach for ${debt.name}`, monthlyAmount: null, targetAmount: debt.balance,
        gapAmount: debt.balance, relatedEntityId: debt.id, reasons: assessment.reasons,
      });
    } else if (assessment.action === "scheduled") {
      recommendations.push({
        id: `secure-debt-context-scheduled-${debt.id}`, rank: rank++, state: "worth_considering", urgency: "medium",
        title: `Keep ${debt.name} on its scheduled payoff unless other factors change`, monthlyAmount: null, targetAmount: debt.balance,
        gapAmount: debt.balance, relatedEntityId: debt.id, reasons: assessment.reasons,
      });
    }
  }

  for (const classification of debtClassifications.filter((item) => item.band === "unknown")) {
    const debt = debtById.get(classification.debtId)!;
    recommendations.push({
      id: `secure-debt-unknown-${debt.id}`, rank: rank++, state: "more_information_needed", urgency: "medium",
      title: `Add APR information for ${debt.name}`, monthlyAmount: null, targetAmount: null, gapAmount: null,
      relatedEntityId: debt.id, reasons: classification.reasons,
    });
  }

  const emergencyRisk = classifyEmergencyRisk(snapshot, policy);
  const fullEmergencyTarget = roundMoney(calculateFullEmergencyTarget(snapshot, emergencyRisk.recommendedMonths));
  const fullEmergencyGap = roundMoney(Math.max(0, fullEmergencyTarget - protectedReserveCash));
  if (fullEmergencyGap > 0) {
    recommendations.push({
      id: "secure-full-emergency-fund", rank: rank++, state: "recommended", urgency: "high",
      title: `Build a ${emergencyRisk.recommendedMonths}-month emergency reserve`, monthlyAmount: null,
      targetAmount: fullEmergencyTarget, gapAmount: fullEmergencyGap, relatedEntityId: null,
      reasons: [
        ...(emergencyRisk.reasons.length ? emergencyRisk.reasons : ["A full emergency reserve protects essential expenses and minimum debt payments."]),
        "Protected reserve cash is one shared reserve pool: deductible coverage counts toward the full emergency target rather than being subtracted twice.",
      ],
    });
  }

  return {
    deductibleReserveTarget, deductibleReserveGap, employerMatchMonthlyGap, fullEmergencyTarget, fullEmergencyGap,
    debtClassifications, debtActionAssessments, studentLoanStrategies, recommendations,
  };
}
