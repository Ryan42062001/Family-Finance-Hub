import Link from "next/link";
import { redirect } from "next/navigation";
import PlanningCalculators from "@/components/planning/PlanningCalculators";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const monthsUntilDate = (targetDate: string | null | undefined) => {
  if (!targetDate) return 12;
  const target = new Date(`${targetDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 12;
  const now = new Date();
  return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
};

export default async function PlanningPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [accountsResult, expensesResult, debtsResult, goalsResult] = await Promise.all([
    supabase.from("accounts").select("balance, account_type").eq("household_id", household.id),
    supabase.from("expenses").select("monthly_amount, is_essential").eq("household_id", household.id),
    supabase.from("debts").select("debt_type, current_balance, interest_rate, minimum_payment").eq("household_id", household.id),
    supabase.from("goals").select("name, target_amount, current_amount, target_date, priority").eq("household_id", household.id).order("priority").limit(1),
  ]);

  const accounts = accountsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const debts = debtsResult.data ?? [];
  const topGoal = goalsResult.data?.[0];
  const mortgage = debts.find((row) => row.debt_type === "mortgage");
  const liquidSavings = accounts.filter((row) => ["checking", "savings", "cash"].includes(row.account_type)).reduce((sum, row) => sum + Number(row.balance), 0);
  const essentialExpenses = expenses.filter((row) => row.is_essential).reduce((sum, row) => sum + Number(row.monthly_amount), 0) + debts.reduce((sum, row) => sum + Number(row.minimum_payment), 0);

  const defaults = {
    emergency: { currentSavings: liquidSavings, monthlyEssentialExpenses: essentialExpenses, targetMonths: 6 },
    mortgage: {
      principal: Number(mortgage?.current_balance ?? 0),
      annualInterestRate: Number(mortgage?.interest_rate ?? 0),
      monthlyPayment: Number(mortgage?.minimum_payment ?? 0),
      hasSavedMortgage: Boolean(mortgage),
    },
    goal: {
      name: topGoal?.name ?? null,
      currentAmount: Number(topGoal?.current_amount ?? 0),
      targetAmount: Number(topGoal?.target_amount ?? 0),
      monthsUntilTarget: monthsUntilDate(topGoal?.target_date),
    },
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div><p className="eyebrow">Phase 4 planning tools</p><h1>Household planning lab</h1><p className="muted">Use saved household data as a starting point, adjust assumptions locally, and compare outcomes without changing your live profile.</p></div>
        <div className="hero-actions"><Link className="secondary-button" href="/dashboard">Back to dashboard</Link></div>
      </section>

      <section className="panel">
        <p className="eyebrow">All planning tools</p>
        <h2>Choose a calculator</h2>
        <div className="hero-actions">
          <a className="secondary-button" href="#emergency-fund">Emergency fund</a>
          <a className="secondary-button" href="#mortgage">Mortgage payoff</a>
          <a className="secondary-button" href="#savings-goal">Savings goal</a>
          <Link className="secondary-button" href="/planning/retirement">Retirement pacing</Link>
          <Link className="secondary-button" href="/planning/debt">Debt payoff</Link>
          <Link className="secondary-button" href="/planning/paycheck">Paycheck planner</Link>
        </div>
      </section>

      <PlanningCalculators defaults={defaults} />
    </main>
  );
}
