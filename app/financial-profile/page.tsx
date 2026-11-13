import ProfileSection from "@/components/ProfileSection";
import ProfileWorkspace from "@/components/ProfileWorkspace";
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

type GoalFormDefaults = Record<string, string | number | null | undefined>;

function GoalIntelligenceFields({ defaults = {} }: { defaults?: GoalFormDefaults }) {
  return (<>
    <label>Goal category<select name="goal_class" defaultValue={String(defaults.goal_class ?? "major_life_goal")}><option value="necessary_protective">Protective need</option><option value="major_life_goal">Major life goal</option><option value="education">Education</option><option value="home_purchase">Home purchase</option><option value="lifestyle_optional">Lifestyle</option><option value="other">Other</option><option value="unknown">Not sure</option></select></label>
    <label>How important is the underlying need?<select name="necessity" defaultValue={String(defaults.necessity ?? "unknown")}><option value="required">Essential</option><option value="important">Important</option><option value="optional">Optional</option><option value="unknown">Not sure</option></select></label>
    <label>Underlying need<textarea name="underlying_need" maxLength={500} defaultValue={String(defaults.underlying_need ?? "")} placeholder="Reliable transportation to work" /></label>
    <label>Desired solution<textarea name="desired_solution" maxLength={500} defaultValue={String(defaults.desired_solution ?? "")} placeholder="Replace the current vehicle" /></label>
    <label>Does this preserve or improve a household function?<select name="goal_nature" defaultValue={String(defaults.goal_nature ?? "unknown")}><option value="preservation">Preserve or restore</option><option value="improvement">Improve or upgrade</option><option value="mixed">Both</option><option value="unknown">Not sure</option></select></label>
    <label>Core amount needed<input name="core_need_amount" type="number" min="0" step="0.01" defaultValue={defaults.core_need_amount ?? ""} placeholder="Leave blank if unknown" /></label>
    <label>How flexible is the target date?<select name="deadline_flexibility" defaultValue={String(defaults.deadline_flexibility ?? "unknown")}><option value="fixed">Fixed</option><option value="somewhat_flexible">Some flexibility</option><option value="flexible">Flexible</option><option value="unknown">Not sure</option></select></label>
    <label>If the goal is underfunded<select name="underfunding_consequence" defaultValue={String(defaults.underfunding_consequence ?? "unknown")}><option value="safely_delay">Safely delay it</option><option value="reduce_solution">Reduce the target or solution</option><option value="inconvenience">Inconvenience or lifestyle loss</option><option value="likely_financing">Likely need financing</option><option value="higher_future_cost">Higher future cost</option><option value="employment_disruption">Employment disruption</option><option value="housing_disruption">Housing disruption</option><option value="health_safety">Health or safety impact</option><option value="caregiving_disruption">Caregiving or family disruption</option><option value="contractual_payment">Required or contractual payment</option><option value="other_material">Other material consequence</option><option value="unknown">Not sure</option></select></label>
    <label>Consequence severity<select name="consequence_level" defaultValue={String(defaults.consequence_level ?? "unknown")}><option value="critical">Critical</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="unknown">Not sure</option></select></label>
    <label>Would you likely need to borrow?<select name="borrowing_likelihood" defaultValue={String(defaults.borrowing_likelihood ?? "unknown")}><option value="unlikely">Unlikely</option><option value="possible">Possible</option><option value="likely">Likely</option><option value="unknown">Not sure</option></select></label>
    <label>Expected borrowing amount<input name="expected_borrowing_amount" type="number" min="0" step="0.01" defaultValue={defaults.expected_borrowing_amount ?? ""} /></label>
    <label>Expected borrowing APR (%)<input name="expected_borrowing_apr" type="number" min="0" max="100" step="0.0001" defaultValue={defaults.expected_borrowing_apr ?? ""} /></label>
    <label>Planned monthly contribution<input name="planned_monthly_contribution" type="number" min="0" step="0.01" defaultValue={defaults.planned_monthly_contribution ?? ""} /></label>
  </>);
}

// FFH-P03: optional facts the money plan asks for. Blank means "unknown"; nothing is guessed.
type FieldDefaults = Record<string, unknown>;
const fieldValue = (value: unknown): string | number => (typeof value === "number" || typeof value === "string" ? value : "");
function CashPurposeField({ current }: { current?: string | null }) {
  const linked = current === "earmarked_goal" || current === "debt_backed_reserve";
  return <label>What is this cash for?<select name="cash_purpose" defaultValue={linked ? "keep" : String(current ?? "unallocated")}>
    {linked ? <option value="keep">{current === "earmarked_goal" ? "Set aside for a goal (keep)" : "Set aside for a debt (keep)"}</option> : null}
    <option value="unallocated">Not decided</option>
    <option value="protected_reserve">Emergency fund</option>
    <option value="operating_cash">Everyday spending</option>
    <option value="not_applicable">Not cash I can use</option>
  </select></label>;
}

