// FFH-P10 — Can We Afford It? (issue #171): route protection, server-side authority, read-only surface,
// canonical-only verdicts, separate advisory layer and navigation.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const actions = read("app/what-if/purchase/actions.ts");
const purchasePage = read("app/what-if/purchase/page.tsx");
const hubPage = read("app/what-if/page.tsx");
const workspace = read("app/what-if/purchase/PurchaseCheckWorkspace.tsx");
const execution = read("lib/purchase-check/purchase-check-execution.ts");
const input = read("lib/purchase-check/purchase-check-input.ts");
const guidance = read("lib/purchase-check/guidance.ts");
const presentation = read("lib/purchase-check/purchase-check-presentation.ts");
const proxy = read("lib/supabase/proxy.ts");
const planPage = read("app/plan/page.tsx");
const header = read("components/AppHeader.tsx");
const mobileNav = read("components/MobileNavigation.tsx");
const viewMode = read("lib/profile/view-mode.ts");
const p10Sources = [actions, purchasePage, hubPage, workspace, execution, input, guidance, presentation];

test("FFH-P10 pages are not public: the P08 sign-in, live-session and two-factor gate covers them", () => {
  assert.doesNotMatch(proxy, /what-if/);
  for (const page of [purchasePage, hubPage]) {
    assert.match(page, /resolveScenarioHouseholdAuthority\(\)/);
    assert.match(page, /if \(!authority\.authenticated\) redirect\("\/auth\/login"\)/);
    assert.match(page, /if \(!authority\.householdId\) redirect\("\/onboarding"\)/);
    assert.match(page, /export const dynamic = "force-dynamic"/);
  }
});

