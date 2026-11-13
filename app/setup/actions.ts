"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSetupAnswers, type SetupAnswers } from "@/lib/setup/answers";

// FFH-P05 guided setup: about five questions for a brand-new household, then the money
// plan. Uses the same validation as the Financial profile forms. Every answer is checked
// before anything is written; the household is the caller's own (RLS-scoped) household,
// never one named by the form. It refuses to run twice, so it can never duplicate records.

export async function completeSetup(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth/login");

  const { data: households, error: householdError } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (householdError) redirect("/setup?error=" + encodeURIComponent("We couldn't load your household. Nothing was saved."));
  if (!households?.length) redirect("/onboarding");
  const householdId = households[0].id;

  // Refuse to run on a household that already has records: nothing is written.
  if (!(await householdIsEmpty(supabase, householdId))) {
    redirect("/plan?message=" + encodeURIComponent("Your household already has details, so setup didn't add anything. Edit them under Financial profile."));
  }

  let answers: SetupAnswers;
  try {
    answers = parseSetupAnswers(formData);
  } catch {
    redirect("/setup?error=" + encodeURIComponent("Please check your answers: amounts must be numbers of 0 or more, and a debt needs its monthly minimum. Nothing was saved."));
  }

  const expenses = [
    answers.fixedBills > 0 ? { household_id: householdId, name: "Fixed bills and must-haves (from setup)", category: "other", monthly_amount: answers.fixedBills, is_essential: true } : null,
    answers.otherSpending > 0 ? { household_id: householdId, name: "Other spending (from setup)", category: "personal", monthly_amount: answers.otherSpending, is_essential: false } : null,
  ].filter((row) => row !== null);

  const steps: Array<() => PromiseLike<{ error: unknown }>> = [];
  if (answers.takeHome > 0) steps.push(() => supabase.from("income_sources").insert({ household_id: householdId, name: "Take-home pay (from setup)", monthly_amount: answers.takeHome }));
  if (expenses.length) steps.push(() => supabase.from("expenses").insert(expenses));
  if (answers.debt) {
    const debt = answers.debt;
    steps.push(() => supabase.from("debts").insert({ household_id: householdId, name: "Debts (from setup)", debt_type: "other", current_balance: debt.balance, minimum_payment: debt.minimum, interest_rate: debt.rate }));
  }
  if (answers.savings && answers.savings > 0) steps.push(() => supabase.from("accounts").insert({ household_id: householdId, name: "Savings (from setup)", account_type: "savings", balance: answers.savings }));
  if (answers.simpleView) steps.push(() => supabase.from("profiles").upsert({ id: userId, simple_mode: true }, { onConflict: "id" }));

  for (const [index, step] of steps.entries()) {
    const { error } = await step();
    if (error) {
      revalidatePath("/", "layout");
      const message = index === 0
        ? "Setup couldn't save your answers. Nothing was saved; please try again."
        : "Setup saved some of your answers but not all. Please check Financial profile.";
      redirect((index === 0 ? "/setup?error=" : "/financial-profile?message=") + encodeURIComponent(message));
    }
  }

  revalidatePath("/", "layout");
  redirect("/plan");
}

async function householdIsEmpty(supabase: Awaited<ReturnType<typeof createClient>>, householdId: string) {
  for (const table of ["income_sources", "expenses", "debts", "accounts"] as const) {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("household_id", householdId);
    if (error || (count ?? 0) > 0) return false;
  }
  return true;
}
