import Link from "next/link";
import MoneyPlan from "@/components/plan/MoneyPlan";
import { EXAMPLE_HOUSEHOLD_NAME, exampleHouseholdRaw } from "@/lib/plan/example-household";
import { planFromRaw, todayUtc } from "@/lib/plan/plan-result";

export const dynamic = "force-dynamic";

// Public, read-only demo. It uses only the fixed made-up household in lib/plan/example-household.ts and never
// creates a Supabase client, reads cookies, or touches the database.
export default function ExampleHouseholdPage() {
  const plan = planFromRaw(exampleHouseholdRaw(), todayUtc());
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div><p className="eyebrow">Example household · made-up numbers</p><h1>{EXAMPLE_HOUSEHOLD_NAME}</h1><p className="muted">This is what your money plan looks like once your numbers are in. Every amount below is invented for this example.</p></div>
        <div className="hero-actions"><Link className="secondary-button" href="/auth/sign-up">Create your account</Link><Link className="secondary-button" href="/auth/login">Sign in</Link></div>
      </section>
      <MoneyPlan plan={plan} example />
    </main>
  );
}
