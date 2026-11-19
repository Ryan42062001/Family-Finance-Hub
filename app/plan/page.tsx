import { redirect } from "next/navigation";
import MoneyPlan from "@/components/plan/MoneyPlan";
import { MoneyPrioritySnapshotValidationError } from "@/lib/calculations/money-priority-snapshot";
import { planFromSnapshot, todayUtc, type PlanResult } from "@/lib/plan/plan-result";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";
import Link from "next/link";
import { planNotice } from "@/lib/plan/plan-notices";
import UpcomingBillsSummary from "@/components/bills/UpcomingBillsSummary";
import { buildBillsView, type BillsView } from "@/lib/bills/bills-view";
import { BillsDataError, loadBills } from "@/lib/supabase/bills";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PlanPageProps = { searchParams: Promise<{ notice?: string | string[] }> };

export default async function PlanPage({ searchParams }: PlanPageProps) {
  // Same household authority as Scenario Lab: the signed-in user's own membership, resolved on the server.
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");

  let plan: PlanResult;
  try {
    plan = planFromSnapshot(await loadMoneyPrioritySnapshot(authority.householdId), todayUtc());
  } catch (error) {
    if (!(error instanceof MoneyPrioritySnapshotValidationError)) throw error;
    plan = { ok: false, reason: "Some saved numbers are invalid, so no plan is shown. Review your Financial profile." };
  }

  // FFH-P09: upcoming bills summary (household-shared); a bills problem never hides the plan.
  let bills: BillsView | null = null;
  try {
    bills = buildBillsView(await loadBills(await createClient(), authority.householdId), todayUtc());
  } catch (error) {
    if (!(error instanceof BillsDataError) && !(error instanceof RangeError)) throw error;
  }

  // Only a fixed, allowlisted notice key is accepted; its text comes from the code, never the URL.
  const notice = planNotice((await searchParams).notice);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div><p className="eyebrow">Your money plan</p><h1>What to do with your money</h1><p className="muted">Steps in priority order, worked out from your saved numbers. Nothing here changes your profile.</p></div>
        {/* FFH-P10: prominent entry to the guided, read-only purchase checks. */}
        <div className="hero-actions plan-what-if-actions">
          <Link className="secondary-button" href="/what-if/purchase?type=home">Can we afford a home?</Link>
          <Link className="secondary-button" href="/what-if/purchase?type=vehicle">Can we afford a vehicle?</Link>
        </div>
      </section>
      {notice ? <aside className="dashboard-notice plan-notice" role="status"><div><strong>{notice.title}</strong><p>{notice.body}</p></div><Link className="secondary-button" href={notice.link.href}>{notice.link.label}</Link></aside> : null}
      <MoneyPlan plan={plan} />
      <UpcomingBillsSummary view={bills} />
      {plan.ok ? <section className="bento-card plan-exports" aria-labelledby="plan-exports-heading">
        <h2 id="plan-exports-heading">Save or share this plan</h2>
        <p className="muted">Exports show your current plan exactly as above. Nothing is stored on our side.</p>
        <div className="plan-export-actions">
          <Link className="secondary-button" href="/plan/print">Print or save as PDF</Link>
          <a className="secondary-button" href="/plan/steps-csv" download>Download steps (CSV)</a>
        </div>
      </section> : null}
    </main>
  );
}
