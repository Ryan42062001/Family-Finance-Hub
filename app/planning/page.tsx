import Link from "next/link";
import { redirect } from "next/navigation";
import { calculateEmergencyFund } from "@/lib/calculations/emergency-fund";
import { compareMortgageExtraPayment } from "@/lib/calculations/mortgage-extra-payment";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };
const readNumber = (value: string | undefined, fallback: number) => { if (value === undefined || value.trim() === "") return fallback; const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback; };
const monthsLabel = (months: number | null) => months === null ? "—" : months === 0 ? "Paid off" : `${Math.floor(months / 12)}y ${months % 12}m`;

export default async function PlanningPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id, name, created_at").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [accountsResult, expensesResult, debtsResult] = await Promise.all([
    supabase.from("accounts").select("balance, account_type").eq("household_id", household.id),
    supabase.from("expenses").select("monthly_amount, is_essential").eq("household_id", household.id),
    supabase.from("debts").select("debt_type, current_balance, interest_rate, minimum_payment").eq("household_id", household.id),
  ]);

  const accounts = accountsResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const debts = debtsResult.data ?? [];
  const mortgage = debts.find((row) => row.debt_type === "mortgage");
  const defaultSavings = accounts.filter((row) => ["checking", "savings", "cash"].includes(row.account_type)).reduce((sum, row) => sum + Number(row.balance), 0);
  const defaultEssentialExpenses = expenses.filter((row) => row.is_essential).reduce((sum, row) => sum + Number(row.monthly_amount), 0) + debts.reduce((sum, row) => sum + Number(row.minimum_payment), 0);

  const emergency = calculateEmergencyFund({
    currentSavings: readNumber(params.currentSavings, defaultSavings),
    monthlyEssentialExpenses: readNumber(params.monthlyEssentialExpenses, defaultEssentialExpenses),
    targetMonths: readNumber(params.targetMonths, 6),
    monthlyContribution: readNumber(params.monthlyContribution, 0),
  });

  const mortgageInputs = {
    principal: readNumber(params.mortgagePrincipal, Number(mortgage?.current_balance ?? 0)),
    annualInterestRate: readNumber(params.mortgageRate, Number(mortgage?.interest_rate ?? 0)),
    monthlyPayment: readNumber(params.mortgagePayment, Number(mortgage?.minimum_payment ?? 0)),
    extraMonthlyPayment: readNumber(params.extraMortgagePayment, 0),
  };
  const mortgageProjection = compareMortgageExtraPayment(mortgageInputs);

  const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const percent = emergency.progress === null ? "—" : `${Math.round(emergency.progress * 100)}%`;

  return (
    <main className="page-shell">
      <section className="hero-card"><div><p className="eyebrow">Phase 4 planning tools</p><h1>Household planning lab</h1><p className="muted">Use your saved household data as a starting point, adjust assumptions, and compare outcomes without changing your live profile.</p></div><div className="hero-actions"><Link className="secondary-button" href="/dashboard">Back to dashboard</Link></div></section>

      <section className="panel-grid">
        <article className="panel"><p className="eyebrow">Emergency fund</p><h2>Adjust your reserve plan</h2><p className="muted">Defaults use liquid accounts, essential recurring expenses, and debt minimums.</p><form className="data-form" method="get">
          <label>Current liquid savings<input name="currentSavings" type="number" min="0" step="0.01" defaultValue={emergency.currentSavings} /></label>
          <label>Monthly essential expenses<input name="monthlyEssentialExpenses" type="number" min="0" step="0.01" defaultValue={emergency.monthlyEssentialExpenses} /></label>
          <label>Target months<input name="targetMonths" type="number" min="0" step="0.5" defaultValue={emergency.targetMonths} /></label>
          <label>Monthly contribution<input name="monthlyContribution" type="number" min="0" step="0.01" defaultValue={readNumber(params.monthlyContribution, 0)} /></label>
          <button type="submit">Recalculate emergency fund</button>
        </form></article>
        <article className="panel"><p className="eyebrow">Emergency projection</p><h2>Your reserve</h2><div className="split-summary"><div><span>Target</span><strong>{money(emergency.targetAmount)}</strong></div><div><span>Current</span><strong>{money(emergency.currentSavings)}</strong></div><div><span>Progress</span><strong>{percent}</strong></div><div><span>Gap</span><strong>{money(emergency.fundingGap)}</strong></div><div><span>Coverage</span><strong>{emergency.coverageMonths === null ? "—" : `${emergency.coverageMonths.toFixed(1)} months`}</strong></div><div><span>Time to target</span><strong>{emergency.monthsToGoal === null ? "Add monthly savings" : emergency.monthsToGoal === 0 ? "Funded" : `${emergency.monthsToGoal} months`}</strong></div></div><div className="progress-track"><div className="progress-fill" style={{ width: `${(emergency.progress ?? 0) * 100}%` }} /></div><p className="muted">Projection excludes interest earned, changing expenses, and withdrawals.</p></article>
      </section>

      <section className="panel-grid">
        <article className="panel"><p className="eyebrow">Mortgage extra payment</p><h2>Test a faster payoff</h2><p className="muted">If a mortgage exists in your profile, its balance, APR, and minimum payment are used as defaults.</p><form className="data-form" method="get">
          <label>Current mortgage balance<input name="mortgagePrincipal" type="number" min="0" step="0.01" defaultValue={mortgageInputs.principal} /></label>
          <label>Interest rate (%)<input name="mortgageRate" type="number" min="0" step="0.001" defaultValue={mortgageInputs.annualInterestRate} /></label>
          <label>Current monthly payment<input name="mortgagePayment" type="number" min="0" step="0.01" defaultValue={mortgageInputs.monthlyPayment} /></label>
          <label>Extra monthly principal<input name="extraMortgagePayment" type="number" min="0" step="0.01" defaultValue={mortgageInputs.extraMonthlyPayment} /></label>
          <button type="submit">Compare mortgage payoff</button>
        </form></article>
        <article className="panel"><p className="eyebrow">Mortgage projection</p><h2>Extra-payment impact</h2>{mortgageProjection.baseline.payoffPossible && mortgageProjection.accelerated.payoffPossible ? <><div className="split-summary"><div><span>Current payoff</span><strong>{monthsLabel(mortgageProjection.baseline.months)}</strong></div><div><span>With extra</span><strong>{monthsLabel(mortgageProjection.accelerated.months)}</strong></div><div><span>Time saved</span><strong>{monthsLabel(mortgageProjection.monthsSaved)}</strong></div><div><span>Current interest</span><strong>{money(mortgageProjection.baseline.totalInterest)}</strong></div><div><span>New interest</span><strong>{money(mortgageProjection.accelerated.totalInterest)}</strong></div><div><span>Interest saved</span><strong>{money(mortgageProjection.interestSaved)}</strong></div></div><p className="muted">Assumes a fixed interest rate, monthly payments, no escrow, no fees, and that the extra amount is applied directly to principal.</p></> : <p className="empty-state">Enter a payment greater than the monthly interest charge to produce a payoff projection.</p>}</article>
      </section>
    </main>
  );
}
