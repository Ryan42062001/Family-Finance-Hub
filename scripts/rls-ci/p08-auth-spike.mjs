#!/usr/bin/env node
// FFH-P08 spike (proposal §11.6): what the REAL local Supabase Auth server does, in run-matrix's disposable CI stack.
// Prints facts only ("SPIKE key=value"); never prints a token, password, TOTP secret/URI or key.
// Synthetic users on the disposable local stack only. Refuses to run outside a GitHub-hosted runner or against a
// non-loopback API URL. Usage: node p08-auth-spike.mjs <phase>   (phase: main | current-password)
import { createHmac, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const env = process.env;
if (env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted') { console.error('SPIKE_BLOCKED_SCOPE'); process.exit(1); }
const API = env.FFH_SPIKE_API_URL ?? '';
const ANON = env.FFH_SPIKE_ANON_KEY ?? '';
const SERVICE = env.FFH_SPIKE_SERVICE_KEY ?? '';
const CONTAINER = env.FFH_SPIKE_DB_CONTAINER ?? '';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(API) || !ANON || !SERVICE || !/^supabase_db_ffh_ci_rls_\w+$/.test(CONTAINER)) {
  console.error('SPIKE_BLOCKED_INPUT'); process.exit(1);
}
const phase = process.argv[2] ?? 'main';
const fact = (k, v) => console.log(`SPIKE ${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`);

function sql(text) {
  return execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'],
    { input: text, encoding: 'utf8' }).trim();
}
function sqlTry(text) { try { return { ok: true, out: sql(text) }; } catch (e) { return { ok: false, out: String(e.stderr ?? '').split('\n').find((l) => l.includes('ERROR')) ?? 'error' }; } }

