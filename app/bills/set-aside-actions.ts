"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { centsFromDb, type IsoDate } from "@/lib/bills/schedule";
import { evaluateSetAside, firstCycleDue, isEligibleBill, isSetAsideRecurrence, nextCycleDue, type SetAsideBill, type SetAsideTracker } from "@/lib/bills/set-aside";
import { centsToDecimal, confirmed, formDate, formRecurrence, formUuid, formVersion, reportedAmount, type SetAsideFieldError } from "@/lib/bills/set-aside-form";
import { todayUtc } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { createClient } from "@/lib/supabase/server";

// FFH-P11 set-aside trackers (issue #172). Identity and household come from the server, never the form; owner/member
// only, which the database enforces again (RLS through can_write_household_financials, gated by session_ok). Every
// date the form showed is recomputed here from the bill's CURRENT schedule and must match, and every change to an
// existing tracker is conditional on the version that was read (no silent overwrite). Nothing here writes a bill, an
// expense or anything the financial plan reads; the plan's pages are therefore not revalidated.

export type SetAsideForm = "start" | "update" | "cycle" | "stop";
export type SetAsideNotice = "started" | "updated" | "cycle" | "stopped";
export type SetAsideError = SetAsideFieldError | "changed" | "exists" | "not_eligible" | "not_saved" | "read_only";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function back(form: SetAsideForm, expenseId: string, outcome: { notice: SetAsideNotice } | { error: SetAsideError }): never {
  const query = "notice" in outcome ? `sa_notice=${outcome.notice}` : `sa_form=${form}&sa_error=${outcome.error}`;
  if ("notice" in outcome) revalidatePath("/bills");
  redirect(`/bills?${query}&sa_bill=${expenseId}#set-aside-${expenseId}`);
}

async function writer() {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");
  return { householdId: authority.householdId, canWrite: authority.role === "owner" || authority.role === "member" };
}

