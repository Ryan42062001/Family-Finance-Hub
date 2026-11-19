// FFH-P11 irregular-expense set-asides (issue #172): exact-cent gap, surplus and catch-up (rounded UP), calendar-month
// saving periods, honest due-today / passed / schedule-changed states, explicit next-cycle dates, the guided-input
// contract for the reserve form, and noninterference with the P09 Bills view, forecast and the financial plan.
import assert from "node:assert/strict";
import test from "node:test";
import {
  ceilDiv,
  evaluateSetAside,
  firstCycleDue,
  isEligibleBill,
  nextCycleDue,
  progressPercent,
  type SetAsideBill,
  type SetAsideTracker,
} from "../bills/set-aside.ts";
import { buildSetAsideSection, occurrenceKey } from "../bills/set-aside-view.ts";
import { centsToDecimal, confirmed, formDate, formUuid, formVersion, reportedAmount } from "../bills/set-aside-form.ts";
import { buildBillsView, type BillInput } from "../bills/bills-view.ts";
import { MAX_CENTS, monthlyEquivalentCents } from "../bills/schedule.ts";
import { planFromRaw } from "../plan/plan-result.ts";
import { exampleHouseholdRaw } from "../plan/example-household.ts";

const yearly = (paymentCents: number, anchor: string | null = "2027-05-19"): SetAsideBill => ({ paymentCents, recurrence: "yearly", anchor });
const tracker = (over: Partial<SetAsideTracker> = {}): SetAsideTracker => ({
  id: "00000000-0000-4000-8000-000000000001",
  expenseId: "00000000-0000-4000-8000-0000000000e1",
  cycleDue: "2027-05-19",
  cycleAnchor: "2027-05-19",
  cycleRecurrence: "yearly",
  reservedCents: 0,
  version: 1,
  ...over,
});
const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

test("issue #172 example: $1,200 yearly, $300 reported, 6 periods -> $900 needed, $150.00 per period", () => {
  const r = evaluateSetAside(yearly(120000), tracker({ reservedCents: 30000 }), "2026-11-19");
  assert.equal(r.status, "in_progress");
  assert.equal(r.targetCents, 120000);
  assert.equal(r.remainingCents, 90000);
  assert.equal(r.surplusCents, 0);
  assert.equal(r.savingPeriods, 6);
  assert.equal(r.catchUpCents, 15000);
  assert.equal(r.progressPercent, 25);
  // Distinct from (and never replacing) the P09 monthly planning amount, which stays $100.00.
  assert.equal(monthlyEquivalentCents(120000, "yearly"), 10000);
});

test("catch-up always rounds UP to the cent; the combined periods exceed the gap by less than one cent per period", () => {
  for (const [remaining, periods, expected] of [[100001, 3, 33334], [100000, 3, 33334], [99999, 3, 33333], [1, 12, 1], [7, 2, 4], [0, 5, 0], [MAX_CENTS, 1, MAX_CENTS]] as const) {
    const got = ceilDiv(remaining, periods);
    assert.equal(got, expected, `${remaining}/${periods}`);
    assert.ok(got * periods >= remaining && got * periods - remaining < periods);
  }
  assert.throws(() => ceilDiv(1, 0), RangeError);
  assert.throws(() => ceilDiv(-1, 2), RangeError);
  assert.throws(() => ceilDiv(1.5, 2), RangeError);
  // Through the evaluator: $1,000.01 still needed over 3 periods -> $333.34.
  const r = evaluateSetAside(yearly(100001, "2027-02-19"), tracker({ cycleDue: "2027-02-19", cycleAnchor: "2027-02-19" }), "2026-11-19");
  assert.equal(r.savingPeriods, 3);
  assert.equal(r.catchUpCents, 33334);
});

