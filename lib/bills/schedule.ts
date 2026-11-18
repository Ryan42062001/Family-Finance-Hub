// FFH-P09 bill calendar and money rules (Owner-approved spec: GitHub issue #170). Pure functions, no I/O.
//
// Money: integer cents only. The monthly planning equivalent is rounded UP to the cent and must match the database
// trigger private.expenses_derive_monthly_amount exactly ($100.00 yearly -> 834 cents a month).
// Dates: date-only "YYYY-MM-DD" strings and UTC calendar arithmetic, so no time zone can move a due date.
// Every occurrence is computed from the ORIGINAL anchor: the anchor's day of month is clamped to short months for
// that occurrence only (Jan 31 quarterly -> Apr 30 -> Jul 31 -> Oct 31; Feb 29 yearly -> Feb 28 -> ... -> Feb 29).

export const RECURRENCES = ["monthly", "quarterly", "yearly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];
export const REMINDER_CHOICES = [null, 0, 1, 3, 7] as const;
export type ReminderDays = (typeof REMINDER_CHOICES)[number];

const STEP_MONTHS: Record<Recurrence, number> = { monthly: 1, quarterly: 3, yearly: 12 };
export const MAX_CENTS = 99_999_999_999_999; // numeric(14,2) upper bound: 999,999,999,999.99
export const MIN_DATE = "2000-01-01";
export const MAX_DATE = "2099-12-31";

export function isRecurrence(value: unknown): value is Recurrence {
  return typeof value === "string" && (RECURRENCES as readonly string[]).includes(value);
}

export function isReminderDays(value: unknown): value is ReminderDays {
  return value === null || value === 0 || value === 1 || value === 3 || value === 7;
}

function assertCents(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) throw new RangeError("Invalid amount in cents");
}

// ceil(cents / months) in exact integer arithmetic.
export function monthlyEquivalentCents(paymentCents: number, recurrence: Recurrence): number {
  assertCents(paymentCents);
  if (!isRecurrence(recurrence)) throw new RangeError("Invalid recurrence");
  const months = STEP_MONTHS[recurrence];
  return Math.floor((paymentCents + months - 1) / months);
}

// Parses a typed dollar amount ("1,234.5", "$12", "0.07") into cents without floating-point arithmetic.
// At most two decimals; anything else is refused (null). Never guesses.
export function parseCents(input: string): number | null {
  const raw = input.trim().replace(/^\$/, "").replace(/,(?=\d{3}(?:\D|$))/g, "");
  const match = /^(\d{1,12})(?:\.(\d{0,2}))?$/.exec(raw) ?? /^()\.(\d{1,2})$/.exec(raw);
  if (!match) return null;
  const cents = Number(match[1] || "0") * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= MAX_CENTS ? cents : null;
}

// Database numeric (number or string with at most 2 decimals) -> cents. Refuses anything else.
export function centsFromDb(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    const cents = Math.round(value * 100);
    return Math.abs(cents - value * 100) < 1e-6 * Math.max(1, Math.abs(value)) && cents <= MAX_CENTS ? cents : null;
  }
  if (typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value)) return parseCents(value);
  return null;
}

export function formatCents(cents: number): string {
  assertCents(cents);
  const dollars = Math.floor(cents / 100).toLocaleString("en-US");
  return `$${dollars}.${String(cents % 100).padStart(2, "0")}`;
}

// ---- Date-only calendar -------------------------------------------------------------------------------------------

export type IsoDate = string; // YYYY-MM-DD

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function isAllowedDueDate(value: unknown): value is IsoDate {
  return isIsoDate(value) && value >= MIN_DATE && value <= MAX_DATE;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parts(date: IsoDate): [number, number, number] {
  if (!isIsoDate(date)) throw new RangeError("Invalid date");
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

function iso(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthIndex(date: IsoDate): number {
  const [y, m] = parts(date);
  return y * 12 + (m - 1);
}

// The k-th occurrence (k >= 0) counted from the anchor, which is occurrence 0.
export function occurrence(anchor: IsoDate, recurrence: Recurrence, k: number): IsoDate {
  if (!Number.isInteger(k) || k < 0) throw new RangeError("Invalid occurrence index");
  const [y, m, d] = parts(anchor);
  const index = y * 12 + (m - 1) + k * STEP_MONTHS[recurrence];
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return iso(year, month, Math.min(d, daysInMonth(year, month)));
}

// Smallest occurrence on or after `from`. Passed dates simply advance; nothing implies a payment happened.
export function nextOccurrence(anchor: IsoDate, recurrence: Recurrence, from: IsoDate): IsoDate {
  parts(from);
  if (anchor >= from) return anchor;
  const step = STEP_MONTHS[recurrence];
  let k = Math.max(0, Math.floor((monthIndex(from) - monthIndex(anchor)) / step));
  while (occurrence(anchor, recurrence, k) < from) k += 1;
  return occurrence(anchor, recurrence, k);
}

// Every occurrence in [from, to] (inclusive), in date order.
export function occurrencesBetween(anchor: IsoDate, recurrence: Recurrence, from: IsoDate, to: IsoDate): IsoDate[] {
  if (to < from) return [];
  const out: IsoDate[] = [];
  let date = nextOccurrence(anchor, recurrence, from);
  // Recover k for the first date so later ones are still computed from the original anchor.
  const step = STEP_MONTHS[recurrence];
  let k = (monthIndex(date) - monthIndex(anchor)) / step;
  while (date <= to) {
    out.push(date);
    k += 1;
    date = occurrence(anchor, recurrence, k);
  }
  return out;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const [y1, m1, d1] = parts(from);
  const [y2, m2, d2] = parts(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

// First day of the month `offset` months after the month containing `date`.
export function monthStart(date: IsoDate, offset = 0): IsoDate {
  const index = monthIndex(date) + offset;
  return iso(Math.floor(index / 12), (index % 12) + 1, 1);
}

export function monthEnd(date: IsoDate, offset = 0): IsoDate {
  const start = monthStart(date, offset);
  const [y, m] = parts(start);
  return iso(y, m, daysInMonth(y, m));
}

// In-app, due-soon reminder: on when the saved choice is not Off and the next due date is within that many days.
export function reminderActive(nextDue: IsoDate, today: IsoDate, reminder: ReminderDays): boolean {
  if (reminder === null) return false;
  const days = daysBetween(today, nextDue);
  return days >= 0 && days <= reminder;
}

export const REMINDER_LABEL: Record<"off" | "0" | "1" | "3" | "7", string> = {
  off: "Off",
  "0": "On the due day",
  "1": "1 day before",
  "3": "3 days before",
  "7": "7 days before",
};

export function reminderLabel(reminder: ReminderDays): string {
  return REMINDER_LABEL[reminder === null ? "off" : (String(reminder) as "0" | "1" | "3" | "7")];
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = { monthly: "Monthly", quarterly: "Every 3 months", yearly: "Yearly" };
