export type PaycheckPlannerInput = {
  takeHomePay: number;
  essentialExpenses: number;
  debtMinimums: number;
  retirementContributions: number;
  emergencySavings: number;
  extraDebtPayment: number;
  goalSavings: number;
  discretionarySpending: number;
};

export type PaycheckPlannerResult = {
  takeHomePay: number;
  committedAmount: number;
  remainingAmount: number;
  allocationRate: number | null;
  overAllocatedBy: number;
  isOverAllocated: boolean;
  annualTakeHome: number;
  annualCommitted: number;
  annualRemaining: number;
};

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculatePaycheckPlan(input: PaycheckPlannerInput, paychecksPerYear = 26): PaycheckPlannerResult {
  const takeHomePay = safe(input.takeHomePay);
  const committedAmount = [
    input.essentialExpenses,
    input.debtMinimums,
    input.retirementContributions,
    input.emergencySavings,
    input.extraDebtPayment,
    input.goalSavings,
    input.discretionarySpending,
  ].reduce((sum, value) => sum + safe(value), 0);

  const remainingAmount = Math.max(0, takeHomePay - committedAmount);
  const overAllocatedBy = Math.max(0, committedAmount - takeHomePay);
  const allocationRate = takeHomePay > 0 ? committedAmount / takeHomePay : null;
  const annualFrequency = Math.max(0, Math.floor(safe(paychecksPerYear)));

  return {
    takeHomePay,
    committedAmount,
    remainingAmount,
    allocationRate,
    overAllocatedBy,
    isOverAllocated: overAllocatedBy > 0,
    annualTakeHome: takeHomePay * annualFrequency,
    annualCommitted: committedAmount * annualFrequency,
    annualRemaining: (takeHomePay - committedAmount) * annualFrequency,
  };
}

export function monthlyAmountToPerPaycheck(monthlyAmount: number, paychecksPerYear: number): number {
  const frequency = Math.max(0, Math.floor(safe(paychecksPerYear)));
  if (frequency === 0) return 0;
  return safe(monthlyAmount) * 12 / frequency;
}
