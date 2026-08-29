export type MortgageProjectionInput = {
  principal: number;
  annualInterestRate: number;
  monthlyPayment: number;
  extraMonthlyPayment?: number;
};

export type MortgageProjection = {
  months: number | null;
  totalInterest: number | null;
  totalPaid: number | null;
  payoffPossible: boolean;
};

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function projectMortgagePayoff(input: MortgageProjectionInput): MortgageProjection {
  const principal = safe(input.principal);
  const annualInterestRate = safe(input.annualInterestRate);
  const monthlyPayment = safe(input.monthlyPayment) + safe(input.extraMonthlyPayment ?? 0);

  if (principal === 0) return { months: 0, totalInterest: 0, totalPaid: 0, payoffPossible: true };
  if (monthlyPayment === 0) return { months: null, totalInterest: null, totalPaid: null, payoffPossible: false };

  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate > 0 && monthlyPayment <= principal * monthlyRate) {
    return { months: null, totalInterest: null, totalPaid: null, payoffPossible: false };
  }

  let balance = principal;
  let interestPaid = 0;
  let totalPaid = 0;
  let months = 0;
  const maxMonths = 1200;

  while (balance > 0.005 && months < maxMonths) {
    const interest = balance * monthlyRate;
    const payment = Math.min(monthlyPayment, balance + interest);
    balance = Math.max(0, balance + interest - payment);
    interestPaid += interest;
    totalPaid += payment;
    months += 1;
  }

  if (balance > 0.005) return { months: null, totalInterest: null, totalPaid: null, payoffPossible: false };

  return {
    months,
    totalInterest: interestPaid,
    totalPaid,
    payoffPossible: true,
  };
}

export function compareMortgageExtraPayment(input: MortgageProjectionInput) {
  const baseline = projectMortgagePayoff({ ...input, extraMonthlyPayment: 0 });
  const accelerated = projectMortgagePayoff(input);

  return {
    baseline,
    accelerated,
    monthsSaved: baseline.months !== null && accelerated.months !== null ? Math.max(0, baseline.months - accelerated.months) : null,
    interestSaved: baseline.totalInterest !== null && accelerated.totalInterest !== null ? Math.max(0, baseline.totalInterest - accelerated.totalInterest) : null,
  };
}
