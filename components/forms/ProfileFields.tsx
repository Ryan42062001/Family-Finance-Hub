import NumberField from "@/components/forms/NumberField";
import { Choice, TextField, Toggle, type ChoiceOption } from "@/components/forms/Controls";

// Field groups for each Financial profile record. Field names and values are exactly those the server actions in
// app/financial-profile/actions.ts validate; only the presentation is friendlier. Blank optional amounts mean
// "unknown" and nothing is guessed.
export type Defaults = Record<string, unknown>;
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);
const num = (value: unknown): string | number | null => (typeof value === "number" || typeof value === "string" ? value : null);

const ACCOUNT_TYPES: ChoiceOption[] = [
  { value: "checking", label: "Checking", icon: "🏦" }, { value: "savings", label: "Savings", icon: "💰" },
  { value: "cash", label: "Cash", icon: "💵" }, { value: "brokerage", label: "Investments", icon: "📈" },
  { value: "other_asset", label: "Other", icon: "📦" },
];
const EXPENSE_CATEGORIES: ChoiceOption[] = [
  { value: "housing", label: "Housing", icon: "🏠" }, { value: "utilities", label: "Utilities", icon: "💡" },
  { value: "groceries", label: "Groceries", icon: "🛒" }, { value: "transportation", label: "Transportation", icon: "🚗" },
  { value: "insurance", label: "Insurance", icon: "🛡️" }, { value: "healthcare", label: "Healthcare", icon: "🩺" },
  { value: "childcare", label: "Childcare", icon: "🧸" }, { value: "subscriptions", label: "Subscriptions", icon: "📺" },
  { value: "personal", label: "Personal", icon: "🛍️" }, { value: "giving", label: "Giving", icon: "🎁" },
  { value: "other", label: "Other", icon: "➕" },
];
const DEBT_TYPES: ChoiceOption[] = [
  { value: "mortgage", label: "Mortgage", icon: "🏠" }, { value: "student_loan", label: "Student loan", icon: "🎓" },
  { value: "auto_loan", label: "Car loan", icon: "🚗" }, { value: "credit_card", label: "Credit card", icon: "💳" },
  { value: "personal_loan", label: "Personal loan", icon: "🤝" }, { value: "medical", label: "Medical", icon: "🩺" },
  { value: "other", label: "Other", icon: "➕" },
];
const RETIREMENT_TYPES: ChoiceOption[] = [
  { value: "401k", label: "401(k)", icon: "🏢" }, { value: "403b", label: "403(b)", icon: "🏫" },
  { value: "457", label: "457", icon: "🏛️" }, { value: "traditional_ira", label: "Traditional IRA", icon: "🧾" },
  { value: "roth_ira", label: "Roth IRA", icon: "🌱" }, { value: "hsa", label: "HSA", icon: "🩺" },
  { value: "pension", label: "Pension", icon: "🎖️" }, { value: "other", label: "Other", icon: "➕" },
];
const INSURANCE_TYPES: ChoiceOption[] = [
  { value: "health", label: "Health", icon: "🩺" }, { value: "auto", label: "Auto", icon: "🚗" },
  { value: "homeowners", label: "Homeowners", icon: "🏠" }, { value: "renters", label: "Renters", icon: "🔑" },
  { value: "umbrella", label: "Umbrella", icon: "☂️" }, { value: "pet", label: "Pet", icon: "🐾" },
  { value: "other", label: "Other", icon: "➕" },
];

export function AccountFields({ d = {} }: { d?: Defaults }) {
  const purpose = text(d.cash_purpose);
  const linked = purpose === "earmarked_goal" || purpose === "debt_backed_reserve";
  const purposes: ChoiceOption[] = [
    ...(linked ? [{ value: "keep", label: purpose === "earmarked_goal" ? "Set aside for a goal (keep)" : "Set aside for a debt (keep)" }] : []),
    { value: "unallocated", label: "Not decided" }, { value: "protected_reserve", label: "Emergency fund" },
    { value: "operating_cash", label: "Everyday spending" }, { value: "not_applicable", label: "Can't use it" },
  ];
  return <>
    <TextField name="name" label="What do you call it?" example="Joint checking" defaultValue={text(d.name)} required />
    <NumberField name="balance" label="How much is in it?" defaultValue={num(d.balance)} required />
    <Choice name="account_type" legend="What kind of account?" options={ACCOUNT_TYPES} defaultValue={text(d.account_type) ?? "checking"} />
    <Choice name="cash_purpose" legend="What is this money for?" variant="pills" options={purposes} defaultValue={linked ? "keep" : (purpose ?? "unallocated")} />
  </>;
}

export function IncomeFields({ d = {} }: { d?: Defaults }) {
  return <>
    <TextField name="name" label="Where does it come from?" example="Main job" defaultValue={text(d.name)} required />
    <NumberField name="monthly_amount" label="Take-home pay each month" example="What actually lands in your account" period="month" defaultValue={num(d.monthly_amount)} required />
    <NumberField name="monthly_gross_amount" label="Before taxes (optional)" example="From your pay stub" period="month" defaultValue={num(d.monthly_gross_amount)} />
  </>;
}

