"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { keepAnchorIfUnchanged, scheduleInput } from "@/lib/bills/form";
import { todayUtc } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// FFH-P09: set or clear a bill's next due date and its household-wide reminder. Identity and household come from the
// server (never the form); owner/member only, which the database also enforces (can_write_household_financials,
// gated by session_ok). Amounts are never written here.
export async function saveBillSchedule(formData: FormData) {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");
  if (authority.role !== "owner" && authority.role !== "member") redirect("/bills?error=read_only");
  const kind = String(formData.get("kind") ?? "");
  const table = kind === "expense" ? "expenses" : kind === "debt" ? "debts" : null;
  const id = String(formData.get("id") ?? "");
  if (!table || !UUID.test(id)) throw new Error("Invalid bill");
  const supabase = await createClient();
  // The form shows the NEXT due date. If it was left as shown, the original anchor is kept, so month-end and
  // leap-day anchors are not replaced by a clamped occurrence (Jan 31 must not become Feb 28 on a reminder change).
  const { data: current, error: readError } = table === "expenses"
    ? await supabase.from("expenses").select("due_anchor_date, recurrence").eq("id", id).eq("household_id", authority.householdId).maybeSingle()
    : await supabase.from("debts").select("due_anchor_date").eq("id", id).eq("household_id", authority.householdId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!current) redirect("/bills?error=not_saved");
  const recurrence = "recurrence" in current ? current.recurrence : "monthly";
  const schedule = keepAnchorIfUnchanged(scheduleInput(formData), current.due_anchor_date, recurrence, todayUtc());
  let update = supabase.from(table).update({ ...schedule, updated_at: new Date().toISOString() })
    .eq("id", id).eq("household_id", authority.householdId);
  // Only if the anchor is still the one this decision was based on.
  update = current.due_anchor_date === null ? update.is("due_anchor_date", null) : update.eq("due_anchor_date", current.due_anchor_date);
  const { data, error } = await update.select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) redirect("/bills?error=not_saved");
  revalidatePath("/bills");
  revalidatePath("/plan");
  redirect("/bills?saved=1");
}
