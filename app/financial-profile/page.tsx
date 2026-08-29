import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addAccount,
  addDebt,
  addGoal,
  addIncome,
  addRetirementAccount,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function FinancialProfilePage({ searchParams }: PageProps) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase
    .from("households")
    .select("id, name")
    .order("created_at")
    .limit(1);

  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [accounts, income, debts, retirement, goals] = await Promise.all([
    supabase.from("accounts").select("id, name, account_type, balance").eq("household_id", household.id).order("created_at"),
    supabase.from("income_sources").select("id, name, monthly_amount").eq("household_id", household.id).order("created_at"),
    supabase.from("debts").select("id, name, debt_type, current_balance, interest_rate, minimum_payment").eq("household_id", household.id).order("created_at"),
    supabase.from("retirement_accounts").select("id, name, account_type, balance, monthly_employee_contribution, monthly_employer_contribution").eq("household_id", household.id).order("created_at"),
    supabase.from("goals").select("id, name, target_amount, current_amount, target_date, priority").eq("household_id", household.id).order("created_at"),
  ]);

  const money = (value: number | string | null) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Phase 2</p>
          <h1>Build your financial profile</h1>
          <p className="muted">Add the core numbers Family Finance Hub will use for your dashboard and future recommendations.</p>
        </div>
        <Link className="secondary-button" href="/dashboard">Back to dashboard</Link>
      </section>

      {message ? <p className="success-banner">{message}</p> : null}

      <div className="form-section-grid">
        <section className="panel">
          <h2>Cash & accounts</h2>
          <form className="data-form" action={addAccount}>
            <label>Name<input name="name" maxLength={100} required placeholder="Checking" /></label>
            <label>Type<select name="account_type" defaultValue="checking"><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="brokerage">Brokerage</option><option value="other_asset">Other asset</option></select></label>
            <label>Balance<input name="balance" type="number" min="0" step="0.01" required /></label>
            <button type="submit">Add account</button>
          </form>
          <div className="record-list">{accounts.data?.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{money(item.balance)}</span></div>)}</div>
        </section>

        <section className="panel">
          <h2>Income</h2>
          <form className="data-form" action={addIncome}>
            <label>Name<input name="name" maxLength={100} required placeholder="Primary job" /></label>
            <label>Monthly take-home<input name="monthly_amount" type="number" min="0" step="0.01" required /></label>
            <button type="submit">Add income</button>
          </form>
          <div className="record-list">{income.data?.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{money(item.monthly_amount)}/mo</span></div>)}</div>
        </section>

        <section className="panel">
          <h2>Debts</h2>
          <form className="data-form" action={addDebt}>
            <label>Name<input name="name" maxLength={100} required placeholder="Mortgage" /></label>
            <label>Type<select name="debt_type" defaultValue="mortgage"><option value="mortgage">Mortgage</option><option value="student_loan">Student loan</option><option value="auto_loan">Auto loan</option><option value="credit_card">Credit card</option><option value="personal_loan">Personal loan</option><option value="medical">Medical</option><option value="other">Other</option></select></label>
            <label>Balance<input name="current_balance" type="number" min="0" step="0.01" required /></label>
            <label>Interest rate (%)<input name="interest_rate" type="number" min="0" max="100" step="0.0001" /></label>
            <label>Minimum payment<input name="minimum_payment" type="number" min="0" step="0.01" required /></label>
            <button type="submit">Add debt</button>
          </form>
          <div className="record-list">{debts.data?.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{money(item.current_balance)} · {item.interest_rate ?? 0}%</span></div>)}</div>
        </section>

        <section className="panel">
          <h2>Retirement</h2>
          <form className="data-form" action={addRetirementAccount}>
            <label>Name<input name="name" maxLength={100} required placeholder="Work 401(k)" /></label>
            <label>Type<select name="account_type" defaultValue="401k"><option value="401k">401(k)</option><option value="403b">403(b)</option><option value="457">457</option><option value="traditional_ira">Traditional IRA</option><option value="roth_ira">Roth IRA</option><option value="hsa">HSA</option><option value="pension">Pension</option><option value="other">Other</option></select></label>
            <label>Balance<input name="balance" type="number" min="0" step="0.01" required /></label>
            <label>Your monthly contribution<input name="monthly_employee_contribution" type="number" min="0" step="0.01" required /></label>
            <label>Employer monthly contribution<input name="monthly_employer_contribution" type="number" min="0" step="0.01" required /></label>
            <button type="submit">Add retirement account</button>
          </form>
          <div className="record-list">{retirement.data?.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{money(item.balance)}</span></div>)}</div>
        </section>

        <section className="panel">
          <h2>Goals</h2>
          <form className="data-form" action={addGoal}>
            <label>Name<input name="name" maxLength={100} required placeholder="Emergency fund" /></label>
            <label>Target amount<input name="target_amount" type="number" min="0.01" step="0.01" required /></label>
            <label>Current amount<input name="current_amount" type="number" min="0" step="0.01" required /></label>
            <label>Target date<input name="target_date" type="date" /></label>
            <label>Priority<select name="priority" defaultValue="3"><option value="1">1 - Highest</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 - Lowest</option></select></label>
            <button type="submit">Add goal</button>
          </form>
          <div className="record-list">{goals.data?.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{money(item.current_amount)} / {money(item.target_amount)}</span></div>)}</div>
        </section>
      </div>
    </main>
  );
}
