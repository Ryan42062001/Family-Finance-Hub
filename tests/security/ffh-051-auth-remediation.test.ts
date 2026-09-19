import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { safeInternalDestination, singleBoundedAuthParameter } from "../../lib/auth/safe-destination.ts";

const ORIGIN = "https://family-finance.example";
const requestUrl = new URL("/auth/confirm", ORIGIN);
const confirmRoute = readFileSync(new URL("../../app/auth/confirm/route.ts", import.meta.url), "utf8");
const callbackRoute = readFileSync(new URL("../../app/auth/callback/route.ts", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../../lib/supabase/proxy.ts", import.meta.url), "utf8");

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

test("FFH-051-R01 exposes only the exact confirmation route and uses a query-free login redirect", () => {
  assert.match(proxy, /path === "\/auth\/confirm"/);
  assert.doesNotMatch(proxy, /startsWith\("\/auth\/confirm"\)/);
  assert.match(proxy, /new URL\("\/auth\/login", request\.url\)/);
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
});
