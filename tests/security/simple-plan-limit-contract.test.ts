import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../../supabase/migrations/20260909033000_ffh_011_simple_plan_limit_contract.sql", import.meta.url), "utf8");
const snapshot = readFileSync(new URL("../../lib/calculations/money-priority-snapshot.ts", import.meta.url), "utf8");
const loader = readFileSync(new URL("../../lib/supabase/money-priority-snapshot.ts", import.meta.url), "utf8");
const actions = readFileSync(new URL("../../app/financial-profile/simple/actions.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../../app/financial-profile/simple/page.tsx", import.meta.url), "utf8");
const hypothetical = readFileSync(new URL("../../lib/calculations/money-priority-hypothetical.ts", import.meta.url), "utf8");
const rawAdapter = readFileSync(new URL("../../lib/calculations/money-priority-raw-adapter.ts", import.meta.url), "utf8");

test("FFH-011 adds an explicit tax-year-bound SIMPLE plan category without backfilling legacy hints", () => {
  assert.match(migration, /add column if not exists simple_plan_limit_category text null/i);
  assert.match(migration, /add column if not exists simple_plan_limit_tax_year smallint null/i);
  assert.match(migration, /simple_plan_limit_category in \('standard', 'certain_applicable_higher'\)/i);
  assert.match(migration, /account_type = 'simple_ira'/i);
  assert.match(migration, /simple_plan_limit_tax_year between 1900 and 9999/i);
  assert.match(migration, /Legacy ambiguous SIMPLE higher-limit hint only/i);
  assert.doesNotMatch(migration, /update\s+public\.retirement_accounts[\s\S]*simple_higher_limit_eligible/i);
});

test("prospective capture is explicit and never rewrites or infers the legacy boolean", () => {
  assert.match(actions, /SIMPLE_PLAN_LIMIT_CATEGORIES = \["standard", "certain_applicable_higher"\]/);
  assert.match(actions, /simple_plan_limit_category: selectedCategory/);
  assert.match(actions, /simple_plan_limit_tax_year: taxYear\(formData\)/);
  assert.match(actions, /\.eq\("account_type", "simple_ira"\)/);
  assert.doesNotMatch(actions, /simple_higher_limit_eligible\s*:/);
  assert.doesNotMatch(actions, /employee_count|employeeCount|account\.name|simple_higher_limit_eligible/i);
});

test("capture UI labels the old boolean as a legacy hint and requires plan documentation for the higher category", () => {
  assert.match(page, /legacy hint only/i);
  assert.match(page, /Certain applicable SIMPLE higher limit/i);
  assert.match(page, /employer or plan documentation confirms/i);
  assert.match(page, /Do not infer it from the account name, employee count, or the legacy hint/i);
  assert.match(page, /Not confirmed \/ unknown/i);
});

test("loader and normalized snapshot carry the new contract while the legacy boolean is not directly promoted", () => {
  assert.match(loader, /simple_plan_limit_category/);
  assert.match(loader, /simple_plan_limit_tax_year/);
  assert.match(snapshot, /simplePlanLimitCategory\?: SimplePlanLimitCategory \| null/);
  assert.match(snapshot, /simplePlanLimitTaxYear\?: number \| null/);
  assert.match(snapshot, /nullableString\(row\.simple_plan_limit_category\)/);
  assert.match(snapshot, /nullableNumber\(row\.simple_plan_limit_tax_year\)/);
  assert.match(snapshot, /simplePlanLimitCategory,\s*\n\s*simplePlanLimitTaxYear,/);
  assert.doesNotMatch(snapshot, /simpleHigherLimitEligible: nullableBoolean\(row\.simple_higher_limit_eligible\)/);
  assert.match(snapshot, /simplePlanLimitCategory === "standard" \? false : null/);
});

test("hypothetical reruns preserve only the explicit SIMPLE contract for decisions", () => {
  assert.match(hypothetical, /moneyPrioritySnapshotToRaw\(current\.snapshot\)/);
  assert.match(rawAdapter, /simple_plan_limit_category: item\.simplePlanLimitCategory/);
  assert.match(rawAdapter, /simple_plan_limit_tax_year: item\.simplePlanLimitTaxYear/);
  assert.match(rawAdapter, /simple_higher_limit_eligible: item\.simpleHigherLimitEligible/);
});
