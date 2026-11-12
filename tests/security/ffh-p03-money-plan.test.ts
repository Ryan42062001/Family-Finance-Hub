import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "../../lib/calculations/money-priority-engine.ts";
import { buildMoneyPrioritySnapshot } from "../../lib/calculations/money-priority-snapshot.ts";
import { exampleHouseholdRaw } from "../../lib/plan/example-household.ts";
import { buildMoneyPlanView, cushionBadge, debtFreeBadge, forPeople, missingItem } from "../../lib/plan/money-plan.ts";
import { planFromRaw } from "../../lib/plan/plan-result.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const AS_OF = "2026-11-12";
const engine = (): MoneyPriorityEngineResult => runMoneyPriorityEngine(exampleHouseholdRaw(), AS_OF);

test("plan keeps the engine's order and amounts exactly (presentation only)", () => {
  const result = engine();
  const view = buildMoneyPlanView(result);
  const actionable = result.recommendations.filter((r) => r.state !== "more_information_needed").sort((a, b) => a.rank - b.rank);
  assert.deepEqual(view.steps.map((s) => s.id), actionable.map((r) => r.id));
  for (const step of view.steps) {
    const source = result.recommendations.find((r) => r.id === step.id)!;
    const sum = source.allocations.reduce((total, a) => total + a.monthlyAmount, 0);
    assert.equal(step.monthlyAmount, source.allocations.length ? Math.round(sum * 100) / 100 : null);
    assert.equal(step.state, source.state);
  }
  // Every "needs more information" recommendation is shown as missing, never as an actionable step.
  const infoIds = result.recommendations.filter((r) => r.state === "more_information_needed").map((r) => r.id);
  assert.ok(view.steps.every((s) => !infoIds.includes(s.id)));
  assert.equal(view.missing.filter((g) => g.title !== null).length, infoIds.length);
  assert.equal(view.feasibility.monthlyPlanCapacity, result.feasibility.monthlyPlanCapacity);
});

test("an invalid allocation amount fails closed to no amount", () => {
  const result = engine();
  const tampered = structuredClone(result);
  const step = tampered.recommendations.find((r) => r.state !== "more_information_needed")!;
  step.allocations = [{ category: "debt", relatedEntityId: null, monthlyAmount: Number.NaN, annualAmount: null, rationale: [] }];
  const view = buildMoneyPlanView(tampered);
  assert.equal(view.steps.find((s) => s.id === step.id)!.monthlyAmount, null);
});

test("wording changes only strip internal labels and keep the original available", () => {
  assert.equal(forPeople("The Phase 5A protected retirement floor"), "The protected retirement floor");
  assert.equal(forPeople("participates in FFH-D004 competition"), "participates in competition");
  assert.equal(forPeople("Plain text stays the same."), "Plain text stays the same.");
});

test("missing facts only link to forms that can actually record them", () => {
  assert.equal(missingItem("Employer-match availability is unknown.").href, null);
  assert.equal(missingItem("The deductible reserve target cannot be verified without deductible data.").href, null);
  assert.equal(missingItem("Work 401(k): Employee contributions YTD are required to calculate remaining elective-deferral room.").href, null);
  assert.equal(missingItem("Vacation fund: Deadline flexibility is required for urgency evidence.").href, "/financial-profile#goals");
  assert.equal(missingItem("Car loan: interest rate is required.").href, "/financial-profile#debts");
});

test("headline badges use existing calculations and fail closed", () => {
  const snapshot = buildMoneyPrioritySnapshot(exampleHouseholdRaw());
  const cushion = cushionBadge(snapshot);
  const essentials = snapshot.aggregates.monthlyEssentialExpenses + snapshot.aggregates.monthlyMinimumDebtPayments;
  assert.deepEqual(cushion, { kind: "months", months: snapshot.aggregates.liquidCash / essentials });
  const debtFree = debtFreeBadge(snapshot, AS_OF);
  assert.equal(debtFree.kind, "date");
  // Unknown interest rate: no date.
  const unknownRate = structuredClone(snapshot);
  unknownRate.debts[0].annualInterestRate = null;
  assert.equal(debtFreeBadge(unknownRate, AS_OF).kind, "unavailable");
  // No debts: says so instead of inventing a date.
  const noDebt = structuredClone(snapshot);
  noDebt.debts = [];
  assert.deepEqual(debtFreeBadge(noDebt, AS_OF), { kind: "none" });
  // No essential spending recorded: no cushion figure.
  const noEssentials = structuredClone(snapshot);
  noEssentials.aggregates.monthlyEssentialExpenses = 0;
  noEssentials.aggregates.monthlyMinimumDebtPayments = 0;
  assert.equal(cushionBadge(noEssentials).kind, "unavailable");
});

test("invalid saved data produces no plan rather than a partial one", () => {
  const raw = exampleHouseholdRaw();
  raw.debts = [{ id: "bad", name: "Bad", debt_type: "credit_card", current_balance: "not-a-number", interest_rate: 10, minimum_payment: 10 }];
  const plan = planFromRaw(raw, AS_OF);
  assert.equal(plan.ok, false);
});

test("example household is synthetic, public and never touches the database", () => {
  const demo = read("../../app/demo/page.tsx");
  assert.doesNotMatch(demo, /createClient|supabase|cookies\(|headers\(/);
  assert.match(demo, /exampleHouseholdRaw\(\)/);
  const example = read("../../lib/plan/example-household.ts");
  assert.doesNotMatch(example, /@|supabase/i);
  const proxy = read("../../lib/supabase/proxy.ts");
  assert.match(proxy, /path === "\/demo";/);
  // Only the exact path is public; nothing below it.
  assert.doesNotMatch(proxy, /startsWith\("\/demo/);
  assert.ok(planFromRaw(exampleHouseholdRaw(), AS_OF).ok);
});

test("signed-in plan resolves the household on the server like Scenario Lab", () => {
  const page = read("../../app/plan/page.tsx");
  assert.match(page, /resolveScenarioHouseholdAuthority\(\)/);
  assert.match(page, /if \(!authority\.authenticated\) redirect\("\/auth\/login"\)/);
  assert.match(page, /loadMoneyPrioritySnapshot\(authority\.householdId\)/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
  const header = read("../../components/AppHeader.tsx");
  assert.match(header, /\["Your plan", "\/plan"\]/);
});
