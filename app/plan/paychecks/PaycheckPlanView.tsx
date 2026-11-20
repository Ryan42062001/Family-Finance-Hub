import Link from "next/link";
import type { ReactNode } from "react";
import { removePaySchedule, savePaySchedule, type ScheduleError, type ScheduleNotice } from "./actions";
import { formatCents, MAX_DATE, MIN_DATE } from "@/lib/bills/schedule";
import { FIELD_ERROR_TEXT, FIELD_OF_ERROR, type ScheduleField, type ScheduleFieldError } from "@/lib/paychecks/form";
import { FREQUENCY_LABEL, PAY_FREQUENCIES, type PaySchedule } from "@/lib/paychecks/schedule";
import type { BillLine, IncomeFact, Interval, PaycheckPlan, StepLine, Uncertainty } from "@/lib/paychecks/plan";

// FFH-P12 per-paycheck plan (issue #203). Server-rendered; native controls; no client script. Wording rules:
// deposits are "expected", plan amounts are "recommended", a positive remainder is "estimated" (and only when nothing
// material is missing), a negative one is a "shortfall". Nothing is called a balance, a payment or a transfer.

export type ScheduleSetup = { income: IncomeFact; schedule: PaySchedule | null; fingerprint: string };
export type ScheduleFeedback = { incomeId: string; notice: ScheduleNotice } | { incomeId: string; error: ScheduleError } | null;

const money = (cents: number) => (cents < 0 ? `−${formatCents(-cents)}` : formatCents(cents));
const dateLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function uncertaintyText(u: Uncertainty): string {
  switch (u.kind) {
    case "variable": return `${u.source}'s pay varies, so this deposit is an estimate.`;
    case "irregular": return `${u.source} is irregular income: only the one deposit you entered is counted, and it isn't assumed to repeat.`;
    case "zero_deposit": return `${u.source}'s expected deposit is $0.00, so it can't carry any spending or plan step.`;
    case "no_following_deposit": return `No following deposit is expected, so bills after ${dateLabel(u.through)} aren't included here.`;
    case "month_unapportioned": return `No expected deposit in ${monthLabel(u.month)} can carry that month's spending and plan steps.`;
    case "income_mismatch": return "A paycheck schedule doesn't match its income's monthly amount. Reconcile it under Pay schedules.";
    case "unscheduled_income": return "Some income has no paycheck schedule, so it isn't in this timeline, but your plan counts it.";
    case "no_plan": return "Your plan can't be worked out right now, so its steps aren't included.";
  }
}

const COVERAGE_LABEL: Record<StepLine["coverage"], string> = { covered: "Fits this paycheck", partly: "Only partly fits", not_covered: "Doesn't fit this paycheck" };

function Outcome({ interval }: { interval: Interval }) {
  if (interval.outcome === "shortfall") return <p className="paycheck-outcome paycheck-outcome-shortfall"><span>Expected shortfall</span><b>{money(interval.resultCents)}</b></p>;
  if (interval.outcome === "not_confirmed") return <p className="paycheck-outcome paycheck-outcome-unconfirmed"><span>Possibly left over — not confirmed (more information needed)</span><b>{formatCents(interval.resultCents)}</b></p>;
  return <p className="paycheck-outcome paycheck-outcome-left"><span>Estimated left over (an estimate, not money in your account)</span><b>{formatCents(interval.resultCents)}</b></p>;
}

function BillItem({ bill }: { bill: BillLine }) {
  return <li>
    <span>{dateLabel(bill.date)}</span><span>{bill.name}</span><b>{formatCents(bill.cents)}</b>
    {bill.dueOnPayday ? <small className="paycheck-flag">Due on payday: the deposit may not clear before this is due.</small> : null}
    {bill.nextMonth ? <small className="paycheck-flag">Due next month, before the following deposit, so it comes from this paycheck.</small> : null}
    {bill.recurrence !== "monthly" ? <small className="muted">The full {bill.recurrence === "yearly" ? "yearly" : "every-3-months"} amount is due on this date (your plan budgets {formatCents(bill.monthlyCents)}/mo for it; that monthly amount isn&apos;t counted again here).</small> : null}
    {bill.setAsideCents !== null ? <small className="muted">You reported {formatCents(bill.setAsideCents)} set aside for this bill. Context only: it isn&apos;t checked against any account and isn&apos;t subtracted here.</small> : null}
  </li>;
}

