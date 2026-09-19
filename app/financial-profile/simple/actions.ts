"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SIMPLE_PLAN_LIMIT_CATEGORIES = ["standard", "certain_applicable_higher"] as const;

type SimplePlanLimitCategory = typeof SIMPLE_PLAN_LIMIT_CATEGORIES[number];

function recordId(formData: FormData): string {
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID.test(id)) throw new Error("Invalid retirement account id");
  return id;
}

function taxYear(formData: FormData): number {
  const raw = String(formData.get("simple_plan_limit_tax_year") ?? "").trim();
  if (!/^\d{4}$/.test(raw)) throw new Error("SIMPLE plan-limit tax year is required");
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1900 || value > 9999) throw new Error("Invalid SIMPLE plan-limit tax year");
  return value;
}

function category(formData: FormData): SimplePlanLimitCategory | null {
  const value = String(formData.get("simple_plan_limit_category") ?? "").trim();
  if (!value) return null;
  const match = SIMPLE_PLAN_LIMIT_CATEGORIES.find((candidate) => candidate === value);
  if (!match) throw new Error("Invalid SIMPLE plan-limit category");
  return match;
}

async function context() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: households, error } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (error) throw new Error(error.message);
  if (!households?.length) redirect("/onboarding");
  return { supabase, householdId: households[0].id };
}

function done(message: string): never {
  revalidatePath("/financial-profile/simple");
  revalidatePath("/financial-profile");
  revalidatePath("/planning/retirement");
  revalidatePath("/dashboard");
  redirect(`/financial-profile/simple?message=${encodeURIComponent(message)}`);
}

export async function saveSimplePlanLimitContract(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const selectedCategory = category(formData);

  const payload = selectedCategory === null
    ? {
        simple_plan_limit_category: null,
        simple_plan_limit_tax_year: null,
        updated_at: new Date().toISOString(),
      }
    : {
        simple_plan_limit_category: selectedCategory,
        simple_plan_limit_tax_year: taxYear(formData),
        updated_at: new Date().toISOString(),
      };

  const { data, error } = await supabase
    .from("retirement_accounts")
    .update(payload)
    .eq("id", id)
    .eq("household_id", householdId)
    .eq("account_type", "simple_ira")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("SIMPLE IRA account not found");
  done(selectedCategory === null ? "SIMPLE plan-limit category cleared to unknown." : "SIMPLE plan-limit category confirmed.");
}
