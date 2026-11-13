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
- **Nine additional features approved (Ryan)** and slotted into those phases: example household, "what's missing"
  checklist, debt-free date and cushion badges (money plan); home-screen install (Simple mode); "Can we afford it?",
  irregular costs, per-paycheck view, balance update reminder (goals/check-in); two-factor sign-in (account settings).

- **FFH-P02 independent review (ChatGPT, Ryan's choice for this phase): `REVIEW RESULT: PASS` at
  `9a1b9d995e477576b27768e2524d753c91ad12ab`.** It verified the presentation-only claim (no RLS, schema, auth, data
  access or calculation change). Three findings, all fixed in the phase rather than deferred:
  - MEDIUM: the smoke test treated an app 401/403 on `/dashboard` as Vercel protection. It now reports BLOCKED only
    on Vercel evidence; an app 403 fails the check.
  - MEDIUM: the assets/debt bar could show all-red for $0/$0 and an invalid width for negative balances.
    `lib/formatting/balance-bar.ts` now draws a neutral track, a proportional bar, or no bar with a note.
  - LOW: the fixed sidebar had no scroll fallback on short windows. It now scrolls.

- **FFH-P02 Work mode QA (2026-11-12): stopped on a CRITICAL report.**
  - **#108:** after a TestA sign-in attempt, the Preview showed TestB's household and its $222 record. QA itself
    noted it is not yet established whether a wrong-account or stale session explains it. The release is
    **blocked** until Ryan reproduces it manually and checks hosted memberships. Code review found no path that
    returns another user's session: sign-in is Supabase password auth, and dashboard queries are RLS-scoped (913-check
    CI matrix green). Aid added: the account menu now shows "Signed in as <email>" from the verified claims.
  - **#109 (MEDIUM), fixed:** the dark mode choice reset on reload, on the dashboard only. Cause: SVG `<title>`
    elements built from mixed text and expressions caused a React hydration mismatch (present since FFH-P01), and
    the client rebuild dropped `data-theme`. Fix: single-string titles, plus the toggle re-applies the stored theme
    after mount.
  - **#108 resolved, not a leak.** Work mode's controlled retest, with explicit sign-out between accounts, showed
    the correct identity and data for TestA ($5,000 income, $3,500 expense) and TestB ($222 expense), with no
    cross-household records in any section. The earlier view was a TestB session kept in the cloud browser. Q7 and
    Q8 PASS. Issue #108 closed by QA.
  - **Q9 and Q11 checked locally by the Builder, not by Work mode.** At `ebbd282`, Playwright ran against a
    read-only mock with synthetic data, at 390, 900 and 1024 px, with the device colour scheme light and dark. On
    every page, signed in and out: no horizontal overflow and no page errors. The bottom tab bar shows only on
    phones, the top bar on tablets, and the sidebar from 1024 px. The device dark preference darkens every page,
    and the short-window account menu stays reachable.

