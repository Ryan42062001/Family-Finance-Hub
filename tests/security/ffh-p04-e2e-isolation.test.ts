import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { browserLaunchOptions, buildMatches, checkTarget, CONTEXT_OPTIONS, WEBRTC_TRAP, credentialsFrom, identityMatches, leakedMarkers, leavesOrigin, localhostAllowed, PAGES } from "../../scripts/e2e/isolation.mjs";

const PREVIEW = "https://family-finance-hub-preview.vercel.app/";
const ci = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const workflow = ci.slice(ci.indexOf("\n  e2e-isolation:"));
const script = readFileSync(new URL("../../scripts/e2e/isolation.mjs", import.meta.url), "utf8");
const buildInfoRoute = readFileSync(new URL("../../app/api/build-info/route.ts", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../../lib/supabase/proxy.ts", import.meta.url), "utf8");
const SHA = "79bcc52872e2df769d8438628fee12a6b75c0d10";

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
  assert.deepEqual(PAGES, ["/plan", "/dashboard", "/financial-profile", "/goals", "/planning", "/scenario-lab"]);
});

test("FFH-P04 the suite never prints credentials or records traces and is read-only", () => {
  assert.doesNotMatch(script, /console\.(log|error)\([^)]*\$\{[^}]*(password|email)/i);
  assert.doesNotMatch(script, /\.screenshot\(|tracing\.start|recordVideo|storageState/);
  assert.doesNotMatch(script, /method:\s*["'](POST|PUT|PATCH|DELETE)/i);
});

test("FFH-P04 workflow waits for this commit's Preview, reads secrets only in its steps, and never targets Production", () => {
  assert.ok(workflow.length > 100, "the e2e-isolation job exists in ci.yml");
  assert.match(workflow, /if: github\.event_name == 'push' && startsWith\(github\.ref, 'refs\/heads\/phase\/'\)/);
  assert.match(workflow, /permissions:\n      contents: read\n      statuses: read\n/);
  assert.match(ci, /^permissions:\n  contents: read\n/m);
  assert.match(workflow, /commits\/\$SHA\/statuses/);
  assert.match(workflow, /startswith\("Vercel"\)/);
  assert.doesNotMatch(ci, /deploy/i);
  assert.match(workflow, /PREVIEW_URL: https:\/\/family-finance-hub-preview\.vercel\.app\//);
  assert.doesNotMatch(workflow, /taupe|ten-brown/);
  assert.doesNotMatch(workflow, /set -x|echo .*secrets\./);
  assert.match(workflow, /--negative-control/);
});

test("FFH-P04 review fix: nothing is tested unless the address serves this exact commit as a Preview", () => {
  assert.equal(buildMatches({ commit: SHA, environment: "preview" }, SHA), true);
  assert.equal(buildMatches({ commit: SHA, environment: "production" }, SHA), false);
  assert.equal(buildMatches({ commit: "a".repeat(40), environment: "preview" }, SHA), false);
  assert.equal(buildMatches({ commit: null, environment: "preview" }, SHA), false);
  assert.equal(buildMatches({ commit: SHA.slice(0, 7), environment: "preview" }, SHA.slice(0, 7)), false);
  assert.equal(buildMatches(null, SHA), false);
  // The real Preview always requires the expected commit; only a local rehearsal may skip it.
  assert.match(script, /if \(!target\.local \|\| expectedSha\)/);
  assert.match(script, /FFH_E2E_EXPECTED_SHA \(the commit under test\) is missing/);
  assert.equal((workflow.match(/FFH_E2E_EXPECTED_SHA: \$\{\{ github\.sha \}\}/g) ?? []).length, 2);
  // The build check happens before any browser or credential is used.
  assert.ok(script.indexOf("verifyBuild(target.origin, expectedSha)") < script.indexOf("chromium.launch("));
});

test("FFH-P04 review fix: build-info exposes only build metadata and is public", () => {
  assert.match(buildInfoRoute, /export const dynamic = "force-static"/);
  assert.match(buildInfoRoute, /commit: process\.env\.VERCEL_GIT_COMMIT_SHA \?\? null/);
  assert.match(buildInfoRoute, /environment: process\.env\.VERCEL_ENV \?\? null/);
  assert.doesNotMatch(buildInfoRoute, /supabase|cookies|headers\(|SUPABASE|KEY|SECRET|TOKEN/);
  assert.equal((buildInfoRoute.match(/process\.env\./g) ?? []).length, 2);
  assert.match(proxy, /path === "\/api\/build-info"/);
});

test("FFH-P04 review fix: navigation and submissions can never leave the tested origin", () => {
  const origin = "https://family-finance-hub-preview.vercel.app";
  assert.equal(leavesOrigin(`${origin}/auth/login`, origin), false);
  for (const elsewhere of ["https://family-finance-hub-taupe.vercel.app/auth/login", "http://family-finance-hub-preview.vercel.app/", "https://family-finance-hub-preview.vercel.app.evil.example/", "not a url"]) {
    assert.equal(leavesOrigin(elsewhere, origin), true, elsewhere);
  }
  // The guard is installed before the first page opens, fetches sensitive requests without following redirects, and
  // the login form is checked before any credential is typed.
  assert.ok(script.indexOf("await installOriginGuard(context, origin, violations);") < script.indexOf("await signIn(context, origin, account, violations)"));
  assert.match(script, /route\.fetch\(\{ maxRedirects: 0 \}\)/);
  assert.match(script, /request\.isNavigationRequest\(\) \|\| request\.method\(\) !== "GET"/);
  assert.ok(script.indexOf("const formAction =") < script.indexOf('page.fill(\'input[name="email"]\''));
  assert.match(script, /"REFUSED: the site tried to reach another address\. Every such attempt was blocked and nothing was concluded\. Rotate the TestA\/TestB passwords\."/);
});

test("FFH-P04 review fix: the negative control exercises the real identity and leak checks", () => {
  assert.equal(identityMatches("A@Synthetic.invalid ", "a@synthetic.invalid"), true);
  assert.equal(identityMatches("a@synthetic.invalid", "b@synthetic.invalid"), false);
  assert.equal(identityMatches("", "a@synthetic.invalid"), false);
  assert.match(script, /record\(`\$\{who\} is signed in as itself`, identityMatches\(run\.email, account\.email\)/);
  assert.match(script, /!identityMatches\(a\.email, creds\.b\.email\) && !identityMatches\(b\.email, creds\.a\.email\)/);
  assert.match(script, /leakedMarkers\(a\.pages\["\/dashboard"\]\.text, \[a\.householdName\]\)\.length > 0/);
});

test("FFH-P04 re-review fix: every request to another origin is blocked, whatever its method or type", () => {
  // The origin check comes first and does not depend on method or navigation type.
  const guard = script.slice(script.indexOf("async function installOriginGuard"), script.indexOf("async function assertOnOrigin"));
  assert.ok(guard.indexOf("if (leavesOrigin(request.url(), origin))") < guard.indexOf("const sensitive ="));
  assert.match(guard, /if \(leavesOrigin\(request\.url\(\), origin\)\) \{\n\s+violations\.push\("request"\);\n\s+return route\.abort\("blockedbyclient"\);/);
  assert.doesNotMatch(guard, /leavesOrigin[^\n]*\n[^\n]*route\.continue/);
  assert.match(guard, /context\.routeWebSocket\(\(url\) => leavesOrigin\(url\.href, origin\)/);
  // Any blocked request makes the whole run REFUSED, even if the page otherwise worked.
  assert.match(script, /if \(violations\.length\) throw new OriginViolation\(violations\);\n\s+return \{ signedIn: true/);
  // The login form must post to the same origin; no javascript: exception.
  assert.doesNotMatch(script, /javascript:/);
  assert.match(script, /if \(!formAction \|\| leavesOrigin\(formAction, origin\)\)/);
});

test("FFH-P04 re-review fix: a browser-level boundary backs up the request guard", () => {
  const options = browserLaunchOptions("https://family-finance-hub-preview.vercel.app");
  assert.deepEqual(options.proxy, { server: "http://127.0.0.1:9", bypass: "family-finance-hub-preview.vercel.app" });
  assert.ok(options.args.includes("--dns-prefetch-disable"));
  assert.equal(CONTEXT_OPTIONS.serviceWorkers, "block");
  assert.equal(CONTEXT_OPTIONS.extraHTTPHeaders["x-vercel-skip-toolbar"], "1");
  assert.match(script, /chromium\.launch\(browserLaunchOptions\(target\.origin\)\)/);
  assert.match(script, /browser\.newContext\(CONTEXT_OPTIONS\)/);
});

test("FFH-P04 re-review fix: the build is re-checked after each account, and a change stops the run", () => {
  const run = script.slice(script.indexOf("a = await runAccount("), script.indexOf("} catch (error) {\n    await browser.close();"));
  assert.match(run, /a = await runAccount\(browser, target\.origin, creds\.a\);\n\s+if \(await buildDrifted\(\)\) throw new BuildDrift\(\);\n\s+b = await runAccount\(browser, target\.origin, creds\.b\);\n\s+if \(await buildDrifted\(\)\) throw new BuildDrift\(\);/);
  assert.match(script, /BLOCKED: the Preview address stopped serving/);
});

test("FFH-P04 second re-review fix: WebRTC is trapped in every frame and confined to the dead proxy", () => {
  for (const name of ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCDataChannel"]) assert.ok(WEBRTC_TRAP.includes(`"${name}"`), name);
  assert.match(WEBRTC_TRAP, /writable: false, configurable: false/);
  assert.match(WEBRTC_TRAP, /window\.__ffhWebrtcAttempt\(name\)/);
  assert.match(WEBRTC_TRAP, /throw new Error\("WebRTC is disabled in this test browser"\)/);
  const { args } = browserLaunchOptions("https://family-finance-hub-preview.vercel.app");
  assert.ok(args.includes("--force-webrtc-ip-handling-policy=disable_non_proxied_udp"));
  const guard = script.slice(script.indexOf("async function installOriginGuard"), script.indexOf("async function assertOnOrigin"));
  assert.match(guard, /context\.exposeBinding\("__ffhWebrtcAttempt", \(\) => \{ violations\.push\("webrtc"\); \}\)/);
  assert.match(guard, /context\.addInitScript\(WEBRTC_TRAP\)/);
});

test("FFH-P04 second re-review fix: every request and redirect hop leaving the origin is recorded", () => {
  const guard = script.slice(script.indexOf("async function installOriginGuard"), script.indexOf("async function assertOnOrigin"));
  assert.match(guard, /context\.on\("request", \(request\) => \{\n\s+if \(leavesOrigin\(request\.url\(\), origin\)\) violations\.push\("request"\);/);
  // Recording is installed before routing, so it is in place for the very first request.
  assert.ok(guard.indexOf('context.on("request"') < guard.indexOf('context.route("**/*"'));
});

test("FFH-P04 third and fourth re-review fix: nothing the tested site can choose is ever printed", () => {
  // Every violation is recorded as a fixed kind, never as a host, URL or path, and kinds are never printed.
  const pushes = [...script.matchAll(/violations\.push\(([^)]*)\)/g)].map((match) => match[1]);
  assert.ok(pushes.length >= 5);
  for (const pushed of pushes) assert.match(pushed, /^"(request|redirect|websocket|webrtc)"$/, pushed);
  assert.doesNotMatch(script, /hostOf|\.hosts\b|describeViolations|describeBuild|safeErrorKind/);

  // Every value interpolated into output is on this list: our own labels and constants, the CI-supplied commit,
  // the missing secret NAMES, and PASS/FAIL verdicts with their totals. No site-chosen string or number (status
  // code, count of attempts or markers, kinds, paths, URLs, build metadata, error text) is on it.
  const allowed = new Set([
    'ok ? "PASS" : "FAIL"', "name", 'ok || !detail ? "" : `  -> ${detail}`', "detail", "target.reason",
    'creds.missing.join(", ")', "expectedSha.slice(0, 7)", 'identityRuleWorks ? "PASS" : "FAIL"',
    'leakRuleWorks ? "PASS" : "FAIL"', "who", "path", "other.label", 'failed ? "FAIL" : "PASS"',
    "results.length - failed", "results.length",
  ]);
  const outputLines = script.split("\n").filter((line) => /console\.(log|error)\(|record\(`/.test(line));
  assert.ok(outputLines.length >= 20);
  for (const line of outputLines) {
    for (const [, expression] of line.matchAll(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
      assert.ok(allowed.has(expression), `unapproved value in output: ${expression}`);
    }
  }
  // A record() failure detail is always a fixed literal, never a variable.
  for (const line of outputLines.filter((line) => line.includes("record(`"))) {
    const detail = line.match(/,\s*([^,]+)\);\s*$/)?.[1]?.trim() ?? "";
    const hasDetail = (line.match(/,/g) ?? []).length >= 2;
    if (hasDetail) assert.match(detail, /^("[^"$]*"|`[^`]*`)$/, `record detail must be a literal: ${line.trim()}`);
  }
  assert.doesNotMatch(script, /pageResult\.status\)|kinds\.length|leaks\.length\}/);

  // Unexpected crashes print a fixed message, never the raw error.
  assert.match(script, /process\.on\("uncaughtException", crash\);\n\s+process\.on\("unhandledRejection", crash\);\n\s+main\(\)\.catch\(crash\);/);
  assert.match(script, /console\.error\("BLOCKED: the Preview could not be exercised\. Nothing was concluded\."\)/);
});