test("FFH-P10 the action derives identity and household on the server and accepts no household ID", () => {
  assert.match(actions, /^"use server";/);
  assert.match(actions, /resolveScenarioHouseholdAuthority\(\)/);
  assert.match(actions, /loadSnapshot: loadMoneyPrioritySnapshot/);
  assert.match(actions, /executePurchaseCheck\(input,/);
  assert.doesNotMatch(workspace, /householdId|household_id|user_id/);
  assert.match(input, /\["kind", "baselineFingerprint", "options"\]\.includes\(key\)/);
  assert.match(input, /\["label", "fields"\]\.includes\(key\)/);
  assert.match(execution, /parsed\.baselineFingerprint !== fingerprint/);
});

test("FFH-P10 is read-only: no database writes, RPCs, storage or persistence anywhere in the feature", () => {
  for (const source of p10Sources) {
    assert.doesNotMatch(source, /\.(insert|update|upsert|delete)\(/);
    assert.doesNotMatch(source, /\.rpc\(/);
    assert.doesNotMatch(source, /\.from\(/);
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
    assert.doesNotMatch(source, /revalidatePath|revalidateTag/);
  }
  assert.doesNotMatch(workspace, /fetch\(/);
  assert.match(purchasePage, /nothing is saved/);
});

test("FFH-P10 verdicts come only from the canonical Scenario Lab adapters; no second affordability engine", () => {
  assert.match(execution, /runHomeScenarioAdapter\(engine,/);
  assert.match(execution, /runVehicleScenarioAdapter\(engine,/);
  assert.match(execution, /canonical: adapter\.result/);
  for (const source of [execution, input, guidance, presentation, workspace]) {
    assert.doesNotMatch(source, /evaluateHomeAffordability|evaluateVehicleAffordability|runHypotheticalMoneyPriorityEngine/);
    assert.doesNotMatch(source, /mortgagePayment\(|calculatePayment\(|Math\.pow/);
  }
  // The advisory layer never assigns to or returns a verdict.
  assert.doesNotMatch(guidance, /overallAffordability\s*=|affordability\s*=|purchaseReadiness|ongoingAffordability/);
});

test("FFH-P10 guidance is separate, source-attributed, nonblocking and honest about missing inputs", () => {
  for (const id of ["housing_28", "debt_36", "vehicle_down_20", "vehicle_term_36", "vehicle_payments_8", "vehicle_value_50", "emergency_reserve"]) {
    assert.ok(guidance.includes(`"${id}"`), id);
  }
  for (const url of [
    "https://yourhome.fanniemae.com/calculators-tools/glossary-key-terms",
    "https://moneyguy.com/guide/20-3-8-rule/",
    "https://www.ramseysolutions.com/saving/how-much-car-can-i-afford/",
    "https://www.consumerfinance.gov/owning-a-home/prepare/determine-your-down-payment/",
  ]) assert.ok(guidance.includes(url), url);
  assert.match(guidance, /laws or lending requirements/);
  assert.match(guidance, /insufficient_information/);
  assert.match(workspace, /Meeting a rule of thumb does not make a purchase affordable/);
  assert.match(workspace, /rel="noopener noreferrer"/);
  assert.match(presentation, /insufficient_information: "Insufficient information"/);
});

test("FFH-P10 blank optional costs are parsed as unknown, never as zero", () => {
  assert.match(input, /if \(text === ""\) return null;/);
  assert.match(input, /Optional amount: blank -> null \(unknown, never zero\)/);
  assert.match(workspace, /it stays unknown, never zero/);
});

test("FFH-P10 navigation: What if? replaces the Scenario Lab tab, Scenario Lab stays under Tools, Simple view keeps What if?", () => {
  assert.match(header, /\["What if\?", "\/what-if"\]/);
  assert.doesNotMatch(header, /\["Scenario Lab", "\/scenario-lab"\]/);
  assert.match(mobileNav, /href: "\/what-if", label: "What if\?"/);
  assert.match(viewMode, /SIMPLE_NAV_PATHS = \["\/plan", "\/dashboard", "\/financial-profile", "\/what-if"\]/);
  assert.match(viewMode, /DETAILED_ONLY_PREFIXES = \["\/planning", "\/scenario-lab"/);
  assert.match(hubPage, /href="\/scenario-lab"/);
  assert.match(hubPage, /<p className="eyebrow">Tools<\/p>/);
  assert.match(planPage, /href="\/what-if\/purchase\?type=home"/);
  assert.match(planPage, /href="\/what-if\/purchase\?type=vehicle"/);
});

test("FFH-P10 needs no new migration or persistent scenario table", () => {
  const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url));
  assert.equal(migrations.filter((name) => /purchase|afford|what.?if|scenario/i.test(name)).length, 0);
});

test("FFH-P10 a failed or redirected action shows a fixed message (no crash) and edited entries mark results out of date", () => {
  assert.match(workspace, /try \{\s*const result = await runPurchaseCheckAction/);
  assert.match(workspace, /\} catch \{[\s\S]*setFailed\(true\)/);
  assert.match(workspace, /The check didn&apos;t run/);
  assert.match(workspace, /const outdated = response\?\.status === "ok" && checkedEntries !== null && checkedEntries !== JSON\.stringify\(options\)/);
  assert.match(execution, /instanceof MoneyPrioritySnapshotValidationError\)\) throw error/);
});

test("FFH-P10 audit P10-01/P10-03: the guided form pre-answers nothing", () => {
  assert.match(workspace, /for \(const field of section\.fields\) fields\[field\.name\] = "";/);
  assert.doesNotMatch(workspace, /fields\.termYears = "30"/);
  for (const name of ["rateType", "hasBalloonPayment", "allowsNegativeAmortization", "mortgageInsuranceType", "currentHousingEnds", "needType"]) {
    assert.match(workspace, new RegExp(`name: "${name}"[^\\n]*required: true[^\\n]*\\["", "Choose…"\\]`), name);
  }
  assert.match(workspace, /\["unsure", "Not sure yet"\]/);
  assert.match(input, /requiredMoney\("maintenanceMonthly"/);
});