- **FFH-P02 released (Ryan's explicit authorization).** PR #98 merged into `main` as `e639533`. Production deployment
  Ready, and the Production smoke test after the release passed 12/12. Ryan confirmed the new sidebar and dashboard.
  FFH-P02 is CLOSED. FFH-P03 (money plan home screen, HIGH risk) starts on `phase/ffh-p03-money-plan`; this closing
  note reaches `main` with the FFH-P03 release.

- **FFH-P03 independent review (ChatGPT): `REVIEW RESULT: FAIL` at `17a4131a86cfd1552f448fb232ccc85cfb4bfef4`.**
  Three HIGH findings and one MEDIUM, all fixed in the phase. They need a targeted re-review.
  - HIGH: plain-wording sentence splitting broke at decimal points ("$123.45" became "45", "23.90%" became "90%").
    Now only exact whole-sentence substitutions; every other character is kept.
  - HIGH: plan amounts were rounded to whole dollars. They are now shown to the cent through `formatPlanMoney` in
    the plan and the dashboard summary.
  - HIGH: saving retirement goals inferred the spending basis. The form now shows the saved basis as an explicit
    answer (Today's dollars / Future dollars / Not sure), and the action validates and writes only that answer.
  - MEDIUM: the cushion badge counted earmarked, debt-backed and everyday cash. It now uses emergency-fund plus
    unassigned cash only, matching the engine's cash purposes, and the label says so.
  Preview smoke test at `17a4131` was 12/12 (run by Ryan on a new desktop).

- **FFH-P03 re-review (ChatGPT): `RE-REVIEW RESULT: PASS` at `925a604551db188ca65c771dc30a2b97f2562213`.**
- **FFH-P03 Work mode QA at `925a604`:** 14 PASS, 1 FAIL (Q16), Q9 and Q11 covered locally by the Builder. No
  isolation leak. Preview smoke test 12/12.
  - **QA #117 (MEDIUM), fixed:** a saved 401(k) YTD was still reported missing. Cause: the engine attributes
    workplace YTD per account owner, and the form could not set an owner. Fix: "People in your household" (add a
    person) and "Whose account is this?" on retirement accounts. The owner must be a person in the caller's
    household, checked server-side and by the database's composite foreign key. The owner question in "What's
    missing" now links to the form. An engine regression test shows the YTD request disappears once an owner is set.

- **Automated sign-in and isolation tests added to the roadmap (Ryan, 2026-11-13)** as the phase after FFH-P03.
  Work mode can't type or read passwords, so Ryan enters TestA/TestB logins only in its secure sign-in window,
  never in a chat. The Work mode prompt and QA checklist now say so.

- **FFH-P03 targeted re-review of the #117 fix (ChatGPT): `RE-REVIEW RESULT: PASS` at
  `cd2ab3794e315ad0d89fa3ec3af698b81f477368`.** One MEDIUM finding, fixed in the phase: an inactive saved owner was
  missing from the owner choices, so an unrelated edit could clear it. The edit form now always offers the saved
  owner, marked "(inactive)". Runtime persistence and hosted RLS for the new writes are covered by Work mode Q16 and
  Q7/Q8 on the Preview, not by local tests.

- **FFH-P03 released (Ryan's explicit authorization).** PR #113 merged into `main` as `6fe7e11`. Production deployment
  Ready, and the Production smoke test after the release passed 12/12. Before release: Work mode QA re-tested Q7, Q8
  and Q16 (all PASS, #117 closed); the Preview smoke test at the final head `82918f8` was 12/12. FFH-P03 is CLOSED.
  FFH-P04 (automated sign-in and isolation tests, HIGH risk) starts on `phase/ffh-p04-auto-isolation-tests`; this
  note reaches `main` with the FFH-P04 release.

- **FFH-P04 first Preview run: `E2E_ISOLATION PASS 34/34` and negative control PASS** (CI run 43457374172 at
  `79bcc52`), after the wait step was switched from GitHub Deployments to Vercel's commit status (PR #123).

- **FFH-P04 independent review (ChatGPT): `REVIEW RESULT: FAIL` at `79bcc52872e2df769d8438628fee12a6b75c0d10`.**
  Both HIGH findings were fixed in the phase:
  - HIGH: redirects were not checked before credentials were typed. Every navigation and non-GET request now goes
    through an origin guard that fetches it without following redirects. Any request or redirect to another origin
    is blocked and the run reports REFUSED (exit 2). The login form must submit to the same origin before anything
    is typed. Rehearsed locally: a cross-origin redirect of the login page, and a 307 of the login POST, are both
    REFUSED.
  - HIGH: a successful Vercel status did not prove the fixed Preview address served the tested commit. New public
    build-metadata route `/api/build-info` returns only Vercel's commit SHA and environment, fixed at build time.
    Before any browser opens or credential is used, the suite requires `environment: "preview"` and
    `commit == github.sha` (`FFH_E2E_EXPECTED_SHA`). It retries for up to 3 minutes, then reports BLOCKED (exit 3).
    This is a small app change outside the original "no app changes" scope, made to satisfy the review; it reads no
    user, household or secret data.
  - MEDIUM (fixed in the phase): the negative control now uses the same `identityMatches` function as the real run,
    and also requires the real leak check to fire on an injected household marker.

- **FFH-P04 targeted re-review (ChatGPT): `RE-REVIEW RESULT: FAIL` at `f051d8197b4eddcad58be59d57b2d1f1826c03ff`.**
  MEDIUM 3 was confirmed FIXED; HIGH 1 and HIGH 2 were PARTIAL. Both remaining findings are fixed in the phase:
  - HIGH (re-review 1): the guard still let GET sub-requests (images, beacons) go to other origins, so a malicious
    page script could leak a typed password. Now every request to another origin, of any method or type, is
    blocked. WebSockets to another origin are closed, service workers are blocked, and any blocked request makes
    the run REFUSED (exit 2), reporting host names only. As a second barrier, the browser runs behind a proxy
    address that does not exist, which only the tested host bypasses, with DNS prefetch and background networking
    off. The login form must post to the same origin (no `javascript:` exception). Rehearsed locally with a page
    that plants an image request and a password beacon to a listening server: both REFUSED, and the server
    received 0 requests. An unguarded browser on the same page reached it, so the plant was real.
  - MEDIUM (re-review 2, fixed rather than deferred): the build is re-checked after each account's run. If the
    Preview address stops serving the expected commit, the run reports BLOCKED (exit 3).

- **Vercel Toolbar turned off (Ryan, 2026-11-13), for Pre-Production and Production deployments.** The first
  Preview run with the full lockdown (`f177be1`) was REFUSED because Vercel's toolbar loads from `vercel.live`. The
  guard blocked it; nothing left the browser. The `x-vercel-skip-toolbar` header was not enough. Turning the toolbar
  off keeps the lockdown with no host exceptions. The setting applies to new builds only.

- **FFH-P04 second targeted re-review (ChatGPT): `RE-REVIEW RESULT: FAIL` at
  `e2e8f0048e6eb0a3b5b8a15f7455e03f486f70a7`.** The external-GET and `javascript:` fixes, the build-drift fix and
  the Toolbar handling were all confirmed. Both new findings are fixed in the phase:
  - HIGH: WebRTC traffic was not confined. Every WebRTC API (`RTCPeerConnection` and related) is now replaced in
    every frame, before any page script runs, with a locked trap. Calling it reports back to the guard (the run is
    REFUSED) and throws, so no ICE/STUN/TURN traffic starts. Chromium also runs with
    `--force-webrtc-ip-handling-policy=disable_non_proxied_udp`, so WebRTC may only use the dead proxy.
    Rehearsed with a planted WebRTC leak to a listening UDP server, from the page and from a fresh iframe. Both were
    REFUSED with 0 packets received. Controls: an unguarded Chromium sent 5 packets, and the browser policy alone
    (trap off) sent 0, so each barrier holds on its own.
  - MEDIUM (fixed rather than deferred): redirect hops after the first, which the route handler does not see again,
    could escape recording. A `request` listener now records every request the browser issues, including each
    redirect hop. Rehearsed with a same-origin image that 302s to another origin: REFUSED, 0 hits received.

- **FFH-P04 third targeted re-review (ChatGPT): `RE-REVIEW RESULT: FAIL` at
  `f8b80e85fb9d4c4d363a54f05b4de6364092138c`.** The WebRTC (HIGH) and redirect-hop (MEDIUM) fixes were confirmed
  FIXED. One new HIGH finding, about behaviour that predates the last fix, is fixed in the phase:
  - HIGH: blocked requests were reported by host name, so a compromised page could put an encoded credential into a
    host name and have it printed in the CI log. Now nothing the tested site controls is ever printed: no host
    names, URLs, paths, page text, build metadata or error text. Violations are recorded as fixed kinds (`request`,
    `redirect`, `websocket`, `webrtc`, `form`, `page`) and reported as kinds plus a count. The build mismatch message
    echoes only a validated 40-hex commit and a known environment name. A wrong final page is reported as "ended on
    a different page". Error names are allowlisted. An unexpected crash prints a fixed BLOCKED message instead of a
    raw error. A structural test requires every value printed by the script to come from an approved list.
    Rehearsed: a planted page encoded the typed password into the host names of 12 image requests (plain, hex,
    base64). Result: REFUSED, and the full captured output contained none of those forms or the host name.

- **FFH-P04 fourth targeted re-review (ChatGPT): `RE-REVIEW RESULT: FAIL` at
  `87a5d2311bc788d401982560afd60e35a7df53b2`.** The host-name logging fix was confirmed FIXED and every earlier
  protection preserved. One new HIGH finding (pre-existing diagnostics) is fixed in the phase:
  - HIGH: site-chosen numbers could still encode a credential in the log: the exact HTTP status of a page and the
    count of blocked attempts. Output is now fixed sentences only: no status codes, counts, kinds, commit fragments
    from the site, error names or marker counts. The only variable output is one PASS/FAIL line per named check,
    the pass total, our own labels, the CI-supplied commit under test and the names of missing secrets. A
    structural test enforces this, and every `record()` failure detail must be a fixed literal. A REFUSED run now
    also says to rotate the TestA/TestB passwords. Rehearsed against a page returning HTTP 465 (an encoded "A"), a
    page firing a password-dependent number of blocked requests, and a page encoding the password into host names.
    The full captured output contained none of `465`, `115`, the password, its hex form or the host name.

- **FFH-P04 residual risk accepted (Ryan, 2026-11-13).** The isolation suite's PASS/FAIL line per named check, the
  pass total and the exit code are decided by how the site under test behaves. A deliberately malicious Preview
  could therefore signal a few bits per run by choosing which checks fail. Every test that reports results has this
  channel. It is accepted because TestA and TestB are synthetic, test-only accounts that see only made-up data.
  Safeguard: **if a Preview run is ever REFUSED, Ryan rotates the TestA/TestB passwords and updates the four GitHub
  secrets.** The REFUSED message and `docs/WORKFLOW.md` say so. Nothing else the site can choose is ever printed.

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
- LOW (UX, auth-adjacent; own reviewed change): when a signed-in user opens `/auth/login`, say "You're already signed
  in as <email>" and offer Sign out, so a leftover session can't be mistaken for a wrong-account sign-in (QA #108).
- MEDIUM (FFH-P04 review #4): the isolation suite detects leaks by markers (other account's email, household name,
  `ZZ-` records) in page text only. Add own-record presence checks, household-specific identifiers in returned data,
  and sensitive detail routes, so a leak of an unlabelled amount is caught. RLS remains covered by the 913-assertion
  matrix.
- LOW (FFH-P04 review #5): "money plan renders" also accepts the honest "no plan right now" card. Once TestA/TestB
  fixtures are fixed, require a real `.money-plan`, and test the unavailable state separately.
