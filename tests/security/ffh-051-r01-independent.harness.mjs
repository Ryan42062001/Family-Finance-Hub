// Audit-only direct-source VM harness. All provider/Next.js objects are synthetic mocks;
// this does NOT prove live Next.js cookies, the hosted template, or real Supabase behavior.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { safeInternalDestination, singleBoundedAuthParameter } from "../../.ai/audit/technical/fixtures/FFH-051-R01/safe-destination.ts";

const ORIGIN = "https://family-finance-hub-ten-brown.vercel.app";
const prefix = "../../.ai/audit/technical/fixtures/FFH-051-R01/";
const audited = {
  confirm: ["confirm.route.ts", "32128f4f9988a27cc2184d2921577d6a210778c8"],
  callback: ["callback.route.ts", "8870b869cc9b06a338b267abf909c6bb0d8a4dab"],
  proxy: ["proxy.ts", "576b57851c56c6c9d95e61eb2c2e9001ed1f0adc"],
  destination: ["safe-destination.ts", "2b516c7908189e08d9a4ee9f054605ba1234ffd5"],
};
const source = Object.fromEntries(Object.entries(audited).map(([key, [filename, sha]]) => {
  const raw = readFileSync(new URL(prefix + filename, import.meta.url), "utf8");
  const normalized = raw.replace(/\r\n/g, "\n"); // Windows checkout must not alter canonical Git blob identity.
  const data = Buffer.from(normalized);
  const hash = createHash("sha1").update("blob " + data.length + "\0").update(data).digest("hex");
  assert.equal(hash, sha, "immutable production blob: " + filename);
  return [key, normalized];
}));

function harness(name, hooks = {}) {
  const transformed = source[name].replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, "");
  const ctx = {
    URL, Request, process: { env: {} },
    safeInternalDestination, singleBoundedAuthParameter,
    NextResponse: {
      redirect: (url) => ({ status: 307, location: url.href }),
      next: () => ({ status: 200 }),
    },
    createClient: async () => ({
      auth: {
        verifyOtp: hooks.verifyOtp ?? (async () => ({ data: { session: { user: { id: "synthetic" } } }, error: null })),
        exchangeCodeForSession: hooks.exchangeCodeForSession ?? (async () => ({ error: null })),
      },
    }),
    createServerClient: () => ({
      auth: { getClaims: hooks.getClaims ?? (async () => ({ data: { claims: null } })) },
    }),
  };
  runInNewContext(stripTypeScriptTypes(transformed) + "\n;globalThis.handler = " + (name === "proxy" ? "updateSession" : "GET") + ";", ctx);
  return ctx.handler;
}
function req(path) { return new Request(new URL(path, ORIGIN)); }
function location(response) { return new URL(response.location); }

test("FFH-051-R01 independent frozen source provenance", () => {
  assert.equal(Object.keys(source).length, 4);
});

test("final resolved destination resists origin confusion, nested redirects, encoded separators and duplicates", () => {
  const requestUrl = new URL("/auth/confirm", ORIGIN);
  const attacks = [
    "//evil.example/x", "/\\evil.example/x", "/\\\\evil.example/x",
    "/%5cevil.example/x", "/%255cevil.example/x", "/%2f%2fevil.example/x",
    "/%252f%252fevil.example/x", "/%25252f%25252fevil.example/x",
    "/auth/login?next=https://evil.example", "/auth/login?%6eext=https://evil.example",
    "/auth/login?REDIRECT_TO=https://evil.example", "/auth/login?url=%252f%252fevil.example",
    "/auth/login?callback=https://evil.example", "/a\nLocation:https://evil.example",
    "/a b", "https://evil.example/x", " /dashboard",
  ];
  for (const input of attacks) {
    const actual = safeInternalDestination(requestUrl, [input]);
    assert.equal(actual.href, ORIGIN + "/dashboard", JSON.stringify(input));
    assert.equal(actual.origin, ORIGIN);
  }
  for (const good of ["/dashboard", "/onboarding?step=profile#income", "/"]) {
    assert.equal(safeInternalDestination(requestUrl, [good]).href, new URL(good, ORIGIN).href);
  }
  assert.equal(safeInternalDestination(requestUrl, ["/dashboard", "/onboarding"]).pathname, "/dashboard");
  assert.equal(safeInternalDestination(requestUrl, ["/x".repeat(1100)]).pathname, "/dashboard");
  const encodedControl = safeInternalDestination(requestUrl, ["/%0d%0aevil.example"]);
  assert.equal(encodedControl.href, ORIGIN + "/%0d%0aevil.example"); // observed low-risk limitation
  assert.ok(!/[\r\n]/.test(encodedControl.href));
  const forged = new URL("https://untrusted.example/auth/confirm");
  assert.equal(safeInternalDestination(forged, []).origin, "https://untrusted.example"); // request origin is not pinned
});

