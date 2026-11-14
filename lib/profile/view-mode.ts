import type { SupabaseClient } from "@supabase/supabase-js";

// FFH-P05: Simple mode is a per-user display preference stored on the caller's own
// profile row (profiles.simple_mode, self-scoped by RLS). It only changes what is
// shown; it never changes household data, permissions or calculations.

// Pages kept in the navigation when Simple mode is on. Everything else stays reachable
// by address but is hidden from the menus.
export const SIMPLE_NAV_PATHS = ["/plan", "/dashboard", "/financial-profile"] as const;

// Detailed tools: still work in Simple mode, with a note offering the detailed view.
export const DETAILED_ONLY_PREFIXES = ["/planning", "/scenario-lab", "/financial-profile/hsa", "/financial-profile/simple"] as const;

export function isDetailedOnlyPath(path: string): boolean {
  return DETAILED_ONLY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

// Where the switch may send the user back to: only fixed in-app paths (never an
// arbitrary URL), falling back to Your plan.
const RETURN_PATHS = new Set(["/plan", "/dashboard", "/financial-profile", "/goals", "/planning", "/planning/debt", "/planning/paycheck", "/planning/retirement", "/scenario-lab", "/financial-profile/hsa", "/financial-profile/simple"]);
export function safeReturnPath(raw: unknown): string {
  return typeof raw === "string" && RETURN_PATHS.has(raw) ? raw : "/plan";
}

// Reads the signed-in user's own preference. Anything unexpected (no session, no
// profile row yet, a read error) means the full detailed view, which hides nothing.
export async function readSimpleMode(supabase: SupabaseClient, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase.from("profiles").select("simple_mode").eq("id", userId).maybeSingle();
  if (error || !data) return false;
  return data.simple_mode === true;
}
