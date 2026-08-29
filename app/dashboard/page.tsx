import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import {
  calculateFinancialHealth,
  calculateGoalProgress,
  groupCategoryAmounts,
  profileCompletion,
  sumAmounts,
} from "@/lib/calculations/dashboard-insights";
import { calculateFinancialSummary } from "@/lib/calculations/financial-summary";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id, name, created_at").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [accountsResult, incomeResult, expensesResult, debtsResult, retirementResult, goalsResult] = await Promise.all([
    supabase.from("accounts").select("id, name, account_type, balance, include_in_net_worth").eq("household_id", household.id).order("balance", { ascending: false }),
    supabase.from("income_sources").select("id, name, monthly_amount, is_active").eq("household_id", household.id).order("monthly_amount", { ascending: false }),
    supabase.from("expenses").select("id, name, category, monthly_amount, is_essential").eq("household_id", household.id).order("monthly_amount", { ascending: false }),
    supabase.from("debts").select("id, name, debt_type, current_balance, interest_rate, minimum_payment").eq("household_id", household.id).order("current_balance", { ascending: false }),
    supabase.from("retirement_accounts").select("id, name, account_type, balance, monthly_employee_contribution, monthly_employer_contribution").eq("household_id", household.id).order("balance", { ascending: false }),
    supabase.from("goals").select("id, name, target_amount, current_amount, target_date, priority").eq("household_id", household.id).order("priority"),
  ]);

  const accounts = accountsResult.data ?? [];
  const income = incomeResult.data ?? [];
  const expenses = expensesResult.data ?? [];
  const debts = debtsResult.data ?? [];
  const retirement = retirementResult.data ?? [];
  const goals = goalsResult.data ?? [];

  const summary = calculateFinancialSummary({
    accountBalances: accounts.filter((row) => row.include_in_net_worth).map((row) => Number(row.balance)),
    retirementBalances: retirement.map((row) => Number(row.balance)),
    debtBalances: debts.map((row) => Number(row.current_balance)),
    monthlyIncome: income.filter((row) => row.is_active).map((row) => Number(row.monthly_amount)),
    monthlyExpenses: expenses.map((row) => Number(row.monthly_amount)),
    monthlyDebtPayments: debts.map((row) => Number(row.minimum_payment)),
    monthlyEmployeeRetirement: retirement.map((row) => Number(row.monthly_employee_contribution)),
    monthlyEmployerRetirement: retirement.map((row) => Number(row.monthly_employer_contribution)),
  });

  const accountAssets = sumAmounts(accounts.filter((row) => row.include_in_net_worth).map((row) => ({ name: row.name, amount: Number(row.balance) })));
  const retirementAssets = sumAmounts(retirement.map((row) => ({ name: row.name, amount: Number(row.balance) })));
  const totalDebt = sumAmounts(debts.map((row) => ({ name: row.name, amount: Number(row.current_balance) })));
  const expenseCategories = groupCategoryAmounts(expenses.map((row) => ({ category: row.category, amount: Number(row.monthly_amount) })));
  const goalProgress = calculateGoalProgress(goals.map((goal) => ({ id: goal.id, name: goal.name, currentAmount: Number(goal.current_amount), targetAmount: Number(goal.target_amount), priority: Number(goal.priority) })));
  const completion = profileCompletion([accounts.length, income.length, expenses.length, debts.length, retirement.length, goals.length]);
  const health = calculateFinancialHealth({ completion, monthlyIncome: summary.monthlyIncome, monthlyCashFlow: summary.monthlyCashFlow, savingsRate: summary.savingsRate, totalDebt, retirementAssets, goalCount: goals.length });

  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const percent = summary.savingsRate === null ? "—" : `${Math.round(summary.savingsRate * 100)}%`;
  const hasCashFlowData = income.some((row) => row.is_active) && expenses.length > 0;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div><p className="eyebrow">Private workspace</p><h1>{household.name}</h1><p className="muted">A household-level view of what you own, owe, earn, spend, save, and are working toward.</p></div>
        <div className="hero-actions"><Link className="secondary-button" href="/financial-profile">Edit financial profile</Link><form action={logout}><button type="submit">Sign out</button></form></div>
      </section>

      {completion < 100 ? <section className="dashboard-notice"><div><strong>Financial profile: {completion}% complete</strong><p>Add missing sections to make dashboard metrics and future recommendations more complete.</p></div><Link className="secondary-button" href="/financial-profile">Finish profile</Link></section> : null}

      <section className="health-card">
        <div><p className="eyebrow">Financial health summary</p><h2>{health.status}</h2><p className="muted">{health.message}</p></div>
        <div className="health-score"><strong>{health.score === null ? "—" : health.score}</strong><span>{health.score === null ? "More data needed" : "out of 100"}</span></div>
      </section>

      <section className="metric-grid dashboard-metrics">
        <article className="metric-card"><p>Net worth</p><strong>{money(summary.netWorth)}</strong><span>{money(accountAssets + retirementAssets)} assets · {money(totalDebt)} debt</span></article>
        <article className="metric-card"><p>Monthly cash flow</p><strong>{hasCashFlowData ? money(summary.monthlyCashFlow) : "—"}</strong><span>{hasCashFlowData ? "After expenses, debt minimums, and your retirement contributions" : "Add income and expenses to calculate"}</span></article>
        <article className="metric-card"><p>Savings rate</p><strong>{hasCashFlowData ? percent : "—"}</strong><span>Cash surplus + your retirement contributions</span></article>
        <article className="metric-card"><p>Retirement</p><strong>{money(retirementAssets)}</strong><span>{money(summary.monthlyRetirementContributions)} contributed / month incl. employer</span></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel dashboard-panel">
          <div className="panel-heading"><div><p className="eyebrow">Balance sheet</p><h2>Assets & liabilities</h2></div><strong>{money(summary.netWorth)}</strong></div>
          <div className="split-summary"><div><span>Cash / taxable assets</span><strong>{money(accountAssets)}</strong></div><div><span>Retirement assets</span><strong>{money(retirementAssets)}</strong></div><div><span>Total debt</span><strong>{money(totalDebt)}</strong></div></div>
          {accounts.length || debts.length ? <div className="dashboard-list">{accounts.filter((row) => row.include_in_net_worth).slice(0, 4).map((row) => <div key={row.id}><span><strong>{row.name}</strong><small>{label(row.account_type)}</small></span><b>{money(Number(row.balance))}</b></div>)}{debts.slice(0, 4).map((row) => <div key={row.id}><span><strong>{row.name}</strong><small>{label(row.debt_type)} · {row.interest_rate ?? 0}%</small></span><b>-{money(Number(row.current_balance))}</b></div>)}</div> : <p className="empty-state">Add accounts and debts to see your balance sheet.</p>}
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading"><div><p className="eyebrow">Monthly plan</p><h2>Cash flow</h2></div><strong>{hasCashFlowData ? money(summary.monthlyCashFlow) : "—"}</strong></div>
          <div className="flow-stack"><div><span>Income</span><strong>{money(summary.monthlyIncome)}</strong></div><div><span>Recurring expenses</span><strong>-{money(summary.monthlyExpenses)}</strong></div><div><span>Debt minimums</span><strong>-{money(summary.monthlyDebtPayments)}</strong></div><div><span>Your retirement contributions</span><strong>-{money(retirement.reduce((sum, row) => sum + Number(row.monthly_employee_contribution), 0))}</strong></div></div>
          {!hasCashFlowData ? <p className="empty-state">Add at least one active income source and monthly expense to calculate cash flow.</p> : null}
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading"><div><p className="eyebrow">Spending</p><h2>Expense breakdown</h2></div><strong>{money(summary.monthlyExpenses)}</strong></div>
          {expenseCategories.length ? <div className="bar-list">{expenseCategories.slice(0, 6).map((item) => { const share = summary.monthlyExpenses > 0 ? (item.amount / summary.monthlyExpenses) * 100 : 0; return <div key={item.category}><div className="bar-label"><span>{label(item.category)}</span><strong>{money(item.amount)} · {Math.round(share)}%</strong></div><div className="mini-track"><div className="mini-fill" style={{ width: `${Math.min(100, share)}%` }} /></div></div>; })}</div> : <p className="empty-state">Add monthly expenses to see where your money goes.</p>}
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading"><div><p className="eyebrow">Debt</p><h2>Debt overview</h2></div><strong>{money(totalDebt)}</strong></div>
          {debts.length ? <div className="dashboard-list">{debts.slice(0, 6).map((row) => <div key={row.id}><span><strong>{row.name}</strong><small>{row.interest_rate ?? 0}% APR · {money(Number(row.minimum_payment))}/mo minimum</small></span><b>{money(Number(row.current_balance))}</b></div>)}</div> : <p className="empty-state">No debts added. If your household is debt-free, this can stay empty.</p>}
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading"><div><p className="eyebrow">Long term</p><h2>Retirement</h2></div><strong>{money(retirementAssets)}</strong></div>
          {retirement.length ? <div className="dashboard-list">{retirement.slice(0, 6).map((row) => <div key={row.id}><span><strong>{row.name}</strong><small>{label(row.account_type)} · {money(Number(row.monthly_employee_contribution) + Number(row.monthly_employer_contribution))}/mo</small></span><b>{money(Number(row.balance))}</b></div>)}</div> : <p className="empty-state">Add retirement accounts to track balances and contribution pace.</p>}
        </article>

        <article className="panel dashboard-panel">
          <div className="panel-heading"><div><p className="eyebrow">Priorities</p><h2>Goals</h2></div><strong>{goals.length}</strong></div>
          {goalProgress.length ? <div className="goal-list">{goalProgress.slice(0, 5).map((goal) => <div key={goal.id}><div className="bar-label"><span><strong>{goal.name}</strong><small>Priority {goal.priority}</small></span><strong>{Math.round(goal.progress * 100)}%</strong></div><div className="mini-track"><div className="mini-fill" style={{ width: `${goal.progress * 100}%` }} /></div><small>{money(goal.currentAmount)} saved · {money(goal.remaining)} remaining</small></div>)}</div> : <p className="empty-state">Add goals to track progress toward the things your household cares about.</p>}
        </article>
      </section>
    </main>
  );
}
