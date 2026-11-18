// FFH-P09 form parsing for bill fields, shared by the Financial profile and Bills server actions. Strict: anything
// unexpected throws (fail closed); nothing is guessed.
import { isAllowedDueDate, isRecurrence, nextOccurrence, parseCents, type Recurrence, type ReminderDays } from "./schedule.ts";

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

// The Bills form pre-fills the NEXT due date. Submitting that same date must keep the saved anchor (which may be an
// earlier, unclamped date such as Jan 31 or Feb 29); any other date becomes the new anchor.
export function keepAnchorIfUnchanged(input: ScheduleInput, savedAnchor: unknown, recurrence: unknown, today: string): ScheduleInput {
  if (input.due_anchor_date === null || !isAllowedDueDate(savedAnchor) || !isRecurrence(recurrence)) return input;
  return nextOccurrence(savedAnchor, recurrence, today) === input.due_anchor_date ? { ...input, due_anchor_date: savedAnchor } : input;
}
