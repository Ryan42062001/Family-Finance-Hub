// FFH-P10 — server-side execution of the guided "Can We Afford It?" check (issue #171).
//
// Authority, household and financial data are all resolved on the server: the signed-in user's own household
// membership (lib/scenarios/scenario-auth.ts) and a freshly loaded Money Priority snapshot. The verdict comes ONLY from
// the canonical Scenario Lab adapters (runHomeScenarioAdapter / runVehicleScenarioAdapter), which call the canonical
// evaluators unchanged. Everything here is read-only and in memory: nothing is saved, applied or written.
import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "../calculations/money-priority-engine.ts";
import { MoneyPrioritySnapshotValidationError } from "../calculations/money-priority-snapshot.ts";
import { moneyPrioritySnapshotToRaw } from "../calculations/money-priority-raw-adapter.ts";
import type { HomeAffordabilityResult } from "../calculations/home-affordability.ts";
import type { VehicleAffordabilityResult } from "../calculations/vehicle-affordability.ts";
import { scenarioBaselineDescriptor } from "../scenarios/scenario-fingerprint.ts";
import type { ScenarioExecutionDependencies } from "../scenarios/scenario-execution.ts";
import { runHomeScenarioAdapter, runVehicleScenarioAdapter } from "../scenarios/scenario-specialized-runner.ts";
import { homeGuidance, isVehicleLoan, toCents, vehicleGuidance, type GuidelineCheck } from "./guidance.ts";
import { parsePurchaseCheck, type ParseContext, type PurchaseCheckIssue, type PurchaseKind } from "./purchase-check-input.ts";
import { describeMissing } from "./purchase-check-presentation.ts";

export type PurchaseGoalEffect = { name: string; beforeMonthly: number; afterMonthly: number; usedForPurchase: boolean };

export type PurchaseOptionResult = {
  label: string;
  /** Plain-language list of what the canonical evaluator still needs (raw codes stay in `canonical.missingData`). */
  missing: string[];
  goalEffects: PurchaseGoalEffect[];
  retirementMonthlyBefore: number;
  retirementMonthlyAfter: number | null;
  guidance: GuidelineCheck[];
} & (
  | { kind: "home"; canonical: HomeAffordabilityResult }
  | { kind: "vehicle"; canonical: VehicleAffordabilityResult }
);

export type PurchaseCheckResponse = {
  status: "ok" | "invalid" | "stale_baseline" | "unauthorized";
  /** Fresh server fingerprint so the page can offer a reload; never a household identifier. */
  baselineFingerprint: string | null;
  issues: PurchaseCheckIssue[];
  options: PurchaseOptionResult[];
  hypothetical: true;
};

