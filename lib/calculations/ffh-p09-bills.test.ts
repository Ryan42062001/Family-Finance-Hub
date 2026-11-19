// FFH-P09 bills, due dates and exports (issue #170): exact-cent monthly equivalents, anchored date-only recurrence,
// reminders, Upcoming 30 days, the 12-month forecast of ACTUAL occurrences, and formula-safe CSV.
import assert from "node:assert/strict";
import test from "node:test";
import {
  centsFromDb,
  formatCents,
  isAllowedDueDate,
  isIsoDate,
  monthlyEquivalentCents,
  nextOccurrence,
  occurrence,
  occurrencesBetween,
  parseCents,
  reminderActive,
  type Recurrence,
} from "../bills/schedule.ts";
import { buildBillsView, type BillInput } from "../bills/bills-view.ts";
import { csvAmount, csvCell, neutralizeCell, planStepsCsv, PLAN_CSV_HEADER } from "../plan/plan-csv.ts";
import { planFromRaw } from "../plan/plan-result.ts";
import { exampleHouseholdRaw } from "../plan/example-household.ts";
const EXAMPLE_AS_OF = "2026-11-18";

test("monthly equivalent: exact cents, rounded up", () => {
  assert.equal(monthlyEquivalentCents(10000, "yearly"), 834); // $100.00 yearly -> $8.34 (cushion $0.08)
  assert.equal(monthlyEquivalentCents(10000, "quarterly"), 3334);
  assert.equal(monthlyEquivalentCents(10000, "monthly"), 10000);
  assert.equal(monthlyEquivalentCents(1200, "yearly"), 100);
  assert.equal(monthlyEquivalentCents(1201, "yearly"), 101);
  assert.equal(monthlyEquivalentCents(1, "yearly"), 1);
  assert.equal(monthlyEquivalentCents(0, "quarterly"), 0);
  assert.equal(monthlyEquivalentCents(300, "quarterly"), 100);
  assert.equal(monthlyEquivalentCents(301, "quarterly"), 101);
  assert.equal(monthlyEquivalentCents(99_999_999_999_999, "yearly"), 8_333_333_333_334);
  assert.throws(() => monthlyEquivalentCents(1.5, "monthly"));
  assert.throws(() => monthlyEquivalentCents(-1, "monthly"));
  assert.throws(() => monthlyEquivalentCents(100, "weekly" as Recurrence));
  // Same rule as the database trigger for every cent value in a range.
  for (let c = 0; c <= 2400; c += 1) {
    assert.equal(monthlyEquivalentCents(c, "yearly"), Math.ceil(c / 12));
    assert.equal(monthlyEquivalentCents(c, "quarterly"), Math.ceil(c / 3));
  }
});

test("parseCents never uses floating money and refuses ambiguous input", () => {
  assert.equal(parseCents("100"), 10000);
  assert.equal(parseCents("100.5"), 10050);
  assert.equal(parseCents("0.07"), 7);
  assert.equal(parseCents(".07"), 7);
  assert.equal(parseCents("$1,234.56"), 123456);
  assert.equal(parseCents("999999999999.99"), 99_999_999_999_999);
  for (const bad of ["", "-1", "1.005", "1e3", "abc", "1,23", "12.3.4", "1000000000000", " + 5", "0x10", "Infinity", "NaN"]) {
    assert.equal(parseCents(bad), null, bad);
  }
  assert.equal(centsFromDb(8.34), 834);
  assert.equal(centsFromDb("33.33"), 3333);
  assert.equal(centsFromDb(0.1 + 0.2), 30);
  assert.equal(centsFromDb(8.345), null);
  assert.equal(centsFromDb(-1), null);
  assert.equal(centsFromDb(null), null);
  assert.equal(formatCents(834), "$8.34");
  assert.equal(formatCents(123456789), "$1,234,567.89");
});

test("dates: date-only validation and allowed range", () => {
  assert.ok(isIsoDate("2028-02-29"));
  assert.ok(!isIsoDate("2027-02-29"));
  assert.ok(!isIsoDate("2026-04-31"));
  assert.ok(!isIsoDate("2026-1-01"));
  assert.ok(!isIsoDate("2026-01-01T00:00:00Z"));
  assert.ok(isAllowedDueDate("2000-01-01") && isAllowedDueDate("2099-12-31"));
  assert.ok(!isAllowedDueDate("1999-12-31") && !isAllowedDueDate("2100-01-01"));
});