test("no reserve, partial funding, fully funded, surplus and progress (rounded DOWN)", () => {
  const bill = yearly(120000);
  const none = evaluateSetAside(bill, tracker({ reservedCents: 0 }), "2026-11-19");
  assert.deepEqual([none.status, none.remainingCents, none.surplusCents, none.progressPercent, none.catchUpCents], ["in_progress", 120000, 0, 0, 20000]);
  const almost = evaluateSetAside(bill, tracker({ reservedCents: 119999 }), "2026-11-19");
  assert.deepEqual([almost.status, almost.remainingCents, almost.progressPercent, almost.catchUpCents], ["in_progress", 1, 99, 1]);
  const exact = evaluateSetAside(bill, tracker({ reservedCents: 120000 }), "2026-11-19");
  assert.deepEqual([exact.status, exact.remainingCents, exact.surplusCents, exact.progressPercent, exact.catchUpCents], ["funded", 0, 0, 100, null]);
  const over = evaluateSetAside(bill, tracker({ reservedCents: 130001 }), "2026-11-19");
  assert.deepEqual([over.status, over.remainingCents, over.surplusCents, over.progressPercent, over.catchUpCents], ["funded", 0, 10001, 100, null]);
  assert.equal(progressPercent(1, 3), 33);
  assert.equal(progressPercent(MAX_CENTS - 1, MAX_CENTS), 99);
  assert.throws(() => progressPercent(1, 0), RangeError);
});

test("saving periods: released P07 calendar-month rule; a part month counts once only while the due date is in the future", () => {
  const cases: Array<[string, string, number]> = [
    ["2026-11-19", "2026-11-20", 1], // tomorrow: one remaining period, not "a month"
    ["2026-11-19", "2026-11-30", 1], // later this month
    ["2026-11-19", "2026-12-15", 1], // next month, before today's day of month
    ["2026-11-19", "2026-12-19", 1],
    ["2026-11-19", "2026-12-20", 2],
    ["2026-11-30", "2027-02-28", 3],
    ["2026-01-31", "2026-02-28", 1],
  ];
  for (const [today, due, periods] of cases) {
    const r = evaluateSetAside(yearly(1200, due), tracker({ cycleDue: due, cycleAnchor: due, reservedCents: 0 }), today);
    assert.equal(r.status, "in_progress", `${today} -> ${due}`);
    assert.equal(r.savingPeriods, periods, `${today} -> ${due}`);
    assert.equal(r.catchUpCents, Math.ceil(1200 / periods), `${today} -> ${due}`);
  }
  const tomorrow = evaluateSetAside(yearly(5000, "2026-11-20"), tracker({ cycleDue: "2026-11-20", cycleAnchor: "2026-11-20", reservedCents: 1000 }), "2026-11-19");
  assert.deepEqual([tomorrow.savingPeriods, tomorrow.catchUpCents, tomorrow.daysUntilDue], [1, 4000, 1]);
});

test("due today: the amount still needed, no saving periods and no catch-up", () => {
  const r = evaluateSetAside(yearly(50000, "2026-11-19"), tracker({ cycleDue: "2026-11-19", cycleAnchor: "2026-11-19", reservedCents: 20000 }), "2026-11-19");
  assert.deepEqual([r.status, r.remainingCents, r.savingPeriods, r.catchUpCents, r.daysUntilDue], ["due_now", 30000, null, null, 0]);
  assert.equal(r.canConfirmNextCycle, true);
  const funded = evaluateSetAside(yearly(50000, "2026-11-19"), tracker({ cycleDue: "2026-11-19", cycleAnchor: "2026-11-19", reservedCents: 60000 }), "2026-11-19");
  assert.deepEqual([funded.status, funded.remainingCents, funded.surplusCents, funded.catchUpCents], ["due_now", 0, 10000, null]);
});

test("passed cycle: confirmation needed; never assumed paid, never rolled forward, the old shortfall stays visible", () => {
  const bill: SetAsideBill = { paymentCents: 30000, recurrence: "quarterly", anchor: "2026-01-15" };
  const t = tracker({ cycleDue: "2026-10-15", cycleAnchor: "2026-01-15", cycleRecurrence: "quarterly", reservedCents: 10000 });
  const r = evaluateSetAside(bill, t, "2026-11-19");
  assert.deepEqual([r.status, r.cycleDue, r.remainingCents, r.savingPeriods, r.catchUpCents], ["confirmation_needed", "2026-10-15", 20000, null, null]);
  assert.equal(r.canConfirmNextCycle, true);
  assert.equal(nextCycleDue(bill, t, "2026-11-19"), "2027-01-15");
  // Several cycles missed: the next cycle is the next due date from today, never one already in the past.
  assert.equal(nextCycleDue(bill, tracker({ ...t, cycleDue: "2026-01-15" }), "2026-11-19"), "2027-01-15");
  // On the due day the next cycle is the following due date, not today again.
  assert.equal(nextCycleDue(bill, tracker({ ...t, cycleDue: "2027-01-15" }), "2027-01-15"), "2027-04-15");
  // Still in the future with the same schedule: nothing to confirm.
  assert.equal(nextCycleDue(bill, tracker({ ...t, cycleDue: "2027-01-15" }), "2026-11-19"), null);
});

