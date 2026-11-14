import Link from "next/link";
import { redirect } from "next/navigation";
import NumberField from "@/components/forms/NumberField";
import { Choice } from "@/components/forms/Controls";
import { createCheckIn } from "@/app/goals/actions";
import { currentUtcMonth, monthLabel } from "@/lib/calculations/check-in-snapshot";
import { goalsContext } from "@/lib/goals/context";
import { goalsNotice } from "@/lib/goals/notices";

export const dynamic = "force-dynamic";
type PageProps = { searchParams: Promise<{ notice?: string | string[] }> };

const BALANCE_HINT = { account: "Cash account", retirement_account: "Retirement account", debt: "Debt (amount owed)" } as const;

// FFH-P07: a new monthly check-in. Balances are pre-filled from the Financial profile as a
// suggestion (C2); saving never changes the profile (C3); a blank box means "not entered" (C4).
export default async function NewCheckInPage({ searchParams }: PageProps) {
  const { supabase, householdId, canEdit } = await goalsContext();
  if (!canEdit) redirect("/goals?notice=read_only");
  const [accounts, retirement, debts, existing] = await Promise.all([
    supabase.from("accounts").select("id, name, balance").eq("household_id", householdId).eq("include_in_net_worth", true).order("created_at"),
    supabase.from("retirement_accounts").select("id, name, balance").eq("household_id", householdId).order("created_at"),
    supabase.from("debts").select("id, name, current_balance").eq("household_id", householdId).order("created_at"),
    supabase.from("monthly_check_ins").select("check_in_month").eq("household_id", householdId),
  ]);
  const notice = goalsNotice((await searchParams).notice);
  if (accounts.error || retirement.error || debts.error || existing.error) {
    return <main className="page-shell"><section className="panel"><h1>Monthly check-in</h1><p className="form-error" role="status">We couldn&apos;t load your Financial profile. Please try again.</p><Link className="secondary-button" href="/goals">Back to goals</Link></section></main>;
  }
  // C1 (review F05): any past month or this month (UTC); no rolling window, no minimum year.
  const thisMonth = currentUtcMonth();
  const taken = new Set((existing.data ?? []).map((row) => String(row.check_in_month).slice(0, 7)));
  const takenList = [...taken].sort().reverse();
  const items = [
    ...(accounts.data ?? []).map((row) => ({ type: "account" as const, id: row.id, name: row.name, value: row.balance })),
    ...(retirement.data ?? []).map((row) => ({ type: "retirement_account" as const, id: row.id, name: row.name, value: row.balance })),
    ...(debts.data ?? []).map((row) => ({ type: "debt" as const, id: row.id, name: row.name, value: row.current_balance })),
  ];

  return (
    <main className="page-shell goals-page">
      <section className="panel">
        <p className="eyebrow">Monthly check-in</p>
        <h1>How did this month go?</h1>
        {notice ? <p className={notice.ok ? "form-success" : "form-error"} role="status">{notice.text}</p> : null}
        <form className="data-form friendly-form check-in-form" action={createCheckIn}>
          <label className="field"><span className="field-label">Month</span>
            <input type="month" name="month" required max={thisMonth} defaultValue={taken.has(thisMonth) ? "" : thisMonth} />
            <small className="field-hint">This month or any earlier month.{takenList.length ? ` Already checked in: ${takenList.map(monthLabel).join(", ")}.` : ""}</small>
          </label>
          <Choice name="followed_plan" legend="Did you follow this month's plan?" variant="pills" options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
          <fieldset className="check-in-balances">
            <legend>Balances</legend>
            <p className="muted">Filled in from your Financial profile. Change any that are different today. Leave a box empty if you don&apos;t know it; net worth then shows as incomplete instead of guessing. Saving here doesn&apos;t change your Financial profile.</p>
            {items.length === 0 ? <p className="muted">Your Financial profile has no accounts, retirement accounts or debts yet, so there are no balances to record.</p> : null}
            {items.map((item) => <NumberField key={`${item.type}_${item.id}`} name={`balance_${item.type}_${item.id}`} label={`${item.name} · ${BALANCE_HINT[item.type]}`} defaultValue={item.value} min={item.type === "account" ? "-999999999999.99" : "0"} placeholder="Not entered" />)}
          </fieldset>
          <p className="muted">We&apos;ll also save your planned monthly cash flow from your Financial profile as it is right now. It won&apos;t change later.</p>
          <button type="submit">Save check-in</button>
          <Link className="secondary-button" href="/goals">Cancel</Link>
        </form>
      </section>
    </main>
  );
}
