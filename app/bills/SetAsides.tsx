import { confirmSetAsideCycle, startSetAside, stopSetAside, updateSetAside, type SetAsideError, type SetAsideForm } from "./set-aside-actions";
import type { EligibleBill, SetAsideSection, TrackedSetAside } from "@/lib/bills/set-aside-view";
import { SET_ASIDE_STATUS_LABEL } from "@/lib/bills/set-aside";
import { formatCents, RECURRENCE_LABEL } from "@/lib/bills/schedule";

// FFH-P11 set-asides on the Bills page (issue #172). Server-rendered, native form controls only. Owner safeguards:
// the saved amount is always "the amount you've reported as set aside" (never a balance, transfer or payment), and
// near or past due dates never get a made-up monthly saving cadence.

export type SetAsideFeedback = { form: SetAsideForm; error: SetAsideError; expenseId: string } | null;

const FIELD_ERRORS: Partial<Record<SetAsideError, string>> = {
  amount_missing: "Enter an amount. Type 0 if you haven't set anything aside.",
  amount_invalid: "Enter a dollar amount of zero or more, with at most two decimals (for example 250 or 250.00).",
  confirm_missing: "Tick the box to confirm.",
};

const FORM_ERRORS: Partial<Record<SetAsideError, string>> = {
  changed: "Not saved: this set-aside or its bill changed in the meantime (for example in another tab, by someone else in your household, or because a due date passed). Review the latest details below and try again.",
  exists: "Not saved: this bill already has a set-aside tracker.",
  not_eligible: "Only a yearly or every-3-months bill with a due date and an amount can have a set-aside.",
  not_saved: "Not saved. The bill or tracker may have been removed, or you no longer have permission to change it.",
  read_only: "Viewers can see set-asides; only an owner or member can change them.",
};

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const periodsLabel = (n: number) => `${n} saving ${n === 1 ? "period" : "periods"}`;

function errorFor(feedback: SetAsideFeedback, form: SetAsideForm, expenseId: string) {
  return feedback && feedback.form === form && feedback.expenseId === expenseId ? feedback.error : null;
}

function FormMessage({ error }: { error: SetAsideError | null }) {
  const text = error ? FORM_ERRORS[error] : undefined;
  return text ? <p className="form-error" role="alert">{text}</p> : null;
}

// A required amount field that starts blank (never pre-filled with 0 or a guess).
function AmountField({ id, name, label, hint, error }: { id: string; name: string; label: string; hint: string; error: SetAsideError | null }) {
  const message = error ? FIELD_ERRORS[error] : undefined;
  const isAmountError = error === "amount_missing" || error === "amount_invalid";
  return <div className="field">
    <label className="field-label" htmlFor={id}>{label}</label>
    <input id={id} name={name} type="text" inputMode="decimal" autoComplete="off" required defaultValue=""
      aria-describedby={`${id}-hint${isAmountError ? ` ${id}-error` : ""}`} aria-invalid={isAmountError || undefined} autoFocus={isAmountError} />
    <small id={`${id}-hint`} className="field-hint">{hint}</small>
    {isAmountError && message ? <small id={`${id}-error`} className="field-error">{message}</small> : null}
  </div>;
}

function ConfirmBox({ id, label, error }: { id: string; label: string; error: SetAsideError | null }) {
  const isError = error === "confirm_missing";
  return <div className="field">
    <label className="set-aside-confirm" htmlFor={id}>
      <input id={id} type="checkbox" name="confirm" value="yes" required aria-describedby={isError ? `${id}-error` : undefined} aria-invalid={isError || undefined} autoFocus={isError} />
      <span>{label}</span>
    </label>
    {isError ? <small id={`${id}-error`} className="field-error">{FIELD_ERRORS.confirm_missing}</small> : null}
  </div>;
}

function Explanation({ item }: { item: TrackedSetAside }) {
  const r = item.result;
  const due = dateLabel(r.cycleDue);
  switch (r.status) {
    case "in_progress":
      return r.savingPeriods === 1
        ? <p><b>{formatCents(r.remainingCents!)} still needed before {due}</b>; 1 remaining saving period ({r.daysUntilDue} {r.daysUntilDue === 1 ? "day" : "days"} left). This is the whole remaining amount, not a monthly amount.</p>
        : <p>To reach the bill amount by {due}: about <b>{formatCents(r.catchUpCents!)} per saving period</b> for {periodsLabel(r.savingPeriods!)} (calendar months from this one through the due date). Rounded up to the cent, so it can total a few cents more than needed. A suggestion only: it is not added to your plan or budget.</p>;
    case "funded":
      return <p>The amount you&apos;ve reported covers the bill due {due}. Nothing more is suggested.</p>;
    case "due_now":
      return <p><b>Due today ({due}).</b> {r.remainingCents ? <>{formatCents(r.remainingCents)} is still needed today. No saving periods remain for this cycle.</> : "The amount you've reported covers it."} This page doesn&apos;t record payments; when you&apos;re ready, confirm the next cycle below.</p>;
    case "confirmation_needed":
      return <p><b>Cycle confirmation needed.</b> The due date {due} has passed. This page doesn&apos;t know whether the bill was paid and hasn&apos;t moved your reported amount. For that cycle you had reported {formatCents(r.reservedCents)} of {formatCents(r.targetCents!)}{r.remainingCents ? <> ({formatCents(r.remainingCents)} short)</> : null}. Confirm the next cycle and enter what carries over.</p>;
    case "schedule_changed":
      return <p><b>Cycle confirmation needed.</b> This bill&apos;s due date or how often it repeats changed after this cycle (due {due}) was confirmed. Your reported amount ({formatCents(r.reservedCents)}) hasn&apos;t been moved. Confirm which cycle it&apos;s for below.</p>;
    case "not_eligible":
      return <p><b>Review needed.</b> This bill is no longer a yearly or every-3-months bill with a due date and an amount, so nothing can be calculated. Your reported amount ({formatCents(r.reservedCents)}) is kept until you stop tracking.</p>;
  }
}

