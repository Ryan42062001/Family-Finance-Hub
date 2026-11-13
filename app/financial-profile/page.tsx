import ProfileSection from "@/components/ProfileSection";
import ProfileWorkspace from "@/components/ProfileWorkspace";
import Link from "next/link";
import NumberField from "@/components/forms/NumberField";
import { Choice } from "@/components/forms/Controls";
import { AccountFields, DebtFields, ExpenseFields, GoalFields, IncomeFields, InsuranceFields, RetirementFields } from "@/components/forms/ProfileFields";
import { MoneyPrioritySnapshotValidationError } from "@/lib/calculations/money-priority-snapshot";
import { planFromSnapshot, todayUtc } from "@/lib/plan/plan-result";
import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addAccount,
  addDebt,
  addExpense,
  addGoal,
  addIncome,
  addInsurance,
  addRetirementAccount,
  deleteRecord,
  saveRetirementGoals,
  updateInsurance,
  updateAccount,
  updateDebt,
  updateExpense,
  updateGoal,
  updateIncome,
  updateRetirementAccount,
} from "./actions";

export const dynamic = "force-dynamic";
type PageProps = { searchParams: Promise<{ message?: string }> };

function DeleteButton({ kind, id }: { kind: string; id: string }) {
  return (
    <form action={deleteRecord}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className="danger-button" type="submit">Delete</button>
    </form>
  );
}

function RecordActions({ children, kind, id }: { children: React.ReactNode; kind: string; id: string }) {
  return (
    <div className="record-actions">
      <details className="edit-panel">
        <summary>Edit</summary>
        {children}
      </details>
      <DeleteButton kind={kind} id={id} />
    </div>
  );
}

// After a save: a checkmark, the message, and how many details the plan still wants. The plan count is
// best-effort; if it can't be worked out, only the message is shown.
async function SaveCelebration({ message, householdId }: { message: string; householdId: string }) {
  let detailsLeft: number | null = null;
  try {
    const plan = planFromSnapshot(await loadMoneyPrioritySnapshot(householdId), todayUtc());
    if (plan.ok) detailsLeft = plan.view.missingCount;
  } catch (error) {
    if (!(error instanceof MoneyPrioritySnapshotValidationError)) throw error;
  }
  return <div className="save-celebration" role="status">
    <span className="save-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
    <div><strong>{message}</strong>{detailsLeft === null ? null : detailsLeft === 0 ? <span>Your plan has everything it needs. 🎉</span> : <span>Your plan just got smarter. {detailsLeft} {detailsLeft === 1 ? "detail" : "details"} left to unlock more.</span>}</div>
    <Link href="/plan">See your plan →</Link>
  </div>;
}

