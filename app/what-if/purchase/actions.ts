"use server";

import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { executePurchaseCheck } from "@/lib/purchase-check/purchase-check-execution";

// FFH-P10: read-only. The household comes from the signed-in user's own membership on the server; the browser sends
// only form text. Nothing is saved or changed.
export async function runPurchaseCheckAction(input: unknown) {
  return executePurchaseCheck(input, {
    resolveAuthority: async () => {
      const authority = await resolveScenarioHouseholdAuthority();
      return { authenticated: authority.authenticated, householdId: authority.householdId };
    },
    loadSnapshot: loadMoneyPrioritySnapshot,
    asOfDate: () => new Date().toISOString().slice(0, 10),
  });
}
