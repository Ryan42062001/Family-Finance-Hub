#!/usr/bin/env node
// FFH-P04 automated sign-in and household-isolation check against a deployed Preview.
//
// Read-only: it signs in, reads pages, and signs out. It never creates, edits or deletes data.
// Secrets: credentials come only from environment variables (GitHub Actions secrets). They are never printed,
// written to disk, or attached as screenshots/traces. Output names checks, never emails or household names.
//
// Usage: node scripts/e2e/isolation.mjs <preview-url> [--negative-control]
//   env: FFH_E2E_A_EMAIL, FFH_E2E_A_PASSWORD, FFH_E2E_B_EMAIL, FFH_E2E_B_PASSWORD,
//        FFH_E2E_EXPECTED_SHA (required for the Preview: the exact commit the address must be serving)
// Exit codes: 0 PASS · 1 FAIL · 2 REFUSED (bad target, or the site tried to send the browser elsewhere)
//             · 3 BLOCKED (missing credentials, wrong or unverifiable build, or unreachable).
// --negative-control: runs the same identity and leak checks with deliberately wrong expectations; exits 0 only if
// those exact checks reject them.

import { chromium } from "playwright";

// Only the fixed Preview address may be tested. Production and every other host are refused.
export const ALLOWED_HOSTS = new Set(["family-finance-hub-preview.vercel.app"]);
export const REFUSED_HOSTS = new Set(["family-finance-hub-taupe.vercel.app", "family-finance-hub-ten-brown.vercel.app", "family-finance-hub-ten.vercel.app"]);

// Local-only rehearsal against a synthetic mock: needs FFH_E2E_ALLOW_LOCALHOST=1 and is refused inside GitHub Actions.
export function localhostAllowed(env) {
  return env.FFH_E2E_ALLOW_LOCALHOST === "1" && !env.GITHUB_ACTIONS && !env.CI;
}

export function checkTarget(raw, env = {}) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "not a URL" }; }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (local) {
    if (!localhostAllowed(env)) return { ok: false, reason: "localhost is only for local rehearsal and never in CI" };
    if (url.protocol !== "http:" || url.pathname !== "/" || url.search || url.hash) return { ok: false, reason: "give the site origin only" };
    return { ok: true, origin: url.origin, local: true };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "must be https" };
  if (REFUSED_HOSTS.has(url.hostname)) return { ok: false, reason: "Production is never tested by this suite" };
  if (!ALLOWED_HOSTS.has(url.hostname)) return { ok: false, reason: "only the Preview address may be tested" };
  if (url.pathname !== "/" || url.search || url.hash) return { ok: false, reason: "give the site origin only" };
  return { ok: true, origin: url.origin };
}

export function credentialsFrom(env) {
  const names = ["FFH_E2E_A_EMAIL", "FFH_E2E_A_PASSWORD", "FFH_E2E_B_EMAIL", "FFH_E2E_B_PASSWORD"];
  const missing = names.filter((name) => !String(env[name] ?? "").trim());
  if (missing.length) return { ok: false, missing };
  return { ok: true, a: { label: "TestA", email: env.FFH_E2E_A_EMAIL.trim(), password: env.FFH_E2E_A_PASSWORD }, b: { label: "TestB", email: env.FFH_E2E_B_EMAIL.trim(), password: env.FFH_E2E_B_PASSWORD } };
}

// A page "leaks" if it shows any marker that belongs only to the other household.
export function leakedMarkers(text, otherMarkers) {
  const haystack = text.toLowerCase();
  return otherMarkers.filter((marker) => marker && haystack.includes(marker.toLowerCase()));
}

// The one identity rule, used both by the real run and by the negative control.
export function identityMatches(displayedEmail, expectedEmail) {
  return Boolean(displayedEmail) && displayedEmail.trim().toLowerCase() === String(expectedEmail).trim().toLowerCase();
}

// The address must serve this exact commit as a Vercel Preview, or nothing is tested.
export function buildMatches(info, expectedSha) {
  return Boolean(info) && info.environment === "preview" && typeof info.commit === "string" && /^[0-9a-f]{40}$/.test(info.commit) && info.commit === expectedSha;
}

// Any navigation or form submission that would leave the tested origin is stopped before it is sent.
export function leavesOrigin(requestUrl, origin) {
  try { return new URL(requestUrl).origin !== origin; } catch { return true; }
}

export class OriginViolation extends Error {
  constructor() { super("the site tried to send the browser to another address"); this.name = "OriginViolation"; }
}

export const PAGES = ["/plan", "/dashboard", "/financial-profile", "/planning", "/scenario-lab"];

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  -> ${detail}`}`);
}

