"use client";

import { useMemo, useState } from "react";
import { calculateRetirementContributionPacing } from "@/lib/calculations/retirement-contribution-pacing";

type Account = { name: string; monthlyEmployeeContribution: number; monthlyEmployerContribution: number } | null;
const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const safe = (value: string) => Math.max(0, Number(value) || 0);

export default function RetirementPacingCalculator({ account }: { account: Account }) {
  const [annualTarget, setAnnualTarget] = useState(0);
  const [contributedYearToDate, setContributedYearToDate] = useState(0);
  const [remainingPayPeriods, setRemainingPayPeriods] = useState(0);
  const [currentContributionPerPayPeriod, setCurrentContributionPerPayPeriod] = useState(0);
  const result = useMemo(() => calculateRetirementContributionPacing({ annualTarget, contributedYearToDate, remainingPayPeriods, currentContributionPerPayPeriod }), [annualTarget, contributedYearToDate, remainingPayPeriods, currentContributionPerPayPeriod]);

  return <section className="panel-grid">
    <article className="panel"><p className="eyebrow">Pacing assumptions</p><h2>{account ? `Plan around ${account.name}` : "Set an annual contribution target"}</h2><p className="muted">Annual limits are intentionally entered by you because eligibility and limits vary by account, age, plan rules, and tax year. Inputs stay local to this page.</p>{account ? <p className="muted">Saved reference: {money(account.monthlyEmployeeContribution)}/mo employee + {money(account.monthlyEmployerContribution)}/mo employer. These are not automatically treated as per-paycheck contributions.</p> : null}<div className="data-form">
      <label>Annual contribution target<input type="number" min="0" step="0.01" value={annualTarget} onChange={(event) => setAnnualTarget(safe(event.target.value))} /></label>
      <label>Contributed year to date<input type="number" min="0" step="0.01" value={contributedYearToDate} onChange={(event) => setContributedYearToDate(safe(event.target.value))} /></label>
      <label>Remaining pay periods<input type="number" min="0" step="1" value={remainingPayPeriods} onChange={(event) => setRemainingPayPeriods(Math.floor(safe(event.target.value)))} /></label>
      <label>Current contribution per pay period<input type="number" min="0" step="0.01" value={currentContributionPerPayPeriod} onChange={(event) => setCurrentContributionPerPayPeriod(safe(event.target.value))} /></label>
    </div></article>
    <article className="panel"><p className="eyebrow">Projection</p><h2>Year-end contribution pace</h2><div className="split-summary">
      <div><span>Annual target</span><strong>{money(result.annualTarget)}</strong></div><div><span>Contributed YTD</span><strong>{money(result.contributedYearToDate)}</strong></div><div><span>Still needed</span><strong>{money(result.remainingAmount)}</strong></div><div><span>Needed per pay period</span><strong>{money(result.requiredPerPayPeriod)}</strong></div><div><span>Projected year-end</span><strong>{money(result.projectedYearEndContribution)}</strong></div><div><span>Projected shortfall</span><strong>{money(result.projectedShortfall)}</strong></div>
    </div>{result.projectedExcess > 0 ? <p className="muted">At the entered pace, contributions exceed the planning target by {money(result.projectedExcess)}. Confirm the applicable account and plan limits before increasing contributions.</p> : null}{result.requiredPerPayPeriod === null ? <p className="empty-state">Enter at least one remaining pay period to calculate the amount needed per paycheck.</p> : null}<p className="muted">This is a pacing calculator, not tax advice. It does not determine eligibility, catch-up rules, employer-plan restrictions, combined-plan limits, or whether employer contributions count toward a specific limit.</p></article>
  </section>;
}
