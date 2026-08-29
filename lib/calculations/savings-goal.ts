export type SavingsGoalInput = {
  currentAmount: number;
  targetAmount: number;
  monthlyContribution: number;
  monthsUntilTarget?: number;
};

export type SavingsGoalProjection = {
  currentAmount: number;
  targetAmount: number;
  remainingAmount: number;
  progress: number | null;
  monthsToGoal: number | null;
  projectedAmountAtTarget: number | null;
  requiredMonthlyContribution: number | null;
};

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateSavingsGoal(input: SavingsGoalInput): SavingsGoalProjection {
  const currentAmount = safe(input.currentAmount);
  const targetAmount = safe(input.targetAmount);
  const monthlyContribution = safe(input.monthlyContribution);
  const monthsUntilTarget = input.monthsUntilTarget === undefined ? undefined : Math.floor(safe(input.monthsUntilTarget));
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const progress = targetAmount > 0 ? Math.min(1, currentAmount / targetAmount) : null;
  const monthsToGoal = remainingAmount === 0 ? 0 : monthlyContribution > 0 ? Math.ceil(remainingAmount / monthlyContribution) : null;
  const projectedAmountAtTarget = monthsUntilTarget === undefined ? null : currentAmount + (monthlyContribution * monthsUntilTarget);
  const requiredMonthlyContribution = monthsUntilTarget === undefined ? null : remainingAmount === 0 ? 0 : monthsUntilTarget > 0 ? remainingAmount / monthsUntilTarget : null;

  return {
    currentAmount,
    targetAmount,
    remainingAmount,
    progress,
    monthsToGoal,
    projectedAmountAtTarget,
    requiredMonthlyContribution,
  };
}
