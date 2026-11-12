# Standing decisions

- Ryan explicitly authorizes every merge into `main`, which is a Production release (Vercel auto-deploys `main`), and
  decides hosted configuration changes, Private Beta, real-data operations and spending.
- Financial policy is never invented; money reconciliation is exact, and unknown facts stay unknown (fail closed).
- Authentication and household isolation fail closed; cross-household access is never acceptable. Secrets and real
  household data stay out of the repo, CI and shared evidence.
- Schema/RLS changes are migrations in a reviewed PR; nothing is applied to hosted Supabase without Ryan.
- `.history/` and git history are evidence only; old tasks or PRs are never adopted implicitly.

## 2026-11-11 (Ryan)

- **Workflow simplified** (`docs/WORKFLOW.md`). One AI builder works directly in the repo, and a different AI session
  does the independent phase review. No approvals are needed for code, CI or draft PRs; Ryan approves merges and
  anything hosted, real-data or paid. This replaces Speed Workflow V2.1, the 2026-11-07 progress-first amendment and
  the one-time "GO" tokens.
- **RLS isolation is proven in CI.** The `rls-matrix` job runs on a disposable database on every push, together with
  Ryan's two-account Preview check. The laptop Gate A/B PowerShell procedure is retired.
- **FFH-026 F11/F13 offline browser helper retired.** F13 concerned the same helper, so it retires with it.
- The Builder may merge its own PRs into phase branches when CI is green; merges into `main` still need Ryan.
- Hosted `private.is_household_member` had a whitespace-only body difference (edited outside a migration). Ryan
  re-created it from the repo text in the hosted SQL editor; there was no behavior change. Hosted parity is now 9/9.

- **Roles (Ryan, 2026-11-11):** Claude Code is the default builder, and ChatGPT/Codex takes over only when Claude
  credits run out. ChatGPT Work mode (Cloud Browser only) does browser QA on the Preview and files `qa-finding`
  issues. Independent review: a fresh Claude session for routine phases; a different model (ChatGPT) for HIGH-risk
  phases and the pre-release audit.

## 2026-11-12 (Ryan)

- **Merging into `main` is a Production release ("Option 2").** Vercel deploys `main` automatically. Each merge into
  `main` needs Ryan's explicit release approval and is followed by the Production smoke test (release checklist in
  `docs/WORKFLOW.md`).