export default async function FinancialProfilePage({ searchParams }: PageProps) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth/login");

  const { data: households } = await supabase.from("households").select("id, name").order("created_at").limit(1);
  if (!households?.length) redirect("/onboarding");
  const household = households[0];

  const [insurance, preferences] = await Promise.all([
    supabase.from("insurance_exposures").select("id, name, insurance_type, deductible_amount, family_deductible_amount, out_of_pocket_max, is_relevant_to_reserve").eq("household_id", household.id).order("created_at"),
    supabase.from("household_financial_preferences").select("desired_retirement_monthly_spending, retirement_spending_basis, planning_social_security_monthly, planning_pension_monthly").eq("household_id", household.id).maybeSingle(),
  ]);
  const goalsPrefs = preferences.data;
  const [accounts, income, expenses, debts, retirement, goals] = await Promise.all([
    supabase.from("accounts").select("id, name, account_type, balance, cash_purpose").eq("household_id", household.id).order("created_at"),
    supabase.from("income_sources").select("id, name, monthly_amount, monthly_gross_amount").eq("household_id", household.id).order("created_at"),
    supabase.from("expenses").select("id, name, category, monthly_amount, is_essential").eq("household_id", household.id).order("created_at"),
    supabase.from("debts").select("id, name, debt_type, current_balance, interest_rate, minimum_payment").eq("household_id", household.id).order("created_at"),
    supabase.from("retirement_accounts").select("id, name, account_type, balance, monthly_employee_contribution, monthly_employer_contribution, match_status, full_match_employee_contribution_monthly, employer_contribution_type, employee_contributed_ytd, employer_contributed_ytd, plan_eligible_compensation_annual").eq("household_id", household.id).order("created_at"),
    supabase.from("goals").select("id, name, target_amount, current_amount, target_date, priority, goal_class, necessity, deadline_flexibility, consequence_level, planned_monthly_contribution, core_need_amount, underlying_need, desired_solution, goal_nature, underfunding_consequence, borrowing_likelihood, expected_borrowing_amount, expected_borrowing_apr").eq("household_id", household.id).order("created_at"),
  ]);

  const money = (value: number | string | null) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));

  return (
    <main className="page-shell">
      <section className="hero-card profile-hero">
        <div><p className="eyebrow">Your household data</p><h1>Financial profile</h1><p className="muted">The numbers behind your dashboard and planning tools. Changes save only when you submit a section.</p></div>
      </section>
      {message ? <SaveCelebration message={message} householdId={household.id} /> : null}



      <ProfileWorkspace>
        <ProfileSection id="accounts" title="Cash & accounts" count={accounts.data?.length ?? 0} description={money((accounts.data ?? []).reduce((sum, item) => sum + Number(item.balance ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add account</summary><form className="data-form friendly-form" action={addAccount}>
            <AccountFields /><button type="submit">Add account</button>
          </form></details>
          <div className="record-list">{accounts.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.balance)}</small></span><RecordActions kind="account" id={item.id}><form className="data-form edit-form friendly-form" action={updateAccount}><input type="hidden" name="id" value={item.id} /><AccountFields d={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(accounts.data?.length ?? 0) === 0 ? <p className="empty-state">No accounts yet. Add your checking and savings to get started.</p> : null}
        </ProfileSection>

        <ProfileSection id="income" title="Income" count={income.data?.length ?? 0} description={money((income.data ?? []).reduce((sum, item) => sum + Number(item.monthly_amount ?? 0), 0)) + "/month"}>
          <details className="profile-add-disclosure"><summary>Add income</summary><form className="data-form friendly-form" action={addIncome}>
            <IncomeFields /><button type="submit">Add income</button>
          </form></details>
          <div className="record-list">{income.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.monthly_amount)}/mo</small></span><RecordActions kind="income" id={item.id}><form className="data-form edit-form friendly-form" action={updateIncome}><input type="hidden" name="id" value={item.id} /><IncomeFields d={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(income.data?.length ?? 0) === 0 ? <p className="empty-state">No income yet. Add your take-home pay to get started.</p> : null}
        </ProfileSection>

        <ProfileSection id="expenses" title="Monthly expenses" count={expenses.data?.length ?? 0} description={money((expenses.data ?? []).reduce((sum, item) => sum + Number(item.monthly_amount ?? 0), 0)) + "/month"}>
          <details className="profile-add-disclosure"><summary>Add expense</summary><form className="data-form friendly-form" action={addExpense}>
            <ExpenseFields /><button type="submit">Add expense</button>
          </form></details>
          <div className="record-list">{expenses.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.monthly_amount)}/mo · {item.category}</small></span><RecordActions kind="expense" id={item.id}><form className="data-form edit-form friendly-form" action={updateExpense}><input type="hidden" name="id" value={item.id} /><ExpenseFields d={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(expenses.data?.length ?? 0) === 0 ? <p className="empty-state">No expenses yet. Start with rent or mortgage, groceries and utilities.</p> : null}
        </ProfileSection>

        <ProfileSection id="debts" title="Debts" count={debts.data?.length ?? 0} description={money((debts.data ?? []).reduce((sum, item) => sum + Number(item.current_balance ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add debt</summary><form className="data-form friendly-form" action={addDebt}>
            <DebtFields /><button type="submit">Add debt</button>
          </form></details>
          <div className="record-list">{debts.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.current_balance)} · {item.interest_rate ?? 0}%</small></span><RecordActions kind="debt" id={item.id}><form className="data-form edit-form friendly-form" action={updateDebt}><input type="hidden" name="id" value={item.id} /><DebtFields d={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(debts.data?.length ?? 0) === 0 ? <p className="empty-state">No debts saved. If you don&apos;t owe anything, you can leave this empty.</p> : null}
        </ProfileSection>

        <ProfileSection id="insurance" title="Insurance" count={insurance.data?.length ?? 0} description={(insurance.data ?? []).filter((item) => item.is_relevant_to_reserve && item.deductible_amount !== null).length ? money((insurance.data ?? []).filter((item) => item.is_relevant_to_reserve).reduce((sum, item) => sum + Number(item.deductible_amount ?? 0), 0)) + " in deductibles" : "Deductibles help size your cushion"}>
          <details className="profile-add-disclosure"><summary>Add insurance</summary><form className="data-form friendly-form" action={addInsurance}>
            <InsuranceFields /><button type="submit">Add insurance</button>
          </form></details>
          <div className="record-list">{insurance.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{item.deductible_amount !== null ? `${money(item.deductible_amount)} deductible` : "Deductible not set"}</small></span><RecordActions kind="insurance" id={item.id}><form className="data-form edit-form friendly-form" action={updateInsurance}><input type="hidden" name="id" value={item.id} /><InsuranceFields d={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(insurance.data?.length ?? 0) === 0 ? <p className="empty-state">No insurance yet. Add plans with a deductible so the plan can size your emergency cushion.</p> : null}
        </ProfileSection>

        <ProfileSection id="retirement" title="Retirement" count={retirement.data?.length ?? 0} description={money((retirement.data ?? []).reduce((sum, item) => sum + Number(item.balance ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add retirement account</summary><form className="data-form friendly-form" action={addRetirementAccount}>
            <RetirementFields /><button type="submit">Add retirement account</button>
          </form></details>
          <div className="record-list">{retirement.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.balance)}</small></span><RecordActions kind="retirement" id={item.id}><form className="data-form edit-form friendly-form" action={updateRetirementAccount}><input type="hidden" name="id" value={item.id} /><RetirementFields d={item} isHsa={item.account_type === "hsa"} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(retirement.data?.length ?? 0) === 0 ? <p className="empty-state">No retirement accounts yet. Add a 401(k), IRA or pension.</p> : null}
          <details className="profile-retirement-goals"><summary>Retirement goals (optional)</summary><form className="data-form friendly-form" action={saveRetirementGoals}>
            <NumberField name="desired_retirement_monthly_spending" label="Monthly spending you want in retirement" period="month" defaultValue={goalsPrefs?.desired_retirement_monthly_spending ?? null} />
            <Choice name="retirement_spending_basis" legend="That amount is in" variant="pills" defaultValue={goalsPrefs?.retirement_spending_basis ?? "unknown"} options={[
              { value: "today_dollars", label: "Today's dollars" }, { value: "future_dollars", label: "Future dollars" }, { value: "unknown", label: "Not sure" },
            ]} />
            <NumberField name="planning_social_security_monthly" label="Expected Social Security each month" example="From your ssa.gov estimate" defaultValue={goalsPrefs?.planning_social_security_monthly ?? null} />
            <NumberField name="planning_pension_monthly" label="Expected pension each month" placeholder="Leave blank if none" defaultValue={goalsPrefs?.planning_pension_monthly ?? null} />
            <button type="submit">Save retirement goals</button>
          </form></details>
        </ProfileSection>

        <ProfileSection id="goals" title="Goals" count={goals.data?.length ?? 0} description={money((goals.data ?? []).reduce((sum, item) => sum + Number(item.current_amount ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add goal</summary><form className="data-form friendly-form" action={addGoal}>
            <GoalFields /><button type="submit">Add goal</button>
          </form></details>
          <div className="record-list">{goals.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.current_amount)} / {money(item.target_amount)}</small></span><RecordActions kind="goal" id={item.id}><form className="data-form edit-form friendly-form" action={updateGoal}><input type="hidden" name="id" value={item.id} /><GoalFields d={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(goals.data?.length ?? 0) === 0 ? <p className="empty-state">No goals yet. Add something you&apos;re saving for, like a vacation or a car.</p> : null}
        </ProfileSection>
      </ProfileWorkspace>
    </main>
  );
}
