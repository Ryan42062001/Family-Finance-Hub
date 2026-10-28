/**
 * FFH-P01 adversarial route execution, entirely synthetic.
 *
 * Executes the real compiled route/action modules with a fake NextResponse
 * boundary, real origin/destination helpers, and fake Supabase results.
 * Never calls the network, handles real confirmation links, or proves deployed
 * Set-Cookie/browser/identity or Supabase token-lifetime enforcement.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import * as ts from "typescript";
import { trustedRequestUrl } from "../../lib/auth/trusted-origin.ts";
import { safeInternalDestination, singleBoundedAuthParameter } from "../../lib/auth/safe-destination.ts";

const ORIGIN = "https://ffh-synthetic.example";
const GENERIC = ORIGIN + "/auth/login?error=Unable%20to%20confirm%20your%20account.";
const fakeToken = "nonsecret-synthetic-token";
type Stub = Record<string, unknown>;
type Route = { GET: (request: Request) => Promise<Response> };
class SyntheticRedirect extends Error {
  readonly destination: string;
  constructor(destination: string) { super("SYNTHETIC_REDIRECT"); this.destination = destination; }
}
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

// Transpile the *unchanged actual route* rather than reimplementing route
// branching. Only Next/Supabase IO dependencies are substituted.
function executeModule(path: string, mocks: Record<string, Stub>): Record<string, unknown> {
  const source = read(path);
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
    reportDiagnostics: true,
  });
  const failures = (transpiled.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(failures.length, 0, "Route transpilation must succeed");
  const loadedModule = { exports: {} as Record<string, unknown> };
  runInNewContext(transpiled.outputText, {
    module: loadedModule, exports: loadedModule.exports,
    require: (name: string) => {
      if (!(name in mocks)) throw new Error("Unmocked dependency: " + name);
      return mocks[name];
    },
    Request, Response, URL, FormData,
    process: { env: { NEXT_PUBLIC_SITE_URL: ORIGIN } },
  }, { filename: path });
  return loadedModule.exports;
}
const nextServer = {
  NextResponse: {
    json: (body: unknown, options?: ResponseInit) => Response.json(body, options),
    redirect: (destination: string | URL) => Response.redirect(String(destination), 307),
  },
};
const realHelpers = {
  "@/lib/auth/safe-destination": { safeInternalDestination, singleBoundedAuthParameter },
  "@/lib/auth/trusted-origin": {
    trustedRequestUrl: (value: string | URL) => trustedRequestUrl(value, { NEXT_PUBLIC_SITE_URL: ORIGIN }),
  },
};
const getLocation = (response: Response) => response.headers.get("location") ?? "";
const assertGeneric = (response: Response) => {
  assert.equal(response.status, 307);
  assert.equal(getLocation(response), GENERIC);
  assert.doesNotMatch(getLocation(response), /token_hash|synthetic-token|code=|provider|error_description/i);
};

function confirmationHarness(
  verify: (input: { type: string; token_hash: string }) => Promise<unknown>,
) {
  const calls: { type: string; token_hash: string }[] = [];
  let clients = 0;
  const createClient = async () => {
    clients++;
    return { auth: { verifyOtp: async (args: { type: string; token_hash: string }) => {
      calls.push(args);
      return verify(args);
    } } };
  };
  const routeModule = executeModule("../../app/auth/confirm/route.ts", {
    "next/server": nextServer, ...realHelpers,
    "@/lib/supabase/server": { createClient },
  }) as unknown as Route;
  const request = (suffix: string, headers?: HeadersInit) =>
    routeModule.GET(new Request(ORIGIN + "/auth/confirm" + suffix, { headers }));
  return { request, calls, get clients() { return clients; } };
}
function callbackHarness(
  exchange: (code: string) => Promise<unknown>,
) {
  const calls: string[] = [];
  let clients = 0;
  const createClient = async () => {
    clients++;
    return { auth: { exchangeCodeForSession: async (code: string) => {
      calls.push(code);
      return exchange(code);
    } } };
  };
  const routeModule = executeModule("../../app/auth/callback/route.ts", {
    "next/server": nextServer, ...realHelpers,
    "@/lib/supabase/server": { createClient },
  }) as unknown as Route;
  const request = (suffix: string, headers?: HeadersInit) =>
    routeModule.GET(new Request(ORIGIN + "/auth/callback" + suffix, { headers }));
  return { request, calls, get clients() { return clients; }, GET: routeModule.GET };
}
const success = { data: { session: { user: { id: "synthetic-user" } } }, error: null };

test("executed confirmation accepts a unique bounded email token and preserves safe internal next", async () => {
  const h = confirmationHarness(async () => success);
  const response = await h.request("?type=email&token_hash=" + fakeToken + "&next=%2Fonboarding");
  assert.equal(response.status, 307);
  assert.equal(getLocation(response), ORIGIN + "/onboarding");
  assert.equal(h.clients, 1);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].type, "email");
  assert.equal(h.calls[0].token_hash, fakeToken);
});

test("executed confirmation rejects missing, duplicate, wrong, empty and oversized token/type before provider", async () => {
  const h = confirmationHarness(async () => success);
  for (const query of [
    "?type=email",
    "?type=email&token_hash=",
    "?type=email&token_hash=" + fakeToken + "&token_hash=second",
    "?type=recovery&token_hash=" + fakeToken,
    "?type=email&type=email&token_hash=" + fakeToken,
    "?type=email&token_hash=" + "s".repeat(1025),
    "?type=email&token_hash=%20" + fakeToken,
  ]) assertGeneric(await h.request(query));
  assert.equal(h.clients, 0);
  assert.equal(h.calls.length, 0);
});

test("executed confirmation fails generically for invalid, expired and reused synthetic provider results", async () => {
  for (const condition of ["invalid", "expired", "already_used"]) {
    const h = confirmationHarness(async () => ({
      data: { session: null }, error: { message: "synthetic_" + condition },
    }));
    const response = await h.request("?type=email&token_hash=" + fakeToken + "&next=%2Fonboarding");
    assertGeneric(response);
    assert.equal(h.calls.length, 1);
  }
  // These are simulated provider rejects, NOT proof of Supabase replay/expiry.
});

test("executed confirmation requires a provider session even with no provider error", async () => {
  const h = confirmationHarness(async () => ({ data: { session: null }, error: null }));
  assertGeneric(await h.request("?type=email&token_hash=" + fakeToken));
});

test("executed confirmation catches thrown provider and client errors without echoing secrets", async () => {
  const provider = confirmationHarness(async () => { throw new Error("synthetic provider detail"); });
  assertGeneric(await provider.request("?type=email&token_hash=" + fakeToken));
  const h = confirmationHarness(async () => { throw new TypeError("synthetic network outage"); });
  assertGeneric(await h.request("?type=email&token_hash=" + fakeToken + "&next=%2Fdashboard"));
});

test("executed confirmation rejects external/encoded/nested/duplicate next without denying valid session", async () => {
  const h = confirmationHarness(async () => success);
  const unsafe = [
    "//lookalike.example",
    "https://evil.example/path",
    "/%2f%2fevil.example",
    "/%5cevil.example",
    "/%252f%252fevil.example",
    "/auth/login?next=https://evil.example",
    "/" + "a".repeat(2050),
  ];
  for (const next of unsafe) {
    const query = "?type=email&token_hash=" + fakeToken + "&next=" + encodeURIComponent(next);
    const response = await h.request(query);
    assert.equal(getLocation(response), ORIGIN + "/dashboard", next.slice(0, 60));
  }
  assert.equal(getLocation(await h.request("?type=email&token_hash=" + fakeToken + "&next=%2Fonboarding&next=%2Foutside")), ORIGIN + "/dashboard");
});

test("AUTH CONTROL-CHARACTER GATE: encoded newline in next must fail closed", async () => {
  const h = confirmationHarness(async () => success);
  const encodedControl = "/path%0Aunsafe";
  const response = await h.request("?type=email&token_hash=" + fakeToken + "&next=" + encodeURIComponent(encodedControl));
  // MUST reject encoded control characters, not merely raw U+000A.
  // Keep this original regression strict: it must pass via the real validator.
  assert.equal(getLocation(response), ORIGIN + "/dashboard");
});

// Route-level assertions cover the actual confirm/callback handlers, not just
// isolated helper calls; all OTP and PKCE outcomes are synthetic fake successes.
const encodedUnsafeNext = [
  "/path%0Aunsafe",      // original failing encoded newline
  "/path%0aunsafe",      // mixed-case newline
  "/path%0Dunsafe",      // carriage return
  "/path%0dunsafe",
  "/path%09unsafe",      // tab
  "/path%00unsafe",      // NUL
  "/path%1funsafe",      // last C0 byte
  "/path%7Funsafe",      // DEL
  "/path%7funsafe",
  "/onboarding?note=hi%0Athere",
  "/onboarding?note=hi%0dthere",
  "/onboarding?note=%09",
  "/onboarding?note=%00",
  "/onboarding?note=%7f",
  "/onboarding?note=okay#part%0Ahidden",
  "/path%250Aunsafe",    // extra encoding layer; previous %25 guard remains
  "/onboarding?note=%250d",
  "/path%25250Aunsafe",  // multiple encoded percent layers
];

const validNext = [
  "/dashboard",
  "/onboarding",
  "/onboarding?step=profile#income",
  "/financial-profile#expenses",
  "/dashboard?view=monthly%20summary",
];

test("executed confirmation rejects encoded C0/DEL in paths, queries, fragments and double encodings", async () => {
  const h=confirmationHarness(async () => success);
  for (const next of encodedUnsafeNext) {
    const response=await h.request("?type=email&token_hash="+fakeToken+"&next="+encodeURIComponent(next));
    assert.equal(response.status,307,next);
    assert.equal(getLocation(response),ORIGIN+"/dashboard",next);
  }
  assert.equal(h.calls.length,encodedUnsafeNext.length);
  for(const next of validNext) {
    const response=await h.request("?type=email&token_hash="+fakeToken+"&next="+encodeURIComponent(next));
    assert.equal(getLocation(response),new URL(next,ORIGIN).href,next);
  }
});

test("executed PKCE callback rejects encoded C0/DEL and preserves legitimate local destinations", async () => {
  const h=callbackHarness(async () => ({error:null}));
  for (const next of encodedUnsafeNext) {
    const response=await h.request("?code=synthetic-pkce-code&next="+encodeURIComponent(next));
    assert.equal(response.status,307,next);
    assert.equal(getLocation(response),ORIGIN+"/dashboard",next);
  }
  assert.equal(h.calls.length,encodedUnsafeNext.length);
  for(const next of validNext) {
    const response=await h.request("?code=synthetic-pkce-code&next="+encodeURIComponent(next));
    assert.equal(getLocation(response),new URL(next,ORIGIN).href,next);
  }
});

test("executed confirmation and callback honor duplicate next fallback with encoded-control alternatives", async () => {
  const confirm=confirmationHarness(async () => success);
  const callback=callbackHarness(async () => ({error:null}));
  for (const suffix of [
    "&next=%2Fonboarding&next=%2Fpath%250Aunsafe",
    "&next=%2Fpath%250Aunsafe&next=%2Fonboarding",
  ]) {
    assert.equal(getLocation(await confirm.request("?type=email&token_hash="+fakeToken+suffix)),ORIGIN+"/dashboard");
    assert.equal(getLocation(await callback.request("?code=synthetic-pkce-code"+suffix)),ORIGIN+"/dashboard");
  }
});

test("executed confirmation never trusts a hostile or lookalike URL origin or forwarded host", async () => {
  const h = confirmationHarness(async () => success);
  const get = executeModule("../../app/auth/confirm/route.ts", {
    "next/server": nextServer, ...realHelpers,
    "@/lib/supabase/server": { createClient: async () => { throw new Error("MUST_NOT_CALL"); } },
  }).GET as Route["GET"];
  for (const hostile of [
    "https://lookalike.example/auth/confirm?type=email&token_hash=" + fakeToken,
    "https://ffh-synthetic.example.evil.invalid/auth/confirm?type=email&token_hash=" + fakeToken,
    "http://ffh-synthetic.example/auth/confirm?type=email&token_hash=" + fakeToken,
  ]) {
    const response = await get(new Request(hostile, {
      headers: { host: "ffh-synthetic.example", "x-forwarded-host": "ffh-synthetic.example" },
    }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Authentication origin is not configured." });
    assert.equal(response.headers.get("location"), null);
  }
  // Forged forwarded headers cannot alter an independently validated URL.
  const good = await h.request("?type=email&token_hash=" + fakeToken, {
    host: "lookalike.example", "x-forwarded-host": "lookalike.example",
  });
  assert.equal(getLocation(good), ORIGIN + "/dashboard");
});

test("executed PKCE callback exchanges code and preserves safe same-origin destination", async () => {
  const h = callbackHarness(async () => ({ error: null }));
  const response = await h.request("?code=synthetic-pkce-code&next=%2Fonboarding%3Fstep%3Dprofile");
  assert.equal(response.status, 307);
  assert.equal(getLocation(response), ORIGIN + "/onboarding?step=profile");
  assert.deepEqual(h.calls, ["synthetic-pkce-code"]);
  assert.equal(h.clients, 1);
});

test("executed callback fails generically for missing or rejected PKCE code and does not echo code", async () => {
  const h = callbackHarness(async () => ({ error: { message: "synthetic PKCE expired/reused/invalid" } }));
  assertGeneric(await h.request("?next=%2Fonboarding"));
  assert.equal(h.clients, 0);
  for (const reason of ["invalid", "expired", "reused"]) {
    assertGeneric(await h.request("?code=synthetic-" + reason + "&next=%2Fonboarding"));
  }
  assert.deepEqual(h.calls, ["synthetic-invalid", "synthetic-expired", "synthetic-reused"]);
});

test("executed callback rejects unsafe next and untrusted request origin", async () => {
  const h = callbackHarness(async () => ({ error: null }));
  for (const next of ["//evil.example", "/%2f%2fevil.example", "/auth/login?next=//evil.example"]) {
    const response = await h.request("?code=synthetic-pkce-code&next=" + encodeURIComponent(next));
    assert.equal(getLocation(response), ORIGIN + "/dashboard");
  }
  assert.equal(getLocation(await h.request("?code=synthetic-pkce-code&next=%2Fgood&next=%2Fbad")), ORIGIN + "/dashboard");
  const bad = await h.GET(new Request("https://evil.example/auth/callback?code=synthetic-pkce-code", {
    headers: { host: "ffh-synthetic.example", "x-forwarded-host": "ffh-synthetic.example" },
  }));
  assert.equal(bad.status, 400);
  assert.equal(bad.headers.get("location"), null);
  assert.equal(h.calls.length, 4);
});

test("executed signup uses the canonical callback for a synthetic matching origin", async () => {
  let signup: { email: string; password: string; options: { emailRedirectTo: string } } | undefined;
  const createClient = async () => ({ auth: { signUp: async (args: typeof signup) => {
    signup = args;
    return { error: null };
  } } });
  const actions = executeModule("../../app/auth/actions.ts", {
    "@/lib/auth/trusted-origin": realHelpers["@/lib/auth/trusted-origin"],
    "@/lib/supabase/server": { createClient },
    "next/headers": { headers: async () => ({ get: (key: string) => key === "origin" ? ORIGIN : null }) },
    "next/navigation": { redirect: (destination: string) => { throw new SyntheticRedirect(destination); } },
  }) as { signUp: (data: FormData) => Promise<void> };
  const fd = new FormData();
  fd.set("email", "test-user@synthetic.invalid"); fd.set("password", "fake-password-only");
  await assert.rejects(actions.signUp(fd), (e: unknown) =>
    e instanceof SyntheticRedirect && e.destination === "/auth/login?message=Check%20your%20email%20to%20confirm%20your%20account.");
  assert.equal(signup?.options.emailRedirectTo, ORIGIN + "/auth/callback");
  assert.equal(signup?.email, "test-user@synthetic.invalid");
});

test("executed signup rejects a hostile origin before any provider call", async () => {
  let calls = 0;
  const actions = executeModule("../../app/auth/actions.ts", {
    "@/lib/auth/trusted-origin": realHelpers["@/lib/auth/trusted-origin"],
    "@/lib/supabase/server": { createClient: async () => { calls++; return {}; } },
    "next/headers": { headers: async () => ({ get: () => "https://evil.invalid" }) },
    "next/navigation": { redirect: (destination: string) => { throw new SyntheticRedirect(destination); } },
  }) as { signUp: (data: FormData) => Promise<void> };
  await assert.rejects(actions.signUp(new FormData()), (e: unknown) =>
    e instanceof SyntheticRedirect && e.destination === "/auth/sign-up?error=Authentication%20origin%20is%20not%20configured.");
  assert.equal(calls, 0);
});

test("SSR server cookie adapter delegates getAll/setAll to the mock store without changing attributes", async () => {
  const writes: { name: string; value: string; options?: object }[] = [];
  const reads = [{ name: "synthetic", value: "fixture" }];
  let adapter: { cookies: { getAll: () => unknown; setAll: (changes: {name:string;value:string;options?:object}[]) => void } } | undefined;
  const createServerClient = (_url: string, _key: string, options: typeof adapter) => {
    adapter = options;
    return { auth: {} };
  };
  const mod = executeModule("../../lib/supabase/server.ts", {
    "@supabase/ssr": { createServerClient },
    "next/headers": { cookies: async () => ({
      getAll: () => reads,
      set: (name: string, value: string, options?: object) => writes.push({name,value,options}),
    }) },
  }) as { createClient: () => Promise<unknown> };
  await mod.createClient();
  assert.deepEqual(adapter?.cookies.getAll(), reads);
  const options = { httpOnly: true, secure: true, sameSite: "lax" };
  adapter?.cookies.setAll([{ name:"synthetic", value:"fake-session-cookie", options }]);
  assert.deepEqual(writes, [{ name:"synthetic", value:"fake-session-cookie", options }]);
  // This verifies the adapter callback only, not deployed Set-Cookie headers.
});

test("Supabase SSR proxy cookie adapter forwards synthetic refresh cookies and headers to its response", async () => {
  const requestWrites: string[] = [];
  const responseWrites: { name: string; value: string; options: object }[] = [];
  let responseHeaders: Headers | undefined;
  const NextResponse = {
    next: () => {
      const r = new Response(null, {status:200}) as Response & {cookies: {set:(name:string,value:string,options:object)=>void}};
      r.cookies={set:(name,value,options)=>responseWrites.push({name,value,options})};
      responseHeaders = r.headers;
      return r;
    },
    json: nextServer.NextResponse.json,
    redirect: nextServer.NextResponse.redirect,
  };
  const sessionOptions={ secure:true,httpOnly:true,sameSite:"lax" };
  const createServerClient = (_url:string,_key:string,options:{
    cookies:{getAll:()=>unknown;setAll:(changes: {name:string;value:string;options:object}[],headers:Record<string,string>)=>void}
  }) => ({
    auth:{
      getClaims:async () => {
        options.cookies.getAll();
        options.cookies.setAll([{name:"synthetic-session",value:"fixture-value",options:sessionOptions}],
          {"x-synthetic-refreshed":"yes"});
        return {data:{claims:{sub:"synthetic-account"}}};
      },
    },
  });
  const mod = executeModule("../../lib/supabase/proxy.ts", {
    "@supabase/ssr": { createServerClient },
    "next/server": { NextResponse },
    "@/lib/auth/trusted-origin": realHelpers["@/lib/auth/trusted-origin"],
  }) as { updateSession: (request:unknown) => Promise<Response> };
  const request={
    url:ORIGIN+"/dashboard",
    nextUrl:new URL(ORIGIN+"/dashboard"),
    cookies:{getAll:()=>[{name:"synthetic-session",value:"fixture"}],set:(name:string)=>requestWrites.push(name)},
  };
  const response=await mod.updateSession(request);
  assert.equal(response.status,200);
  assert.deepEqual(requestWrites,["synthetic-session"]);
  assert.deepEqual(responseWrites,[{name:"synthetic-session",value:"fixture-value",options:sessionOptions}]);
  assert.equal(responseHeaders?.get("x-synthetic-refreshed"),"yes");
  // Mock cookie-set callbacks do not create/verify real HTTP Set-Cookie bytes.
});

test("source-only and live gaps remain explicit rather than asserted by this harness", () => {
  const callback=read("../../app/auth/callback/route.ts");
  const confirm=read("../../app/auth/confirm/route.ts");
  const proxy=read("../../lib/supabase/proxy.ts");
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(confirm, /!error && data\.session/);
  assert.match(proxy, /getClaims\(\)/);
  assert.doesNotMatch(confirm+callback+proxy, /x-forwarded-host/i);
});
