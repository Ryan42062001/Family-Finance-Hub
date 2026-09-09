"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RELATIONSHIPS = ["self", "spouse_partner", "child", "dependent_adult", "other"] as const;
const ELIGIBILITY = ["eligible", "ineligible", "unknown"] as const;
const COVERAGE = ["self_only", "family", "none", "unknown"] as const;
const EVIDENCE = ["confirmed", "planning_assumption", "unknown"] as const;
const LAST_MONTH_RULE = ["not_elected", "elected", "unknown"] as const;
const TESTING_PERIOD = ["not_applicable", "pending", "satisfied", "failed", "unknown"] as const;

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

function requiredText(formData: FormData, key: string, max = 100): string {
  const value = String(formData.get(key) ?? "").trim();
  if (!value || value.length > max) throw new Error(`Invalid ${key}`);
  return value;
}

function optionalDate(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)
    || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function money(formData: FormData, key: string, required = true): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw && !required) return null;
  if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`Invalid ${key}`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 999999999999.99) throw new Error(`Invalid ${key}`);
  return Math.round(value * 100) / 100;
}

function taxYearValue(value: FormDataEntryValue | null, required = true): number | null {
  const raw = String(value ?? "").trim();
  if (!raw && !required) return null;
  if (!/^\d{4}$/.test(raw)) throw new Error("Invalid tax year");
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 2004 || year > 9999) throw new Error("Invalid tax year");
  return year;
}

function uuidValue(value: FormDataEntryValue | null, label: string, required = true): string | null {
  const id = String(value ?? "").trim();
  if (!id && !required) return null;
  if (!UUID.test(id)) throw new Error(`Invalid ${label}`);
  return id;
}

function allowed<T extends readonly string[]>(value: FormDataEntryValue | null, values: T, label: string): T[number] {
  const normalized = String(value ?? "").trim();
  if (!values.includes(normalized)) throw new Error(`Invalid ${label}`);
  return normalized as T[number];
}

async function context() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");
  const { data: households, error } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (error) throw new Error(error.message);
  if (!households?.length) redirect("/onboarding");
  return { supabase, householdId: households[0].id };
}

function done(message: string): never {
  revalidatePath("/financial-profile/hsa");
  revalidatePath("/financial-profile");
  revalidatePath("/planning/retirement");
  redirect(`/financial-profile/hsa?message=${encodeURIComponent(message)}`);
}

