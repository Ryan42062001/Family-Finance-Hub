import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { isTotpCode, newPasswordProblem, parseSecurityStatus, PASSWORD_MIN } from "../../lib/auth/account-security.ts";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const helpers = read("lib/auth/account-security.ts");
const actions = read("app/account/security-actions.ts");
const migration = read("supabase/migrations/20261118100000_ffh_p08_account_security.sql");
const proxy = read("lib/supabase/proxy.ts");
const login = read("app/auth/actions.ts");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

test("FFH-P08 password rules: 8+ characters, at most 72 bytes, confirmed, different from the current one (R6)", () => {
  assert.equal(PASSWORD_MIN, 8);
  assert.match(newPasswordProblem("short", "short", "old-password-1")!, /at least 8/);
  assert.match(newPasswordProblem("a".repeat(73), "a".repeat(73), "old")!, /too long/);
  assert.match(newPasswordProblem("é".repeat(37), "é".repeat(37), "old")!, /too long/); // 74 bytes
  assert.match(newPasswordProblem("synthetic-pass-1", "synthetic-pass-2", "old")!, /don't match/);
  assert.match(newPasswordProblem("same-password-1", "same-password-1", "same-password-1")!, /different/);
  assert.equal(newPasswordProblem("synthetic-pass-1", "synthetic-pass-1", "old-password-1"), null);
});

test("FFH-P08 codes are exactly six digits", () => {
  for (const ok of ["000000", "123456"]) assert.equal(isTotpCode(ok), true);
  for (const bad of ["12345", "1234567", "12345a", " 123456", null, 123456]) assert.equal(isTotpCode(bad), false);
});

test("FFH-P08 security status parsing fails closed on anything unexpected", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  assert.deepEqual(parseSecurityStatus({ session_ok: true, two_factor_on: true, unapproved_factor: false, approved_factor_ids: [id] }),
    { sessionOk: true, twoFactorOn: true, unapprovedFactor: false, approvedFactorIds: [id] });
  for (const bad of [null, "x", [], {}, { session_ok: "true", two_factor_on: true, unapproved_factor: false, approved_factor_ids: [] },
    { session_ok: true, two_factor_on: true, unapproved_factor: false, approved_factor_ids: ["not-a-uuid"] },
    { session_ok: true, two_factor_on: true, unapproved_factor: false }]) {
    assert.equal(parseSecurityStatus(bad), null);
  }
});

test("FFH-P08 throw-away re-authentication client: memory only, no refresh, same user, local sign-out (TM-07)", () => {
  assert.match(helpers, /persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storage: memoryStorage\(\)/);
  assert.match(helpers, /signedIn\?\.user\?\.id !== userId/);
  assert.match(helpers, /const email = who\?\.user\?\.email;/);
  assert.match(helpers, /real\.auth\.getUser\(\)/);
  assert.match(helpers, /signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(helpers, /from "next\/headers"|from "@\/lib\/supabase\/server"|cookieStore/);
});

test("FFH-P08 server modules never log or echo secrets or provider errors", () => {
  for (const [name, src] of [["helpers", helpers], ["actions", actions]] as const) {
    assert.doesNotMatch(src, /console\./, name);
    assert.doesNotMatch(src, /error:\s*[a-zA-Z]+(Error|error)\.message|\$\{[^}]*\.message/, name);
  }
  // Identity never comes from a form field.
  assert.doesNotMatch(actions, /formData\.get\("(email|user_id|userId)"\)|field\(formData, "(email|user_id)"/);
});

test("FFH-P08 the server-only helpers are never imported by a client component", () => {
  for (const file of [...sourceFiles("app"), ...sourceFiles("components")]) {
    const src = readFileSync(file, "utf8");
    if (/^["']use client["']/.test(src.trimStart())) {
      assert.doesNotMatch(src, /lib\/auth\/account-security|@supabase\/supabase-js/, file);
    }
  }
});

test("FFH-P08 actions: password change requires the current password at the provider and ends every session", () => {
  assert.match(actions, /updateUser\(\{ password: next, current_password: current \}\)/);
  assert.match(actions, /rpc\("finish_password_change"\)/);
  assert.match(actions, /signOut\(\{ scope: "global" \}\)/); // fallback if the database step fails
  assert.match(actions, /rpc\("delete_my_account", \{ p_confirm: "DELETE" \}\)/);
  assert.match(actions, /rpc\("approve_my_mfa_factor", \{ p_factor_id: factorId \}\)/);
  assert.match(actions, /rpc\("turn_off_my_two_factor"\)/);
  // Every sensitive database call is made with the throw-away proof session, never the browser session.
  for (const fn of ["finish_password_change", "delete_my_account", "approve_my_mfa_factor", "turn_off_my_two_factor"]) {
    assert.doesNotMatch(actions, new RegExp(`real\\.rpc\\("${fn}"`), fn);
  }
});

test("FFH-P08 sign-in sends a session that still needs its code to the code page", () => {
  assert.match(login, /rpc\("my_security_status"\)/);
  assert.match(login, /redirect\("\/auth\/two-factor"\)/);
  assert.match(proxy, /path === "\/account\/deleted"/);
  assert.match(proxy, /const state = s\?\.session_ok === true \? "ok"/);
});

test("FFH-P08 migration: the gate is in every helper and RPC, and sensitive RPCs prove fresh re-authentication", () => {
  for (const helper of ["is_household_member", "can_read_household", "can_write_household_financials", "is_household_owner"]) {
    const start = migration.indexOf(`create or replace function private.${helper}(`);
    assert.ok(start > 0, helper);
    assert.match(migration.slice(start, migration.indexOf("$$;", start)), /private\.session_ok\(\) and exists/, helper);
  }
  for (const rpc of ["finish_password_change", "approve_my_mfa_factor", "turn_off_my_two_factor", "delete_my_account"]) {
    const start = migration.indexOf(`create or replace function public.${rpc}(`);
    assert.ok(start > 0, rpc);
    assert.match(migration.slice(start, migration.indexOf("$$;", start)), /perform private\.recent_reauth\('/, rpc);
  }
  assert.match(migration, /revoke all on function private\.owner_reset_mfa\(uuid, text\) from public, anon, authenticated;/);
  assert.match(migration, /alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;/);
  assert.doesNotMatch(migration, /grant[^;]*private\.(mfa_approved_factors|reauth_uses|security_events)[^;]*to (anon|authenticated)/i);
});

test("FFH-P08 the migration is generated: build script output matches the committed file", () => {
  const head = read("scripts/p08/migration-head.sql");
  const tail = read("scripts/p08/migration-tail.sql");
  assert.ok(migration.startsWith(head), "migration must start with migration-head.sql");
  assert.ok(migration.endsWith(tail), "migration must end with migration-tail.sql");
});
