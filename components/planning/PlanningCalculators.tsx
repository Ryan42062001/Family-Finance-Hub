"use client";

import { useMemo, useState } from "react";
import { calculateEmergencyFund } from "@/lib/calculations/emergency-fund";
import { compareMortgageExtraPayment } from "@/lib/calculations/mortgage-extra-payment";
import { calculateSavingsGoal } from "@/lib/calculations/savings-goal";

type Defaults = {
  emergency: { currentSavings: number; monthlyEssentialExpenses: number; targetMonths: number };
  mortgage: { principal: number; annualInterestRate: number; monthlyPayment: number; hasSavedMortgage: boolean };
  goal: { name: string | null; currentAmount: number; targetAmount: number; monthsUntilTarget: number };
};

const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const monthsLabel = (months: number | null) => months === null ? "—" : months === 0 ? "Paid off" : `${Math.floor(months / 12)}y ${months % 12}m`;
const safeInput = (value: string) => Math.max(0, Number(value) || 0);

export default function PlanningCalculators({ defaults }: { defaults: Defaults }) {
  const [currentSavings, setCurrentSavings] = useState(defaults.emergency.currentSavings);
  const [monthlyEssentialExpenses, setMonthlyEssentialExpenses] = useState(defaults.emergency.monthlyEssentialExpenses);
  const [targetMonths, setTargetMonths] = useState(defaults.emergency.targetMonths);
  const [monthlyContribution, setMonthlyContribution] = useState(0);

  const [mortgagePrincipal, setMortgagePrincipal] = useState(defaults.mortgage.principal);
  const [mortgageRate, setMortgageRate] = useState(defaults.mortgage.annualInterestRate);
  const [mortgagePayment, setMortgagePayment] = useState(defaults.mortgage.monthlyPayment);
  const [extraMortgagePayment, setExtraMortgagePayment] = useState(0);

  const [goalCurrentAmount, setGoalCurrentAmount] = useState(defaults.goal.currentAmount);
  const [goalTargetAmount, setGoalTargetAmount] = useState(defaults.goal.targetAmount);
  const [goalMonthlyContribution, setGoalMonthlyContribution] = useState(0);
  const [goalMonthsUntilTarget, setGoalMonthsUntilTarget] = useState(defaults.goal.monthsUntilTarget);

  const emergency = useMemo(() => calculateEmergencyFund({ currentSavings, monthlyEssentialExpenses, targetMonths, monthlyContribution }), [currentSavings, monthlyEssentialExpenses, targetMonths, monthlyContribution]);
  const mortgage = useMemo(() => compareMortgageExtraPayment({ principal: mortgagePrincipal, annualInterestRate: mortgageRate, monthlyPayment: mortgagePayment, extraMonthlyPayment: extraMortgagePayment }), [mortgagePrincipal, mortgageRate, mortgagePayment, extraMortgagePayment]);
  const goal = useMemo(() => calculateSavingsGoal({ currentAmount: goalCurrentAmount, targetAmount: goalTargetAmount, monthlyContribution: goalMonthlyContribution, monthsUntilTarget: goalMonthsUntilTarget }), [goalCurrentAmount, goalTargetAmount, goalMonthlyContribution, goalMonthsUntilTarget]);

  const field = (label: string, value: number, setter: (value: number) => void, step = "0.01") => <label>{label}<input type="number" min="0" step={step} value={value} onChange={(event) => setter(safeInput(event.target.value))} /></label>;

  return <>
    <section className="panel-grid" id="emergency-fund">
      <article className="panel"><p className="eyebrow">Emergency fund</p><h2>Adjust your reserve plan</h2><p className="muted">Defaults use liquid accounts, essential recurring expenses, and debt minimums. Changes stay only in this browser view.</p><div className="data-form">
        {field("Current liquid savings", currentSavings, setCurrentSavings)}
        {field("Monthly essential expenses", monthlyEssentialExpenses, setMonthlyEssentialExpenses)}
        {field("Target months", targetMonths, setTargetMonths, "0.5")}
        {field("Monthly contribution", monthlyContribution, setMonthlyContribution)}
      </div></article>
      <article className="panel"><p className="eyebrow">Emergency projection</p><h2>Your reserve</h2><div className="split-summary">
        <div><span>Target</span><strong>{money(emergency.targetAmount)}</strong></div><div><span>Current</span><strong>{money(emergency.currentSavings)}</strong></div><div><span>Progress</span><strong>{emergency.progress === null ? "—" : `${Math.round(emergency.progress * 100)}%`}</strong></div><div><span>Gap</span><strong>{money(emergency.fundingGap)}</strong></div><div><span>Coverage</span><strong>{emergency.coverageMonths === null ? "—" : `${emergency.coverageMonths.toFixed(1)} months`}</strong></div><div><span>Time to target</span><strong>{emergency.monthsToGoal === null ? "Add monthly savings" : emergency.monthsToGoal === 0 ? "Funded" : `${emergency.monthsToGoal} months`}</strong></div>
      </div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (emergency.progress ?? 0) * 100)}%` }} /></div><p className="muted">Projection excludes interest earned, changing expenses, and withdrawals.</p></article>
    </section>

    <section className="panel-grid" id="mortgage">
      <article className="panel"><p className="eyebrow">Mortgage extra payment</p><h2>Test a faster payoff</h2><p className="muted">{defaults.mortgage.hasSavedMortgage ? "Saved mortgage data provides the starting values." : "No saved mortgage was found; enter assumptions manually."} Verify that the payment below is principal + interest only; escrow, taxes, and insurance are excluded.</p><div className="data-form">
        {field("Current mortgage balance", mortgagePrincipal, setMortgagePrincipal)}
        {field("Interest rate (%)", mortgageRate, setMortgageRate, "0.001")}
        {field("Monthly principal + interest payment", mortgagePayment, setMortgagePayment)}
        {field("Extra monthly principal", extraMortgagePayment, setExtraMortgagePayment)}
      </div></article>
      <article className="panel"><p className="eyebrow">Mortgage projection</p><h2>Extra-payment impact</h2>{mortgage.baseline.payoffPossible && mortgage.accelerated.payoffPossible ? <><div className="split-summary">
        <div><span>Current payoff</span><strong>{monthsLabel(mortgage.baseline.months)}</strong></div><div><span>With extra</span><strong>{monthsLabel(mortgage.accelerated.months)}</strong></div><div><span>Time saved</span><strong>{monthsLabel(mortgage.monthsSaved)}</strong></div><div><span>Current interest</span><strong>{money(mortgage.baseline.totalInterest)}</strong></div><div><span>New interest</span><strong>{money(mortgage.accelerated.totalInterest)}</strong></div><div><span>Interest saved</span><strong>{money(mortgage.interestSaved)}</strong></div>
      </div><p className="muted">Assumes a fixed rate, monthly payments, no fees, and extra amounts applied directly to principal.</p></> : <p className="empty-state">Enter a principal-and-interest payment greater than the monthly interest charge to produce a payoff projection.</p>}</article>
    </section>

    <section className="panel-grid" id="savings-goal">
      <article className="panel"><p className="eyebrow">Savings goal</p><h2>{defaults.goal.name ? `Model ${defaults.goal.name}` : "Project a savings goal"}</h2><p className="muted">Your highest-priority saved goal is used as the default when available. Changes stay local and are not saved.</p><div className="data-form">
        {field("Current amount", goalCurrentAmount, setGoalCurrentAmount)}
        {field("Target amount", goalTargetAmount, setGoalTargetAmount)}
        {field("Monthly contribution", goalMonthlyContribution, setGoalMonthlyContribution)}
        {field("Months until target", goalMonthsUntilTarget, setGoalMonthsUntilTarget, "1")}
      </div></article>
      <article className="panel"><p className="eyebrow">Goal projection</p><h2>What the plan requires</h2><div className="split-summary">
        <div><span>Current progress</span><strong>{goal.progress === null ? "—" : `${Math.round(goal.progress * 100)}%`}</strong></div><div><span>Remaining</span><strong>{money(goal.remainingAmount)}</strong></div><div><span>At current pace</span><strong>{goal.monthsToGoal === null ? "Add monthly savings" : goal.monthsToGoal === 0 ? "Funded" : `${goal.monthsToGoal} months`}</strong></div><div><span>Projected at target</span><strong>{money(goal.projectedAmountAtTarget)}</strong></div><div><span>Needed each month</span><strong>{money(goal.requiredMonthlyContribution)}</strong></div><div><span>Monthly shortfall</span><strong>{goal.requiredMonthlyContribution === null ? "—" : money(Math.max(0, goal.requiredMonthlyContribution - goalMonthlyContribution))}</strong></div>
      </div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, (goal.progress ?? 0) * 100)}%` }} /></div><p className="muted">Projection assumes no interest or investment growth and a steady monthly contribution.</p></article>
    </section>
  </>;
}
