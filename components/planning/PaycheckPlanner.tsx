"use client";

import { useMemo, useState } from "react";
import { calculatePaycheckPlan } from "@/lib/calculations/paycheck-planner";

type Defaults = {
  paychecksPerYear: number;
  takeHomePay: number;
  essentialExpenses: number;
  debtMinimums: number;
  retirementContributions: number;
};

const money = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(value);

export default function PaycheckPlanner({ defaults }: { defaults: Defaults }) {
  const [paychecksPerYear, setPaychecksPerYear] = useState(defaults.paychecksPerYear);
  const [takeHomePay, setTakeHomePay] = useState(defaults.takeHomePay);
  const [essentialExpenses, setEssentialExpenses] = useState(defaults.essentialExpenses);
  const [debtMinimums, setDebtMinimums] = useState(defaults.debtMinimums);
  const [retirementContributions, setRetirementContributions] = useState(defaults.retirementContributions);
  const [emergencySavings, setEmergencySavings] = useState(0);
  const [extraDebtPayment, setExtraDebtPayment] = useState(0);
  const [goalSavings, setGoalSavings] = useState(0);
  const [discretionarySpending, setDiscretionarySpending] = useState(0);

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

  return (
    <section className="panel-grid">
      <article className="panel">
        <p className="eyebrow">Paycheck planner</p>
        <h2>Give each paycheck a job</h2>
        <p className="muted">Saved household data provides starting values. Changes here stay local to this page and do not update your financial profile.</p>
        <div className="data-form">
          <label>Paychecks per year<input type="number" min="1" step="1" value={paychecksPerYear} onChange={(event) => setPaychecksPerYear(Math.max(1, Math.floor(Number(event.target.value) || 1)))} /></label>
          {numberField("Take-home pay per paycheck", takeHomePay, setTakeHomePay)}
          {numberField("Essential expenses", essentialExpenses, setEssentialExpenses)}
          {numberField("Debt minimums", debtMinimums, setDebtMinimums)}
          {numberField("Retirement contributions", retirementContributions, setRetirementContributions)}
          {numberField("Emergency-fund savings", emergencySavings, setEmergencySavings)}
          {numberField("Extra debt payment", extraDebtPayment, setExtraDebtPayment)}
          {numberField("Other goal savings", goalSavings, setGoalSavings)}
          {numberField("Discretionary spending", discretionarySpending, setDiscretionarySpending)}
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
        <p className="muted">Annual projections multiply this paycheck plan by {paychecksPerYear} paychecks. They do not account for irregular checks, bonuses, taxes changing during the year, or investment growth.</p>
      </article>
    </section>
  );
}
