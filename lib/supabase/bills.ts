// FFH-P09: loads the household's bills (existing expenses and debts) through household RLS. Server only.
// Fails closed: a row that doesn't have the expected shape stops the page instead of being guessed or skipped.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillInput } from "@/lib/bills/bills-view";
import { centsFromDb, isAllowedDueDate, isRecurrence, isReminderDays, monthlyEquivalentCents } from "@/lib/bills/schedule";

export class BillsDataError extends Error {}

function due(value: unknown) {
  if (value === null) return null;
  if (!isAllowedDueDate(value)) throw new BillsDataError("Invalid due date");
  return value;
}

function reminder(value: unknown) {
  if (!isReminderDays(value)) throw new BillsDataError("Invalid reminder");
  return value;
}

export async function loadBills(supabase: SupabaseClient, householdId: string): Promise<BillInput[]> {
  const [expenses, debts] = await Promise.all([
    supabase.from("expenses").select("id, name, payment_amount, monthly_amount, recurrence, due_anchor_date, reminder_days").eq("household_id", householdId).order("created_at"),
    supabase.from("debts").select("id, name, minimum_payment, due_anchor_date, reminder_days").eq("household_id", householdId).order("created_at"),
  ]);
  if (expenses.error) throw new Error(expenses.error.message);
  if (debts.error) throw new Error(debts.error.message);
  const bills: BillInput[] = [];
  for (const row of expenses.data ?? []) {
    const paymentCents = centsFromDb(row.payment_amount);
    const monthlyCents = centsFromDb(row.monthly_amount);
    if (paymentCents === null || monthlyCents === null || !isRecurrence(row.recurrence) || typeof row.name !== "string") throw new BillsDataError("Invalid expense");
    // The database derives monthly_amount; the page uses the same rule and must agree exactly.
    if (monthlyEquivalentCents(paymentCents, row.recurrence) !== monthlyCents) throw new BillsDataError("Monthly amount mismatch");
    bills.push({ kind: "expense", id: row.id, name: row.name, paymentCents, recurrence: row.recurrence, anchor: due(row.due_anchor_date), reminder: reminder(row.reminder_days) });
  }
  for (const row of debts.data ?? []) {
    const paymentCents = centsFromDb(row.minimum_payment);
    if (paymentCents === null || typeof row.name !== "string") throw new BillsDataError("Invalid debt");
    bills.push({ kind: "debt", id: row.id, name: row.name, paymentCents, recurrence: "monthly", anchor: due(row.due_anchor_date), reminder: reminder(row.reminder_days) });
  }
  return bills;
}