// Every top-level navigation and every non-GET request is fetched by the guard without following redirects. A request
// or redirect to any other origin is aborted and recorded, so credentials and session cookies can never be sent
// anywhere except the verified Preview. Passive same-browser GETs (scripts, styles) to the tested origin pass through.
async function installOriginGuard(context, origin, violations) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const sensitive = request.isNavigationRequest() || request.method() !== "GET";
    if (leavesOrigin(request.url(), origin)) {
      if (sensitive) { violations.push("request"); return route.abort("blockedbyclient"); }
      return route.continue();
    }
    if (!sensitive) return route.continue();
    const response = await route.fetch({ maxRedirects: 0 });
    const location = response.headers()["location"];
    if (response.status() >= 300 && response.status() < 400 && location && leavesOrigin(new URL(location, request.url()).href, origin)) {
      violations.push("redirect");
      return route.abort("blockedbyclient");
    }
    return route.fulfill({ response });
  });
}

async function assertOnOrigin(page, origin, violations) {
  if (violations.length || new URL(page.url()).origin !== origin) throw new OriginViolation();
}

async function signIn(context, origin, account, violations) {
  const page = await context.newPage();
  await page.goto(`${origin}/auth/login`, { waitUntil: "networkidle" });
  await assertOnOrigin(page, origin, violations);
  // The login form must submit to this same origin before any credential is typed.
  const formAction = await page.$eval("form.auth-form", (form) => form.action).catch(() => null);
  if (!formAction || (!formAction.startsWith("javascript:") && leavesOrigin(formAction, origin))) throw new OriginViolation();
  await page.fill('input[name="email"]', account.email);
  await page.fill('input[name="password"]', account.password);
  await Promise.all([page.waitForURL((url) => !url.pathname.startsWith("/auth/"), { timeout: 30000 }).catch(() => null), page.click('form.auth-form button[type="submit"]')]);
  return page;
}

async function signedInEmail(page) {
  await page.click(".account-menu > summary");
  const text = (await page.textContent(".account-menu .account-email").catch(() => null)) ?? "";
  await page.click(".account-menu > summary");
  return text.trim().toLowerCase();
}

// Visits every protected page and returns its full text (including content hidden behind tabs/disclosures).
async function readPages(page, origin) {
  const texts = {};
  for (const path of PAGES) {
    const response = await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
    texts[path] = {
      status: response?.status() ?? 0,
      finalPath: new URL(page.url()).pathname,
      text: (await page.textContent("main").catch(() => "")) ?? "",
      // The plan component itself (steps or the honest "no plan" card), not just the page heading.
      planRendered: path === "/plan" ? (await page.locator(".money-plan, .plan-unavailable").count()) > 0 : null,
    };
  }
  return texts;
}

async function signOut(page, origin, context) {
  await page.goto(`${origin}/plan`, { waitUntil: "networkidle" });
  await page.click(".account-menu > summary");
  await Promise.all([page.waitForURL((url) => url.pathname === "/auth/login", { timeout: 20000 }).catch(() => null), page.click(".account-menu form button[type=submit]")]);
  const onLogin = new URL(page.url()).pathname === "/auth/login";
  const after = await page.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
  const redirected = new URL(page.url()).pathname === "/auth/login" && (after?.status() ?? 0) < 400;
  const sessionCookies = (await context.cookies()).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name) && cookie.value);
  return { onLogin, redirected, sessionCleared: sessionCookies.length === 0 };
}

async function runAccount(browser, origin, account) {
  const context = await browser.newContext();
  const violations = [];
  await installOriginGuard(context, origin, violations);
  try {
    const page = await signIn(context, origin, account, violations);
    if (violations.length) throw new OriginViolation();
    const landed = !new URL(page.url()).pathname.startsWith("/auth/");
    if (!landed) return { signedIn: false };
    const email = await signedInEmail(page);
    await page.goto(`${origin}/dashboard`, { waitUntil: "networkidle" });
    const householdName = ((await page.textContent(".dashboard-desktop-hero h1").catch(() => null)) ?? "").trim();
    const pages = await readPages(page, origin);
    const signedOut = await signOut(page, origin, context);
    await assertOnOrigin(page, origin, violations);
    return { signedIn: true, email, householdName, pages, signedOut };
  } catch (error) {
    // Anything that went wrong after the guard blocked a request is reported as that refusal, never as a test result.
    if (violations.length) throw new OriginViolation();
    throw error;
  } finally {
    await context.close();
  }
}

async function readBuildInfo(origin) {
  try {
    const response = await fetch(`${origin}/api/build-info`, { redirect: "manual", cache: "no-store" });
    if (response.status !== 200) return null;
    return await response.json();
  } catch { return null; }
}

// The fixed Preview domain can lag a few seconds behind a finished build, so retry briefly before giving up.
async function verifyBuild(origin, expectedSha, attempts = 12, waitMs = 15000) {
  let info = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    info = await readBuildInfo(origin);
    if (buildMatches(info, expectedSha)) return { ok: true };
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  return { ok: false, info };
}

