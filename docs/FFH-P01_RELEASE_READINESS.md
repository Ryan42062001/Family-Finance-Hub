# FFH-P01 release readiness

This page is the current status, last updated 2026-11-11. The detailed October 2026 evidence log, including every
Gate A attempt, Manager checkpoint and failed finding, is preserved unchanged as historical evidence in
`.history/ffh-p01/RELEASE_READINESS_LOG_2026-10.md` and in PR #81's comments.

Nothing here authorizes production deployment, hosted Supabase or auth changes, Private Beta, merge, or the use of
real household data.

## Gate status

| Gate | Status | Evidence |
|---|---|---|
| Calculation, security, typecheck, lint, build | **PASS in CI on every push** | `fast` job in `.github/workflows/ci.yml` |
| Dependency advisories (`npm audit --audit-level=high`) | **PASS** after Next.js 16.4.6 | `fast` job; PR #86 |
| Two-household RLS isolation, as written in the migrations | **PASS: 913/913 assertions, rollback complete, zero residue** | `rls-matrix` job, first pass at commit `597027c` (run 42943705768); reruns on every push |
| Hosted Supabase matches the migrations (policies, grants, functions, constraints, 15 migrations) | **PASS in behavior; one whitespace-only difference** (owner-run, 2026-11-11) | Hosted `parity.sql`: 8 of 9 sections equal `parity.expected.txt` (15 migrations, 59 policies, RLS on 16 tables, 184 grants, 216 columns, 166 constraints, 2 triggers, function EXECUTE grants). `functions` differs only in `private.is_household_member`, whose hosted body puts `select 1 from public.household_members hm` on one line instead of two (161 vs 165 characters); a line-by-line comparison shows every token is identical. The hosted body matches no version in git history, so it was edited outside a migration at some point. Ryan re-created the function from the repo text on 2026-11-11; a rerun of `parity.sql` should now show 9/9 (pending confirmation). |
| Owner two-account check on the Preview | **OPEN** | Ryan, with two synthetic accounts: neither can see or change the other's data |
| Auth confirmation and callback logic (safe destinations, origin, encoded control characters) | **PASS (source and synthetic route tests)** | `tests/security/ffh-051-auth-remediation.test.ts`, `ffh-p01-auth-route-execution.test.ts` |
| Hosted new-signup confirmation | **OWNER-OBSERVED PASS** on Preview and Production (2026-10-27, 2026-11-10) | PR #81 comments |
| Deployed first authenticated request: `Set-Cookie` attributes, invalid/expired/reused tokens, hostile Host/origin on the deployed app | **PASS 12/12 on Production (`main`) and on the FFH-P01 Preview** (owner-run, 2026-11-11); the browser cookie-attribute check is still open | `node scripts/smoke/deployed-auth-smoke.mjs <url>` against `family-finance-hub-ten-brown` and the `phase/ffh-p01-release-readiness` Preview (with a Vercel protection bypass) |
| Scenario Lab: no persistence or profile mutation, null-preference reconciliation | **PASS (tests)** | `tests/security/ffh-p01-release-readiness.test.ts`, calculation suite |
| FFH-026 F11/F13 offline browser helper | **RETIRED** (Owner decision, 2026-11-11) | Isolation is now proved by the `rls-matrix` job plus the owner two-account check |
| Owner preview of the UI and Scenario Lab punch list | **OPEN** | See `.ai/CURRENT_PHASE.md` |
| Independent phase review | **OPEN** | After the preview is accepted |
| Rollback plan exercised before production | **OPEN** | Plan below |

## Hosted configuration (owner-reported, 2026-11-10)

- Supabase Site URL: `https://family-finance-hub-ten-brown.vercel.app`.
- Redirect allowlist: that host's `/auth/callback` and the FFH-P01 Preview host's `/auth/callback`.
- The *Confirm sign up* email template is `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. This
  supersedes the October `{{ .ConfirmationURL }}` setting. A fresh new-signup confirmation on Production reached
  `/onboarding` signed in.
- Deferred by Ryan: confirmation email lands in Junk (no custom sending domain). Deleting test users is blocked by
  `households_created_by_fkey`; no cleanup has been authorized. Both must be revisited before Private Beta.

## Owner preview procedure

Use synthetic identities and values only.

1. Sign up a synthetic user and follow the confirmation link. Confirm you land signed in on `/onboarding`.
2. With two synthetic accounts in separate households, confirm neither sees or can edit the other's data
   (this is the two-household check).
3. In Scenario Lab, with no saved preferences, change monthly expenses from $3,500 to $4,000. Confirm capacity goes
   from $1,300 to $800 and the saved profile is unchanged after reload.
4. Record pass/fail and the Preview's commit SHA only. No tokens, cookies, email links or real values.

## Rollback plan

Before any separately authorized production promotion:
1. Record the current production deployment and its commit, and the candidate commit.
2. Snapshot the non-secret auth origin, redirect and email-template settings.
3. Confirm the release includes no schema migration. FFH-P01 changes no migrations.

If auth, session or household isolation fails after release:
1. Stop the release and any Private Beta.
2. Restore the previous Vercel production deployment and the prior auth settings.
3. Rerun the auth and isolation checks.

No rollback or production change has been performed by this phase.
