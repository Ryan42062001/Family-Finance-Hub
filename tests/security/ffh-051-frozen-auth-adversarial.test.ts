import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

// Audit-only immutable snapshot. Characterization tests demonstrate the FROZEN defects;
// they are not acceptance tests for repaired production code.
const frozen = readFileSync(new URL("../../.ai/audit/technical/fixtures/FFH-051_FROZEN_CONFIRM_ROUTE_e9ff76d6.txt", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../../lib/supabase/proxy.ts", import.meta.url), "utf8");
const ORIGIN = "https://family-finance.example";
const TOKEN = "synthetic-no-real-user-token";

function routeHarness(verifyOtp: (arg: unknown) => Promise<unknown>) {
  const calls: unknown[] = [];
  const source = frozen
    .replace(/^import .*;\n/gm, "")
    .replace("function safeNextPath(value: string | null)", "function safeNextPath(value)")
    .replace('const type = url.searchParams.get("type") as EmailOtpType | null;', 'const type = url.searchParams.get("type");')
    .replace("export async function GET(request: Request)", "async function GET(request)");
  const GET = runInNewContext(source + "\nGET;", {
    URL,
    Request,
    NextResponse: { redirect: (url: URL) => ({ location: url.href }) },
    createClient: async () => ({ auth: { verifyOtp: async (arg: unknown) => {
      calls.push(arg);
      return verifyOtp(arg);
    } } }),
  }) as (request: Request) => Promise<{ location: string }>;
  const request = (params: Record<string, string>) => {
    const url = new URL("/auth/confirm", ORIGIN);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return GET(new Request(url));
  };
  return { request, calls };
}

test("frozen fixture has exact immutable production Git blob SHA", () => {
  const blob = createHash("sha1").update("blob " + Buffer.byteLength(frozen) + "\0").update(frozen).digest("hex");
  assert.equal(blob, "ca486ca5b78cfe3d2afd4b7daf6914a62c94f587");
});

test("adversarial: anonymous confirmation is not in root proxy public route predicate", () => {
  const match = proxy.match(/const isPublic =([\s\S]*?);\s*if \(!userId && !isPublic\)/);
  assert.ok(match, "locate actual protected-route predicate");
  const isPublic = runInNewContext("((path) => " + match[1] + ")") as (path: string) => boolean;
  assert.equal(isPublic("/auth/callback"), true);
  assert.equal(isPublic("/auth/confirm"), false); // frozen defect
  assert.equal(isPublic("/dashboard"), false); // protected baseline unchanged
});

test("adversarial: proxy login redirect retains token-bearing query", () => {
  assert.match(proxy, /const url = request\.nextUrl\.clone\(\);\s*url\.pathname = "\/auth\/login";\s*return NextResponse\.redirect\(url\)/);
  const url = new URL("/auth/confirm?token_hash=" + TOKEN + "&type=email", ORIGIN);
  url.pathname = "/auth/login";
  assert.equal(url.searchParams.get("token_hash"), TOKEN); // frozen defect
});

test("adversarial: backslash bypasses path-only redirect check", async () => {
  const h = routeHarness(async () => ({ error: null, data: { session: { user: { id: "synthetic" } } } }));
  for (const value of ["/\\evil.example/p", "/\\\\evil.example/p"]) {
    const result = await h.request({ token_hash: TOKEN, type: "email", next: value });
    assert.equal(new URL(result.location).origin, "https://evil.example"); // frozen defect
  }
  // URLSearchParams serializes backslash to %5C; the route decodes before URL resolution.
  const encoded = new URL("/auth/confirm?token_hash=" + TOKEN + "&type=email&next=/%5Cevil.example/p", ORIGIN);
  const actual = await routeHarness(async () => ({ error: null })).request(Object.fromEntries(encoded.searchParams));
  assert.equal(new URL(actual.location).origin, "https://evil.example");
});

test("controls: plain protocol-relative next rejected, ordinary internal next accepted", async () => {
  const h = routeHarness(async () => ({ error: null }));
  assert.equal((await h.request({ token_hash: TOKEN, type: "email", next: "//evil.example/p" })).location, ORIGIN + "/dashboard");
  assert.equal((await h.request({ token_hash: TOKEN, type: "email", next: "/onboarding" })).location, ORIGIN + "/onboarding");
});

test("adversarial: arbitrary runtime OTP types reach verifyOtp", async () => {
  const h = routeHarness(async () => ({ error: null }));
  for (const type of ["recovery", "invite", "email_change", "sms", "arbitrary_type"]) {
    assert.equal((await h.request({ token_hash: TOKEN, type })).location, ORIGIN + "/dashboard");
    assert.equal((h.calls.at(-1) as { type: string }).type, type);
  }
});

test("adversarial: no session and no error still redirects as success", async () => {
  const h = routeHarness(async () => ({ error: null, data: { session: null } }));
  assert.equal((await h.request({ token_hash: TOKEN, type: "email" })).location, ORIGIN + "/dashboard");
});

test("controls: missing token/type and provider error return generic login failure", async () => {
  const h = routeHarness(async () => ({ error: { message: "synthetic-invalid-token" }, data: { session: null } }));
  for (const params of [{ type: "email" }, { token_hash: TOKEN }, { token_hash: "", type: "email" }]) {
    assert.equal(new URL((await h.request(params)).location).pathname, "/auth/login");
  }
  assert.equal(h.calls.length, 0);
  const invalid = await h.request({ token_hash: TOKEN, type: "email" });
  assert.equal(new URL(invalid.location).pathname, "/auth/login");
  assert.equal(new URL(invalid.location).searchParams.has("token_hash"), false);
});

test("adversarial: verifyOtp exception is not caught", async () => {
  const h = routeHarness(async () => { throw new Error("synthetic-verification-exception"); });
  await assert.rejects(h.request({ token_hash: TOKEN, type: "email" }), /synthetic-verification-exception/);
});
