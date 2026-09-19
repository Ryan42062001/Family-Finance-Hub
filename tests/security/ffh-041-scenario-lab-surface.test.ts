import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../../app/scenario-lab/page.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../../app/scenario-lab/actions.ts", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../app/scenario-lab/ScenarioLabWorkspace.tsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../../lib/scenarios/scenario-auth.ts", import.meta.url), "utf8");
const execution = readFileSync(new URL("../../lib/scenarios/scenario-execution.ts", import.meta.url), "utf8");
const fingerprint = readFileSync(new URL("../../lib/scenarios/scenario-fingerprint.ts", import.meta.url), "utf8");
const drafts = readFileSync(new URL("../../lib/scenarios/scenario-drafts.ts", import.meta.url), "utf8");
const coreDefinition = readFileSync(new URL("../../lib/scenarios/scenario-definition.ts", import.meta.url), "utf8");

const surface = [page, actions, workspace, auth, execution, fingerprint, drafts].join("\n");

test("FFH-041 authenticates and derives household authority server-side", () => {
  assert.match(page, /resolveScenarioHouseholdAuthority\(\)/);
  assert.match(page, /if \(!authority\.authenticated\) redirect\("\/auth\/login"\)/);
  assert.match(auth, /auth\.getClaims\(\)/);
  assert.match(auth, /from\("household_members"\)/);
  assert.match(auth, /\.eq\("user_id", userId\)/);
  assert.match(execution, /resolveAuthority\(\)/);
  assert.match(execution, /loadSnapshot\(authority\.householdId\)/);
  assert.doesNotMatch(actions, /householdId\s*:/);
});

test("FFH-041 has no Scenario Lab persistence or live-data write surface", () => {
  assert.doesNotMatch(surface, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(surface, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/);
  assert.doesNotMatch(surface, /supabase\/migrations|create table|alter table|create policy/i);
  assert.doesNotMatch(surface, /Apply Scenario|Save to Profile|Commit Scenario/i);
});

test("FFH-041 server run boundary reloads baseline, stale-checks, validates Core definition, then invokes accepted runner", () => {
  assert.match(execution, /currentBaseline\(dependencies\)/);
  assert.match(execution, /staleSubmission\(transport\.parsed, current\.baseline\)/);
  assert.match(execution, /validateScenarioDefinition\(transport\.parsed\.definition, current\.engine\.snapshot\)/);
  assert.match(execution, /runMoneyPriorityScenario\(baselineEngine, definition\)/);
  assert.match(fingerprint, /createHash\("sha256"\)/);
  assert.match(fingerprint, /scenario-basis-v1/);
});

test("FFH-041 UI does not expose protected legal/statutory Scenario Lab editors", () => {
  for (const protectedToken of [
    "hsaEligible", "hsaCoverageType", "hsaYtdTaxYear", "employeeContributedYtd",
    "employerContributedYtd", "simplePlanLimitCategory", "simplePlanLimitTaxYear",
    "estimatedTaxableCompensationAnnual", "taxFilingStatus", "estimatedModifiedAgi",
  ]) {
    assert.doesNotMatch(workspace, new RegExp(protectedToken, "i"));
    assert.ok(coreDefinition.includes(protectedToken), protectedToken);
  }
  assert.match(coreDefinition, /code: protectedField \? "protected_field"/);
});

test("FFH-041 exposes the bounded generic editor categories and explicit units", () => {
  for (const label of [
    "Income / paycheck change", "Additional recurring income", "Recurring expense change",
    "Childcare recurring expense", "Debt balance / payment / APR", "Cash-funded debt payoff",
    "Goal amount / date / priority / contribution", "Scheduled retirement contribution",
    "Planned retirement age", "Insurance exposure assumption", "Planning preferences",
    "Job loss / temporary income reduction", "One-time cash inflow", "One-time generic cash use",
    "Cash-impact-only medical expense",
  ]) assert.ok(workspace.includes(label), label);
  assert.match(workspace, /USD\/month/);
  assert.match(workspace, /USD\/year/);
  assert.match(workspace, /APR \(percent/);
});

test("FFH-041 workspace is keyboard/mobile accessible without color-only or drag-only controls", () => {
  assert.match(workspace, /<label>/);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /role="status"/);
  assert.match(workspace, /role="alert"/);
  assert.match(workspace, /tabIndex=\{-1\}/);
  assert.match(workspace, /beforeunload/);
  assert.match(workspace, /type="button"/);
  assert.doesNotMatch(workspace, /draggable|onDrag|<table/i);
});

test("FFH-041 keeps diagnostics free of household financial/scenario values by emitting no application logs", () => {
  assert.doesNotMatch(surface, /console\.(log|info|warn|error)|logger\.|logEvent\(/);
});
