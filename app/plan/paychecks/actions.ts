"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { centsToDecimal, formUuid, formVersion, UUID } from "@/lib/bills/set-aside-form";
import { centsFromDb } from "@/lib/bills/schedule";
import { parseScheduleForm, type ScheduleFieldError } from "@/lib/paychecks/form";
import { incomeFingerprint } from "@/lib/paychecks/inputs";
import { todayUtc } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { createClient } from "@/lib/supabase/server";

// FFH-P12 pay schedules (issue #203). Identity and household come from the server session, never the form; owner/member
// only, which the database enforces again (RLS through can_write_household_financials, gated by session_ok, and a
// trigger that locks and revalidates the income on every write). A save is refused when the income was changed after
// the form was shown (fingerprint) or the schedule was changed by someone else (version). Only the typed schedule facts
// are written: nothing here touches the income's monthly amount, a bill, the plan or any other financial record, so no
// other page is revalidated.

export type ScheduleNotice = "saved" | "removed";
export type ScheduleError = ScheduleFieldError | "changed" | "exists" | "inactive" | "not_saved" | "read_only" | "confirm_missing";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function back(incomeId: string, outcome: { notice: ScheduleNotice } | { error: ScheduleError }): never {
  if ("notice" in outcome) {
    revalidatePath("/plan/paychecks");
    redirect(`/plan/paychecks?view=detailed&ps_notice=${outcome.notice}&ps_income=${incomeId}#schedule-${incomeId}`);
  }
  redirect(`/plan/paychecks?view=detailed&ps_error=${outcome.error}&ps_income=${incomeId}#schedule-${incomeId}`);
}

async function writer() {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");
  return { householdId: authority.householdId, canWrite: authority.role === "owner" || authority.role === "member" };
}

// The income as it is NOW, read through household RLS; null when it is gone or belongs to another household.
async function loadIncome(supabase: Supabase, householdId: string, incomeId: string) {
  const { data, error } = await supabase.from("income_sources").select("id, name, monthly_amount, is_active, is_variable")
    .eq("id", incomeId).eq("household_id", householdId).maybeSingle();
  if (error) throw new Error("Income not readable");
  if (!data) return null;
  const monthlyCents = centsFromDb(data.monthly_amount);
  if (monthlyCents === null || typeof data.name !== "string") throw new Error("Invalid income");
  return { id: data.id as string, name: data.name, monthlyCents, isActive: data.is_active === true, isVariable: data.is_variable === true };
}

// Database refusals mapped to fixed messages; anything unexpected is thrown (fails closed, nothing guessed).
function writeError(code: string | undefined): ScheduleError {
  if (code === "23505") return "exists";
  if (code === "22023") return "changed"; // trigger: income paused, date window or payday rule as of now
  if (code === "42501" || code === "23503") return "not_saved"; // no permission, or the income was deleted
  throw new Error("Pay schedule not saved");
}

function fingerprintField(formData: FormData): string {
  const value = String(formData.get("income_fp") ?? "");
  if (!/^[0-9a-f]{32}$/.test(value)) throw new Error("Invalid income_fp");
  return value;
}

export async function savePaySchedule(formData: FormData) {
  const incomeId = formUuid(formData, "income_source_id");
  const shownFingerprint = fingerprintField(formData);
  const rawScheduleId = String(formData.get("schedule_id") ?? "");
  const scheduleId = rawScheduleId === "" ? null : UUID.test(rawScheduleId) ? rawScheduleId : null;
  if (rawScheduleId !== "" && scheduleId === null) throw new Error("Invalid schedule_id");
  const version = scheduleId ? formVersion(formData) : null;

  const { householdId, canWrite } = await writer();
  if (!canWrite) back(incomeId, { error: "read_only" });
  const parsed = parseScheduleForm(formData, todayUtc());
  if (!parsed.ok) back(incomeId, { error: parsed.error });

  const supabase = await createClient();
  const income = await loadIncome(supabase, householdId, incomeId);
  if (!income) back(incomeId, { error: "not_saved" });
  if (incomeFingerprint(income) !== shownFingerprint) back(incomeId, { error: "changed" });
  if (!income.isActive) back(incomeId, { error: "inactive" });

  const facts = {
    frequency: parsed.value.frequency,
    expected_deposit_amount: centsToDecimal(parsed.value.depositCents),
    next_expected_deposit_date: parsed.value.nextDate,
    semimonthly_day_one: parsed.value.dayOne,
    semimonthly_day_two: parsed.value.dayTwo,
  };
  if (!scheduleId) {
    const { error } = await supabase.from("income_pay_schedules").insert({ household_id: householdId, income_source_id: incomeId, ...facts });
    if (error) back(incomeId, { error: writeError(error.code) });
  } else {
    // Conditional on the version that was shown: a concurrent edit or removal changes nothing here.
    const { data, error } = await supabase.from("income_pay_schedules").update(facts)
      .eq("id", scheduleId).eq("household_id", householdId).eq("income_source_id", incomeId).eq("version", version)
      .select("id").maybeSingle();
    if (error) back(incomeId, { error: writeError(error.code) });
    if (!data) back(incomeId, { error: "changed" });
  }
  back(incomeId, { notice: "saved" });
}

// Removes the schedule only. The income, its monthly amount and the plan are untouched.
export async function removePaySchedule(formData: FormData) {
  const incomeId = formUuid(formData, "income_source_id");
  const scheduleId = formUuid(formData, "schedule_id");
  const version = formVersion(formData);
  const { householdId, canWrite } = await writer();
  if (!canWrite) back(incomeId, { error: "read_only" });
  if (formData.get("confirm") !== "yes") back(incomeId, { error: "confirm_missing" });
  const supabase = await createClient();
  const { data, error } = await supabase.from("income_pay_schedules").delete()
    .eq("id", scheduleId).eq("household_id", householdId).eq("income_source_id", incomeId).eq("version", version)
    .select("id").maybeSingle();
  if (error) back(incomeId, { error: writeError(error.code) });
  if (!data) back(incomeId, { error: "changed" });
  back(incomeId, { notice: "removed" });
}