async function assertPerson(supabase: ServerSupabase, householdId: string, personId: string): Promise<void> {
  const { data, error } = await supabase.from("household_people")
    .select("id")
    .eq("id", personId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("HSA person not found in this household");
}

function hsaYtdPayload(formData: FormData) {
  const employeeContributedYtd = money(formData, "employee_contributed_ytd", false);
  const employerContributedYtd = money(formData, "employer_contributed_ytd", false);
  const hsaYtdTaxYear = taxYearValue(formData.get("hsa_ytd_tax_year"), false);
  if ((employeeContributedYtd !== null || employerContributedYtd !== null) && hsaYtdTaxYear === null) {
    throw new Error("HSA YTD contributions require an explicit tax year");
  }
  return {
    employee_contributed_ytd: employeeContributedYtd,
    employer_contributed_ytd: employerContributedYtd,
    hsa_ytd_tax_year: hsaYtdTaxYear,
  };
}

export async function addHsaPerson(formData: FormData) {
  const { supabase, householdId } = await context();
  const relationship = allowed(formData.get("relationship"), RELATIONSHIPS, "relationship");
  const { error } = await supabase.from("household_people").insert({
    household_id: householdId,
    display_name: requiredText(formData, "display_name"),
    relationship,
    birth_date: optionalDate(formData, "birth_date"),
    is_dependent: relationship === "child" || relationship === "dependent_adult",
    is_active: true,
  });
  if (error) throw new Error(error.message);
  done("Financial person added for HSA planning.");
}

export async function saveHsaTaxYearProfile(formData: FormData) {
  const { supabase, householdId } = await context();
  const personId = uuidValue(formData.get("person_id"), "person id")!;
  const taxYear = taxYearValue(formData.get("tax_year"))!;
  await assertPerson(supabase, householdId, personId);
  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from("person_hsa_tax_year_profiles").upsert({
    household_id: householdId,
    person_id: personId,
    tax_year: taxYear,
    medicare_effective_on: optionalDate(formData, "medicare_effective_on"),
    last_month_rule_status: allowed(formData.get("last_month_rule_status"), LAST_MONTH_RULE, "last-month-rule status"),
    testing_period_status: allowed(formData.get("testing_period_status"), TESTING_PERIOD, "testing-period status"),
    confirmed_at: now,
    data_version: 1,
    updated_at: now,
  }, { onConflict: "person_id,household_id,tax_year" });
  if (profileError) throw new Error(profileError.message);

  const monthRows = Array.from({ length: 12 }, (_, offset) => {
    const month = offset + 1;
    return {
      household_id: householdId,
      person_id: personId,
      tax_year: taxYear,
      month,
      eligibility_status: allowed(formData.get(`eligibility_${month}`), ELIGIBILITY, `month ${month} eligibility`),
      coverage_status: allowed(formData.get(`coverage_${month}`), COVERAGE, `month ${month} coverage`),
      evidence_status: allowed(formData.get(`evidence_${month}`), EVIDENCE, `month ${month} evidence`),
      updated_at: now,
    };
  });
  const { error: monthError } = await supabase.from("person_hsa_month_statuses")
    .upsert(monthRows, { onConflict: "person_id,household_id,tax_year,month" });
  if (monthError) throw new Error(monthError.message);
  done(`HSA ${taxYear} person/month facts saved.`);
}

export async function deleteHsaTaxYearProfile(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = uuidValue(formData.get("id"), "profile id")!;
  const { data, error } = await supabase.from("person_hsa_tax_year_profiles")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("HSA tax-year profile not found");
  done("HSA tax-year profile removed; no status is carried into another tax year.");
}

export async function addHsaAccount(formData: FormData) {
  const { supabase, householdId } = await context();
  const ownerPersonId = uuidValue(formData.get("owner_person_id"), "owner person", false);
  if (ownerPersonId) await assertPerson(supabase, householdId, ownerPersonId);
  const { error } = await supabase.from("retirement_accounts").insert({
    household_id: householdId,
    owner_person_id: ownerPersonId,
    name: requiredText(formData, "name"),
    account_type: "hsa",
    balance: money(formData, "balance")!,
    monthly_employee_contribution: money(formData, "monthly_employee_contribution")!,
    monthly_employer_contribution: money(formData, "monthly_employer_contribution")!,
    ...hsaYtdPayload(formData),
  });
  if (error) throw new Error(error.message);
  done("HSA account added without inferring legal eligibility.");
}

export async function updateHsaAccountContract(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = uuidValue(formData.get("id"), "account id")!;
  const ownerPersonId = uuidValue(formData.get("owner_person_id"), "owner person", false);
  if (ownerPersonId) await assertPerson(supabase, householdId, ownerPersonId);
  const { data, error } = await supabase.from("retirement_accounts")
    .update({
      owner_person_id: ownerPersonId,
      ...hsaYtdPayload(formData),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("household_id", householdId)
    .eq("account_type", "hsa")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("HSA account not found");
  done("HSA owner and tax-year-bound YTD updated.");
}

export async function saveAlternateMarriedHsaAllocation(formData: FormData) {
  const { supabase, householdId } = await context();
  const taxYear = taxYearValue(formData.get("tax_year"))!;
  const firstId = uuidValue(formData.get("person_one_id"), "first person")!;
  const secondId = uuidValue(formData.get("person_two_id"), "second person")!;
  if (firstId === secondId) throw new Error("Alternate married HSA allocation requires two different people");
  await assertPerson(supabase, householdId, firstId);
  await assertPerson(supabase, householdId, secondId);
  const firstAmount = money(formData, "person_one_ordinary_amount")!;
  const secondAmount = money(formData, "person_two_ordinary_amount")!;

  const ordered = firstId.localeCompare(secondId) <= 0
    ? { person_one_id: firstId, person_one_ordinary_amount: firstAmount, person_two_id: secondId, person_two_ordinary_amount: secondAmount }
    : { person_one_id: secondId, person_one_ordinary_amount: secondAmount, person_two_id: firstId, person_two_ordinary_amount: firstAmount };
  const now = new Date().toISOString();
  const { error } = await supabase.from("household_hsa_married_allocations").upsert({
    household_id: householdId,
    tax_year: taxYear,
    ...ordered,
    confirmed_at: now,
    updated_at: now,
  }, { onConflict: "household_id,tax_year" });
  if (error) throw new Error(error.message);
  done(`Alternate married HSA allocation saved for ${taxYear}.`);
}

export async function deleteAlternateMarriedHsaAllocation(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = uuidValue(formData.get("id"), "allocation id")!;
  const { data, error } = await supabase.from("household_hsa_married_allocations")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Alternate married HSA allocation not found");
  done("Alternate HSA allocation removed; no alternate split is persisted.");
}
