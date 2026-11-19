// FFH-P09 form parsing for bill fields, shared by the Financial profile and Bills server actions. Strict: anything
// unexpected throws (fail closed); nothing is guessed.
import { isAllowedDueDate, isRecurrence, parseCents, type Recurrence, type ReminderDays } from "./schedule.ts";

export type ExpensePaymentInput = { payment_amount: string; recurrence: Recurrence };

// Exact cents in, an exact two-decimal string out (sent to the numeric column without floating-point arithmetic).
export function expensePaymentInput(formData: FormData): ExpensePaymentInput {
  const cents = parseCents(String(formData.get("payment_amount") ?? ""));
  if (cents === null) throw new Error("Invalid payment_amount");
  const recurrence = String(formData.get("recurrence") ?? "");
  if (!isRecurrence(recurrence)) throw new Error("Invalid recurrence");
  return { payment_amount: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`, recurrence };
}

export type ScheduleInput = { due_anchor_date: string | null; reminder_days: ReminderDays };

// Next due date (blank = unscheduled) and reminder (off / 0 / 1 / 3 / 7). A reminder needs a due date.
export function scheduleInput(formData: FormData): ScheduleInput {
  const rawDate = String(formData.get("due_date") ?? "").trim();
  if (rawDate && !isAllowedDueDate(rawDate)) throw new Error("Invalid due_date");
  const rawReminder = String(formData.get("reminder") ?? "off");
  const reminder: ReminderDays = rawReminder === "off" ? null
    : rawReminder === "0" ? 0 : rawReminder === "1" ? 1 : rawReminder === "3" ? 3 : rawReminder === "7" ? 7 : (() => { throw new Error("Invalid reminder"); })();
  return { due_anchor_date: rawDate || null, reminder_days: rawDate ? reminder : null };
}

// The Bills form pre-fills the NEXT due date it computed when the page was rendered, and sends that date back as
// `shown_due` with the anchor and recurrence it was based on. Audit P09-01: the decision must use what the form SHOWED,
// not "today" on the server, or a form left open past midnight would turn a Jan 31 anchor into Feb 28.
export type ScheduleContext = { shownDue: string | null; expectedAnchor: string | null; expectedRecurrence: Recurrence };

export function scheduleContext(formData: FormData): ScheduleContext {
  const optionalDate = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    if (!value) return null;
    if (!isAllowedDueDate(value)) throw new Error(`Invalid ${key}`);
    return value;
  };
  const recurrence = String(formData.get("expected_recurrence") ?? "");
  if (!isRecurrence(recurrence)) throw new Error("Invalid expected_recurrence");
  return { shownDue: optionalDate("shown_due"), expectedAnchor: optionalDate("expected_anchor"), expectedRecurrence: recurrence };
}

// Submitting exactly the date the form showed keeps the saved anchor (which may be an earlier, unclamped date such as
// Jan 31 or Feb 29); any other date becomes the new anchor. Callers must first confirm the saved anchor and
// recurrence still equal the form's expected ones (otherwise the shown date no longer belongs to this schedule).
export function keepAnchorIfUnchanged(input: ScheduleInput, savedAnchor: unknown, shownDue: string | null): ScheduleInput {
  if (input.due_anchor_date === null || shownDue === null || !isAllowedDueDate(savedAnchor)) return input;
  return input.due_anchor_date === shownDue ? { ...input, due_anchor_date: savedAnchor } : input;
}
