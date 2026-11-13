"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_TYPES = ["checking", "savings", "cash", "brokerage", "other_asset"] as const;
const EXPENSE_CATEGORIES = ["housing", "utilities", "groceries", "transportation", "insurance", "healthcare", "childcare", "subscriptions", "personal", "giving", "other"] as const;
const DEBT_TYPES = ["mortgage", "student_loan", "auto_loan", "credit_card", "personal_loan", "medical", "other"] as const;
const RETIREMENT_TYPES = ["401k", "403b", "457", "traditional_ira", "roth_ira", "hsa", "pension", "other"] as const;
const GOAL_CLASSES = ["necessary_protective", "major_life_goal", "education", "home_purchase", "lifestyle_optional", "other", "unknown"] as const;
const GOAL_NECESSITIES = ["required", "important", "optional", "unknown"] as const;
const DEADLINE_FLEXIBILITIES = ["fixed", "somewhat_flexible", "flexible", "unknown"] as const;
const CONSEQUENCE_LEVELS = ["critical", "high", "moderate", "low", "unknown"] as const;
const GOAL_NATURES = ["preservation", "improvement", "mixed", "unknown"] as const;
const UNDERFUNDING_CONSEQUENCES = ["safely_delay", "reduce_solution", "inconvenience", "likely_financing", "higher_future_cost", "employment_disruption", "housing_disruption", "health_safety", "caregiving_disruption", "contractual_payment", "other_material", "unknown"] as const;
const BORROWING_LIKELIHOODS = ["unlikely", "possible", "likely", "unknown"] as const;
// FFH-P03: extra facts the money plan asks for. Every value list mirrors a database check constraint.
// Cash purposes linked to a goal or debt also need a related record, so the form offers only these four and "keep".
const SIMPLE_CASH_PURPOSES = ["unallocated", "protected_reserve", "operating_cash", "not_applicable"] as const;
const MATCH_STATUSES = ["not_offered", "unknown", "not_fully_captured", "fully_captured"] as const;
const EMPLOYER_CONTRIBUTION_TYPES = ["match", "nonelective", "profit_sharing", "other", "unknown"] as const;
const INSURANCE_TYPES = ["health", "auto", "homeowners", "renters", "umbrella", "pet", "other"] as const;

function requiredText(formData: FormData, key: string, max = 100) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value || value.length > max) throw new Error(`Invalid ${key}`);
  return value;
}

function amount(formData: FormData, key: string, { min = 0, required = true } = {}) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw && !required) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`Invalid ${key}`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > 999999999999.99) throw new Error(`Invalid ${key}`);
  return Math.round(value * 100) / 100;
}

function optionalText(formData: FormData, key: string, max = 500) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (value.length > max) throw new Error(`Invalid ${key}`);
  return value;
}

function optionalDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)
    || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function percent(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) throw new Error(`Invalid ${key}`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`Invalid ${key}`);
  return Math.round(value * 10000) / 10000;
}

function recordId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) throw new Error("Invalid record id");
  return id;
}

function allowed<T extends readonly string[]>(value: string, values: T, label: string): T[number] {
  if (!values.includes(value)) throw new Error(`Invalid ${label}`);
  return value as T[number];
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
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  revalidatePath("/financial-profile");
  redirect(`/financial-profile?message=${encodeURIComponent(message)}`);
}

function priority(formData: FormData) {
  const value = Number(String(formData.get("priority") ?? "3"));
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error("Invalid priority");
  return value;
}

function goalPayload(formData: FormData) {
  const targetAmount = amount(formData, "target_amount", { min: 0.01 })!;
  const coreNeedAmount = amount(formData, "core_need_amount", { required: false });
  if (coreNeedAmount !== null && coreNeedAmount > targetAmount) {
    throw new Error("Core need amount cannot exceed target amount");
  }
  return {
    name: requiredText(formData, "name"),
    target_amount: targetAmount,
    current_amount: amount(formData, "current_amount"),
    target_date: optionalDate(formData, "target_date"),
    priority: priority(formData),
    goal_class: allowed(requiredText(formData, "goal_class", 30), GOAL_CLASSES, "goal class"),
    necessity: allowed(requiredText(formData, "necessity", 30), GOAL_NECESSITIES, "goal necessity"),
    deadline_flexibility: allowed(requiredText(formData, "deadline_flexibility", 30), DEADLINE_FLEXIBILITIES, "deadline flexibility"),
    consequence_level: allowed(requiredText(formData, "consequence_level", 30), CONSEQUENCE_LEVELS, "consequence level"),
    planned_monthly_contribution: amount(formData, "planned_monthly_contribution", { required: false }),
    core_need_amount: coreNeedAmount,
    goal_intelligence_confirmed: true,
    underlying_need: optionalText(formData, "underlying_need"),
    desired_solution: optionalText(formData, "desired_solution"),
    goal_nature: allowed(requiredText(formData, "goal_nature", 30), GOAL_NATURES, "goal nature"),
    underfunding_consequence: allowed(requiredText(formData, "underfunding_consequence", 40), UNDERFUNDING_CONSEQUENCES, "underfunding consequence"),
    borrowing_likelihood: allowed(requiredText(formData, "borrowing_likelihood", 20), BORROWING_LIKELIHOODS, "borrowing likelihood"),
    expected_borrowing_amount: amount(formData, "expected_borrowing_amount", { required: false }),
    expected_borrowing_apr: percent(formData, "expected_borrowing_apr"),
  };
}

