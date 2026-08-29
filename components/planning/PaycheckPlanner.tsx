"use client";

import { useMemo, useState } from "react";
import { calculatePaycheckPlan, monthlyAmountToPerPaycheck } from "@/lib/calculations/paycheck-planner";

type Defaults = {
  monthlyIncome: number;
  monthlyEssentialExpenses: number;
  monthlyDebtMinimums: number;
  monthlyRetirement: number;
};

type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

const PAYCHECKS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(value);

export default function PaycheckPlanner({ defaults }: { defaults: Defaults }) {
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("biweekly");
  const paychecksPerYear = PAYCHECKS_PER_YEAR[payFrequency];

  const convertedDefaults = useMemo(() => ({
    takeHomePay: monthlyAmountToPerPaycheck(defaults.monthlyIncome, paychecksPerYear),
    essentialExpenses: monthlyAmountToPerPaycheck(defaults.monthlyEssentialExpenses, paychecksPerYear),
    debtMinimums: monthlyAmountToPerPaycheck(defaults.monthlyDebtMinimums, paychecksPerYear),
    retirementContributions: monthlyAmountToPerPaycheck(defaults.monthlyRetirement, paychecksPerYear),
  }), [defaults, paychecksPerYear]);

  const [takeHomePayOverride, setTakeHomePayOverride] = useState<number | null>(null);
  const [essentialExpensesOverride, setEssentialExpensesOverride] = useState<number | null>(null);
  const [debtMinimumsOverride, setDebtMinimumsOverride] = useState<number | null>(null);
  const [retirementOverride, setRetirementOverride] = useState<number | null>(null);
  const [emergencySavings, setEmergencySavings] = useState(0);
  const [extraDebtPayment, setExtraDebtPayment] = useState(0);
  const [goalSavings, setGoalSavings] = useState(0);
  const [discretionarySpending, setDiscretionarySpending] = useState(0);

  const takeHomePay = takeHomePayOverride ?? convertedDefaults.takeHomePay;
  const essentialExpenses = essentialExpensesOverride ?? convertedDefaults.essentialExpenses;
  const debtMinimums = debtMinimumsOverride ?? convertedDefaults.debtMinimums;
  const retirementContributions = retirementOverride ?? convertedDefaults.retirementContributions;

  const result = useMemo(() => calculatePaycheckPlan({
    takeHomePay,
    essentialExpenses,
    debtMinimums,
    retirementContributions,
    emergencySavings,
    extraDebtPayment,
    goalSavings,
    discretionarySpending,
  }, paychecksPerYear), [
    takeHomePay,
    essentialExpenses,
    debtMinimums,
    retirementContributions,
    emergencySavings,
    extraDebtPayment,
    goalSavings,
    discretionarySpending,
    paychecksPerYear,
  ]);

  const numberField = (label: string, value: number, setter: (value: number) => void) => (
    <label>{label}<input type="number" min="0" step="0.01" value={value} onChange={(event) => setter(Math.max(0, Number(event.target.value) || 0))} /></label>
  );

  const resetProfileDefaults = () => {
    setTakeHomePayOverride(null);
    setEssentialExpensesOverride(null);
    setDebtMinimumsOverride(null);
    setRetirementOverride(null);
  };

  return (
    <section className="panel-grid">
      <article className="panel">
        <p className="eyebrow">Paycheck planner</p>
        <h2>Give each paycheck a job</h2>
        <p className="muted">Saved monthly household data is converted to your selected pay frequency. Changes stay local to this page and do not update your financial profile.</p>
        <div className="data-form">
          <label>Pay frequency
            <select value={payFrequency} onChange={(event) => setPayFrequency(event.target.value as PayFrequency)}>
              <option value="weekly">Weekly — 52 paychecks/year</option>
              <option value="biweekly">Biweekly — 26 paychecks/year</option>
              <option value="semimonthly">Twice monthly — 24 paychecks/year</option>
              <option value="monthly">Monthly — 12 paychecks/year</option>
            </select>
          </label>
          {numberField("Take-home pay per paycheck", takeHomePay, setTakeHomePayOverride)}
          {numberField("Essential expenses", essentialExpenses, setEssentialExpensesOverride)}
          {numberField("Debt minimums", debtMinimums, setDebtMinimumsOverride)}
          {numberField("Retirement contributions", retirementContributions, setRetirementOverride)}
          {numberField("Emergency-fund savings", emergencySavings, setEmergencySavings)}
          {numberField("Extra debt payment", extraDebtPayment, setExtraDebtPayment)}
          {numberField("Other goal savings", goalSavings, setGoalSavings)}
          {numberField("Discretionary spending", discretionarySpending, setDiscretionarySpending)}
          <button type="button" className="secondary-button" onClick={resetProfileDefaults}>Reset profile-based amounts</button>
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">Paycheck result</p>
        <h2>{result.isOverAllocated ? "This paycheck is over-allocated" : "Your paycheck plan"}</h2>
        <div className="split-summary">
          <div><span>Take-home pay</span><strong>{money(result.takeHomePay)}</strong></div>
          <div><span>Planned</span><strong>{money(result.committedAmount)}</strong></div>
          <div><span>Left unassigned</span><strong>{money(result.remainingAmount)}</strong></div>
          <div><span>Allocation rate</span><strong>{result.allocationRate === null ? "—" : `${Math.round(result.allocationRate * 100)}%`}</strong></div>
          <div><span>Over budget</span><strong>{money(result.overAllocatedBy)}</strong></div>
          <div><span>Projected annual leftover</span><strong>{money(result.annualRemaining)}</strong></div>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (result.allocationRate ?? 0) * 100)}%` }} /></div>
        <p className="muted">Annual projections use {paychecksPerYear} paychecks per year for the selected frequency. They do not account for irregular checks, bonuses, tax changes, or investment growth.</p>
      </article>
    </section>
  );
}
