"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildMonthlyMoneyFlow, type FlowInput, type FlowBranch } from "@/lib/calculations/monthly-money-flow";
import { layoutMonthlyMoneyFlow, type SankeyEdge } from "@/lib/calculations/monthly-money-flow-layout";

// Distinct FFH color families; labels, percentages and the reconciliation table
// always convey the same data without requiring color recognition.
const palette: Record<FlowBranch["id"], string> = {
  essential: "#e6a24a", discretionary: "#df8878", debt: "#c16b2d",
  retirement: "#567faf", remaining: "#38936f",
};
const dollars = (cents: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(cents / 100);
const percent = (cents: number, income: number) => income > 0 ? `${(100 * cents / income).toFixed(1)}%` : "—";
const nameInGraphic = (name: string, max: number) => name.length > max ? name.slice(0, max - 1) + "…" : name;

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

  const layout = layoutMonthlyMoneyFlow(flow, showExpenseCategories);
  const selected = layout.edges.find(edge => edge.id === focused);
  const selectedParent = selected?.parentId ?? null;
  const hasCategories = flow.branches.some(branch=>branch.categories.some(category=>category.cents>0));
  const toggleCategories = () => {
    setShowExpenseCategories(value => !value);
    setFocused(null);
  };
  const highlight = (edge: SankeyEdge) => selectedParent !== null && edge.parentId !== selectedParent;
  const shareLabel = (cents: number) => `${percent(cents,flow.incomeCents)} of recorded income`;
  const activateEdge = (edge: SankeyEdge) => {
    if (!edge.child && (edge.parentId === "essential" || edge.parentId === "discretionary") && hasCategories) {
      toggleCategories();
    } else {
      setFocused(edge.id);
    }
  };

  return <section className="panel monthly-flow-panel" aria-labelledby="monthly-flow-heading">
    <div className="money-flow-head">
      <div><p className="eyebrow">Your recorded monthly money</p><h2 id="monthly-flow-heading">Where income goes</h2>
        <p className="muted">Income, recurring expenses, debt minimums, employee retirement and cash flow after recorded commitments.</p></div>
      <div className="money-flow-total"><small>Recorded monthly income</small><strong>{dollars(flow.incomeCents)}</strong></div>
    </div>

    {flow.shortfallCents > 0 ? <p className="budget-warning money-flow-shortfall" role="alert">⚠ Monthly shortfall: {dollars(flow.shortfallCents)}. Recorded commitments exceed income. The red segment represents an <strong>unfunded gap</strong>, not additional income. A ribbon is not proof that a commitment is paid.</p> : null}

    {layout.edges.length > 0 ? <div className="money-flow-canvas" id="money-flow-chart">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img"
        aria-label={`Proportional ${layout.expanded ? "three-stage" : "two-stage"} monthly household money flow. Income ${dollars(flow.incomeCents)}; ${flow.shortfallCents ? `unfunded deficit ${dollars(flow.shortfallCents)}; ` : ""}use the text table below for the full breakdown.`}
        preserveAspectRatio="xMidYMin meet">
        <title>Monthly income to commitments, remaining cash flow{layout.expanded ? " and recorded expense categories" : ""}</title>
        <text x="14" y="30" className="money-flow-svg-heading">1 · Recorded resources</text>
        <text x={layout.expanded ? 490 : 465} y="30" className="money-flow-svg-heading">2 · Monthly outcomes</text>
        {layout.expanded ? <text x="853" y="30" className="money-flow-svg-heading">3 · Saved expense categories</text> : null}

        <rect x={layout.sourceX} y={layout.sourceY} width="18" height={layout.sourceHeight} rx="4" fill="#dbe9df" />
        {flow.incomeCents > 0 ? <rect x={layout.sourceX} y={layout.sourceY} width="18" height={layout.incomeHeight} rx="3" fill="#1e5142" /> : null}
        {flow.shortfallCents > 0 ? <rect x={layout.sourceX} y={layout.sourceY + layout.incomeHeight} width="18"
          height={layout.sourceHeight - layout.incomeHeight} fill="#b93c50" /> : null}
        <text x="14" y="60" className="money-flow-svg-label">Income</text>
        <text x="14" y="79" className="money-flow-svg-value">{dollars(flow.incomeCents)}</text>
        {flow.shortfallCents>0 ? <><text x="14" y={layout.sourceY + layout.sourceHeight + 20} className="money-flow-svg-deficit">Unfunded gap {dollars(flow.shortfallCents)}</text></> : null}

        {/* Source-to-outcome paths retain exact cent values in node data. Only
            their graphic thickness uses a minimum for tiny visible amounts. */}
        {layout.edges.filter(edge=>!edge.child).map(edge => <path key={edge.id} d={edge.path}
          fill={palette[edge.parentId]} opacity={focused===edge.id ? .98 : .82}
          className={`money-flow-ribbon${highlight(edge) ? " money-flow-dim" : ""}`}
          tabIndex={0} role="button"
          aria-label={`${edge.label}: ${dollars(edge.cents)} per month, ${shareLabel(edge.cents)}.${edge.parentId === "essential" || edge.parentId === "discretionary" ? " Activate to toggle category branches." : " Activate for details."}`}
          onFocus={()=>setFocused(edge.id)} onBlur={()=>setFocused(null)}
          onMouseEnter={()=>setFocused(edge.id)} onMouseLeave={()=>setFocused(null)}
          onClick={()=>activateEdge(edge)}
          onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();activateEdge(edge);}}}>
          <title>{edge.label}: {dollars(edge.cents)} · {shareLabel(edge.cents)}</title>
        </path>)}

        {layout.edges.filter(edge=>edge.child).map(edge=><path key={edge.id} d={edge.path}
          fill={palette[edge.parentId]} opacity={focused===edge.id ? .98 : .72}
          className={`money-flow-ribbon money-flow-child${highlight(edge) ? " money-flow-dim" : ""}`}
          tabIndex={0} role="button"
          aria-label={`${edge.label} within ${flow.branches.find(branch=>branch.id===edge.parentId)?.label}: ${dollars(edge.cents)} per month, ${shareLabel(edge.cents)}. Activate for details.`}
          onFocus={()=>setFocused(edge.id)} onBlur={()=>setFocused(null)}
          onMouseEnter={()=>setFocused(edge.id)} onMouseLeave={()=>setFocused(null)}
          onClick={()=>activateEdge(edge)}
          onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();activateEdge(edge);}}}>
          <title>{edge.label}: {dollars(edge.cents)} · {shareLabel(edge.cents)}</title>
        </path>)}

        {layout.nodes.filter(node=>!node.parentId).map(node=> <g key={node.id}>
          <rect x={node.x} y={node.y} width="18" height={node.height} rx="3" fill={palette[node.id as FlowBranch["id"]]} />
          <text x={node.x+26} y={node.y-19} className="money-flow-svg-label">{nameInGraphic(node.label, layout.expanded ? 27 : 35)}</text>
          <text x={node.x+26} y={node.y-2} className="money-flow-svg-value">{dollars(node.cents)} · {percent(node.cents,flow.incomeCents)}</text>
        </g>)}

        {layout.nodes.filter(node=>node.parentId).map(node=><g key={node.id}>
          <rect x={node.x} y={node.y} width="16" height={node.height} rx="2" fill={palette[node.parentId!]} />
          <text x={node.x+23} y={node.y+Math.min(14,node.height/2+9)} className="money-flow-svg-label">{nameInGraphic(node.label, 28)}</text>
          <text x={node.x+23} y={node.y+Math.min(31,node.height/2+26)} className="money-flow-svg-value">{dollars(node.cents)} · {percent(node.cents,flow.incomeCents)}</text>
        </g>)}
      </svg>
    </div> : <p className="empty-state" role="status">All recorded monthly amounts are currently zero. There are no positive flows to draw; review the reconciliation table for the exact recorded totals.</p>}

    <div className="money-flow-explainer">Ribbon widths represent monthly amounts, with a small visual minimum for tiny categories. All percentages use <strong>recorded monthly income</strong> as their denominator, so commitments can exceed 100% when over budget. The unfunded gap is not income. Remaining monthly cash flow is <strong>not guaranteed discretionary spending or automatically saved money.</strong></div>

    <div className="money-flow-detail" role="status" aria-live="polite">
      {selected
        ? <span><strong>{selected.label}</strong> · {dollars(selected.cents)} per month · {shareLabel(selected.cents)}
          {selected.child ? ` · ${percent(selected.cents,flow.branches.find(b=>b.id===selected.parentId)?.cents ?? 0)} of ${flow.branches.find(b=>b.id===selected.parentId)?.label}` : ""}</span>
        : <span>Hover, tap or keyboard-focus a ribbon to inspect its exact amount. Select an expense-group ribbon to toggle categories.</span>}
    </div>

    <div className="money-flow-actions">
      {hasCategories ? <button type="button" className="secondary-button" aria-expanded={showExpenseCategories}
        aria-controls="money-flow-chart" onClick={toggleCategories}>
        {showExpenseCategories ? "Hide expense categories" : "Show expense categories"}
      </button> : <span className="money-flow-no-categories">No positive expense categories to expand.</span>}
      <Link className="secondary-button" href="/financial-profile#expenses">Review saved expenses</Link>
    </div>
    <p className="money-flow-expansion-status" role="status" aria-live="polite">{hasCategories
      ? (showExpenseCategories ? "Category ribbons expanded in the diagram." : "Category ribbons collapsed.")
      : "No category ribbons available."}</p>

    <details className="money-flow-table-disclosure">
      <summary>View accessible monthly reconciliation table</summary>
      <div className="money-flow-table-wrap"><table>
        <caption>Actual household monthly amounts in US dollars. Shares are percentages of recorded income, not of all displayed resources.</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Monthly amount</th><th scope="col">Share of income</th></tr></thead>
        <tbody>
          <tr><th scope="row">Recorded income</th><td>{dollars(flow.incomeCents)}</td><td>{percent(flow.incomeCents,flow.incomeCents)}</td></tr>
          {flow.branches.map(branch=><tr key={branch.id}><th scope="row">{branch.label}</th><td>{dollars(branch.cents)}</td><td>{percent(branch.cents,flow.incomeCents)}</td></tr>)}
          {flow.branches.flatMap(branch=>branch.categories.map(category=><tr key={`${branch.id}:${category.label}`}>
            <th scope="row">↳ {branch.label} / {category.label}</th>
            <td>{dollars(category.cents)}</td>
            <td>{percent(category.cents,flow.incomeCents)}</td>
          </tr>))}
          {flow.shortfallCents>0 ? <tr><th scope="row">Unfunded monthly shortfall (not income)</th><td>{dollars(flow.shortfallCents)}</td><td>{percent(flow.shortfallCents,flow.incomeCents)}</td></tr> : null}
          <tr><th scope="row">Commitments + positive cash flow</th><td>{dollars(flow.commitmentsCents+flow.remainingCents)}</td><td>{percent(flow.commitmentsCents+flow.remainingCents,flow.incomeCents)}</td></tr>
        </tbody>
      </table></div>
      <p className="muted">Expense category rows are children of expense groups and must not be added to the total again. Where commitments exceed income, their difference is explicitly unfunded.</p>
    </details>
  </section>;
}
