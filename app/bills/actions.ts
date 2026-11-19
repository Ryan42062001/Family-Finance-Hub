"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { keepAnchorIfUnchanged, scheduleContext, scheduleInput } from "@/lib/bills/form";
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
  const input = scheduleInput(formData);
  const context = scheduleContext(formData);
  const supabase = await createClient();
  const { data: current, error: readError } = table === "expenses"
    ? await supabase.from("expenses").select("due_anchor_date, recurrence").eq("id", id).eq("household_id", authority.householdId).maybeSingle()
    : await supabase.from("debts").select("due_anchor_date").eq("id", id).eq("household_id", authority.householdId).maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!current) redirect("/bills?error=not_saved");
  const recurrence = "recurrence" in current ? current.recurrence : "monthly";
  // Audit P09-01: the form's dates belong to the schedule it was rendered from. If someone changed the anchor or how
  // often the bill repeats since then, refuse instead of guessing what the submitted date means.
  if (current.due_anchor_date !== context.expectedAnchor || recurrence !== context.expectedRecurrence) redirect("/bills?error=changed");
  // The form shows the NEXT due date; submitting it unchanged keeps the original anchor (Jan 31 stays Jan 31).
  const schedule = keepAnchorIfUnchanged(input, current.due_anchor_date, context.shownDue);
  let update = supabase.from(table).update({ ...schedule, updated_at: new Date().toISOString() })
    .eq("id", id).eq("household_id", authority.householdId);
  // Only if the anchor (and, for expenses, the recurrence) is still what this decision was based on.
  update = current.due_anchor_date === null ? update.is("due_anchor_date", null) : update.eq("due_anchor_date", current.due_anchor_date);
  if (table === "expenses") update = update.eq("recurrence", recurrence);
  const { data, error } = await update.select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) redirect("/bills?error=not_saved");
  revalidatePath("/bills");
  revalidatePath("/plan");
  redirect("/bills?saved=1");
}