function Steps({ steps, max }: { steps: StepLine[]; max?: number }) {
  const shown = max ? steps.slice(0, max) : steps;
  return <ol className="paycheck-steps">{shown.map((s) => <li key={s.id} className={`paycheck-step paycheck-step-${s.coverage}`}>
    <span className="paycheck-step-title">{s.rank}. {s.title} <small className="muted">({s.stateLabel})</small></span>
    <span><b>{formatCents(s.shareCents)}</b> <small className="muted">of {formatCents(s.monthlyCents)}/mo</small></span>
    <small className="paycheck-coverage">{COVERAGE_LABEL[s.coverage]}{s.coverage === "partly" ? `: about ${formatCents(s.supportedCents)} of it` : ""}</small>
  </li>)}</ol>;
}

function IntervalCard({ interval, open, simple }: { interval: Interval; open: boolean; simple: boolean }) {
  const id = `paycheck-${interval.date}`;
  return <li className="paycheck-card" aria-labelledby={`${id}-heading`}>
    <details open={open}>
      <summary>
        <h3 id={`${id}-heading`}>{dateLabel(interval.date)}</h3>
        <span>Expected {formatCents(interval.depositsCents)}</span>
        <span className={`paycheck-badge paycheck-badge-${interval.outcome}`}>{interval.outcome === "shortfall" ? `Shortfall ${money(interval.resultCents)}` : interval.outcome === "not_confirmed" ? "Not confirmed" : `About ${formatCents(interval.resultCents)} left`}</span>
      </summary>
      <div className="paycheck-card-body">
        <p className="muted">{interval.endDate ? <>Covers {dateLabel(interval.date)} to {dateLabel(interval.endDate)}, the day before the next expected deposit.</> : <>No following deposit is expected yet.</>}</p>
        <h4>Expected deposits</h4>
        <ul className="paycheck-lines">{interval.deposits.map((d) => <li key={d.key}><span>{d.sourceName}{d.ownerName ? ` (${d.ownerName})` : ""}</span><span className="muted">{FREQUENCY_LABEL[d.frequency]}</span><b>{formatCents(d.cents)}</b></li>)}</ul>
        <h4>Bills due before the next deposit <span className="muted">({formatCents(interval.billsCents)})</span></h4>
        {interval.bills.length ? <ul className="bill-occurrences">{interval.bills.map((b) => <BillItem key={`${b.kind}-${b.billId}-${b.date}`} bill={b} />)}</ul> : <p className="muted">No scheduled bills in this period.</p>}
        <h4>Everyday spending (monthly averages, this paycheck&apos;s share)</h4>
        {interval.allowancesCents === null ? <p className="paycheck-flag">Can&apos;t be worked out: no deposit this month can carry it.</p>
          : interval.allowances.length ? <ul className="paycheck-lines">{interval.allowances.map((a) => <li key={a.key}><span>{a.label}</span><b>{formatCents(a.cents)}</b></li>)}</ul>
          : <p className="muted">None: every expense and debt has a due date (counted above).</p>}
        <p className="paycheck-subtotal"><span>After bills and spending</span><b>{money(interval.afterSpendingCents)}</b></p>
        <h4>Your plan&apos;s steps (this paycheck&apos;s share, in plan order)</h4>
        {interval.stepsCents === null ? <p className="paycheck-flag">Can&apos;t be worked out: no deposit this month can carry them.</p>
          : interval.steps.length ? <Steps steps={interval.steps} max={simple ? 3 : undefined} /> : <p className="muted">No plan step with a monthly amount.</p>}
        <Outcome interval={interval} />
        {interval.uncertainties.length ? <ul className="paycheck-warnings" aria-label="Why this isn't confirmed">{interval.uncertainties.map((u) => <li key={JSON.stringify(u)}>{uncertaintyText(u)}</li>)}</ul> : null}
        {simple ? null : <details className="paycheck-how">
          <summary>How this was calculated</summary>
          <ul>
            <li>Expected deposits {formatCents(interval.depositsCents)} − scheduled bills {formatCents(interval.billsCents)} − everyday spending {interval.allowancesCents === null ? "(unknown)" : formatCents(interval.allowancesCents)} − plan steps {interval.stepsCents === null ? "(unknown)" : formatCents(interval.stepsCents)} = {money(interval.resultCents)}.</li>
            <li>Bills count at their actual amount on their actual due date. Their monthly planning amounts are not added again.</li>
            {interval.monthNote ? <li>{monthLabel(interval.monthNote.month)}&apos;s monthly spending and plan amounts are shared across all {interval.monthNote.deposits} expected {interval.monthNote.deposits === 1 ? "deposit" : "deposits"} that month by their size{interval.monthNote.passed ? `, including ${interval.monthNote.passed} that already happened` : ""}, to the cent. More paychecks in a month share the same amount, they don&apos;t add to it.</li> : null}
            <li>Plan steps keep your plan&apos;s order. When this paycheck runs out, later steps show as not fitting; a later paycheck is never used to cover this one.</li>
            <li>Retirement contributions already taken out of your pay aren&apos;t counted again: these are take-home amounts.</li>
          </ul>
        </details>}
      </div>
    </details>
  </li>;
}

