export type EmergencyFundInput = {
  currentSavings: number;
  monthlyEssentialExpenses: number;
  targetMonths: number;
  monthlyContribution?: number;
};

export type EmergencyFundResult = {
  targetAmount: number;
  currentSavings: number;
  fundingGap: number;
  coverageMonths: number | null;
  progress: number | null;
  monthsToGoal: number | null;
};

const safeNumber = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateEmergencyFund(input: EmergencyFundInput): EmergencyFundResult {
  const currentSavings = safeNumber(input.currentSavings);
  const monthlyEssentialExpenses = safeNumber(input.monthlyEssentialExpenses);
  const targetMonths = safeNumber(input.targetMonths);
  const monthlyContribution = safeNumber(input.monthlyContribution ?? 0);

  const targetAmount = monthlyEssentialExpenses * targetMonths;
  const fundingGap = Math.max(0, targetAmount - currentSavings);
  const coverageMonths = monthlyEssentialExpenses > 0 ? currentSavings / monthlyEssentialExpenses : null;
  const progress = targetAmount > 0 ? Math.min(1, currentSavings / targetAmount) : null;
  const monthsToGoal = fundingGap === 0
    ? 0
    : monthlyContribution > 0
      ? Math.ceil(fundingGap / monthlyContribution)
      : null;

  return {
    targetAmount,
    currentSavings,
    fundingGap,
    coverageMonths,
    progress,
    monthsToGoal,
  };
}
