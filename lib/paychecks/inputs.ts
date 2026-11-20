// FFH-P12: assembles the per-paycheck plan's inputs from data the caller loaded fresh on the server (the Money
// Priority Engine snapshot and its plan view, P09 bills, P11 set-asides, pay schedules). Pure and read-only: it copies
// values into new objects and never changes the snapshot, the plan or any bill.
import { createHash } from "node:crypto";
import type { MoneyPrioritySnapshot } from "../calculations/money-priority-snapshot.ts";
import type { PlanResult } from "../plan/plan-result.ts";
import type { BillInput } from "../bills/bills-view.ts";
import { MAX_CENTS } from "../bills/schedule.ts";
import { PaycheckDataError, type IncomeFact, type PaycheckPlanInput, type PlanStepFact, type SetAsideFact, type SpendingTreatment } from "./plan.ts";
import type { PaySchedule } from "./schedule.ts";

// An engine dollar figure -> exact cents, refusing anything that is not a whole, finite, in-range cent amount. The
// tolerance is absolute (a thousandth of a cent): enough for binary floating point up to MAX_CENTS (ulp < 0.002 cents
// there), never enough to round a real sub-cent value. (Pre-freeze review: a relative tolerance let large values with
// sub-cent fractions through.)
export const SUB_CENT_TOLERANCE = 1e-3;
export function dollarsToCents(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new PaycheckDataError("Invalid amount");
  const cents = Math.round(value * 100);
  if (cents > MAX_CENTS || Math.abs(cents - value * 100) > Math.max(SUB_CENT_TOLERANCE, Number.EPSILON * cents * 4)) throw new PaycheckDataError("Invalid amount");
  return cents;
}

export function incomeFacts(snapshot: MoneyPrioritySnapshot): IncomeFact[] {
  const people = new Map(snapshot.people.map((p) => [p.id, p.displayName]));
  return snapshot.income.map((i) => ({
    id: i.id, name: i.name, ownerName: i.ownerPersonId ? people.get(i.ownerPersonId) ?? null : null,
    monthlyCents: dollarsToCents(i.monthlyTakeHomeAmount), isActive: i.isActive, isVariable: i.isVariable,
  }));
}

export function expenseTreatments(snapshot: MoneyPrioritySnapshot): Map<string, SpendingTreatment> {
  return new Map(snapshot.expenses.map((e) => [e.id, e.cashFlowTreatment === "required" ? "required" : "discretionary"]));
}

// The plan's steps exactly as Your plan shows them (same rank order and the same cent amounts), only those with a
// monthly amount. null when no plan could be worked out.
export function planSteps(plan: PlanResult): PlanStepFact[] | null {
  if (!plan.ok) return null;
  return plan.view.steps
    .filter((s) => s.monthlyAmount !== null && s.monthlyAmount > 0)
    .map((s) => ({ id: s.id, rank: s.rank, title: s.title, stateLabel: s.stateLabel, monthlyCents: dollarsToCents(s.monthlyAmount as number) }))
    .sort((a, b) => a.rank - b.rank);
}

export function assemblePaycheckInput(args: {
  today: string; snapshot: MoneyPrioritySnapshot; plan: PlanResult; bills: BillInput[]; schedules: PaySchedule[]; setAsides: SetAsideFact[];
}): PaycheckPlanInput {
  return {
    today: args.today,
    incomes: incomeFacts(args.snapshot),
    schedules: args.schedules,
    bills: args.bills,
    expenseTreatment: expenseTreatments(args.snapshot),
    steps: planSteps(args.plan),
    setAsides: args.setAsides,
  };
}

// Fingerprint of the income facts a schedule form was shown with. The save is refused ("changed") when the income was
// edited in the meantime, so a schedule is never saved against a stale picture of its income.
export function incomeFingerprint(income: { id: string; name: string; monthlyCents: number; isActive: boolean; isVariable: boolean }): string {
  return createHash("sha256").update(JSON.stringify([income.id, income.name, income.monthlyCents, income.isActive, income.isVariable])).digest("hex").slice(0, 32);
}