test("leap years and month-end anchors follow the P09 rule (original anchor, clamped per occurrence)", () => {
  const leap: SetAsideBill = { paymentCents: 10000, recurrence: "yearly", anchor: "2024-02-29" };
  assert.equal(firstCycleDue(leap, "2027-01-10"), "2027-02-28");
  const passedLeap = tracker({ cycleDue: "2027-02-28", cycleAnchor: "2024-02-29" });
  assert.equal(nextCycleDue(leap, passedLeap, "2027-03-01"), "2028-02-29");
  const monthEnd: SetAsideBill = { paymentCents: 10000, recurrence: "quarterly", anchor: "2026-01-31" };
  assert.equal(firstCycleDue(monthEnd, "2026-02-01"), "2026-04-30");
  assert.equal(nextCycleDue(monthEnd, tracker({ cycleDue: "2026-04-30", cycleAnchor: "2026-01-31", cycleRecurrence: "quarterly" }), "2026-04-30"), "2026-07-31");
  // Feb 28 -> Feb 29 in a leap year is one calendar-month period when today is Jan 31.
  const r = evaluateSetAside(leap, tracker({ cycleDue: "2028-02-29", cycleAnchor: "2024-02-29", reservedCents: 0 }), "2028-01-31");
  assert.equal(r.savingPeriods, 1);
});

test("bill changes: amount edits recompute the gap without touching the reserve; schedule edits need confirmation", () => {
  const t = tracker({ reservedCents: 30000 });
  const raised = evaluateSetAside(yearly(150000), t, "2026-11-19");
  assert.deepEqual([raised.reservedCents, raised.remainingCents, raised.catchUpCents], [30000, 120000, 20000]);
  const lowered = evaluateSetAside(yearly(20000), t, "2026-11-19");
  assert.deepEqual([lowered.status, lowered.reservedCents, lowered.surplusCents], ["funded", 30000, 10000]);
  const moved = evaluateSetAside(yearly(120000, "2027-06-01"), t, "2026-11-19");
  assert.deepEqual([moved.status, moved.reservedCents, moved.savingPeriods, moved.catchUpCents, moved.canConfirmNextCycle], ["schedule_changed", 30000, null, null, true]);
  assert.equal(nextCycleDue(yearly(120000, "2027-06-01"), t, "2026-11-19"), "2027-06-01");
  const quarterly = evaluateSetAside({ paymentCents: 120000, recurrence: "quarterly", anchor: "2027-05-19" }, t, "2026-11-19");
  assert.equal(quarterly.status, "schedule_changed");
  for (const bill of [{ paymentCents: 120000, recurrence: "monthly", anchor: "2027-05-19" }, yearly(120000, null), yearly(0)] as SetAsideBill[]) {
    const r = evaluateSetAside(bill, t, "2026-11-19");
    assert.deepEqual([r.status, r.targetCents, r.remainingCents, r.catchUpCents, r.reservedCents, r.canConfirmNextCycle], ["not_eligible", null, null, null, 30000, false]);
  }
});

test("eligibility: scheduled quarterly/yearly expenses with an amount only", () => {
  assert.equal(isEligibleBill(yearly(1)), true);
  assert.equal(isEligibleBill({ paymentCents: 1, recurrence: "quarterly", anchor: "2026-12-01" }), true);
  assert.equal(isEligibleBill({ paymentCents: 1, recurrence: "monthly", anchor: "2026-12-01" }), false);
  assert.equal(isEligibleBill(yearly(1, null)), false);
  assert.equal(isEligibleBill(yearly(0)), false);
  assert.equal(isEligibleBill(yearly(-1)), false);
  assert.equal(isEligibleBill(yearly(1.5)), false);
  assert.equal(isEligibleBill(yearly(MAX_CENTS + 1)), false);
  assert.equal(isEligibleBill(yearly(1, "2026-02-30")), false);
  assert.equal(firstCycleDue({ paymentCents: 1, recurrence: "monthly", anchor: "2026-12-01" }, "2026-11-19"), null);
});

