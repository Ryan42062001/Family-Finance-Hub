import Link from "next/link";
import { redirect } from "next/navigation";
import { saveBillSchedule } from "./actions";
import { SetAsides, type SetAsideFeedback } from "./SetAsides";
import type { SetAsideError, SetAsideForm } from "./set-aside-actions";
import { buildBillsView, UPCOMING_DAYS, type Bill, type BillsView } from "@/lib/bills/bills-view";
import { formatCents, MAX_DATE, MIN_DATE, RECURRENCE_LABEL, reminderLabel } from "@/lib/bills/schedule";
import { todayUtc } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { BillsDataError, loadBills } from "@/lib/supabase/bills";
import { loadSetAsides } from "@/lib/supabase/set-asides";
import { buildSetAsideSection, occurrenceKey, type ForecastAnnotation, type SetAsideSection } from "@/lib/bills/set-aside-view";
import { UUID } from "@/lib/bills/set-aside-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ saved?: string; error?: string; sa_notice?: string; sa_form?: string; sa_error?: string; sa_bill?: string }> };

// Fixed, allowlisted messages; the text never comes from the URL.
const ERRORS: Record<string, string> = {
  read_only: "Viewers can see bills and export the plan, but only an owner or member can change due dates.",
  not_saved: "Not saved. The bill may have been removed, or you no longer have permission to change it.",
  changed: "Not saved: this bill's due date or how often it repeats was changed in the meantime. Review it and save again.",
};

// FFH-P11 set-aside outcomes; fixed, allowlisted text (never taken from the URL).
const SET_ASIDE_NOTICES: Record<string, string> = {
  started: "Set-aside tracking started.",
  updated: "Reported set-aside amount saved.",
  cycle: "Next cycle confirmed.",
  stopped: "Set-aside tracking stopped. The bill itself is unchanged.",
};
const SET_ASIDE_FORMS: readonly SetAsideForm[] = ["start", "update", "cycle", "stop"];
const SET_ASIDE_ERRORS: readonly SetAsideError[] = ["amount_missing", "amount_invalid", "confirm_missing", "changed", "exists", "not_eligible", "not_saved", "read_only"];

function setAsideFeedback(params: Awaited<PageProps["searchParams"]>): SetAsideFeedback {
  const form = SET_ASIDE_FORMS.find((f) => f === params.sa_form);
  const error = SET_ASIDE_ERRORS.find((e) => e === params.sa_error);
  return form && error && typeof params.sa_bill === "string" && UUID.test(params.sa_bill) ? { form, error, expenseId: params.sa_bill } : null;
}

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
      {/* The schedule this form was rendered from (audit P09-01); the server refuses the save if it has changed. */}
      <input type="hidden" name="shown_due" value={bill.nextDue ?? ""} />
      <input type="hidden" name="expected_anchor" value={bill.anchor ?? ""} />
      <input type="hidden" name="expected_recurrence" value={bill.recurrence} />
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
      {bill.kind === "expense" ? <p className="field-hint">To change the amount or how often it repeats, edit it in <Link href="/financial-profile#expenses">Financial profile</Link>.</p> : <p className="field-hint">The minimum payment is set in <Link href="/financial-profile#debts">Financial profile</Link>.</p>}
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

function annotationText(a: ForecastAnnotation) {
  const r = a.item.result;
  if (a.kind === "needs_confirmation") return "Set-aside: cycle confirmation needed";
  if (r.status === "funded" || ((r.status === "due_now") && r.remainingCents === 0)) return `Set-aside: fully funded (${formatCents(r.reservedCents)} reported)`;
  return `Set-aside: ${formatCents(r.reservedCents)} of ${formatCents(r.targetCents!)} reported (${r.progressPercent}%), ${formatCents(r.remainingCents!)} still needed`;
}

function Forecast({ view, annotations }: { view: BillsView; annotations: Map<string, ForecastAnnotation> }) {
  return <details className="bento-card bill-forecast">
    <summary><span>12-month forecast of actual payments</span><b>{formatCents(view.forecastTotalCents)}</b></summary>
    <p className="muted">Each scheduled payment on its due date, for the rest of {monthLabel(view.forecast[0].month)} and the next 11 months. These are the actual amounts due, not monthly averages. Bills without a due date are not included. Set-aside notes are information only and don&apos;t change these amounts.</p>
    <ol className="bill-forecast-months">{view.forecast.map((month) => <li key={month.month}>
      <details>
        <summary><span>{monthLabel(month.month)}{month === view.forecast[0] ? " (from today)" : ""}</span><span>{month.occurrences.length} {month.occurrences.length === 1 ? "payment" : "payments"} · <b>{formatCents(month.totalCents)}</b></span></summary>
        {month.occurrences.length ? <ul className="bill-occurrences">{month.occurrences.map((o) => <li key={`${o.bill.kind}-${o.bill.id}-${o.date}`}><span>{dateLabel(o.date)}</span><span>{o.bill.name}</span><b>{formatCents(o.bill.paymentCents)}</b>{annotations.has(occurrenceKey(o.bill, o.date)) ? <small className="set-aside-note">{annotationText(annotations.get(occurrenceKey(o.bill, o.date))!)}</small> : null}</li>)}</ul> : <p className="muted">No scheduled payments.</p>}
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
  const supabase = await createClient();
  try {
    view = buildBillsView(await loadBills(supabase, authority.householdId), today);
  } catch (caught) {
    if (!(caught instanceof BillsDataError) && !(caught instanceof RangeError)) throw caught;
  }
  // FFH-P11: a separate model; a problem here hides only the set-aside section, never the P09 bills.
  let setAsides: SetAsideSection | null = null;
  if (view) {
    try {
      setAsides = buildSetAsideSection(view, await loadSetAsides(supabase, authority.householdId), today);
    } catch (caught) {
      if (!(caught instanceof BillsDataError) && !(caught instanceof RangeError)) throw caught;
    }
  }
  const saNotice = typeof params.sa_notice === "string" && Object.hasOwn(SET_ASIDE_NOTICES, params.sa_notice) ? SET_ASIDE_NOTICES[params.sa_notice] : null;

  return (
    <main className="page-shell bills-page">
      <section className="hero-card">
        <div><p className="eyebrow">Bills &amp; due dates</p><h1>What&apos;s due and when</h1><p className="muted">Your household&apos;s expenses and debt payments with their due dates. This page doesn&apos;t track payments: when a due date passes it simply moves to the next one.</p></div>
      </section>
      {params.saved === "1" ? <p className="form-success" role="status">Due date saved.</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {saNotice ? <p className="form-success" role="status">{saNotice}</p> : null}
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

        <SetAsides section={setAsides} canEdit={canEdit} feedback={setAsideFeedback(params)} />

        <Forecast view={view} annotations={setAsides?.annotations ?? new Map()} />
        <p className="plan-footnote muted">Dates are calendar dates (today is {dateLabel(today)}). Reminders appear only on this page and on Your plan; no emails or notifications are sent. Due dates are a schedule only: this page does not track payments.</p>
      </>}
    </main>
  );
}
