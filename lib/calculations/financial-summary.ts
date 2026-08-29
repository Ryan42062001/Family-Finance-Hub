export type FinancialSummaryInput = {
  accountBalances: number[];
  retirementBalances: number[];
  debtBalances: number[];
  monthlyIncome: number[];
  monthlyExpenses: number[];
  monthlyDebtPayments: number[];
  monthlyEmployeeRetirement: number[];
  monthlyEmployerRetirement: number[];
};

export type FinancialSummary = {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtPayments: number;
  monthlyCashFlow: number;
  monthlyRetirementContributions: number;
  savingsRate: number | null;
};

const total = (values: number[]) => values.reduce((sum, value) => sum + Number(value || 0), 0);

export function calculateFinancialSummary(input: FinancialSummaryInput): FinancialSummary {
  const accountAssets = total(input.accountBalances);
  const retirementAssets = total(input.retirementBalances);
  const debt = total(input.debtBalances);
  const income = total(input.monthlyIncome);
  const expenses = total(input.monthlyExpenses);
  const debtPayments = total(input.monthlyDebtPayments);
  const employeeRetirement = total(input.monthlyEmployeeRetirement);
  const employerRetirement = total(input.monthlyEmployerRetirement);
  const retirementContributions = employeeRetirement + employerRetirement;
  const cashFlow = income - expenses - debtPayments - employeeRetirement;
  const savingsRate = income > 0 ? (Math.max(0, cashFlow) + employeeRetirement) / income : null;

  return {
    netWorth: accountAssets + retirementAssets - debt,
    monthlyIncome: income,
    monthlyExpenses: expenses,
    monthlyDebtPayments: debtPayments,
    monthlyCashFlow: cashFlow,
    monthlyRetirementContributions: retirementContributions,
    savingsRate,
  };
}