// Cash purpose: "keep" leaves a goal- or debt-linked purpose untouched; the four simple purposes clear any link
// (the database requires links only for the linked purposes).
function cashPurposeUpdate(formData: FormData) {
  const raw = String(formData.get("cash_purpose") ?? "keep").trim();
  if (raw === "keep") return {};
  return { cash_purpose: allowed(raw, SIMPLE_CASH_PURPOSES, "cash purpose"), related_goal_id: null, related_debt_id: null };
}

// Optional retirement details. YTD amounts are not written for HSA rows: those carry a separate tax-year contract
// (HSA details page), so this form never changes them.
function retirementDetails(formData: FormData, accountType: string) {
  const employerType = String(formData.get("employer_contribution_type") ?? "").trim();
  const details: Record<string, string | number | null> = {
    match_status: allowed(String(formData.get("match_status") ?? "unknown").trim() || "unknown", MATCH_STATUSES, "match status"),
    full_match_employee_contribution_monthly: amount(formData, "full_match_employee_contribution_monthly", { required: false }),
    employer_contribution_type: employerType ? allowed(employerType, EMPLOYER_CONTRIBUTION_TYPES, "employer contribution type") : null,
    plan_eligible_compensation_annual: amount(formData, "plan_eligible_compensation_annual", { required: false }),
  };
  if (accountType !== "hsa") {
    details.employee_contributed_ytd = amount(formData, "employee_contributed_ytd", { required: false });
    details.employer_contributed_ytd = amount(formData, "employer_contributed_ytd", { required: false });
  }
  return details;
}

function insurancePayload(formData: FormData) {
  return {
    name: requiredText(formData, "name"),
    insurance_type: allowed(requiredText(formData, "insurance_type", 30), INSURANCE_TYPES, "insurance type"),
    deductible_amount: amount(formData, "deductible_amount", { required: false }),
    family_deductible_amount: amount(formData, "family_deductible_amount", { required: false }),
    out_of_pocket_max: amount(formData, "out_of_pocket_max", { required: false }),
    is_relevant_to_reserve: formData.get("is_relevant_to_reserve") === "on",
  };
}

export async function addAccount(formData: FormData) {
  const { supabase, householdId } = await context();
  const accountType = allowed(requiredText(formData, "account_type", 30), ACCOUNT_TYPES, "account type");
  const { error } = await supabase.from("accounts").insert({ household_id: householdId, name: requiredText(formData, "name"), account_type: accountType, balance: amount(formData, "balance"), ...cashPurposeUpdate(formData) });
  if (error) throw new Error(error.message);
  done("Account added.");
}

export async function addIncome(formData: FormData) {
  const { supabase, householdId } = await context();
  const { error } = await supabase.from("income_sources").insert({ household_id: householdId, name: requiredText(formData, "name"), monthly_amount: amount(formData, "monthly_amount"), monthly_gross_amount: amount(formData, "monthly_gross_amount", { required: false }) });
  if (error) throw new Error(error.message);
  done("Income source added.");
}

export async function addExpense(formData: FormData) {
  const { supabase, householdId } = await context();
  const category = allowed(requiredText(formData, "category", 30), EXPENSE_CATEGORIES, "expense category");
  const { error } = await supabase.from("expenses").insert({
    household_id: householdId,
    name: requiredText(formData, "name"),
    category,
    monthly_amount: amount(formData, "monthly_amount"),
    is_essential: formData.get("is_essential") === "on",
  });
  if (error) throw new Error(error.message);
  done("Expense added.");
}

export async function addDebt(formData: FormData) {
  const { supabase, householdId } = await context();
  const debtType = allowed(requiredText(formData, "debt_type", 30), DEBT_TYPES, "debt type");
  const { error } = await supabase.from("debts").insert({ household_id: householdId, name: requiredText(formData, "name"), debt_type: debtType, current_balance: amount(formData, "current_balance"), interest_rate: percent(formData, "interest_rate"), minimum_payment: amount(formData, "minimum_payment") });
  if (error) throw new Error(error.message);
  done("Debt added.");
}

export async function addRetirementAccount(formData: FormData) {
  const { supabase, householdId } = await context();
  const accountType = allowed(requiredText(formData, "account_type", 30), RETIREMENT_TYPES, "retirement account type");
  const { error } = await supabase.from("retirement_accounts").insert({ household_id: householdId, name: requiredText(formData, "name"), account_type: accountType, balance: amount(formData, "balance"), monthly_employee_contribution: amount(formData, "monthly_employee_contribution"), monthly_employer_contribution: amount(formData, "monthly_employer_contribution"), ...retirementDetails(formData, accountType) });
  if (error) throw new Error(error.message);
  done("Retirement account added.");
}