test("anonymous proxy passes only exact confirmation route and strips token from protected login redirect", async () => {
  const proxy = harness("proxy");
  for (const [path, expected] of [
    ["/auth/confirm?token_hash=SYNTHETIC&type=email", 200],
    ["/auth/confirm/extra?token_hash=SYNTHETIC", 307],
    ["/dashboard?token_hash=SYNTHETIC&code=PKCE", 307],
    ["/auth/callback?code=PKCE", 200],
  ]) {
    const url = new URL(path, ORIGIN);
    const response = await proxy({ url: url.href, nextUrl: url, cookies: { getAll: () => [], set: () => {} } });
    assert.equal(response.status, expected, path);
    if (expected === 307) assert.equal(response.location, ORIGIN + "/auth/login");
  }
});

test("confirm rejects ambiguous input and allows only exact runtime type email", async () => {
  const calls = [];
  const confirm = harness("confirm", { verifyOtp: async (arg) => {
    calls.push(JSON.stringify(arg));
    return { error: null, data: { session: { user: { id: "synthetic" } } } };
  } });
  const invalid = [
    "/auth/confirm", "/auth/confirm?type=email", "/auth/confirm?token_hash=SYNTHETIC",
    "/auth/confirm?token_hash=SYNTHETIC&type=recovery",
    "/auth/confirm?token_hash=SYNTHETIC&type=email&type=email",
    "/auth/confirm?token_hash=SYNTHETIC&token_hash=OTHER&type=email",
    "/auth/confirm?token_hash=" + "x".repeat(1025) + "&type=email",
    "/auth/confirm?token_hash=%20SYNTHETIC&type=email",
  ];
  for (const path of invalid) {
    assert.equal(location(await confirm(req(path))).pathname, "/auth/login", path);
    assert.equal(calls.length, 0, path);
  }
  assert.equal(location(await confirm(req("/auth/confirm?token_hash=SYNTHETIC&type=email"))).pathname, "/dashboard");
  assert.deepEqual(calls, [JSON.stringify({ type: "email", token_hash: "SYNTHETIC" })]);
});

test("provider error, missing session and thrown verifyOtp all fail closed without leaking synthetic token", async () => {
  for (const verifyOtp of [
    async () => ({ error: { message: "expired" }, data: { session: null } }),
    async () => ({ error: null, data: { session: null } }),
    async () => { throw Error("synthetic provider failure"); },
  ]) {
    const response = await harness("confirm", { verifyOtp })(req("/auth/confirm?token_hash=SYNTHETIC&type=email&next=/onboarding"));
    assert.equal(response.location, ORIGIN + "/auth/login?error=Unable%20to%20confirm%20your%20account.");
    assert.ok(!response.location.includes("SYNTHETIC"));
  }
});

test("existing PKCE code exchange uses bounded destinations and rejects duplicate next", async () => {
  const calls = [];
  const callback = harness("callback", { exchangeCodeForSession: async (code) => {
    calls.push(code); return { error: null };
  } });
  for (const next of ["//evil.example", "/\\evil.example", "/%252f%252fevil.example", "/auth/login?next=https://evil.example"]) {
    const response = await callback(req("/auth/callback?code=PKCE&next=" + encodeURIComponent(next)));
    assert.equal(response.location, ORIGIN + "/dashboard");
  }
  assert.equal((await callback(req("/auth/callback?code=PKCE&next=/dashboard&next=/onboarding"))).location, ORIGIN + "/dashboard");
  assert.equal(calls.length, 5);
  assert.equal(location(await callback(req("/auth/callback?next=/dashboard"))).pathname, "/auth/login");
  assert.equal(calls.length, 5);
});