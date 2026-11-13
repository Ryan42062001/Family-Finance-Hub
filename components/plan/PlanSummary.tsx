import Link from "next/link";
import type { PlanResult } from "@/lib/plan/plan-result";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

// The first three actionable steps of the money plan, shown at the top of the dashboard.
// headingId keeps ids unique: the dashboard renders one copy for phones and one for wider screens.
export default function PlanSummary({ plan, headingId }: { plan: PlanResult; headingId: string }) {
  return <section className="bento-card plan-summary" aria-labelledby={headingId}>
    <div className="plan-summary-head">
      <div><p className="metric-label">Your money plan</p><h2 id={headingId}>Next steps</h2></div>
      <Link className="secondary-button" href="/plan">See your full plan</Link>
    </div>
    {!plan.ok ? <p className="muted">{plan.reason}</p>
      : plan.view.steps.length ? <ol className="plan-summary-list">{plan.view.steps.slice(0, 3).map((step, index) => <li key={step.id}>
        <span className="plan-step-rank" aria-hidden="true">{index + 1}</span>
        <span className="plan-summary-title">{step.title}</span>
        <span className="plan-summary-amount">{step.monthlyAmount !== null && step.monthlyAmount > 0 ? `${money(step.monthlyAmount)}/mo` : step.stateLabel}</span>
      </li>)}</ol>
      : <p className="muted">Fill in a few more details to unlock your first steps.</p>}
    {plan.ok && plan.view.missingCount ? <p className="plan-summary-missing"><Link href="/plan#plan-missing-heading">{plan.view.missingCount} {plan.view.missingCount === 1 ? "detail" : "details"} would improve your plan →</Link></p> : null}
  </section>;
}
