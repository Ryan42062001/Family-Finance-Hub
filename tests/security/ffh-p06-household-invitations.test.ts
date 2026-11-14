import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { hashInviteToken, inviteLink, isInviteToken, newInviteToken, parseInviteLabel, parseInviteRole } from "../../lib/household/invitations.ts";
import { householdNotice } from "../../lib/household/notices.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const sql = read("supabase/migrations/20261114010000_ffh_p06_household_invitations.sql").replace(/--.*$/gm, "");
const hardened = read("supabase/migrations/20261114020000_ffh_p06_invitation_security_remediation.sql").replace(/--.*$/gm, "");
const preflight = read("scripts/rls-local/preflight.sql");
const matrix = read("scripts/rls-local/matrix.sql");
const runner = read("scripts/rls-ci/run-matrix.sh");
const concurrency = read("scripts/rls-ci/test-invitation-concurrency.sh");
const qa = read("docs/workflow/QA_CHECKLIST.md");
const actions = read("app/household/actions.ts");
const invitePage = read("app/invite/[token]/page.tsx");
const householdPage = read("app/household/page.tsx");
const proxy = read("lib/supabase/proxy.ts");
const inviteForm = read("components/household/InviteForm.tsx");

test("FFH-P06 tokens are 256-bit random, stored only as a SHA-256 hash, and links use the configured origin", () => {
  const { token, hash } = newInviteToken();
  assert.ok(isInviteToken(token));
  assert.equal(token.length, 43);
  assert.equal(hash, createHash("sha256").update(token).digest("hex"));
  assert.equal(hashInviteToken(token), hash);
  assert.notEqual(newInviteToken().token, token);
  for (const bad of ["", "short", "a".repeat(44), "a".repeat(42) + "!", null, 42]) assert.equal(isInviteToken(bad), false, String(bad));
  assert.equal(inviteLink("https://family-finance-hub-preview.vercel.app", token), `https://family-finance-hub-preview.vercel.app/invite/${token}`);
  assert.equal(inviteLink("https://example.org/some/path", token), `https://example.org/invite/${token}`);
  for (const bad of [undefined, "", "not a url", "http://evil.example", "javascript:alert(1)"]) assert.equal(inviteLink(bad, token), null, String(bad));
  assert.equal(inviteLink("https://example.org", "bad"), null);
  // The action never derives the link from request headers, and stores only the hash.
  assert.match(actions, /inviteLink\(process\.env\.NEXT_PUBLIC_SITE_URL, token\)/);
  assert.doesNotMatch(actions, /headers\(\)|x-forwarded|host/i);
  assert.match(actions, /\.insert\(\{ household_id: householdId, role, label, token_hash: hash \}\)/);
  assert.doesNotMatch(actions, /token_hash: token\b/);
});

test("FFH-P06 role and label input is strict", () => {
  assert.equal(parseInviteRole("member"), "member");
  assert.equal(parseInviteRole("viewer"), "viewer");
  for (const bad of ["owner", "Member", "", null, ["member"]]) assert.equal(parseInviteRole(bad), null, String(bad));
  assert.equal(parseInviteLabel("  Jordan "), "Jordan");
  assert.equal(parseInviteLabel(""), null);
  assert.equal(parseInviteLabel(null), null);
  assert.equal(parseInviteLabel("x".repeat(61)), undefined);
});

