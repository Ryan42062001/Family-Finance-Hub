import Link from "next/link";
import { redirect } from "next/navigation";

import PurchaseCheckWorkspace from "./PurchaseCheckWorkspace";
import { MoneyPrioritySnapshotValidationError } from "@/lib/calculations/money-priority-snapshot";
import { loadPurchaseCheckBaseline, purchaseCheckBootstrap, type PurchaseCheckBootstrap } from "@/lib/purchase-check/purchase-check-execution";
import { readSimpleMode } from "@/lib/profile/view-mode";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ type?: string | string[] }> };

export default async function PurchaseCheckPage({ searchParams }: PageProps) {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");

  const requested = (await searchParams).type;
  const kind = requested === "vehicle" ? "vehicle" : "home";

  let bootstrap: PurchaseCheckBootstrap | null = null;
  try {
    const engine = await loadPurchaseCheckBaseline({
      resolveAuthority: async () => ({ authenticated: true, householdId: authority.householdId }),
      loadSnapshot: loadMoneyPrioritySnapshot,
      asOfDate: () => new Date().toISOString().slice(0, 10),
    });
    bootstrap = engine ? purchaseCheckBootstrap(engine) : null;
  } catch (error) {
    if (!(error instanceof MoneyPrioritySnapshotValidationError)) throw error;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const simple = await readSimpleMode(supabase, data?.claims?.sub);

  return (
    <main className="page-shell purchase-check-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">What if? · Can we afford it?</p>
          <h1>{kind === "home" ? "Can we afford this home?" : "Can we afford this vehicle?"}</h1>
          <p className="muted">Enter what you know. We check it against your current plan, then show what changes. You can add a second option to compare side by side.</p>
        </div>
      </section>

      <section className="dashboard-notice" aria-label="Nothing is saved">
        <div>
          <strong>A hypothetical check — nothing is saved</strong>
          <p>Your entries stay on this page only. Checking never changes your bills, debts, goals, check-ins or profile. Leaving or refreshing the page can clear them.</p>
        </div>
      </section>

      <nav className="purchase-kind-switch" aria-label="Purchase type">
        <Link className={kind === "home" ? "purchase-kind-active" : ""} aria-current={kind === "home" ? "page" : undefined} href="/what-if/purchase?type=home">Home</Link>
        <Link className={kind === "vehicle" ? "purchase-kind-active" : ""} aria-current={kind === "vehicle" ? "page" : undefined} href="/what-if/purchase?type=vehicle">Vehicle</Link>
      </nav>

      {bootstrap ? (
        <PurchaseCheckWorkspace key={kind} kind={kind} bootstrap={bootstrap} simple={simple} />
      ) : (
        <section className="bento-card plan-unavailable">
          <h2>We can&apos;t run a check yet</h2>
          <p className="muted">Some saved numbers are invalid, so there is no plan to check against. Review your Financial profile.</p>
          <Link className="secondary-button" href="/financial-profile">Open Financial profile</Link>
        </section>
      )}
    </main>
  );
}
