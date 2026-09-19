import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "./money-priority-engine.ts";
import { MONEY_PRIORITY_POLICY_V1, type MoneyPriorityPolicy } from "./money-priority-policy.ts";
import type { MoneyPriorityRawSnapshot } from "./money-priority-snapshot.ts";
import { moneyPrioritySnapshotToRaw } from "./money-priority-raw-adapter.ts";

export type HypotheticalCashUse = { amount: number; relatedGoalId?: string | null };
export type HypotheticalDebt = { id: string; name: string; type: string; balance: number; annualInterestRate: number | null; minimumPayment: number; rateType?: string };
export type HypotheticalExpense = { id: string; name: string; category: string; monthlyAmount: number; isEssential: boolean; cashFlowTreatment: "required" | "discretionary" };
export type HypotheticalEngineChanges = { cashUse?: HypotheticalCashUse | null; cashInflow?: number; addDebts?: HypotheticalDebt[]; addExpenses?: HypotheticalExpense[]; completeGoalIds?: string[] };
export type HypotheticalEngineResult = { engine: MoneyPriorityEngineResult; cashUsed: number; cashInflowAdded: number; completedGoalIds: string[] };

function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
function finite(value: number): boolean { return Number.isFinite(value); }

function consumeCash(raw: MoneyPriorityRawSnapshot, amount: number, relatedGoalId: string | null): number {
  const accounts = raw.accounts ?? [];
  let remaining = roundMoney(Math.max(0, amount));
  const candidates = [...accounts]
    .filter((account) => Number(account.balance ?? 0) > 0)
    .filter((account) => account.cash_purpose === "unallocated"
      || (relatedGoalId !== null && account.cash_purpose === "earmarked_goal" && account.related_goal_id === relatedGoalId))
    .sort((a, b) => {
      const aRelated = a.cash_purpose === "earmarked_goal" ? 0 : 1;
      const bRelated = b.cash_purpose === "earmarked_goal" ? 0 : 1;
      if (aRelated !== bRelated) return aRelated - bRelated;
      return String(a.id).localeCompare(String(b.id));
    });
  for (const account of candidates) {
    if (remaining <= 0) break;
    const balance = roundMoney(Number(account.balance ?? 0));
    const used = Math.min(balance, remaining);
    account.balance = roundMoney(balance - used);
    remaining = roundMoney(remaining - used);
  }
  return roundMoney(amount - remaining);
}

export function runHypotheticalMoneyPriorityEngine(
  current: MoneyPriorityEngineResult,
  changes: HypotheticalEngineChanges,
  policy: MoneyPriorityPolicy = MONEY_PRIORITY_POLICY_V1,
): HypotheticalEngineResult {
  if (policy.version !== current.policyVersion) throw new Error(`Hypothetical rerun policy ${policy.version} does not match current engine policy ${current.policyVersion}.`);
  const raw = moneyPrioritySnapshotToRaw(current.snapshot);
  const completedGoalIds = [...new Set(changes.completeGoalIds ?? [])].sort();
  const goalSet = new Set(completedGoalIds);
  for (const goal of raw.goals ?? []) if (goalSet.has(String(goal.id))) goal.current_amount = Number(goal.target_amount ?? 0);

  const cashInflow = changes.cashInflow ?? 0;
  if (!finite(cashInflow) || cashInflow < 0) throw new Error("Hypothetical cash inflow must be a finite nonnegative amount.");
  if (cashInflow > 0) (raw.accounts ??= []).push({ id: "hypothetical-cash-inflow", name: "Hypothetical cash inflow", account_type: "checking", balance: roundMoney(cashInflow), cash_purpose: "unallocated" });

  let cashUsed = 0;
  if (changes.cashUse) {
    if (!finite(changes.cashUse.amount) || changes.cashUse.amount < 0) throw new Error("Hypothetical cash use must be a finite nonnegative amount.");
    cashUsed = consumeCash(raw, changes.cashUse.amount, changes.cashUse.relatedGoalId ?? null);
    if (cashUsed !== roundMoney(changes.cashUse.amount)) throw new Error("Hypothetical cash use exceeds eligible unallocated and related-goal cash.");
  }

  for (const debt of changes.addDebts ?? []) {
    if (!finite(debt.balance) || debt.balance < 0 || !finite(debt.minimumPayment) || debt.minimumPayment < 0) throw new Error("Hypothetical debt balance and minimum payment must be finite nonnegative amounts.");
    if (debt.annualInterestRate !== null && (!finite(debt.annualInterestRate) || debt.annualInterestRate < 0)) throw new Error("Hypothetical debt APR must be null or a finite nonnegative percentage.");
    (raw.debts ??= []).push({ id: debt.id, name: debt.name, debt_type: debt.type, current_balance: roundMoney(debt.balance), interest_rate: debt.annualInterestRate, minimum_payment: roundMoney(debt.minimumPayment), rate_type: debt.rateType ?? "fixed", is_past_due: false, is_in_collections: false, has_legal_or_tax_priority: false });
  }

  for (const expense of changes.addExpenses ?? []) {
    if (!finite(expense.monthlyAmount)) throw new Error("Hypothetical expense amount must be finite.");
    (raw.expenses ??= []).push({ id: expense.id, name: expense.name, category: expense.category, monthly_amount: roundMoney(expense.monthlyAmount), is_essential: expense.isEssential, cash_flow_treatment: expense.cashFlowTreatment });
  }

  return {
    engine: runMoneyPriorityEngine(raw, current.asOfDate, policy, { allowSignedHypotheticalExpenseAdjustments: true }),
    cashUsed,
    cashInflowAdded: roundMoney(cashInflow),
    completedGoalIds,
  };
}
