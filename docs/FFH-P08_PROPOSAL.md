# FFH-P08 proposal — Account settings and security

Status: **REVISION 1 — awaiting targeted threat-model re-review and Ryan's R9–R11.** Scope and R1–R8 were approved by
Ryan as recommended (2026-11-18). The pre-build threat-model review at `5c87b119` **FAILED** (TM-01 CRITICAL, TM-02–TM-06
HIGH, TM-07/TM-08 MEDIUM; receipt `docs/workflow/FFH-P08_THREAT_MODEL_REVIEW.md`). **§10 is the binding design and
overrides §3–§8 wherever they differ.** Nothing is built. Part D (email change) is deferred (R1). No approval here
covers a hosted Supabase/Auth, Vercel, secret or Production change; each remains a separate Ryan authorization.
Base: protected `main` at `1c4753dab2e3a9e38fbfbe34ce82397e92047f43` (FFH-P07 release, PR #155 merged; post-release
CI run 43677246878 green). Carries the P07 close-out (draft PR #161, not merged into `main`).
Roadmap item 6: "Account settings: change password and email, delete account (also enables test-account cleanup),
and two-factor sign-in (authenticator app). HIGH risk (auth)."

## 1. Proposed scope (one phase, four parts, built in this order)

| Part | What the person can do | Out of scope in P08 |
|---|---|---|
| A. Change password | On **Account → Security**: enter current password + new password twice | Forgotten-password reset by email (needs reliable email; own item) |
| B. Two-factor sign-in (TOTP) | Turn on an authenticator app (QR + manual key, confirm with a 6-digit code); sign-in then asks for the code; turn it off (needs a current code); optionally add a second authenticator as backup | SMS/phone codes, passkeys, recovery codes (not native to Supabase), forcing 2FA on everyone |
| C. Delete my account | **Account → Delete account**: re-enter password (+ code if 2FA), type `DELETE`; see exactly what will be removed | Grace period / undo, data export (roadmap item 7), ownership transfer (see decision R3) |
| D. Change email | **Only if Ryan chooses it (R1)**: new address, confirmed from both old and new inbox | — |

Also: a fixed **Account** page reachable from the account menu (shows the signed-in email, 2FA status, links to the
three actions). All P07 deferrals stay deferred (Can We Afford It, irregular set-asides, per-paycheck view, 30-day
reminders); bills/export remain roadmap item 7.

## 2. What exists today (verified in the repository)

- Sign-in is Supabase email+password (`app/auth/actions.ts`); sign-up confirmation via `/auth/confirm` accepts only
  `type=email`; `/auth/callback` exchanges PKCE codes; both use the shared trusted-origin and safe-destination checks.
- The proxy (`lib/supabase/proxy.ts`) only checks that a user id exists; it knows nothing about 2FA.
- Only the publishable key is deployed. **No service-role key exists** in the app or Vercel (removed 2026-11-12).
- `@supabase/supabase-js` 2.112.4 / auth-js supports: `updateUser({ password, current_password | nonce })`,
  `reauthenticate()`, `email_change` verification, `signOut({ scope: 'others' })`, `mfa.enroll/challenge/verify/
  unenroll/listFactors/getAuthenticatorAssuranceLevel`, and `aal`/`amr` JWT claims.
- Rows referencing `auth.users`: `profiles.id` (cascade), `household_members.user_id` (cascade),
  `household_invitations.created_by` (cascade) / `accepted_by` (set null), `household_people.linked_user_id` (set
  null), `monthly_check_ins.created_by/updated_by` (set null), and **`households.created_by` (no cascade: deleting an
  owner's login is refused by the database until their household is handled)**. All household data cascades from
  `households`.

## 3. Threat model (what we defend against) — superseded in part by §10

| # | Threat | Defence in P08 |
|---|---|---|
| T1 | Someone with a stolen/left-open session changes the password or email, or deletes the account | Every sensitive action re-checks the **current password** server-side (and a current 2FA code when 2FA is on); other sessions are signed out after a password change, 2FA change or email change |
| T2 | Stolen password alone gets in | Optional TOTP 2FA; when a person has a verified factor, **the database itself** refuses their reads/writes unless the session is `aal2` (not just the UI) |
| T3 | 2FA bypass by calling the API/DB directly with an `aal1` token | DB-level check inside the existing `private.can_read_household` / `can_write_household_financials` / `is_household_owner` helpers, so every RLS policy and function inherits it; proven in the RLS matrix with forged `aal1`/`aal2` claims |
| T4 | Account deletion wiping or exposing another household's data | Deletion runs in one DB transaction, takes identity only from `auth.uid()`, touches only the caller's own membership/household; owners of a shared household are refused (R3) |
| T5 | Brute force of passwords / TOTP codes | Supabase Auth rate limits (verify in spike); generic error messages; no detail about which part failed |
| T6 | Email-change takeover / open redirect in confirmation links | Secure email change (both inboxes confirm), `/auth/confirm` accepts `email_change` only with the existing bounded-token and safe-destination logic |
| T7 | Leaking secrets (TOTP secret, QR, tokens) to logs/CI/QA | The QR/secret is shown once in the browser only, never logged or stored by the app; synthetic accounts only; nothing printed in CI |
| T8 | Lock-out (lost phone) | Optional second authenticator; documented Owner-assisted reset procedure (R5) |
| T9 | Breaking the automated TestA/TestB isolation suite | TestA/TestB keep password-only sign-in; a separate synthetic TestC is used for 2FA QA |

## 4. Design per part — superseded in part by §10

### A. Change password
- Server action: validate new password (min length per R6, must differ from current), verify **current password**
  with a throw-away server-side Supabase client (in-memory session, never written to cookies, signed out at once),
  require `aal2` if the person has 2FA, then `updateUser({ password })` on the real session, then
  `signOut({ scope: 'others' })`. Generic success/failure messages; never echo provider error text.
- Provider settings (Ryan, hosted, per change): **Secure password change** on; password minimum length (R6).
- Tests: unit tests with a mocked Supabase client for every branch (wrong current password, same password, too
  short, aal1-with-factor refused, provider error → generic message, others signed out).

### B. Two-factor sign-in (TOTP)
- Enroll: `mfa.enroll({ factorType: 'totp' })` → show QR + manual key (client component, not logged) → verify a
  code → factor becomes `verified` → sign out other sessions. Unverified factors older than the page are removed.
- Sign-in: after password sign-in, if `getAuthenticatorAssuranceLevel()` says `nextLevel = aal2` and current is
  `aal1`, go to `/auth/two-factor` (code entry) before anything else. The proxy treats an `aal1` session of a person
  with a verified factor as "not fully signed in": every protected page redirects to `/auth/two-factor`.
- Database enforcement (proposed; R7): the three existing private helpers additionally require
  `auth.jwt()->>'aal' = 'aal2'` **when the caller has a verified factor** (reading `auth.mfa_factors`). One
  migration changes three function bodies; every policy and function inherits it. Matrix: same user with/without a
  verified factor × `aal1`/`aal2` claims × read/write, plus anon/outsider unchanged.
- Turn off / remove a factor: requires current password + a current code (`aal2`), signs out other sessions.
- Lost authenticator: R5.

### C. Delete my account (and test-account cleanup)
- One database function `public.delete_my_account()` (SECURITY DEFINER, `search_path=''`, identity only from
  `auth.uid()`, executable by `authenticated` only), called after the server action re-verifies the password (+
  `aal2` when 2FA is on) and the typed confirmation:
  - **member/viewer**: deletes their own `auth.users` row → membership, profile and their invitations go by
    cascade; household data stays with the household; `created_by/updated_by` on check-ins become empty.
  - **owner and the only member**: deletes the household (all its financial data, goals, check-ins, invitations by
    cascade) and then their `auth.users` row, in one transaction.
  - **owner with other members**: refused with a clear message (R3).
  - Deleting the `auth.users` row also removes Supabase sessions, identities and 2FA factors (auth-schema cascades;
    verify in spike).
- Backend choice R2: the SQL function above (no new secret) **if** the spike proves the hosted `postgres` role may
  delete from `auth.users`; otherwise the Auth Admin API with a service-role key stored only as a Vercel server
  secret.
- After deletion: sign the browser out, land on a fixed "Your account was deleted" page.
- Recovery (R4): deletion is **permanent**; the confirmation screen says so and lists what will be removed. There
  is no undo; Supabase backups are not a per-user restore path.
- Test-account cleanup: the same in-app flow, run by Ryan while signed in as the stray synthetic account (e.g. the
  third accounts used for invitation QA). **Never** bulk SQL against hosted, and **never** TestA/TestB (the e2e
  suite depends on them). A short `docs/workflow/TEST_ACCOUNT_CLEANUP.md` lists which synthetic accounts may be
  removed; no real accounts are touched by the Builder.

### D. Change email (only if R1 = include)
- `updateUser({ email }, { emailRedirectTo })` with **Secure email change** (confirm from both inboxes);
  `/auth/confirm` accepts `type=email_change` through the same bounded token + safe destination path; requires
  current password (+ `aal2`); signs out other sessions afterwards.
- Hard dependency: Supabase's built-in email sender only reliably reaches project team addresses and is rate
  limited; a real email-change feature needs **custom SMTP** (provider account, DNS records, a secret in Supabase).

## 5. Identity-provider (Supabase Auth) interactions and hosted changes

All are Ryan-only, per change, with before/after evidence in a `docs/workflow/FFH-P08_HOSTED_CHANGES.md` procedure:
1. Auth → Providers → Email: **Secure password change** on (and **Secure email change** on if D is included).
2. Password minimum length / character requirements (R6).
3. MFA: confirm **TOTP enabled** (default on all plans; verify), verification enabled.
4. If R1 = include: custom SMTP settings (provider, sender, DNS) — secret stays in Supabase only.
5. If R2 = Admin API: `SUPABASE_SERVICE_ROLE_KEY` as a Vercel **server-only, Sensitive** variable for Production
   and Preview — never `NEXT_PUBLIC_`, never in the repo or CI output.
6. Migrations (private helper bodies for 2FA; `delete_my_account`) applied with the established hosted-migration
   procedure and parity check.

## 6. Synthetic testing and isolation checks

- **Unit/security tests (no network):** every server action branch with a mocked Supabase client; source contracts
  (no provider error text echoed, password never logged, QR/secret never sent to the server log, no service-role key
  in client bundles, fixed redirect targets).
- **RLS matrix (disposable CI DB):** `delete_my_account` (anon refused; viewer/member removes only self; sole owner
  removes exactly their household and nothing else — other households' row digests unchanged; shared-household owner
  refused; zero residue) and the 2FA helper gate (forged `aal1`/`aal2` claims with and without a verified factor,
  for read, write and owner functions). Spike first proves `auth.mfa_factors` and auth-schema cascades exist in the
  local Supabase stack used by CI.
- **e2e-isolation:** unchanged for TestA/TestB (password-only), plus a check that `/account` loads and shows nothing
  of the other household; no deletion or 2FA automation against the Preview (it would need real secrets).
- **Preview QA (Work mode, synthetic only):** password change on a throw-away synthetic account; delete-account on a
  throw-away synthetic account; 2FA enrol/sign-in/turn-off on synthetic **TestC** with Ryan's authenticator app
  (Work mode cannot read TOTP codes; Ryan types the code in its secure window). Email change only if R1.

## 7. Review gates

- Phase risk: **HIGH** (authentication, session and account deletion). Independent **different-model** review
  (ChatGPT) at the frozen head, plus targeted re-checks of each fix, exactly as in P07.
- Extra gate for this phase: a short **threat-model review** of this document by the same reviewer **before** build
  (cheap, catches design flaws early).
- BLOCKER/CRITICAL/HIGH fixed before merge; MEDIUM/LOW recorded or fixed at Ryan's choice.
- Release: Ryan's exact-SHA authorization, release checklist, Production smoke 12/12 (+ a new signed-out check that
  `/account` redirects to sign-in).

## 8. Execution plan (after Ryan approves scope and the R-decisions)

0. **Spike (no hosted changes):** in the CI disposable stack, prove `auth.mfa_factors` exists, `postgres` can delete
   `auth.users`, and what cascades; Ryan runs one read-only hosted privilege query (provided) to confirm the same.
1. Non-Production phase branch `phase/ffh-p08-account-security` has been created from the P07 close-out
   and P08 proposal source commit `80278f2e5a0e73e41b87ffac5ab6e5712ff8a79b` (draft PR #161), based
   on protected `main` release `1c4753da`. P07 close-out stays out of `main` until a separately
   approved Production merge. Ryan separately authorizes moving the fixed Preview domain to P08.
2. Part A (password) + Account page → CI → merge to phase → Preview QA.
3. Part C (deletion) migration + matrix + UI → hosted migration (Ryan) → QA on a throw-away synthetic account.
4. Part B (2FA) helper migration + matrix + sign-in step + proxy gate → hosted migration (Ryan) → TestC QA.
5. Part D only if R1 = include (after Ryan's SMTP setup).
6. Freeze → independent review → fixes/re-checks → release checklist → Ryan's exact-SHA release → smoke.
Each hosted step is a separate Ryan authorization; nothing touches Production until the release merge.

## 9. Decisions Ryan needs to make before implementation

| # | Decision | Builder recommendation |
|---|---|---|
| R1 | Include **email change** in P08? It needs custom SMTP (provider, DNS, a secret) to work for real addresses | **Defer** email change to the email-deliverability item; ship A, B, C now |
| R2 | Deletion backend: SQL function in the database (no new secret) or Auth Admin API with a service-role key in Vercel | **SQL function**, if the spike + your read-only hosted check confirm it works; otherwise come back to you |
| R3 | An **owner** whose household has other people wants to delete their account | **Refuse** until they remove the others (ownership transfer is a separate future feature) |
| R4 | Deletion **recovery** | **Permanent, no undo**, with password (+2FA) re-entry, typed `DELETE`, and a clear list of what is removed |
| R5 | **Lost authenticator** | Allow an optional **second authenticator**; otherwise an Owner-assisted reset by you in the Supabase dashboard after you confirm identity yourself (documented) |
| R6 | **Password rules** (provider setting) | Minimum **12** characters; no forced character classes; Secure password change on |
| R7 | 2FA **optional or required**, and **database-level** enforcement | **Optional per person**, enforced in the **database** (helper gate) for anyone who turns it on |
| R8 | Synthetic accounts | Keep TestA/TestB password-only; create synthetic **TestC** for 2FA QA; list which stray synthetic accounts may be cleaned up |

## 10. Revision 1 — response to the threat-model review (binding)

The approved product scope and R1–R8 are unchanged. What changes is **where** each guarantee is enforced: every
sensitive guarantee must hold for a direct call to PostgREST or to the Supabase Auth API with a stolen token, not only
for the FFH server action. Things marked **SPIKE** are unproven and are proved in the disposable CI stack (§10.9)
before any feature code; if one fails, the affected part comes back to Ryan instead of being worked around.

### 10.1 Building blocks (one migration, used everywhere)

1. **Security epoch (TM-06).** `private.account_security(user_id pk → auth.users on delete cascade, tokens_valid_after
   timestamptz not null, updated_at)`. Bumped (`= now()`) on every password change, 2FA enable/disable, factor approval,
   and Owner-assisted reset. A JWT whose `iat` is earlier than `tokens_valid_after` is refused by the database, so an
   already-issued access token stops working **immediately**, not when it expires. `signOut({ scope: 'others' })` is
   still called (it revokes refresh tokens); the epoch covers the access tokens it cannot revoke. The acting session
   refreshes right after the change to get a new `iat`. **SPIKE:** Auth-server vs database clock agreement and the
   refresh path.
2. **FFH factor registry (TM-02).** `private.mfa_approved_factors(factor_id pk, user_id, approved_at)`. A person "has
   2FA on" **for FFH** only when a row exists here. Rows are written only by `approve_my_mfa_factor()` (10.1.4), which
   requires a fresh password check. A factor that someone enrolled directly through the Auth API with a stolen
   session is **not** approved, so it can neither lock the real person out of the database nor change what the
   database requires.
3. **One assurance predicate (TM-03).** `private.session_ok()` (SECURITY DEFINER, `search_path=''`, STABLE):
   `auth.uid()` present **and** JWT `iat` ≥ `tokens_valid_after` (no row = never bumped) **and**, if the caller has an
   approved factor, `aal = 'aal2'`. Missing or malformed `iat`/`aal` claims fail closed.
4. **Recent re-authentication proof (TM-01, TM-02, TM-04).** `private.recent_reauth(p_purpose text)`: requires
   `session_ok()`, a JWT `amr` entry with `method = 'password'` and `timestamp` within the last **5 minutes**; if the
   caller has an approved factor, also `aal2` and an `amr` `totp` entry within 5 minutes. It records
   `(session_id, purpose)` in `private.reauth_uses` (unique), so one proof is **single-use per operation**; a replay
   is refused. Identity is only `auth.uid()`. Because it writes, it is VOLATILE and is called only inside the
   sensitive SECURITY DEFINER RPCs, never from an RLS policy. The proof is a property of a *newly created* session, so a stolen older
   token or a refreshed stolen session (refresh keeps the original `amr` timestamps) cannot produce it.
   **SPIKE:** `amr` shape and timestamp semantics on real tokens, including after refresh and after MFA verify.
   *Residual risk, stated plainly:* a token stolen within 5 minutes of the person typing their password is
   indistinguishable from a fresh proof. This is the standard "sudo mode" window; it is kept short and single-use.

### 10.2 Where the proof comes from (TM-07)

Sensitive server actions verify the current password (and TOTP code when 2FA is on) by signing in on a **throw-away
server-side client**: in-memory storage only, no cookie adapter, never serialised, `persistSession: false`,
`autoRefreshToken: false`. The action:
- takes the email from a fresh `getUser()` of the **real** session, never from a form field;
- requires the throw-away session's `sub` to **equal** the real session's user id, else fails with the generic error;
- calls the 10.1.4-gated RPC **with the throw-away session's token** (that is what carries the fresh `amr`);
- ends with `signOut({ scope: 'local' })` on the throw-away client only (the default scope is `global` and would sign
  the person out everywhere);
- never writes the real session's cookies from the throw-away client. Tests assert all five.

### 10.3 Authorization inventory (TM-03)

Before the gate migration, the Builder generates an inventory from the catalog (`pg_policies`, `pg_proc` with
`prosecdef`/grants, views, triggers on exposed tables) and commits it as `docs/workflow/FFH-P08_AUTHZ_INVENTORY.md`.
Every entry gets `session_ok()`, including the ones the review found outside the three financial helpers:
`private.is_household_member`, `profiles_select/insert/update_self`, `households_insert_creator`,
`accept_household_invitation`, the P05 setup RPC, the P06 invitation RPCs and the P07 check-in RPCs.
**Allowed at `aal1` for a person with an approved factor: nothing in the database.** The two-factor step uses only
the Auth API (`mfa.challenge`/`verify`, `getAuthenticatorAssuranceLevel`), not FFH tables.

A new RLS-matrix **coverage probe** reads the catalog and fails CI if any policy on an exposed table, or any function
executable by `authenticated`/`anon`, neither calls `private.session_ok()` nor is on a short, reviewed allowlist.
New tables in later phases are therefore covered or CI goes red.

The proxy treats "approved factor + `aal1`" as **pending**: every protected page redirects to `/auth/two-factor`;
`/auth/two-factor` and sign-out are reachable while pending, and a session that is already `aal2` is redirected
away from it (no loop). The proxy learns "has approved factor" from a minimal `my_mfa_status()` RPC that is the one
allowlisted exception: it returns only the caller's own boolean and is gated by the epoch, not by `aal`.

### 10.4 Change password (TM-04)

- **Provider enforcement (R9):** Ryan turns on the Auth setting that makes the Auth API require the current password
  on every password update (`GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD`; dashboard name **SPIKE**),
  plus Secure password change. The server action passes `current_password` to `updateUser` on the real session.
  A direct Auth API call without the current password is then refused by the provider, not just by FFH.
- If the provider requires `aal2` for updates when factors exist (**SPIKE**), that also covers 2FA users.
- The whole change runs on the throw-away client from 10.2 (it holds the fresh proof): `updateUser({ password,
  current_password })` → `bump_my_security_epoch()` (gated by 10.1.4) → `signOut({ scope: 'others' })` → local
  sign-out. Every session, including this browser's, ends; the person sees "Password changed — sign in again".
- If hosted Auth cannot enforce the current password, part A comes back to Ryan before it ships.

### 10.5 Two-factor sign-in (TM-02, TM-06)

- **Enable:** the real session enrolls an unverified TOTP factor and shows the QR/manual key once. The person then
  enters their **password and one code**. On the throw-away client: password sign-in (fresh `password` amr) →
  `mfa.challenge` + `verify` of that factor with the code (factor becomes `verified`, throw-away session `aal2` with a
  fresh `totp` amr) → `approve_my_mfa_factor(factor_id)` (10.1.4; the factor must belong to the caller and be
  `verified`) → epoch bump → `signOut({ scope: 'others' })` → local sign-out. Verifying a factor already ends the
  person's other sessions, so they sign in again (password + code). One code is entered once; no reuse.
- **Disable / remove:** password + current code on the throw-away client (challenge/verify an approved factor) →
  `revoke_my_mfa_approval(factor_id)` (10.1.4) → epoch bump → `mfa.unenroll` (throw-away session is `aal2`) → sign out
  others → local sign-out. If unenroll fails after the approval is removed, the database simply stops requiring
  `aal2`, which is what the person asked for.
- **A factor enrolled outside FFH** (stolen session using the Auth API directly) is not approved. The database
  ignores it, so the real person is not locked out of their data. FFH shows "An authenticator was added outside Family
  Finance Hub" with the Owner-assisted reset path, because the Auth API needs `aal2` to remove a verified factor.
  **Residual (R10):** the Auth API itself cannot be stopped from accepting a first factor from a stolen `aal1`
  session unless the hosted plan offers the MFA verification hook (**SPIKE** for availability); the attacker in that
  case already had full access through the stolen session.
- **Approved factor removed directly with a stolen `aal2` session:** the approval row remains, so the database keeps
  requiring `aal2` (fail closed). The person uses Owner-assisted reset.
- **Old tokens after a change:** the epoch makes every access token issued before the change unusable at once,
  including the TM-06 case (old `aal1` token after the last factor is removed or reset).

### 10.6 Delete my account (TM-01, TM-05)

- `public.delete_my_account(p_confirm text)`: `p_confirm = 'DELETE'` **and** `private.recent_reauth('delete_account')`
  inside the function, so a direct RPC with a valid but not freshly re-authenticated token is refused. R2 is unchanged
  (SQL function, no service-role key); no Admin API fallback is built without Ryan.
- **Lock protocol (TM-05).** One rule for every operation that changes household membership: lock the household row
  with `SELECT … FROM public.households WHERE id = $1 FOR UPDATE` **before** reading or changing membership.
  `delete_my_account`, `accept_household_invitation` (after it finds the invitation, before the membership insert),
  member removal, role change and leaving a household all follow it. Deletion re-reads, under the lock: caller's
  role, member count, and `households.created_by`. Sole owner → pending invitations are **revoked with the household**
  (they are household data; the confirmation screen lists them, consistent with R4). Owner with others → refused (R3).
- `auth.users` delete and cascades in the same transaction; any failure rolls back everything. **SPIKE:** local
  `postgres` may delete from `auth.users`; auth-schema cascades (sessions, refresh tokens, factors, identities); and
  Ryan's separately authorised read-only hosted privilege check. If not proved, R2 returns to Ryan.

### 10.7 Owner-assisted 2FA reset (TM-08, refines R5)

- Requested only in person or on a phone call **Ryan places** to a number he already had before the request. An
  inbound message, a new phone number or email, or knowledge of household details is never sufficient (R11).
- Ryan records date, account (by synthetic-free description, no secrets), reason and his approval in his own notes,
  not the repository.
- Ryan runs one function, `private.owner_reset_mfa(p_user uuid, p_reason text)` (owned by `postgres`, **not**
  executable by `anon`/`authenticated`), in the SQL editor: deletes the person's factors and approvals, deletes
  their sessions and refresh tokens, bumps the epoch, and writes an audit row (user id, time, reason; no secrets).
  The person signs in again with their password and may enrol a new authenticator.

### 10.8 Changes to tests (§6 additions)

- **Real-provider tests in the disposable CI stack** (the matrix runner already starts the full local Supabase stack,
  including Auth): synthetic users created through the local Auth API; real `aal1`/`aal2` tokens; old-token denial
  after epoch bump, after factor verify, after last-factor removal and after `owner_reset_mfa`; direct
  `delete_my_account` without fresh proof refused; replayed proof refused; password update without current password
  refused once the setting is on; rogue (unapproved) factor ignored by the database. Local development keys are read
  inside the runner and never printed; no hosted connection.
- **Forged-claim matrix probes** remain for breadth (every inventory entry × approved/unapproved factor × `aal1`/`aal2`
  × missing/malformed claims × stale `iat`), plus the coverage probe (10.3).
- **Concurrency:** two-session races of deletion against invitation acceptance, member removal and role change
  (same technique as the P07 N01 race test).
- **Server-action unit tests:** identity mismatch, throw-away `local` sign-out, real cookies unchanged, generic errors.
- **Privacy:** source contracts that no password, TOTP secret/URI, QR, JWT or nonce reaches logs, errors or CI output.

### 10.9 Revised execution order

1. Targeted re-review of this revision (TM-01–TM-08 only) at a frozen SHA; Ryan answers R9–R11.
2. **Spike** in the disposable CI stack (no hosted contact), one PR, no feature code: `amr`/`iat`/`aal` on real tokens,
   epoch and refresh behaviour, `auth.mfa_factors`/challenges, provider current-password and `aal2` rules, MFA hook
   availability (documentation only), `auth.users` delete and cascades, deleting a user's `auth.sessions`/refresh tokens/factors for
   `owner_reset_mfa`, lock protocol races. Results committed as
   `docs/workflow/FFH-P08_SPIKE_RESULTS.md`. Then Ryan's read-only hosted privilege check (separately authorised).
3. Foundation migration (epoch, registry, `session_ok`, `recent_reauth`, inventory gating, coverage probe, lock
   protocol in existing RPCs) → matrix → hosted migration (Ryan).
4. Part A → Part C → Part B as before, each through CI, Preview QA and its own hosted step.

### 10.10 New decisions for Ryan

| # | Decision | Builder recommendation |
|---|---|---|
| R9 | Turn on the Auth setting that makes the provider **require the current password** for every password update (hosted Auth change, applied later with the others) | **Yes.** Without it a stolen session can change the password by calling the Auth API directly |
| R10 | Accept that the Auth API can accept a **first** authenticator from a stolen session, given FFH's database ignores factors not approved through FFH; or pay for a plan with the MFA verification hook if the spike shows it is plan-gated | **Accept**, with the registry design and the warning screen; revisit if the plan changes |
| R11 | Identity check for Owner-assisted 2FA reset | **In person, or a call you place to a number you already had**; never an inbound message alone |
