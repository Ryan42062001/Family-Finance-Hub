// FFH-P11 irregular-expense set-asides (Owner-approved spec: GitHub issue #172). Pure functions, no I/O.
//
// Tracking/advisory only. The amount here is what the household has REPORTED as set aside: a manual assertion, never
// a verified balance. Nothing in this file feeds the financial plan, the P09 monthly planning amount, the forecast
// totals or any export; the suggested catch-up is information, not a new expense.
//
// Money: integer cents only (BigInt where a product could pass 2^53). Catch-up is always rounded UP to the cent.
// Saving periods reuse the released P07 calendar-month rule (fundingMonths): a part month counts as one, at least one
// while the due date is in the future, none on or after the due date. Dates are date-only, compared as strings.
import { fundingMonths } from "../calculations/goal-tracker.ts";
import { addDays, isAllowedDueDate, MAX_CENTS, MAX_DATE, nextOccurrence, type IsoDate, type Recurrence } from "./schedule.ts";

export type SetAsideRecurrence = Extract<Recurrence, "quarterly" | "yearly">;

// The P09 bill as loaded (authoritative amount and schedule).
export type SetAsideBill = { paymentCents: number; recurrence: Recurrence; anchor: IsoDate | null };

// The saved tracker row.
export type SetAsideTracker = {
  id: string;
  expenseId: string;
  cycleDue: IsoDate;
  cycleAnchor: IsoDate;
  cycleRecurrence: SetAsideRecurrence;
  reservedCents: number;
  version: number;
};

export type SetAsideStatus =
  | "funded" // future due date, reported reserve covers the bill amount
  | "in_progress" // future due date, more is needed; a catch-up is suggested
  | "due_now" // due today: only the amount still needed, no saving cadence
  | "confirmation_needed" // the cycle's due date has passed: never assumed paid, never rolled forward
  | "schedule_changed" // the bill's due date or recurrence changed since the cycle was confirmed
  | "not_eligible"; // the bill is no longer a scheduled quarterly/yearly bill with an amount

export type SetAsideResult = {
  status: SetAsideStatus;
  cycleDue: IsoDate;
  reservedCents: number;
  targetCents: number | null; // the bill's actual payment amount (null when not eligible)
  remainingCents: number | null; // max(0, target - reserved)
  surplusCents: number | null; // max(0, reserved - target)
  progressPercent: number | null; // whole percent, rounded DOWN, 0-100
  savingPeriods: number | null; // only while the due date is in the future and the schedule is unchanged
  catchUpCents: number | null; // ceil(remaining / periods); only when status is in_progress
  daysUntilDue: number;
  canConfirmNextCycle: boolean;
};

export function isSetAsideRecurrence(value: unknown): value is SetAsideRecurrence {
  return value === "quarterly" || value === "yearly";
}

function assertCents(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) throw new RangeError("Invalid amount in cents");
}

// An expense can be tracked only with an authoritative amount and a quarterly/yearly schedule.
export function isEligibleBill(bill: SetAsideBill): bill is SetAsideBill & { recurrence: SetAsideRecurrence; anchor: IsoDate } {
  return isSetAsideRecurrence(bill.recurrence) && isAllowedDueDate(bill.anchor) && Number.isSafeInteger(bill.paymentCents)
    && bill.paymentCents > 0 && bill.paymentCents <= MAX_CENTS;
}

// ceil(a / b) for non-negative safe integers a and positive b.
export function ceilDiv(a: number, b: number): number {
  if (!Number.isSafeInteger(a) || a < 0 || !Number.isSafeInteger(b) || b <= 0) throw new RangeError("Invalid division");
  return Math.floor(a / b) + (a % b === 0 ? 0 : 1);
}

// floor(min(reserved, target) * 100 / target), exactly.
export function progressPercent(reservedCents: number, targetCents: number): number {
  assertCents(reservedCents);
  assertCents(targetCents);
  if (targetCents === 0) throw new RangeError("Target must be positive");
  const covered = BigInt(Math.min(reservedCents, targetCents));
  return Number((covered * BigInt(100)) / BigInt(targetCents));
}

