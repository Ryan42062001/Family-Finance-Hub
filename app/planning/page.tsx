import Link from "next/link";
import { redirect } from "next/navigation";
import { calculateEmergencyFund } from "@/lib/calculations/emergency-fund";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    currentSavings?: string;
    monthlyEssentialExpenses?: string;
    targetMonths?: string;
    monthlyContribution?: string;
  }>;
};

const readNumber = (value: string | undefined, fallback: number) => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
};

export default async function PlanningPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id, name, created_at").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [accountsResult, expensesResult, debtsResult] = await Promise.all([
    supabase.from("accounts").select("balance, account_type").eq("household_id", household.id),
    supabase.from("expenses").select("monthly_amount, is_essential").eq("household_id", household.id),
    supabase.from("debts").select("minimum_payment").eq("household_id", household.id),
  ]);

  const defaultSavings = (accountsResult.data ?? [])
    .filter((row) => ["checking", "savings", "cash"].includes(row.account_type))
    .reduce((sum, row) => sum + Number(row.balance), 0);
  const defaultEssentialExpenses = (expensesResult.data ?? [])
    .filter((row) => row.is_essential)
    .reduce((sum, row) => sum + Number(row.monthly_amount), 0)
    + (debtsResult.data ?? []).reduce((sum, row) => sum + Number(row.minimum_payment), 0);

  const currentSavings = readNumber(params.currentSavings, defaultSavings);
  const monthlyEssentialExpenses = readNumber(params.monthlyEssentialExpenses, defaultEssentialExpenses);
  const targetMonths = readNumber(params.targetMonths, 6);
  const monthlyContribution = readNumber(params.monthlyContribution, 0);

  const result = calculateEmergencyFund({ currentSavings, monthlyEssentialExpenses, targetMonths, monthlyContribution });
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const percent = result.progress === null ? "—" : `${Math.round(result.progress * 100)}%`;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Phase 4 planning tools</p>
          <h1>Emergency fund calculator</h1>
          <p className="muted">Estimate how many months of essential expenses your liquid savings can cover and what it would take to reach your target reserve.</p>
        </div>
        <div className="hero-actions"><Link className="secondary-button" href="/dashboard">Back to dashboard</Link></div>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Assumptions</p>
          <h2>Adjust your plan</h2>
          <p className="muted">Defaults come from your household profile. Changes here are calculator-only and do not update saved records.</p>
          <form className="data-form" method="get">
            <label>Current liquid savings<input name="currentSavings" type="number" min="0" step="0.01" defaultValue={currentSavings} /></label>
            <label>Monthly essential expenses<input name="monthlyEssentialExpenses" type="number" min="0" step="0.01" defaultValue={monthlyEssentialExpenses} /></label>
            <label>Target months<input name="targetMonths" type="number" min="0" step="0.5" defaultValue={targetMonths} /></label>
            <label>Monthly contribution<input name="monthlyContribution" type="number" min="0" step="0.01" defaultValue={monthlyContribution} /></label>
            <button type="submit">Recalculate</button>
          </form>
          <p className="muted">Essential-expense defaults include expenses marked essential plus monthly debt minimums. Liquid-savings defaults include checking, savings, and cash accounts.</p>
        </article>

        <article className="panel">
          <p className="eyebrow">Projection</p>
          <h2>Your emergency reserve</h2>
          <div className="split-summary">
            <div><span>Target reserve</span><strong>{money(result.targetAmount)}</strong></div>
            <div><span>Current reserve</span><strong>{money(result.currentSavings)}</strong></div>
            <div><span>Funding progress</span><strong>{percent}</strong></div>
            <div><span>Funding gap</span><strong>{money(result.fundingGap)}</strong></div>
            <div><span>Current coverage</span><strong>{result.coverageMonths === null ? "—" : `${result.coverageMonths.toFixed(1)} months`}</strong></div>
            <div><span>Time to target</span><strong>{result.monthsToGoal === null ? "Add monthly savings" : result.monthsToGoal === 0 ? "Funded" : `${result.monthsToGoal} months`}</strong></div>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(result.progress ?? 0) * 100}%` }} /></div>
          <p className="muted">This is a planning projection based only on the assumptions above. It does not account for interest earned, changing expenses, or unexpected withdrawals.</p>
        </article>
      </section>
    </main>
  );
}
