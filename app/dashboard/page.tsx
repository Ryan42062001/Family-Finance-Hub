import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/auth/login");

  const { data: households } = await supabase
    .from("households")
    .select("id, name, created_at")
    .order("created_at")
    .limit(1);

  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [accountsResult, incomeResult, debtsResult, retirementResult, goalsResult] = await Promise.all([
    supabase.from("accounts").select("id, balance, include_in_net_worth").eq("household_id", household.id),
    supabase.from("income_sources").select("id, monthly_amount, is_active").eq("household_id", household.id),
    supabase.from("debts").select("id, current_balance, minimum_payment").eq("household_id", household.id),
    supabase.from("retirement_accounts").select("id, balance, monthly_employee_contribution, monthly_employer_contribution").eq("household_id", household.id),
    supabase.from("goals").select("id, target_amount, current_amount").eq("household_id", household.id),
  ]);

  const sum = <T,>(rows: T[] | null, value: (row: T) => number) =>
    (rows ?? []).reduce((total, row) => total + value(row), 0);

  const cashAssets = sum(accountsResult.data, (row) => row.include_in_net_worth ? Number(row.balance) : 0);
  const retirementAssets = sum(retirementResult.data, (row) => Number(row.balance));
  const totalDebt = sum(debtsResult.data, (row) => Number(row.current_balance));
  const monthlyIncome = sum(incomeResult.data, (row) => row.is_active ? Number(row.monthly_amount) : 0);
  const minimumDebtPayments = sum(debtsResult.data, (row) => Number(row.minimum_payment));
  const monthlyRetirement = sum(retirementResult.data, (row) => Number(row.monthly_employee_contribution) + Number(row.monthly_employer_contribution));
  const netWorth = cashAssets + retirementAssets - totalDebt;

  const money = (value: number) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Private workspace</p>
          <h1>{household.name}</h1>
          <p className="muted">Your first live household metrics are calculated from data protected by row-level security.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" href="/financial-profile">Edit financial profile</Link>
          <form action={logout}><button type="submit">Sign out</button></form>
        </div>
      </section>

      <section className="metric-grid dashboard-metrics">
        <article className="metric-card"><p>Net worth</p><strong>{money(netWorth)}</strong><span>Assets minus debts</span></article>
        <article className="metric-card"><p>Monthly income</p><strong>{money(monthlyIncome)}</strong><span>Active income sources</span></article>
        <article className="metric-card"><p>Total debt</p><strong>{money(totalDebt)}</strong><span>{money(minimumDebtPayments)} minimums / month</span></article>
        <article className="metric-card"><p>Retirement assets</p><strong>{money(retirementAssets)}</strong><span>{money(monthlyRetirement)} contributed / month</span></article>
      </section>

      <section className="panel profile-summary">
        <div>
          <h2>Financial profile</h2>
          <p className="muted">Keep filling this out—the Priority Engine and Scenario Lab will build on these records later.</p>
        </div>
        <ul>
          <li>Cash & accounts: {accountsResult.data?.length ?? 0}</li>
          <li>Income sources: {incomeResult.data?.length ?? 0}</li>
          <li>Debts: {debtsResult.data?.length ?? 0}</li>
          <li>Retirement accounts: {retirementResult.data?.length ?? 0}</li>
          <li>Goals: {goalsResult.data?.length ?? 0}</li>
        </ul>
      </section>
    </main>
  );
}
