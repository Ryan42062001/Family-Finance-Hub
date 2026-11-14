import Link from "next/link";
import { notFound } from "next/navigation";
import NumberField from "@/components/forms/NumberField";
import { Choice } from "@/components/forms/Controls";
import { deleteCheckIn, updateCheckIn } from "@/app/goals/actions";
import { checkInNetWorth, monthLabel, type CheckInItemType } from "@/lib/calculations/check-in-snapshot";
import { goalsContext } from "@/lib/goals/context";
import { goalsNotice } from "@/lib/goals/notices";
import { formatPlanMoney } from "@/lib/plan/money-plan";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string | string[] }> };
type Line = { id: string; item_type: CheckInItemType; name: string; amount: number | string | null; sort_order: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KIND = { account: "Cash account", retirement_account: "Retirement account", debt: "Debt" } as const;
const stamp = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const amountText = (value: number | string | null) => value === null ? "Not entered" : formatPlanMoney(Number(value));

// FFH-P07: one saved check-in — the balances as entered, the net worth they add up to, and the
// planned cash flow frozen when it was first saved (C5, C6, C8).
export default async function CheckInPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, householdId, canEdit } = await goalsContext();
  const { data: checkIn, error } = await supabase.from("monthly_check_ins")
    .select("id, check_in_month, followed_plan, planned_monthly_income, planned_monthly_expenses, planned_debt_minimums, planned_employee_retirement, planned_cash_flow, created_at, updated_at, monthly_check_in_balances(id, item_type, name, amount, sort_order)")
    .eq("id", id).eq("household_id", householdId).maybeSingle();
  if (error) throw new Error("Could not load this check-in.");
  if (!checkIn) notFound();
  const notice = goalsNotice((await searchParams).notice);
  const lines = ([...(checkIn.monthly_check_in_balances ?? [])] as Line[]).sort((a, b) => a.sort_order - b.sort_order);
  let worthText: string;
  try {
    const worth = checkInNetWorth(lines.map((line) => ({ itemType: line.item_type, amount: line.amount })));
    worthText = worth.state === "complete"
      ? `${formatPlanMoney(worth.netWorth)} (${formatPlanMoney(worth.assets)} in assets minus ${formatPlanMoney(worth.debts)} owed)`
      : `Incomplete — ${worth.missingCount} balance${worth.missingCount === 1 ? "" : "s"} not entered, so no total is shown`;
  } catch { worthText = "Not available"; }
  const month = String(checkIn.check_in_month);

  return (
    <main className="page-shell goals-page">
      <section className="panel">
        <p className="eyebrow">Monthly check-in</p>
        <h1>{monthLabel(month)}</h1>
        {notice ? <p className={notice.ok ? "form-success" : "form-error"} role="status">{notice.text}</p> : null}
        <dl className="check-in-summary">
          <div><dt>Followed the plan</dt><dd>{checkIn.followed_plan ? "Yes" : "No"}</dd></div>
          <div><dt>Net worth</dt><dd>{worthText}</dd></div>
          <div><dt>Planned monthly cash flow when you checked in</dt><dd>{checkIn.planned_cash_flow === null
            ? "Not available (your Financial profile had no active income and no expenses)"
            : <>{formatPlanMoney(Number(checkIn.planned_cash_flow))}<small className="muted"> = income {formatPlanMoney(Number(checkIn.planned_monthly_income))} − expenses {formatPlanMoney(Number(checkIn.planned_monthly_expenses))} − debt minimums {formatPlanMoney(Number(checkIn.planned_debt_minimums))} − your retirement contributions {formatPlanMoney(Number(checkIn.planned_employee_retirement))}. This is what was planned, not what was actually spent, and it doesn&apos;t change when you edit this check-in.</small></>}</dd></div>
        </dl>
        <h2>Balances</h2>
        {lines.length === 0 ? <p className="muted">No balances were recorded.</p> : <ul className="record-list">
          {lines.map((line) => <li className="record-row" key={line.id}><span><strong>{line.name}</strong><small>{KIND[line.item_type]}</small></span><span>{amountText(line.amount)}</span></li>)}
        </ul>}
        <p className="muted">Saved {stamp(checkIn.created_at)}{checkIn.updated_at !== checkIn.created_at ? ` · last changed ${stamp(checkIn.updated_at)}` : ""}.</p>

        {canEdit ? <div className="record-actions">
          <details className="edit-panel"><summary>Edit</summary>
            <form className="data-form edit-form friendly-form" action={updateCheckIn}>
              <input type="hidden" name="id" value={checkIn.id} />
              <Choice name="followed_plan" legend="Did you follow this month's plan?" variant="pills" defaultValue={checkIn.followed_plan ? "yes" : "no"} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
              {lines.map((line) => <NumberField key={line.id} name={`line_${line.id}`} label={`${line.name} · ${KIND[line.item_type]}`} defaultValue={line.amount} min={line.item_type === "account" ? "-999999999999.99" : "0"} placeholder="Not entered" />)}
              <button type="submit">Save changes</button>
            </form>
          </details>
          <details className="household-remove"><summary>Delete</summary>
            <form action={deleteCheckIn}>
              <input type="hidden" name="id" value={checkIn.id} /><input type="hidden" name="confirm" value="yes" />
              <p>This removes the {monthLabel(month)} check-in and its balances.</p>
              <button type="submit" className="danger-button">Yes, delete this check-in</button>
            </form>
          </details>
        </div> : null}
        <p><Link className="secondary-button" href="/goals">Back to goals</Link></p>
      </section>
    </main>
  );
}
