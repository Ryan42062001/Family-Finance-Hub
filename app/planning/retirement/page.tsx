import Link from "next/link";
import { redirect } from "next/navigation";
import RetirementPacingCalculator from "@/components/planning/RetirementPacingCalculator";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RetirementPlanningPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const { data: retirementAccounts } = await supabase.from("retirement_accounts").select("name, monthly_employee_contribution, monthly_employer_contribution").eq("household_id", household.id).order("created_at").limit(1);
  const account = retirementAccounts?.[0];

  return <main className="page-shell">
    <section className="hero-card"><div><p className="eyebrow">Phase 4 planning tools</p><h1>Retirement contribution pacing</h1><p className="muted">See what each remaining paycheck needs to contribute to reach an annual retirement or HSA target.</p></div><div className="hero-actions"><Link className="secondary-button" href="/planning">Back to planning</Link><Link className="secondary-button" href="/dashboard">Dashboard</Link></div></section>
    <RetirementPacingCalculator account={account ? { name: account.name, monthlyEmployeeContribution: Number(account.monthly_employee_contribution), monthlyEmployerContribution: Number(account.monthly_employer_contribution) } : null} />
  </main>;
}
