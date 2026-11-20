import Link from "next/link";
import { redirect } from "next/navigation";
import { PaycheckPlanView, type ScheduleFeedback, type ScheduleSetup } from "./PaycheckPlanView";
import type { ScheduleError, ScheduleNotice } from "./actions";
import { UUID } from "@/lib/bills/set-aside-form";
import { BillsDataError, loadBills } from "@/lib/supabase/bills";
import { loadSetAsides } from "@/lib/supabase/set-asides";
import { loadPaySchedules, PaySchedulesUnavailableError } from "@/lib/supabase/paychecks";
import { loadMoneyPrioritySnapshot } from "@/lib/supabase/money-priority-snapshot";
import { MoneyPrioritySnapshotValidationError } from "@/lib/calculations/money-priority-snapshot";
import { planFromSnapshot, todayUtc } from "@/lib/plan/plan-result";
import { assemblePaycheckInput, incomeFacts, incomeFingerprint } from "@/lib/paychecks/inputs";
import { buildPaycheckPlan, PaycheckDataError, type PaycheckPlan, type SetAsideFact } from "@/lib/paychecks/plan";
import { readSimpleMode } from "@/lib/profile/view-mode";
import { resolveScenarioHouseholdAuthority } from "@/lib/scenarios/scenario-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ view?: string; ps_notice?: string; ps_error?: string; ps_income?: string }> };

const NOTICES: readonly ScheduleNotice[] = ["saved", "removed"];
const ERRORS: readonly ScheduleError[] = [
  "frequency_missing", "amount_missing", "amount_invalid", "date_missing", "date_invalid", "date_past", "date_far", "days_missing",
  "days_invalid", "date_not_payday", "net_confirm_missing", "changed", "exists", "inactive", "not_saved", "read_only", "confirm_missing",
];

// Only allowlisted keys from the URL are used; every message text comes from the code.
function feedback(params: Awaited<PageProps["searchParams"]>): ScheduleFeedback {
  if (typeof params.ps_income !== "string" || !UUID.test(params.ps_income)) return null;
  const notice = NOTICES.find((n) => n === params.ps_notice);
  if (notice) return { incomeId: params.ps_income, notice };
  const error = ERRORS.find((e) => e === params.ps_error);
  return error ? { incomeId: params.ps_income, error } : null;
}

type Loaded =
  | { kind: "ready"; plan: PaycheckPlan; setups: ScheduleSetup[]; setAsideNote: boolean }
  | { kind: "unavailable"; reason: "schedules" | "data" | "plan" };

export default async function PaychecksPage({ searchParams }: PageProps) {
  // The signed-in user's own membership, resolved on the server (never from the URL or a form).
  const authority = await resolveScenarioHouseholdAuthority();
  if (!authority.authenticated) redirect("/auth/login");
  if (!authority.householdId) redirect("/onboarding");
  const householdId = authority.householdId;
  const canEdit = authority.role === "owner" || authority.role === "member";
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const simple = params.view === "simple" ? true : params.view === "detailed" ? false : await readSimpleMode(supabase, claims?.claims?.sub);
  const today = todayUtc();

  // Everything is read fresh for this request and derived here; nothing on this page is stored except schedule facts.
  let loaded: Loaded;
  try {
    const snapshot = await loadMoneyPrioritySnapshot(householdId);
    const plan = planFromSnapshot(snapshot, today);
    const [bills, schedules] = await Promise.all([loadBills(supabase, householdId), loadPaySchedules(supabase, householdId)]);
    // P11 context only. If it can't be read, the plan is still correct without it (it never changes any amount).
    let setAsides: SetAsideFact[] = [];
    let setAsideNote = false;
    try {
      setAsides = (await loadSetAsides(supabase, householdId)).map((t) => ({ expenseId: t.expenseId, cycleDue: t.cycleDue, reservedCents: t.reservedCents }));
    } catch (caught) {
      if (!(caught instanceof BillsDataError)) throw caught;
      setAsideNote = true;
    }
    const paycheckPlan = buildPaycheckPlan(assemblePaycheckInput({ today, snapshot, plan, bills, schedules, setAsides }));
    const byIncome = new Map(schedules.map((s) => [s.incomeSourceId, s]));
    const setups: ScheduleSetup[] = incomeFacts(snapshot).map((income) => ({ income, schedule: byIncome.get(income.id) ?? null, fingerprint: incomeFingerprint(income) }));
    loaded = { kind: "ready", plan: paycheckPlan, setups, setAsideNote };
  } catch (caught) {
    if (caught instanceof PaySchedulesUnavailableError) loaded = { kind: "unavailable", reason: "schedules" };
    else if (caught instanceof PaycheckDataError || caught instanceof BillsDataError || caught instanceof RangeError) loaded = { kind: "unavailable", reason: "data" };
    else if (caught instanceof MoneyPrioritySnapshotValidationError) loaded = { kind: "unavailable", reason: "plan" };
    else throw caught;
  }

  return (
    <main className="page-shell paycheck-page">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Your plan · paychecks</p>
          <h1>Plan upcoming paychecks</h1>
          <p className="muted">The next 60 days, one expected deposit at a time: bills due before the following deposit, everyday spending and your plan&apos;s steps. Expected and recommended amounts only: nothing here is money in your account, a payment or a transfer.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" href="/plan">Back to Your plan</Link>
          <Link className="secondary-button" href={simple ? "/plan/paychecks?view=detailed" : "/plan/paychecks?view=simple"}>{simple ? "Show details" : "Simple view"}</Link>
        </div>
      </section>
      {loaded.kind === "unavailable" ? <section className="bento-card plan-unavailable" role="status">
        <strong>Paycheck planning can&apos;t be shown right now</strong>
        <p>{loaded.reason === "schedules" ? "Pay schedules can't be read at the moment. Your plan, bills and income are not affected." :
          loaded.reason === "plan" ? "Some saved numbers are invalid, so no plan is shown. Review your Financial profile." :
          "Either your numbers changed while this page was loading (reload the page), or a saved amount is invalid (review your Financial profile and Bills). Nothing was guessed."}</p>
        <Link className="secondary-button" href="/plan/paychecks">Reload</Link>
      </section> : <PaycheckPlanView plan={loaded.plan} setups={loaded.setups} canEdit={canEdit} simple={simple} feedback={feedback(params)} setAsideNote={loaded.setAsideNote} />}
    </main>
  );
}
