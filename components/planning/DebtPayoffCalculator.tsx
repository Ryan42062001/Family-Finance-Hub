"use client";

import { useMemo, useState } from "react";
import { compareDebtExtraPayment, projectDebtStrategy } from "@/lib/calculations/debt-payoff";

type Debt = { id: string; name: string; debtType: string; balance: number; annualInterestRate: number; minimumPayment: number };
const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const monthsLabel = (months: number | null) => months === null ? "—" : months === 0 ? "Paid off" : `${Math.floor(months / 12)}y ${months % 12}m`;
const safe = (value: string) => Math.max(0, Number(value) || 0);

export default function DebtPayoffCalculator({ debts }: { debts: Debt[] }) {
  const [selectedId, setSelectedId] = useState(debts[0]?.id ?? "");
  const selected = debts.find((debt) => debt.id === selectedId) ?? debts[0];
  const [overrides, setOverrides] = useState<{ id: string; balance: number; rate: number; minimum: number } | null>(null);
  const [extra, setExtra] = useState(0);
  const [strategyExtra, setStrategyExtra] = useState(0);

  const single = overrides?.id === selected?.id ? overrides : selected ? { id: selected.id, balance: selected.balance, rate: selected.annualInterestRate, minimum: selected.minimumPayment } : null;
  const comparison = useMemo(() => single ? compareDebtExtraPayment({ balance: single.balance, annualInterestRate: single.rate, minimumPayment: single.minimum, extraMonthlyPayment: extra }) : null, [single, extra]);
  const strategyDebts = useMemo(() => debts.filter((debt) => debt.debtType !== "mortgage").map((debt) => ({ id: debt.id, name: debt.name, balance: debt.balance, annualInterestRate: debt.annualInterestRate, minimumPayment: debt.minimumPayment })), [debts]);
  const avalanche = useMemo(() => projectDebtStrategy(strategyDebts, strategyExtra, "avalanche"), [strategyDebts, strategyExtra]);
  const snowball = useMemo(() => projectDebtStrategy(strategyDebts, strategyExtra, "snowball"), [strategyDebts, strategyExtra]);

  if (debts.length === 0) return <section className="panel"><p className="eyebrow">Debt payoff</p><h2>No saved debts yet</h2><p className="empty-state">Add a debt to your financial profile before using the saved-debt payoff tools.</p></section>;

  const update = (key: "balance" | "rate" | "minimum", value: number) => {
    if (!selected || !single) return;
    setOverrides({ ...single, id: selected.id, [key]: value });
  };

  return <>
    <section className="panel-grid">
      <article className="panel"><p className="eyebrow">Single debt</p><h2>Test an extra payment</h2><p className="muted">Changes stay local to this page and never update the saved debt automatically.</p><div className="data-form">
        <label>Saved debt<select value={selected.id} onChange={(event) => { setSelectedId(event.target.value); setOverrides(null); setExtra(0); }}>{debts.map((debt) => <option key={debt.id} value={debt.id}>{debt.name}</option>)}</select></label>
        <label>Current balance<input type="number" min="0" step="0.01" value={single?.balance ?? 0} onChange={(event) => update("balance", safe(event.target.value))} /></label>
        <label>Interest rate (%)<input type="number" min="0" step="0.001" value={single?.rate ?? 0} onChange={(event) => update("rate", safe(event.target.value))} /></label>
        <label>Minimum payment<input type="number" min="0" step="0.01" value={single?.minimum ?? 0} onChange={(event) => update("minimum", safe(event.target.value))} /></label>
        <label>Extra monthly payment<input type="number" min="0" step="0.01" value={extra} onChange={(event) => setExtra(safe(event.target.value))} /></label>
      </div></article>
      <article className="panel"><p className="eyebrow">Single-debt projection</p><h2>Extra-payment impact</h2>{comparison?.baseline.payoffPossible && comparison.accelerated.payoffPossible ? <><div className="split-summary">
        <div><span>Current payoff</span><strong>{monthsLabel(comparison.baseline.months)}</strong></div><div><span>With extra</span><strong>{monthsLabel(comparison.accelerated.months)}</strong></div><div><span>Time saved</span><strong>{monthsLabel(comparison.monthsSaved)}</strong></div><div><span>Current interest</span><strong>{money(comparison.baseline.totalInterest)}</strong></div><div><span>New interest</span><strong>{money(comparison.accelerated.totalInterest)}</strong></div><div><span>Interest saved</span><strong>{money(comparison.interestSaved)}</strong></div>
      </div><p className="muted">Assumes a fixed APR and steady monthly payment. Fees, rate changes, promotional periods, and irregular payments are excluded.</p></> : <p className="empty-state">The entered payment is not enough to produce a payoff within the calculator horizon. Increase the payment or verify the terms.</p>}</article>
    </section>

    <section className="panel-grid">
      <article className="panel"><p className="eyebrow">Household strategy</p><h2>Compare avalanche vs. snowball</h2><p className="muted">Mortgage debt is excluded because it has a dedicated payoff tool. Both strategies keep the same combined monthly debt budget and roll freed payments forward.</p><div className="data-form"><label>Extra monthly debt budget<input type="number" min="0" step="0.01" value={strategyExtra} onChange={(event) => setStrategyExtra(safe(event.target.value))} /></label></div><div className="record-list">{strategyDebts.map((debt) => <div className="record-row" key={debt.id}><span><strong>{debt.name}</strong><small>{money(debt.balance)} · {debt.annualInterestRate}% · {money(debt.minimumPayment)}/mo</small></span></div>)}</div>{strategyDebts.length === 0 ? <p className="empty-state">No non-mortgage debts are available for avalanche/snowball comparison.</p> : null}</article>
      <article className="panel"><p className="eyebrow">Strategy comparison</p><h2>Which path costs less?</h2>{strategyDebts.length > 0 && avalanche.payoffPossible && snowball.payoffPossible ? <><div className="split-summary">
        <div><span>Avalanche payoff</span><strong>{monthsLabel(avalanche.months)}</strong></div><div><span>Snowball payoff</span><strong>{monthsLabel(snowball.months)}</strong></div><div><span>Avalanche interest</span><strong>{money(avalanche.totalInterest)}</strong></div><div><span>Snowball interest</span><strong>{money(snowball.totalInterest)}</strong></div><div><span>Interest advantage</span><strong>{money(Math.max(0, (snowball.totalInterest ?? 0) - (avalanche.totalInterest ?? 0)))}</strong></div><div><span>Faster strategy</span><strong>{(avalanche.months ?? Infinity) < (snowball.months ?? Infinity) ? "Avalanche" : (snowball.months ?? Infinity) < (avalanche.months ?? Infinity) ? "Snowball" : "Tie"}</strong></div>
      </div><p><strong>Avalanche order:</strong> {avalanche.payoffOrder.join(" → ") || "—"}</p><p><strong>Snowball order:</strong> {snowball.payoffOrder.join(" → ") || "—"}</p><p className="muted">Results assume fixed APRs and minimum payments. Real credit-card minimums can change as balances fall.</p></> : strategyDebts.length > 0 ? <p className="empty-state">The entered monthly budget does not pay off every debt within the calculator horizon. Increase the extra debt budget or verify the saved terms.</p> : <p className="empty-state">Add a non-mortgage debt to compare strategies.</p>}</article>
    </section>
  </>;
}