// Whole days from `from` to `to` (date-only).
function dayDiff(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function evaluateSetAside(bill: SetAsideBill, tracker: SetAsideTracker, today: IsoDate): SetAsideResult {
  if (!isAllowedDueDate(today) || !isAllowedDueDate(tracker.cycleDue) || !isAllowedDueDate(tracker.cycleAnchor)
    || !isSetAsideRecurrence(tracker.cycleRecurrence)) throw new RangeError("Invalid set-aside");
  assertCents(tracker.reservedCents);
  const base = {
    cycleDue: tracker.cycleDue,
    reservedCents: tracker.reservedCents,
    daysUntilDue: dayDiff(today, tracker.cycleDue),
    savingPeriods: null,
    catchUpCents: null,
  };
  if (!isEligibleBill(bill)) {
    return { ...base, status: "not_eligible", targetCents: null, remainingCents: null, surplusCents: null, progressPercent: null, canConfirmNextCycle: false };
  }
  const target = bill.paymentCents;
  const reserved = tracker.reservedCents;
  const amounts = {
    targetCents: target,
    remainingCents: Math.max(0, target - reserved),
    surplusCents: Math.max(0, reserved - target),
    progressPercent: progressPercent(reserved, target),
  };
  if (bill.anchor !== tracker.cycleAnchor || bill.recurrence !== tracker.cycleRecurrence) {
    return { ...base, ...amounts, status: "schedule_changed", canConfirmNextCycle: nextCycleDue(bill, tracker, today) !== null };
  }
  if (tracker.cycleDue < today) {
    return { ...base, ...amounts, status: "confirmation_needed", canConfirmNextCycle: nextCycleDue(bill, tracker, today) !== null };
  }
  if (tracker.cycleDue === today) {
    return { ...base, ...amounts, status: "due_now", canConfirmNextCycle: nextCycleDue(bill, tracker, today) !== null };
  }
  const periods = fundingMonths(today, tracker.cycleDue);
  if (periods === null || periods < 1) throw new RangeError("Invalid saving periods");
  if (amounts.remainingCents === 0) {
    return { ...base, ...amounts, status: "funded", savingPeriods: periods, canConfirmNextCycle: false };
  }
  return { ...base, ...amounts, status: "in_progress", savingPeriods: periods, catchUpCents: ceilDiv(amounts.remainingCents, periods), canConfirmNextCycle: false };
}

// The first cycle a new tracker would cover: the bill's next due date on or after today.
export function firstCycleDue(bill: SetAsideBill, today: IsoDate): IsoDate | null {
  if (!isEligibleBill(bill) || !isAllowedDueDate(today)) return null;
  const due = nextOccurrence(bill.anchor, bill.recurrence, today);
  return due <= MAX_DATE ? due : null;
}

// The cycle an explicit confirmation would start. Only offered on or after the active cycle's due date, or when the
// bill's schedule changed. With an unchanged schedule it is the first due date after the old cycle (and not before
// today); after a schedule change it is the new schedule's next due date on or after today.
export function nextCycleDue(bill: SetAsideBill, tracker: SetAsideTracker, today: IsoDate): IsoDate | null {
  if (!isEligibleBill(bill) || !isAllowedDueDate(today)) return null;
  const unchanged = bill.anchor === tracker.cycleAnchor && bill.recurrence === tracker.cycleRecurrence;
  if (unchanged && tracker.cycleDue > today) return null;
  let from = today;
  if (unchanged) {
    const dayAfter = tracker.cycleDue >= MAX_DATE ? null : addDays(tracker.cycleDue, 1);
    if (dayAfter === null) return null;
    if (dayAfter > from) from = dayAfter;
  }
  const due = nextOccurrence(bill.anchor, bill.recurrence, from);
  return due <= MAX_DATE ? due : null;
}

// The reported amount can be changed only for an active, current cycle. A passed cycle, a changed schedule or a bill that
// is no longer eligible must be confirmed (or stopped) first, so money is never recorded against a stale cycle.
export function canUpdateReported(status: SetAsideStatus): boolean {
  return status === "in_progress" || status === "funded" || status === "due_now";
}

export const SET_ASIDE_STATUS_LABEL: Record<SetAsideStatus, string> = {
  funded: "Fully funded",
  in_progress: "Funding in progress",
  due_now: "Due now",
  confirmation_needed: "Cycle confirmation needed",
  schedule_changed: "Cycle confirmation needed",
  not_eligible: "Review needed",
};
