# Current phase

FFH-P08 — Account settings and security

State: PLANNED — ROADMAP NEXT; implementation design and R1–R8 decisions NOT YET APPROVED
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

- A detailed, **UNAPPROVED** technical proposal is available at `docs/FFH-P08_PROPOSAL.md`.
  It contains possible password-update, authenticator-app TOTP, account-deletion, and email-change
  approaches with a threat model and risk-specific tests. It is a proposal, not implementation authority.
- **R1–R8 in that proposal await Ryan's explicit choices.** This includes whether to defer email
  changes until custom email delivery works, deletion authorization and ownership constraints,
  permanence/recovery, authenticator recovery, password policy, 2FA strength, and synthetic QA accounts.
- The first fresh Claude Code P08 chat should verify repository status, present those decisions
  and a bounded phase contract for Owner approval, and request a prebuild independent HIGH-risk
  threat-model review. Do not silently accept the proposal's recommendations.
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

- P07 close-out + P08 proposal draft PR #161's exact-head `rls-matrix` succeeded, but `fast`
  **FAILED** on `npm audit --audit-level=high`: 9 HIGH and 6 MODERATE reported advisories
  at `80278f2e5a0e73e41b87ffac5ab6e5712ff8a79b`
  ([run 44216093879](https://github.com/Ryan42062001/Family-Finance-Hub/actions/runs/44216093879)).
- This is a dependency-audit blocker for green CI, **not evidence of a new P08 code failure**.
  The Builder must triage affected production/development dependency paths and address the
  advisories in a separate reviewed change before claiming `fast` green.
  Do not weaken the severity gate or assume every advisory is remotely exploitable.

## Entry checklist

1. Start a **fresh Claude Code chat dedicated to P08**, using this file, `.ai/HANDOFF.md`,
   `.ai/DECISIONS.md`, `docs/PRODUCT_ROADMAP.md`, `docs/WORKFLOW.md` and the P08 proposal.
2. Obtain Ryan's R1–R8 decisions and review the high-risk threat model before source implementation.
3. Restore exact-head green required CI without bypassing failed tests or reducing audit thresholds.
4. Implement via one active Claude Builder on its own PRs, owner-only hosted authorizations,
   independent different-model audit, synthetic Preview QA, exact-SHA Production approval, and 12/12 smoke.
5. At phase completion, explicitly notify Ryan: **PHASE COMPLETE — START A FRESH CLAUDE CODE CHAT**;
   record closure in the next phase's docs, not as an unauthorized docs-only Production release.
