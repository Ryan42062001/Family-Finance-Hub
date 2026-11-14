import Link from "next/link";
import NumberField from "@/components/forms/NumberField";
import { TextField } from "@/components/forms/Controls";
import { addSavingsGoal, deleteSavingsGoal, updateSavingsGoal } from "@/app/goals/actions";
import { checkInNetWorth, currentUtcMonth, formatCents, monthLabel, type CheckInItemType } from "@/lib/calculations/check-in-snapshot";
import { evaluateSavingsGoal, type GoalTrackerResult } from "@/lib/calculations/goal-tracker";
import { goalsContext } from "@/lib/goals/context";
import { goalsNotice } from "@/lib/goals/notices";
import { formatPlanMoney } from "@/lib/plan/money-plan";
import { todayUtc } from "@/lib/plan/plan-result";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ notice?: string | string[] }> };
type Goal = { id: string; name: string; target_amount: number | string; saved_amount: number | string; target_date: string | null };

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function GoalFields({ goal }: { goal?: Goal }) {
  return <>
    <TextField name="name" label="Goal name" example="e.g. New roof" defaultValue={goal?.name} required />
    <NumberField name="target_amount" label="Target amount" defaultValue={goal?.target_amount ?? null} required min="0.01" />
    <NumberField name="saved_amount" label="Saved so far" defaultValue={goal?.saved_amount ?? 0} placeholder="0" />
    <label className="field"><span className="field-label">Target date (optional)</span><input type="date" name="target_date" defaultValue={goal?.target_date ?? ""} /></label>
  </>;
}

// G5–G8: what the monthly amount is, or honestly why there isn't one.
function GoalExplanation({ goal, result }: { goal: Goal; result: GoalTrackerResult }) {
  const remaining = formatPlanMoney(result.remainingAmount);
  switch (result.status) {
    case "reached": return <p className="goal-explain"><strong>Goal reached.</strong> Nothing more to save.</p>;
    case "no_target_date": return <p className="goal-explain">{remaining} still to save. Add a target date to see the monthly amount.</p>;
    case "date_passed": return <p className="goal-explain">The target date ({dateLabel(goal.target_date as string)}) has passed. {remaining} is still needed. Change the date to see a new monthly amount.</p>;
    default: return <p className="goal-explain"><strong>{formatPlanMoney(result.monthlyNeeded as number)} a month</strong> to reach it by {dateLabel(goal.target_date as string)}: {remaining} still to save over {result.monthsLeft} month{result.monthsLeft === 1 ? "" : "s"} (a part month counts as a month; rounded to the cent).</p>;
  }
}

