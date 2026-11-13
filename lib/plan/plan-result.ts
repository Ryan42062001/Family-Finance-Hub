// Runs the existing engine on a snapshot and builds everything the plan page shows. Shared by the signed-in plan,
// the dashboard summary and the public example household so all three stay identical in behaviour.
import { runMoneyPriorityEngine } from "../calculations/money-priority-engine.ts";
import { moneyPrioritySnapshotToRaw } from "../calculations/money-priority-raw-adapter.ts";
import { buildMoneyPrioritySnapshot, MoneyPrioritySnapshotValidationError, type MoneyPriorityRawSnapshot, type MoneyPrioritySnapshot } from "../calculations/money-priority-snapshot.ts";
import { buildMoneyPlanView, cushionBadge, debtFreeBadge, type CushionBadge, type DebtFreeBadge, type MoneyPlanView } from "./money-plan.ts";

export type PlanResult =
  | { ok: true; view: MoneyPlanView; cushion: CushionBadge; debtFree: DebtFreeBadge; debtMinimums: number }
  | { ok: false; reason: string };

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function planFromSnapshot(snapshot: MoneyPrioritySnapshot, asOfDate: string): PlanResult {
  try {
    const result = runMoneyPriorityEngine(moneyPrioritySnapshotToRaw(snapshot), asOfDate);
    return {
      ok: true,
      view: buildMoneyPlanView(result),
      cushion: cushionBadge(result.snapshot),
      debtFree: debtFreeBadge(result.snapshot, asOfDate),
      debtMinimums: result.snapshot.aggregates.monthlyMinimumDebtPayments,
    };
  } catch (error) {
    // Fail closed: invalid saved data never produces a partial or guessed plan.
    if (error instanceof MoneyPrioritySnapshotValidationError) return { ok: false, reason: "Some saved numbers are invalid, so no plan is shown. Review your Financial profile." };
    throw error;
  }
}

export function planFromRaw(raw: MoneyPriorityRawSnapshot, asOfDate: string): PlanResult {
  try {
    return planFromSnapshot(buildMoneyPrioritySnapshot(raw), asOfDate);
  } catch (error) {
    if (error instanceof MoneyPrioritySnapshotValidationError) return { ok: false, reason: "Some saved numbers are invalid, so no plan is shown. Review your Financial profile." };
    throw error;
  }
}
