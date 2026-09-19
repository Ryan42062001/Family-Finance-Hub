import { createClient } from "@/lib/supabase/server";

export type ScenarioHouseholdAuthority = {
  authenticated: boolean;
  householdId: string | null;
  role: "owner" | "member" | "viewer" | null;
};

export async function resolveScenarioHouseholdAuthority(): Promise<ScenarioHouseholdAuthority> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { authenticated: false, householdId: null, role: null };

  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1);

  if (error) throw new Error(error.message);
  const membership = data?.[0];
  if (!membership || !["owner", "member", "viewer"].includes(String(membership.role))) {
    return { authenticated: true, householdId: null, role: null };
  }
  return {
    authenticated: true,
    householdId: membership.household_id,
    role: membership.role as "owner" | "member" | "viewer",
  };
}
