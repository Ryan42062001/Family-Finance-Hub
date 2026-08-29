import Link from "next/link";
import { redirect } from "next/navigation";
import { compareDebtExtraPayment, projectDebtStrategy } from "@/lib/calculations/debt-payoff";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };
const readNumber = (value: string | undefined, fallback: number) => { if (value === undefined || value.trim() === "") return fallback; const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback; };
const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const monthsLabel = (months: number | null) => months === null ? "—" : months === 0 ? "Paid off" : `${Math.floor(months / 12)}y ${months % 12}m`;

export default async function DebtPlanningPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const { data: debtsData } = await supabase
    .from("debts")
    .select("id, name, debt_type, current_balance, interest_rate, minimum_payment")
    .eq("household_id", household.id)
    .order("created_at");

  const debts = debtsData ?? [];
  const selectedId = params.debtId ?? debts[0]?.id;
  const selectedDebt = debts.find((debt) => debt.id === selectedId) ?? debts[0];

  const singleInputs = {
    balance: readNumber(params.debtBalance, Number(selectedDebt?.current_balance ?? 0)),
    annualInterestRate: readNumber(params.debtRate, Number(selectedDebt?.interest_rate ?? 0)),
    minimumPayment: readNumber(params.debtMinimum, Number(selectedDebt?.minimum_payment ?? 0)),
    extraMonthlyPayment: readNumber(params.debtExtra, 0),
  };
  const comparison = compareDebtExtraPayment(singleInputs);

  const strategyExtra = readNumber(params.strategyExtra, 0);
  const strategyDebts = debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: Number(debt.current_balance ?? 0),
    annualInterestRate: Number(debt.interest_rate ?? 0),
    minimumPayment: Number(debt.minimum_payment ?? 0),
  }));
  const avalanche = projectDebtStrategy(strategyDebts, strategyExtra, "avalanche");
  const snowball = projectDebtStrategy(strategyDebts, strategyExtra, "snowball");

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div><p className="eyebrow">Phase 4 planning tools</p><h1>Debt payoff calculator</h1><p className="muted">Model one debt with extra payments or compare avalanche and snowball strategies across your saved household debts.</p></div>
        <div className="hero-actions"><Link className="secondary-button" href="/planning">Back to planning lab</Link><Link className="secondary-button" href="/dashboard">Dashboard</Link></div>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Single debt</p><h2>Test an extra payment</h2>
          <form className="data-form" method="get">
            <label>Saved debt<select name="debtId" defaultValue={selectedDebt?.id}>{debts.map((debt) => <option key={debt.id} value={debt.id}>{debt.name}</option>)}</select></label>
            <label>Current balance<input name="debtBalance" type="number" min="0" step="0.01" defaultValue={singleInputs.balance} /></label>
            <label>Interest rate (%)<input name="debtRate" type="number" min="0" step="0.001" defaultValue={singleInputs.annualInterestRate} /></label>
            <label>Minimum payment<input name="debtMinimum" type="number" min="0" step="0.01" defaultValue={singleInputs.minimumPayment} /></label>
            <label>Extra monthly payment<input name="debtExtra" type="number" min="0" step="0.01" defaultValue={singleInputs.extraMonthlyPayment} /></label>
            <button type="submit">Compare payoff</button>
          </form>
        </article>

        <article className="panel">
          <p className="eyebrow">Single-debt projection</p><h2>Extra-payment impact</h2>
          {comparison.baseline.payoffPossible && comparison.accelerated.payoffPossible ? <>
            <div className="split-summary">
              <div><span>Current payoff</span><strong>{monthsLabel(comparison.baseline.months)}</strong></div>
              <div><span>With extra</span><strong>{monthsLabel(comparison.accelerated.months)}</strong></div>
              <div><span>Time saved</span><strong>{monthsLabel(comparison.monthsSaved)}</strong></div>
              <div><span>Current interest</span><strong>{money(comparison.baseline.totalInterest)}</strong></div>
              <div><span>New interest</span><strong>{money(comparison.accelerated.totalInterest)}</strong></div>
              <div><span>Interest saved</span><strong>{money(comparison.interestSaved)}</strong></div>
            </div>
            <p className="muted">Assumes a fixed APR and a steady monthly payment. Fees, changing rates, promotional periods, and irregular payments are excluded.</p>
          </> : <p className="empty-state">The entered payment is not enough to amortize this debt. Increase the monthly payment or verify the saved terms.</p>}
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <p className="eyebrow">Household strategy</p><h2>Compare avalanche vs. snowball</h2>
          <p className="muted">Both strategies keep your current combined minimum-payment budget and add the extra amount below. Freed payments are rolled into the remaining debts.</p>
          <form className="data-form" method="get">
            <label>Extra monthly debt budget<input name="strategyExtra" type="number" min="0" step="0.01" defaultValue={strategyExtra} /></label>
            <button type="submit">Compare strategies</button>
          </form>
          <div className="record-list">{debts.map((debt) => <div className="record-row" key={debt.id}><span><strong>{debt.name}</strong><small>{money(Number(debt.current_balance))} · {Number(debt.interest_rate ?? 0)}% · {money(Number(debt.minimum_payment))}/mo</small></span></div>)}</div>
        </article>

        <article className="panel">
          <p className="eyebrow">Strategy comparison</p><h2>Which path costs less?</h2>
          {avalanche.payoffPossible && snowball.payoffPossible ? <>
            <div className="split-summary">
              <div><span>Avalanche payoff</span><strong>{monthsLabel(avalanche.months)}</strong></div>
              <div><span>Snowball payoff</span><strong>{monthsLabel(snowball.months)}</strong></div>
              <div><span>Avalanche interest</span><strong>{money(avalanche.totalInterest)}</strong></div>
              <div><span>Snowball interest</span><strong>{money(snowball.totalInterest)}</strong></div>
              <div><span>Interest advantage</span><strong>{money(Math.max(0, (snowball.totalInterest ?? 0) - (avalanche.totalInterest ?? 0)))}</strong></div>
              <div><span>Faster strategy</span><strong>{(avalanche.months ?? Infinity) < (snowball.months ?? Infinity) ? "Avalanche" : (snowball.months ?? Infinity) < (avalanche.months ?? Infinity) ? "Snowball" : "Tie"}</strong></div>
            </div>
            <p><strong>Avalanche order:</strong> {avalanche.payoffOrder.join(" → ") || "—"}</p>
            <p><strong>Snowball order:</strong> {snowball.payoffOrder.join(" → ") || "—"}</p>
            <p className="muted">Avalanche prioritizes the highest APR. Snowball prioritizes the smallest balance. Results assume all minimum payments stay available and roll forward after each payoff.</p>
          </> : <p className="empty-state">At least one saved debt has a minimum payment too small to amortize its current balance. Fix that debt or adjust its terms before comparing strategies.</p>}
        </article>
      </section>
    </main>
  );
}
