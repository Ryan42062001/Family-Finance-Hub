import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const snapshot = readFileSync(new URL("../../lib/supabase/money-priority-snapshot.ts", import.meta.url), "utf8");
const scenarioAuth = readFileSync(new URL("../../lib/scenarios/scenario-auth.ts", import.meta.url), "utf8");
const scenarioActions = readFileSync(new URL("../../app/scenario-lab/actions.ts", import.meta.url), "utf8");
const scenarioPage = readFileSync(new URL("../../app/scenario-lab/page.tsx", import.meta.url), "utf8");
const scenarioSurface = [scenarioActions, scenarioPage].join("\n");

const snapshotTables = [
  "household_people",
  "income_sources",
  "expenses",
  "accounts",
  "debts",
  "retirement_accounts",
  "goals",
  "insurance_exposures",
  "household_financial_preferences",
  "person_hsa_tax_year_profiles",
  "person_hsa_month_statuses",
  "household_hsa_married_allocations",
  "household_hsa_legal_spouse_authorities",
] as const;

test("FFH-P01 scopes every Scenario Lab snapshot relation to the server-derived household", () => {
  for (const table of snapshotTables) {
    const query = new RegExp(`from\\("${table}"\\)[^\\n]+\\.eq\\("household_id", householdId\\)`);
    assert.match(snapshot, query, table);
  }
  assert.equal((snapshot.match(/\.eq\("household_id", householdId\)/g) ?? []).length, snapshotTables.length);
});

test("FFH-P01 derives Scenario Lab household authority from authenticated membership", () => {
  assert.match(scenarioAuth, /auth\.getClaims\(\)/);
  assert.match(scenarioAuth, /from\("household_members"\)/);
  assert.match(scenarioAuth, /\.eq\("user_id", userId\)/);
  assert.match(scenarioActions, /loadSnapshot: loadMoneyPrioritySnapshot/);
  assert.doesNotMatch(scenarioSurface, /input\.householdId|formData\.get\([^)]*household/i);
});

test("FFH-P01 keeps Scenario Lab ephemeral and free of live-data mutations", () => {
  assert.doesNotMatch(scenarioSurface, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(scenarioSurface, /\.(?:insert|upsert|update|delete)\s*\(/);
  assert.doesNotMatch(scenarioSurface, /Save to Profile|Apply Scenario|Commit Scenario/i);
});
