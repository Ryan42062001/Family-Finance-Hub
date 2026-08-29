export type RetirementContributionPacingInput = {
  annualTarget: number;
  contributedYearToDate: number;
  remainingPayPeriods: number;
  currentContributionPerPayPeriod?: number;
};

export type RetirementContributionPacingResult = {
  annualTarget: number;
  contributedYearToDate: number;
  remainingAmount: number;
  requiredPerPayPeriod: number | null;
  projectedYearEndContribution: number;
  projectedShortfall: number;
  projectedExcess: number;
  targetReached: boolean;
};

const safeNumber = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateRetirementContributionPacing(
  input: RetirementContributionPacingInput,
): RetirementContributionPacingResult {
  const annualTarget = safeNumber(input.annualTarget);
  const contributedYearToDate = safeNumber(input.contributedYearToDate);
  const remainingPayPeriods = Math.floor(safeNumber(input.remainingPayPeriods));
  const currentContributionPerPayPeriod = safeNumber(input.currentContributionPerPayPeriod ?? 0);

  const remainingAmount = Math.max(0, annualTarget - contributedYearToDate);
  const requiredPerPayPeriod = remainingAmount === 0
    ? 0
    : remainingPayPeriods > 0
      ? remainingAmount / remainingPayPeriods
      : null;
  const projectedYearEndContribution = contributedYearToDate + (currentContributionPerPayPeriod * remainingPayPeriods);
  const projectedShortfall = Math.max(0, annualTarget - projectedYearEndContribution);
  const projectedExcess = Math.max(0, projectedYearEndContribution - annualTarget);

  return {
    annualTarget,
    contributedYearToDate,
    remainingAmount,
    requiredPerPayPeriod,
    projectedYearEndContribution,
    projectedShortfall,
    projectedExcess,
    targetReached: contributedYearToDate >= annualTarget,
  };
}
