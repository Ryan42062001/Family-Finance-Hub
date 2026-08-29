"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createHousehold(formData: FormData) {
  const householdName = String(formData.get("householdName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!householdName || householdName.length > 100) {
    redirect("/onboarding?error=Enter%20a%20household%20name%20between%201%20and%20100%20characters.");
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/auth/login");
  }

  const { data: existingHouseholds, error: lookupError } = await supabase
    .from("households")
    .select("id")
    .limit(1);

  if (lookupError) {
    redirect(`/onboarding?error=${encodeURIComponent(lookupError.message)}`);
  }

  if (existingHouseholds?.length) {
    redirect("/dashboard");
  }

  if (displayName) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
    }
  }

  const { error: householdError } = await supabase.from("households").insert({
    name: householdName,
    created_by: userId,
  });

  if (householdError) {
    redirect(`/onboarding?error=${encodeURIComponent(householdError.message)}`);
  }

  redirect("/dashboard");
}