- **Incident, resolved the same day.** Earlier docs said merging would not deploy, which was wrong. PR #81 (`ec75d98`,
  2026-11-11) and #96 (`da668ca`) were auto-deployed to Production. Production had no `NEXT_PUBLIC_SITE_URL` (only the
  FFH-P01 Preview had one), so the new fail-closed origin check returned HTTP 400 on auth confirmation and callback
  links and on signed-out protected pages. The Production smoke test was 4/12. No data was exposed; the
  off-site-redirect checks still passed. Ryan added `NEXT_PUBLIC_SITE_URL` for Production and rebuilt via a deploy
  hook (Vercel's email verification for Redeploy was unreachable); the smoke test then passed **12/12**. Prevention:
  the release checklist now requires the variable in every environment and a smoke test right after each release.
- **Production moved to a new Vercel account.** The old account's email was the Apple "Sign in with Apple" relay
  address that belongs to GitHub, which only accepts GitHub's mail, so Vercel's verification codes never arrived and
  sensitive settings could not be changed. Ryan created a new Vercel account (codes reach him), imported the same
  repository and kept the same Supabase project. New Production: `https://family-finance-hub-taupe.vercel.app`, with
  `NEXT_PUBLIC_SITE_URL` set for Production only (type Config). Supabase Site URL set to that address (the
  Vercel–Supabase integration had changed it to `family-finance-hub-ryankis01-4544.vercel.app/`; the *Confirm sign up*
  template links via `{{ .SiteURL }}`, so it must match the live site) and `https://family-finance-hub-taupe.vercel.app/**`
  added to Redirect URLs. Deployed smoke test on the new site: **12/12** (2026-11-12). The old account's project and its
  `prod-redeploy` hook are to be retired once the switch-over is confirmed.
  First real sign-in on the new site failed with Supabase's "Invalid path specified in request URL": the
  integration-created `NEXT_PUBLIC_SUPABASE_URL` (saved as a Secret, so unreadable) was malformed. Ryan re-created
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` by hand as Config variables and redeployed;
  TestA then signed in successfully on Production. The smoke test cannot catch this because it never calls Supabase.
  While retiring the old project, the *new* Vercel project was deleted by mistake (both were named
  `family-finance-hub`). Ryan re-imported it in the new account, re-attached `family-finance-hub-taupe.vercel.app` as
  the Production domain, and re-created only the three `NEXT_PUBLIC_*` variables as Config (Supabase URL and
  publishable key for Production + Preview; site URL for Production only). The Vercel–Supabase integration was
  removed with all the variables it had added (service-role, secret, JWT and `POSTGRES_*` keys). Supabase Site URL is
  `https://family-finance-hub-taupe.vercel.app` and the Redirect URL allowlist holds only
  `https://family-finance-hub-taupe.vercel.app/**`; the old `ten-brown`/FFH-P01 hosts and the integration's
  `ryankis01-4544` wildcards were removed. Smoke test 12/12 and TestA signed in on Production afterwards.
  Lesson: before deleting anything in Vercel, check the account name in the top-left switcher.
- **One fixed Preview address.** The automatic branch address
  (`family-finance-hub-git-phase-ffh-p02-modern-ui-ryankis01-4544.vercel.app`) returned `DEPLOYMENT_NOT_FOUND`, so
  Ryan attached `family-finance-hub-preview.vercel.app` to the Preview environment and the current phase branch, set
  `NEXT_PUBLIC_SITE_URL` to it (Config, Preview) and added it to Supabase Redirect URLs. The FFH-P02 Preview loads in
  light and dark mode. The smoke test was blocked by Vercel Deployment Protection; the script now reports that as
  `BLOCKED` instead of twelve failures. Setup: "Preview setup" in `docs/WORKFLOW.md`.

- **Roadmap revised (Ryan).** Next phases after FFH-P02: money plan home screen, Simple mode switch with guided setup,
  household invitations, goals with dates plus monthly check-in/history, account settings, bills and export. CSV
  import dropped for now; monthly email deferred. Simple mode is an opt-in per-household switch, not the default.
  Details: `docs/PRODUCT_ROADMAP.md`.

## Final-audit backlog (MEDIUM / LOW / NIT)

- LOW: `lib/calculations/money-priority-build.ts` has two unused functions, `consumeRetirementCapacity` and
  `remainingRetirementCapacity` (lint warnings). Confirm they're dead code before removing; this is a money module.
- LOW: one `react-hooks/exhaustive-deps` lint warning (a `useMemo` dependency).
- LOW: moderate dev-only advisories in the eslint tooling (`minimatch` via `typescript-eslint`).
- LOW: confirmation email lands in Junk (no custom sending domain). Revisit before Private Beta.
- LOW: synthetic test users cannot be deleted because of `households_created_by_fkey`. Needs a dependency-aware cleanup
  plan before Private Beta.
- LOW (operations): Vercel stopped creating deployments automatically after 2026-11-07, even though Git is connected,
  Ignored Build Step is Automatic and the GitHub app has access to all repositories. Previews are deployed manually
  for now. Investigate before release, since a release depends on a predictable deploy.
- LOW (operations): let each Vercel Preview trust its own branch URL automatically (e.g. from Vercel's system
  variables) instead of a branch-scoped `NEXT_PUBLIC_SITE_URL` per phase. This touches the auth origin check, so it
  needs its own reviewed change.
- LOW (operations): confirm the old Vercel project (`ryan-s-team9`) is deleted; if it still exists, delete it
  (check the account name first) so `main` is not deployed in two places.
- MEDIUM (reliability, auth-adjacent, needs its own reviewed PR outside FFH-P02's presentation-only scope): validate
  `NEXT_PUBLIC_SUPABASE_URL` at startup (an `https` origin with no path, query or trailing slash; fail closed with a
  clear configuration error), and extend `scripts/smoke/deployed-auth-smoke.mjs` with a check that proves the deployed
  app can reach Supabase Auth (for example a wrong-password sign-in that must return the generic credentials error,
  not a provider/config error), so a misconfigured Supabase variable fails the release smoke test.
