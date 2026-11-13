import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { checkTarget, credentialsFrom, leakedMarkers, localhostAllowed, PAGES } from "../../scripts/e2e/isolation.mjs";

const PREVIEW = "https://family-finance-hub-preview.vercel.app/";
const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const workflow = ci.slice(ci.indexOf("\n  e2e-isolation:"));
const script = readFileSync(new URL("../../scripts/e2e/isolation.mjs", import.meta.url), "utf8");

test("FFH-P04 only the fixed Preview origin is a valid target", () => {
  assert.deepEqual(checkTarget(PREVIEW), { ok: true, origin: "https://family-finance-hub-preview.vercel.app" });
  for (const production of ["https://family-finance-hub-taupe.vercel.app/", "https://family-finance-hub-ten-brown.vercel.app/", "https://family-finance-hub-ten.vercel.app/"]) {
    const result = checkTarget(production);
    assert.equal(result.ok, false, production);
    if (!result.ok) assert.match(result.reason, /Production/);
  }
  assert.equal(checkTarget("https://example.com/").ok, false);
  assert.equal(checkTarget("http://family-finance-hub-preview.vercel.app/").ok, false);
  assert.equal(checkTarget(`${PREVIEW}dashboard`).ok, false);
  assert.equal(checkTarget(`${PREVIEW}?x=1`).ok, false);
  assert.equal(checkTarget("").ok, false);
  assert.equal(checkTarget("not a url").ok, false);
});

test("FFH-P04 localhost is only for an explicit local rehearsal, never in CI", () => {
  assert.equal(checkTarget("http://localhost:3999/").ok, false);
  assert.equal(checkTarget("http://localhost:3999/", { FFH_E2E_ALLOW_LOCALHOST: "1" }).ok, true);
  assert.equal(checkTarget("http://localhost:3999/", { FFH_E2E_ALLOW_LOCALHOST: "1", GITHUB_ACTIONS: "true" }).ok, false);
  assert.equal(checkTarget("http://localhost:3999/", { FFH_E2E_ALLOW_LOCALHOST: "1", CI: "true" }).ok, false);
  assert.equal(localhostAllowed({ FFH_E2E_ALLOW_LOCALHOST: "true" }), false);
  assert.doesNotMatch(workflow, /FFH_E2E_ALLOW_LOCALHOST/);
});

test("FFH-P04 credentials come only from the four secrets and fail closed when any is missing", () => {
  const full = { FFH_E2E_A_EMAIL: "a@synthetic.invalid", FFH_E2E_A_PASSWORD: "x", FFH_E2E_B_EMAIL: "b@synthetic.invalid", FFH_E2E_B_PASSWORD: "y" };
  assert.equal(credentialsFrom(full).ok, true);
  for (const name of Object.keys(full)) {
    const result = credentialsFrom({ ...full, [name]: "  " });
    assert.equal(result.ok, false);
    if (!result.ok) assert.deepEqual(result.missing, [name]);
  }
});

test("FFH-P04 leak detection finds the other household's markers case-insensitively", () => {
  assert.deepEqual(leakedMarkers("Welcome, Alpha household · ZZ-A-Rent", ["Bravo Household", "ZZ-B-", "b@synthetic.invalid"]), []);
  assert.deepEqual(leakedMarkers("bravo HOUSEHOLD and zz-b-groceries", ["Bravo Household", "ZZ-B-", ""]), ["Bravo Household", "ZZ-B-"]);
  assert.deepEqual(PAGES, ["/plan", "/dashboard", "/financial-profile", "/planning", "/scenario-lab"]);
});

test("FFH-P04 the suite never prints credentials or records traces and is read-only", () => {
  assert.doesNotMatch(script, /console\.(log|error)\([^)]*(password|\.email\b)/i);
  assert.doesNotMatch(script, /\.screenshot\(|tracing\.start|recordVideo|storageState/);
  assert.doesNotMatch(script, /method:\s*["'](POST|PUT|PATCH|DELETE)/i);
});

test("FFH-P04 workflow waits for this commit's Preview, reads secrets only in its steps, and never targets Production", () => {
  assert.ok(workflow.length > 100, "the e2e-isolation job exists in ci.yml");
  assert.match(workflow, /if: github\.event_name == 'push' && startsWith\(github\.ref, 'refs\/heads\/phase\/'\)/);
  assert.match(workflow, /permissions:\n      contents: read\n      deployments: read\n/);
  assert.match(ci, /^permissions:\n  contents: read\n/m);
  assert.match(workflow, /deployments\?sha=\$SHA/);
  assert.match(workflow, /PREVIEW_URL: https:\/\/family-finance-hub-preview\.vercel\.app\//);
  assert.doesNotMatch(workflow, /taupe|ten-brown/);
  assert.doesNotMatch(workflow, /set -x|echo .*secrets\./);
  assert.match(workflow, /--negative-control/);
});
