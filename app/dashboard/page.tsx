import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { calculateFinancialSummary } from "@/lib/calculations/financial-summary";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id, name, created_at").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [accountsResult, incomeResult, expensesResult, debtsResult, retirementResult, goalsResult] = await Promise.all([
    supabase.from("accounts").select("id, balance, include_in_net_worth").eq("household_id", household.id),
    supabase.from("income_sources").select("id, monthly_amount, is_active").eq("household_id", household.id),
    supabase.from("expenses").select("id, monthly_amount").eq("household_id", household.id),
    supabase.from("debts").select("id, current_balance, minimum_payment").eq("household_id", household.id),
    supabase.from("retirement_accounts").select("id, balance, monthly_employee_contribution, monthly_employer_contribution").eq("household_id", household.id),
    supabase.from("goals").select("id, target_amount, current_amount").eq("household_id", household.id),
  ]);

  const summary = calculateFinancialSummary({
    accountBalances: (accountsResult.data ?? []).filter((row) => row.include_in_net_worth).map((row) => Number(row.balance)),
    retirementBalances: (retirementResult.data ?? []).map((row) => Number(row.balance)),
    debtBalances: (debtsResult.data ?? []).map((row) => Number(row.current_balance)),
    monthlyIncome: (incomeResult.data ?? []).filter((row) => row.is_active).map((row) => Number(row.monthly_amount)),
    monthlyExpenses: (expensesResult.data ?? []).map((row) => Number(row.monthly_amount)),
    monthlyDebtPayments: (debtsResult.data ?? []).map((row) => Number(row.minimum_payment)),
    monthlyEmployeeRetirement: (retirementResult.data ?? []).map((row) => Number(row.monthly_employee_contribution)),
    monthlyEmployerRetirement: (retirementResult.data ?? []).map((row) => Number(row.monthly_employer_contribution)),
  });

  const sections = [accountsResult, incomeResult, expensesResult, debtsResult, retirementResult, goalsResult];
  const completeSections = sections.filter((result) => (result.data?.length ?? 0) > 0).length;
  const completion = Math.round((completeSections / sections.length) * 100);

  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const percent = summary.savingsRate === null ? "—" : `${Math.round(summary.savingsRate * 100)}%`;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div><p className="eyebrow">Private workspace</p><h1>{household.name}</h1><p className="muted">Your live household metrics are calculated from records protected by row-level security.</p></div>
        <div className="hero-actions"><Link className="secondary-button" href="/financial-profile">Edit financial profile</Link><form action={logout}><button type="submit">Sign out</button></form></div>
      </section>

      <section className="metric-grid dashboard-metrics">
        <article className="metric-card"><p>Net worth</p><strong>{money(summary.netWorth)}</strong><span>Assets minus debts</span></article>
        <article className="metric-card"><p>Monthly cash flow</p><strong>{money(summary.monthlyCashFlow)}</strong><span>After expenses, debt minimums, and your retirement contributions</span></article>
        <article className="metric-card"><p>Savings rate</p><strong>{percent}</strong><span>Cash surplus + your retirement contributions</span></article>
        <article className="metric-card"><p>Monthly expenses</p><strong>{money(summary.monthlyExpenses)}</strong><span>{money(summary.monthlyDebtPayments)} debt minimums separate</span></article>
      </section>

      <section className="panel profile-summary">
        <div><h2>Financial profile: {completion}% complete</h2><p className="muted">Add at least one record in each core section before the Priority Engine starts making recommendations.</p><div className="progress-track"><div className="progress-fill" style={{ width: `${completion}%` }} /></div></div>
        <ul><li>Cash & accounts: {accountsResult.data?.length ?? 0}</li><li>Income sources: {incomeResult.data?.length ?? 0}</li><li>Monthly expenses: {expensesResult.data?.length ?? 0}</li><li>Debts: {debtsResult.data?.length ?? 0}</li><li>Retirement accounts: {retirementResult.data?.length ?? 0}</li><li>Goals: {goalsResult.data?.length ?? 0}</li></ul>
      </section>
    </main>
  );
}
