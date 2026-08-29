import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: households } = await supabase
    .from("households")
    .select("id, name, created_at")
    .order("created_at")
    .limit(1);

  if (!households?.length) {
    redirect("/onboarding");
  }

  const household = households[0];
  const [accountsResult, incomeResult, debtsResult, retirementResult, goalsResult] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("household_id", household.id),
    supabase.from("income_sources").select("id", { count: "exact", head: true }).eq("household_id", household.id),
    supabase.from("debts").select("id", { count: "exact", head: true }).eq("household_id", household.id),
    supabase.from("retirement_accounts").select("id", { count: "exact", head: true }).eq("household_id", household.id),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("household_id", household.id),
  ]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Private workspace</p>
          <h1>{household.name}</h1>
          <p className="muted">
            Your financial profile is isolated to this household by database row-level security.
          </p>
        </div>
        <form action={logout}>
          <button type="submit">Sign out</button>
        </form>
      </section>

      <section className="panel">
        <h2>Financial profile</h2>
        <ul>
          <li>Cash & accounts: {accountsResult.count ?? 0}</li>
          <li>Income sources: {incomeResult.count ?? 0}</li>
          <li>Debts: {debtsResult.count ?? 0}</li>
          <li>Retirement accounts: {retirementResult.count ?? 0}</li>
          <li>Goals: {goalsResult.count ?? 0}</li>
        </ul>
        <p className="muted">The next Phase 2 slice will add forms for entering these records.</p>
      </section>
    </main>
  );
}
