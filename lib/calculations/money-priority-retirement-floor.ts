import type { MoneyPrioritySnapshot } from "./money-priority-snapshot.ts";
import type { MoneyPriorityPolicy } from "./money-priority-policy.ts";
import type { MoneyPriorityPlanningAssumptions } from "./money-priority-planning-assumptions.ts";
import {
  projectRetirement,
  type RetirementProjectionResult,
} from "./money-priority-retirement-projection.ts";
import {
  evaluateRetirementAccountOpportunities,
  type RetirementAccountOpportunityResult,
} from "./money-priority-retirement-accounts.ts";
import {
  cloneRetirementCapacityLedger,
  consumeRetirementCapacity,
  createRetirementCapacityLedger,
  remainingRetirementCapacity,
  type RetirementCapacityLedger,
} from "./money-priority-retirement-capacity.ts";
import type { MoneyPriorityTaxPolicy } from "./money-priority-tax-policy.ts";

export type HybridRetirementStatus = "behind" | "on_track" | "ahead" | "more_information_needed";

export type HybridRetirementFloorResult = {
  status: HybridRetirementStatus;
  grossHouseholdIncomeAnnual: number | null;
  normalBaselineRate: number;
  currentRetirementSavingsRate: number | null;
  currentRetirementSavingsAnnual: number;
  reportedScheduledContributionAnnual: number;
  unsupportedScheduledContributionAnnual: number;
  unverifiedScheduledContributionAnnual: number;
  scheduledContributionReservedCurrentYear: number;
  remainingLegalCapacityAfterScheduledAnnual: number;
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
  directTakeHomeRetirementContributionAnnual: number;
  hsaEmployeeFundingSourceAssumption: "conservative_take_home" | "not_applicable";
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

type ScheduledReservation = {
  ledger: RetirementCapacityLedger;
  requestedAnnual: number;
  supportedAnnual: number;
  unsupportedAnnual: number;
  unverifiedAnnual: number;
  employeeWorkplaceAnnual: number;
  employerAnnual: number;
  iraAnnual: number;
  hsaEmployeeAnnual: number;
  hsaEmployerAnnual: number;
};

function reserveEmployerAnnualAdditions(
  ledger: RetirementCapacityLedger,
  accountId: string,
  requestedAnnual: number,
): number {
  const entry = ledger.entries.find((item) => item.accountId === accountId);
  if (!entry?.verified || requestedAnnual <= 0) return 0;
  if (entry.annualAdditionsRemainingRoom === null) return requestedAnnual;
  const supported = roundMoney(Math.min(requestedAnnual, entry.annualAdditionsRemainingRoom));
  entry.annualAdditionsRemainingRoom = roundMoney(
    Math.max(0, entry.annualAdditionsRemainingRoom - supported),
  );
  if (entry.remainingAnnualRoom !== null) {
    entry.remainingAnnualRoom = roundMoney(Math.min(
      entry.remainingAnnualRoom,
      entry.annualAdditionsRemainingRoom,
    ));
    entry.accountSpecificRemainingRoom = entry.remainingAnnualRoom;
  }
  return supported;
}

function reserveScheduledContributions(
  snapshot: MoneyPrioritySnapshot,
  ledger: RetirementCapacityLedger,
  modeledMonths: number,
): ScheduledReservation {
  const clone = cloneRetirementCapacityLedger(ledger);
  const result: ScheduledReservation = {
    ledger: clone,
    requestedAnnual: 0,
    supportedAnnual: 0,
    unsupportedAnnual: 0,
    unverifiedAnnual: 0,
    employeeWorkplaceAnnual: 0,
    employerAnnual: 0,
    iraAnnual: 0,
    hsaEmployeeAnnual: 0,
    hsaEmployerAnnual: 0,
  };

  for (const account of [...snapshot.retirementAccounts].sort((a, b) => a.id.localeCompare(b.id))) {
    const requestedEmployee = roundMoney(account.monthlyEmployeeContribution * modeledMonths);
    const requestedEmployer = roundMoney(account.monthlyEmployerContribution * modeledMonths);
    const requested = roundMoney(requestedEmployee + requestedEmployer);
    if (requested <= 0) continue;
    result.requestedAnnual = roundMoney(result.requestedAnnual + requested);
    const entry = clone.entries.find((item) => item.accountId === account.id);
    if (!entry?.verified) {
      result.unverifiedAnnual = roundMoney(result.unverifiedAnnual + requested);
      continue;
    }

    if (account.type === "hsa") {
      const supported = consumeRetirementCapacity(
        clone,
        account.id,
        "build",
        requested,
      ).consumedAnnualAmount;
      const supportedEmployer = Math.min(requestedEmployer, supported);
      const supportedEmployee = roundMoney(Math.max(0, supported - supportedEmployer));
      result.hsaEmployerAnnual = roundMoney(result.hsaEmployerAnnual + supportedEmployer);
      result.hsaEmployeeAnnual = roundMoney(result.hsaEmployeeAnnual + supportedEmployee);
      result.supportedAnnual = roundMoney(result.supportedAnnual + supported);
      result.unsupportedAnnual = roundMoney(result.unsupportedAnnual + requested - supported);
      continue;
    }

    if (account.type === "sep_ira") {
      const supported = consumeRetirementCapacity(
        clone,
        account.id,
        "build",
        requestedEmployer,
      ).consumedAnnualAmount;
      result.employerAnnual = roundMoney(result.employerAnnual + supported);
      result.supportedAnnual = roundMoney(result.supportedAnnual + supported);
      result.unsupportedAnnual = roundMoney(result.unsupportedAnnual + requested - supported);
      continue;
    }

    const supportedEmployer = reserveEmployerAnnualAdditions(
      clone,
      account.id,
      requestedEmployer,
    );
    const supportedEmployee = consumeRetirementCapacity(
      clone,
      account.id,
      "build",
      requestedEmployee,
    ).consumedAnnualAmount;
    result.employerAnnual = roundMoney(result.employerAnnual + supportedEmployer);
    if (IRA_TYPES.has(account.type)) {
      result.iraAnnual = roundMoney(result.iraAnnual + supportedEmployee);
    } else {
      result.employeeWorkplaceAnnual = roundMoney(
        result.employeeWorkplaceAnnual + supportedEmployee,
      );
    }
    const supported = roundMoney(supportedEmployer + supportedEmployee);
    result.supportedAnnual = roundMoney(result.supportedAnnual + supported);
    result.unsupportedAnnual = roundMoney(result.unsupportedAnnual + requested - supported);
  }
  return result;
}

function remainingContributionMonths(asOfDate: string, taxYear: number): number {
  const date = new Date(`${asOfDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== taxYear) return 12;
  return 12 - date.getUTCMonth();
}

function fullYearCapacitySnapshot(snapshot: MoneyPrioritySnapshot): MoneyPrioritySnapshot {
  return {
    ...snapshot,
    retirementAccounts: snapshot.retirementAccounts.map((account) => ({
      ...account,
      employeeContributedYtd: account.employeeContributedYtd === null ? null : 0,
      employerContributedYtd: account.employerContributedYtd === null ? null : 0,
    })),
  };
}

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
  taxPolicy: MoneyPriorityTaxPolicy,
): HybridRetirementFloorResult {
  const reportedEmployeeWorkplaceContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => account.type !== "hsa" && !IRA_TYPES.has(account.type))
    .reduce((sum, account) => sum + account.monthlyEmployeeContribution * 12, 0));
  const reportedEmployerContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => account.type !== "hsa")
    .reduce((sum, account) => sum + account.monthlyEmployerContribution * 12, 0));
  const reportedIraContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => IRA_TYPES.has(account.type))
    .reduce((sum, account) => sum + account.monthlyEmployeeContribution * 12, 0));
  const reportedHsaTotalContributionAnnual = roundMoney(snapshot.retirementAccounts
    .filter((account) => account.type === "hsa")
    .reduce((sum, account) => sum
      + (account.monthlyEmployeeContribution + account.monthlyEmployerContribution) * 12, 0));
  const fullYearSnapshot = fullYearCapacitySnapshot(snapshot);
  const fullYearOpportunities = evaluateRetirementAccountOpportunities(fullYearSnapshot, taxPolicy);
  const fullYearReservation = reserveScheduledContributions(
    fullYearSnapshot,
    createRetirementCapacityLedger(fullYearOpportunities),
    12,
  );
  const currentYearReservation = reserveScheduledContributions(
    snapshot,
    ledger,
    remainingContributionMonths(asOfDate, opportunities.taxYear),
  );
  const employeeWorkplaceContributionAnnual = fullYearReservation.employeeWorkplaceAnnual;
  const employerContributionAnnual = fullYearReservation.employerAnnual;
  const iraContributionAnnual = fullYearReservation.iraAnnual;
  const hsaTotalContributionAnnual = roundMoney(
    fullYearReservation.hsaEmployeeAnnual + fullYearReservation.hsaEmployerAnnual,
  );
  const reportedScheduledContributionAnnual = roundMoney(
    reportedEmployeeWorkplaceContributionAnnual
      + reportedEmployerContributionAnnual
      + reportedIraContributionAnnual
      + reportedHsaTotalContributionAnnual,
  );
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
  if (fullYearReservation.unverifiedAnnual > 0 || currentYearReservation.unverifiedAnnual > 0) {
    missingData.push("Verified account and shared-group contribution capacity is required before scheduled retirement contributions can be treated as sustainable.");
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
    : status === "ahead"
      ? 0
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
  const reportedDirectTakeHomeMonthly = roundMoney(snapshot.retirementAccounts
    .filter((account) => IRA_TYPES.has(account.type) || account.type === "hsa")
    .reduce((sum, account) => sum + account.monthlyEmployeeContribution, 0));
  const directTakeHomeRetirementContributionAnnual = roundMoney(
    fullYearReservation.iraAnnual + fullYearReservation.hsaEmployeeAnnual,
  );
  const incrementalCashAvailableAnnual = roundMoney(Math.max(
    0,
    snapshot.aggregates.monthlyCashFlowBeforeSavings - reportedDirectTakeHomeMonthly,
  ) * 12);
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
  const remainingLegalCapacityAfterScheduledAnnual = availableLegalCapacity(
    opportunities,
    currentYearReservation.ledger,
  );
  const additionalRetirementOpportunityAnnual = missingData.length || protectedFloorShortfallAnnual === null
    ? 0
    : roundMoney(Math.max(
        0,
        remainingLegalCapacityAfterScheduledAnnual - protectedFloorShortfallAnnual,
      ));

  const reasonCodes = [
    status === "behind" ? "projection_shortfall" : null,
    status === "on_track" ? "projection_on_track_normal_band" : null,
    status === "ahead" ? "durable_projection_surplus" : null,
    status === "more_information_needed" ? "material_retirement_floor_input_missing" : null,
    structurallyInfeasibleCorrectiveRate ? "corrective_rate_exceeds_protected_or_feasible_ceiling" : null,
    fullYearReservation.unsupportedAnnual > 0 ? "scheduled_pace_constrained_by_legal_capacity" : null,
    currentYearReservation.supportedAnnual > 0 ? "scheduled_contributions_reserve_current_year_room" : null,
    fullYearReservation.hsaEmployeeAnnual > 0 ? "hsa_employee_funding_source_conservatively_treated_as_take_home" : null,
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
    reportedScheduledContributionAnnual,
    unsupportedScheduledContributionAnnual: fullYearReservation.unsupportedAnnual,
    unverifiedScheduledContributionAnnual: roundMoney(Math.max(
      fullYearReservation.unverifiedAnnual,
      currentYearReservation.unverifiedAnnual,
    )),
    scheduledContributionReservedCurrentYear: currentYearReservation.supportedAnnual,
    remainingLegalCapacityAfterScheduledAnnual,
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
    directTakeHomeRetirementContributionAnnual,
    hsaEmployeeFundingSourceAssumption: fullYearReservation.hsaEmployeeAnnual > 0
      ? "conservative_take_home"
      : "not_applicable",
    structurallyInfeasibleCorrectiveRate,
    projection,
    state: missingData.length ? "more_information_needed" : "calculated",
    missingData: [...new Set(missingData)].sort(),
    reasonCodes,
    explanations,
  };
}
