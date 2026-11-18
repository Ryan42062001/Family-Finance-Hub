# Current phase

FFH-P08 — Account settings and security

State: PLANNED — scope and R1–R8 approved (2026-11-18); **pre-build threat-model review FAILED** (TM-01 CRITICAL, TM-02–06 HIGH); round 2 re-review **FAILED** (N01/N02 HIGH, N03/N04 MEDIUM); design **Revision 2** (proposal §11) awaiting round 3 re-review and Ryan's R9–R11
Risk: HIGH (authentication, sessions, account deletion, identity-provider configuration, and household RLS)
Owner: Ryan
Phase branch: `phase/ffh-p08-account-security`
Production baseline: FFH-P07, PR #155, merged into protected `main` as `1c4753dab2e3a9e38fbfbe34ce82397e92047f43`
Previous phase: FFH-P07 RELEASED / CLOSED (Owner-reported Production smoke PASS 12/12).

**Production deployment is NOT authorized by this planning/documentation cleanup.** Every future merge into
`main` is a separate Production release requiring Ryan's explicit exact-SHA authorization. Changes to
Supabase Auth, hosted SQL, Vercel, secrets, user accounts, or real data also require Ryan's specific
approval per action. Starting a phase branch does not grant any of these permissions.

## Roadmap goal (item 6)

Provide account settings for changing a password, changing an email address, deleting an account
(including safe test-account cleanup), and authenticator-app two-factor sign-in. The roadmap order
is unchanged; bills/due dates and plan export follow this item.

## Current planning status

- The design is `docs/FFH-P08_PROPOSAL.md`. **Ryan approved its scope and R1–R8 as recommended (2026-11-18):**
  - R1 email change **deferred** (needs custom SMTP); P08 builds A (change password), B (TOTP 2FA), C (delete account).
  - R2 deletion through a SECURITY DEFINER SQL function, **only if** the spike and Ryan's read-only hosted check prove
    it works; otherwise back to Ryan (Admin API + service-role key is not approved).
  - R3 an owner whose household has other members is **refused**. R4 deletion is **permanent**, with password (+ code
    if 2FA) re-entry, typed `DELETE` and a list of what is removed.
  - R5 optional second authenticator; otherwise an Owner-assisted reset by Ryan after he confirms identity himself.
  - R6 minimum 12 characters, no forced character classes, Secure password change on.
  - R7 2FA optional per person, enforced **in the database** for anyone with a verified factor.
  - R8 TestA/TestB stay password-only; synthetic TestC for 2FA QA; a documented list of removable synthetic accounts.
- **Threat-model review round 1: FAIL** at `5c87b119` (receipt `docs/workflow/FFH-P08_THREAT_MODEL_REVIEW.md`).
  The Builder answered with **Revision 1 = proposal §10 (binding)**: security epoch, FFH factor registry, one
  `session_ok()` predicate on every authorization path with a CI coverage probe, database-verified recent
  re-authentication inside `delete_my_account` and other sensitive RPCs, household-row lock protocol, Owner reset
  procedure. **Next gates:** targeted re-review (prompt "Round 2"), Ryan's **R9–R11** (§10.10), then the CI-only spike
  (§10.9 step 2). **Round 2 FAILED** at `9af92874`; **Revision 2 = proposal §11 (binding, overrides §10)**: session-row
  liveness instead of the clock epoch, `aal2` bound to an approved factor via `auth.sessions.factor_id` (fail-closed
  fallback), one household→invitation→membership lock order, view/privilege coverage probe with mutation tests,
  spike pass/fail table §11.6. Next: round 3 re-review. **No P08 feature code before a re-review passes.**
- Any provider capabilities, SQL privileges, auth-schema cascades, or MFA assumptions must be
  proven in disposable/local tests and separately authorized hosted checks before use.

## Scope and permissions boundary

- No new financial calculations or modifications to the Money Priority Engine.
- Do not reintroduce features deferred from P07 (Can We Afford It, irregular-cost set-asides,
  per-paycheck view, 30-day balance reminders). Do not pull bills/export forward.
- Auth, permissions, deletes, identity-provider changes, and recovery paths must fail closed.
  The one-household-per-account invariant and strict household isolation remain mandatory.
- Test only with synthetic accounts and records; preserve TestA/TestB for automated isolation.
  Do not delete real accounts, perform cleanup against hosted data, or collect passwords/TOTP
  secrets in repository evidence.
- The fixed Preview URL is still assigned to the **P07** phase branch according to the P07
  handoff. Ryan must separately authorize any Vercel configuration change for P08.

## CI / security-maintenance gate

- **Resolved (PR #163, merged 2026-11-18):** the inherited 9 HIGH / 6 MODERATE `npm audit` failure. MODERATE fixed
  by a non-breaking lockfile update. The HIGH findings are one advisory, GHSA-fc5q-39xc-vjpf (picomatch ReDoS), with
  **no patched release**, reachable only through the dev-only ESLint toolchain. With Ryan's approval (option 2),
  `scripts/audit-gate.mjs` keeps the HIGH threshold and tolerates only that advisory while it is HIGH, dev-only and
  before **2027-01-18**. Details: `docs/workflow/FFH-P08_DEPENDENCY_AUDIT.md`. Phase CI is green again
  (`fast` + `rls-matrix`, run 44219292900 on the #162 head).

## Entry checklist

1. Start a **fresh Claude Code chat dedicated to P08**, using this file, `.ai/HANDOFF.md`,
   `.ai/DECISIONS.md`, `docs/PRODUCT_ROADMAP.md`, `docs/WORKFLOW.md` and the P08 proposal.
2. ~~Obtain Ryan's R1–R8 decisions~~ (done 2026-11-18) and get the high-risk threat-model review before source
   implementation.
3. ~~Restore exact-head green required CI~~ (done, PR #163).
4. Implement via one active Claude Builder on its own PRs, owner-only hosted authorizations,
   independent different-model audit, synthetic Preview QA, exact-SHA Production approval, and 12/12 smoke.
5. At phase completion, explicitly notify Ryan: **PHASE COMPLETE — START A FRESH CLAUDE CODE CHAT**;
   record closure in the next phase's docs, not as an unauthorized docs-only Production release.
