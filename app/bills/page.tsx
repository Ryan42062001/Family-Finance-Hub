import Link from "next/link";
import { redirect } from "next/navigation";
import { saveBillSchedule } from "./actions";
import { buildBillsView, UPCOMING_DAYS, type Bill, type BillsView } from "@/lib/bills/bills-view";
import { formatCents, MAX_DATE, MIN_DATE, RECURRENCE_LABEL, reminderLabel } from "@/lib/bills/schedule";
import { todayUtc } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { BillsDataError, loadBills } from "@/lib/supabase/bills";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ saved?: string; error?: string }> };

// Fixed, allowlisted messages; the text never comes from the URL.
const ERRORS: Record<string, string> = {
  read_only: "Viewers can see bills and export the plan, but only an owner or member can change due dates.",
  not_saved: "Not saved. The bill may have been removed, or you no longer have permission to change it.",
};

const dateLabel = (iso: string, withYear = true) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: withYear ? undefined : "short", month: "short", day: "numeric", year: withYear ? "numeric" : undefined, timeZone: "UTC" });
const monthLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function when(bill: Bill) {
  if (bill.daysUntil === null) return "No due date";
  if (bill.daysUntil === 0) return "Due today";
  if (bill.daysUntil === 1) return "Due tomorrow";
  return `Due in ${bill.daysUntil} days`;
}

function amountLine(bill: Bill) {
  if (bill.kind === "debt") return <>{formatCents(bill.paymentCents)} minimum payment, monthly</>;
  if (bill.recurrence === "monthly") return <>{formatCents(bill.paymentCents)} monthly</>;
  return <>{formatCents(bill.paymentCents)} {RECURRENCE_LABEL[bill.recurrence].toLowerCase()} · <span className="muted">{formatCents(bill.monthlyCents)}/mo planning amount</span></>;
}

function ScheduleForm({ bill }: { bill: Bill }) {
  const reminder = bill.reminder === null ? "off" : String(bill.reminder);
  return <details className="edit-panel bill-schedule-edit">
    <summary>{bill.anchor ? "Change due date or reminder" : "Add a due date"}</summary>
    <form className="data-form friendly-form" action={saveBillSchedule}>
      <input type="hidden" name="kind" value={bill.kind} />
      <input type="hidden" name="id" value={bill.id} />
      <label className="field">
        <span className="field-label">Next due date</span>
        <input type="date" name="due_date" min={MIN_DATE} max={MAX_DATE} defaultValue={bill.nextDue ?? ""} />
        <small className="field-hint">Later dates repeat {bill.kind === "debt" ? "monthly" : RECURRENCE_LABEL[bill.recurrence].toLowerCase()} from this date. Leave blank to remove the due date.</small>
      </label>
      <fieldset className="choice choice-pills">
        <legend>Reminder on this page (everyone in the household sees it)</legend>
        <div className="choice-options">
          {(["off", "0", "1", "3", "7"] as const).map((value) => <label key={value} className="choice-option">
            <input type="radio" name="reminder" value={value} defaultChecked={reminder === value} />
            <span className="choice-face"><span>{reminderLabel(value === "off" ? null : (Number(value) as 0 | 1 | 3 | 7))}</span></span>
          </label>)}
        </div>
      </fieldset>
      <button type="submit">Save due date</button>
      {bill.kind === "expense" ? <p className="field-hint">To change the amount or how often it is paid, edit it in <Link href="/financial-profile#expenses">Financial profile</Link>.</p> : <p className="field-hint">The minimum payment is set in <Link href="/financial-profile#debts">Financial profile</Link>.</p>}
    </form>
  </details>;
}

function BillRow({ bill, canEdit }: { bill: Bill; canEdit: boolean }) {
  return <li className="bill-row">
    <div className="bill-row-main">
      <strong>{bill.name}</strong>
      <small>{amountLine(bill)}</small>
      <small>{bill.nextDue ? <>Next due <b>{dateLabel(bill.nextDue)}</b> · {when(bill)} · Reminder: {reminderLabel(bill.reminder)}</> : "No due date set"}</small>
    </div>
    <span className="bill-kind">{bill.kind === "debt" ? "Debt" : "Expense"}</span>
    {canEdit ? <ScheduleForm bill={bill} /> : null}
  </li>;
}

function Forecast({ view }: { view: BillsView }) {
  return <details className="bento-card bill-forecast">
    <summary><span>12-month forecast of actual payments</span><b>{formatCents(view.forecastTotalCents)}</b></summary>
    <p className="muted">Each scheduled payment on its due date, for the rest of {monthLabel(view.forecast[0].month)} and the next 11 months. These are the actual amounts due, not monthly averages. Bills without a due date are not included.</p>
    <ol className="bill-forecast-months">{view.forecast.map((month) => <li key={month.month}>
      <details>
        <summary><span>{monthLabel(month.month)}{month === view.forecast[0] ? " (from today)" : ""}</span><span>{month.occurrences.length} {month.occurrences.length === 1 ? "payment" : "payments"} · <b>{formatCents(month.totalCents)}</b></span></summary>
        {month.occurrences.length ? <ul className="bill-occurrences">{month.occurrences.map((o) => <li key={`${o.bill.kind}-${o.bill.id}-${o.date}`}><span>{dateLabel(o.date)}</span><span>{o.bill.name}</span><b>{formatCents(o.bill.paymentCents)}</b></li>)}</ul> : <p className="muted">No scheduled payments.</p>}
      </details>
    </li>)}</ol>
  </details>;
}

