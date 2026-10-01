import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { safeInternalDestination, singleBoundedAuthParameter } from "../../lib/auth/safe-destination.ts";
import { trustedRequestUrl } from "../../lib/auth/trusted-origin.ts";

const ORIGIN = "https://family-finance.example";
const requestUrl = new URL("/auth/confirm", ORIGIN);
const confirmRoute = readFileSync(new URL("../../app/auth/confirm/route.ts", import.meta.url), "utf8");
const callbackRoute = readFileSync(new URL("../../app/auth/callback/route.ts", import.meta.url), "utf8");
const authActions = readFileSync(new URL("../../app/auth/actions.ts", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../../lib/supabase/proxy.ts", import.meta.url), "utf8");

test("FFH-P01 trusts only the configured canonical auth origin", () => {
  const environment = { NEXT_PUBLIC_SITE_URL: ORIGIN };
  const trusted = trustedRequestUrl(`${ORIGIN}/auth/confirm?token_hash=synthetic`, environment);
  assert.equal(trusted.trusted, true);
  if (trusted.trusted) assert.equal(trusted.url.href, `${ORIGIN}/auth/confirm?token_hash=synthetic`);

  for (const value of [
    "https://evil.example/auth/confirm",
    "http://family-finance.example/auth/confirm",
    "https://family-finance.example.evil.test/auth/confirm",
  ]) {
    assert.deepEqual(trustedRequestUrl(value, environment), {
      trusted: false,
      reason: "untrusted_request_origin",
    });
  }
});

test("FFH-P01 fails closed for missing or malformed production origin configuration", () => {
  assert.deepEqual(trustedRequestUrl(`${ORIGIN}/auth/confirm`, {}), {
    trusted: false,
    reason: "missing_site_url",
  });
  for (const configured of [
    "not-a-url",
    "http://family-finance.example",
    "https://user:password@family-finance.example",
    "https://family-finance.example/auth",
    "https://family-finance.example/?next=evil",
  ]) {
    assert.deepEqual(trustedRequestUrl(`${ORIGIN}/auth/confirm`, { NEXT_PUBLIC_SITE_URL: configured }), {
      trusted: false,
      reason: "invalid_site_url",
    });
  }
});

test("FFH-P01 permits explicit loopback development without trusting forwarded hosts", () => {
  const local = trustedRequestUrl("http://localhost:3000/auth/callback?code=synthetic", {});
  assert.equal(local.trusted, true);
  assert.doesNotMatch(confirmRoute + callbackRoute + authActions + proxy, /x-forwarded-host|forwarded-host/i);
});

test("FFH-051-R01 preserves internal destinations and rejects absent or duplicate next values", () => {
  assert.equal(safeInternalDestination(requestUrl, ["/onboarding?step=profile#income"]).href, `${ORIGIN}/onboarding?step=profile#income`);
  assert.equal(safeInternalDestination(requestUrl, []).href, `${ORIGIN}/dashboard`);
  assert.equal(safeInternalDestination(requestUrl, ["/onboarding", "/dashboard"]).href, `${ORIGIN}/dashboard`);
});

test("FFH-051-R01 rejects external, separator, control, whitespace and nested redirect destinations", () => {
  const unsafe = [
    "//evil.example/path",
    "/\\evil.example/path",
    "/%5cevil.example/path",
    "/%255cevil.example/path",
    "/%2f%2fevil.example/path",
    "/%252f%252fevil.example/path",
    "/auth/login?next=https://evil.example",
    "/auth/login?redirect_to=%2F%2Fevil.example",
    "/path\nwith-control",
    "/path with-space",
    "https://evil.example/path",
  ];
  for (const value of unsafe) {
    assert.equal(safeInternalDestination(requestUrl, [value]).href, `${ORIGIN}/dashboard`, value);
  }
});

test("FFH-051-R01 exposes only the exact confirmation route and uses a trusted query-free login redirect", () => {
  assert.match(proxy, /path === "\/auth\/confirm"/);
  assert.doesNotMatch(proxy, /startsWith\("\/auth\/confirm"\)/);
  assert.match(proxy, /new URL\("\/auth\/login", trusted\.url\.origin\)/);
  assert.doesNotMatch(proxy, /request\.nextUrl\.clone\(\)/);
  assert.match(proxy, /path === "\/auth\/callback"/);
  assert.match(proxy, /if \(!userId && !isPublic\)/);
});

test("FFH-051-R01 enforces exact email type, bounded unique token and session-backed success", () => {
  assert.equal(singleBoundedAuthParameter(["a".repeat(64)], 1024), "a".repeat(64));
  for (const values of [[], ["one", "two"], [""], [" token"], ["token\n"], ["a".repeat(1025)]]) {
    assert.equal(singleBoundedAuthParameter(values, 1024), null);
  }
  assert.match(confirmRoute, /getAll\("token_hash"\)/);
  assert.match(confirmRoute, /MAX_TOKEN_HASH_LENGTH = 1024/);
  assert.match(confirmRoute, /getAll\("type"\)/);
  assert.match(confirmRoute, /types\.length === 1 && types\[0\] === "email"/);
  assert.match(confirmRoute, /type: "email"/);
  assert.match(confirmRoute, /!error && data\.session/);
  assert.doesNotMatch(confirmRoute, /as EmailOtpType/);
});

test("FFH-051-R01 fails provider exceptions closed through one generic token-free error redirect", () => {
  assert.match(confirmRoute, /try \{/);
  assert.match(confirmRoute, /catch \{/);
  assert.match(confirmRoute, /\/auth\/login\?error=Unable%20to%20confirm%20your%20account\./);
  assert.doesNotMatch(confirmRoute, /error\.message|tokenHash\)|token_hash=.*Unable/);
});

test("FFH-051-R01 applies the shared destination validator without changing PKCE exchange", () => {
  assert.match(confirmRoute, /safeInternalDestination\(url, url\.searchParams\.getAll\("next"\)\)/);
  assert.match(callbackRoute, /safeInternalDestination\(url, url\.searchParams\.getAll\("next"\)\)/);
  assert.match(callbackRoute, /exchangeCodeForSession\(code\)/);
  assert.match(callbackRoute, /NextResponse\.redirect\(next\)/);
  assert.match(confirmRoute, /trustedRequestUrl\(request\.url\)/);
  assert.match(callbackRoute, /trustedRequestUrl\(request\.url\)/);
  assert.match(authActions, /trustedRequestUrl\(`\$\{origin\}\/auth\/callback`\)/);
  assert.match(authActions, /emailRedirectTo: trusted\.url\.href/);
  assert.match(proxy, /trustedRequestUrl\(request\.url\)/);
  assert.doesNotMatch(authActions, /emailRedirectTo: `\$\{origin\}/);
  assert.match(confirmRoute + callbackRoute + proxy, /status: 400/);
});
