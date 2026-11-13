"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSetupAnswers, SetupAnswerError, type SetupAnswers } from "@/lib/setup/answers";

// FFH-P05 guided setup. Answers are validated here, then saved by ONE database call,
// public.complete_household_setup, which runs with the caller's own permissions (RLS),
// picks the caller's own household itself, validates again, and inside a single
// transaction (locked per household) checks the household is still empty and writes
// everything or nothing. Two simultaneous submissions cannot both save.
export async function completeSetup(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  let answers: SetupAnswers;
  try {
    answers = parseSetupAnswers(formData);
  } catch (error) {
    const detail = error instanceof SetupAnswerError ? `${error.message} ` : "Amounts must be numbers of 0 or more. ";
    redirect("/setup?error=" + encodeURIComponent(`${detail}Nothing was saved.`));
  }

  const { data: outcome, error } = await supabase.rpc("complete_household_setup", {
    p_take_home: answers.takeHome,
    p_fixed_bills: answers.fixedBills,
    p_other_spending: answers.otherSpending,
    p_debt_balance: answers.debt?.balance ?? null,
    p_debt_minimum: answers.debt?.minimum ?? null,
    p_debt_rate: answers.debt?.rate ?? null,
    p_savings: answers.savings?.amount ?? null,
    p_savings_purpose: answers.savings?.purpose ?? null,
    p_simple_view: answers.simpleView,
  });

  revalidatePath("/", "layout");
  if (error) redirect("/setup?error=" + encodeURIComponent("Setup couldn't save your answers. Nothing was saved; please try again."));
  if (outcome === "already_set_up") {
    redirect("/plan?message=" + encodeURIComponent("Your household already has details, so setup didn't add anything. Edit them under Financial profile."));
  }
  if (outcome !== "saved") redirect("/setup?error=" + encodeURIComponent("Setup couldn't confirm your answers were saved. Please check Financial profile."));
  if (answers.savingsSkippedAsUnsure) {
    redirect("/plan?message=" + encodeURIComponent("Your plan is ready. Your savings weren't added yet; add them under Financial profile → Accounts when you know what they're for."));
  }
  redirect("/plan");
}
