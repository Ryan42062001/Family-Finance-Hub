// FFH-P12 paycheck-schedule form parsing (guided-financial-input contract, Ryan 2026-11-19, .ai/DECISIONS.md):
//   1. nothing is pre-answered: no frequency is preselected, the amount, date and days start blank, the net-pay box
//      starts unticked, and nothing is filled in from the income's monthly amount;
//   2. a blank amount NEVER becomes $0: it is refused as "missing";
//   3. missing or malformed input is a field-linked validation error, never a guess;
//   4. an explicitly typed 0 is accepted (it is a fact), but it never supports a positive funding conclusion.
// Pure: returns a result instead of throwing, so the page can show the error next to the field.
import { addDays, isIsoDate, MAX_DATE, MIN_DATE, parseCents, type IsoDate } from "../bills/schedule.ts";
import { isPayFrequency, scheduleShapeError, type PayFrequency } from "./schedule.ts";

export type ScheduleField = "frequency" | "amount" | "next_date" | "days" | "net_confirm";
export type ScheduleFieldError =
  | "frequency_missing" | "amount_missing" | "amount_invalid" | "date_missing" | "date_invalid" | "date_past" | "date_far"
  | "days_missing" | "days_invalid" | "date_not_payday" | "net_confirm_missing";

export const FIELD_OF_ERROR: Record<ScheduleFieldError, ScheduleField> = {
  frequency_missing: "frequency",
  amount_missing: "amount",
  amount_invalid: "amount",
  date_missing: "next_date",
  date_invalid: "next_date",
  date_past: "next_date",
  date_far: "next_date",
  days_missing: "days",
  days_invalid: "days",
  date_not_payday: "next_date",
  net_confirm_missing: "net_confirm",
};

export const FIELD_ERROR_TEXT: Record<ScheduleFieldError, string> = {
  frequency_missing: "Choose how often this pay arrives.",
  amount_missing: "Enter the take-home amount of one deposit. Type 0 only if a deposit really is $0.",
  amount_invalid: "Enter a dollar amount with at most two decimals, for example 1250.00.",
  date_missing: "Enter the date the next deposit is expected.",
  date_invalid: "Enter a real calendar date.",
  date_past: "The next expected deposit can't be in the past. Enter the next one still to come.",
  date_far: "Enter a date within the next 12 months.",
  days_missing: "Choose both paydays of the month.",
  days_invalid: "Choose two different days, the first one earlier in the month.",
  date_not_payday: "The next deposit date must fall on one of the two paydays you chose.",
  net_confirm_missing: "Tick the box to confirm this is take-home pay, not gross pay.",
};

// Next-date window, shared with the database trigger: from yesterday (UTC; allows a household's "today" behind UTC)
// through 366 days ahead.
export const NEXT_DATE_PAST_SLACK_DAYS = 1;
export const NEXT_DATE_MAX_DAYS = 366;

export type ScheduleInput = { frequency: PayFrequency; depositCents: number; nextDate: IsoDate; dayOne: number | null; dayTwo: number | null };
export type ParsedSchedule = { ok: true; value: ScheduleInput } | { ok: false; error: ScheduleFieldError };

function day(raw: FormDataEntryValue | null): number | null | "invalid" {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  return /^(?:[1-9]|[12]\d|3[01])$/.test(raw.trim()) ? Number(raw.trim()) : "invalid";
}

export function parseScheduleForm(formData: FormData, today: IsoDate): ParsedSchedule {
  const frequency = formData.get("frequency");
  if (typeof frequency !== "string" || frequency === "") return { ok: false, error: "frequency_missing" };
  if (!isPayFrequency(frequency)) return { ok: false, error: "frequency_missing" };

  const rawAmount = formData.get("amount");
  if (typeof rawAmount !== "string" || rawAmount.trim() === "") return { ok: false, error: "amount_missing" };
  const depositCents = parseCents(rawAmount);
  if (depositCents === null) return { ok: false, error: "amount_invalid" };

  const rawDate = formData.get("next_date");
  if (typeof rawDate !== "string" || rawDate.trim() === "") return { ok: false, error: "date_missing" };
  const nextDate = rawDate.trim();
  if (!isIsoDate(nextDate) || nextDate < MIN_DATE || nextDate > MAX_DATE) return { ok: false, error: "date_invalid" };
  if (nextDate < addDays(today, -NEXT_DATE_PAST_SLACK_DAYS)) return { ok: false, error: "date_past" };
  if (nextDate > addDays(today, NEXT_DATE_MAX_DAYS)) return { ok: false, error: "date_far" };

  let dayOne: number | null = null;
  let dayTwo: number | null = null;
  if (frequency === "semimonthly") {
    const one = day(formData.get("day_one"));
    const two = day(formData.get("day_two"));
    if (one === null || two === null) return { ok: false, error: "days_missing" };
    if (one === "invalid" || two === "invalid") return { ok: false, error: "days_invalid" };
    dayOne = one;
    dayTwo = two;
  }
  const shape = scheduleShapeError({ frequency, depositCents, nextDate, dayOne, dayTwo });
  if (shape === "days_invalid" || shape === "days_missing") return { ok: false, error: shape };
  if (shape === "date_not_payday") return { ok: false, error: "date_not_payday" };
  if (shape === "amount_invalid") return { ok: false, error: "amount_invalid" };
  if (shape !== null) return { ok: false, error: "date_invalid" };

  if (formData.get("net_confirm") !== "yes") return { ok: false, error: "net_confirm_missing" };
  return { ok: true, value: { frequency, depositCents, nextDate, dayOne, dayTwo } };
}