test("month-end clamping is per occurrence; the anchor day returns", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((k) => occurrence("2026-01-31", "quarterly", k)), ["2026-01-31", "2026-04-30", "2026-07-31", "2026-10-31", "2027-01-31"]);
  assert.deepEqual([0, 1, 2, 3].map((k) => occurrence("2026-01-31", "monthly", k)), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  assert.deepEqual([0, 1, 2].map((k) => occurrence("2027-01-30", "monthly", k)), ["2027-01-30", "2027-02-28", "2027-03-30"]);
  assert.equal(occurrence("2028-01-29", "monthly", 1), "2028-02-29");
  assert.equal(occurrence("2027-01-29", "monthly", 1), "2027-02-28");
  // Leap day yearly: Feb 28 in common years, Feb 29 again in a leap year.
  assert.deepEqual([0, 1, 2, 3, 4].map((k) => occurrence("2024-02-29", "yearly", k)), ["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  assert.equal(occurrence("2096-02-29", "yearly", 4), "2100-02-28"); // 2100 is not a leap year
});

test("next occurrence advances from the ORIGINAL anchor, including long-lapsed schedules", () => {
  assert.equal(nextOccurrence("2026-01-31", "monthly", "2026-03-01"), "2026-03-31"); // not Mar 28 from Feb 28
  assert.equal(nextOccurrence("2026-01-31", "monthly", "2026-02-28"), "2026-02-28");
  assert.equal(nextOccurrence("2026-01-31", "monthly", "2026-03-01"), "2026-03-31");
  assert.equal(nextOccurrence("2024-02-29", "yearly", "2026-03-01"), "2027-02-28");
  assert.equal(nextOccurrence("2024-02-29", "yearly", "2027-03-01"), "2028-02-29");
  assert.equal(nextOccurrence("2001-01-31", "quarterly", "2026-11-18"), "2027-01-31");
  assert.equal(nextOccurrence("2026-12-15", "yearly", "2026-11-18"), "2026-12-15"); // future anchor is the next date
  assert.equal(nextOccurrence("2026-11-18", "monthly", "2026-11-18"), "2026-11-18"); // due today stays today
  assert.equal(nextOccurrence("2026-11-17", "monthly", "2026-11-18"), "2026-12-17");
  // Brute force agreement with occurrence(k) for many anchors and days.
  const anchors = ["2024-01-31", "2024-02-29", "2025-03-30", "2025-08-31", "2026-05-15", "2023-12-01"];
  for (const anchor of anchors) for (const rec of ["monthly", "quarterly", "yearly"] as Recurrence[]) {
    for (let day = 0; day < 1200; day += 7) {
      const from = new Date(Date.UTC(2023, 0, 1 + day)).toISOString().slice(0, 10);
      let k = 0;
      while (occurrence(anchor, rec, k) < from) k += 1;
      assert.equal(nextOccurrence(anchor, rec, from), occurrence(anchor, rec, k), `${anchor} ${rec} ${from}`);
    }
  }
});

test("occurrencesBetween lists every actual date, never before the anchor", () => {
  assert.deepEqual(occurrencesBetween("2026-01-31", "monthly", "2026-01-01", "2026-05-31"), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  assert.deepEqual(occurrencesBetween("2026-06-10", "monthly", "2026-01-01", "2026-07-31"), ["2026-06-10", "2026-07-10"]);
  assert.deepEqual(occurrencesBetween("2026-01-15", "yearly", "2026-02-01", "2026-12-31"), []);
  assert.deepEqual(occurrencesBetween("2026-01-15", "monthly", "2026-05-01", "2026-04-01"), []);
});

test("reminders: Off, due day, 1, 3 and 7 days before; past dates never remind", () => {
  assert.equal(reminderActive("2026-11-18", "2026-11-18", null), false);
  assert.equal(reminderActive("2026-11-18", "2026-11-18", 0), true);
  assert.equal(reminderActive("2026-11-19", "2026-11-18", 0), false);
  assert.equal(reminderActive("2026-11-19", "2026-11-18", 1), true);
  assert.equal(reminderActive("2026-11-21", "2026-11-18", 3), true);
  assert.equal(reminderActive("2026-11-22", "2026-11-18", 3), false);
  assert.equal(reminderActive("2026-11-25", "2026-11-18", 7), true);
  assert.equal(reminderActive("2026-11-26", "2026-11-18", 7), false);
  assert.equal(reminderActive("2026-11-17", "2026-11-18", 7), false);
});

const bill = (over: Partial<BillInput>): BillInput => ({ kind: "expense", id: over.name ?? "x", name: "x", paymentCents: 10000, recurrence: "monthly", anchor: null, reminder: null, ...over });

test("bills view: upcoming 30 days, reminders independent of listing, unscheduled kept apart", () => {
  const today = "2026-11-18";
  const view = buildBillsView([
    bill({ name: "Rent", paymentCents: 185000, anchor: "2026-01-01" }),
    bill({ name: "Car insurance", paymentCents: 60000, recurrence: "yearly", anchor: "2025-12-05", reminder: 7 }),
    bill({ name: "Water", paymentCents: 9000, recurrence: "quarterly", anchor: "2026-02-28", reminder: 3 }),
    bill({ name: "Phone", paymentCents: 4500, anchor: "2026-11-18", reminder: 0 }),
    bill({ name: "Groceries", paymentCents: 60000 }),
    bill({ kind: "debt", name: "Visa", paymentCents: 2500, anchor: "2026-10-20", reminder: 1 }),
  ], today);
  assert.equal(view.upcomingEnd, "2026-12-17");
  assert.deepEqual(view.upcoming.map((o) => `${o.date} ${o.bill.name}`), [
    "2026-11-18 Phone", "2026-11-20 Visa", "2026-11-28 Water", "2026-12-01 Rent", "2026-12-05 Car insurance",
  ]);
  assert.equal(view.upcomingTotalCents, 4500 + 2500 + 9000 + 185000 + 60000); // actual payments, not monthly equivalents
  // Water (3 days) is 10 days away: listed in Upcoming but its reminder is not on yet.
  assert.deepEqual(view.reminders.map((b) => b.name), ["Phone"]); // Car insurance (7 days) is 17 days away
  assert.deepEqual(view.unscheduled.map((b) => b.name), ["Groceries"]);
  assert.deepEqual(view.scheduled.map((b) => b.name), ["Phone", "Visa", "Water", "Rent", "Car insurance"]);
  assert.equal(view.monthlyEquivalentCents.expenses, 185000 + 5000 + 3000 + 4500 + 60000);
  assert.equal(view.monthlyEquivalentCents.debts, 2500);
  // Visa (1 day before) is 2 days away: not reminding.
  assert.equal(view.scheduled.find((b) => b.name === "Visa")!.reminderOn, false);
});

test("bills view: a debt is always monthly; a reminder without a due date is Off", () => {
  const view = buildBillsView([bill({ kind: "debt", name: "Loan", recurrence: "yearly", anchor: "2026-11-25", reminder: 7 }), bill({ name: "Gym", reminder: 3 })], "2026-11-18");
  const loan = view.scheduled[0];
  assert.equal(loan.recurrence, "monthly");
  assert.equal(loan.monthlyCents, 10000);
  assert.equal(view.unscheduled[0].reminder, null);
  assert.equal(view.unscheduled[0].reminderOn, false);
});

test("forecast: current month (from today) + 11, totals equal the sum of actual occurrences", () => {
  const today = "2026-11-18";
  const view = buildBillsView([
    bill({ name: "Annual", paymentCents: 10000, recurrence: "yearly", anchor: "2026-03-10" }),
    bill({ name: "Quarterly", paymentCents: 30001, recurrence: "quarterly", anchor: "2026-01-31" }),
    bill({ name: "Monthly", paymentCents: 1999, anchor: "2026-11-05" }),
    bill({ name: "Unscheduled", paymentCents: 77777 }),
  ], today);
  assert.equal(view.forecast.length, 12);
  assert.equal(view.forecast[0].month, "2026-11-01");
  assert.equal(view.forecast[11].month, "2027-10-01");
  // November: Monthly's Nov 5 has passed, so it is not shown; nothing is implied about it.
  assert.deepEqual(view.forecast[0].occurrences.map((o) => o.date), []);
  assert.deepEqual(view.forecast[1].occurrences.map((o) => `${o.date} ${o.bill.name}`), ["2026-12-05 Monthly"]);
  assert.deepEqual(view.forecast[2].occurrences.map((o) => `${o.date} ${o.bill.name}`), ["2027-01-05 Monthly", "2027-01-31 Quarterly"]);
  assert.deepEqual(view.forecast[4].occurrences.map((o) => `${o.date} ${o.bill.name}`), ["2027-03-05 Monthly", "2027-03-10 Annual"]);
  assert.deepEqual(view.forecast[5].occurrences.map((o) => o.date), ["2027-04-05", "2027-04-30"]);
  // The annual bill shows its actual $100.00, not 12 x $8.34.
  assert.equal(view.forecast[4].totalCents, 1999 + 10000);
  const occurrences = view.forecast.flatMap((m) => m.occurrences);
  assert.equal(occurrences.length, 11 + 4 + 1); // Monthly Dec..Oct, Quarterly Jan/Apr/Jul/Oct, Annual Mar
  assert.equal(view.forecastTotalCents, occurrences.reduce((a, o) => a + o.bill.paymentCents, 0));
  assert.equal(view.forecastTotalCents, view.forecast.reduce((a, m) => a + m.totalCents, 0));
  assert.ok(!occurrences.some((o) => o.bill.name === "Unscheduled"));
});

test("forecast includes a bill due today in the current month", () => {
  const view = buildBillsView([bill({ name: "Today", paymentCents: 500, anchor: "2026-10-18" })], "2026-11-18");
  assert.deepEqual(view.forecast[0].occurrences.map((o) => o.date), ["2026-11-18"]);
  assert.deepEqual(view.forecast[0].occurrences.map((o) => o.date), view.upcoming.filter((o) => o.date <= "2026-11-30").map((o) => o.date));
});

test("CSV cells: quoting, escaping and formula neutralisation", () => {
  assert.equal(csvCell("plain"), '"plain"');
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  for (const bad of ["=1+1", "+1", "-1", "@SUM(A1)", " =1", "\t=1", "\r=1", "\u00a0=1", "\u200b=1", "\ufeff=1", "\u0000=1", "\n=1", "\u3000=1", "\uff1d1", "\uff0b1", "\uff0d1", "\uff201", "\tplain"]) {
    assert.ok(neutralizeCell(bad).startsWith("'"), JSON.stringify(bad));
  }
  for (const ok of ["Pay rent", "1234.56", "", "a=b", "Emergency fund - first step"]) assert.equal(neutralizeCell(ok), ok);
  assert.equal(csvAmount(1234.5), "1234.50");
  assert.equal(csvAmount(1234567.891), "1234567.89");
  assert.equal(csvAmount(0), "");
  assert.equal(csvAmount(null), "");
});

test("CSV of the example plan: every current step, including Needs more information, and no ids", () => {
  const plan = planFromRaw(exampleHouseholdRaw(), EXAMPLE_AS_OF);
  assert.ok(plan.ok);
  const csv = planStepsCsv(plan.view);
  assert.ok(csv.startsWith("\ufeff"));
  const lines = csv.slice(1).split("\r\n").filter(Boolean);
  assert.equal(lines[0], PLAN_CSV_HEADER.map((h) => `"${h}"`).join(","));
  assert.equal(lines.length - 1, plan.view.steps.length + plan.view.needsInformation.length);
  for (const step of [...plan.view.steps, ...plan.view.needsInformation]) {
    assert.ok(csv.includes(step.title.replace(/"/g, '""')), step.title);
    assert.ok(!csv.includes(step.id), "internal step id must not be exported");
  }
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(csv));
  assert.ok(!/@[a-z0-9-]+\.[a-z]/i.test(csv));
});