test("invalid, negative, sub-cent, non-finite and out-of-range values fail closed", () => {
  const bill = yearly(120000);
  for (const reservedCents of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_CENTS + 1]) {
    assert.throws(() => evaluateSetAside(bill, tracker({ reservedCents }), "2026-11-19"), RangeError, String(reservedCents));
  }
  for (const cycleDue of ["2026-02-30", "1999-12-31", "2100-01-01", "not-a-date"]) {
    assert.throws(() => evaluateSetAside(bill, tracker({ cycleDue }), "2026-11-19"), RangeError, cycleDue);
  }
  assert.throws(() => evaluateSetAside(bill, tracker({ cycleRecurrence: "monthly" as never }), "2026-11-19"), RangeError);
  assert.throws(() => evaluateSetAside(bill, tracker(), "11/19/2026"), RangeError);
  // Maximum supported amounts stay exact.
  const max = evaluateSetAside(yearly(MAX_CENTS), tracker({ reservedCents: MAX_CENTS - 1 }), "2026-11-19");
  assert.deepEqual([max.remainingCents, max.progressPercent, max.catchUpCents], [1, 99, 1]);
});

test("guided-input contract: a blank amount is missing (never $0); typed 0 is accepted; confirmation must be ticked", () => {
  assert.deepEqual(reportedAmount(form({}), "reserved"), { ok: false, error: "amount_missing" });
  assert.deepEqual(reportedAmount(form({ reserved: "" }), "reserved"), { ok: false, error: "amount_missing" });
  assert.deepEqual(reportedAmount(form({ reserved: "   " }), "reserved"), { ok: false, error: "amount_missing" });
  assert.deepEqual(reportedAmount(form({ reserved: "0" }), "reserved"), { ok: true, value: 0 });
  assert.deepEqual(reportedAmount(form({ reserved: "$0.00" }), "reserved"), { ok: true, value: 0 });
  assert.deepEqual(reportedAmount(form({ reserved: "1,234.5" }), "reserved"), { ok: true, value: 123450 });
  assert.deepEqual(reportedAmount(form({ reserved: "999999999999.99" }), "reserved"), { ok: true, value: MAX_CENTS });
  for (const bad of ["-5", "1.005", "abc", "1e3", "1000000000000", "12.3.4", "Infinity", "NaN"]) {
    assert.deepEqual(reportedAmount(form({ reserved: bad }), "reserved"), { ok: false, error: "amount_invalid" }, bad);
  }
  assert.deepEqual(confirmed(form({})), { ok: false, error: "confirm_missing" });
  assert.deepEqual(confirmed(form({ confirm: "on" })), { ok: false, error: "confirm_missing" });
  assert.deepEqual(confirmed(form({ confirm: "yes" })), { ok: true, value: true });
  assert.equal(centsToDecimal(0), "0.00");
  assert.equal(centsToDecimal(123405), "1234.05");
  assert.equal(centsToDecimal(MAX_CENTS), "999999999999.99");
  assert.throws(() => centsToDecimal(-1));
  // Structural fields are not guessed either.
  assert.throws(() => formUuid(form({ id: "1 or 1=1" }), "id"));
  assert.throws(() => formDate(form({ d: "2026-13-01" }), "d"));
  assert.throws(() => formVersion(form({ version: "0" })));
  assert.throws(() => formVersion(form({ version: "1.5" })));
  assert.equal(formVersion(form({ version: "42" })), 42);
});

// ---- Bills page model and noninterference ----------------------------------------------------------------------

