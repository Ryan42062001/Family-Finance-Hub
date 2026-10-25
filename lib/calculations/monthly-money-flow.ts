/**
 * Presentation-only monthly money-flow breakdown.
 * All amounts are reconciled in integer cents to the authoritative
 * dashboard financial summary; this module never changes financial policy.
 */
export type FlowExpense = { category: string; monthlyAmount: number; isEssential: boolean };
export type FlowInput = {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyDebtMinimums: number;
  monthlyEmployeeRetirement: number;
  monthlyCashFlow: number;
  hasActiveIncome: boolean;
  hasRecordedExpenses: boolean;
  expenses: readonly FlowExpense[];
};
export type FlowBranch = {
  id: "essential" | "discretionary" | "debt" | "retirement" | "remaining";
  label: string;
  cents: number;
  categories: readonly { label: string; cents: number }[];
};
export type MoneyFlow = {
  status: "ready" | "incomplete" | "unavailable";
  reason: string | null;
  incomeCents: number;
  shortfallCents: number;
  remainingCents: number;
  commitmentsCents: number;
  totalCents: number;
  branches: readonly FlowBranch[];
};
const cents = (amount: number): number =>
  Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
const valid = (values: readonly number[]) => values.every(v => Number.isSafeInteger(v) && v >= 0);
const branch = (id: FlowBranch["id"], label: string, amount: number, categories: FlowBranch["categories"] = []): FlowBranch =>
  ({ id, label, cents: amount, categories });

export function buildMonthlyMoneyFlow(input: FlowInput): MoneyFlow {
  const unavailable = (status: "incomplete" | "unavailable", reason: string): MoneyFlow => ({
    status, reason, incomeCents: 0, shortfallCents: 0, remainingCents: 0,
    commitmentsCents: 0, totalCents: 0, branches: [],
  });
  if (!input.hasActiveIncome || !input.hasRecordedExpenses) {
    return unavailable("incomplete", "Add an active income source and recurring expenses to view your household money flow. Empty data is not treated as a complete budget.");
  }
  const income = cents(input.monthlyIncome);
  const expenseTotal = cents(input.monthlyExpenses);
  const debt = cents(input.monthlyDebtMinimums);
  const retirement = cents(input.monthlyEmployeeRetirement);
  const cashFlow = Math.round(input.monthlyCashFlow * 100);
  const itemAmounts = input.expenses.map(e => cents(e.monthlyAmount));
  if (!valid([income, expenseTotal, debt, retirement, ...itemAmounts]) || !Number.isSafeInteger(cashFlow)) {
    return unavailable("unavailable", "The money-flow breakdown contains an invalid amount. Review saved household entries.");
  }
  const expenseByType = new Map<string, number>();
  input.expenses.forEach((expense, index) => {
    const name = expense.category.trim() || "Uncategorized";
    const key = (expense.isEssential ? "essential:" : "discretionary:") + name;
    expenseByType.set(key, (expenseByType.get(key) ?? 0) + itemAmounts[index]);
  });
  // Small floating-point rounding drift may leave a one-cent difference;
  // larger differences fail closed rather than inventing a branch.
  const sumExpenseItems = itemAmounts.reduce((sum, value) => sum + value, 0);
  const difference = expenseTotal - sumExpenseItems;
  if (Math.abs(difference) > 1 || (difference !== 0 && expenseByType.size === 0)) {
    return unavailable("unavailable", "Expense records do not reconcile to the saved monthly expense total.");
  }
  if (difference !== 0) {
    const largest = [...expenseByType.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))[0];
    if (!largest || largest[1] + difference < 0) return unavailable("unavailable", "Expense records cannot be reconciled.");
    expenseByType.set(largest[0], largest[1] + difference);
  }
  const group = (prefix: string) =>
    [...expenseByType.entries()]
      .filter(([key]) => key.startsWith(prefix + ":"))
      .map(([key, amount]) => ({ label: key.slice(prefix.length + 1).replaceAll("_", " "), cents: amount }))
      .sort((a,b)=>b.cents-a.cents || a.label.localeCompare(b.label));
  const essentialCategories = group("essential");
  const discretionaryCategories = group("discretionary");
  const essential = essentialCategories.reduce((sum,row)=>sum+row.cents,0);
  const discretionary = discretionaryCategories.reduce((sum,row)=>sum+row.cents,0);
  const commitments = essential + discretionary + debt + retirement;
  const remaining = Math.max(0, income - commitments);
  const shortfall = Math.max(0, commitments - income);
  if (essential + discretionary !== expenseTotal ||
      income - commitments !== cashFlow ||
      commitments + remaining !== income + shortfall) {
    return unavailable("unavailable", "Recorded monthly flows do not reconcile to the authoritative household cash-flow calculation.");
  }
  return {
    status: "ready", reason: null,
    incomeCents: income, shortfallCents: shortfall, remainingCents: remaining,
    commitmentsCents: commitments, totalCents: income + shortfall,
    branches: [
      branch("essential", "Essential expenses", essential, essentialCategories),
      branch("discretionary", "Discretionary expenses", discretionary, discretionaryCategories),
      branch("debt", "Debt minimums", debt),
      branch("retirement", "Employee retirement contributions", retirement),
      branch("remaining", "Remaining monthly cash flow", remaining),
    ],
  };
}
