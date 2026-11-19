// FFH-P09: CSV of the CURRENT authoritative Money Plan steps for the signed-in person's own household (owner, member
// or viewer). Identity and household are resolved on the server; nothing from the request selects the data. The
// database gates every read with session_ok(), so a signed-out, revoked or pending-2FA session gets no data.
import { MoneyPrioritySnapshotValidationError } from "@/lib/calculations/money-priority-snapshot";
import { planStepsCsv } from "@/lib/plan/plan-csv";
import { planFromSnapshot, todayUtc } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";

export const dynamic = "force-dynamic";

const PROTECTED = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", Vary: "Cookie" } as const;

function refuse(status: number, message: string) {
  return new Response(message, { status, headers: { ...PROTECTED, "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET() {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) return refuse(401, "Sign in to export your plan.");
  if (!authority.householdId) return refuse(403, "No household.");
  const asOf = todayUtc();
  let plan;
  try {
    plan = planFromSnapshot(await loadMoneyPrioritySnapshot(authority.householdId), asOf);
  } catch (error) {
    if (!(error instanceof MoneyPrioritySnapshotValidationError)) throw error;
    plan = { ok: false as const };
  }
  if (!plan.ok) return refuse(409, "No plan right now. Review your Financial profile.");
  return new Response(planStepsCsv(plan.view), {
    status: 200,
    headers: {
      ...PROTECTED,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="money-plan-steps-${asOf}.csv"`,
    },
  });
}