// FFH-P07: a separate savings-goals tracker and the monthly check-in history.
export default async function GoalsPage({ searchParams }: PageProps) {
  const { supabase, householdId, canEdit } = await goalsContext();
  const today = todayUtc();
  const [goals, checkIns] = await Promise.all([
    supabase.from("savings_goals").select("id, name, target_amount, saved_amount, target_date").eq("household_id", householdId).order("created_at"),
    supabase.from("monthly_check_ins").select("id, check_in_month, followed_plan, planned_cash_flow, monthly_check_in_balances(item_type, amount)").eq("household_id", householdId).order("check_in_month", { ascending: false }),
  ]);
  const notice = goalsNotice((await searchParams).notice);
  const loadFailed = Boolean(goals.error || checkIns.error);
  const thisMonth = currentUtcMonth();
  const hasThisMonth = (checkIns.data ?? []).some((row) => String(row.check_in_month).slice(0, 7) === thisMonth);

  return (
    <main className="page-shell goals-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Goals &amp; check-ins</p>
          <h1>Savings goals and monthly check-ins</h1>
          <p className="muted">These goals are a separate tracker and don&apos;t change Your plan.{canEdit ? "" : " You can view them; only owners and members can make changes."}</p>
        </div>
      </section>
      {notice ? <p className={notice.ok ? "form-success" : "form-error"} role="status">{notice.text}</p> : null}
      {loadFailed ? <p className="form-error" role="status">We couldn&apos;t load your goals and check-ins. Please try again.</p> : null}

      <section className="panel" aria-labelledby="savings-goals-heading">
        <h2 id="savings-goals-heading">Savings goals</h2>
        {(goals.data ?? []).length === 0 && !loadFailed ? <p className="muted">No savings goals yet.</p> : null}
        <ul className="goal-list">
          {(goals.data ?? []).map((goal: Goal) => {
            let result: GoalTrackerResult | null = null;
            try {
              result = evaluateSavingsGoal({ targetAmount: Number(goal.target_amount), savedAmount: Number(goal.saved_amount), targetDate: goal.target_date }, today);
            } catch { result = null; }
            return <li key={goal.id} className="goal-card">
              <div className="goal-head">
                <strong>{goal.name}</strong>
                <span>{formatPlanMoney(Number(goal.saved_amount))} of {formatPlanMoney(Number(goal.target_amount))}</span>
              </div>
              {result ? <>
                <div className="goal-progress" role="progressbar" aria-label={`${goal.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.progressPercent}>
                  <span style={{ width: `${result.progressPercent}%` }} />
                </div>
                <small className="muted">{result.progressPercent}% saved{goal.target_date ? ` · target ${dateLabel(goal.target_date)}` : ""}</small>
                <GoalExplanation goal={goal} result={result} />
              </> : <p className="form-error">This goal&apos;s details can&apos;t be calculated. Edit it to fix the amounts or date.</p>}
              {canEdit ? <div className="record-actions">
                <details className="edit-panel"><summary>Edit</summary>
                  <form className="data-form edit-form friendly-form" action={updateSavingsGoal}>
                    <input type="hidden" name="id" value={goal.id} /><GoalFields goal={goal} /><button type="submit">Save changes</button>
                  </form>
                </details>
                <details className="household-remove"><summary>Delete</summary>
                  <form action={deleteSavingsGoal}>
                    <input type="hidden" name="id" value={goal.id} /><input type="hidden" name="confirm" value="yes" />
                    <p>This removes the goal. It doesn&apos;t change anything else.</p>
                    <button type="submit" className="danger-button">Yes, delete {goal.name}</button>
                  </form>
                </details>
              </div> : null}
            </li>;
          })}
        </ul>
        {canEdit ? <details className="profile-add-disclosure"><summary>Add a savings goal</summary>
          <form className="data-form friendly-form" action={addSavingsGoal}><GoalFields /><button type="submit">Save goal</button></form>
        </details> : null}
      </section>

      <section className="panel" aria-labelledby="check-ins-heading">
        <h2 id="check-ins-heading">Monthly check-ins</h2>
        <p className="muted">Once a month, record your balances and whether you followed your plan. Saved check-ins don&apos;t change when you update your Financial profile.</p>
        {canEdit ? <p><Link className="secondary-button" href="/goals/check-in">{hasThisMonth ? "Add a check-in for an earlier month" : `Check in for ${monthLabel(thisMonth)}`}</Link></p> : null}
        {(checkIns.data ?? []).length === 0 && !loadFailed ? <p className="muted">No check-ins yet.</p> : null}
        <ul className="check-in-list">
          {(checkIns.data ?? []).map((row) => {
            const lines = (row.monthly_check_in_balances ?? []) as Array<{ item_type: CheckInItemType; amount: number | string | null }>;
            let worth: string;
            try {
              const result = checkInNetWorth(lines.map((line) => ({ itemType: line.item_type, amount: line.amount })));
              worth = result.state === "complete" ? formatCents(result.netWorthCents) : `Incomplete — ${result.missingCount} balance${result.missingCount === 1 ? "" : "s"} not entered`;
            } catch { worth = "Not available"; }
            return <li key={row.id} className="check-in-row">
              <Link href={`/goals/check-in/${row.id}`}><strong>{monthLabel(String(row.check_in_month))}</strong></Link>
              <span>Net worth: {worth}</span>
              <span>Planned cash flow: {row.planned_cash_flow === null ? "Not available" : formatPlanMoney(Number(row.planned_cash_flow))}</span>
              <span>Followed the plan: {row.followed_plan ? "Yes" : "No"}</span>
            </li>;
          })}
        </ul>
      </section>
    </main>
  );
}
