import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../../app/scenario-lab/ScenarioLabWorkspace.tsx", import.meta.url), "utf8");
const controls = readFileSync(new URL("../../app/scenario-lab/SpecializedScenarioControls.tsx", import.meta.url), "utf8");
const result = readFileSync(new URL("../../app/scenario-lab/SpecializedScenarioResult.tsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../../app/scenario-lab/actions.ts", import.meta.url), "utf8");
const execution = readFileSync(new URL("../../lib/scenarios/scenario-specialized-execution.ts", import.meta.url), "utf8");
const drafts = readFileSync(new URL("../../lib/scenarios/scenario-drafts.ts", import.meta.url), "utf8");

const surface = [workspace, controls, result, actions, execution, drafts].join("\n");

test("FFH-043 preserves server-derived household authority and stale fail-closed ordering", () => {
  assert.match(execution, /resolveAuthority\(\)/);
  assert.match(execution, /loadSnapshot\(authority\.householdId\)/);
  assert.match(execution, /staleSubmission\(transport\.parsed, current\.baseline\)/);
  assert.match(execution, /runSpecializedScenario\(current\.engine, definition\)/);
  assert.doesNotMatch(actions, /input\.householdId|formData\.get\([^)]*household/i);
});

test("FFH-043 has no specialized persistence, profile-write, schema, or browser-storage path", () => {
  assert.doesNotMatch(surface, /localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(surface, /\.(?:insert|upsert|delete)\s*\(/);
  assert.doesNotMatch(surface, /\.from\([^)]*\)[\s\S]{0,300}\.update\s*\(/);
  assert.doesNotMatch(surface, /create table|alter table|create policy|supabase\/migrations/i);
  assert.doesNotMatch(surface, /Apply Scenario|Save to Profile|Commit Scenario/i);
});

test("FFH-043 exposes accepted Home, Vehicle, Windfall and Your Plan controls with explicit units", () => {
  for (const label of [
    "Home purchase", "Vehicle purchase", "Windfall", "Purchase price (USD)",
    "Mortgage interest rate (percent)", "Cash down payment (USD)",
    "Gross windfall amount (USD)", "Known tax liability (USD, optional)",
    "Your Plan amount (USD/month)", "Related goal stable ID", "Independent event ID",
  ]) assert.ok(controls.includes(label), label);
});

test("FFH-043 rebase refreshes bootstrap entity options rather than retargeting by display name", () => {
  assert.match(execution, /bootstrap: scenarioLabBootstrap\(current\.engine\)/);
  assert.match(execution, /missingStableReferences/);
  assert.match(workspace, /setBaseline\(result\.bootstrap\)/);
  assert.doesNotMatch(execution, /find\([^\n]*name|displayName/);
});

test("FFH-043 preserves structured conflict and Your Plan statuses in accessible result presentation", () => {
  assert.match(result, /role="alert"/);
  assert.match(result, /Scenario composition conflicts/);
  assert.match(result, /Active:/);
  assert.match(result, /Superseded:/);
  assert.match(result, /Invalid:/);
  assert.match(workspace, /aria-live="polite"/);
  assert.doesNotMatch(surface, /draggable|onDrag|<table/i);
});

test("FFH-043 keeps baseline plus at most two in-memory drafts", () => {
  assert.match(workspace, /drafts\.length >= 2/);
  assert.match(workspace, /Build up to two what-if scenarios/);
  assert.match(drafts, /specializedResult: null/);
});
