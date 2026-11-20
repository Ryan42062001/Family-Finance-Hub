// FFH-P12 paycheck schedules (Owner-approved design: GitHub issue #203). Pure functions, no I/O.
//
// A schedule holds only facts the household typed: frequency, expected NET (take-home) amount per deposit, the next
// expected deposit date and, for twice-a-month pay, two day-of-month anchors. Everything else is derived.
//
// Dates are date-only "YYYY-MM-DD" strings with UTC calendar arithmetic (no time zone or DST can move a payday).
// Every date is computed from the ORIGINAL anchor, so a short month clamps only that occurrence (31st -> Feb 28 ->
// Mar 31). Paydays are never shifted for weekends or holidays (payroll policy is unknown). Irregular income is
// exactly the one deposit the household entered: it is never repeated or extrapolated.
import { addDays, daysBetween, daysInMonth, isIsoDate, MAX_CENTS, type IsoDate } from "../bills/schedule.ts";

export const PAY_FREQUENCIES = ["weekly", "biweekly", "semimonthly", "monthly", "irregular"] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<PayFrequency, string> = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  semimonthly: "Twice a month",
  monthly: "Once a month",
  irregular: "Irregular (one expected deposit)",
};

export type PaySchedule = {
  id: string;
  incomeSourceId: string;
  frequency: PayFrequency;
  depositCents: number; // expected take-home per deposit; 0 is an explicit answer, never a default
  nextDate: IsoDate; // the anchor: first expected deposit counted by this schedule
  dayOne: number | null; // semimonthly only, 1-31, dayOne < dayTwo
  dayTwo: number | null;
  version: number;
};

export function isPayFrequency(value: unknown): value is PayFrequency {
  return typeof value === "string" && (PAY_FREQUENCIES as readonly string[]).includes(value);
}

function parts(date: IsoDate): [number, number, number] {
  if (!isIsoDate(date)) throw new RangeError("Invalid date");
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

function iso(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// The anchor day clamped to this month's length (the 31st is the 30th in April and the 28th/29th in February).
export function clampedDay(year: number, month: number, anchorDay: number): IsoDate {
  return iso(year, month, Math.min(anchorDay, daysInMonth(year, month)));
}

function isAnchorDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31;
}

export type ScheduleShapeError = "amount_invalid" | "days_missing" | "days_invalid" | "date_invalid" | "date_not_payday" | "days_not_allowed";

// The same rules the database trigger and CHECK constraints enforce. null = valid.
export function scheduleShapeError(s: Pick<PaySchedule, "frequency" | "depositCents" | "nextDate" | "dayOne" | "dayTwo">): ScheduleShapeError | null {
  if (!Number.isSafeInteger(s.depositCents) || s.depositCents < 0 || s.depositCents > MAX_CENTS) return "amount_invalid";
  if (!isIsoDate(s.nextDate)) return "date_invalid";
  if (s.frequency !== "semimonthly") return s.dayOne === null && s.dayTwo === null ? null : "days_not_allowed";
  if (s.dayOne === null || s.dayTwo === null) return "days_missing";
  if (!isAnchorDay(s.dayOne) || !isAnchorDay(s.dayTwo) || s.dayOne >= s.dayTwo) return "days_invalid";
  const [y, m] = parts(s.nextDate);
  return s.nextDate === clampedDay(y, m, s.dayOne) || s.nextDate === clampedDay(y, m, s.dayTwo) ? null : "date_not_payday";
}

// Every expected deposit date of the schedule in [from, to] (inclusive), never before the schedule's own anchor.
// Semimonthly anchors that clamp to the same day of a short month (30th and 31st in February) give two deposits on
// that date: twice-a-month pay is two deposits in every month.
export function depositDates(s: Pick<PaySchedule, "frequency" | "nextDate" | "dayOne" | "dayTwo">, from: IsoDate, to: IsoDate): IsoDate[] {
  parts(from);
  parts(to);
  const start = s.nextDate > from ? s.nextDate : from;
  if (to < start) return [];
  switch (s.frequency) {
    case "irregular":
      return s.nextDate >= from ? [s.nextDate] : [];
    case "weekly":
    case "biweekly": {
      const step = s.frequency === "weekly" ? 7 : 14;
      const out: IsoDate[] = [];
      let k = Math.ceil(daysBetween(s.nextDate, start) / step);
      for (let date = addDays(s.nextDate, k * step); date <= to; k += 1, date = addDays(s.nextDate, k * step)) out.push(date);
      return out;
    }
    case "monthly":
    case "semimonthly": {
      const anchors = s.frequency === "monthly" ? [parts(s.nextDate)[2]] : [s.dayOne, s.dayTwo];
      if (!anchors.every(isAnchorDay)) throw new RangeError("Invalid semimonthly days");
      const out: IsoDate[] = [];
      const [sy, sm] = parts(start);
      const [ty, tm] = parts(to);
      for (let index = sy * 12 + sm - 1; index <= ty * 12 + tm - 1; index += 1) {
        const year = Math.floor(index / 12);
        const month = (index % 12) + 1;
        for (const day of anchors as number[]) {
          const date = clampedDay(year, month, day);
          if (date >= start && date <= to) out.push(date);
        }
      }
      return out.sort();
    }
  }
}

// ---- Safeguard 2: fixed-schedule monthly equivalent, for COMPARISON ONLY ---------------------------------------
// income_sources.monthly_amount stays the plan's authority; this never replaces it. Rounded to the nearest cent
// (half up) in exact integer arithmetic. Irregular income has no monthly equivalent (one deposit is not a pattern).
const PER_YEAR: Record<Exclude<PayFrequency, "irregular">, bigint> = { weekly: BigInt(52), biweekly: BigInt(26), semimonthly: BigInt(24), monthly: BigInt(12) };

export function monthlyEquivalentOfDeposit(depositCents: number, frequency: PayFrequency): number | null {
  if (!Number.isSafeInteger(depositCents) || depositCents < 0 || depositCents > MAX_CENTS) throw new RangeError("Invalid amount in cents");
  if (frequency === "irregular") return null;
  const numerator = BigInt(depositCents) * PER_YEAR[frequency];
  return Number((numerator * BigInt(2) + BigInt(12)) / BigInt(24)); // round(numerator / 12), half up
}

export const MONTHLY_EQUIVALENT_RULE: Record<PayFrequency, string> = {
  weekly: "52 deposits a year ÷ 12",
  biweekly: "26 deposits a year ÷ 12",
  semimonthly: "2 deposits a month",
  monthly: "1 deposit a month",
  irregular: "not compared: one expected deposit is not a monthly pattern",
};
