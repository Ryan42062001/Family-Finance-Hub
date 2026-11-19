import Link from "next/link";
import { redirect } from "next/navigation";
import PrintButton from "@/components/plan/PrintButton";
import { MoneyPrioritySnapshotValidationError } from "@/lib/calculations/money-priority-snapshot";
import { formatPlanMoney } from "@/lib/plan/money-plan";
import { planStepsInOrder } from "@/lib/plan/plan-csv";
import { planFromSnapshot, todayUtc, type PlanResult } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";

export const dynamic = "force-dynamic";

const monthLabel = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

// FFH-P09: print-optimised view of the CURRENT authoritative Money Plan (the same engine result as /plan), for the
// browser's Print / Save as PDF. Server-rendered from the signed-in person's own household; nothing is stored.
// No emails, internal ids or technical diagnostics are shown.
export default async function PlanPrintPage() {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");

  let plan: PlanResult;
  try {
    plan = planFromSnapshot(await loadMoneyPrioritySnapshot(authority.householdId), todayUtc());
  } catch (error) {
    if (!(error instanceof MoneyPrioritySnapshotValidationError)) throw error;
    plan = { ok: false, reason: "Some saved numbers are invalid, so no plan is shown. Review your Financial profile." };
  }

  return <main className="page-shell plan-print">
    <div className="print-toolbar no-print">
      <Link href="/plan">← Back to your plan</Link>
      {plan.ok ? <PrintButton /> : null}
    </div>
    {!plan.ok ? <section className="bento-card plan-unavailable" role="status"><strong>No plan right now</strong><p>{plan.reason}</p></section> : <>
      <header className="print-header">
        <h1>Your money plan</h1>
        <p>As of {plan.view.asOfDate}. Calculated from your saved financial profile.</p>
      </header>

      <section className="print-section" aria-labelledby="print-summary">
        <h2 id="print-summary">Summary</h2>
        <dl className="print-summary">
          <div><dt>This month</dt><dd>{plan.view.feasibility.label}. {formatPlanMoney(plan.view.feasibility.monthlyPlanCapacity)} available after essentials and minimums{plan.view.feasibility.fundingGap > 0 ? `; ${formatPlanMoney(plan.view.feasibility.fundingGap)} short of protected needs` : ""}.</dd></div>
          <div><dt>Months of cushion</dt><dd>{plan.cushion.kind === "months" ? `${plan.cushion.months.toFixed(1)} months of essential spending` : plan.cushion.reason}</dd></div>
          <div><dt>Debt-free date</dt><dd>{plan.debtFree.kind === "date" ? `${monthLabel(plan.debtFree.date)}, at today's total minimums (${formatPlanMoney(plan.debtMinimums)}/mo)` : plan.debtFree.kind === "none" ? "No debts with a balance are recorded" : plan.debtFree.kind === "not_reached" ? "Not within 100 years at today's minimum payments" : plan.debtFree.reason}</dd></div>
        </dl>
      </section>

      <section className="print-section" aria-labelledby="print-steps">
        <h2 id="print-steps">Steps, in order</h2>
        {planStepsInOrder(plan.view).length ? <ol className="print-steps">{planStepsInOrder(plan.view).map((step) => <li key={step.id}>
          <h3>{step.title} <span className="print-status">({step.stateLabel})</span></h3>
          <p><strong>{step.monthlyAmount !== null && step.monthlyAmount > 0 ? `${formatPlanMoney(step.monthlyAmount)}/month` : "No monthly amount for this step"}</strong>{step.destinations.length ? ` → ${step.destinations.join(", ")}` : ""}</p>
          <p>{step.explanation}</p>
          {([["Why now", step.whyNow], ["Trade-offs", step.tradeoffs], ["Assumptions", step.assumptions]] as const).filter(([, items]) => items.length).map(([heading, items]) => <div key={heading}><strong>{heading}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
        </li>)}</ol> : <p>No steps yet.</p>}
      </section>

      {plan.view.missing.length ? <section className="print-section" aria-labelledby="print-missing">
        <h2 id="print-missing">What&apos;s missing</h2>
        {plan.view.missing.map((group, index) => <div key={group.title ?? `other-${index}`}><strong>{group.title ?? "Also needed for the steps above"}</strong><ul>{group.items.map((item) => <li key={item.text}>{item.text}</li>)}</ul></div>)}
      </section> : null}

      <section className="print-section" aria-labelledby="print-notes">
        <h2 id="print-notes">Warnings and assumptions</h2>
        <ul>
          {plan.view.notes.map((note) => <li key={note}>{note}</li>)}
          <li>Amounts are monthly and exact to the cent. Yearly and every-3-months bills are budgeted as monthly averages rounded up to the cent; they are not automatic transfers.</li>
          <li>This is planning guidance from your recorded numbers, not financial advice.</li>
        </ul>
      </section>
    </>}
  </main>;
}
