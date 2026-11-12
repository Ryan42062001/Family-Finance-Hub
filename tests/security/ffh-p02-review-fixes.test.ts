import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { balanceBar } from "../../lib/formatting/balance-bar.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("assets/debt bar never draws a misleading ratio", () => {
  assert.deepEqual(balanceBar(0, 0), { kind: "empty" });
  assert.deepEqual(balanceBar(-100, 300), { kind: "unavailable" });
  assert.deepEqual(balanceBar(100, -1), { kind: "unavailable" });
  assert.deepEqual(balanceBar(Number.NaN, 0), { kind: "unavailable" });
  assert.deepEqual(balanceBar(Number.POSITIVE_INFINITY, 0), { kind: "unavailable" });
  assert.deepEqual(balanceBar(300, 100), { kind: "share", assetShare: 0.75 });
  assert.deepEqual(balanceBar(0, 500), { kind: "share", assetShare: 0 });
  const css = read("../../app/globals.css");
  assert.match(css, /\.balance-bar-empty\{background:var\(--surface-sunken\)\}/);
});

test("smoke test only reports BLOCKED on Vercel evidence, not on an app 401/403 at /dashboard", () => {
  const smoke = read("../../scripts/smoke/deployed-auth-smoke.mjs");
  assert.match(smoke, /probe\.status === 401 \|\| probe\.status === 403 \|\| vercelLoginRedirect\(probe\)/);
  assert.match(smoke, /vercelLoginRedirect\(protectedProbe\)/);
  assert.doesNotMatch(smoke, /protectedProbe\.status === 40[13]/);
});

test("fixed sidebar scrolls on short viewports so bottom controls stay reachable", () => {
  const css = read("../../app/globals.css");
  assert.match(css, /\.site-header\.app-sidebar\{overflow-y:auto/);
});
