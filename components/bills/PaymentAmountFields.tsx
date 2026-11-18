"use client";
import { useState } from "react";
import { monthlyEquivalentCents, parseCents, formatCents, RECURRENCE_LABEL, type Recurrence } from "@/lib/bills/schedule";

// FFH-P09: an expense is entered as the ACTUAL payment and how often it is paid. The monthly planning amount is
// shown live (rounded up to the cent, the same rule the database applies) and is never sent: the database derives
// it. On an edit that changes how often, the person must confirm the new monthly amount (the server checks too).
const OPTIONS: Recurrence[] = ["monthly", "quarterly", "yearly"];

export default function PaymentAmountFields({ defaultAmount, defaultRecurrence, editing = false }: {
  defaultAmount?: string | number | null; defaultRecurrence?: Recurrence; editing?: boolean;
}) {
  const saved = defaultRecurrence ?? "monthly";
  const [amount, setAmount] = useState(defaultAmount === null || defaultAmount === undefined ? "" : String(defaultAmount));
  const [recurrence, setRecurrence] = useState<Recurrence>(saved);
  const cents = parseCents(amount);
  const monthly = cents === null ? null : monthlyEquivalentCents(cents, recurrence);
  const changed = editing && recurrence !== saved;
  return <>
    <label className="field">
      <span className="field-label">How much is each payment?</span>
      <span className="field-affix field-affix-money">
        <span className="field-prefix" aria-hidden="true">$</span>
        <input name="payment_amount" type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01" required
          defaultValue={amount} placeholder="0" onChange={(event) => setAmount(event.target.value)} />
      </span>
      <small className="field-hint">The amount you actually pay each time, not a monthly average.</small>
    </label>
    <fieldset className="choice choice-pills">
      <legend>How often do you pay it?</legend>
      <div className="choice-options">
        {OPTIONS.map((option, index) => <label key={option} className="choice-option">
          <input type="radio" name="recurrence" value={option} defaultChecked={saved === option} required={index === 0} onChange={() => setRecurrence(option)} />
          <span className="choice-face"><span>{RECURRENCE_LABEL[option]}</span></span>
        </label>)}
      </div>
    </fieldset>
    <p className="bill-monthly-preview" aria-live="polite">
      {monthly === null ? "Enter the payment to see its monthly planning amount."
        : recurrence === "monthly" ? <>Your plan budgets <strong>{formatCents(monthly)}</strong> a month.</>
        : <>Your plan budgets <strong>{formatCents(monthly)}</strong> a month (the {formatCents(cents!)} payment ÷ {recurrence === "yearly" ? 12 : 3}, rounded up to the cent). This is a planning average, not an automatic transfer.</>}
    </p>
    {editing ? <label className={`bill-confirm${changed ? " bill-confirm-needed" : ""}`}>
      <input type="checkbox" name="confirm_recurrence" required={changed} />
      <span>{changed && monthly !== null
        ? <>I&apos;m changing how often this is paid. The payment stays {formatCents(cents!)}; the monthly planning amount becomes {formatCents(monthly)}.</>
        : "If I change how often this is paid, I confirm the new monthly planning amount."}</span>
    </label> : null}
  </>;
}