function RetirementDetailFields({ defaults = {}, isHsa = false }: { defaults?: FieldDefaults; isHsa?: boolean }) {
  return <details className="profile-more-fields">
    <summary>More details (optional)</summary>
    <label>Employer match<select name="match_status" defaultValue={String(fieldValue(defaults.match_status) || "unknown")}><option value="unknown">Not sure</option><option value="not_offered">No match offered</option><option value="not_fully_captured">Offered, not getting all of it</option><option value="fully_captured">Getting the full match</option></select></label>
    <label>Your monthly contribution needed for the full match<input name="full_match_employee_contribution_monthly" type="number" min="0" step="0.01" defaultValue={fieldValue(defaults.full_match_employee_contribution_monthly)} placeholder="Leave blank if unknown" /></label>
    <label>Type of employer contribution<select name="employer_contribution_type" defaultValue={String(fieldValue(defaults.employer_contribution_type) || "")}><option value="">Not sure</option><option value="match">Match</option><option value="nonelective">Fixed contribution (not a match)</option><option value="profit_sharing">Profit sharing</option><option value="other">Other</option></select></label>
    {isHsa ? <p className="muted">Year-to-date HSA amounts are set on the HSA details page.</p> : <>
      <label>Your contributions so far this year<input name="employee_contributed_ytd" type="number" min="0" step="0.01" defaultValue={fieldValue(defaults.employee_contributed_ytd)} placeholder="Leave blank if unknown" /></label>
      <label>Employer contributions so far this year<input name="employer_contributed_ytd" type="number" min="0" step="0.01" defaultValue={fieldValue(defaults.employer_contributed_ytd)} placeholder="Leave blank if unknown" /></label>
    </>}
    <label>Yearly pay from this employer that counts for the plan<input name="plan_eligible_compensation_annual" type="number" min="0" step="0.01" defaultValue={fieldValue(defaults.plan_eligible_compensation_annual)} placeholder="Leave blank if unknown" /></label>
  </details>;
}