function Warnings({ plan, setups }: { plan: PaycheckPlan; setups: ScheduleSetup[] }) {
  const items: Array<{ key: string; node: ReactNode }> = [];
  if (plan.prePayday.bills.length) items.push({ key: "pre", node: <>Bills due before {plan.prePayday.until ? <>the first expected deposit ({dateLabel(plan.prePayday.until)})</> : "any expected deposit"}: <b>{formatCents(plan.prePayday.totalCents)}</b>. No expected paycheck covers them.</> });
  for (const r of plan.reconciliation) if (r.matches === false) items.push({ key: `mm-${r.sourceId}`, node: <>Income mismatch for <b>{r.sourceName}</b>: {formatCents(r.depositCents)} {FREQUENCY_LABEL[r.frequency].toLowerCase()} is about {formatCents(r.equivalentCents!)} a month, but its monthly amount is {formatCents(r.monthlyCents)}. Your plan uses the monthly amount; check which is right.</> });
  if (plan.unscheduledIncome.length) items.push({ key: "unsched", node: <>No paycheck schedule yet for {plan.unscheduledIncome.map((i) => i.name).join(", ")}. More information needed: your plan counts this income, but this timeline can&apos;t place it.</> });
  for (const name of plan.passedIrregular) items.push({ key: `passed-${name}`, node: <>The expected date for {name} has passed. Enter the next expected deposit.</> });
  for (const name of plan.inactiveScheduled) items.push({ key: `inactive-${name}`, node: <>{name} is marked inactive in Financial profile, so its schedule isn&apos;t used.</> });
  for (const m of plan.unsharedMonths) if (m.stepsCents || m.allowancesCents) items.push({ key: `month-${m.month}`, node: <>{monthLabel(m.month)}: {m.reason === "no_deposits" ? "no expected deposit is known" : "every expected deposit is $0.00"}, so {formatCents(m.stepsCents)} of plan steps and {formatCents(m.allowancesCents)} of everyday spending have no paycheck to come from.</> });
  if (!plan.planAvailable) items.push({ key: "plan", node: <>Your plan can&apos;t be worked out right now, so its steps aren&apos;t included. <Link href="/plan">Open Your plan</Link>.</> });
  if (!setups.length) items.push({ key: "noincome", node: <>No income is recorded yet. <Link href="/financial-profile#income">Add income in Financial profile</Link>.</> });
  if (!items.length) return null;
  return <section className="dashboard-notice paycheck-warnings-banner" role="status" aria-labelledby="paycheck-warnings-heading">
    <div><strong id="paycheck-warnings-heading">Check before relying on this</strong><ul>{items.map((i) => <li key={i.key}>{i.node}</li>)}</ul></div>
  </section>;
}