export default async function BillsPage({ searchParams }: PageProps) {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");
  const canEdit = authority.role === "owner" || authority.role === "member";
  const params = await searchParams;
  const error = typeof params.error === "string" && Object.hasOwn(ERRORS, params.error) ? ERRORS[params.error] : null;

  const today = todayUtc();
  let view: BillsView | null = null;
  try {
    view = buildBillsView(await loadBills(await createClient(), authority.householdId), today);
  } catch (caught) {
    if (!(caught instanceof BillsDataError) && !(caught instanceof RangeError)) throw caught;
  }

  return (
    <main className="page-shell bills-page">
      <section className="hero-card">
        <div><p className="eyebrow">Bills &amp; due dates</p><h1>What&apos;s due and when</h1><p className="muted">Your household&apos;s expenses and debt payments with their due dates. This page doesn&apos;t track payments: when a due date passes it simply moves to the next one.</p></div>
      </section>
      {params.saved === "1" ? <p className="form-success" role="status">Due date saved.</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {!view ? <section className="bento-card plan-unavailable" role="status"><strong>Bills can&apos;t be shown right now</strong><p>Some saved bill details are invalid. Review your expenses and debts in Financial profile.</p><Link className="secondary-button" href="/financial-profile">Open Financial profile</Link></section> : <>
        {view.reminders.length ? <section className="dashboard-notice bill-reminders" role="status" aria-labelledby="bill-reminders-heading">
          <div><strong id="bill-reminders-heading">Due soon</strong>
            <ul>{view.reminders.map((bill) => <li key={`${bill.kind}-${bill.id}`}>{bill.name}: {formatCents(bill.paymentCents)} · {when(bill).toLowerCase()} ({dateLabel(bill.nextDue!)})</li>)}</ul>
          </div>
        </section> : null}

        <section className="plan-badges" aria-label="Bills summary">
          <article className="bento-card"><p className="metric-label">Due in the next {UPCOMING_DAYS} days</p><strong className="bento-number">{formatCents(view.upcomingTotalCents)}</strong><span className="bento-caption">{view.upcoming.length} {view.upcoming.length === 1 ? "payment" : "payments"}, actual amounts, {dateLabel(view.today)} to {dateLabel(view.upcomingEnd)}</span></article>
          <article className="bento-card"><p className="metric-label">Monthly planning amount</p><strong className="bento-number">{formatCents(view.monthlyEquivalentCents.total)}</strong><span className="bento-caption">What your plan budgets each month for these bills ({formatCents(view.monthlyEquivalentCents.expenses)} expenses + {formatCents(view.monthlyEquivalentCents.debts)} debt minimums). Yearly and every-3-months bills are averaged and rounded up to the cent.</span></article>
          <article className="bento-card"><p className="metric-label">Without a due date</p><strong className="bento-number">{view.unscheduled.length}</strong><span className="bento-caption">Still counted in your monthly plan; not shown in dates or the forecast</span></article>
        </section>

        <section className="bento-card" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading">Upcoming {UPCOMING_DAYS} days <span className="muted">({view.upcoming.length})</span></h2>
          {view.upcoming.length ? <ul className="bill-occurrences">{view.upcoming.map((o) => <li key={`${o.bill.kind}-${o.bill.id}-${o.date}`}><span>{dateLabel(o.date)}</span><span>{o.bill.name}</span><b>{formatCents(o.bill.paymentCents)}</b></li>)}</ul>
            : <p className="empty-state">Nothing is scheduled in the next {UPCOMING_DAYS} days.</p>}
        </section>

        <section className="bento-card" aria-labelledby="all-bills-heading">
          <h2 id="all-bills-heading">All bills <span className="muted">({view.scheduled.length})</span></h2>
          <p className="muted">By next due date.</p>
          {view.scheduled.length ? <ul className="bill-list">{view.scheduled.map((bill) => <BillRow key={`${bill.kind}-${bill.id}`} bill={bill} canEdit={canEdit} />)}</ul>
            : <p className="empty-state">No bills have a due date yet.{canEdit ? " Add one below." : ""}</p>}
        </section>

        <section className="bento-card" aria-labelledby="unscheduled-heading">
          <h2 id="unscheduled-heading">Unscheduled <span className="muted">({view.unscheduled.length})</span></h2>
          <p className="muted">Expenses and debts without a due date. They still count in your monthly plan.</p>
          {view.unscheduled.length ? <ul className="bill-list">{view.unscheduled.map((bill) => <BillRow key={`${bill.kind}-${bill.id}`} bill={bill} canEdit={canEdit} />)}</ul>
            : <p className="empty-state">Every bill has a due date.</p>}
          {canEdit ? null : <p className="muted">You can view bills; an owner or member can change due dates.</p>}
        </section>

        <Forecast view={view} />
        <p className="plan-footnote muted">Dates are calendar dates (today is {dateLabel(today)}). Reminders appear only on this page and on Your plan; no emails or notifications are sent. Nothing here records whether a bill was paid.</p>
      </>}
    </main>
  );
}
