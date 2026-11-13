import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runMoneyPriorityEngine, type MoneyPriorityEngineResult } from "../../lib/calculations/money-priority-engine.ts";
import { buildMoneyPrioritySnapshot } from "../../lib/calculations/money-priority-snapshot.ts";
import { exampleHouseholdRaw } from "../../lib/plan/example-household.ts";
import { buildMoneyPlanView, cushionBadge, debtFreeBadge, emergencyAvailableCash, formatPlanMoney, forPeople, missingItem } from "../../lib/plan/money-plan.ts";
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
  assert.deepEqual(cushion, { kind: "months", months: (snapshot.aggregates.protectedCash + snapshot.aggregates.unallocatedCash) / essentials });
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
  // The spending basis is the household's explicit answer, validated against the database values; never inferred.
  assert.match(actions, /const SPENDING_BASES = \["today_dollars", "future_dollars", "unknown"\] as const;/);
  assert.match(actions, /retirement_spending_basis: basis,/);
  assert.doesNotMatch(actions, /"today_dollars" :|: "today_dollars"/);
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

test("friendlier forms submit exactly the field names the save actions validate", () => {
  const fields = read("../../components/forms/ProfileFields.tsx");
  const actions = read("../../app/financial-profile/actions.ts");
  const names = [...fields.matchAll(/name="([a-z_]+)"/g)].map((m) => m[1]);
  for (const name of names) assert.match(actions, new RegExp(`"${name}"`), `actions read ${name}`);
  for (const required of ["account_type", "balance", "cash_purpose", "monthly_amount", "monthly_gross_amount", "category", "is_essential", "debt_type", "current_balance", "minimum_payment", "interest_rate", "monthly_employee_contribution", "monthly_employer_contribution", "match_status", "employee_contributed_ytd", "insurance_type", "deductible_amount", "is_relevant_to_reserve", "target_amount", "current_amount", "target_date", "priority", "goal_class", "necessity", "deadline_flexibility", "consequence_level", "goal_nature", "underfunding_consequence", "borrowing_likelihood"]) {
    assert.ok(names.includes(required), `form still sends ${required}`);
  }
  // Choices: radio groups, one value; no preselection when a saved value isn't an option (never silently replaced).
  const controls = read("../../components/forms/Controls.tsx");
  assert.match(controls, /type="radio" name=\{name\} value=\{option\.value\} defaultChecked=\{defaultValue === option\.value\} required=\{required && index === 0\}/);
  // The switch is a real checkbox: "on" when on, nothing when off (what the actions expect).
  assert.match(controls, /type="checkbox" role="switch" name=\{name\}/);
  // The yearly/monthly hint is display only.
  const number = read("../../components/forms/NumberField.tsx");
  assert.match(number, /<input name=\{name\} type="number"/);
  assert.doesNotMatch(number, /type="hidden"|name=\{`/);
});

test("review FFH-P03 #1: plain wording never alters amounts, rates or unknown sentences", () => {
  for (const text of [
    "The recorded post-promotional APR is 23.90%.",
    "$123.45 of known legal employee contribution room remains.",
    "Pay $1,020.50 more. APR is at or above the high-interest threshold. Then $0.49 remains.",
  ]) {
    const out = forPeople(text);
    for (const figure of text.match(/\$?[\d,]+\.\d+%?/g) ?? []) assert.ok(out.includes(figure), `${figure} survives in: ${out}`);
  }
  assert.equal(forPeople("The recorded post-promotional APR is 23.90%."), "The recorded post-promotional APR is 23.90%.");
  assert.equal(
    forPeople("Pay $1,020.50 more. APR is at or above the high-interest threshold. Then $0.49 remains."),
    "Pay $1,020.50 more. This debt's interest rate is high, so paying it down is a strong use of extra money. Then $0.49 remains.",
  );
  // The same function formats why-now, trade-offs and assumptions.
  const result = engine();
  const tampered = structuredClone(result);
  const step = tampered.recommendations.find((r) => r.state !== "more_information_needed")!;
  step.tradeoffs = ["$1020.00 of this higher-priority balance remains after the current monthly allocation."];
  step.assumptions = ["Projection uses a 4.0% annual real return."];
  const view = buildMoneyPlanView(tampered).steps.find((s) => s.id === step.id)!;
  assert.deepEqual(view.tradeoffs, step.tradeoffs);
  assert.deepEqual(view.assumptions, step.assumptions);
});

test("review FFH-P03 #2: plan amounts are shown to the cent in the plan and the dashboard summary", () => {
  assert.equal(formatPlanMoney(0.01), "$0.01");
  assert.equal(formatPlanMoney(0.49), "$0.49");
  assert.equal(formatPlanMoney(125.49), "$125.49");
  assert.equal(formatPlanMoney(1400), "$1,400.00");
  for (const path of ["../../components/plan/MoneyPlan.tsx", "../../components/plan/PlanSummary.tsx"]) {
    const source = read(path);
    assert.match(source, /const money = formatPlanMoney;/, path);
    assert.doesNotMatch(source, /maximumFractionDigits: 0/, path);
  }
});

test("review FFH-P03 #3: the retirement-goals form shows and submits the saved spending basis", () => {
  const page = read("../../app/financial-profile/page.tsx");
  assert.match(page, /select\("desired_retirement_monthly_spending, retirement_spending_basis, /);
  assert.match(page, /<Choice name="retirement_spending_basis" legend="That amount is in" variant="pills" defaultValue=\{goalsPrefs\?\.retirement_spending_basis \?\? "unknown"\}/);
});

test("review FFH-P03 #4: cushion counts only the emergency fund and unassigned cash", () => {
  const snapshot = buildMoneyPrioritySnapshot(exampleHouseholdRaw());
  const earmarked = structuredClone(snapshot);
  earmarked.aggregates.protectedCash = 0;
  earmarked.aggregates.unallocatedCash = 0;
  earmarked.aggregates.earmarkedCash = 10000;
  earmarked.aggregates.debtBackedCash = 500;
  earmarked.aggregates.operatingCash = 700;
  earmarked.aggregates.liquidCash = 11200;
  assert.equal(emergencyAvailableCash(earmarked), 0);
  assert.deepEqual(cushionBadge(earmarked), { kind: "months", months: 0 });
});

test("QA #117: a saved YTD only counts once the account has an owner, and owners stay in the household", () => {
  const ytdMissing = "Employee contributions YTD are required to calculate remaining elective-deferral room.";
  const missingFor = (raw: ReturnType<typeof exampleHouseholdRaw>) => runMoneyPriorityEngine(raw, AS_OF).recommendations.flatMap((r) => r.missingData);
  // No owner: the engine can't attribute the YTD to a person, so it still asks (what QA saw).
  const noOwner = exampleHouseholdRaw();
  noOwner.retirementAccounts = [{ ...noOwner.retirementAccounts![0], owner_person_id: null, employee_contributed_ytd: 500 }];
  assert.ok(missingFor(noOwner).some((text) => text.includes(ytdMissing)));
  assert.ok(missingFor(noOwner).some((text) => /Account owner is required/.test(text)));
  // With an owner the same saved YTD is used and the request disappears.
  const owned = exampleHouseholdRaw();
  owned.retirementAccounts = [{ ...owned.retirementAccounts![0], employee_contributed_ytd: 500 }];
  assert.ok(!missingFor(owned).some((text) => text.includes(ytdMissing)));
  // The owner question is routed to the retirement form, which now has the choice.
  assert.equal(missingItem("Work 401(k): Account owner is required to evaluate catch-up eligibility and shared deferral limits.").href, "/financial-profile#retirement");
  const fields = read("../../components/forms/ProfileFields.tsx");
  assert.match(fields, /<Choice name="owner_person_id" legend="Whose account is this\?"/);
  // Server side: an owner id must be a person in the caller's household (plus the database's composite foreign key).
  const actions = read("../../app/financial-profile/actions.ts");
  assert.match(actions, /from\("household_people"\)\.select\("id"\)\.eq\("id", raw\)\.eq\("household_id", householdId\)\.maybeSingle\(\)/);
  assert.equal((actions.match(/owner_person_id: await ownerPersonId\(supabase, householdId, formData\)/g) ?? []).length, 2);
  assert.match(actions, /const RELATIONSHIPS = \["self", "spouse_partner", "child", "dependent_adult", "other"\] as const;/);
});

test("review FFH-P03 (MEDIUM, #118): an inactive saved owner stays selectable, so an unrelated edit keeps it", () => {
  const fields = read("../../components/forms/ProfileFields.tsx");
  assert.match(fields, /const choices = people\.filter\(\(person\) => person\.is_active !== false \|\| person\.id === owner\);/);
  assert.match(fields, /`\$\{person\.display_name\} \(inactive\)`/);
  assert.match(fields, /defaultValue=\{owner \?\? ""\}/);
  const page = read("../../app/financial-profile/page.tsx");
  // Edit forms get every person (so the saved owner is always an option); new accounts get active people only.
  assert.match(page, /<RetirementFields d=\{item\} isHsa=\{item\.account_type === "hsa"\} people=\{allPeople\} \/>/);
  assert.match(page, /<RetirementFields people=\{people\} \/>/);
});
