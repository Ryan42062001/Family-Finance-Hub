#!/usr/bin/env node
// FFH-P01 deployed auth smoke test. Usage:
//   node scripts/smoke/deployed-auth-smoke.mjs https://<preview-or-site-origin>
//
// Sends a few unauthenticated GET requests with obviously fake tokens and
// checks that the deployed app fails closed:
//   - protected pages redirect to /auth/login on the same origin
//   - fake confirmation tokens / PKCE codes get the generic error redirect
//   - an external `next` or a forged X-Forwarded-Host never sends you off-site
//   - no Supabase session cookie is ever set
// It creates no accounts, sends no credentials and prints no cookie values.
//
// If the Preview has Vercel Deployment Protection, set the env var
// VERCEL_PROTECTION_BYPASS to a bypass secret on your own machine (never paste
// it into chat or the repo). Otherwise the script reports the 401 and stops.

const base = process.argv[2];
let origin;
try { origin = new URL(base).origin; } catch { origin = null; }
// Any path on the URL is ignored; only https origins (or local http) are tested.
if (!origin || !/^(https:\/\/[^/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(origin)) {
  console.error("Usage: node scripts/smoke/deployed-auth-smoke.mjs https://<site-or-preview-domain>");
  process.exit(2);
}
const bypass = process.env.VERCEL_PROTECTION_BYPASS;
const evil = "ffh-smoke-attacker.example";
const genericError = "/auth/login?error=Unable%20to%20confirm%20your%20account.";

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}

async function get(path, headers = {}) {
  const h = { ...headers };
  if (bypass) h["x-vercel-protection-bypass"] = bypass;
  const response = await fetch(origin + path, { redirect: "manual", headers: h });
  const location = response.headers.get("location");
  const cookies = response.headers.getSetCookie?.() ?? [];
  // Name only; a non-empty sb-*-auth-token value would mean a session was set.
  const sessionCookies = cookies
    .map((c) => c.split(";")[0])
    .filter((c) => /^sb-[^=]*-auth-token[^=]*=./.test(c))
    .map((c) => c.split("=")[0]);
  return { status: response.status, location, sessionCookies };
}

function resolveLocation(location) {
  try { return new URL(location, origin); } catch { return null; }
}

async function expectRedirect(name, path, expectedPathAndQuery, headers) {
  const r = await get(path, headers);
  const loc = r.location ? resolveLocation(r.location) : null;
  const okStatus = r.status >= 300 && r.status < 400;
  const okTarget = !!loc && loc.origin === origin && (loc.pathname + loc.search) === expectedPathAndQuery;
  const noEvil = !(r.location ?? "").includes(evil);
  const noSession = r.sessionCookies.length === 0;
  record(name, okStatus && okTarget && noEvil && noSession,
    `status ${r.status}, location ${r.location ?? "(none)"}, session cookies ${r.sessionCookies.join(",") || "none"}`);
}

async function expectNotOffsite(name, path, headers) {
  const r = await get(path, headers);
  const loc = r.location ? resolveLocation(r.location) : null;
  const offsite = (r.location ?? "").includes(evil) || (loc && loc.origin !== origin);
  const failClosed400 = r.status === 400;
  const ok = !offsite && r.sessionCookies.length === 0 &&
    (failClosed400 || (r.status >= 300 && r.status < 400 && loc?.origin === origin));
  record(name, ok, `status ${r.status}, location ${r.location ?? "(none)"}`);
}

// Vercel Deployment Protection answers before the app does: 401/403, or a redirect to vercel.com's login/SSO.
// Probe two paths so one odd response cannot hide the wall, and report it as BLOCKED, never as app failures.
function behindVercelLogin(r) {
  if (r.status === 401 || r.status === 403) return true;
  const loc = r.location ? resolveLocation(r.location) : null;
  return !!loc && /(^|\.)vercel\.com$/.test(loc.hostname) && /^\/(sso-api|login|sso)\b/.test(loc.pathname);
}
const probe = await get("/auth/login");
const protectedProbe = await get("/dashboard");
if (behindVercelLogin(probe) || behindVercelLogin(protectedProbe)) {
  console.error(`BLOCKED: ${origin} is behind Vercel Deployment Protection (status ${probe.status}). ` +
    "Nothing was tested. Create a 'Protection Bypass for Automation' secret in Vercel and set " +
    "VERCEL_PROTECTION_BYPASS on your machine, then rerun.");
  process.exit(3);
}
record("login page loads (200)", probe.status === 200, `status ${probe.status}`);

await expectRedirect("signed-out /dashboard redirects to /auth/login", "/dashboard", "/auth/login");
await expectRedirect("signed-out /scenario-lab redirects to /auth/login", "/scenario-lab", "/auth/login");
await expectRedirect("fake confirmation token gets generic error",
  "/auth/confirm?token_hash=ffh-smoke-invalid-token&type=email", genericError);
await expectRedirect("wrong confirmation type gets generic error",
  "/auth/confirm?token_hash=ffh-smoke-invalid-token&type=recovery", genericError);
await expectRedirect("duplicate token_hash gets generic error",
  "/auth/confirm?token_hash=a&token_hash=b&type=email", genericError);
await expectRedirect("fake token with external next stays on site",
  `/auth/confirm?token_hash=ffh-smoke-invalid-token&type=email&next=https://${evil}/x`, genericError);
await expectRedirect("fake PKCE code gets generic error", "/auth/callback?code=ffh-smoke-invalid-code", genericError);
await expectRedirect("callback without code gets generic error", "/auth/callback", genericError);
await expectNotOffsite("forged X-Forwarded-Host on /dashboard never redirects off-site",
  "/dashboard", { "x-forwarded-host": evil });
await expectNotOffsite("forged X-Forwarded-Host on /auth/confirm never redirects off-site",
  "/auth/confirm?token_hash=ffh-smoke-invalid-token&type=email", { "x-forwarded-host": evil });
await expectNotOffsite("forged X-Forwarded-Host on /auth/callback never redirects off-site",
  "/auth/callback?code=ffh-smoke-invalid-code", { "x-forwarded-host": evil });

const failed = results.filter((r) => !r.ok).length;
console.log(`\nDEPLOYED_AUTH_SMOKE ${failed === 0 ? "PASS" : "FAIL"} ${results.length - failed}/${results.length} origin=${origin}`);
process.exit(failed === 0 ? 0 : 1);
