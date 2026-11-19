// FFH-P11 Bills-page model for set-asides. Pure: takes the P09 BillsView (already built from household-RLS rows) and
// the household's trackers, and returns a SEPARATE model. It never changes the BillsView, so every P09 amount, the
// Upcoming 30 days, the monthly planning amounts and the 12-month forecast totals stay exactly as P09 computed them.
import type { Bill, BillsView } from "./bills-view.ts";
import { evaluateSetAside, firstCycleDue, isEligibleBill, nextCycleDue, type SetAsideResult, type SetAsideTracker } from "./set-aside.ts";
import type { IsoDate } from "./schedule.ts";

export type TrackedSetAside = { kind: "tracked"; bill: Bill; tracker: SetAsideTracker; result: SetAsideResult; nextCycle: IsoDate | null };
export type EligibleBill = { kind: "eligible"; bill: Bill; firstCycle: IsoDate };
export type SetAsideItem = TrackedSetAside | EligibleBill;

// A note shown next to one forecast payment; it never changes the payment or the month's total.
export type ForecastAnnotation =
  | { kind: "cycle"; item: TrackedSetAside } // this payment is the tracked cycle's due date
  | { kind: "needs_confirmation"; item: TrackedSetAside }; // first payment of a bill whose cycle needs confirming

export type SetAsideSection = {
  items: SetAsideItem[];
  annotations: Map<string, ForecastAnnotation>; // key: occurrenceKey(bill, date)
};

export function occurrenceKey(bill: Pick<Bill, "kind" | "id">, date: IsoDate): string {
  return `${bill.kind}-${bill.id}-${date}`;
}

export function buildSetAsideSection(view: BillsView, trackers: SetAsideTracker[], today: IsoDate): SetAsideSection {
  const expenses = new Map<string, Bill>();
  for (const bill of [...view.scheduled, ...view.unscheduled]) if (bill.kind === "expense") expenses.set(bill.id, bill);

  const tracked: TrackedSetAside[] = [];
  const seen = new Set<string>();
  for (const tracker of trackers) {
    const bill = expenses.get(tracker.expenseId);
    // Fail closed: a tracker must belong to one of this household's own expenses, once.
    if (!bill || seen.has(tracker.expenseId)) throw new RangeError("Set-aside does not match a bill");
    seen.add(tracker.expenseId);
    const result = evaluateSetAside(bill, tracker, today);
    tracked.push({ kind: "tracked", bill, tracker, result, nextCycle: result.canConfirmNextCycle ? nextCycleDue(bill, tracker, today) : null });
  }
  tracked.sort((a, b) => (a.tracker.cycleDue < b.tracker.cycleDue ? -1 : a.tracker.cycleDue > b.tracker.cycleDue ? 1 : a.bill.name.localeCompare(b.bill.name, "en-US")));

  const eligible: EligibleBill[] = [];
  for (const bill of view.scheduled) {
    if (bill.kind !== "expense" || seen.has(bill.id) || !isEligibleBill(bill)) continue;
    const firstCycle = firstCycleDue(bill, today);
    if (firstCycle) eligible.push({ kind: "eligible", bill, firstCycle });
  }

  const annotations = new Map<string, ForecastAnnotation>();
  for (const item of tracked) {
    const status = item.result.status;
    if (status === "not_eligible") continue;
    if (status === "confirmation_needed" || status === "schedule_changed") {
      const first = view.forecast.flatMap((m) => m.occurrences).find((o) => o.bill.kind === "expense" && o.bill.id === item.bill.id);
      if (first) annotations.set(occurrenceKey(first.bill, first.date), { kind: "needs_confirmation", item });
      continue;
    }
    annotations.set(occurrenceKey(item.bill, item.tracker.cycleDue), { kind: "cycle", item });
  }
  return { items: [...tracked, ...eligible], annotations };
}
