import Link from "next/link";
import { redirect } from "next/navigation";
import { calculateRetirementContributionPacing } from "@/lib/calculations/retirement-contribution-pacing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

const readNumber = (value: string | undefined, fallback: number) => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
};

export default async function RetirementPlanningPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase
    .from("households")
    .select("id, name, created_at")
    .order("created_at")
    .limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const { data: retirementAccounts } = await supabase
    .from("retirement_accounts")
    .select("name, account_type, balance, monthly_employee_contribution, monthly_employer_contribution")
    .eq("household_id", household.id)
    .order("created_at")
    .limit(1);

  const account = retirementAccounts?.[0];
  const annualTarget = readNumber(params.annualTarget, 0);
  const contributedYearToDate = readNumber(params.contributedYearToDate, 0);
  const remainingPayPeriods = readNumber(params.remainingPayPeriods, 0);
  const currentContributionPerPayPeriod = readNumber(params.currentContributionPerPayPeriod, 0);
  const result = calculateRetirementContributionPacing({
    annualTarget,
    contributedYearToDate,
    remainingPayPeriods,
    currentContributionPerPayPeriod,
  });

  const money = (value: number | null) => value === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Phase 4 planning tools</p>
          <h1>Retirement contribution pacing</h1>
          <p className="muted">See what each remaining paycheck needs to contribute to reach an annual retirement or HSA target.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" href="/planning">Back to planning lab</Link>
          <Link className="secondary-button" href="/dashboard">Dashboard</Link>
        </div>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Pacing assumptions</p>
          <h2>{account?.name ? `Plan around ${account.name}` : "Set an annual contribution target"}</h2>
          <p className="muted">Annual limits are intentionally entered by you so this calculator can handle different account types, ages, plan rules, and tax years without relying on a hard-coded limit.</p>
          {account ? <p className="muted">Saved profile reference: {money(Number(account.monthly_employee_contribution))}/mo employee + {money(Number(account.monthly_employer_contribution))}/mo employer. These are not automatically treated as per-paycheck contributions.</p> : null}
          <form className="data-form" method="get">
            <label>Annual contribution target<input name="annualTarget" type="number" min="0" step="0.01" defaultValue={annualTarget} /></label>
            <label>Contributed year to date<input name="contributedYearToDate" type="number" min="0" step="0.01" defaultValue={contributedYearToDate} /></label>
            <label>Remaining pay periods<input name="remainingPayPeriods" type="number" min="0" step="1" defaultValue={remainingPayPeriods} /></label>
            <label>Current contribution per pay period<input name="currentContributionPerPayPeriod" type="number" min="0" step="0.01" defaultValue={currentContributionPerPayPeriod} /></label>
            <button type="submit">Calculate pacing</button>
          </form>
        </article>

        <article className="panel">
          <p className="eyebrow">Projection</p>
          <h2>Year-end contribution pace</h2>
          <div className="split-summary">
            <div><span>Annual target</span><strong>{money(result.annualTarget)}</strong></div>
            <div><span>Contributed YTD</span><strong>{money(result.contributedYearToDate)}</strong></div>
            <div><span>Still needed</span><strong>{money(result.remainingAmount)}</strong></div>
            <div><span>Needed per pay period</span><strong>{money(result.requiredPerPayPeriod)}</strong></div>
            <div><span>Projected year-end</span><strong>{money(result.projectedYearEndContribution)}</strong></div>
            <div><span>Projected shortfall</span><strong>{money(result.projectedShortfall)}</strong></div>
          </div>
          {result.projectedExcess > 0 ? <p className="muted">At the entered pace, contributions would exceed the planning target by {money(result.projectedExcess)}. Confirm the applicable account and plan limits before increasing contributions.</p> : null}
          {result.requiredPerPayPeriod === null ? <p className="empty-state">Enter at least one remaining pay period to calculate the contribution needed per paycheck.</p> : null}
          <p className="muted">This is a pacing calculator, not tax advice. It does not determine eligibility, catch-up rules, employer-plan restrictions, combined-plan limits, or whether employer contributions count toward a specific limit.</p>
        </article>
      </section>
    </main>
  );
}