function InsuranceFields({ defaults = {} }: { defaults?: FieldDefaults }) {
  return <>
    <label>Name<input name="name" maxLength={100} required defaultValue={String(fieldValue(defaults.name) || "")} placeholder="Family health plan" /></label>
    <label>Type<select name="insurance_type" defaultValue={String(fieldValue(defaults.insurance_type) || "health")}><option value="health">Health</option><option value="auto">Auto</option><option value="homeowners">Homeowners</option><option value="renters">Renters</option><option value="umbrella">Umbrella</option><option value="pet">Pet</option><option value="other">Other</option></select></label>
    <label>Deductible<input name="deductible_amount" type="number" min="0" step="0.01" defaultValue={fieldValue(defaults.deductible_amount)} placeholder="Leave blank if unknown" /></label>
    <label>Family deductible<input name="family_deductible_amount" type="number" min="0" step="0.01" defaultValue={fieldValue(defaults.family_deductible_amount)} placeholder="Leave blank if none" /></label>
    <label>Out-of-pocket maximum<input name="out_of_pocket_max" type="number" min="0" step="0.01" defaultValue={fieldValue(defaults.out_of_pocket_max)} placeholder="Leave blank if unknown" /></label>
    <label className="checkbox-label"><input name="is_relevant_to_reserve" type="checkbox" defaultChecked={defaults.is_relevant_to_reserve !== false} /> Keep cash for this deductible</label>
  </>;
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
    supabase.from("household_financial_preferences").select("desired_retirement_monthly_spending, planning_social_security_monthly, planning_pension_monthly").eq("household_id", household.id).maybeSingle(),
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
      {message ? <p className="success-banner">{message}</p> : null}



      <ProfileWorkspace>
        <ProfileSection id="accounts" title="Cash & accounts" count={accounts.data?.length ?? 0} description={money((accounts.data ?? []).reduce((sum, item) => sum + Number(item.balance ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add account</summary><form className="data-form" action={addAccount}>
            <label>Name<input name="name" maxLength={100} required placeholder="Checking" /></label>
            <label>Type<select name="account_type" defaultValue="checking"><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="brokerage">Brokerage</option><option value="other_asset">Other asset</option></select></label>
            <label>Balance<input name="balance" type="number" min="0" step="0.01" required /></label><CashPurposeField /><button type="submit">Add account</button>
          </form></details>
          <div className="record-list">{accounts.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.balance)}</small></span><RecordActions kind="account" id={item.id}><form className="data-form edit-form" action={updateAccount}><input type="hidden" name="id" value={item.id} /><label>Name<input name="name" defaultValue={item.name} maxLength={100} required /></label><label>Type<select name="account_type" defaultValue={item.account_type}><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="brokerage">Brokerage</option><option value="other_asset">Other asset</option></select></label><label>Balance<input name="balance" type="number" min="0" step="0.01" defaultValue={item.balance} required /></label><CashPurposeField current={item.cash_purpose} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(accounts.data?.length ?? 0) === 0 ? <p className="empty-state">No accounts saved yet. Select Add to begin.</p> : null}
        </ProfileSection>

        <ProfileSection id="income" title="Income" count={income.data?.length ?? 0} description={money((income.data ?? []).reduce((sum, item) => sum + Number(item.monthly_amount ?? 0), 0)) + "/month"}>
          <details className="profile-add-disclosure"><summary>Add income</summary><form className="data-form" action={addIncome}>
            <label>Name<input name="name" maxLength={100} required placeholder="Primary job" /></label><label>Monthly take-home<input name="monthly_amount" type="number" min="0" step="0.01" required /></label><label>Monthly gross pay (before taxes)<input name="monthly_gross_amount" type="number" min="0" step="0.01" placeholder="Optional" /></label><button type="submit">Add income</button>
          </form></details>
          <div className="record-list">{income.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.monthly_amount)}/mo</small></span><RecordActions kind="income" id={item.id}><form className="data-form edit-form" action={updateIncome}><input type="hidden" name="id" value={item.id} /><label>Name<input name="name" defaultValue={item.name} maxLength={100} required /></label><label>Monthly take-home<input name="monthly_amount" type="number" min="0" step="0.01" defaultValue={item.monthly_amount} required /></label><label>Monthly gross pay (before taxes)<input name="monthly_gross_amount" type="number" min="0" step="0.01" defaultValue={item.monthly_gross_amount ?? ""} placeholder="Optional" /></label><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(income.data?.length ?? 0) === 0 ? <p className="empty-state">No income sources saved yet. Select Add to begin.</p> : null}
        </ProfileSection>

        <ProfileSection id="expenses" title="Monthly expenses" count={expenses.data?.length ?? 0} description={money((expenses.data ?? []).reduce((sum, item) => sum + Number(item.monthly_amount ?? 0), 0)) + "/month"}>
          <details className="profile-add-disclosure"><summary>Add expense</summary><form className="data-form" action={addExpense}>
            <label>Name<input name="name" maxLength={100} required placeholder="Groceries" /></label>
            <label>Category<select name="category" defaultValue="groceries"><option value="housing">Housing</option><option value="utilities">Utilities</option><option value="groceries">Groceries</option><option value="transportation">Transportation</option><option value="insurance">Insurance</option><option value="healthcare">Healthcare</option><option value="childcare">Childcare</option><option value="subscriptions">Subscriptions</option><option value="personal">Personal</option><option value="giving">Giving</option><option value="other">Other</option></select></label>
            <label>Monthly amount<input name="monthly_amount" type="number" min="0" step="0.01" required /></label>
            <label className="checkbox-label"><input name="is_essential" type="checkbox" defaultChecked /> Essential expense</label><button type="submit">Add expense</button>
          </form></details>
          <div className="record-list">{expenses.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.monthly_amount)}/mo · {item.category}</small></span><RecordActions kind="expense" id={item.id}><form className="data-form edit-form" action={updateExpense}><input type="hidden" name="id" value={item.id} /><label>Name<input name="name" defaultValue={item.name} maxLength={100} required /></label><label>Category<select name="category" defaultValue={item.category}><option value="housing">Housing</option><option value="utilities">Utilities</option><option value="groceries">Groceries</option><option value="transportation">Transportation</option><option value="insurance">Insurance</option><option value="healthcare">Healthcare</option><option value="childcare">Childcare</option><option value="subscriptions">Subscriptions</option><option value="personal">Personal</option><option value="giving">Giving</option><option value="other">Other</option></select></label><label>Monthly amount<input name="monthly_amount" type="number" min="0" step="0.01" defaultValue={item.monthly_amount} required /></label><label className="checkbox-label"><input name="is_essential" type="checkbox" defaultChecked={item.is_essential} /> Essential expense</label><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(expenses.data?.length ?? 0) === 0 ? <p className="empty-state">No expenses saved yet. Select Add to begin.</p> : null}
        </ProfileSection>

        <ProfileSection id="debts" title="Debts" count={debts.data?.length ?? 0} description={money((debts.data ?? []).reduce((sum, item) => sum + Number(item.current_balance ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add debt</summary><form className="data-form" action={addDebt}>
            <label>Name<input name="name" maxLength={100} required placeholder="Mortgage" /></label>
            <label>Type<select name="debt_type" defaultValue="mortgage"><option value="mortgage">Mortgage</option><option value="student_loan">Student loan</option><option value="auto_loan">Auto loan</option><option value="credit_card">Credit card</option><option value="personal_loan">Personal loan</option><option value="medical">Medical</option><option value="other">Other</option></select></label>
            <label>Balance<input name="current_balance" type="number" min="0" step="0.01" required /></label><label>Interest rate (%)<input name="interest_rate" type="number" min="0" max="100" step="0.0001" /></label><label>Minimum payment<input name="minimum_payment" type="number" min="0" step="0.01" required /></label><button type="submit">Add debt</button>
          </form></details>
          <div className="record-list">{debts.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.current_balance)} · {item.interest_rate ?? 0}%</small></span><RecordActions kind="debt" id={item.id}><form className="data-form edit-form" action={updateDebt}><input type="hidden" name="id" value={item.id} /><label>Name<input name="name" defaultValue={item.name} maxLength={100} required /></label><label>Type<select name="debt_type" defaultValue={item.debt_type}><option value="mortgage">Mortgage</option><option value="student_loan">Student loan</option><option value="auto_loan">Auto loan</option><option value="credit_card">Credit card</option><option value="personal_loan">Personal loan</option><option value="medical">Medical</option><option value="other">Other</option></select></label><label>Balance<input name="current_balance" type="number" min="0" step="0.01" defaultValue={item.current_balance} required /></label><label>Interest rate (%)<input name="interest_rate" type="number" min="0" max="100" step="0.0001" defaultValue={item.interest_rate ?? ""} /></label><label>Minimum payment<input name="minimum_payment" type="number" min="0" step="0.01" defaultValue={item.minimum_payment} required /></label><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(debts.data?.length ?? 0) === 0 ? <p className="empty-state">No debts saved yet. Select Add to begin.</p> : null}
        </ProfileSection>

        <ProfileSection id="insurance" title="Insurance" count={insurance.data?.length ?? 0} description={(insurance.data ?? []).filter((item) => item.is_relevant_to_reserve && item.deductible_amount !== null).length ? money((insurance.data ?? []).filter((item) => item.is_relevant_to_reserve).reduce((sum, item) => sum + Number(item.deductible_amount ?? 0), 0)) + " in deductibles" : "Deductibles help size your cushion"}>
          <details className="profile-add-disclosure"><summary>Add insurance</summary><form className="data-form" action={addInsurance}>
            <InsuranceFields /><button type="submit">Add insurance</button>
          </form></details>
          <div className="record-list">{insurance.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{item.deductible_amount !== null ? `${money(item.deductible_amount)} deductible` : "Deductible not set"}</small></span><RecordActions kind="insurance" id={item.id}><form className="data-form edit-form" action={updateInsurance}><input type="hidden" name="id" value={item.id} /><InsuranceFields defaults={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(insurance.data?.length ?? 0) === 0 ? <p className="empty-state">No insurance saved yet. Add plans with a deductible so the plan can size your emergency cushion.</p> : null}
        </ProfileSection>

        <ProfileSection id="retirement" title="Retirement" count={retirement.data?.length ?? 0} description={money((retirement.data ?? []).reduce((sum, item) => sum + Number(item.balance ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add retirement account</summary><form className="data-form" action={addRetirementAccount}>
            <label>Name<input name="name" maxLength={100} required placeholder="Work 401(k)" /></label><label>Type<select name="account_type" defaultValue="401k"><option value="401k">401(k)</option><option value="403b">403(b)</option><option value="457">457</option><option value="traditional_ira">Traditional IRA</option><option value="roth_ira">Roth IRA</option><option value="hsa">HSA</option><option value="pension">Pension</option><option value="other">Other</option></select></label><label>Balance<input name="balance" type="number" min="0" step="0.01" required /></label><label>Your monthly contribution<input name="monthly_employee_contribution" type="number" min="0" step="0.01" required /></label><label>Employer monthly contribution<input name="monthly_employer_contribution" type="number" min="0" step="0.01" required /></label><RetirementDetailFields /><button type="submit">Add retirement account</button>
          </form></details>
          <div className="record-list">{retirement.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.balance)}</small></span><RecordActions kind="retirement" id={item.id}><form className="data-form edit-form" action={updateRetirementAccount}><input type="hidden" name="id" value={item.id} /><label>Name<input name="name" defaultValue={item.name} maxLength={100} required /></label><label>Type<select name="account_type" defaultValue={item.account_type}><option value="401k">401(k)</option><option value="403b">403(b)</option><option value="457">457</option><option value="traditional_ira">Traditional IRA</option><option value="roth_ira">Roth IRA</option><option value="hsa">HSA</option><option value="pension">Pension</option><option value="other">Other</option></select></label><label>Balance<input name="balance" type="number" min="0" step="0.01" defaultValue={item.balance} required /></label><label>Your monthly contribution<input name="monthly_employee_contribution" type="number" min="0" step="0.01" defaultValue={item.monthly_employee_contribution} required /></label><label>Employer monthly contribution<input name="monthly_employer_contribution" type="number" min="0" step="0.01" defaultValue={item.monthly_employer_contribution} required /></label><RetirementDetailFields defaults={item} isHsa={item.account_type === "hsa"} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(retirement.data?.length ?? 0) === 0 ? <p className="empty-state">No retirement accounts saved yet. Select Add to begin.</p> : null}
          <details className="profile-retirement-goals"><summary>Retirement goals (optional)</summary><form className="data-form" action={saveRetirementGoals}>
            <label>Monthly spending you want in retirement (today&apos;s dollars)<input name="desired_retirement_monthly_spending" type="number" min="0" step="0.01" defaultValue={goalsPrefs?.desired_retirement_monthly_spending ?? ""} placeholder="Leave blank if unknown" /></label>
            <label>Expected Social Security per month<input name="planning_social_security_monthly" type="number" min="0" step="0.01" defaultValue={goalsPrefs?.planning_social_security_monthly ?? ""} placeholder="Leave blank if unknown" /></label>
            <label>Expected pension per month<input name="planning_pension_monthly" type="number" min="0" step="0.01" defaultValue={goalsPrefs?.planning_pension_monthly ?? ""} placeholder="Leave blank if none" /></label>
            <button type="submit">Save retirement goals</button>
          </form></details>
        </ProfileSection>

        <ProfileSection id="goals" title="Goals" count={goals.data?.length ?? 0} description={money((goals.data ?? []).reduce((sum, item) => sum + Number(item.current_amount ?? 0), 0))}>
          <details className="profile-add-disclosure"><summary>Add goal</summary><form className="data-form" action={addGoal}>
            <label>Name<input name="name" maxLength={100} required placeholder="Replace vehicle" /></label><label>Target amount<input name="target_amount" type="number" min="0.01" step="0.01" required /></label><label>Current amount<input name="current_amount" type="number" min="0" step="0.01" required /></label><label>Target date<input name="target_date" type="date" /></label><label>Priority<select name="priority" defaultValue="3"><option value="1">1 - Highest</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 - Lowest</option></select></label><GoalIntelligenceFields /><button type="submit">Add goal</button>
          </form></details>
          <div className="record-list">{goals.data?.map((item) => <div className="record-row" key={item.id}><span><strong>{item.name}</strong><small>{money(item.current_amount)} / {money(item.target_amount)}</small></span><RecordActions kind="goal" id={item.id}><form className="data-form edit-form" action={updateGoal}><input type="hidden" name="id" value={item.id} /><label>Name<input name="name" defaultValue={item.name} maxLength={100} required /></label><label>Target amount<input name="target_amount" type="number" min="0.01" step="0.01" defaultValue={item.target_amount} required /></label><label>Current amount<input name="current_amount" type="number" min="0" step="0.01" defaultValue={item.current_amount} required /></label><label>Target date<input name="target_date" type="date" defaultValue={item.target_date ?? ""} /></label><label>Priority<select name="priority" defaultValue={String(item.priority)}><option value="1">1 - Highest</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 - Lowest</option></select></label><GoalIntelligenceFields defaults={item} /><button type="submit">Save changes</button></form></RecordActions></div>)}</div>
          {(goals.data?.length ?? 0) === 0 ? <p className="empty-state">No goals saved yet. Select Add to begin.</p> : null}
        </ProfileSection>
      </ProfileWorkspace>
    </main>
  );
}
