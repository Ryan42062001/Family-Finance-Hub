import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: households } = userId
    ? await supabase.from("households").select("id, name, created_at").order("created_at")
    : { data: [] };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Private workspace</p>
          <h1>Your dashboard</h1>
          <p className="muted">
            You can only see households permitted by database row-level security.
          </p>
        </div>
        <form action={logout}>
          <button type="submit">Sign out</button>
        </form>
      </section>

      <section className="panel">
        <h2>Households</h2>
        {households?.length ? (
          <ul>
            {households.map((household) => (
              <li key={household.id}>{household.name}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">No household yet. Onboarding comes next.</p>
        )}
      </section>
    </main>
  );
}