async function main() {
  const [rawUrl, flag] = process.argv.slice(2);
  const negativeControl = flag === "--negative-control";
  const target = checkTarget(rawUrl ?? "", process.env);
  if (!target.ok) { console.error(`REFUSED: ${target.reason}.`); process.exit(2); }
  const creds = credentialsFrom(process.env);
  if (!creds.ok) { console.error(`BLOCKED: missing GitHub secrets ${creds.missing.join(", ")}. Nothing was tested.`); process.exit(3); }
  if (creds.a.email.toLowerCase() === creds.b.email.toLowerCase()) { console.error("FAIL: TestA and TestB must be different accounts."); process.exit(1); }

  // Before any credential is used, prove the address serves this exact commit as a Preview build.
  const expectedSha = String(process.env.FFH_E2E_EXPECTED_SHA ?? "").trim();
  if (!target.local || expectedSha) {
    if (!/^[0-9a-f]{40}$/.test(expectedSha)) { console.error("BLOCKED: FFH_E2E_EXPECTED_SHA (the commit under test) is missing. Nothing was tested."); process.exit(3); }
    const build = await verifyBuild(target.origin, expectedSha);
    if (!build.ok) {
      const seen = build.info?.commit ? `commit ${String(build.info.commit).slice(0, 7)} (${build.info.environment ?? "unknown"})` : "no readable build information";
      console.error(`BLOCKED: the Preview address serves ${seen}, not ${expectedSha.slice(0, 7)} as a Preview. Is the Preview domain pointing at this phase branch? Nothing was tested.`);
      process.exit(3);
    }
    console.log(`PASS  the Preview address serves commit ${expectedSha.slice(0, 7)}`);
  }

  const browser = await chromium.launch();
  let a, b;
  try {
    a = await runAccount(browser, target.origin, creds.a);
    b = await runAccount(browser, target.origin, creds.b);
  } catch (error) {
    await browser.close();
    if (error instanceof OriginViolation) {
      console.error("REFUSED: the site tried to send the browser to another address. That request was blocked and nothing was concluded.");
      process.exit(2);
    }
    console.error(`BLOCKED: the Preview could not be exercised (${error instanceof Error ? error.name : "error"}). Nothing was concluded.`);
    process.exit(3);
  }
  await browser.close();

  // Negative control: the same identity and leak checks the real run uses must reject deliberately wrong inputs.
  if (negativeControl) {
    const bothIn = a.signedIn && b.signedIn;
    const identityRuleWorks = bothIn
      && identityMatches(a.email, creds.a.email) && identityMatches(b.email, creds.b.email)
      && !identityMatches(a.email, creds.b.email) && !identityMatches(b.email, creds.a.email);
    // Treat each account's OWN household name as if it belonged to the other household: the leak check must fire.
    const leakRuleWorks = bothIn
      && leakedMarkers(a.pages["/dashboard"].text, [a.householdName]).length > 0
      && leakedMarkers(b.pages["/dashboard"].text, [b.householdName]).length > 0;
    console.log(`${identityRuleWorks ? "PASS" : "FAIL"}  negative control: the identity check rejects a swapped account`);
    console.log(`${leakRuleWorks ? "PASS" : "FAIL"}  negative control: the leak check fires on an injected household marker`);
    process.exit(identityRuleWorks && leakRuleWorks ? 0 : 1);
  }

  for (const [run, account, other, otherRun] of [[a, creds.a, creds.b, b], [b, creds.b, creds.a, a]]) {
    const who = account.label;
    record(`${who} signs in`, run.signedIn);
    if (!run.signedIn) continue;
    record(`${who} is signed in as itself`, identityMatches(run.email, account.email), "the account menu shows a different email");
    record(`${who} has a household`, Boolean(run.householdName), "no household name on Overview");
    const otherMarkers = [other.email, otherRun.signedIn ? otherRun.householdName : "", other.label === "TestB" ? "ZZ-B-" : "ZZ-A-"];
    if (otherRun.signedIn && run.householdName && run.householdName.toLowerCase() === otherRun.householdName.toLowerCase()) {
      record(`${who} and ${other.label} households are distinguishable`, false, "both accounts show the same household name");
    }
    for (const path of PAGES) {
      const pageResult = run.pages[path];
      record(`${who} ${path} loads while signed in`, pageResult.status < 400 && pageResult.finalPath === path, `status ${pageResult.status}, ended at ${pageResult.finalPath}`);
      const leaks = leakedMarkers(pageResult.text, otherMarkers);
      record(`${who} ${path} shows nothing from ${other.label}`, leaks.length === 0, `${leaks.length} marker(s) from ${other.label} found`);
    }
    record(`${who} money plan renders`, run.pages["/plan"].planRendered === true, "the plan component did not render");
    record(`${who} sign-out returns to Sign in`, run.signedOut.onLogin);
    record(`${who} protected page needs sign-in again`, run.signedOut.redirected);
    record(`${who} session cookie cleared`, run.signedOut.sessionCleared);
  }

  const failed = results.filter((result) => !result.ok).length;
  console.log(`\nE2E_ISOLATION ${failed ? "FAIL" : "PASS"} ${results.length - failed}/${results.length}`);
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