function NextSummary({ plan }: { plan: PaycheckPlan }) {
  const next = plan.intervals[0];
  if (!next) return null;
  return <section className="plan-badges paycheck-summary" aria-label="Next expected paycheck">
    <article className="bento-card"><p className="metric-label">Next expected deposit</p><strong className="bento-number">{formatCents(next.depositsCents)}</strong><span className="bento-caption">{dateLabel(next.date)} · {next.deposits.map((d) => d.sourceName).join(" + ")}</span></article>
    <article className="bento-card"><p className="metric-label">Bills before the following deposit</p><strong className="bento-number">{formatCents(next.billsCents)}</strong><span className="bento-caption">{next.bills.length} {next.bills.length === 1 ? "bill" : "bills"}, actual amounts{next.endDate ? `, through ${dateLabel(next.endDate)}` : ""}</span></article>
    <article className="bento-card"><p className="metric-label">Plan steps for this paycheck</p><strong className="bento-number">{next.stepsCents === null ? "Unknown" : formatCents(next.stepsCents)}</strong><span className="bento-caption">Recommended, not yet done</span></article>
    <article className="bento-card"><p className="metric-label">{next.outcome === "shortfall" ? "Expected shortfall" : next.outcome === "not_confirmed" ? "Left over (not confirmed)" : "Estimated left over"}</p><strong className={`bento-number paycheck-result-${next.outcome}`}>{money(next.resultCents)}</strong><span className="bento-caption">{next.outcome === "estimated_left" ? "An estimate, not money in your account" : next.outcome === "shortfall" ? "Bills, spending and plan steps are more than this paycheck" : "More information needed"}</span></article>
  </section>;
}

// ---- Schedule setup (guided input: nothing pre-answered, blank is never $0) ---------------------------------------------

function fieldError(feedback: ScheduleFeedback, incomeId: string, field: ScheduleField): ScheduleFieldError | null {
  if (!feedback || feedback.incomeId !== incomeId || !("error" in feedback)) return null;
  const error = feedback.error as ScheduleFieldError;
  return Object.hasOwn(FIELD_OF_ERROR, error) && FIELD_OF_ERROR[error] === field ? error : null;
}

const FORM_MESSAGES: Partial<Record<ScheduleError, string>> = {
  changed: "Not saved: this income or its schedule changed in the meantime (in another tab, by someone else in your household, or the income was paused). Review the latest details and try again.",
  exists: "Not saved: this income already has a pay schedule. Reload to see it.",
  inactive: "Not saved: this income is marked inactive in Financial profile.",
  not_saved: "Not saved. The income may have been removed, or you no longer have permission to change it.",
  read_only: "Viewers can see paycheck plans; only an owner or member can change pay schedules.",
  confirm_missing: "Tick the box to confirm removing this pay schedule.",
};