// The bill as it is NOW, read through household RLS.
async function loadBill(supabase: Supabase, householdId: string, expenseId: string): Promise<SetAsideBill | null> {
  const { data, error } = await supabase.from("expenses").select("payment_amount, recurrence, due_anchor_date")
    .eq("id", expenseId).eq("household_id", householdId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const paymentCents = centsFromDb(data.payment_amount);
  if (paymentCents === null) throw new Error("Invalid expense amount");
  return { paymentCents, recurrence: data.recurrence, anchor: data.due_anchor_date };
}

async function loadTracker(supabase: Supabase, householdId: string, trackerId: string, expenseId: string): Promise<SetAsideTracker | null> {
  const { data, error } = await supabase.from("bill_set_asides")
    .select("id, expense_id, cycle_due_date, cycle_anchor_date, cycle_recurrence, reserved_amount, version")
    .eq("id", trackerId).eq("household_id", householdId).eq("expense_id", expenseId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const reservedCents = centsFromDb(data.reserved_amount);
  if (reservedCents === null || !isSetAsideRecurrence(data.cycle_recurrence)) throw new Error("Invalid set-aside");
  return { id: data.id, expenseId: data.expense_id, cycleDue: data.cycle_due_date, cycleAnchor: data.cycle_anchor_date,
    cycleRecurrence: data.cycle_recurrence, reservedCents, version: data.version };
}

// Database refusals mapped to fixed messages; anything unexpected is thrown (fails closed, nothing guessed).
function writeError(code: string | undefined): SetAsideError {
  if (code === "23505") return "exists";
  if (code === "22023") return "changed"; // trigger: schedule changed, cycle in the past or not a due date
  if (code === "42501" || code === "23503") return "not_saved"; // no permission, or the bill was deleted
  throw new Error("Set-aside not saved");
}

export async function startSetAside(formData: FormData) {
  const expenseId = formUuid(formData, "expense_id");
  const { householdId, canWrite } = await writer();
  if (!canWrite) back("start", expenseId, { error: "read_only" });
  const shownCycle = formDate(formData, "shown_cycle");
  const expectedAnchor = formDate(formData, "expected_anchor");
  const expectedRecurrence = formRecurrence(formData, "expected_recurrence");
  const amount = reportedAmount(formData, "reserved");
  if (!amount.ok) back("start", expenseId, { error: amount.error });
  const confirm = confirmed(formData);
  if (!confirm.ok) back("start", expenseId, { error: confirm.error });

  const supabase = await createClient();
  const bill = await loadBill(supabase, householdId, expenseId);
  if (!bill) back("start", expenseId, { error: "not_saved" });
  if (bill.anchor !== expectedAnchor || bill.recurrence !== expectedRecurrence) back("start", expenseId, { error: "changed" });
  if (!isEligibleBill(bill)) back("start", expenseId, { error: "not_eligible" });
  // The cycle the person confirmed must still be this bill's next due date today.
  if (firstCycleDue(bill, todayUtc()) !== shownCycle) back("start", expenseId, { error: "changed" });

  const { error } = await supabase.from("bill_set_asides").insert({
    household_id: householdId,
    expense_id: expenseId,
    cycle_due_date: shownCycle,
    cycle_anchor_date: bill.anchor,
    cycle_recurrence: bill.recurrence,
    reserved_amount: centsToDecimal(amount.value),
  });
  if (error) back("start", expenseId, { error: writeError(error.code) });
  back("start", expenseId, { notice: "started" });
}

export async function updateSetAside(formData: FormData) {
  const expenseId = formUuid(formData, "expense_id");
  const trackerId = formUuid(formData, "tracker_id");
  const version = formVersion(formData);
  const { householdId, canWrite } = await writer();
  if (!canWrite) back("update", expenseId, { error: "read_only" });
  const amount = reportedAmount(formData, "reserved");
  if (!amount.ok) back("update", expenseId, { error: amount.error });

  const supabase = await createClient();
  // Only the reported amount changes; the cycle stays as confirmed. Conditional on the version that was shown.
  const { data, error } = await supabase.from("bill_set_asides")
    .update({ reserved_amount: centsToDecimal(amount.value) })
    .eq("id", trackerId).eq("household_id", householdId).eq("expense_id", expenseId).eq("version", version)
    .select("id").maybeSingle();
  if (error) back("update", expenseId, { error: writeError(error.code) });
  if (!data) back("update", expenseId, { error: "changed" });
  back("update", expenseId, { notice: "updated" });
}

export async function confirmSetAsideCycle(formData: FormData) {
  const expenseId = formUuid(formData, "expense_id");
  const trackerId = formUuid(formData, "tracker_id");
  const version = formVersion(formData);
  const shownNext: IsoDate = formDate(formData, "shown_next_cycle");
  const { householdId, canWrite } = await writer();
  if (!canWrite) back("cycle", expenseId, { error: "read_only" });
  const carryover = reportedAmount(formData, "carryover");
  if (!carryover.ok) back("cycle", expenseId, { error: carryover.error });
  const confirm = confirmed(formData);
  if (!confirm.ok) back("cycle", expenseId, { error: confirm.error });

  const supabase = await createClient();
  const [bill, tracker] = await Promise.all([loadBill(supabase, householdId, expenseId), loadTracker(supabase, householdId, trackerId, expenseId)]);
  if (!bill || !tracker) back("cycle", expenseId, { error: "not_saved" });
  if (tracker.version !== version) back("cycle", expenseId, { error: "changed" });
  const today = todayUtc();
  // Recomputed from the CURRENT bill and tracker: the confirmation is only valid for the cycle the form showed.
  if (!evaluateSetAside(bill, tracker, today).canConfirmNextCycle || nextCycleDue(bill, tracker, today) !== shownNext) {
    back("cycle", expenseId, { error: "changed" });
  }
  const { data, error } = await supabase.from("bill_set_asides")
    .update({ cycle_due_date: shownNext, cycle_anchor_date: bill.anchor, cycle_recurrence: bill.recurrence, reserved_amount: centsToDecimal(carryover.value) })
    .eq("id", trackerId).eq("household_id", householdId).eq("expense_id", expenseId).eq("version", version)
    .select("id").maybeSingle();
  if (error) back("cycle", expenseId, { error: writeError(error.code) });
  if (!data) back("cycle", expenseId, { error: "changed" });
  back("cycle", expenseId, { notice: "cycle" });
}

// Stops tracking: removes the tracker only. The bill (and everything the plan reads) is untouched.
export async function stopSetAside(formData: FormData) {
  const expenseId = formUuid(formData, "expense_id");
  const trackerId = formUuid(formData, "tracker_id");
  const version = formVersion(formData);
  const { householdId, canWrite } = await writer();
  if (!canWrite) back("stop", expenseId, { error: "read_only" });
  const confirm = confirmed(formData);
  if (!confirm.ok) back("stop", expenseId, { error: confirm.error });

  const supabase = await createClient();
  const { data, error } = await supabase.from("bill_set_asides").delete()
    .eq("id", trackerId).eq("household_id", householdId).eq("expense_id", expenseId).eq("version", version)
    .select("id").maybeSingle();
  if (error) back("stop", expenseId, { error: writeError(error.code) });
  if (!data) back("stop", expenseId, { error: "changed" });
  back("stop", expenseId, { notice: "stopped" });
}