export async function addGoal(formData: FormData) {
  const { supabase, householdId } = await context();
  const { error } = await supabase.from("goals").insert({ household_id: householdId, ...goalPayload(formData) });
  if (error) throw new Error(error.message);
  done("Goal added.");
}

export async function updateAccount(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const accountType = allowed(requiredText(formData, "account_type", 30), ACCOUNT_TYPES, "account type");
  const { data, error } = await supabase.from("accounts").update({ name: requiredText(formData, "name"), account_type: accountType, balance: amount(formData, "balance"), ...cashPurposeUpdate(formData), updated_at: new Date().toISOString() }).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Record not found");
  done("Account updated.");
}

export async function updateIncome(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const { data, error } = await supabase.from("income_sources").update({ name: requiredText(formData, "name"), monthly_amount: amount(formData, "monthly_amount"), monthly_gross_amount: amount(formData, "monthly_gross_amount", { required: false }), updated_at: new Date().toISOString() }).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Record not found");
  done("Income source updated.");
}

export async function updateExpense(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const category = allowed(requiredText(formData, "category", 30), EXPENSE_CATEGORIES, "expense category");
  const { data, error } = await supabase.from("expenses").update({ name: requiredText(formData, "name"), category, monthly_amount: amount(formData, "monthly_amount"), is_essential: formData.get("is_essential") === "on", updated_at: new Date().toISOString() }).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Record not found");
  done("Expense updated.");
}

export async function updateDebt(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const debtType = allowed(requiredText(formData, "debt_type", 30), DEBT_TYPES, "debt type");
  const { data, error } = await supabase.from("debts").update({ name: requiredText(formData, "name"), debt_type: debtType, current_balance: amount(formData, "current_balance"), interest_rate: percent(formData, "interest_rate"), minimum_payment: amount(formData, "minimum_payment"), updated_at: new Date().toISOString() }).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Record not found");
  done("Debt updated.");
}

export async function updateRetirementAccount(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const accountType = allowed(requiredText(formData, "account_type", 30), RETIREMENT_TYPES, "retirement account type");
  const { data, error } = await supabase.from("retirement_accounts").update({ name: requiredText(formData, "name"), account_type: accountType, balance: amount(formData, "balance"), monthly_employee_contribution: amount(formData, "monthly_employee_contribution"), monthly_employer_contribution: amount(formData, "monthly_employer_contribution"), ...retirementDetails(formData, accountType), updated_at: new Date().toISOString() }).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Record not found");
  done("Retirement account updated.");
}

export async function updateGoal(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const { data, error } = await supabase.from("goals").update({ ...goalPayload(formData), updated_at: new Date().toISOString() }).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Record not found");
  done("Goal updated.");
}

export async function deleteRecord(formData: FormData) {
  const { supabase, householdId } = await context();
  const kind = String(formData.get("kind") ?? "");
  const id = recordId(formData);

  const tables = {
    account: "accounts",
    income: "income_sources",
    expense: "expenses",
    debt: "debts",
    retirement: "retirement_accounts",
    goal: "goals",
    insurance: "insurance_exposures",
  } as const;
  const table = tables[kind as keyof typeof tables];
  if (!table) throw new Error("Invalid record type");

  const { error } = await supabase.from(table).delete().eq("id", id).eq("household_id", householdId);
  if (error) throw new Error(error.message);
  done("Record deleted.");
}

export async function addInsurance(formData: FormData) {
  const { supabase, householdId } = await context();
  const { error } = await supabase.from("insurance_exposures").insert({ household_id: householdId, ...insurancePayload(formData) });
  if (error) throw new Error(error.message);
  done("Insurance added.");
}

export async function updateInsurance(formData: FormData) {
  const { supabase, householdId } = await context();
  const id = recordId(formData);
  const { data, error } = await supabase.from("insurance_exposures").update({ ...insurancePayload(formData), updated_at: new Date().toISOString() }).eq("id", id).eq("household_id", householdId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Record not found");
  done("Insurance updated.");
}

// Retirement goals live on the household's single preferences row. Only these four columns are written; every
// other preference keeps its saved value (or its database default when the row is created).
export async function saveRetirementGoals(formData: FormData) {
  const { supabase, householdId } = await context();
  const spending = amount(formData, "desired_retirement_monthly_spending", { required: false });
  const { error } = await supabase.from("household_financial_preferences").upsert({
    household_id: householdId,
    desired_retirement_monthly_spending: spending,
    retirement_spending_basis: spending === null ? "unknown" : "today_dollars",
    planning_social_security_monthly: amount(formData, "planning_social_security_monthly", { required: false }),
    planning_pension_monthly: amount(formData, "planning_pension_monthly", { required: false }),
    updated_at: new Date().toISOString(),
  }, { onConflict: "household_id" });
  if (error) throw new Error(error.message);
  done("Retirement goals saved.");
}
