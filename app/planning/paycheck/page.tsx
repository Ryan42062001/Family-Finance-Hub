import Link from "next/link";
import { redirect } from "next/navigation";
import PaycheckPlanner from "@/components/planning/PaycheckPlanner";
import { monthlyAmountToPerPaycheck } from "@/lib/calculations/paycheck-planner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaycheckPlannerPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id, name, created_at").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [incomeResult, expensesResult, debtsResult, retirementResult] = await Promise.all([
    supabase.from("income_sources").select("monthly_amount").eq("household_id", household.id),
    supabase.from("expenses").select("monthly_amount, is_essential").eq("household_id", household.id),
    supabase.from("debts").select("minimum_payment").eq("household_id", household.id),
    supabase.from("retirement_accounts").select("monthly_employee_contribution").eq("household_id", household.id),
  ]);

  const paychecksPerYear = 26;
  const monthlyIncome = (incomeResult.data ?? []).reduce((sum, row) => sum + Number(row.monthly_amount), 0);
  const monthlyEssentialExpenses = (expensesResult.data ?? []).filter((row) => row.is_essential).reduce((sum, row) => sum + Number(row.monthly_amount), 0);
  const monthlyDebtMinimums = (debtsResult.data ?? []).reduce((sum, row) => sum + Number(row.minimum_payment), 0);
  const monthlyRetirement = (retirementResult.data ?? []).reduce((sum, row) => sum + Number(row.monthly_employee_contribution), 0);

  const defaults = {
    paychecksPerYear,
    takeHomePay: monthlyAmountToPerPaycheck(monthlyIncome, paychecksPerYear),
    essentialExpenses: monthlyAmountToPerPaycheck(monthlyEssentialExpenses, paychecksPerYear),
    debtMinimums: monthlyAmountToPerPaycheck(monthlyDebtMinimums, paychecksPerYear),
    retirementContributions: monthlyAmountToPerPaycheck(monthlyRetirement, paychecksPerYear),
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Phase 4 planning tools</p>
          <h1>Paycheck planner</h1>
          <p className="muted">Turn monthly household data into a per-paycheck plan, then decide how much of the remaining cash goes toward savings, debt, goals, and spending.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" href="/planning">Back to planning</Link>
          <Link className="secondary-button" href="/dashboard">Dashboard</Link>
        </div>
      </section>

      <PaycheckPlanner defaults={defaults} />
    </main>
  );
}
