"use client";

import { useMemo, useState } from "react";
import { calculatePaycheckPlan, monthlyAmountToPerPaycheck } from "@/lib/calculations/paycheck-planner";
import { paycheckInputDisplay } from "@/lib/formatting/financial-presentation";

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
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});

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

  // Keep a user's editing text intact until blur, while using precise unrounded
  // monthly-to-paycheck values when a profile-based field is untouched.
  const numberField = (key: string, label: string, value: number, setter: (value: number) => void) => (
    <label>{label}<input type="text" inputMode="decimal" value={inputDrafts[key] ?? paycheckInputDisplay(value)}
      onChange={(event) => {
        const draft = event.target.value;
        if (!/^(?:\d*(?:\.\d{0,2})?)$/.test(draft)) return;
        setInputDrafts((current) => ({ ...current, [key]: draft }));
        setter(Math.max(0, Number(draft) || 0));
      }}
      onBlur={() => setInputDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      })} /></label>
  );

  const resetProfileDefaults = () => {
    setTakeHomePayOverride(null);
    setEssentialExpensesOverride(null);
    setDebtMinimumsOverride(null);
    setRetirementOverride(null);
    setInputDrafts({});
  };

  return (
    <section className="panel-grid">
      <article className="panel">
        <p className="eyebrow">Paycheck planner</p>
        <h2>Give each paycheck a job</h2>
        <p className="muted">Saved monthly household data is converted to your selected pay frequency. Displayed inputs are rounded to cents, while untouched profile amounts retain exact conversion precision in the annual plan. Manually edited per-paycheck amounts remain as entered if you change frequency. Changes stay local and never update your saved profile.</p>
        <div className="data-form">
          <label>Pay frequency
            <select value={payFrequency} onChange={(event) => setPayFrequency(event.target.value as PayFrequency)}>
              <option value="weekly">Weekly — 52 paychecks/year</option>
              <option value="biweekly">Biweekly — 26 paychecks/year</option>
              <option value="semimonthly">Twice monthly — 24 paychecks/year</option>
              <option value="monthly">Monthly — 12 paychecks/year</option>
            </select>
          </label>
          {numberField("takeHomePay", "Take-home pay per paycheck", takeHomePay, setTakeHomePayOverride)}
          {numberField("essentialExpenses", "Essential expenses", essentialExpenses, setEssentialExpensesOverride)}
          {numberField("debtMinimums", "Debt minimums", debtMinimums, setDebtMinimumsOverride)}
          {numberField("retirementContributions", "Retirement contributions", retirementContributions, setRetirementOverride)}
          {numberField("emergencySavings", "Emergency-fund savings", emergencySavings, setEmergencySavings)}
          {numberField("extraDebtPayment", "Extra debt payment", extraDebtPayment, setExtraDebtPayment)}
          {numberField("goalSavings", "Other goal savings", goalSavings, setGoalSavings)}
          {numberField("discretionarySpending", "Discretionary spending", discretionarySpending, setDiscretionarySpending)}
          <button type="button" className="secondary-button" onClick={resetProfileDefaults}>Reset profile-based amounts</button>
        </div>
      </article>

      <article className="panel">
        <p className="eyebrow">Paycheck result</p>
        <h2>{result.isOverAllocated ? "This paycheck is over-allocated" : "Your paycheck plan"}</h2>
        {result.isOverAllocated ? <p className="budget-warning" role="alert"><span aria-hidden="true">⚠</span> Over budget by {money(result.overAllocatedBy)} — {result.allocationRate === null ? "rate unavailable" : `${(result.allocationRate * 100).toFixed(2)}%`} of take-home pay is allocated.</p> : null}
        <div className="split-summary">
          <div><span>Take-home pay</span><strong>{money(result.takeHomePay)}</strong></div>
          <div><span>Planned</span><strong>{money(result.committedAmount)}</strong></div>
          <div><span>Left unassigned</span><strong>{money(result.remainingAmount)}</strong></div>
          <div><span>Allocation rate</span><strong>{result.allocationRate === null ? "—" : `${Math.round(result.allocationRate * 100)}%`}</strong></div>
          <div><span>Over budget</span><strong>{money(result.overAllocatedBy)}</strong></div>
          <div><span>{result.annualRemaining < 0 ? "Projected annual shortfall" : result.annualRemaining > 0 ? "Projected annual leftover" : "Projected annual balance"}</span><strong>{money(result.annualRemaining)}</strong></div>
        </div>
        <div className="progress-track" role="progressbar" aria-label="Paycheck allocation rate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, Math.round((result.allocationRate ?? 0) * 100)))} aria-valuetext={result.allocationRate === null ? "Allocation rate unavailable" : `${(result.allocationRate * 100).toFixed(2)}% of paycheck allocated${result.isOverAllocated ? `, ${money(result.overAllocatedBy)} over budget` : ""}`}><div className={`progress-fill${result.isOverAllocated ? " budget-fill-over" : ""}`} style={{ width: `${Math.max(0, Math.min(100, (result.allocationRate ?? 0) * 100))}%` }} /></div>
        <p className="muted">Annual projections use {paychecksPerYear} paychecks per year for the selected frequency. They do not account for irregular checks, bonuses, tax changes, or investment growth.</p>
      </article>
    </section>
  );
}