test("FFH-P06 migration: owner-only invitations, no UPDATE, narrow definer functions", () => {
  assert.match(sql, /role public\.household_role not null check \(role in \('member', 'viewer'\)\)/);
  assert.match(sql, /token_hash text not null unique check \(token_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  assert.match(sql, /expires_at <= created_at \+ interval '7 days'/);
  assert.match(sql, /alter table public\.household_invitations enable row level security;/);
  for (const policy of ["owner_select", "owner_insert", "owner_delete_pending"]) assert.match(sql, new RegExp(`household_invitations_${policy}`));
  assert.equal((sql.match(/create policy/g) ?? []).length, 3);
  assert.doesNotMatch(sql, /for update to/);
  assert.match(sql, /grant select, insert, delete on public\.household_invitations to authenticated;/);
  assert.doesNotMatch(sql, /grant[^;]*update[^;]*household_invitations/i);
  assert.doesNotMatch(sql, /grant[^;]*on public\.household_members/i, "no direct membership writes");
  for (const fn of ["accept_household_invitation", "set_household_member_role", "remove_household_member"]) {
    const body = sql.slice(sql.indexOf(`create or replace function public.${fn}(`));
    assert.match(body.slice(0, 400), /security definer\nset search_path = ''/, fn);
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated;`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to authenticated;`));
  }
  const accept = sql.slice(sql.indexOf("create or replace function public.accept_household_invitation"), sql.indexOf("create or replace function public.set_household_member_role"));
  assert.match(accept, /for update;/);
  assert.match(accept, /if not found or v_invite\.accepted_at is not null or v_invite\.expires_at <= now\(\) then/);
  assert.match(accept, /if exists \(select 1 from public\.household_members where user_id = v_user\) then/);
  assert.match(accept, /encode\(sha256\(convert_to\(p_token, 'UTF8'\)\), 'hex'\)/);
  for (const fn of ["set_household_member_role", "remove_household_member"]) {
    const body = sql.slice(sql.indexOf(`create or replace function public.${fn}(`));
    assert.match(body.slice(0, 900), /not private\.is_household_owner\(p_household_id\)/);
    assert.match(body.slice(0, 900), /role <> 'owner'/);
  }
});

