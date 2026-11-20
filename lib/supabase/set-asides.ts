// FFH-P11: loads the household's bill set-aside trackers through household RLS. Server only. Fails closed: a row that
// doesn't have the expected shape stops the set-aside section instead of being guessed or skipped.
// Read only by the Bills page; never by the financial plan, its snapshot or any export.
import type { SupabaseClient } from "@supabase/supabase-js";
import { BillsDataError } from "@/lib/supabase/bills";
import { centsFromDb, isAllowedDueDate } from "@/lib/bills/schedule";
import { isSetAsideRecurrence, type SetAsideTracker } from "@/lib/bills/set-aside";

export const SET_ASIDE_COLUMNS = "id, expense_id, cycle_due_date, cycle_anchor_date, cycle_recurrence, reserved_amount, version";

// One database row -> tracker, or BillsDataError for anything not exactly as expected.
export function parseSetAsideRow(row: Record<string, unknown>): SetAsideTracker {
  const reservedCents = centsFromDb(row.reserved_amount);
  if (typeof row.id !== "string" || typeof row.expense_id !== "string" || reservedCents === null
    || !isAllowedDueDate(row.cycle_due_date) || !isAllowedDueDate(row.cycle_anchor_date)
    || !isSetAsideRecurrence(row.cycle_recurrence) || typeof row.version !== "number" || !Number.isSafeInteger(row.version) || row.version < 1) {
    throw new BillsDataError("Invalid set-aside");
  }
  return { id: row.id, expenseId: row.expense_id, cycleDue: row.cycle_due_date, cycleAnchor: row.cycle_anchor_date,
    cycleRecurrence: row.cycle_recurrence, reservedCents, version: row.version };
}

export async function loadSetAsides(supabase: SupabaseClient, householdId: string): Promise<SetAsideTracker[]> {
  const { data, error } = await supabase.from("bill_set_asides")
    .select(SET_ASIDE_COLUMNS)
    .eq("household_id", householdId).order("created_at");
  // Any read failure (including the table not existing yet on a database without the P11 migration) hides only the
  // set-aside section: the caller shows "can't be shown right now" and the P09 bills stay available.
  if (error) throw new BillsDataError("Set-asides unavailable");
  return (data ?? []).map((row) => parseSetAsideRow(row));
}
