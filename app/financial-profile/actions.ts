"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(formData: FormData, key: string, max = 100) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value || value.length > max) throw new Error(`Invalid ${key}`);
  return value;
}

function amount(formData: FormData, key: string, { min = 0, required = true } = {}) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw && !required) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > 999999999999.99) throw new Error(`Invalid ${key}`);
  return Math.round(value * 100) / 100;
}

function percent(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`Invalid ${key}`);
  return Math.round(value * 10000) / 10000;
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
  revalidatePath("/dashboard");
  revalidatePath("/financial-profile");
  redirect(`/financial-profile?message=${encodeURIComponent(message)}`);
}

export async function addAccount(formData: FormData) {
  const { supabase, householdId } = await context();
  const accountType = requiredText(formData, "account_type", 30);
  if (!["checking", "savings", "cash", "brokerage", "other_asset"].includes(accountType)) throw new Error("Invalid account type");
  const { error } = await supabase.from("accounts").insert({ household_id: householdId, name: requiredText(formData, "name"), account_type: accountType, balance: amount(formData, "balance") });
  if (error) throw new Error(error.message);
  done("Account added.");
}

export async function addIncome(formData: FormData) {
  const { supabase, householdId } = await context();
  const { error } = await supabase.from("income_sources").insert({ household_id: householdId, name: requiredText(formData, "name"), monthly_amount: amount(formData, "monthly_amount") });
  if (error) throw new Error(error.message);
  done("Income source added.");
}

export async function addExpense(formData: FormData) {
  const { supabase, householdId } = await context();
  const category = requiredText(formData, "category", 30);
  if (!["housing", "utilities", "groceries", "transportation", "insurance", "healthcare", "childcare", "subscriptions", "personal", "giving", "other"].includes(category)) throw new Error("Invalid expense category");
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
  const debtType = requiredText(formData, "debt_type", 30);
  if (!["mortgage", "student_loan", "auto_loan", "credit_card", "personal_loan", "medical", "other"].includes(debtType)) throw new Error("Invalid debt type");
  const { error } = await supabase.from("debts").insert({ household_id: householdId, name: requiredText(formData, "name"), debt_type: debtType, current_balance: amount(formData, "current_balance"), interest_rate: percent(formData, "interest_rate"), minimum_payment: amount(formData, "minimum_payment") });
  if (error) throw new Error(error.message);
  done("Debt added.");
}

export async function addRetirementAccount(formData: FormData) {
  const { supabase, householdId } = await context();
  const accountType = requiredText(formData, "account_type", 30);
  if (!["401k", "403b", "457", "traditional_ira", "roth_ira", "hsa", "pension", "other"].includes(accountType)) throw new Error("Invalid retirement account type");
  const { error } = await supabase.from("retirement_accounts").insert({ household_id: householdId, name: requiredText(formData, "name"), account_type: accountType, balance: amount(formData, "balance"), monthly_employee_contribution: amount(formData, "monthly_employee_contribution"), monthly_employer_contribution: amount(formData, "monthly_employer_contribution") });
  if (error) throw new Error(error.message);
  done("Retirement account added.");
}

export async function addGoal(formData: FormData) {
  const { supabase, householdId } = await context();
  const priority = Number(String(formData.get("priority") ?? "3"));
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) throw new Error("Invalid priority");
  const targetDate = String(formData.get("target_date") ?? "").trim() || null;
  const { error } = await supabase.from("goals").insert({ household_id: householdId, name: requiredText(formData, "name"), target_amount: amount(formData, "target_amount", { min: 0.01 }), current_amount: amount(formData, "current_amount"), target_date: targetDate, priority });
  if (error) throw new Error(error.message);
  done("Goal added.");
}

export async function deleteRecord(formData: FormData) {
  const { supabase, householdId } = await context();
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) throw new Error("Invalid record id");

  const tables = {
    account: "accounts",
    income: "income_sources",
    expense: "expenses",
    debt: "debts",
    retirement: "retirement_accounts",
    goal: "goals",
  } as const;
  const table = tables[kind as keyof typeof tables];
  if (!table) throw new Error("Invalid record type");

  const { error } = await supabase.from(table).delete().eq("id", id).eq("household_id", householdId);
  if (error) throw new Error(error.message);
  done("Record deleted.");
}
