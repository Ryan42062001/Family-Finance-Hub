import Link from "next/link";
import type { PlanResult } from "@/lib/plan/plan-result";
import { formatPlanMoney, type PlanStep } from "@/lib/plan/money-plan";

// Exact to the cent: these are the engine's own amounts and must not be rounded for display.
const money = formatPlanMoney;

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function Details({ step }: { step: PlanStep }) {
  const sections: Array<[string, string[]]> = [["Why now", step.whyNow], ["Trade-offs", step.tradeoffs], ["Assumptions", step.assumptions]];
  const shown = sections.filter(([, items]) => items.length);
  if (!shown.length && !step.technical) return null;
  return <details className="plan-step-details">
    <summary>Why this step</summary>
    {shown.map(([heading, items]) => <div key={heading}><strong>{heading}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
    {step.technical ? <p className="plan-technical"><strong>Technical wording:</strong> {step.technical}</p> : null}
  </details>;
}

export default function MoneyPlan({ plan, example = false }: { plan: PlanResult; example?: boolean }) {
  if (!plan.ok) return <section className="bento-card plan-unavailable" role="status"><strong>No plan right now</strong><p>{plan.reason}</p>{example ? null : <Link className="secondary-button" href="/financial-profile">Open Financial profile</Link>}</section>;
  const { view, cushion, debtFree } = plan;
  const profileLink = (href: string | null) => (example ? null : href);
  return <div className="money-plan">
    <section className="plan-badges" aria-label="Plan headline">
      <article className={`bento-card plan-feasibility plan-feasibility-${view.feasibility.status}`}>
        <p className="metric-label">This month</p>
        <strong className="bento-number">{view.feasibility.label}</strong>
        <span className="bento-caption">{money(view.feasibility.monthlyPlanCapacity)} available after essentials and minimums{view.feasibility.fundingGap > 0 ? ` · ${money(view.feasibility.fundingGap)} short of protected needs` : ""}</span>
      </article>
      <article className="bento-card">
        <p className="metric-label">Months of cushion</p>
        {cushion.kind === "months"
          ? <><strong className="bento-number">{cushion.months.toFixed(1)}</strong><span className="bento-caption">months of essential spending covered by your emergency fund and cash not set aside for anything else</span></>
          : <span className="bento-caption">{cushion.reason}</span>}
      </article>
      <article className="bento-card">
        <p className="metric-label">Debt-free date</p>
        {debtFree.kind === "date" ? <><strong className="bento-number">{monthLabel(debtFree.date)}</strong><span className="bento-caption">if you keep paying today&apos;s total minimums ({money(plan.debtMinimums)}/mo), moving each paid-off debt&apos;s payment to the next</span></>
          : debtFree.kind === "none" ? <><strong className="bento-number">No debt</strong><span className="bento-caption">No debts with a balance are recorded</span></>
          : debtFree.kind === "not_reached" ? <><strong className="bento-number">Not at this pace</strong><span className="bento-caption">Today&apos;s minimum payments don&apos;t pay the debts off within 100 years</span></>
          : <span className="bento-caption">{debtFree.reason}</span>}
      </article>
    </section>

    <section className="bento-card plan-steps" aria-labelledby="plan-steps-heading">
      <h2 id="plan-steps-heading">Your steps, in order</h2>
      {view.steps.length ? <ol className="plan-step-list">
        {view.steps.map((step, index) => <li key={step.id} className={`plan-step plan-step-${step.state}`}>
          <span className="plan-step-rank" aria-hidden="true">{index + 1}</span>
          <div className="plan-step-body">
            <div className="plan-step-head">
              <h3>{step.title}</h3>
              <span className={`plan-status plan-status-${step.state}`}>{step.stateLabel}</span>
            </div>
            <p className="plan-step-amount">{step.monthlyAmount !== null && step.monthlyAmount > 0 ? <><strong>{money(step.monthlyAmount)}</strong>/month{step.destinations.length ? <> → {step.destinations.join(", ")}</> : null}</> : <span className="muted">No monthly amount for this step</span>}</p>
            <p className="plan-step-explanation">{step.explanation}</p>
            <Details step={step} />
          </div>
        </li>)}
      </ol> : <p className="empty-state">No actionable steps yet. Fill in the items below to unlock your plan.</p>}
    </section>

    {view.missing.length ? <section className="bento-card plan-missing" aria-labelledby="plan-missing-heading">
      <h2 id="plan-missing-heading">What&apos;s missing</h2>
      <p className="muted">These facts would let the plan recommend more. Nothing is guessed in the meantime.</p>
      <div className="plan-missing-groups">{view.missing.map((group, index) => <div key={group.title ?? `other-${index}`} className="plan-missing-group">
        <strong>{group.title ?? "Also needed for the steps above"}</strong>
        {group.items.length ? <ul className="plan-missing-list">{group.items.map((item) => {
          const href = profileLink(item.href);
          return <li key={item.text}><span>{item.text}</span>{href ? <Link href={href}>{item.fixHint} →</Link> : <small>{example ? "Example household" : item.fixHint}</small>}</li>;
        })}</ul> : null}
      </div>)}</div>
    </section> : null}

    {view.notes.length ? <details className="bento-card plan-notes">
      <summary>Planning notes ({view.notes.length})</summary>
      <ul>{view.notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </details> : null}
    <p className="plan-footnote muted">Calculated from {example ? "made-up example numbers" : "your saved financial profile"} as of {view.asOfDate}. This is planning guidance from your recorded numbers, not financial advice.</p>
  </div>;
}
