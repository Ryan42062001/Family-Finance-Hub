"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAllowedCheckInMonth } from "@/lib/calculations/check-in-snapshot";
import { amount } from "@/lib/forms/validate";
import { goalsContext } from "@/lib/goals/context";
import type { GoalsNoticeKey } from "@/lib/goals/notices";

// FFH-P07 goals and monthly check-ins (docs/FFH-P07_DESIGN.md). Every write re-checks the
// role here and the database enforces it again through RLS. Nothing writes to the Financial
// profile or to the Money Priority Engine's goals table.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MONEY = 999999999999.99;

class InvalidInput extends Error {}

function finish(notice: GoalsNoticeKey, path = "/goals"): never {
  revalidatePath("/goals");
  redirect(`${path}?notice=${notice}`);
}

function text(formData: FormData, key: string, max = 100) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value || value.length > max) throw new InvalidInput(key);
  return value;
}

function id(formData: FormData, key = "id") {
  const value = String(formData.get(key) ?? "");
  if (!UUID.test(value)) throw new InvalidInput(key);
  return value;
}

function optionalDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)
    || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw new InvalidInput(key);
  return value;
}

function yesNo(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "");
  if (value === "yes") return true;
  if (value === "no") return false;
  throw new InvalidInput(key);
}

function money(formData: FormData, key: string, options: { min?: number; required?: boolean } = {}) {
  try {
    return amount(formData, key, options);
  } catch {
    throw new InvalidInput(key);
  }
}

// A balance as an exact decimal string for the database, or null for "not entered" (C4).
function balance(formData: FormData, key: string, itemType: string): string | null {
  const value = money(formData, key, { min: itemType === "account" ? -MAX_MONEY : 0, required: false });
  return value === null ? null : value.toFixed(2);
}

function goalFields(formData: FormData) {
  const name = text(formData, "name");
  const targetAmount = money(formData, "target_amount");
  if (targetAmount === null || targetAmount <= 0) throw new InvalidInput("target_amount");
  const savedAmount = money(formData, "saved_amount", { required: false }) ?? 0;
  return { name, target_amount: targetAmount, saved_amount: savedAmount, target_date: optionalDate(formData, "target_date") };
}

function codeOf(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

function noticeFor(error: unknown): GoalsNoticeKey {
  const code = codeOf(error);
  if (code === "23505") return "check_in_exists";
  if (code === "42501") return "read_only";
  if (code === "22023" || code === "23514" || code === "22P02") return "invalid";
  return "failed";
}

async function editor() {
  const context = await goalsContext();
  if (!context.canEdit) finish("read_only");
  return context;
}

export async function addSavingsGoal(formData: FormData) {
  const { supabase, householdId } = await editor();
  let fields;
  try { fields = goalFields(formData); } catch { finish("invalid"); }
  const { error } = await supabase.from("savings_goals").insert({ household_id: householdId, ...fields });
  finish(error ? noticeFor(error) : "goal_saved");
}

export async function updateSavingsGoal(formData: FormData) {
  const { supabase, householdId } = await editor();
  let goalId: string;
  let fields;
  try { goalId = id(formData); fields = goalFields(formData); } catch { finish("invalid"); }
  const { data, error } = await supabase.from("savings_goals")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", goalId).eq("household_id", householdId).select("id");
  finish(error ? noticeFor(error) : data?.length === 1 ? "goal_saved" : "read_only");
}

export async function deleteSavingsGoal(formData: FormData) {
  const { supabase, householdId } = await editor();
  let goalId: string;
  try { goalId = id(formData); if (formData.get("confirm") !== "yes") throw new InvalidInput("confirm"); } catch { finish("invalid"); }
  const { data, error } = await supabase.from("savings_goals").delete()
    .eq("id", goalId).eq("household_id", householdId).select("id");
  finish(error ? noticeFor(error) : data?.length === 1 ? "goal_deleted" : "read_only");
}

// C2: one amount (or "not entered") per Financial profile item at check-in time (accounts counted
// in net worth, retirement accounts, debts). The database requires exactly that set and copies the
// names itself (review F02); if the profile changed since the page loaded, nothing is saved.
export async function createCheckIn(formData: FormData) {
  const { supabase, householdId } = await editor();
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) finish("invalid");
  if (!isAllowedCheckInMonth(month)) finish("future_month");

  const [accounts, retirement, debts] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("household_id", householdId).eq("include_in_net_worth", true).order("created_at"),
    supabase.from("retirement_accounts").select("id, name").eq("household_id", householdId).order("created_at"),
    supabase.from("debts").select("id, name").eq("household_id", householdId).order("created_at"),
  ]);
  if (accounts.error || retirement.error || debts.error) finish("failed");
  const items = [
    ...(accounts.data ?? []).map((row) => ({ itemType: "account", ...row })),
    ...(retirement.data ?? []).map((row) => ({ itemType: "retirement_account", ...row })),
    ...(debts.data ?? []).map((row) => ({ itemType: "debt", ...row })),
  ];

  let followedPlan: boolean;
  let lines: Array<{ item_type: string; item_id: string; amount: string | null }>;
  try {
    followedPlan = yesNo(formData, "followed_plan");
    lines = items.map((item) => ({
      item_type: item.itemType,
      item_id: String(item.id),
      amount: balance(formData, `balance_${item.itemType}_${item.id}`, item.itemType),
    }));
  } catch { finish("invalid"); }

  const { data, error } = await supabase.rpc("create_monthly_check_in", {
    p_month: `${month}-01`, p_followed_plan: followedPlan, p_balances: lines,
  });
  if (error || typeof data !== "string") finish(error ? noticeFor(error) : "failed");
  revalidatePath("/goals");
  redirect(`/goals/check-in/${data}?notice=check_in_saved`);
}

// C8: only the Yes/No answer and the amounts change; the planned cash-flow snapshot never does.
export async function updateCheckIn(formData: FormData) {
  const { supabase, householdId } = await editor();
  let checkInId: string;
  try { checkInId = id(formData); } catch { finish("invalid"); }
  const { data: lines, error: linesError } = await supabase.from("monthly_check_in_balances")
    .select("id, item_type").eq("check_in_id", checkInId).eq("household_id", householdId);
  if (linesError) finish("failed");

  let followedPlan: boolean;
  let amounts: Array<{ id: string; amount: string | null }>;
  try {
    followedPlan = yesNo(formData, "followed_plan");
    amounts = (lines ?? []).map((line) => ({ id: line.id, amount: balance(formData, `line_${line.id}`, line.item_type) }));
  } catch { finish("invalid", `/goals/check-in/${checkInId}`); }

  const { error } = await supabase.rpc("update_monthly_check_in", {
    p_check_in_id: checkInId, p_followed_plan: followedPlan, p_amounts: amounts,
  });
  revalidatePath(`/goals/check-in/${checkInId}`);
  finish(error ? noticeFor(error) : "check_in_saved", `/goals/check-in/${checkInId}`);
}

export async function deleteCheckIn(formData: FormData) {
  const { supabase, householdId } = await editor();
  let checkInId: string;
  try { checkInId = id(formData); if (formData.get("confirm") !== "yes") throw new InvalidInput("confirm"); } catch { finish("invalid"); }
  const { data, error } = await supabase.from("monthly_check_ins").delete()
    .eq("id", checkInId).eq("household_id", householdId).select("id");
  finish(error ? noticeFor(error) : data?.length === 1 ? "check_in_deleted" : "read_only");
}
