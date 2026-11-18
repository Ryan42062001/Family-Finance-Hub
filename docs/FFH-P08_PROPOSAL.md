# FFH-P08 proposal — Account settings and security

Status: **SCOPE AND R1–R8 APPROVED by Ryan as recommended (2026-11-18) — nothing built.** Implementation waits for
the pre-build independent threat-model review (`docs/workflow/FFH-P08_THREAT_MODEL_REVIEW_PROMPT.md`). Part D (email
change) is deferred (R1). Approval does not cover any hosted Supabase/Auth, Vercel, secret or Production change; each
remains a separate Ryan authorization.
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

## 3. Threat model (what we defend against)

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

## 4. Design per part

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