export function ExpenseFields({ d = {} }: { d?: Defaults }) {
  return <>
    <TextField name="name" label="What is it?" example="Groceries" defaultValue={text(d.name)} required />
    <NumberField name="monthly_amount" label="How much each month?" period="month" defaultValue={num(d.monthly_amount)} required />
    <Choice name="category" legend="Pick a category" options={EXPENSE_CATEGORIES} defaultValue={text(d.category) ?? "groceries"} />
    <Toggle name="is_essential" label="Essential" hint="You'd still pay this in a tight month" defaultChecked={d.is_essential === undefined ? true : d.is_essential === true} />
  </>;
}

export function DebtFields({ d = {} }: { d?: Defaults }) {
  return <>
    <TextField name="name" label="What do you call it?" example="Visa card" defaultValue={text(d.name)} required />
    <Choice name="debt_type" legend="What kind of debt?" options={DEBT_TYPES} defaultValue={text(d.debt_type) ?? "credit_card"} />
    <NumberField name="current_balance" label="How much do you owe?" defaultValue={num(d.current_balance)} required />
    <NumberField name="minimum_payment" label="Minimum payment each month" period="month" defaultValue={num(d.minimum_payment)} required />
    <NumberField name="interest_rate" label="Interest rate (APR)" unit="percent" max="100" step="0.0001" example="On your statement" defaultValue={num(d.interest_rate)} />
  </>;
}

export function RetirementFields({ d = {}, isHsa = false }: { d?: Defaults; isHsa?: boolean }) {
  return <>
    <TextField name="name" label="What do you call it?" example="Work 401(k)" defaultValue={text(d.name)} required />
    <Choice name="account_type" legend="What kind of account?" options={RETIREMENT_TYPES} defaultValue={text(d.account_type) ?? "401k"} />
    <NumberField name="balance" label="How much is in it?" defaultValue={num(d.balance)} required />
    <NumberField name="monthly_employee_contribution" label="You put in each month" period="month" defaultValue={num(d.monthly_employee_contribution)} required />
    <NumberField name="monthly_employer_contribution" label="Your employer puts in each month" period="month" defaultValue={num(d.monthly_employer_contribution)} required />
    <details className="profile-more-fields">
      <summary>More details (optional)</summary>
      <Choice name="match_status" legend="Employer match" variant="pills" defaultValue={text(d.match_status) ?? "unknown"} options={[
        { value: "unknown", label: "Not sure" }, { value: "not_offered", label: "No match" },
        { value: "not_fully_captured", label: "Not getting all of it" }, { value: "fully_captured", label: "Getting the full match" },
      ]} />
      <NumberField name="full_match_employee_contribution_monthly" label="You need to put in this much each month for the full match" period="month" defaultValue={num(d.full_match_employee_contribution_monthly)} />
      <Choice name="employer_contribution_type" legend="How your employer contributes" variant="pills" required={false} defaultValue={text(d.employer_contribution_type) ?? ""} options={[
        { value: "", label: "Not sure" }, { value: "match", label: "Matches me" }, { value: "nonelective", label: "Fixed amount" },
        { value: "profit_sharing", label: "Profit sharing" }, { value: "other", label: "Other" },
      ]} />
      {isHsa ? <p className="muted">Year-to-date HSA amounts are set on the HSA details page.</p> : <>
        <NumberField name="employee_contributed_ytd" label="You've put in so far this year" defaultValue={num(d.employee_contributed_ytd)} />
        <NumberField name="employer_contributed_ytd" label="Your employer has put in so far this year" defaultValue={num(d.employer_contributed_ytd)} />
      </>}
      <NumberField name="plan_eligible_compensation_annual" label="Yearly pay from this employer that counts for the plan" period="year" defaultValue={num(d.plan_eligible_compensation_annual)} />
    </details>
  </>;
}

export function InsuranceFields({ d = {} }: { d?: Defaults }) {
  return <>
    <TextField name="name" label="What do you call it?" example="Family health plan" defaultValue={text(d.name)} required />
    <Choice name="insurance_type" legend="What kind of insurance?" options={INSURANCE_TYPES} defaultValue={text(d.insurance_type) ?? "health"} />
    <NumberField name="deductible_amount" label="Deductible" example="What you pay before insurance kicks in" defaultValue={num(d.deductible_amount)} />
    <NumberField name="family_deductible_amount" label="Family deductible" placeholder="Leave blank if none" defaultValue={num(d.family_deductible_amount)} />
    <NumberField name="out_of_pocket_max" label="Out-of-pocket maximum" defaultValue={num(d.out_of_pocket_max)} />
    <Toggle name="is_relevant_to_reserve" label="Keep cash ready for this deductible" hint="Counts toward your emergency cushion" defaultChecked={d.is_relevant_to_reserve !== false} />
  </>;
}

