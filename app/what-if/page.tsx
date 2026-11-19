import Link from "next/link";
import { redirect } from "next/navigation";

import { readSimpleMode } from "@/lib/profile/view-mode";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// FFH-P10: approachable entry to hypothetical checks. Reads nothing about the household beyond the membership check.
export default async function WhatIfPage() {
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const simple = await readSimpleMode(supabase, data?.claims?.sub);

  return (
    <main className="page-shell what-if-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">What if?</p>
          <h1>Try a big decision before you make it</h1>
          <p className="muted">See how a purchase would fit your plan. These checks are hypothetical: nothing you enter is saved or changes your numbers.</p>
        </div>
      </section>

      <section className="what-if-options" aria-label="Can we afford it?">
        <Link className="what-if-option" href="/what-if/purchase?type=home">
          <span className="what-if-option-icon" aria-hidden="true">🏠</span>
          <span><strong>Can we afford a home?</strong><small>Cash to close, the new monthly cost, reserves, goals and retirement.</small></span>
        </Link>
        <Link className="what-if-option" href="/what-if/purchase?type=vehicle">
          <span className="what-if-option-icon" aria-hidden="true">🚗</span>
          <span><strong>Can we afford a vehicle?</strong><small>Price, down payment, the loan and ongoing costs, and the effect on your plan.</small></span>
        </Link>
      </section>

      {simple ? (
        <p className="muted what-if-advanced-note">Need more control? The advanced Scenario Lab is available in the detailed view.</p>
      ) : (
        <section className="bento-card what-if-tools" aria-labelledby="what-if-tools-heading">
          <p className="eyebrow">Tools</p>
          <h2 id="what-if-tools-heading">Scenario Lab (advanced)</h2>
          <p className="muted">Build detailed what-ifs: change income, expenses, debts and goals, model a home sale or extra money, and compare plans.</p>
          <Link className="secondary-button" href="/scenario-lab">Open Scenario Lab</Link>
        </section>
      )}
    </main>
  );
}
