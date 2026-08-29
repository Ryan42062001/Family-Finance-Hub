import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import {
  calculateFullEmergencyTarget,
  classifyDebt,
  classifyEmergencyRisk,
  type DebtClassification,
} from "./money-priority-core.ts";

export type SecureRecommendationState =
  | "recommended"
  | "worth_considering"
  | "more_information_needed";

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
  recommendations: SecureStageRecommendation[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function evaluateSecureStage(snapshot: MoneyPrioritySnapshot): SecureStageResult {
  const recommendations: SecureStageRecommendation[] = [];
  let rank = 1;

  const deductibleReserveTarget = snapshot.aggregates.deductibleReserveTarget;
  const protectedReserveCash = snapshot.aggregates.protectedCash;
  const deductibleReserveGap = deductibleReserveTarget === null
    ? null
    : roundMoney(Math.max(0, deductibleReserveTarget - protectedReserveCash));

  if (deductibleReserveTarget === null) {
    recommendations.push({
      id: "secure-deductible-missing",
      rank: rank++,
      state: "more_information_needed",
      urgency: "high",
      title: "Add insurance deductible information",
      monthlyAmount: null,
      targetAmount: null,
      gapAmount: null,
      relatedEntityId: null,
      reasons: ["The deductible reserve target cannot be verified without deductible data."],
    });
  } else if (deductibleReserveGap !== null && deductibleReserveGap > 0) {
    recommendations.push({
      id: "secure-deductible-gap",
      rank: rank++,
      state: "recommended",
      urgency: "required",
      title: "Fund your deductible reserve",
      monthlyAmount: null,
      targetAmount: deductibleReserveTarget,
      gapAmount: deductibleReserveGap,
      relatedEntityId: null,
      reasons: ["Stage 1 protects against an immediate insurance deductible before ordinary optimization."],
    });
  }

  let employerMatchMonthlyGap = 0;
  for (const account of snapshot.retirementAccounts) {
    if (account.matchStatus === "not_offered" || account.matchStatus === "fully_captured") continue;

    if (account.matchStatus === "not_fully_captured") {
      if (account.fullMatchEmployeeContributionMonthly === null) {
        recommendations.push({
          id: `secure-match-missing-${account.id}`,
          rank: rank++,
          state: "more_information_needed",
          urgency: "high",
          title: `Confirm the contribution needed for the full match in ${account.name}`,
          monthlyAmount: null,
          targetAmount: null,
          gapAmount: null,
          relatedEntityId: account.id,
          reasons: ["The engine knows the employer match is not fully captured but does not know the required employee contribution."],
        });
        continue;
      }

      const gap = roundMoney(Math.max(
        0,
        account.fullMatchEmployeeContributionMonthly - account.monthlyEmployeeContribution,
      ));
      employerMatchMonthlyGap = roundMoney(employerMatchMonthlyGap + gap);

      if (gap > 0) {
        recommendations.push({
          id: `secure-match-gap-${account.id}`,
          rank: rank++,
          state: "recommended",
          urgency: "required",
          title: `Increase contributions to capture the full employer match in ${account.name}`,
          monthlyAmount: gap,
          targetAmount: account.fullMatchEmployeeContributionMonthly,
          gapAmount: gap,
          relatedEntityId: account.id,
          reasons: ["Capturing the available employer match is prioritized before ordinary debt-versus-investing optimization."],
        });
      }
    } else if (account.matchStatus === "unknown") {
      recommendations.push({
        id: `secure-match-unknown-${account.id}`,
        rank: rank++,
        state: "more_information_needed",
        urgency: "high",
        title: `Confirm employer-match details for ${account.name}`,
        monthlyAmount: null,
        targetAmount: null,
        gapAmount: null,
        relatedEntityId: account.id,
        reasons: ["Employer-match availability is unknown."],
      });
    }
  }

  const debtClassifications = snapshot.debts.map((debt) => classifyDebt(debt));
  const debtById = new Map(snapshot.debts.map((debt) => [debt.id, debt]));

  const specialDebts = debtClassifications.filter((item) => item.band === "special_priority");
  for (const classification of specialDebts) {
    const debt = debtById.get(classification.debtId)!;
    recommendations.push({
      id: `secure-debt-special-${debt.id}`,
      rank: rank++,
      state: "recommended",
      urgency: "required",
      title: `Address ${debt.name} before ordinary debt optimization`,
      monthlyAmount: null,
      targetAmount: debt.balance,
      gapAmount: debt.balance,
      relatedEntityId: debt.id,
      reasons: classification.reasons,
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
      id: `secure-debt-high-${debt.id}`,
      rank: rank++,
      state: "recommended",
      urgency: "high",
      title: `Accelerate payoff of ${debt.name}`,
      monthlyAmount: null,
      targetAmount: debt.balance,
      gapAmount: debt.balance,
      relatedEntityId: debt.id,
      reasons: classification.reasons,
    });
  }

  for (const classification of debtClassifications.filter((item) => item.band === "unknown")) {
    const debt = debtById.get(classification.debtId)!;
    recommendations.push({
      id: `secure-debt-unknown-${debt.id}`,
      rank: rank++,
      state: "more_information_needed",
      urgency: "medium",
      title: `Add APR information for ${debt.name}`,
      monthlyAmount: null,
      targetAmount: null,
      gapAmount: null,
      relatedEntityId: debt.id,
      reasons: classification.reasons,
    });
  }

  const emergencyRisk = classifyEmergencyRisk(snapshot);
  const fullEmergencyTarget = roundMoney(calculateFullEmergencyTarget(snapshot, emergencyRisk.recommendedMonths));
  const fullEmergencyGap = roundMoney(Math.max(0, fullEmergencyTarget - protectedReserveCash));

  if (fullEmergencyGap > 0) {
    recommendations.push({
      id: "secure-full-emergency-fund",
      rank: rank++,
      state: "recommended",
      urgency: "high",
      title: `Build a ${emergencyRisk.recommendedMonths}-month emergency reserve`,
      monthlyAmount: null,
      targetAmount: fullEmergencyTarget,
      gapAmount: fullEmergencyGap,
      relatedEntityId: null,
      reasons: emergencyRisk.reasons.length
        ? emergencyRisk.reasons
        : ["A full emergency reserve protects essential expenses and minimum debt payments."],
    });
  }

  return {
    deductibleReserveTarget,
    deductibleReserveGap,
    employerMatchMonthlyGap,
    fullEmergencyTarget,
    fullEmergencyGap,
    debtClassifications,
    recommendations,
  };
}
