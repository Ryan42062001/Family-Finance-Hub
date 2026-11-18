#!/usr/bin/env node
// FFH-P08 real-provider tests (proposal §10.8 / §11.6): REAL local Supabase Auth tokens through PostgREST against the
// P08 migration, in run-matrix's disposable CI stack. Assertions, not facts: any failure exits non-zero.
// Prints only fixed check names; never a token, password, TOTP secret/URI or key. Synthetic users, removed at the end.
// Usage: node p08-auth-provider.mjs <phase>   (phase: main | current-password)
import { createHmac, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const env = process.env;
if (env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted') { console.error('P08_PROVIDER_BLOCKED_SCOPE'); process.exit(1); }
const API = env.FFH_SPIKE_API_URL ?? '';
const ANON = env.FFH_SPIKE_ANON_KEY ?? '';
const SERVICE = env.FFH_SPIKE_SERVICE_KEY ?? '';
const CONTAINER = env.FFH_SPIKE_DB_CONTAINER ?? '';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API) || !ANON || !SERVICE || !/^supabase_db_ffh_ci_rls_\w+$/.test(CONTAINER)) {
  console.error('P08_PROVIDER_BLOCKED_INPUT'); process.exit(1);
}
const phase = process.argv[2] ?? 'main';
let passed = 0;
function check(name, condition) {
  if (!condition) throw new Error(`P08_PROVIDER_FAIL ${name}`);
  passed += 1;
  console.log(`P08_PROVIDER_PASS ${name}`);
}
function sql(text) {
  return execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'],
    { input: text, encoding: 'utf8' }).trim();
}
async function call(method, path, { token, body, admin = false } = {}) {
  const headers = { apikey: admin ? SERVICE : ANON, 'content-type': 'application/json' };
  if (token || admin) headers.authorization = `Bearer ${admin ? SERVICE : token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null; try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, json };
}
const claims = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
const errCode = (r) => (r.json && (r.json.error_code ?? r.json.code)) ?? null;

function base32(s) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; const out = [];
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += alpha.indexOf(c).toString(2).padStart(5, '0');
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function totp(secret) {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const h = createHmac('sha1', base32(secret)).update(buf).digest(); const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
// A TOTP code is accepted once; the next verification of the same factor waits for the next 30 s window.
const nextWindow = () => new Promise((r) => setTimeout(r, 30_000 - (Date.now() % 30_000) + 600));

async function newUser(tag) {
  const email = `ffh-p08-${tag}-${randomBytes(4).toString('hex')}@example.test`;
  const password = `Synthetic-${randomBytes(12).toString('hex')}`;
  const r = await call('POST', '/auth/v1/admin/users', { admin: true, body: { email, password, email_confirm: true } });
  if (r.status !== 200) throw new Error('P08_PROVIDER_FIXTURE admin create');
  return { email, password, id: r.json.id };
}
async function signIn(u, password = u.password) {
  const r = await call('POST', '/auth/v1/token?grant_type=password', { body: { email: u.email, password } });
  return r.status === 200 ? r.json : null;
}
const rpc = (token, fn, body = {}) => call('POST', `/rest/v1/rpc/${fn}`, { token, body });
const ok2xx = (r) => r.status >= 200 && r.status < 300;
async function households(token) {
  const r = await call('GET', '/rest/v1/households?select=id', { token });
  return r.status === 200 ? r.json.length : -1;
}
async function createHousehold(token, userId) {
  const r = await call('POST', '/rest/v1/households', { token, body: { name: 'ZZ-P08 provider', created_by: userId } });
  if (r.status !== 201) throw new Error('P08_PROVIDER_FIXTURE household');
}
async function enroll(token) {
  const e = await call('POST', '/auth/v1/factors', { token, body: { factor_type: 'totp', friendly_name: `p08-${randomBytes(3).toString('hex')}` } });
  return e.status === 200 ? { id: e.json.id, secret: e.json.totp.secret } : null;
}
async function verify(token, factor) {
  const c = await call('POST', `/auth/v1/factors/${factor.id}/challenge`, { token, body: {} });
  const v = await call('POST', `/auth/v1/factors/${factor.id}/verify`, { token, body: { challenge_id: c.json?.id, code: totp(factor.secret) } });
  return v.status === 200 ? v.json : null;
}

async function main() {
  if (phase === 'current-password') {
    // R9: with the provider setting on, a stolen session cannot change the password without the current one.
    const u = await newUser('cp');
    const s = await signIn(u);
    const without = await call('PUT', '/auth/v1/user', { token: s.access_token, body: { password: `New-${randomBytes(10).toString('hex')}` } });
    check('provider-refuses-password-change-without-current', without.status === 400 && errCode(without) === 'current_password_required');
    const wrong = await call('PUT', '/auth/v1/user', { token: s.access_token, body: { password: `New-${randomBytes(10).toString('hex')}`, current_password: 'wrong-password-123' } });
    check('provider-refuses-wrong-current-password', wrong.status === 400 && errCode(wrong) === 'current_password_invalid');
    const right = await call('PUT', '/auth/v1/user', { token: s.access_token, body: { password: `New-${randomBytes(10).toString('hex')}`, current_password: u.password } });
    check('provider-accepts-correct-current-password', right.status === 200);
    return;
  }

  // 1. Session liveness: ending sessions makes every older access token useless at once (TM-06/N02).
  const a = await newUser('a');
  const a1 = await signIn(a); const a2 = await signIn(a);
  await createHousehold(a1.access_token, a.id);
  check('live-session-sees-own-household', (await households(a2.access_token)) === 1);
  const refreshed = await call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: a1.refresh_token } });
  check('refresh-keeps-original-amr-timestamps', JSON.stringify(claims(refreshed.json.access_token).amr) === JSON.stringify(claims(a1.access_token).amr));
  const proof = await signIn(a);
  check('finish-password-change-ok', ok2xx((await rpc(proof.access_token, 'finish_password_change'))));
  check('old-token-after-session-end-sees-nothing', (await households(a2.access_token)) === 0);
  check('refreshed-token-after-session-end-sees-nothing', (await households(refreshed.json.access_token)) === 0);
  check('ended-session-cannot-refresh', (await call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: a2.refresh_token } })).status === 400);
  check('replayed-finish-refused', (await rpc(proof.access_token, 'finish_password_change')).status >= 400);
  const a3 = await signIn(a);
  check('new-sign-in-works-again', (await households(a3.access_token)) === 1);

  // 2. Two-factor: approve, then aal1 is pending and only an APPROVED factor's aal2 counts (TM-02, N01).
  const b = await newUser('b');
  const b1 = await signIn(b);
  await createHousehold(b1.access_token, b.id);
  const factorA = await enroll(b1.access_token);
  const b1v = await verify(b1.access_token, factorA);
  check('first-factor-verified', !!b1v);
  // Audit F01: the session that existed BEFORE the authenticator was enrolled (a stolen recent token) enrolls,
  // verifies and tries to approve it. Must be refused, and nothing approved.
  check('stolen-pre-enrolment-session-cannot-approve', (await rpc(b1v.access_token, 'approve_my_mfa_factor', { p_factor_id: factorA.id })).status >= 400);
  check('stolen-pre-enrolment-session-approved-nothing', sql(`select count(*) from private.mfa_approved_factors where user_id = '${b.id}'`) === '0');
  // FFH's real flow: a NEW password sign-in after enrolment, verified with that authenticator, approves it.
  const b1fresh = await signIn(b);
  await nextWindow();
  const b1freshV = await verify(b1fresh.access_token, factorA);
  check('approve-first-factor-from-new-session', !!b1freshV && ok2xx(await rpc(b1freshV.access_token, 'approve_my_mfa_factor', { p_factor_id: factorA.id })));
  check('approve-ended-the-approving-session', (await households(b1freshV.access_token)) === 0);
  const b2 = await signIn(b);
  check('aal1-with-approved-factor-sees-nothing', (await households(b2.access_token)) === 0);
  const pending = await rpc(b2.access_token, 'my_security_status');
  check('aal1-status-is-pending', pending.status === 200 && pending.json.session_ok === false && pending.json.two_factor_on === true);
  check('aal1-cannot-delete-account', (await rpc(b2.access_token, 'delete_my_account', { p_confirm: 'DELETE' })).status >= 400);
  await nextWindow();
  const b2v = await verify(b2.access_token, factorA);
  check('aal2-with-approved-factor-sees-household', !!b2v && (await households(b2v.access_token)) === 1);
  const rogue = await enroll(b2v.access_token);
  const b2rogue = rogue && await verify(b2v.access_token, rogue);
  check('rogue-factor-verified-by-provider', !!b2rogue && claims(b2rogue.access_token).aal === 'aal2');
  check('rogue-factor-aal2-sees-nothing', (await households(b2rogue.access_token)) === 0);
  const rogueStatus = await rpc(b2rogue.access_token, 'my_security_status');
  check('rogue-factor-reported', rogueStatus.status === 200 && rogueStatus.json.unapproved_factor === true && rogueStatus.json.session_ok === false);

  // 3. Turn two-factor off with a fresh proof (password + approved factor): approvals gone, others ended.
  await nextWindow();
  const b3 = await signIn(b);
  const b3v = await verify(b3.access_token, factorA);
  check('turn-off-proof-session', !!b3v);
  check('turn-off-ok', ok2xx(await rpc(b3v.access_token, 'turn_off_my_two_factor')));
  check('turn-off-ended-other-sessions', (await households(b2v.access_token)) === 0);
  // Audit F02: every authenticator (approved and rogue) removed in the same transaction; acting session ended too.
  check('turn-off-removed-every-authenticator', sql(`select count(*) from auth.mfa_factors where user_id = '${b.id}'`) === '0');
  check('turn-off-ended-acting-session', (await households(b3v.access_token)) === 0);
  const b4 = await signIn(b);
  check('after-turn-off-password-alone-works', (await households(b4.access_token)) === 1);

  // 4. Delete my account through the real token: fresh proof required; household and its data go; old tokens die.
  const c = await newUser('c');
  const c1 = await signIn(c);
  await createHousehold(c1.access_token, c.id);
  check('delete-wrong-confirmation-refused', (await rpc(c1.access_token, 'delete_my_account', { p_confirm: 'delete' })).status >= 400);
  const cProof = await signIn(c);
  const deleted = await rpc(cProof.access_token, 'delete_my_account', { p_confirm: 'DELETE' });
  check('delete-account-ok', deleted.status === 200 && deleted.json === 'deleted');
  check('deleted-account-old-token-sees-nothing', (await households(c1.access_token)) === 0);
  check('deleted-account-cannot-sign-in', (await signIn(c)) === null);
  check('deleted-account-household-gone', sql(`select count(*) from public.households where created_by = '${c.id}'`) === '0');
  check('deleted-account-audited', sql(`select count(*) from private.security_events where user_id = '${c.id}' and event = 'account_deleted'`) === '1');

  // 5. Owner-assisted reset (R11) as postgres: every session and factor gone.
  const d = await newUser('d');
  const d1 = await signIn(d);
  const dFactor = await enroll(d1.access_token);
  await verify(d1.access_token, dFactor);
  const d1fresh = await signIn(d);
  await nextWindow();
  const d1v = await verify(d1fresh.access_token, dFactor);
  check('owner-reset-fixture-approved', !!d1v && ok2xx(await rpc(d1v.access_token, 'approve_my_mfa_factor', { p_factor_id: dFactor.id })));
  const d2 = await signIn(d);
  sql(`select private.owner_reset_mfa('${d.id}', 'P08 provider synthetic reset')`);
  check('owner-reset-ends-sessions', (await rpc(d2.access_token, 'my_security_status')).status >= 400);
  const d3 = await signIn(d);
  const dStatus = await rpc(d3.access_token, 'my_security_status');
  check('owner-reset-two-factor-off', dStatus.status === 200 && dStatus.json.two_factor_on === false && dStatus.json.session_ok === true);
}

main()
  .then(() => {
    sql(`delete from public.households where name = 'ZZ-P08 provider'; delete from auth.users where email like 'ffh-p08-%@example.test';`);
    const left = sql(`select count(*) from auth.users where email like 'ffh-p08-%@example.test'`);
    if (left !== '0') throw new Error('P08_PROVIDER_FAIL residue');
    console.log(`P08_PROVIDER_${phase.toUpperCase().replace('-', '_')}=PASS CHECKS=${passed} ZERO_RESIDUE=PASS`);
  })
  .catch((e) => { console.error(e instanceof Error ? e.message : 'P08_PROVIDER_FAIL unknown'); process.exit(1); });
