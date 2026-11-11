import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { supabaseCookieOptions } from "../../lib/supabase/cookie-options.ts";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("FFH-P01 session cookie is Secure for every HTTPS origin and fails closed", () => {
  assert.deepEqual(supabaseCookieOptions("https://family-finance-hub-ten-brown.vercel.app"), { secure: true });
  assert.deepEqual(supabaseCookieOptions("https://example.com"), { secure: true });
  // Missing or malformed configuration still marks the cookie Secure.
  assert.deepEqual(supabaseCookieOptions(undefined), { secure: true });
  assert.deepEqual(supabaseCookieOptions(""), { secure: true });
  assert.deepEqual(supabaseCookieOptions("not a url"), { secure: true });
  // Only explicit plain-HTTP local development leaves Secure off.
  assert.deepEqual(supabaseCookieOptions("http://localhost:3000"), { secure: false });
});

test("FFH-P01 server, proxy and browser Supabase clients all apply the Secure cookie options", () => {
  for (const path of ["../../lib/supabase/server.ts", "../../lib/supabase/proxy.ts", "../../lib/supabase/client.ts"]) {
    const file = source(path);
    assert.match(file, /import \{ supabaseCookieOptions \} from "@\/lib\/supabase\/cookie-options";/, path);
    assert.match(file, /cookieOptions: supabaseCookieOptions\(\)/, path);
  }
});
