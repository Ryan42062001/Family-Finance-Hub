import Link from "next/link";
import { redirect } from "next/navigation";

import ScenarioLabWorkspace from "./ScenarioLabWorkspace";
import { runMoneyPriorityEngine } from "@/lib/calculations/money-priority-engine";
import { moneyPrioritySnapshotToRaw } from "@/lib/calculations/money-priority-raw-adapter";
import { scenarioLabBootstrap } from "@/lib/scenarios/scenario-execution";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";

export const dynamic = "force-dynamic";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function ScenarioLabPage() {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");

  const snapshot = await loadMoneyPrioritySnapshot(authority.householdId);
  const baselineEngine = runMoneyPriorityEngine(moneyPrioritySnapshotToRaw(snapshot), todayUtc());
  const bootstrap = scenarioLabBootstrap(baselineEngine);

  return (
    <main className="page-shell scenario-lab-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Phase 6 · authenticated workspace</p>
          <h1>Scenario Lab</h1>
          <p className="muted">
            Test explicit what-if assumptions against your current household plan without changing your saved financial profile.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" href="/dashboard">Back to dashboard</Link>
        </div>
      </section>

      <section className="dashboard-notice" aria-label="Ephemeral Scenario Lab notice">
        <div>
          <strong>Ephemeral by design</strong>
          <p>
            Drafts and results live only in this browser page. Refreshing or leaving can discard them. Nothing here writes assumptions back to your profile.
          </p>
        </div>
      </section>

      <ScenarioLabWorkspace bootstrap={bootstrap} />
    </main>
  );
}