test("FFH-P06 app: membership changes only through the checked functions; fixed notices only", () => {
  assert.match(actions, /^"use server";/);
  assert.doesNotMatch(actions, /from\("household_members"\)/, "never writes memberships directly");
  assert.match(actions, /rpc\("accept_household_invitation", \{ p_token: token \}\)/);
  assert.match(actions, /rpc\("set_household_member_role"/);
  assert.match(actions, /rpc\("remove_household_member"/);
  assert.match(actions, /formData\.get\("confirm"\) !== "yes"/);
  // The remembered-invite cookie is httpOnly, lax, 7 days, and cleared when used.
  assert.match(actions, /jar\.set\(INVITE_COOKIE, token, \{ httpOnly: true, secure: process\.env\.NODE_ENV === "production", sameSite: "lax", path: "\/", maxAge: INVITE_COOKIE_MAX_AGE_SECONDS \}\)/);
  assert.match(actions, /jar\.delete\(INVITE_COOKIE\);\n\s+if \(!isInviteToken\(token\)\)/);
  for (const bad of ["", "unknown", "__proto__", "constructor", ["removed"]]) assert.equal(householdNotice(bad), null, String(bad));
  assert.match(householdPage, /const notice = householdNotice\(\(await searchParams\)\.notice\);/);
  assert.match(inviteForm, /useActionState<InviteState, FormData>\(createInvitation/);
});

test("FFH-P06 invite landing page: public by exact pattern, shows no household data, no referrer", () => {
  assert.match(proxy, /\/\^\\\/invite\\\/\[A-Za-z0-9_-\]\{1,64\}\$\/\.test\(path\)/);
  assert.match(invitePage, /referrer: "no-referrer"/);
  assert.match(invitePage, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(invitePage, /from\("|\.rpc\(/, "the page reads nothing about the household");
  assert.match(invitePage, /if \(!isInviteToken\(token\)\)/);
  assert.doesNotMatch(invitePage, /\{token\}<|>\{token\}/, "the token is never printed as text");
});


test("FFH-P06 HIGH: migration adds a database-enforced one-household-per-account invariant", () => {
  assert.match(hardened, /group by user_id having count\(\*\) > 1/);
  assert.match(hardened, /FFH_P06_MEMBERSHIP_COLLISION_MANUAL_REVIEW_REQUIRED/);
  assert.match(hardened, /FFH_P06_FUTURE_DATED_INVITATIONS_MANUAL_REVIEW_REQUIRED/);
  assert.match(hardened, /add constraint household_members_one_household_per_user unique \(user_id\)/);
  assert.match(hardened, /begin;[\s\S]+commit;/);
  assert.doesNotMatch(hardened, /delete from public\.household_members/i);
  assert.match(hardened, /exception when unique_violation then/);
  assert.match(hardened, /permission denied: you already belong to a household/);
  assert.match(preflight, /PREFLIGHT_ONE_HOUSEHOLD_UNIQUE_CONSTRAINT_MISSING/);
  assert.match(matrix, /membership-creator-second-household-denied/);
  assert.match(matrix, /membership-privileged-duplicate-rejected/);
});

test("FFH-P06 MEDIUM: column-scoped INSERT prevents owner-controlled invite timestamps", () => {
  assert.match(hardened, /revoke insert on public\.household_invitations from authenticated/);
  assert.match(hardened, /grant insert \(household_id, role, label, token_hash\)/);
  assert.doesNotMatch(hardened, /grant insert \([^)]*(?:created_at|expires_at|created_by|accepted_at)/i);
  assert.match(sql, /created_at timestamptz not null default now\(\)/);
  assert.match(sql, /expires_at timestamptz not null default now\(\) \+ interval '7 days'/);
  for (const column of ["id", "created_by", "created_at", "expires_at", "accepted_at", "accepted_by"])
    assert.ok(preflight.includes("'"+column+"'"), "missing protected column privilege probe: " + column);
  for (const probe of [
    "invite-future-created-at-denied", "invite-client-expiry-denied",
    "invite-client-creator-denied", "invite-client-id-denied",
    "invite-client-acceptance-denied", "invite-server-clock-seven-days",
  ]) assert.ok(matrix.includes(probe), "missing SQL probe: " + probe);
});

test("FFH-P06 HIGH: two actual parallel psql sessions prove unguarded race and guarded rejection", () => {
  assert.match(concurrency, /docker exec -i "\$container" psql/);
  assert.match(concurrency, /SET LOCAL ROLE authenticated;/);
  assert.match(concurrency, /pg_sleep\(4\)/);
  assert.match(concurrency, /accept "\$token_a" >"\$log_a" 2>&1 &/);
  assert.match(concurrency, /accept "\$token_b" >"\$log_b" 2>&1 &/);
  assert.match(concurrency, /DROP CONSTRAINT household_members_one_household_per_user/);
  assert.match(concurrency, /FFH_P06_CONCURRENT_UNGUARDED=REPRODUCED_TWO_HOUSEHOLDS/);
  assert.match(concurrency, /FFH_P06_EXISTING_DATA_MIGRATION=FAIL_CLOSED/);
  assert.match(concurrency, /FFH_P06_LEGACY_FUTURE_INVITE=FAIL_CLOSED/);
  assert.match(concurrency, /DUPLICATE_MIGRATION_GUARD_NOT_EXECUTED/);
  assert.match(concurrency, /FUTURE_MIGRATION_GUARD_NOT_EXECUTED/);
  assert.match(concurrency, /FFH_P06_CONCURRENT_GUARDED=ONE_WINNER_ONE_DENIED/);
  assert.match(concurrency, /FFH_P06_CONCURRENCY=PASS ZERO_RESIDUE=PASS/);
  assert.match(runner, /bash scripts\/rls-ci\/test-invitation-concurrency\.sh/);
  assert.match(runner, /EXPECTED_MIGRATIONS=22/);
  assert.match(runner, /EXPECTED_ASSERTIONS=1122/);
});

test("FFH-P06 LOW: Q24 checks cancelled link only after acceptance, never enumerates on landing", () => {
  assert.match(qa, /Q24[^\n]*choose \*\*Join the household\*\*/);
  assert.match(qa, /Q24[^\n]*generic invitation shell/);
  assert.match(invitePage, /if \(!isInviteToken\(token\)\)/);
  assert.doesNotMatch(invitePage, /from\("|\.rpc\(/);
  assert.match(actions, /redirect\(already \? "\/invite\/already-member" : "\/invite\/invalid"\)/);
});
