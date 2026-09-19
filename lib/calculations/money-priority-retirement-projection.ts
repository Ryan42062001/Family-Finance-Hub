import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import {
  MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
  type MoneyPriorityPlanningAssumptions,
} from "./money-priority-planning-assumptions.ts";

export type RetirementProjectionState = "on_track" | "shortfall" | "more_information_needed";

export type RetirementProjectionResult = {
  state: RetirementProjectionState;
  asOfDate: string;
  yearsToRetirement: number | null;
  currentRetirementAssets: number;
  currentAnnualContributions: number;
  desiredAnnualRetirementSpending: number | null;
  modeledAnnualGuaranteedIncome: number;
  annualPortfolioSpendingNeed: number | null;
  targetPortfolio: number | null;
  projectedPortfolioAtRetirement: number | null;
  projectedShortfall: number | null;
  requiredAdditionalMonthlyContribution: number | null;
  assumptionsVersion: string;
  assumptions: string[];
  missingData: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function yearsToHouseholdRetirement(snapshot: MoneyPrioritySnapshot, asOfDate: string): number | null {
  const horizons = snapshot.people
    .filter((person) => person.isActive && person.birthDate && person.plannedRetirementAge !== null)
    .map((person) => {
      const age = ageOnDate(person.birthDate!, asOfDate);
      if (age === null) return null;
      return Math.max(0, person.plannedRetirementAge! - age);
    })
    .filter((value): value is number => value !== null);
  return horizons.length ? Math.min(...horizons) : null;
}

function futureValueOfAnnualContributions(annualContribution: number, rate: number, years: number): number {
  if (years <= 0 || annualContribution === 0) return 0;
  if (rate === 0) return annualContribution * years;
  return annualContribution * ((Math.pow(1 + rate, years) - 1) / rate);
}

export function projectRetirement(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
  assumptions: MoneyPriorityPlanningAssumptions = MONEY_PRIORITY_PLANNING_ASSUMPTIONS_V1,
  currentAnnualContributionsOverride?: number,
): RetirementProjectionResult {
  if (!parseIsoDate(asOfDate)) throw new Error("asOfDate must be a valid YYYY-MM-DD date.");

  const currentRetirementAssets = roundMoney(
    snapshot.retirementAccounts.reduce((sum, account) => sum + account.balance, 0),
  );
  const currentAnnualContributions = roundMoney(currentAnnualContributionsOverride ??
    snapshot.retirementAccounts.reduce(
      (sum, account) => sum + (account.monthlyEmployeeContribution + account.monthlyEmployerContribution) * 12,
      0,
    ),
  );
  const missingData: string[] = [];
  const assumptionsUsed: string[] = [];
  const yearsToRetirement = yearsToHouseholdRetirement(snapshot, asOfDate);

  if (yearsToRetirement === null) {
    missingData.push("At least one active household member needs both a birth date and planned retirement age for projection-based guidance.");
  }

  const desiredMonthlySpending = snapshot.preferences?.desiredRetirementMonthlySpending ?? null;
  if (desiredMonthlySpending === null || desiredMonthlySpending <= 0) {
    missingData.push("Desired monthly retirement spending is required for projection-based guidance.");
  }

  if (snapshot.preferences?.retirementSpendingBasis !== "today_dollars") {
    missingData.push("Retirement spending must be expressed in today's dollars before the current real-return projection can run.");
  }

  const modeledSocialSecurity = snapshot.preferences?.planningSocialSecurityMonthly ?? 0;
  const modeledPension = snapshot.preferences?.planningPensionMonthly ?? 0;
  if (snapshot.preferences?.planningSocialSecurityMonthly === null || snapshot.preferences?.planningSocialSecurityMonthly === undefined) {
    assumptionsUsed.push("No Social Security estimate was provided, so the projection models $0 of Social Security income.");
  }
  if (snapshot.preferences?.planningPensionMonthly === null || snapshot.preferences?.planningPensionMonthly === undefined) {
    assumptionsUsed.push("No pension estimate was provided, so the projection models $0 of pension income.");
  }

  assumptionsUsed.push(
    `Projection uses a ${(assumptions.retirement.realAnnualReturn * 100).toFixed(1)}% annual real return.`,
    `Portfolio target uses a ${(assumptions.retirement.withdrawalRate * 100).toFixed(1)}% planning withdrawal rate.`,
    "Projection results are planning estimates, not guarantees.",
  );

  if (missingData.length) {
    return {
      state: "more_information_needed",
      asOfDate,
      yearsToRetirement,
      currentRetirementAssets,
      currentAnnualContributions,
      desiredAnnualRetirementSpending: desiredMonthlySpending && desiredMonthlySpending > 0 ? roundMoney(desiredMonthlySpending * 12) : null,
      modeledAnnualGuaranteedIncome: roundMoney((modeledSocialSecurity + modeledPension) * 12),
      annualPortfolioSpendingNeed: null,
      targetPortfolio: null,
      projectedPortfolioAtRetirement: null,
      projectedShortfall: null,
      requiredAdditionalMonthlyContribution: null,
      assumptionsVersion: assumptions.version,
      assumptions: assumptionsUsed,
      missingData,
    };
  }

  const desiredAnnualRetirementSpending = roundMoney(desiredMonthlySpending! * 12);
  const modeledAnnualGuaranteedIncome = roundMoney((modeledSocialSecurity + modeledPension) * 12);
  const annualPortfolioSpendingNeed = roundMoney(Math.max(0, desiredAnnualRetirementSpending - modeledAnnualGuaranteedIncome));
  const targetPortfolio = roundMoney(annualPortfolioSpendingNeed / assumptions.retirement.withdrawalRate);
  const years = yearsToRetirement!;
  const rate = assumptions.retirement.realAnnualReturn;
  const projectedAssets = currentRetirementAssets * Math.pow(1 + rate, years);
  const projectedContributions = futureValueOfAnnualContributions(currentAnnualContributions, rate, years);
  const projectedPortfolioAtRetirement = roundMoney(projectedAssets + projectedContributions);
  const projectedShortfall = roundMoney(Math.max(0, targetPortfolio - projectedPortfolioAtRetirement));

  let requiredAdditionalMonthlyContribution: number | null = 0;
  if (projectedShortfall > 0) {
    if (years <= 0) {
      requiredAdditionalMonthlyContribution = null;
      assumptionsUsed.push("Retirement is at or past the modeled retirement date, so a new monthly contribution pace cannot close the current shortfall in the projection window.");
    } else {
      const annualAnnuityFactor = rate === 0
        ? years
        : (Math.pow(1 + rate, years) - 1) / rate;
      requiredAdditionalMonthlyContribution = roundMoney(projectedShortfall / annualAnnuityFactor / 12);
    }
  }

  return {
    state: projectedShortfall > 0 ? "shortfall" : "on_track",
    asOfDate,
    yearsToRetirement: years,
    currentRetirementAssets,
    currentAnnualContributions,
    desiredAnnualRetirementSpending,
    modeledAnnualGuaranteedIncome,
    annualPortfolioSpendingNeed,
    targetPortfolio,
    projectedPortfolioAtRetirement,
    projectedShortfall,
    requiredAdditionalMonthlyContribution,
    assumptionsVersion: assumptions.version,
    assumptions: assumptionsUsed,
    missingData: [],
  };
}
