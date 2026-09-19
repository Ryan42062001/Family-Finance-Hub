import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveSimplePlanLimitContract } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ message?: string }> };

function legacyHint(value: boolean | null): string {
  if (value === true) return "Yes (legacy hint only — reconfirmation required)";
  if (value === false) return "No (legacy hint only — reconfirmation required)";
  return "Unknown / not recorded";
}

export default async function SimplePlanLimitProfilePage({ searchParams }: PageProps) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households, error: householdError } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (householdError) throw new Error(householdError.message);
  if (!households?.length) redirect("/onboarding");
  const householdId = households[0].id;

  const { data: accounts, error } = await supabase
    .from("retirement_accounts")
    .select("id, name, simple_higher_limit_eligible, simple_plan_limit_category, simple_plan_limit_tax_year")
    .eq("household_id", householdId)
    .eq("account_type", "simple_ira")
    .order("created_at");
  if (error) throw new Error(error.message);

  const currentYear = new Date().getUTCFullYear();

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">SIMPLE IRA plan facts</p>
          <h1>Confirm the plan-limit category</h1>
          <p className="muted">This page records a plan fact only. It does not calculate the SIMPLE contribution limit or catch-up amount.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" href="/planning/retirement">Retirement planning</Link>
          <Link className="secondary-button" href="/financial-profile">Financial profile</Link>
        </div>
      </section>

      {message ? <p className="success-banner">{message}</p> : null}

      <section className="panel">
        <h2>How this confirmation works</h2>
        <p className="muted">The older “higher limit eligible” checkbox did not define which statutory SIMPLE category it meant and was not tied to a tax year. Family Finance Hub now treats that older value as a legacy hint only.</p>
        <p className="muted">Choose <strong>Certain applicable SIMPLE higher limit</strong> only when your employer or plan documentation confirms that category for the tax year. Do not infer it from the account name, employee count, or the legacy hint. If you are unsure, leave the category unconfirmed.</p>
      </section>

      <section className="panel">
        <h2>SIMPLE IRA accounts</h2>
        {!accounts?.length ? <p className="muted">No SIMPLE IRA accounts are currently recorded.</p> : null}
        <div className="record-list">
          {accounts?.map((account) => (
            <div className="record-row" key={account.id}>
              <span>
                <strong>{account.name}</strong>
                <small>Legacy higher-limit hint: {legacyHint(account.simple_higher_limit_eligible)}</small>
                <small>Confirmed category: {account.simple_plan_limit_category === "certain_applicable_higher" ? "Certain applicable SIMPLE higher limit" : account.simple_plan_limit_category === "standard" ? "Standard SIMPLE limit" : "Unknown / not confirmed"}{account.simple_plan_limit_tax_year ? ` · tax year ${account.simple_plan_limit_tax_year}` : ""}</small>
              </span>
              <form className="data-form edit-form" action={saveSimplePlanLimitContract}>
                <input type="hidden" name="id" value={account.id} />
                <label>
                  Plan-limit category
                  <select name="simple_plan_limit_category" defaultValue={account.simple_plan_limit_category ?? ""}>
                    <option value="">Not confirmed / unknown</option>
                    <option value="standard">Standard SIMPLE employee limit</option>
                    <option value="certain_applicable_higher">Certain applicable SIMPLE higher employee limit</option>
                  </select>
                </label>
                <label>
                  Tax year
                  <input name="simple_plan_limit_tax_year" type="number" min="1900" max="9999" step="1" defaultValue={account.simple_plan_limit_tax_year ?? currentYear} />
                </label>
                <button type="submit">Save SIMPLE plan facts</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
