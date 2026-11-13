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
  // Recordable since FFH-P03: each goes to the section with the matching field.
  assert.equal(missingItem("Employer-match availability is unknown.").href, "/financial-profile#retirement");
  assert.equal(missingItem("The deductible reserve target cannot be verified without deductible data.").href, "/financial-profile#insurance");
  assert.equal(missingItem("Work 401(k): Employee contributions YTD are required to calculate remaining elective-deferral room.").href, "/financial-profile#retirement");
  assert.equal(missingItem("Desired monthly retirement spending is required for projection-based guidance.").href, "/financial-profile#retirement");
  assert.equal(missingItem("Vacation fund: Deadline flexibility is required for urgency evidence.").href, "/financial-profile#goals");
  assert.equal(missingItem("Car loan: interest rate is required.").href, "/financial-profile#debts");
  // Still not recordable: no link, an honest hint.
  const catchUp = missingItem("Roth catch-up support must be confirmed for this plan.");
  assert.equal(catchUp.href, null);
  assert.match(catchUp.fixHint, /can't record/);
  // Every routed section exists in the profile page.
  const profile = read("../../app/financial-profile/page.tsx");
  for (const id of ["insurance", "retirement", "income", "accounts", "goals", "debts"]) assert.match(profile, new RegExp(`<ProfileSection id="${id}"`));
});

test("plain wording replaces only known whole sentences", () => {
  assert.equal(forPeople("Employer-match availability is unknown."), "We don't know yet whether your employer matches your contributions.");
  assert.equal(forPeople("APR is at or above the high-interest threshold. Unknown sentence stays."), "This debt's interest rate is high, so paying it down is a strong use of extra money. Unknown sentence stays.");
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

test("new profile fields write only allowed values that mirror the database checks", () => {
  const actions = read("../../app/financial-profile/actions.ts");
  const migrations = ["20260829223935_phase_5_priority_engine_context.sql"].map((f) => read(`../../supabase/migrations/${f}`)).join("\n");
  assert.match(actions, /const INSURANCE_TYPES = \["health", "auto", "homeowners", "renters", "umbrella", "pet", "other"\] as const;/);
  assert.match(migrations, /insurance_type = any \(array\['health'::text,'auto'::text,'homeowners'::text,'renters'::text,'umbrella'::text,'pet'::text,'other'::text\]\)/);
  assert.match(actions, /const MATCH_STATUSES = \["not_offered", "unknown", "not_fully_captured", "fully_captured"\] as const;/);
  // Only purposes that need no linked goal/debt can be chosen; "keep" leaves a linked purpose untouched.
  assert.match(actions, /const SIMPLE_CASH_PURPOSES = \["unallocated", "protected_reserve", "operating_cash", "not_applicable"\] as const;/);
  assert.match(actions, /if \(raw === "keep"\) return \{\};/);
  // HSA year-to-date amounts are owned by the HSA contract and are never written from this form.
  assert.match(actions, /if \(accountType !== "hsa"\) \{\s*details\.employee_contributed_ytd/);
  // Retirement goals: one row per household, four columns, today's dollars only when an amount is given.
  assert.match(actions, /retirement_spending_basis: spending === null \? "unknown" : "today_dollars"/);
  assert.match(actions, /\{ onConflict: "household_id" \}/);
  // Insurance edits stay scoped to the user's household; delete supports the new kind.
  assert.match(actions, /from\("insurance_exposures"\)\.update\(\{ \.\.\.insurancePayload\(formData\), updated_at: new Date\(\)\.toISOString\(\) \}\)\.eq\("id", id\)\.eq\("household_id", householdId\)/);
  assert.match(actions, /insurance: "insurance_exposures",/);
});

test("sign-in and sign-up name an existing session instead of silently keeping it", () => {
  for (const path of ["../../app/auth/login/page.tsx", "../../app/auth/sign-up/page.tsx"]) {
    const page = read(path);
    assert.match(page, /You&apos;re already signed in as <strong>\{signedInEmail\}<\/strong>/);
    assert.match(page, /<form action=\{logout\}>/);
  }
});