const ids = { annual: "00000000-0000-4000-8000-0000000000a1", quarterly: "00000000-0000-4000-8000-0000000000a2", monthly: "00000000-0000-4000-8000-0000000000a3", unscheduled: "00000000-0000-4000-8000-0000000000a4", debt: "00000000-0000-4000-8000-0000000000d1" };
const inputs: BillInput[] = [
  { kind: "expense", id: ids.annual, name: "ZZ-Insurance", paymentCents: 120000, recurrence: "yearly", anchor: "2027-05-19", reminder: null },
  { kind: "expense", id: ids.quarterly, name: "ZZ-Water", paymentCents: 30000, recurrence: "quarterly", anchor: "2026-01-15", reminder: 3 },
  { kind: "expense", id: ids.monthly, name: "ZZ-Rent", paymentCents: 150000, recurrence: "monthly", anchor: "2026-01-01", reminder: null },
  { kind: "expense", id: ids.unscheduled, name: "ZZ-Taxes", paymentCents: 90000, recurrence: "yearly", anchor: null, reminder: null },
  { kind: "debt", id: ids.debt, name: "ZZ-Card", paymentCents: 2500, recurrence: "monthly", anchor: "2026-01-20", reminder: null },
];

test("Bills model: only scheduled quarterly/yearly expenses are offered; monthly, debts and unscheduled are not", () => {
  const view = buildBillsView(inputs, "2026-11-19");
  const section = buildSetAsideSection(view, [], "2026-11-19");
  assert.deepEqual(section.items.map((i) => [i.kind, i.bill.id, i.kind === "eligible" ? i.firstCycle : null]), [
    ["eligible", ids.quarterly, "2027-01-15"],
    ["eligible", ids.annual, "2027-05-19"],
  ]);
});

test("Bills model: trackers annotate the forecast without changing any P09 amount, date or total", () => {
  const today = "2026-11-19";
  const view = buildBillsView(inputs, today);
  const before = structuredClone(view);
  const trackers = [
    tracker({ expenseId: ids.annual, reservedCents: 30000 }),
    tracker({ id: "00000000-0000-4000-8000-000000000002", expenseId: ids.quarterly, cycleDue: "2026-10-15", cycleAnchor: "2026-01-15", cycleRecurrence: "quarterly", reservedCents: 50000 }),
  ];
  const section = buildSetAsideSection(view, trackers, today);
  assert.deepEqual(view, before, "the P09 view is not mutated");
  assert.deepEqual(buildBillsView(inputs, today), before, "rebuilding gives the same P09 view");
  const annual = section.items.find((i) => i.bill.id === ids.annual);
  assert.equal(annual?.kind === "tracked" && annual.result.catchUpCents, 15000);
  assert.equal(section.annotations.get(occurrenceKey({ kind: "expense", id: ids.annual }, "2027-05-19"))?.kind, "cycle");
  // The passed quarterly cycle is flagged on the bill's first forecast payment, with its own surplus kept visible.
  const water = section.items.find((i) => i.bill.id === ids.quarterly);
  assert.ok(water?.kind === "tracked");
  assert.deepEqual([water.result.status, water.result.surplusCents, water.nextCycle], ["confirmation_needed", 20000, "2027-01-15"]);
  assert.equal(section.annotations.get(occurrenceKey({ kind: "expense", id: ids.quarterly }, "2027-01-15"))?.kind, "needs_confirmation");
  // Forecast totals are the actual payments only: $1,200 + 4 x $300 water + 12 x rent + 12 x card minimum (rest of Nov counts).
  assert.equal(view.forecastTotalCents, before.forecastTotalCents);
  assert.equal(view.monthlyEquivalentCents.total, before.monthlyEquivalentCents.total);
});

test("Bills model fails closed on a tracker that doesn't match one of the household's expenses", () => {
  const view = buildBillsView(inputs, "2026-11-19");
  assert.throws(() => buildSetAsideSection(view, [tracker({ expenseId: "00000000-0000-4000-8000-0000000000ff" })], "2026-11-19"), RangeError);
  assert.throws(() => buildSetAsideSection(view, [tracker({ expenseId: ids.debt })], "2026-11-19"), RangeError);
  assert.throws(() => buildSetAsideSection(view, [tracker({ expenseId: ids.annual }), tracker({ expenseId: ids.annual })], "2026-11-19"), RangeError);
});

test("financial plan noninterference: the plan has no set-aside input and its result is unchanged", () => {
  const before = planFromRaw(exampleHouseholdRaw(), "2026-11-19");
  buildSetAsideSection(buildBillsView(inputs, "2026-11-19"), [tracker({ expenseId: ids.annual, reservedCents: 999999 })], "2026-11-19");
  assert.deepEqual(planFromRaw(exampleHouseholdRaw(), "2026-11-19"), before);
});
