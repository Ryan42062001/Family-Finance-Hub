// FFH-P12: loads the household's pay schedules through household RLS. Server only. Fails closed: a row that doesn't
// have the expected shape stops the paycheck plan instead of being guessed or skipped. Read only by /plan/paychecks;
// never by the financial plan, its snapshot, the Bills page or any export.
import type { SupabaseClient } from "@supabase/supabase-js";
import { centsFromDb, isAllowedDueDate } from "@/lib/bills/schedule";
import { PaycheckDataError } from "@/lib/paychecks/plan";
import { isPayFrequency, scheduleShapeError, type PaySchedule } from "@/lib/paychecks/schedule";

export const PAY_SCHEDULE_COLUMNS = "id, income_source_id, frequency, expected_deposit_amount, next_expected_deposit_date, semimonthly_day_one, semimonthly_day_two, version";

// Thrown when the table can't be read at all (for example on a database without the P12 migration yet).
export class PaySchedulesUnavailableError extends Error {}

const day = (value: unknown) => (value === null ? null : typeof value === "number" && Number.isInteger(value) ? value : Number.NaN);

export function parsePayScheduleRow(row: Record<string, unknown>): PaySchedule {
  const depositCents = centsFromDb(row.expected_deposit_amount);
  if (typeof row.id !== "string" || typeof row.income_source_id !== "string" || depositCents === null || !isPayFrequency(row.frequency)
    || !isAllowedDueDate(row.next_expected_deposit_date) || typeof row.version !== "number" || !Number.isSafeInteger(row.version) || row.version < 1) {
    throw new PaycheckDataError("Invalid pay schedule");
  }
  const schedule: PaySchedule = { id: row.id, incomeSourceId: row.income_source_id, frequency: row.frequency, depositCents,
    nextDate: row.next_expected_deposit_date, dayOne: day(row.semimonthly_day_one), dayTwo: day(row.semimonthly_day_two), version: row.version };
  if (scheduleShapeError(schedule) !== null) throw new PaycheckDataError("Invalid pay schedule");
  return schedule;
}

export async function loadPaySchedules(supabase: SupabaseClient, householdId: string): Promise<PaySchedule[]> {
  const { data, error } = await supabase.from("income_pay_schedules").select(PAY_SCHEDULE_COLUMNS)
    .eq("household_id", householdId).order("created_at");
  if (error) throw new PaySchedulesUnavailableError("Pay schedules unavailable");
  return (data ?? []).map((row) => parsePayScheduleRow(row));
}
