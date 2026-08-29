import Link from "next/link";
import { redirect } from "next/navigation";
import DebtPayoffCalculator from "@/components/planning/DebtPayoffCalculator";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DebtPlanningPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const { data } = await supabase.from("debts").select("id, name, debt_type, current_balance, interest_rate, minimum_payment").eq("household_id", household.id).order("created_at");
  const debts = (data ?? []).map((debt) => ({ id: debt.id, name: debt.name, debtType: debt.debt_type, balance: Number(debt.current_balance ?? 0), annualInterestRate: Number(debt.interest_rate ?? 0), minimumPayment: Number(debt.minimum_payment ?? 0) }));

  return <main className="page-shell">
    <section className="hero-card"><div><p className="eyebrow">Phase 4 planning tools</p><h1>Debt payoff calculator</h1><p className="muted">Model one debt with extra payments or compare avalanche and snowball strategies across your saved non-mortgage debts.</p></div><div className="hero-actions"><Link className="secondary-button" href="/planning">Back to planning</Link><Link className="secondary-button" href="/dashboard">Dashboard</Link></div></section>
    <DebtPayoffCalculator debts={debts} />
  </main>;
}