export type PurchaseCheckBootstrap = {
  baselineFingerprint: string;
  asOfDate: string;
  goals: Array<{ id: string; name: string }>;
  recordedHousingMonthly: number;
  recordedVehicleLoanPaymentsMonthly: number;
  grossIncomeComplete: boolean;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Housing costs already counted by the plan: P09 housing-category expense monthly equivalents + mortgage minimums. */
export function recordedHousingCents(engine: MoneyPriorityEngineResult): number {
  const expenses = engine.snapshot.expenses.filter((item) => item.category === "housing").reduce((sum, item) => sum + toCents(item.monthlyAmount), 0);
  const mortgages = engine.snapshot.debts.filter((item) => item.type === "mortgage").reduce((sum, item) => sum + toCents(item.minimumPayment), 0);
  return expenses + mortgages;
}

export function purchaseCheckBootstrap(engine: MoneyPriorityEngineResult): PurchaseCheckBootstrap {
  return {
    baselineFingerprint: scenarioBaselineDescriptor(engine).fingerprint,
    asOfDate: engine.asOfDate,
    goals: engine.snapshot.goals.map((goal) => ({ id: goal.id, name: goal.name })),
    recordedHousingMonthly: recordedHousingCents(engine) / 100,
    recordedVehicleLoanPaymentsMonthly: engine.snapshot.debts.filter(isVehicleLoan).reduce((sum, item) => sum + toCents(item.minimumPayment), 0) / 100,
    grossIncomeComplete: !engine.snapshot.aggregates.hasIncompleteGrossIncome && engine.snapshot.aggregates.monthlyGrossIncomeKnown > 0,
  };
}

function goalMonthly(engine: MoneyPriorityEngineResult): Map<string, number> {
  const totals = new Map<string, number>();
  for (const allocation of engine.build.allocations) {
    if (allocation.category !== "goal" || !allocation.relatedEntityId) continue;
    totals.set(allocation.relatedEntityId, roundMoney((totals.get(allocation.relatedEntityId) ?? 0) + allocation.allocatedMonthlyAmount));
  }
  return totals;
}

function retirementMonthly(engine: MoneyPriorityEngineResult): number {
  return roundMoney(engine.build.allocations.filter((item) => item.category === "retirement").reduce((sum, item) => sum + item.allocatedMonthlyAmount, 0));
}

function goalEffects(baseline: MoneyPriorityEngineResult, post: MoneyPriorityEngineResult | null, relatedGoalId: string | null): PurchaseGoalEffect[] {
  const before = goalMonthly(baseline);
  const after = post ? goalMonthly(post) : null;
  return baseline.snapshot.goals
    .map((goal) => ({
      name: goal.name,
      beforeMonthly: before.get(goal.id) ?? 0,
      afterMonthly: after ? after.get(goal.id) ?? 0 : before.get(goal.id) ?? 0,
      usedForPurchase: goal.id === relatedGoalId,
    }))
    .filter((effect) => effect.usedForPurchase || (after !== null && toCents(effect.beforeMonthly) !== toCents(effect.afterMonthly)));
}

function empty(status: PurchaseCheckResponse["status"], fingerprint: string | null, issues: PurchaseCheckIssue[]): PurchaseCheckResponse {
  return { status, baselineFingerprint: fingerprint, issues, options: [], hypothetical: true };
}

export async function loadPurchaseCheckBaseline(dependencies: ScenarioExecutionDependencies): Promise<MoneyPriorityEngineResult | null> {
  const authority = await dependencies.resolveAuthority();
  if (!authority.authenticated || !authority.householdId) return null;
  const snapshot = await dependencies.loadSnapshot(authority.householdId);
  return runMoneyPriorityEngine(moneyPrioritySnapshotToRaw(snapshot), dependencies.asOfDate());
}

export async function executePurchaseCheck(input: unknown, dependencies: ScenarioExecutionDependencies): Promise<PurchaseCheckResponse> {
  let engine: MoneyPriorityEngineResult | null;
  try {
    engine = await loadPurchaseCheckBaseline(dependencies);
  } catch (error) {
    // Invalid saved numbers: same honest answer as Your plan. Anything else (database/auth) still fails closed by throwing.
    if (!(error instanceof MoneyPrioritySnapshotValidationError)) throw error;
    return empty("invalid", null, [{ path: "request.baseline", message: "Some saved numbers are invalid, so there is no plan to check against. Review your Financial profile." }]);
  }
  if (!engine) return empty("unauthorized", null, [{ path: "request.auth", message: "Please sign in again." }]);
  const fingerprint = scenarioBaselineDescriptor(engine).fingerprint;

  const context: ParseContext = {
    goalIds: new Set(engine.snapshot.goals.map((goal) => goal.id)),
    recordedHousingCents: recordedHousingCents(engine),
  };
  const { parsed, issues } = parsePurchaseCheck(input, context);
  if (!parsed) return empty("invalid", fingerprint, issues);
  if (parsed.baselineFingerprint !== fingerprint) {
    return empty("stale_baseline", fingerprint, [{
      path: "request.baselineFingerprint",
      message: "Your saved financial information (or today's date) changed since this page loaded. Refresh to check against your latest numbers; your entries are kept.",
    }]);
  }

  const options: PurchaseOptionResult[] = [];
  try {
    parsed.options.forEach((option, index) => {
      // Each option is evaluated independently against the same immutable server baseline (deep-cloned inputs).
      const eventId = `purchase-check-option-${index + 1}`;
      if (option.kind === "home") {
        const adapter = runHomeScenarioAdapter(engine, { type: "home", eventId, scenario: structuredClone(option.scenario) });
        options.push({
          kind: "home",
          label: option.label,
          canonical: adapter.result,
          missing: describeMissing("home", adapter.result.missingData),
          goalEffects: goalEffects(engine, adapter.postEngine, option.scenario.relatedGoalId ?? null),
          retirementMonthlyBefore: retirementMonthly(engine),
          retirementMonthlyAfter: adapter.postEngine ? retirementMonthly(adapter.postEngine) : null,
          guidance: homeGuidance({ baseline: engine, postEngine: adapter.postEngine, scenario: option.scenario, result: adapter.result }),
        });
      } else {
        const adapter = runVehicleScenarioAdapter(engine, { type: "vehicle", eventId, scenario: structuredClone(option.scenario) });
        options.push({
          kind: "vehicle",
          label: option.label,
          canonical: adapter.result,
          missing: describeMissing("vehicle", adapter.result.missingData),
          goalEffects: goalEffects(engine, adapter.postEngine, option.scenario.relatedGoalId ?? null),
          retirementMonthlyBefore: retirementMonthly(engine),
          retirementMonthlyAfter: adapter.postEngine ? retirementMonthly(adapter.postEngine) : null,
          guidance: vehicleGuidance({ baseline: engine, postEngine: adapter.postEngine, scenario: option.scenario, result: adapter.result, otherVehiclesValue: option.otherVehiclesValue }),
        });
      }
    });
  } catch {
    // Same structured answer as Scenario Lab's specialized execution when an adapter cannot evaluate the payload.
    return empty("invalid", fingerprint, [{ path: "request.options", message: "This check could not be worked out. Review the entries and try again." }]);
  }

  return { status: "ok", baselineFingerprint: fingerprint, issues: [], options, hypothetical: true };
}

export type { PurchaseKind };
