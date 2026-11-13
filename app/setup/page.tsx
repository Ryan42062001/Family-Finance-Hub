import Link from "next/link";
import { redirect } from "next/navigation";
import { completeSetup } from "@/app/setup/actions";
import NumberField from "@/components/forms/NumberField";
import { Choice, Toggle } from "@/components/forms/Controls";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SetupPageProps = { searchParams: Promise<{ error?: string }> };

// FFH-P05: offered to every new household right after it is created. About five
// questions, then straight to the money plan. Skippable; never shown once the
// household has any records.
export default async function SetupPage({ searchParams }: SetupPageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id, name").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  for (const table of ["income_sources", "expenses", "debts", "accounts"] as const) {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("household_id", household.id);
    if (error || (count ?? 0) > 0) redirect("/plan");
  }

  const { error } = await searchParams;

  return (
    <main className="page-shell setup-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Quick start · about a minute</p>
          <h1>Let&apos;s get your plan started</h1>
          <p className="muted">Five quick questions about a typical month. Round numbers are fine, and you can change anything later under Financial profile.</p>
        </div>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <form action={completeSetup} className="setup-form friendly-form">
        <section className="panel setup-step">
          <p className="setup-step-number">1 of 5</p>
          <NumberField name="take_home" label="How much take-home pay comes in each month?" example="Pay after tax that lands in your bank account, for everyone in the household" required period="month" />
        </section>
        <section className="panel setup-step">
          <p className="setup-step-number">2 of 5</p>
          <NumberField name="fixed_bills" label="Fixed bills and must-haves each month" example="Rent or mortgage, utilities, groceries, insurance, phone" required period="month" />
        </section>
        <section className="panel setup-step">
          <p className="setup-step-number">3 of 5</p>
          <NumberField name="other_spending" label="Other spending each month" example="Eating out, shopping, fun, subscriptions" required period="month" />
        </section>
        <section className="panel setup-step">
          <p className="setup-step-number">4 of 5 · optional</p>
          <NumberField name="debt_balance" label="Total debt you owe, not counting a mortgage" example="Credit cards, car and personal loans. Leave empty if none" />
          <NumberField name="debt_minimum" label="Total minimum payments each month" example="Needed if you entered a debt" period="month" />
          <NumberField name="debt_rate" label="Typical interest rate" example="Optional; your highest rate is a good guess" unit="percent" max="100" />
        </section>
        <section className="panel setup-step">
          <p className="setup-step-number">5 of 5 · optional</p>
          <NumberField name="savings" label="How much do you have in savings right now?" example="Leave empty if none" />
          {/* Savings are saved only with a purpose the person chooses; "Not sure" saves nothing yet. */}
          <Choice name="savings_purpose" legend="What are these savings for?" variant="pills" required={false} options={[
            { value: "protected_reserve", label: "Emergency fund – keep it safe" },
            { value: "unallocated", label: "Free for the plan to use" },
            { value: "operating_cash", label: "Everyday spending money" },
            { value: "not_sure", label: "Not sure – add it later" },
          ]} />
        </section>
        <section className="panel setup-step">
          <Toggle name="simple_view" label="Use Simple view" hint="Shows just your plan and the essentials. You can switch it anytime in your account menu." />
        </section>
        <div className="setup-actions">
          <button type="submit">Show my plan</button>
          <Link className="secondary-button" href="/dashboard">Skip for now</Link>
        </div>
      </form>
      <p className="muted setup-household">Setting up {household.name}. Only people in your household can see these numbers.</p>
    </main>
  );
}
