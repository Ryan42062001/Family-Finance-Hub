// FFH-P09 Bills page model. Bills are the household's existing expenses (with recurrence) and debts (monthly
// minimum payments). Pure: callers pass rows already loaded through household RLS and "today" as a date.
//
// Two kinds of amounts are kept apart everywhere:
//   * actual payments: what is paid on a due date (an expense's payment amount; a debt's minimum payment);
//   * monthly planning equivalents: what the plan budgets each month (rounded up to the cent).
// The forecast and "Upcoming 30 days" only ever add actual payments on real scheduled dates.
import {
  addDays,
  daysBetween,
  monthEnd,
  monthStart,
  monthlyEquivalentCents,
  nextOccurrence,
  occurrencesBetween,
  reminderActive,
  type IsoDate,
  type Recurrence,
  type ReminderDays,
} from "./schedule.ts";

export type BillInput = {
  kind: "expense" | "debt";
  id: string; // used only for form targets and React keys; never exported
  name: string;
  paymentCents: number;
  recurrence: Recurrence; // debts are always monthly
  anchor: IsoDate | null; // null = unscheduled
  reminder: ReminderDays;
};

export type Bill = BillInput & { monthlyCents: number; nextDue: IsoDate | null; reminderOn: boolean; daysUntil: number | null };
export type Occurrence = { date: IsoDate; bill: Bill };
export type ForecastMonth = { month: IsoDate; totalCents: number; occurrences: Occurrence[] };

export type BillsView = {
  today: IsoDate;
  upcomingEnd: IsoDate;
  upcoming: Occurrence[]; // actual payments due today through upcomingEnd
  upcomingTotalCents: number;
  reminders: Bill[]; // bills whose reminder is on and whose next due date is within the chosen days
  scheduled: Bill[]; // by next due date, then name
  unscheduled: Bill[]; // by name
  monthlyEquivalentCents: { expenses: number; debts: number; total: number }; // every bill, scheduled or not
  forecast: ForecastMonth[]; // current calendar month (from today) plus the next 11
  forecastTotalCents: number;
};

export const UPCOMING_DAYS = 30;
export const FORECAST_MONTHS = 12;

const byName = (a: Bill, b: Bill) => a.name.localeCompare(b.name, "en-US") || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);
const byOccurrence = (a: Occurrence, b: Occurrence) => (a.date < b.date ? -1 : a.date > b.date ? 1 : byName(a.bill, b.bill));

export function buildBillsView(inputs: BillInput[], today: IsoDate): BillsView {
  const bills: Bill[] = inputs.map((input) => {
    const recurrence: Recurrence = input.kind === "debt" ? "monthly" : input.recurrence;
    const nextDue = input.anchor ? nextOccurrence(input.anchor, recurrence, today) : null;
    const reminder = nextDue ? input.reminder : null;
    return {
      ...input,
      recurrence,
      reminder,
      monthlyCents: monthlyEquivalentCents(input.paymentCents, recurrence),
      nextDue,
      reminderOn: nextDue ? reminderActive(nextDue, today, reminder) : false,
      daysUntil: nextDue ? daysBetween(today, nextDue) : null,
    };
  });

  const scheduled = bills.filter((b) => b.nextDue).sort((a, b) => (a.nextDue! < b.nextDue! ? -1 : a.nextDue! > b.nextDue! ? 1 : byName(a, b)));
  const unscheduled = bills.filter((b) => !b.nextDue).sort(byName);

  const upcomingEnd = addDays(today, UPCOMING_DAYS - 1);
  const upcoming = scheduled
    .flatMap((bill) => occurrencesBetween(bill.anchor!, bill.recurrence, today, upcomingEnd).map((date) => ({ date, bill })))
    .sort(byOccurrence);

  const forecast: ForecastMonth[] = [];
  for (let offset = 0; offset < FORECAST_MONTHS; offset += 1) {
    const from = offset === 0 ? today : monthStart(today, offset);
    const to = monthEnd(today, offset);
    const occurrences = scheduled
      .flatMap((bill) => occurrencesBetween(bill.anchor!, bill.recurrence, from, to).map((date) => ({ date, bill })))
      .sort(byOccurrence);
    forecast.push({ month: monthStart(today, offset), totalCents: sum(occurrences.map((o) => o.bill.paymentCents)), occurrences });
  }

  const expenseMonthly = sum(bills.filter((b) => b.kind === "expense").map((b) => b.monthlyCents));
  const debtMonthly = sum(bills.filter((b) => b.kind === "debt").map((b) => b.monthlyCents));
  return {
    today,
    upcomingEnd,
    upcoming,
    upcomingTotalCents: sum(upcoming.map((o) => o.bill.paymentCents)),
    reminders: scheduled.filter((b) => b.reminderOn),
    scheduled,
    unscheduled,
    monthlyEquivalentCents: { expenses: expenseMonthly, debts: debtMonthly, total: expenseMonthly + debtMonthly },
    forecast,
    forecastTotalCents: sum(forecast.map((m) => m.totalCents)),
  };
}

function sum(values: number[]): number {
  const total = values.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new RangeError("Bill total out of range");
  return total;
}
