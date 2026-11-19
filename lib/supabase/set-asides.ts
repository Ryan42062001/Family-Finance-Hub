// FFH-P11: loads the household's bill set-aside trackers through household RLS. Server only. Fails closed: a row that
// doesn't have the expected shape stops the set-aside section instead of being guessed or skipped.
// Read only by the Bills page; never by the financial plan, its snapshot or any export.
import type { SupabaseClient } from "@supabase/supabase-js";
import { BillsDataError } from "@/lib/supabase/bills";
import { centsFromDb, isAllowedDueDate } from "@/lib/bills/schedule";
import { isSetAsideRecurrence, type SetAsideTracker } from "@/lib/bills/set-aside";

export async function loadSetAsides(supabase: SupabaseClient, householdId: string): Promise<SetAsideTracker[]> {
  const { data, error } = await supabase.from("bill_set_asides")
    .select("id, expense_id, cycle_due_date, cycle_anchor_date, cycle_recurrence, reserved_amount, version")
    .eq("household_id", householdId).order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const reservedCents = centsFromDb(row.reserved_amount);
    if (typeof row.id !== "string" || typeof row.expense_id !== "string" || reservedCents === null
      || !isAllowedDueDate(row.cycle_due_date) || !isAllowedDueDate(row.cycle_anchor_date)
      || !isSetAsideRecurrence(row.cycle_recurrence) || !Number.isSafeInteger(row.version) || row.version < 1) {
      throw new BillsDataError("Invalid set-aside");
    }
    return { id: row.id, expenseId: row.expense_id, cycleDue: row.cycle_due_date, cycleAnchor: row.cycle_anchor_date,
      cycleRecurrence: row.cycle_recurrence, reservedCents, version: row.version };
  });
}