export function GoalFields({ d = {} }: { d?: Defaults }) {
  return <>
    <TextField name="name" label="What are you saving for?" example="Replace the car" defaultValue={text(d.name)} required />
    <NumberField name="target_amount" label="How much do you need?" min="0.01" defaultValue={num(d.target_amount)} required />
    <NumberField name="current_amount" label="How much do you have so far?" defaultValue={num(d.current_amount)} required />
    <label className="field"><span className="field-label">When do you want it by? (optional)</span><input name="target_date" type="date" defaultValue={text(d.target_date) ?? ""} /></label>
    <Choice name="priority" legend="How important is it?" variant="pills" defaultValue={String(num(d.priority) ?? "3")} options={[
      { value: "1", label: "1 · Top" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5 · Low" },
    ]} />
    <NumberField name="planned_monthly_contribution" label="Planning to save each month (optional)" period="month" defaultValue={num(d.planned_monthly_contribution)} />
    <details className="profile-more-fields">
      <summary>Help the plan understand this goal (optional)</summary>
      <Choice name="goal_class" legend="What kind of goal?" defaultValue={text(d.goal_class) ?? "major_life_goal"} options={[
        { value: "necessary_protective", label: "Protects us", icon: "🛡️" }, { value: "major_life_goal", label: "Big life goal", icon: "⭐" },
        { value: "education", label: "Education", icon: "🎓" }, { value: "home_purchase", label: "Buying a home", icon: "🏡" },
        { value: "lifestyle_optional", label: "Lifestyle", icon: "🌴" }, { value: "other", label: "Other", icon: "➕" }, { value: "unknown", label: "Not sure", icon: "❔" },
      ]} />
      <Choice name="necessity" legend="How much do you need it?" variant="pills" defaultValue={text(d.necessity) ?? "unknown"} options={[
        { value: "required", label: "Essential" }, { value: "important", label: "Important" }, { value: "optional", label: "Nice to have" }, { value: "unknown", label: "Not sure" },
      ]} />
      <TextField name="underlying_need" label="The need behind it" example="Reliable transportation to work" defaultValue={text(d.underlying_need)} maxLength={500} multiline />
      <TextField name="desired_solution" label="What you'd like to do about it" example="Replace the current car" defaultValue={text(d.desired_solution)} maxLength={500} multiline />
      <Choice name="goal_nature" legend="Is it keeping something or upgrading?" variant="pills" defaultValue={text(d.goal_nature) ?? "unknown"} options={[
        { value: "preservation", label: "Keeping or fixing" }, { value: "improvement", label: "Upgrading" }, { value: "mixed", label: "Both" }, { value: "unknown", label: "Not sure" },
      ]} />
      <NumberField name="core_need_amount" label="The must-have part costs" defaultValue={num(d.core_need_amount)} />
      <Choice name="deadline_flexibility" legend="How flexible is the date?" variant="pills" defaultValue={text(d.deadline_flexibility) ?? "unknown"} options={[
        { value: "fixed", label: "Fixed" }, { value: "somewhat_flexible", label: "A little" }, { value: "flexible", label: "Very" }, { value: "unknown", label: "Not sure" },
      ]} />
      <Choice name="underfunding_consequence" legend="If you came up short" variant="pills" defaultValue={text(d.underfunding_consequence) ?? "unknown"} options={[
        { value: "safely_delay", label: "We'd just wait" }, { value: "reduce_solution", label: "We'd do less" }, { value: "inconvenience", label: "Inconvenient" },
        { value: "likely_financing", label: "We'd borrow" }, { value: "higher_future_cost", label: "Costs more later" }, { value: "employment_disruption", label: "Affects work" },
        { value: "housing_disruption", label: "Affects housing" }, { value: "health_safety", label: "Health or safety" }, { value: "caregiving_disruption", label: "Affects family care" },
        { value: "contractual_payment", label: "A required payment" }, { value: "other_material", label: "Other serious impact" }, { value: "unknown", label: "Not sure" },
      ]} />
      <Choice name="consequence_level" legend="How bad would that be?" variant="pills" defaultValue={text(d.consequence_level) ?? "unknown"} options={[
        { value: "critical", label: "Critical" }, { value: "high", label: "High" }, { value: "moderate", label: "Moderate" }, { value: "low", label: "Low" }, { value: "unknown", label: "Not sure" },
      ]} />
      <Choice name="borrowing_likelihood" legend="Would you need to borrow?" variant="pills" defaultValue={text(d.borrowing_likelihood) ?? "unknown"} options={[
        { value: "unlikely", label: "Unlikely" }, { value: "possible", label: "Maybe" }, { value: "likely", label: "Likely" }, { value: "unknown", label: "Not sure" },
      ]} />
      <NumberField name="expected_borrowing_amount" label="You might borrow" defaultValue={num(d.expected_borrowing_amount)} />
      <NumberField name="expected_borrowing_apr" label="At an interest rate of" unit="percent" max="100" step="0.0001" defaultValue={num(d.expected_borrowing_apr)} />
    </details>
  </>;
}