function TrackedCard({ item, canEdit, feedback }: { item: TrackedSetAside; canEdit: boolean; feedback: SetAsideFeedback }) {
  const { bill, tracker, result: r } = item;
  const base = `set-aside-${bill.id}`;
  const editable = r.status === "in_progress" || r.status === "funded" || r.status === "due_now";
  const updateError = errorFor(feedback, "update", bill.id);
  const cycleError = errorFor(feedback, "cycle", bill.id);
  const stopError = errorFor(feedback, "stop", bill.id);
  const hidden = <>
    <input type="hidden" name="expense_id" value={bill.id} />
    <input type="hidden" name="tracker_id" value={tracker.id} />
    <input type="hidden" name="version" value={tracker.version} />
  </>;
  return <li className="set-aside-card" id={base} tabIndex={-1} aria-labelledby={`${base}-name`}>
    <div className="set-aside-head">
      <h3 id={`${base}-name`}>{bill.name}</h3>
      <span className={`set-aside-status set-aside-status-${r.status}`}>{SET_ASIDE_STATUS_LABEL[r.status]}</span>
    </div>
    <dl className="set-aside-amounts">
      <div><dt>Bill amount</dt><dd>{formatCents(bill.paymentCents)} <small className="muted">{RECURRENCE_LABEL[bill.recurrence].toLowerCase()}</small></dd></div>
      <div><dt>This cycle&apos;s due date</dt><dd>{dateLabel(tracker.cycleDue)}</dd></div>
      <div><dt>Already in your monthly budget</dt><dd>{formatCents(bill.monthlyCents)}/mo <small className="muted">planning amount, unchanged by this tracker</small></dd></div>
      <div><dt>Amount you&apos;ve reported as set aside</dt><dd>{formatCents(r.reservedCents)}</dd></div>
      {r.remainingCents !== null ? <div><dt>Still needed</dt><dd>{formatCents(r.remainingCents)}</dd></div> : null}
      {r.surplusCents ? <div><dt>More than the bill amount</dt><dd>{formatCents(r.surplusCents)}</dd></div> : null}
      {r.savingPeriods !== null ? <div><dt>Saving periods left</dt><dd>{r.savingPeriods}</dd></div> : null}
    </dl>
    {r.progressPercent !== null ? <>
      <div className="goal-progress" role="progressbar" aria-labelledby={`${base}-progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.progressPercent}
        aria-valuetext={`${r.progressPercent}%: ${formatCents(Math.min(r.reservedCents, r.targetCents!))} of ${formatCents(r.targetCents!)} reported as set aside`}>
        <span style={{ width: `${r.progressPercent}%` }} />
      </div>
      <small id={`${base}-progress`} className="muted">{r.progressPercent}% of the bill amount reported as set aside</small>
    </> : null}
    <Explanation item={item} />
    {r.surplusCents ? <p className="muted">The extra {formatCents(r.surplusCents)} stays with this bill. It moves to the next cycle only if you enter it when you confirm that cycle.</p> : null}

    {canEdit ? <div className="set-aside-actions">
      {editable ? <details className="edit-panel" open={Boolean(updateError)}>
        <summary>Update the amount you&apos;ve set aside</summary>
        <form className="data-form friendly-form" action={updateSetAside}>
          {hidden}
          <FormMessage error={updateError} />
          <AmountField id={`${base}-reserved`} name="reserved" label="Amount you've set aside for this bill so far" error={updateError}
            hint={`Your total so far for the bill due ${dateLabel(tracker.cycleDue)}, not an amount to add. Currently reported: ${formatCents(r.reservedCents)}. This is your own figure; it isn't checked against any account.`} />
          <button type="submit">Save reported amount</button>
        </form>
      </details> : null}
      {item.nextCycle ? <details className="edit-panel" open={Boolean(cycleError) || r.status !== "due_now"}>
        <summary>Confirm the next cycle</summary>
        <form className="data-form friendly-form" action={confirmSetAsideCycle}>
          {hidden}
          <input type="hidden" name="shown_next_cycle" value={item.nextCycle} />
          <FormMessage error={cycleError} />
          <p>Next cycle: the bill due <b>{dateLabel(item.nextCycle)}</b> ({formatCents(bill.paymentCents)}).</p>
          <AmountField id={`${base}-carryover`} name="carryover" label="Amount set aside for the new cycle" error={cycleError}
            hint={`What you've set aside for the bill due ${dateLabel(item.nextCycle)}, including anything you carry over. You had reported ${formatCents(r.reservedCents)} for the cycle due ${dateLabel(tracker.cycleDue)}; nothing carries over unless you enter it. Type 0 for none.`} />
          <ConfirmBox id={`${base}-cycle-confirm`} error={cycleError} label={`Start the cycle for the bill due ${dateLabel(item.nextCycle)}. This doesn't record a payment.`} />
          <button type="submit">Confirm next cycle</button>
        </form>
      </details> : null}
      <details className="edit-panel" open={Boolean(stopError)}>
        <summary>Stop tracking</summary>
        <form className="data-form friendly-form" action={stopSetAside}>
          {hidden}
          <FormMessage error={stopError} />
          <p className="muted">Removes this set-aside tracker and its reported amount. The bill itself stays in your Financial profile and your plan.</p>
          <ConfirmBox id={`${base}-stop-confirm`} error={stopError} label="Stop tracking a set-aside for this bill" />
          <button type="submit" className="secondary-button">Stop tracking</button>
        </form>
      </details>
    </div> : null}
  </li>;
}

