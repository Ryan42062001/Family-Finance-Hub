"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildMonthlyMoneyFlow, type FlowInput } from "@/lib/calculations/monthly-money-flow";

const palette = {
  essential: "#2c7461", discretionary: "#509a92", debt: "#d09b54",
  retirement: "#597aab", remaining: "#85bf98",
};
const dollars = (cents: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(cents / 100);
const percent = (cents: number, total: number) => total > 0 ? `${(100 * cents / total).toFixed(1)}%` : "—";

export default function MonthlyMoneyFlow({ input }: { input: FlowInput }) {
  const flow = useMemo(() => buildMonthlyMoneyFlow(input), [input]);
  const [focused, setFocused] = useState<string | null>(null);
  const [showExpenseCategories, setShowExpenseCategories] = useState(false);
  if (flow.status !== "ready") {
    return <section className="panel monthly-flow-panel" aria-label="Monthly household money flow">
      <div className="panel-heading"><div><p className="eyebrow">Monthly household money flow</p><h2>Where income goes</h2></div></div>
      <p className="empty-state" role="status">{flow.reason}</p>
      <Link href="/financial-profile" className="secondary-button">Complete financial profile</Link>
    </section>;
  }
  const positive = flow.branches.filter(b => b.cents > 0);
  const scale = flow.totalCents > 0 ? 208 / flow.totalCents : 0;
  const strips = positive.map((b, index) => {
    const h = b.cents * scale;
    const prior = positive.slice(0,index).reduce((sum, item) => sum + item.cents * scale, 0);
    const y0 = 70 + prior;
    const y1 = 70 + prior + index * 24;
    const path = `M 220 ${y0} C 360 ${y0} 490 ${y1} 610 ${y1} L 610 ${y1+h} C 490 ${y1+h} 360 ${y0+h} 220 ${y0+h} Z`;
    return { ...b, h, y0, y1, path };
  });
  const selected = positive.find(b=>b.id === focused);
  return <section className="panel monthly-flow-panel" aria-labelledby="monthly-flow-heading">
    <div className="money-flow-head">
      <div><p className="eyebrow">Your recorded monthly money</p><h2 id="monthly-flow-heading">Where income goes</h2>
        <p className="muted">From active take-home income to recorded expenses, debt minimums, employee retirement contributions and remaining cash flow.</p></div>
      <div className="money-flow-total"><small>Monthly income</small><strong>{dollars(flow.incomeCents)}</strong></div>
    </div>
    {flow.shortfallCents > 0 ? <p className="budget-warning money-flow-shortfall" role="alert">⚠ Monthly shortfall: {dollars(flow.shortfallCents)}. Recorded commitments exceed income. The red segment represents an <strong>unfunded gap</strong>, not additional income.</p> : null}
    <div className="money-flow-canvas">
      <svg viewBox="0 0 940 440" role="img" aria-label="Proportional monthly household money flow; the accessible itemized breakdown follows" preserveAspectRatio="xMidYMid meet">
        <title>Recorded income to monthly commitments and remaining cash flow</title>
        <text x="16" y="40" className="money-flow-svg-heading">Recorded resources</text>
        <text x="635" y="40" className="money-flow-svg-heading">Monthly outcomes</text>
        <rect x="198" y="70" width="22" height={Math.max(0, flow.incomeCents*scale)} rx="3" fill="#234b40"/>
        {flow.shortfallCents > 0 ? <rect x="198" y={70+flow.incomeCents*scale} width="22" height={flow.shortfallCents*scale} fill="#ba4454" /> : null}
        <text x="16" y="107" className="money-flow-svg-label">Take-home income</text>
        <text x="16" y="132" className="money-flow-svg-value">{dollars(flow.incomeCents)}</text>
        {flow.shortfallCents > 0 ? <><text x="16" y="186" className="money-flow-svg-label">Unfunded shortfall</text><text x="16" y="210" className="money-flow-svg-value" fill="#a53b46">{dollars(flow.shortfallCents)}</text></> : null}
        {strips.map(b=><g key={b.id} className={focused && focused!==b.id ? "money-flow-dim" : ""}>
          <path d={b.path} fill={palette[b.id]} opacity={focused === b.id ? .97 : .75}
            tabIndex={0} role="button" aria-label={`${b.label}: ${dollars(b.cents)}, ${percent(b.cents,flow.totalCents)} of recorded resources`}
            onFocus={()=>setFocused(b.id)} onBlur={()=>setFocused(null)}
            onMouseEnter={()=>setFocused(b.id)} onMouseLeave={()=>setFocused(null)}
            onKeyDown={event=>{ if (event.key==="Enter" || event.key===" ") {event.preventDefault();setFocused(b.id);} }}>
            <title>{b.label}: {dollars(b.cents)} ({percent(b.cents,flow.totalCents)})</title>
          </path>
          <rect x="610" y={b.y1} width="14" height={b.h} rx="2" fill={palette[b.id]} />
          <text x="635" y={b.y1+Math.max(14,b.h/2)} className="money-flow-svg-label">{b.label}</text>
          <text x="635" y={b.y1+Math.max(31,b.h/2+18)} className="money-flow-svg-value">{dollars(b.cents)}</text>
        </g>)}
      </svg>
    </div>
    <p className="money-flow-explainer">Flow widths scale to the recorded monthly amount. An unfunded gap is shown separately when commitments exceed income; ribbons do not assign payment priority. Remaining cash flow is <strong>not guaranteed discretionary spending or automatically saved money.</strong></p>
    <div className="money-flow-detail" role="status" aria-live="polite">{selected
      ? <span><strong>{selected.label}</strong> · {dollars(selected.cents)} · {percent(selected.cents, flow.totalCents)} of the reconciled total</span>
      : <span>Hover or focus a flow to inspect its amount and share.</span>}</div>
    <div className="money-flow-actions">
      <button type="button" className="secondary-button" aria-expanded={showExpenseCategories} onClick={()=>setShowExpenseCategories(value=>!value)}>
        {showExpenseCategories ? "Hide expense categories" : "Show expense categories"}
      </button>
      <Link className="secondary-button" href="/financial-profile#expenses">Review saved expenses</Link>
    </div>
    {showExpenseCategories ? <div className="money-flow-category-lists">
      {flow.branches.filter(b=>b.categories.length>0).map(b=><div key={b.id}><h3>{b.label}</h3>
        <ul>{b.categories.map(category=><li key={category.label}><span>{category.label}</span><strong>{dollars(category.cents)}</strong></li>)}</ul>
      </div>)}
    </div> : null}
    <details className="money-flow-table-disclosure">
      <summary>View accessible monthly reconciliation table</summary>
      <div className="money-flow-table-wrap"><table>
        <caption>Monthly recorded resource reconciliation. All amounts in US dollars.</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Monthly amount</th><th scope="col">Share</th></tr></thead>
        <tbody>
          <tr><th scope="row">Recorded income</th><td>{dollars(flow.incomeCents)}</td><td>—</td></tr>
          {flow.branches.map(b=><tr key={b.id}><th scope="row">{b.label}</th><td>{dollars(b.cents)}</td><td>{percent(b.cents,flow.totalCents)}</td></tr>)}
          {flow.shortfallCents>0 ? <tr><th scope="row">Unfunded monthly shortfall (not income)</th><td>{dollars(flow.shortfallCents)}</td><td>{percent(flow.shortfallCents,flow.totalCents)}</td></tr> : null}
          <tr><th scope="row">Commitments + positive cash flow</th><td>{dollars(flow.commitmentsCents+flow.remainingCents)}</td><td>{percent(flow.totalCents,flow.totalCents)}</td></tr>
        </tbody>
      </table></div>
    </details>
  </section>;
}
