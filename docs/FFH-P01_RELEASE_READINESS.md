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
| Hosted Supabase matches the migrations (policies, grants incl. `PUBLIC`, functions, constraints, 15 migrations) | **PASS 9/9** (owner-run, 2026-11-11, final `parity.sql` with ACL-based `table_grants`) | Hosted output equals `scripts/rls-local/parity.expected.txt` in all 9 sections: 15 migrations, 59 policies, RLS on 16 tables, `table_grants` 208 / `9468fa67…` read from table ACLs (independent of the reader), 216 columns, 166 constraints, 2 triggers, 6 functions and their EXECUTE grants. The whitespace-only drift in `private.is_household_member` was corrected by Ryan earlier the same day. |
| Owner two-account check on the Preview | **OWNER-OBSERVED PASS** (2026-11-11, Preview `792a55b`) | Synthetic TestA and TestB, signed in one after the other: TestB saw none of TestA's records on Overview, Financial profile, Planning or Scenario Lab, and TestA saw none of TestB's. |
| Auth confirmation and callback logic (safe destinations, origin, encoded control characters) | **PASS (source and synthetic route tests)** | `tests/security/ffh-051-auth-remediation.test.ts`, `ffh-p01-auth-route-execution.test.ts` |
| Hosted new-signup confirmation | **OWNER-OBSERVED PASS** on Preview and Production (2026-10-27, 2026-11-10) | PR #81 comments |
| Deployed first authenticated request: `Set-Cookie` attributes, invalid/expired/reused tokens, hostile Host/origin on the deployed app | **Smoke PASS 12/12 on Production (`main`) and on the FFH-P01 Preview at `bc5822f`** (owner-run, 2026-11-11). **Cookie finding (LOW), fixed in source:** the owner's browser check showed `sb-…-auth-token` with Path `/` and SameSite `Lax` but **not Secure** (the `@supabase/ssr` default). All three Supabase clients now set `secure: true` for HTTPS origins (`lib/supabase/cookie-options.ts`); owner recheck on the Preview after re-login: **Secure ✓**, SameSite Lax, Path / (2026-11-11). HttpOnly stays off by design, because the browser client reads the session. | `node scripts/smoke/deployed-auth-smoke.mjs <url>`; an earlier "Preview 12/12" ran against an older deployment, because Vercel had not built new commits since Nov 7 and Ryan manually deployed `bc5822f`. Tests: `tests/security/ffh-p01-session-cookie-secure.test.ts`, route-execution adapter tests. |
| Scenario Lab: no persistence or profile mutation, null-preference reconciliation | **PASS (tests) + OWNER-OBSERVED PASS on the Preview** (2026-11-11): changing ZZ-A-Rent from $3,500 to $4,000 showed −$500.00 (−14.29%); the saved profile still showed $3,500 after reload. | `tests/security/ffh-p01-release-readiness.test.ts`, calculation suite |
| FFH-026 F11/F13 offline browser helper | **RETIRED** (Owner decision, 2026-11-11) | Isolation is now proved by the `rls-matrix` job plus the owner two-account check |
| Browser QA checklist Q1–Q10 on the Preview | **PASS** (2026-11-11, Preview `9f9482c`) | ChatGPT Work mode (Cloud Browser): Q1–Q8 and Q10 PASS, 0 `qa-finding` issues, isolation in both directions, Scenario Lab −$500.00 with no write ([PR #81 summary](https://github.com/Ryan42062001/Family-Finance-Hub/pull/81#issuecomment-6787947719)). Q9 (phone layout) was NOT RUN by Work mode because its cloud browser cannot emulate a phone; Ryan ran Q9 on his phone: PASS. |
| Independent phase review | **PASS after fixes** | ChatGPT (independent model). Review at `338394226b25`: FAIL (1 HIGH, 3 MEDIUM, 1 LOW; no cross-household bypass). All fixed in `91f02bb`. Targeted re-review of `91f02bb`: **RE-REVIEW RESULT PASS** (HIGH resolved; no new BLOCKER/CRITICAL/HIGH), with 2 MEDIUM items left (Docker inspection failure read as 'nothing left'; `PUBLIC` grants read through a role-filtered view). Both fixed in `53f305f`: inventory failures now fail cleanup, and `table_grants` is read from table ACLs (`aclexplode`), independent of the reader. The expected `table_grants` fingerprint is now `208 / 9468fa67…`; the hosted rerun is pending. |
| Rollback plan exercised before production | **OPEN** | Plan below |

## Hosted configuration (owner-reported, 2026-11-10)

> Superseded on 2026-11-12: Production moved to a new Vercel account at `https://family-finance-hub-taupe.vercel.app`
> (Supabase Site URL updated to match; same Supabase project). See `.ai/DECISIONS.md`. The 2026-11-10 values below are
> kept as the record of that date.

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
