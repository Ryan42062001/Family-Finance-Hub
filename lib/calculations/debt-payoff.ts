export type DebtInput = {
  id: string;
  name: string;
  balance: number;
  annualInterestRate: number;
  minimumPayment: number;
};

export type DebtPayoffResult = {
  months: number | null;
  totalInterest: number | null;
  totalPaid: number | null;
  payoffPossible: boolean;
};

export type DebtStrategy = "avalanche" | "snowball";

export type DebtStrategyResult = {
  strategy: DebtStrategy;
  months: number | null;
  totalInterest: number | null;
  payoffPossible: boolean;
  payoffOrder: string[];
};

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function projectDebtPayoff(input: Omit<DebtInput, "id" | "name"> & { extraMonthlyPayment?: number }): DebtPayoffResult {
  const balanceStart = safe(input.balance);
  const rate = safe(input.annualInterestRate) / 100 / 12;
  const payment = safe(input.minimumPayment) + safe(input.extraMonthlyPayment ?? 0);

  if (balanceStart === 0) return { months: 0, totalInterest: 0, totalPaid: 0, payoffPossible: true };
  if (payment === 0 || (rate > 0 && payment <= balanceStart * rate)) {
    return { months: null, totalInterest: null, totalPaid: null, payoffPossible: false };
  }

  let balance = balanceStart;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  const maxMonths = 1200;

  while (balance > 0.005 && months < maxMonths) {
    const interest = balance * rate;
    const actualPayment = Math.min(payment, balance + interest);
    balance = Math.max(0, balance + interest - actualPayment);
    totalInterest += interest;
    totalPaid += actualPayment;
    months += 1;
  }

  if (balance > 0.005) return { months: null, totalInterest: null, totalPaid: null, payoffPossible: false };
  return { months, totalInterest, totalPaid, payoffPossible: true };
}

export function compareDebtExtraPayment(input: Omit<DebtInput, "id" | "name"> & { extraMonthlyPayment: number }) {
  const baseline = projectDebtPayoff({ ...input, extraMonthlyPayment: 0 });
  const accelerated = projectDebtPayoff(input);
  return {
    baseline,
    accelerated,
    monthsSaved: baseline.months !== null && accelerated.months !== null ? Math.max(0, baseline.months - accelerated.months) : null,
    interestSaved: baseline.totalInterest !== null && accelerated.totalInterest !== null ? Math.max(0, baseline.totalInterest - accelerated.totalInterest) : null,
  };
}

export function projectDebtStrategy(debts: DebtInput[], extraMonthlyPayment: number, strategy: DebtStrategy): DebtStrategyResult {
  const normalized = debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: safe(debt.balance),
    annualInterestRate: safe(debt.annualInterestRate),
    minimumPayment: safe(debt.minimumPayment),
  })).filter((debt) => debt.balance > 0);

  if (normalized.length === 0) return { strategy, months: 0, totalInterest: 0, payoffPossible: true, payoffOrder: [] };

  for (const debt of normalized) {
    const firstMonthInterest = debt.balance * (debt.annualInterestRate / 100 / 12);
    if (debt.minimumPayment === 0 || (debt.annualInterestRate > 0 && debt.minimumPayment <= firstMonthInterest)) {
      return { strategy, months: null, totalInterest: null, payoffPossible: false, payoffOrder: [] };
    }
  }

  const debtsState = normalized.map((debt) => ({ ...debt }));
  const monthlyBudget = debtsState.reduce((sum, debt) => sum + debt.minimumPayment, 0) + safe(extraMonthlyPayment);
  let totalInterest = 0;
  let months = 0;
  const payoffOrder: string[] = [];
  const maxMonths = 1200;

  while (debtsState.some((debt) => debt.balance > 0.005) && months < maxMonths) {
    const active = debtsState.filter((debt) => debt.balance > 0.005);
    const target = [...active].sort((a, b) => {
      if (strategy === "avalanche") return b.annualInterestRate - a.annualInterestRate || a.balance - b.balance;
      return a.balance - b.balance || b.annualInterestRate - a.annualInterestRate;
    })[0];

    const interestById = new Map<string, number>();
    for (const debt of active) {
      const interest = debt.balance * (debt.annualInterestRate / 100 / 12);
      interestById.set(debt.id, interest);
      totalInterest += interest;
    }

    let remainingBudget = monthlyBudget;
    for (const debt of active) {
      const interest = interestById.get(debt.id) ?? 0;
      const due = debt.balance + interest;
      const payment = Math.min(debt.minimumPayment, due, remainingBudget);
      debt.balance = Math.max(0, due - payment);
      remainingBudget -= payment;
    }

    const targetDebt = debtsState.find((debt) => debt.id === target.id);
    if (targetDebt && targetDebt.balance > 0.005 && remainingBudget > 0) {
      const payment = Math.min(remainingBudget, targetDebt.balance);
      targetDebt.balance -= payment;
      remainingBudget -= payment;
    }

    for (const debt of debtsState) {
      if (debt.balance <= 0.005 && !payoffOrder.includes(debt.name)) payoffOrder.push(debt.name);
    }

    months += 1;
  }

  if (debtsState.some((debt) => debt.balance > 0.005)) {
    return { strategy, months: null, totalInterest: null, payoffPossible: false, payoffOrder };
  }

  return { strategy, months, totalInterest, payoffPossible: true, payoffOrder };
}