async function call(method, path, { token, body, admin = false } = {}) {
  const headers = { apikey: admin ? SERVICE : ANON, 'content-type': 'application/json' };
  if (token || admin) headers.authorization = `Bearer ${admin ? SERVICE : token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}
const errCode = (r) => (r.json && (r.json.error_code ?? r.json.code ?? r.json.error)) ?? null;
const claims = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));

function base32(s) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; const out = [];
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += alpha.indexOf(c).toString(2).padStart(5, '0');
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function totp(secret, offset = 0) {
  const counter = Math.floor(Date.now() / 1000 / 30) + offset; const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', base32(secret)).update(buf).digest(); const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
const waitNextWindow = async () => { const ms = 30_000 - (Date.now() % 30_000) + 500; await new Promise((r) => setTimeout(r, ms)); };

async function newUser(tag) {
  const email = `ffh-spike-${tag}-${randomBytes(4).toString('hex')}@example.test`;
  const password = `Spike-${randomBytes(12).toString('hex')}`;
  const r = await call('POST', '/auth/v1/admin/users', { admin: true, body: { email, password, email_confirm: true } });
  if (r.status !== 200) throw new Error(`admin create ${r.status}`);
  return { email, password, id: r.json.id };
}
const signIn = (u, pw = u.password) => call('POST', '/auth/v1/token?grant_type=password', { body: { email: u.email, password: pw } });
const sessionRow = (sid) => sql(`select coalesce(json_build_object('aal', aal, 'factor_id_set', factor_id is not null, 'not_after', not_after is not null)::text, 'none') from auth.sessions where id = '${sid}';`) || 'none';

async function enrollAndVerify(token) {
  const e = await call('POST', '/auth/v1/factors', { token, body: { factor_type: 'totp', friendly_name: `spike-${randomBytes(3).toString('hex')}` } });
  if (e.status !== 200) return { enrollStatus: e.status, enrollErr: errCode(e) };
  const fid = e.json.id; const secret = e.json.totp.secret;
  const c = await call('POST', `/auth/v1/factors/${fid}/challenge`, { token, body: {} });
  const v = await call('POST', `/auth/v1/factors/${fid}/verify`, { token, body: { challenge_id: c.json?.id, code: totp(secret) } });
  return { fid, secret, enrollStatus: e.status, challengeStatus: c.status, verifyStatus: v.status, verifyErr: errCode(v), session: v.json };
}
async function challengeVerify(token, fid, secret) {
  const c = await call('POST', `/auth/v1/factors/${fid}/challenge`, { token, body: {} });
  const v = await call('POST', `/auth/v1/factors/${fid}/verify`, { token, body: { challenge_id: c.json?.id, code: totp(secret) } });
  return { status: v.status, err: errCode(v), session: v.json };
}

async function main() {
  fact('phase', phase);
  if (phase === 'current-password') {
    const u = await newUser('cp');
    const s = (await signIn(u)).json;
    const without = await call('PUT', '/auth/v1/user', { token: s.access_token, body: { password: `New-${randomBytes(10).toString('hex')}` } });
    fact('cp.update_without_current.status', without.status); fact('cp.update_without_current.err', errCode(without));
    const wrong = await call('PUT', '/auth/v1/user', { token: s.access_token, body: { password: `New-${randomBytes(10).toString('hex')}`, current_password: 'wrong-password-123' } });
    fact('cp.update_wrong_current.status', wrong.status); fact('cp.update_wrong_current.err', errCode(wrong));
    const right = await call('PUT', '/auth/v1/user', { token: s.access_token, body: { password: `New-${randomBytes(10).toString('hex')}`, current_password: u.password } });
    fact('cp.update_with_current.status', right.status);
    return;
  }

  // Schema and privileges.
  fact('auth.sessions.columns', sql(`select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema='auth' and table_name='sessions';`));
  fact('auth.mfa_factors.columns', sql(`select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema='auth' and table_name='mfa_factors';`));
  fact('auth.mfa_amr_claims.exists', sql(`select to_regclass('auth.mfa_amr_claims') is not null;`));
  fact('postgres.is_superuser', sql(`select rolsuper from pg_roles where rolname = current_user;`));
  for (const t of ['users', 'sessions', 'refresh_tokens', 'mfa_factors', 'identities', 'mfa_challenges']) {
    fact(`priv.postgres.${t}`, sql(`select json_build_object('select', has_table_privilege('postgres','auth.${t}','SELECT'), 'delete', has_table_privilege('postgres','auth.${t}','DELETE'))::text;`));
  }
  fact('auth.fk_cascades', sql(`select string_agg(conrelid::regclass || '->' || confrelid::regclass || ':' || confdeltype, ',' order by 1) from pg_constraint where contype='f' and connamespace='auth'::regnamespace;`));
  fact('auth.users.owner', sql(`select tableowner from pg_tables where schemaname='auth' and tablename='users';`));

  // Claims reach PostgREST.
  sql(`create or replace function public.ffh_spike_claims() returns jsonb language sql stable as $$ select coalesce(auth.jwt(), '{}'::jsonb) $$; grant execute on function public.ffh_spike_claims() to authenticated; notify pgrst, 'reload schema';`);
  await new Promise((r) => setTimeout(r, 1500));

  const a = await newUser('a');
  const s1r = await signIn(a); const s1 = s1r.json;
  const c1 = claims(s1.access_token);
  const dbNow = Number(sql(`select extract(epoch from now())::bigint;`));
  fact('jwt.claim_keys', Object.keys(c1).sort().join(','));
  fact('jwt.aal', c1.aal); fact('jwt.amr', (c1.amr ?? []).map((m) => (typeof m === 'string' ? m : m.method)));
  fact('jwt.amr_has_timestamp', (c1.amr ?? []).every((m) => typeof m === 'object' && Number.isInteger(m.timestamp)));
  fact('clock.iat_minus_db_seconds', c1.iat - dbNow);
  fact('session.row_after_signin', sessionRow(c1.session_id));
  const viaRest = await call('POST', '/rest/v1/rpc/ffh_spike_claims', { token: s1.access_token, body: {} });
  fact('postgrest.sees_session_id_and_amr', viaRest.status === 200 && !!viaRest.json?.session_id && Array.isArray(viaRest.json?.amr));

  // Refresh keeps amr timestamps?
  await new Promise((r) => setTimeout(r, 2100));
  const ref = await call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s1.refresh_token } });
  const c1r = claims(ref.json.access_token);
  fact('refresh.same_session', c1r.session_id === c1.session_id);
  fact('refresh.iat_advanced', c1r.iat > c1.iat);
  fact('refresh.amr_timestamps_unchanged', JSON.stringify(c1r.amr) === JSON.stringify(c1.amr));

  // Second password session, then enroll+verify on the first; does verify end other sessions? which session is aal2?
  const s2 = (await signIn(a)).json; const c2 = claims(s2.access_token);
  const ev = await enrollAndVerify(ref.json.access_token);
  fact('mfa.enroll_status_aal1_no_factors', ev.enrollStatus); fact('mfa.verify_status', ev.verifyStatus); fact('mfa.verify_err', ev.verifyErr);
  if (ev.verifyStatus === 200) {
    const c3 = claims(ev.session.access_token);
    fact('mfa.verify.same_session', c3.session_id === c1.session_id);
    fact('mfa.verify.jwt_aal', c3.aal);
    fact('mfa.verify.amr', c3.amr);
    fact('mfa.verify.session_row', sessionRow(c3.session_id));
    fact('mfa.verify.factor_id_matches', sql(`select factor_id = '${ev.fid}' from auth.sessions where id = '${c3.session_id}';`));
    fact('mfa.verify.other_session_row', sessionRow(c2.session_id));
    const s2ref = await call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s2.refresh_token } });
    fact('mfa.verify.other_session_refresh_status', s2ref.status);
    const s2rest = await call('POST', '/rest/v1/rpc/ffh_spike_claims', { token: s2.access_token, body: {} });
    fact('mfa.verify.other_session_old_access_token_postgrest_status', s2rest.status);

    // Fresh password session for a user with a verified factor: aal1 then nextLevel aal2.
    const s4 = (await signIn(a)).json; const c4 = claims(s4.access_token);
    fact('mfa.fresh_signin.jwt_aal', c4.aal);
    // Can an aal1 session enroll and verify a rogue second factor?
    const rogue = await enrollAndVerify(s4.access_token);
    fact('mfa.rogue.enroll_status_from_aal1', rogue.enrollStatus); fact('mfa.rogue.enroll_err', rogue.enrollErr ?? null);
    fact('mfa.rogue.verify_status_from_aal1', rogue.verifyStatus ?? null); fact('mfa.rogue.verify_err', rogue.verifyErr ?? null);
    // From an aal2 session, enroll+verify rogue factor B; then a new password session verified with B.
    await waitNextWindow();
    const s5 = (await signIn(a)).json;
    const s5v = await challengeVerify(s5.access_token, ev.fid, ev.secret);
    fact('mfa.approved_factor_reverify_status', s5v.status);
    if (s5v.status === 200) {
      const rogue2 = await enrollAndVerify(s5v.session.access_token);
      fact('mfa.rogue_from_aal2.enroll_status', rogue2.enrollStatus); fact('mfa.rogue_from_aal2.verify_status', rogue2.verifyStatus ?? null);
      if (rogue2.verifyStatus === 200) {
        const s6 = (await signIn(a)).json;
        await waitNextWindow();
        const s6v = await challengeVerify(s6.access_token, rogue2.fid, rogue2.secret);
        fact('mfa.coexist.verify_with_rogue_status', s6v.status);
        if (s6v.status === 200) {
          const c6 = claims(s6v.session.access_token);
          fact('mfa.coexist.rogue_session_jwt_aal', c6.aal);
          fact('mfa.coexist.rogue_session_row_factor_is_rogue', sql(`select factor_id = '${rogue2.fid}' from auth.sessions where id = '${c6.session_id}';`));
          fact('mfa.coexist.amr', c6.amr);
          // aal1 cannot unenroll a verified factor?
          const s7 = (await signIn(a)).json;
          const un = await call('DELETE', `/auth/v1/factors/${rogue2.fid}`, { token: s7.access_token });
          fact('mfa.unenroll_verified_from_aal1_status', un.status); fact('mfa.unenroll_verified_from_aal1_err', errCode(un));
          // Password update rules with a verified factor.
          const pw1 = await call('PUT', '/auth/v1/user', { token: s7.access_token, body: { password: `New-${randomBytes(10).toString('hex')}` } });
          fact('pw.update_aal1_with_factor_status', pw1.status); fact('pw.update_aal1_with_factor_err', errCode(pw1));
          const un2 = await call('DELETE', `/auth/v1/factors/${rogue2.fid}`, { token: s6v.session.access_token });
          fact('mfa.unenroll_verified_from_aal2_status', un2.status);
        }
      }
    }
  }

  // Session liveness: delete the row of a live session; old access token and refresh behaviour.
  const b = await newUser('b');
  const sb = (await signIn(b)).json; const cb = claims(sb.access_token);
  sql(`create or replace function public.ffh_spike_session_live() returns boolean language sql stable security definer set search_path = '' as $$ select exists (select 1 from auth.sessions s where s.id = nullif(auth.jwt()->>'session_id','')::uuid and s.user_id = auth.uid()) $$; grant execute on function public.ffh_spike_session_live() to authenticated; notify pgrst, 'reload schema';`);
  await new Promise((r) => setTimeout(r, 1500));
  const live1 = await call('POST', '/rest/v1/rpc/ffh_spike_session_live', { token: sb.access_token, body: {} });
  fact('liveness.definer_can_read_sessions_before', live1.status === 200 ? live1.json : `status ${live1.status}`);
  const del = sqlTry(`set role postgres; delete from auth.sessions where id = '${cb.session_id}'; select 'deleted';`);
  fact('liveness.postgres_delete_session', del.ok ? 'ok' : del.out);
  const live2 = await call('POST', '/rest/v1/rpc/ffh_spike_session_live', { token: sb.access_token, body: {} });
  fact('liveness.after_delete', live2.status === 200 ? live2.json : `status ${live2.status}`);
  const refDel = await call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: sb.refresh_token } });
  fact('liveness.refresh_after_delete_status', refDel.status);
  fact('liveness.refresh_tokens_left_for_session', sql(`select count(*) from auth.refresh_tokens where session_id = '${cb.session_id}';`));
  const sb2 = (await signIn(b)).json;
  const live3 = await call('POST', '/rest/v1/rpc/ffh_spike_session_live', { token: sb2.access_token, body: {} });
  fact('liveness.new_login_live', live3.status === 200 ? live3.json : `status ${live3.status}`);
  // GoTrue logout scope=others: are other session rows deleted?
  const sb3 = (await signIn(b)).json; const cb3 = claims(sb3.access_token);
  const lo = await call('POST', '/auth/v1/logout?scope=others', { token: sb2.access_token });
  fact('logout_others.status', lo.status);
  fact('logout_others.other_row', sessionRow(cb3.session_id));

  // Delete a user as postgres (definer owner) and what remains.
  const d = await newUser('d'); const sd = (await signIn(d)).json;
  const ud = sqlTry(`delete from auth.users where id = '${d.id}'; select (select count(*) from auth.sessions where user_id = '${d.id}') || ',' || (select count(*) from auth.identities where user_id = '${d.id}') || ',' || (select count(*) from auth.mfa_factors where user_id = '${d.id}');`);
  fact('delete_user.as_postgres', ud.ok ? `ok sessions,identities,factors_left=${ud.out}` : ud.out);
  const after = await call('POST', '/rest/v1/rpc/ffh_spike_claims', { token: sd.access_token, body: {} });
  fact('delete_user.old_token_postgrest_status', after.status);

  sql(`drop function public.ffh_spike_claims(); drop function public.ffh_spike_session_live(); delete from auth.users where email like 'ffh-spike-%@example.test';`);
  fact('cleanup.spike_users_left', sql(`select count(*) from auth.users where email like 'ffh-spike-%@example.test';`));
}

main().then(() => fact('done', true)).catch((e) => { console.error(`SPIKE_ERROR ${e instanceof Error ? e.message : 'unknown'}`); process.exit(1); });
