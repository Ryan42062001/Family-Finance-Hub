import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type HouseholdRole = "owner" | "member" | "viewer";

// FFH-P07: the signed-in person's household and role. Owners and members may edit goals
// and check-ins; viewers are read-only (the database enforces the same rule through RLS).
// Anything unexpected is treated as read-only.
export async function goalsContext() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: membership, error } = await supabase
    .from("household_members").select("household_id, role").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load your household.");
  if (!membership) redirect("/onboarding");
  const role = (["owner", "member", "viewer"] as const).find((value) => value === membership.role) ?? "viewer";
  return { supabase, userId, householdId: membership.household_id as string, role, canEdit: role === "owner" || role === "member" };
}