function ScheduleForm({ setup, feedback }: { setup: ScheduleSetup; feedback: ScheduleFeedback }) {
  const { income, schedule } = setup;
  const base = `schedule-${income.id}`;
  const err = (field: ScheduleField) => fieldError(feedback, income.id, field);
  const described = (field: ScheduleField, hint = true) => [hint ? `${base}-${field}-hint` : null, err(field) ? `${base}-${field}-error` : null].filter(Boolean).join(" ") || undefined;
  const message = (field: ScheduleField) => { const e = err(field); return e ? <small id={`${base}-${field}-error`} className="field-error">{FIELD_ERROR_TEXT[e]}</small> : null; };
  const formError = feedback && feedback.incomeId === income.id && "error" in feedback ? FORM_MESSAGES[feedback.error] : undefined;
  const anyFieldError = (["frequency", "amount", "next_date", "days", "net_confirm"] as const).some((f) => err(f));
  return <details className="edit-panel" open={anyFieldError || Boolean(formError && feedback && "error" in feedback && feedback.error !== "confirm_missing")}>
    <summary>{schedule ? "Change this pay schedule" : "Add a pay schedule"}</summary>
    <form className="data-form friendly-form" action={savePaySchedule}>
      <input type="hidden" name="income_source_id" value={income.id} />
      <input type="hidden" name="income_fp" value={setup.fingerprint} />
      {schedule ? <><input type="hidden" name="schedule_id" value={schedule.id} /><input type="hidden" name="version" value={schedule.version} /></> : null}
      {formError && feedback && "error" in feedback && feedback.error !== "confirm_missing" ? <p className="form-error" role="alert">{formError}</p> : null}
      {schedule ? <p className="muted">Enter all the details again; nothing is filled in for you. Currently: {FREQUENCY_LABEL[schedule.frequency].toLowerCase()}, {formatCents(schedule.depositCents)} per deposit, next {dateLabel(schedule.nextDate)}{schedule.dayOne ? `, paydays ${schedule.dayOne} and ${schedule.dayTwo}` : ""}.</p> : null}
      <fieldset className="choice choice-pills" aria-describedby={described("frequency")} aria-invalid={err("frequency") ? true : undefined}>
        <legend>How often does this pay arrive?</legend>
        <div className="choice-options">
          {PAY_FREQUENCIES.map((f, index) => <label key={f} className="choice-option">
            <input type="radio" name="frequency" value={f} required autoFocus={index === 0 && Boolean(err("frequency"))} />
            <span className="choice-face"><span>{FREQUENCY_LABEL[f]}</span></span>
          </label>)}
        </div>
        <small id={`${base}-frequency-hint`} className="field-hint">Irregular counts only the one deposit you enter; it is never repeated. Paydays aren&apos;t moved for weekends or holidays.</small>
        {message("frequency")}
      </fieldset>
      <div className="field">
        <label className="field-label" htmlFor={`${base}-amount`}>Expected take-home amount of one deposit</label>
        <input id={`${base}-amount`} name="amount" type="text" inputMode="decimal" autoComplete="off" required defaultValue=""
          aria-describedby={described("amount")} aria-invalid={err("amount") ? true : undefined} autoFocus={Boolean(err("amount"))} />
        <small id={`${base}-amount-hint`} className="field-hint">What lands in the account after taxes and payroll deductions, for one deposit. Not filled in from the monthly amount ({formatCents(income.monthlyCents)}/mo). Type 0 only if a deposit really is $0.</small>
        {message("amount")}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${base}-next_date`}>Next expected deposit date</label>
        <input id={`${base}-next_date`} name="next_date" type="date" min={MIN_DATE} max={MAX_DATE} required defaultValue=""
          aria-describedby={described("next_date")} aria-invalid={err("next_date") ? true : undefined} autoFocus={Boolean(err("next_date"))} />
        <small id={`${base}-next_date-hint`} className="field-hint">The next deposit still to come. For pay on the 29th–31st, enter a date in a month that has that day so later months keep it.</small>
        {message("next_date")}
      </div>
      <fieldset className="field" aria-describedby={described("days")} aria-invalid={err("days") ? true : undefined}>
        <legend className="field-label">Twice a month only: the two paydays</legend>
        <div className="paycheck-days">
          <label>First payday <select name="day_one" defaultValue="" autoFocus={Boolean(err("days"))}><option value="">Choose</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
          <label>Second payday <select name="day_two" defaultValue=""><option value="">Choose</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
        </div>
        <small id={`${base}-days-hint`} className="field-hint">Days of the month, the first one earlier. A day a month doesn&apos;t have becomes its last day (the 31st is Feb 28). Ignored for other frequencies.</small>
        {message("days")}
      </fieldset>
      <div className="field">
        <label className="set-aside-confirm" htmlFor={`${base}-net`}>
          <input id={`${base}-net`} type="checkbox" name="net_confirm" value="yes" required aria-describedby={err("net_confirm") ? `${base}-net_confirm-error` : undefined}
            aria-invalid={err("net_confirm") ? true : undefined} autoFocus={Boolean(err("net_confirm"))} />
          <span>This is take-home pay for one deposit, not gross pay.</span>
        </label>
        {message("net_confirm")}
      </div>
      <button type="submit">Save pay schedule</button>
      <p className="field-hint">Saving changes only this schedule. Your income&apos;s monthly amount and your plan stay as they are.</p>
    </form>
  </details>;
}

function RemoveForm({ setup, feedback }: { setup: ScheduleSetup; feedback: ScheduleFeedback }) {
  const { income, schedule } = setup;
  if (!schedule) return null;
  const base = `schedule-${income.id}`;
  const error = feedback && feedback.incomeId === income.id && "error" in feedback && feedback.error === "confirm_missing";
  return <details className="edit-panel" open={Boolean(error)}>
    <summary>Remove this pay schedule</summary>
    <form className="data-form friendly-form" action={removePaySchedule}>
      <input type="hidden" name="income_source_id" value={income.id} />
      <input type="hidden" name="schedule_id" value={schedule.id} />
      <input type="hidden" name="version" value={schedule.version} />
      <div className="field">
        <label className="set-aside-confirm" htmlFor={`${base}-remove`}>
          <input id={`${base}-remove`} type="checkbox" name="confirm" value="yes" required aria-describedby={error ? `${base}-remove-error` : undefined} aria-invalid={error || undefined} autoFocus={Boolean(error)} />
          <span>Remove the pay schedule for {income.name}. The income and your plan don&apos;t change.</span>
        </label>
        {error ? <small id={`${base}-remove-error`} className="field-error">{FORM_MESSAGES.confirm_missing}</small> : null}
      </div>
      <button type="submit" className="secondary-button">Remove pay schedule</button>
    </form>
  </details>;
}

function Schedules({ plan, setups, canEdit, feedback }: { plan: PaycheckPlan; setups: ScheduleSetup[]; canEdit: boolean; feedback: ScheduleFeedback }) {
  const recon = new Map(plan.reconciliation.map((r) => [r.sourceId, r]));
  return <section className="bento-card" id="schedules" aria-labelledby="schedules-heading">
    <h2 id="schedules-heading">Pay schedules</h2>
    <p className="muted">One optional schedule per income. Only what you enter here is saved; the timeline above is worked out each time from your current numbers. Your plan keeps using each income&apos;s monthly amount.</p>
    {setups.length ? <ul className="paycheck-schedules">{setups.map((setup) => {
      const { income, schedule } = setup;
      const r = recon.get(income.id);
      const fb = feedback && feedback.incomeId === income.id ? feedback : null;
      return <li key={income.id} id={`schedule-${income.id}`} tabIndex={-1} className="paycheck-schedule">
        <div className="set-aside-head"><h3>{income.name}{income.ownerName ? <small className="muted"> · {income.ownerName}</small> : null}</h3>
          <span className="bill-kind">{!income.isActive ? "Inactive" : schedule ? FREQUENCY_LABEL[schedule.frequency] : "No schedule"}</span></div>
        {fb && "notice" in fb ? <p className="form-success" role="status">{fb.notice === "saved" ? "Pay schedule saved." : "Pay schedule removed. The income itself is unchanged."}</p> : null}
        <dl className="set-aside-amounts">
          <div><dt>Monthly amount in your plan</dt><dd>{formatCents(income.monthlyCents)}/mo{income.isVariable ? <small className="muted"> · varies</small> : null}</dd></div>
          {schedule ? <>
            <div><dt>Expected take-home per deposit</dt><dd>{formatCents(schedule.depositCents)}</dd></div>
            <div><dt>Next expected deposit</dt><dd>{dateLabel(schedule.nextDate)}{schedule.dayOne ? <small className="muted"> · paydays {schedule.dayOne} and {schedule.dayTwo}</small> : null}</dd></div>
          </> : null}
          {r ? <div><dt>Schedule as a monthly amount</dt><dd>{r.equivalentCents === null ? <small className="muted">Not compared: {r.rule}</small> : <>{formatCents(r.equivalentCents)}/mo <small className="muted">({r.rule})</small>{r.matches ? <small> · matches</small> : <small className="paycheck-flag"> · differs by {formatCents(Math.abs(r.equivalentCents - r.monthlyCents))}</small>}</>}</dd></div> : null}
        </dl>
        {r && r.matches === false ? <p className="paycheck-flag">These don&apos;t match. Nothing is changed automatically: update the monthly amount in <Link href="/financial-profile#income">Financial profile</Link> or correct this schedule. Until then, leftover amounts are not confirmed. (Months really have 4–5 weekly or 2–3 every-2-weeks deposits; the comparison uses the yearly average.)</p> : null}
        {canEdit && income.isActive ? <><ScheduleForm setup={setup} feedback={fb} /><RemoveForm setup={setup} feedback={fb} /></>
          : canEdit && schedule ? <RemoveForm setup={setup} feedback={fb} /> : null}
      </li>;
    })}</ul> : <p className="empty-state">No income recorded yet. <Link href="/financial-profile#income">Add income in Financial profile</Link>.</p>}
    {canEdit ? null : <p className="muted">You can view paycheck plans; an owner or member can change pay schedules.</p>}
  </section>;
}

function PrePayday({ plan }: { plan: PaycheckPlan }) {
  if (!plan.prePayday.bills.length) return null;
  return <section className="bento-card paycheck-prepayday" aria-labelledby="prepayday-heading">
    <h2 id="prepayday-heading">Due before {plan.prePayday.until ? `the first expected deposit (${dateLabel(plan.prePayday.until)})` : "any expected deposit"} <span className="muted">({formatCents(plan.prePayday.totalCents)})</span></h2>
    <p className="muted">No expected paycheck in this plan covers these. They aren&apos;t marked paid or funded.</p>
    <ul className="bill-occurrences">{plan.prePayday.bills.map((b) => <BillItem key={`${b.kind}-${b.billId}-${b.date}`} bill={b} />)}</ul>
  </section>;
}

function ReserveContext({ plan, setAsideNote }: { plan: PaycheckPlan; setAsideNote: boolean }) {
  const lines = [...plan.prePayday.bills, ...plan.intervals.flatMap((i) => i.bills)].filter((b) => b.setAsideCents !== null);
  if (!lines.length && !setAsideNote) return null;
  return <section className="bento-card" aria-labelledby="reserve-heading">
    <h2 id="reserve-heading">Set-asides you&apos;ve reported (context only)</h2>
    <p className="muted">Amounts you told Bills you&apos;ve set aside. They aren&apos;t verified money, aren&apos;t counted as a deposit and don&apos;t reduce any bill above.</p>
    {setAsideNote ? <p className="muted">Set-asides can&apos;t be shown right now; nothing above depends on them.</p> : <ul className="bill-occurrences">{lines.map((b) => <li key={`${b.billId}-${b.date}`}><span>{dateLabel(b.date)}</span><span>{b.name}</span><b>{formatCents(b.setAsideCents!)} of {formatCents(b.cents)}</b></li>)}</ul>}
  </section>;
}

export function PaycheckPlanView({ plan, setups, canEdit, simple, feedback, setAsideNote }: { plan: PaycheckPlan; setups: ScheduleSetup[]; canEdit: boolean; simple: boolean; feedback: ScheduleFeedback; setAsideNote: boolean }) {
  const later = simple ? [] : plan.intervals;
  return <>
    <Warnings plan={plan} setups={setups} />
    {!plan.hasSchedules ? <section className="bento-card" role="status"><strong>Add a pay schedule to see your paychecks</strong><p>Tell us how often each income arrives, the expected take-home amount of one deposit and the next date. Nothing is filled in for you.</p>{simple ? <Link className="secondary-button" href="/plan/paychecks?view=detailed#schedules">Set up paychecks</Link> : null}</section> : null}
    <NextSummary plan={plan} />
    <PrePayday plan={plan} />
    {plan.intervals.length ? <section className="bento-card" aria-labelledby="timeline-heading">
      <h2 id="timeline-heading">{simple ? "Your next paycheck" : `Expected paychecks, ${dateLabel(plan.today)} to ${dateLabel(plan.horizonEnd)}`}</h2>
      {plan.extraPaycheckMonths.length && !simple ? <p className="muted">{plan.extraPaycheckMonths.map((m) => `${monthLabel(m.month)} has ${m.count} expected deposits from ${m.source}`).join("; ")}. That month&apos;s plan amounts are shared across them, not added again.</p> : null}
      <ol className="paycheck-timeline">
        {(simple ? plan.intervals.slice(0, 1) : later).map((interval, index) => <IntervalCard key={interval.date} interval={interval} open={index === 0} simple={simple} />)}
      </ol>
      {simple && plan.intervals.length > 1 ? <p><Link href="/plan/paychecks?view=detailed">See all {plan.intervals.length} expected paychecks</Link></p> : null}
    </section> : null}
    {simple ? null : <ReserveContext plan={plan} setAsideNote={setAsideNote} />}
    {simple ? <p><Link className="secondary-button" href="/plan/paychecks?view=detailed#schedules">Set up or change pay schedules</Link></p> : <Schedules plan={plan} setups={setups} canEdit={canEdit} feedback={feedback} />}
    <p className="plan-footnote muted">Dates are calendar dates (today is {dateLabel(plan.today)}). Paydays are expected dates, never moved for weekends or holidays. This page doesn&apos;t record income, payments or transfers, and doesn&apos;t show account balances.</p>
  </>;
}