function EligibleRow({ item, canEdit, feedback }: { item: EligibleBill; canEdit: boolean; feedback: SetAsideFeedback }) {
  const { bill, firstCycle } = item;
  const base = `set-aside-${bill.id}`;
  const error = errorFor(feedback, "start", bill.id);
  return <li className="set-aside-card set-aside-eligible" id={base} tabIndex={-1} aria-labelledby={`${base}-name`}>
    <div className="set-aside-head">
      <h3 id={`${base}-name`}>{bill.name}</h3>
      <span className="set-aside-status">Not tracked</span>
    </div>
    <p className="muted">{formatCents(bill.paymentCents)} {RECURRENCE_LABEL[bill.recurrence].toLowerCase()}, next due {dateLabel(firstCycle)} · {formatCents(bill.monthlyCents)}/mo already in your monthly budget.</p>
    {canEdit ? <details className="edit-panel" open={Boolean(error)}>
      <summary>Track a set-aside for this bill</summary>
      <form className="data-form friendly-form" action={startSetAside}>
        <input type="hidden" name="expense_id" value={bill.id} />
        <input type="hidden" name="shown_cycle" value={firstCycle} />
        <input type="hidden" name="expected_anchor" value={bill.anchor ?? ""} />
        <input type="hidden" name="expected_recurrence" value={bill.recurrence} />
        <FormMessage error={error} />
        <AmountField id={`${base}-reserved`} name="reserved" label="Amount you've set aside for this bill so far" error={error}
          hint={`Your own figure for the bill due ${dateLabel(firstCycle)}. It isn't checked against any account. Type 0 if you haven't started.`} />
        <ConfirmBox id={`${base}-start-confirm`} error={error} label={`Track the cycle for the bill due ${dateLabel(firstCycle)}`} />
        <button type="submit">Start tracking</button>
      </form>
    </details> : null}
  </li>;
}

export function SetAsides({ section, canEdit, feedback }: { section: SetAsideSection | null; canEdit: boolean; feedback: SetAsideFeedback }) {
  return <section className="bento-card set-asides" aria-labelledby="set-asides-heading">
    <h2 id="set-asides-heading">Saving ahead for yearly and every-3-months bills</h2>
    <p className="muted">Optional. Keep track of what you&apos;ve put aside for a larger bill before it&apos;s due. Amounts here are what you report; they aren&apos;t bank balances, transfers or payments, and they don&apos;t change your plan, budget or the forecast totals.</p>
    {!section ? <p className="form-error" role="status">Set-asides can&apos;t be shown right now. Your bills below are unaffected.</p>
      : section.items.length === 0 ? <p className="empty-state">No yearly or every-3-months bills with a due date yet. Add a due date to one below, or set how often it repeats in Financial profile.</p>
      : <ul className="set-aside-list">{section.items.map((item) => item.kind === "tracked"
        ? <TrackedCard key={item.bill.id} item={item} canEdit={canEdit} feedback={feedback} />
        : <EligibleRow key={item.bill.id} item={item} canEdit={canEdit} feedback={feedback} />)}</ul>}
    {canEdit ? null : <p className="muted">You can view set-asides; an owner or member can change them.</p>}
  </section>;
}
