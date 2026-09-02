import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import type { MoneyPriorityPolicy } from "./money-priority-policy.ts";
import type { MoneyPriorityPlanningAssumptions } from "./money-priority-planning-assumptions.ts";
import {
  projectRetirement,
  type RetirementProjectionResult,
} from "./money-priority-retirement-projection.ts";
import type { RetirementAccountOpportunityResult } from "./money-priority-retirement-accounts.ts";
import {
  cloneRetirementCapacityLedger,
  consumeRetirementCapacity,
  remainingRetirementCapacity,
  type RetirementCapacityLedger,
} from "./money-priority-retirement-capacity.ts";

export type HybridRetirementStatus = "behind" | "on_track" | "ahead" | "more_information_needed";

export type HybridRetirementFloorResult = {
  status: HybridRetirementStatus;
  grossHouseholdIncomeAnnual: number | null;
  normalBaselineRate: number;
  currentRetirementSavingsRate: number | null;
  currentRetirementSavingsAnnual: number;
  projectionAnnualContributionAssumption: number;
  employeeWorkplaceContributionAnnual: number;
  employerContributionAnnual: number;
  iraContributionAnnual: number;
  hsaTotalContributionAnnual: number;
  expectedHsaMedicalSpendingAnnual: number | null;
  longTermHsaContributionAnnual: number;
  hsaLongTermIntentKnown: boolean;
  projectionRequiredCorrectiveRate: number | null;
  targetProtectedFloorRate: number | null;
  protectedRetirementFloorRate: number | null;
  targetProtectedAnnualAmount: number | null;
  protectedAnnualAmount: number | null;
  protectedFloorShortfallAnnual: number | null;
  projectedPortfolioShortfall: number | null;
  additionalVerifiedLegalCapacityAnnual: number;
  additionalRetirementOpportunityAnnual: number;
  employerMatchProtectedAnnualAmount: number;
  employeeSavingGuardrailAnnualAmount: number | null;
  structurallyInfeasibleCorrectiveRate: boolean;
  projection: RetirementProjectionResult;
  state: "calculated" | "more_information_needed";
  missingData: string[];
  reasonCodes: string[];
  explanations: string[];
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const IRA_TYPES = new Set(["traditional_ira", "roth_ira"]);

function availableLegalCapacity(
  opportunities: RetirementAccountOpportunityResult,
  ledger: RetirementCapacityLedger,
): number {
  const clone = cloneRetirementCapacityLedger(ledger);
  let total = 0;
  for (const opportunity of [...opportunities.opportunities]
    .filter((item) => item.state === "available" && item.contributionSource !== "employer")
    .sort((a, b) => a.accountId.localeCompare(b.accountId))) {
    const room = remainingRetirementCapacity(clone, opportunity.accountId);
    if (room === null || room <= 0) continue;
    total = roundMoney(total + consumeRetirementCapacity(
      clone,
      opportunity.accountId,
      "build",
      room,
    ).consumedAnnualAmount);
  }
  return total;
}

export function evaluateHybridRetirementFloor(
  snapshot: MoneyPrioritySnapshot,
  asOfDate: string,
  policy: MoneyPriorityPolicy,
  assumptions: MoneyPriorityPlanningAssumptions,
  opportunities: RetirementAccountOpportunityResult,
  ledger: RetirementCapacityLedger,
): HybridRetirementFloorResult {
  const employeeWorkplaceContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => account.type !== "hsa" && !IRA_TYPES.has(account.type))
    .reduce((sum, account) => sum + account.monthlyEmployeeContribution * 12, 0));
  const employerContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => account.type !== "hsa")
    .reduce((sum, account) => sum + account.monthlyEmployerContribution * 12, 0));
  const iraContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => IRA_TYPES.has(account.type))
    .reduce((sum, account) => sum + account.monthlyEmployeeContribution * 12, 0));
  const hsaTotalContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => account.type === "hsa")
    .reduce((sum, account) => sum
      + (account.monthlyEmployeeContribution + account.monthlyEmployerContribution) * 12, 0));
  const expectedHsaMedicalSpendingAnnual = snapshot.preferences?.expectedHsaMedicalSpendingAnnual ?? null;
  const hsaLongTermIntentKnown = hsaTotalContributionAnnual === 0
    || expectedHsaMedicalSpendingAnnual !== null;
  const longTermHsaContributionAnnual = hsaLongTermIntentKnown
    ? roundMoney(Math.max(0, hsaTotalContributionAnnual - (expectedHsaMedicalSpendingAnnual ?? 0)))
    : 0;
  const currentRetirementSavingsAnnual = roundMoney(
    employeeWorkplaceContributionAnnual
      + employerContributionAnnual
      + iraContributionAnnual
      + longTermHsaContributionAnnual,
  );
  const nonHsaRetirementContributionsAnnual = roundMoney(
    employeeWorkplaceContributionAnnual + employerContributionAnnual + iraContributionAnnual,
  );
  const projectionAnnualContributionAssumption = hsaLongTermIntentKnown
    ? roundMoney(nonHsaRetirementContributionsAnnual
      + hsaTotalContributionAnnual - (expectedHsaMedicalSpendingAnnual ?? 0))
    : nonHsaRetirementContributionsAnnual;

  const grossKnown = !snapshot.aggregates.hasIncompleteGrossIncome
    && snapshot.aggregates.monthlyGrossIncomeKnown > 0;
  const grossHouseholdIncomeAnnual = grossKnown
    ? roundMoney(snapshot.aggregates.monthlyGrossIncomeKnown * 12)
    : null;
  const currentRetirementSavingsRate = grossHouseholdIncomeAnnual === null
    ? null
    : currentRetirementSavingsAnnual / grossHouseholdIncomeAnnual;
  const projection = projectRetirement(
    snapshot,
    asOfDate,
    assumptions,
    projectionAnnualContributionAssumption,
  );
  const missingData = [...projection.missingData];
  if (!grossKnown) missingData.push("Complete positive gross household income is required to calculate the retirement floor rate.");
  if (!hsaLongTermIntentKnown) {
    missingData.push("Expected annual current HSA medical spending is required before HSA contributions can be counted as long-term retirement saving.");
  }

  const normalRate = policy.hybridRetirementFloor.normalRate;
  const projectedSurplus = projection.targetPortfolio !== null && projection.projectedPortfolioAtRetirement !== null
    ? roundMoney(Math.max(0, projection.projectedPortfolioAtRetirement - projection.targetPortfolio))
    : 0;
  const aheadThreshold = projection.targetPortfolio === null
    ? Number.POSITIVE_INFINITY
    : Math.max(
        policy.hybridRetirementFloor.aheadMinimumSurplusAmount,
        projection.targetPortfolio * policy.hybridRetirementFloor.aheadMinimumSurplusRatio,
      );
  const durablyAhead = projection.state === "on_track"
    && (projection.yearsToRetirement ?? 0) >= policy.hybridRetirementFloor.aheadMinimumYearsToRetirement
    && projectedSurplus >= aheadThreshold;

  let status: HybridRetirementStatus;
  if (missingData.length) status = "more_information_needed";
  else if (projection.state === "shortfall") status = "behind";
  else if (durablyAhead) status = "ahead";
  else status = "on_track";

  const projectionRequiredCorrectiveRate = grossHouseholdIncomeAnnual !== null
    && projection.state === "shortfall"
    && projection.requiredAdditionalMonthlyContribution !== null
    ? (currentRetirementSavingsAnnual + projection.requiredAdditionalMonthlyContribution * 12)
      / grossHouseholdIncomeAnnual
    : null;
  const baseTargetRate = status === "ahead"
    ? policy.hybridRetirementFloor.aheadRate
    : status === "behind" && projectionRequiredCorrectiveRate !== null
      ? Math.max(normalRate, projectionRequiredCorrectiveRate)
      : normalRate;
  const cappedTargetRate = status === "behind"
    ? Math.min(baseTargetRate, policy.hybridRetirementFloor.maximumProtectedCorrectiveRate)
    : baseTargetRate;
  const employeeSavingGuardrailAnnualAmount = grossHouseholdIncomeAnnual === null
    ? null
    : roundMoney(grossHouseholdIncomeAnnual * policy.hybridRetirementFloor.employeeGuardrailRate);
  const employerMatchProtectedAnnualAmount = roundMoney(snapshot.retirementAccounts.reduce(
    (sum, account) => account.matchStatus === "not_offered"
      ? sum
      : sum
        + Math.max(0, account.fullMatchEmployeeContributionMonthly ?? 0) * 12
        + Math.max(0, account.monthlyEmployerContribution) * 12,
    0,
  ));
  const targetProtectedAnnualAmount = grossHouseholdIncomeAnnual === null
    ? null
    : roundMoney(Math.max(
        grossHouseholdIncomeAnnual * cappedTargetRate,
        employerContributionAnnual + (employeeSavingGuardrailAnnualAmount ?? 0),
        employerMatchProtectedAnnualAmount,
      ));
  const targetProtectedFloorRate = targetProtectedAnnualAmount === null || grossHouseholdIncomeAnnual === null
    ? null
    : targetProtectedAnnualAmount / grossHouseholdIncomeAnnual;
  const incrementalCashAvailableAnnual = roundMoney(
    Math.max(0, snapshot.aggregates.monthlyCashFlowBeforeSavings) * 12,
  );
  const feasibleAnnualCeiling = roundMoney(currentRetirementSavingsAnnual + incrementalCashAvailableAnnual);
  const protectedAnnualAmount = targetProtectedAnnualAmount === null
    ? null
    : roundMoney(Math.min(targetProtectedAnnualAmount, feasibleAnnualCeiling));
  const protectedRetirementFloorRate = protectedAnnualAmount === null || grossHouseholdIncomeAnnual === null
    ? null
    : protectedAnnualAmount / grossHouseholdIncomeAnnual;
  const protectedFloorShortfallAnnual = protectedAnnualAmount === null
    ? null
    : roundMoney(Math.max(0, protectedAnnualAmount - currentRetirementSavingsAnnual));
  const structurallyInfeasibleCorrectiveRate = projectionRequiredCorrectiveRate !== null
    && (projectionRequiredCorrectiveRate > policy.hybridRetirementFloor.maximumProtectedCorrectiveRate
      || (grossHouseholdIncomeAnnual !== null
        && projectionRequiredCorrectiveRate * grossHouseholdIncomeAnnual > feasibleAnnualCeiling));
  const additionalVerifiedLegalCapacityAnnual = availableLegalCapacity(opportunities, ledger);
  const additionalRetirementOpportunityAnnual = missingData.length || protectedFloorShortfallAnnual === null
    ? 0
    : roundMoney(Math.max(
        0,
        additionalVerifiedLegalCapacityAnnual - protectedFloorShortfallAnnual,
      ));

  const reasonCodes = [
    status === "behind" ? "projection_shortfall" : null,
    status === "on_track" ? "projection_on_track_normal_band" : null,
    status === "ahead" ? "durable_projection_surplus" : null,
    status === "more_information_needed" ? "material_retirement_floor_input_missing" : null,
    structurallyInfeasibleCorrectiveRate ? "corrective_rate_exceeds_protected_or_feasible_ceiling" : null,
    employerMatchProtectedAnnualAmount > 0 ? "employer_match_protected" : null,
    additionalRetirementOpportunityAnnual > 0 ? "legal_opportunity_above_floor" : null,
  ].filter((value): value is string => Boolean(value));
  const explanations = [
    `The normal protected retirement baseline is ${(normalRate * 100).toFixed(1)}% of known gross household income.`,
    status === "ahead"
      ? `AHEAD requires at least ${policy.hybridRetirementFloor.aheadMinimumYearsToRetirement} years to retirement and a projected surplus of at least the greater of $${policy.hybridRetirementFloor.aheadMinimumSurplusAmount.toFixed(2)} or ${(policy.hybridRetirementFloor.aheadMinimumSurplusRatio * 100).toFixed(0)}% of the target portfolio.`
      : "A small projection surplus does not reduce the normal protected baseline.",
    "Legal contribution capacity is calculated separately and cannot be enlarged by this policy floor.",
  ];

  return {
    status,
    grossHouseholdIncomeAnnual,
    normalBaselineRate: normalRate,
    currentRetirementSavingsRate,
    currentRetirementSavingsAnnual,
    projectionAnnualContributionAssumption,
    employeeWorkplaceContributionAnnual,
    employerContributionAnnual,
    iraContributionAnnual,
    hsaTotalContributionAnnual,
    expectedHsaMedicalSpendingAnnual,
    longTermHsaContributionAnnual,
    hsaLongTermIntentKnown,
    projectionRequiredCorrectiveRate,
    targetProtectedFloorRate,
    protectedRetirementFloorRate,
    targetProtectedAnnualAmount,
    protectedAnnualAmount,
    protectedFloorShortfallAnnual,
    projectedPortfolioShortfall: projection.projectedShortfall,
    additionalVerifiedLegalCapacityAnnual,
    additionalRetirementOpportunityAnnual,
    employerMatchProtectedAnnualAmount,
    employeeSavingGuardrailAnnualAmount,
    structurallyInfeasibleCorrectiveRate,
    projection,
    state: missingData.length ? "more_information_needed" : "calculated",
    missingData: [...new Set(missingData)].sort(),
    reasonCodes,
    explanations,
  };
}
