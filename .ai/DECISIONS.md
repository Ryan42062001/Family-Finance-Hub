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

- **FFH-P04 fifth targeted re-review (ChatGPT): `RE-REVIEW RESULT: PASS` at
  `376b02efdac95b89dba08d80410c07ef68165acb`.** The numeric-channel HIGH was confirmed FIXED and every earlier
  protection preserved. The owner-accepted verdict channel was judged a reasonable accepted residual, with no new
  findings. The HIGH-risk review gate is cleared. Phase CI run 43482481911 at `376b02e`: fast, rls-matrix and
  e2e-isolation all PASS (E2E_ISOLATION PASS 34/34, both negative controls PASS). The QA checklist gains Q18
  (`/api/build-info` shows only the commit and environment).

- **FFH-P04 Work mode QA (focused pass) at `1fe4914553124c9d0d7a3ff6cc413ecda597349e`: 9 PASS, 0 FAIL, 9 NOT RUN.**
  Passed: Q1, Q2, Q3, Q7, Q8, Q14, Q15, Q17 and Q18; the rest were out of scope for this phase. No cross-household
  exposure and no new `qa-finding` issues. Phase CI run 43484372566 at `1fe4914`: fast, rls-matrix and
  e2e-isolation all PASS. Release checklist: no environment variables or migrations changed in this phase. FFH-P04
  is a release candidate awaiting Ryan's release decision.

- **FFH-P04 released (Ryan's explicit authorization).** PR #121 merged into `main` as `4f66d7e` (phase head
  `59c59cc`). Vercel Production deployment Ready, and the Production smoke test after the release passed 12/12.
  FFH-P04 is CLOSED. FFH-P05 (Simple mode with guided setup, HIGH risk) starts on `phase/ffh-p05-simple-mode`; this
  note reaches `main` with the FFH-P05 release.

- **FFH-P05 scope decisions (Ryan, 2026-11-13).** Simple mode is a **per-user** setting, not per household, so each
  person in a shared household sees the view they want. It is stored as `profiles.simple_mode`, which is already
  self-scoped by RLS. The guided setup is offered to **every new household** and can be skipped.

- **FFH-P05 hosted migration applied (Ryan's explicit authorization, 2026-11-13).** Ryan ran
  `20261113210000_ffh_p05_profile_simple_mode` in the hosted Supabase SQL editor as one transaction: add
  `profiles.simple_mode boolean not null default false`, add its comment, and record the migration version. Result:
  "Success. No rows returned". Hosted `parity.sql` then matched `scripts/rls-local/parity.expected.txt` in all
  **9/9** sections (columns 217, constraints 166, function_grants 12, functions 6, migrations 16, policies 59,
  rls 16, table_grants 208, triggers 2). The change is additive with an off default, so Production behaviour is
  unchanged until the FFH-P05 release.
- **FFH-P05 build complete on the phase branch.** PR #133 (per-user Simple mode: migration, 6 new RLS probes to 919,
  switch, simplified screens) and PR #134 (guided setup for every new household, home-screen install). Phase CI run
  43505658954 at `7927263`: fast, rls-matrix (919) and e2e-isolation all PASS.

- **FFH-P05 Work mode QA at `7927263`: 13 PASS, 0 FAIL, 9 NOT RUN (out of scope).** Q1, Q2, Q3, Q7, Q8, Q14, Q15,
  Q17, Q18 and the new Q19–Q22 passed: Simple view, detailed tools in Simple view, the per-person setting (TestB
  unaffected; TestA set back to off) and the manifest. No cross-household exposure and no `qa-finding` issues.
- **Work mode scope (Ryan, 2026-11-13):** since the automated `e2e-isolation` job now checks sign-in and household
  isolation on every phase push (Q3, Q7, Q8), future Work mode passes skip those checks and focus on new or changed
  screens. A phase that changes no screens can skip Work mode.
- **FFH-P05 independent review (ChatGPT): `REVIEW RESULT: FAIL` at
  `20c8114af4edb0dc312b52c4a6d26b15ac27abbe`.** The migration, RLS (919) and Simple mode passed. Two HIGH findings
  in the guided setup are fixed in the phase:
  - HIGH 1: savings were saved with the default cash purpose `unallocated`, which lets the Money Priority Engine
    redeploy them without the person saying so. Now setup asks "What are these savings for?" (Emergency fund – keep
    it safe = `protected_reserve`; Free for the plan to use = `unallocated`; Everyday spending money =
    `operating_cash`; Not sure – add it later). An amount without a choice is rejected. **"Not sure" saves no
    savings** (Ryan's decision), and the plan says to add them under Financial profile.
  - HIGH 2: the empty-household check and the writes were separate requests, so two simultaneous submissions could
    both save. New migration `20261113230000_ffh_p05_atomic_household_setup` adds
    `public.complete_household_setup(...)`. It is SECURITY INVOKER (the caller's own RLS applies) with
    `search_path = ''`, executable only by `authenticated`. It never takes a household from input, validates every
    answer, takes a per-household transaction advisory lock, refuses if the household has any income, expense, debt
    or account (`already_set_up`), and writes everything in one transaction or nothing. The app now makes exactly one
    RPC and writes no tables directly. The RLS matrix gains 11 probes (919 → 930) on a new empty household C:
    signed-out and household-less callers are refused; a non-empty household is refused and unchanged; a viewer is
    denied and leaves nothing behind; the owner saves 5 rows plus Simple view; a second call saves nothing more.
  - MEDIUM 2 (fixed in the phase): every filled-in setup field is now validated, debt details without a balance are
    rejected, and the Simple view value must be exactly "on" or absent.

- **FFH-P05 second hosted migration applied (Ryan's explicit authorization, 2026-11-13).** Ryan ran
  `20261113230000_ffh_p05_atomic_household_setup` in the hosted SQL editor and recorded the version. The first
  parity check matched 8/9: copying the file from the browser on Windows had stored the function body with CRLF
  line endings (4,478 characters instead of 4,390, one extra per line). The function was re-created from its own
  stored definition with the carriage returns removed (`pg_get_functiondef` + `replace(..., E'\r', '')`), which
  keeps its grants. Result: body md5 `e8759d3d46e409cbc9be5afb4e162897`, length 4,390, SECURITY INVOKER,
  `search_path=""`, all identical to the repo. Hosted `parity.sql` then matched `parity.expected.txt` **9/9**
  (functions 7 `279c887e…`, function_grants 14, migrations 17; policies, RLS, table grants, columns, constraints
  and triggers unchanged). Lesson for future hosted migrations: re-create function bodies the same way, or check
  for `\r` before running parity.

- **FFH-P05 targeted re-review (ChatGPT): `RE-REVIEW RESULT: PASS` at
  `39b6449360be3c749c2eb96ba69e2aa09ebd8109`.** HIGH 1 (savings purpose) and HIGH 2 (atomic setup) FIXED, MEDIUM 2
  FIXED, MEDIUM 1 in the backlog. The reviewer noted, without raising a finding, that an all-zero setup writes no
  financial records and so can be repeated, and that a viewer can use that no-write path to set their own Simple
  view, which self-only RLS already permits. One new MEDIUM, fixed before release at Ryan's choice ("Fix it first"):
  the plan page did not show setup's post-save messages, so the "Not sure" savings reminder from Ryan's decision was
  never displayed. Setup now redirects with a fixed key (`/plan?notice=savings_pending` or `already_set_up`). The
  plan page shows only allowlisted notices from `lib/plan/plan-notices.ts`, with a link to Financial profile, and
  never displays text from the URL. This needs a short targeted re-review of the change.

- **FFH-P05 targeted re-review of the notice fix (ChatGPT): `RE-REVIEW RESULT: PASS` at
  `221e351d545b84cb4c9b13462ec6ea3afb1cf4a0`.** The MEDIUM (setup notices not shown) was FIXED, with no new
  blocking findings and one LOW (backlog).
- **FFH-P05 released (Ryan's explicit authorization).** PR #136 merged into `main` as `1bd1b59` (exact reviewed head
  `221e351`). Vercel Production deployment Ready; Production smoke test after release 12/12; Production
  `/api/build-info` reports commit `1bd1b5984f952f0104dd4bfb1be04226b0be0b67`, environment `production`. FFH-P05 is
  CLOSED. FFH-P06 (household invitations, HIGH risk) starts on `phase/ffh-p06-household-invitations`; this note
  reaches `main` with the FFH-P06 release.

- **FFH-P06 scope decisions (Ryan, 2026-11-13, "go with your recommendations").** Invitations are links the owner
  copies and shares; valid 7 days; single use; only the owner invites and manages roles. Design recorded in
  `.ai/CURRENT_PHASE.md`.

- **FFH-P06 build complete and hosted migration applied (Ryan, 2026-11-13).** PR #141 merged into the phase branch:
  invitations schema with owner-only RLS and three narrow SECURITY DEFINER membership functions; RLS matrix 961
  (31 new probes); the Household page; invite links (shown once, hash stored); the signed-out remembered invite and
  onboarding "Join that household"; QA Q23–Q26. Ryan applied `20261114010000_ffh_p06_household_invitations` in the
  hosted SQL editor, normalised the three function bodies from `pg_get_functiondef` with carriage returns removed
  (the CRLF lesson from FFH-P05, applied up front), and recorded the version. Hosted `parity.sql` matched
  `parity.expected.txt` **9/9** on the first run (columns 227, constraints 176, function_grants 20, functions 10,
  migrations 18, policies 62, rls 17, table_grants 211, triggers 2).

- **FFH-P06 independent review: FAIL at `02ebd6e` (recorded on PR #143 while the Builder was unavailable).**
  HIGH: two *different* valid invitations accepted at the same moment by one account could each pass the
  membership precheck, giving that account two households (the row lock covers only one invitation). MEDIUM: the
  table-wide INSERT grant let an owner set future `created_at`/`expires_at` values that satisfy the relative 7-day
  check. LOW: QA Q24 expected the public invite page to reveal validity (by design it checks only token shape). A
  ChatGPT session prepared detached remediation commits `dc61f05` and `9f8841b` (UNIQUE(user_id) on
  household_members with a fail-closed guard for existing conflicts; column-level INSERT grants; a sanitized
  unique-violation in accept; a real two-session concurrency test; matrix target 970; Q24 reconciled) and placed a
  no-deploy hold (no pushes, because pushes build Previews), pending CI evidence.
- **No-deploy hold lifted (Ryan, 2026-11-14): "Lift hold, push normally".** The Builder fast-forwarded its working
  branch to `9f8841b` unchanged (`npm run verify` PASS locally: 980/980, 203/203). The parity fingerprint comes only
  from the CI run on the 19-migration database, never by guessing.

- **FFH-P06 remediation merged and re-reviewed.** PR #144 merged into the phase branch as `eceacfd`. Phase-head CI
  run 43539148684: fast, rls-matrix (parity MATCH against the committed fingerprint, 970/970, two-session concurrency
  PASS, both historical-data guards fail closed, zero residue) and e2e-isolation (34/34 plus negative controls) all
  SUCCESS. Fresh independent ChatGPT targeted re-review: `RE-REVIEW RESULT: PASS` at
  `eceacfdc529bb884ed89da9cb7008d627e03d86d`; HIGH, MEDIUM and LOW FIXED; two new LOW (N01, N02) and a dependency
  note, none blocking. Manager accepted (PR #143 comment 6869561549). Hosted migration `20261114020000` is NOT yet
  applied; the step-by-step procedure, each step separately authorized by Ryan, is
  `docs/workflow/FFH-P06_HOSTED_MIGRATION.md`. Hosted parity is unverified until its step 5 shows 9/9.

- **FFH-P06 hosted migration applied and hosted parity verified (Ryan, 2026-11-14).** Ryan authorized and ran each
  step of `docs/workflow/FFH-P06_HOSTED_MIGRATION.md`: read-only precheck `0 | 0 | false | false | 18` (no account with
  two households, no future-dated pending invitations); migration `20261114020000` applied; version recorded. First
  parity run 8/9: the Builder's pasted copy had dropped the comments inside `accept_household_invitation`'s body
  (behavior identical, stored text different). Ryan re-created the function from the exact repo body, removed the CRLF
  line endings that paste added, and confirmed the body hash `e63a3022…` (repo). Hosted `parity.sql` then matched
  `parity.expected.txt` **9/9** (constraints 177, functions 10, migrations 19, table_grants 210). Lesson recorded in the
  procedure: paste migration files unedited and re-check line endings right before parity. No row data was read or
  changed. Next: Work mode QA Q23–Q26 plus auth regressions on the Preview.

- **FFH-P06 released (Ryan's explicit authorization, 2026-11-14).** Release checklist run by the Builder at exact head
  `543e61fe43aba6157ada8a357df2a7866348f0d5` (only docs changed after the PASS at `eceacfd`; CI run 43555092901 fast,
  rls-matrix and e2e-isolation SUCCESS; Work mode QA 12 PASS / 0 FAIL / 14 NOT RUN, scoped to Q1-Q3, Q6-Q8, Q17, Q18
  and Q23-Q26; hosted parity 9/9 as recorded from Ryan's SQL Editor run; Vercel and live hosted state not reachable from
  the Builder's sandbox, so marked UNVERIFIED there). Ryan authorized the merge; PR #143 merged into `main` as
  `8d1a6aaa6e55f9f3369369ddfa1f3cdb3ad62f1c` with the exact head (main's tree is identical to `543e61f`). Ryan reported
  the Production deployment Ready and the Production smoke test 12/12. FFH-P06 is CLOSED. FFH-P07 (goals and monthly
  check-in) starts on `phase/ffh-p07-goals-and-check-ins`; this note reaches `main` with the FFH-P07 release.

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
- LOW (FFH-P05 build note, pre-existing): the shared money parser (`lib/forms/validate.ts`, moved unchanged from the
  Financial profile actions) rounds with `Math.round(value * 100) / 100`, so some half-cent inputs round down because
  of floating point (for example `2500.555` gives `2500.55`). Changing money rounding is a policy decision for its
  own reviewed change; amounts entered in whole cents are unaffected.
- MEDIUM (FFH-P05 review #1): guided setup records "Fixed bills and must-haves" as essential and "Other spending" as
  not essential. This follows the question wording, but a fixed bill can be discretionary and some variable spending
  essential. Add an explanation and a correction step (or mark them provisional until confirmed), with tests showing
  how a changed classification affects required outflow.
- LOW (FFH-P05 re-review): `app/setup/page.tsx` treats a failed record-count lookup the same as "household already has
  records" and shows the "Setup didn't add anything" notice. Setup stays safely unavailable, but the message is
  misleading. Split the branches and show a fixed "We couldn't check your household details. Please try again."
- LOW (FFH-P06 re-review N01): `app/onboarding/actions.ts` (household create) redirects with the raw
  `householdError.message`. If another invitation is accepted between the precheck and the insert, the database
  correctly refuses the second household, but the unique-constraint text can appear in the URL/page. Map the
  uniqueness error to a fixed "You already belong to a household" notice and never show raw database messages
  (the same applies to the `profileError` redirect beside it). Not a bypass of the one-household rule.
- LOW (FFH-P06 re-review N02): `.ai/HANDOFF.md` described `02ebd6e` and the pending fingerprint work after the
  remediation had merged. Fixed in the hosted-migration procedure PR (handoff now at `eceacfd`).
- LOW (dependency hygiene, FFH-P06 re-review note): `npm audit` reports eight moderate advisories; the `fast` job's
  high-severity threshold passes. Review and upgrade in a separate dependency PR.

## 2026-11-14 — FFH-P07 scope approved by Ryan (Owner decision)

- **FFH-P06 is CLOSED / RELEASED.** PR #143 merged into protected `main` as
  `8d1a6aaa6e55f9f3369369ddfa1f3cdb3ad62f1c` from reviewed phase head
  `543e61fe43aba6157ada8a357df2a7866348f0d5`. Ryan reported Vercel Production Ready and
  Production smoke **12/12**; existing GitHub post-merge CI evidence remains authoritative for CI.
- **FFH-P07 approved scope:** a **separate** household savings-goals tracker containing name, target amount,
  current saved amount, date and calculated monthly savings requirement; and a **monthly financial check-in**
  with manually entered balances, a yes/no indicating whether that month's plan was followed, and historical
  net-worth/cash-flow snapshots.
- **Goals do NOT alter the Money Priority Engine** or create/reorder financial plan steps in P07. Any such
  integration needs a separate Owner financial-policy decision.
- **Permission decision:** household **owners and members can create/edit** goals and check-ins; **viewers are
  read-only**. RLS and server-side enforcement are required.
- **Not part of P07:** Can We Afford It, irregular expenses/monthly set-asides, a per-paycheck plan view,
  and the 30-day in-app balance reminder. Carry them forward as future roadmap candidates.
- **Unspecified financial semantics remain explicitly unapproved:** if no canonical existing calculation
  exists, the Builder must propose date-boundary/month-counting, rounding, partial/late goals, net-worth and
  cash-flow snapshot sources and missing-data behavior for Ryan's approval **before implementing policy**.
  Scope approval is not permission to invent a recommendation or change money calculations.
- **Execution:** P07 remains **PLANNED / OWNER SCOPE APPROVED**, with one Claude Code Primary Builder.
  Phase implementation, QA, review, and hosted migrations still follow `docs/WORKFLOW.md`. This approval
  does not authorize changing hosted Supabase, merging into `main`, or a Production release.
- **Documentation note:** `main` retains a P06 `.ai/CURRENT_PHASE.md` until a separately approved release;
  the active phase-branch documents are updated now. Do not merge to Production for documentation tidiness.

## 2026-11-14 — FFH-P07 financial rules approved by Ryan

- Ryan approved `docs/FFH-P07_DESIGN.md` **as recommended**: D1 (separate `savings_goals` table the Money Priority
  Engine never reads), goal rules G1–G10 with R1 = half-up to the cent (matches Your plan) and R2 = progress percent
  rounded down, and check-in rules C1–C10 (one per household per month, no future months; per-item balances
  pre-filled from the profile with copied names; check-ins never change the profile; blank = not entered and makes
  net worth "Incomplete"; planned cash flow frozen at first save; required Yes/No; owner/member edit/delete, viewer
  read-only; history list without charts or change figures). Hosted migrations and Production remain separate approvals.
- **FFH-P07 hosted migration applied (Ryan, 2026-11-14).** `20261114100000_ffh_p07_goals_and_check_ins` applied to
  hosted Supabase with authorization via `docs/workflow/FFH-P07_HOSTED_MIGRATION.md`. The SQL Editor stored CRLF in
  the five function bodies; the documented one-time fix restored the exact repository bodies. Hosted parity **9/9**
  (migrations 20). Additive only; Production code does not use the new tables until the P07 release.
- **FFH-P07 rule C6 (Ryan, 2026-11-14): "use the original wording".** The planned cash-flow snapshot is "not
  available" only when the Financial profile has no active income AND no expenses; with only one of them it is shown
  (and can be negative). Implemented by follow-up migration `20261114110000_ffh_p07_cash_flow_availability.sql`
  (replaces the one trigger function body). Already-saved check-ins are not recalculated. Hosted apply needs Ryan.
- **FFH-P07 C6 hosted migration applied (Ryan, 2026-11-14).** `20261114110000` applied; trigger body matches the
  repository exactly; hosted parity **9/9** (migrations 21).

## 2026-11-14 — FFH-P07 independent review (ChatGPT) at `d64b2439`: REVIEW RESULT FAIL, remediated

- **F01 HIGH (fixed):** goal monthly amount used float half-up (`Math.round((x + EPSILON) * 100)`), so exact half-cent
  ties rounded down ($4.27 / 2 gave $2.13, not $2.14). `lib/calculations/goal-tracker.ts` now computes in BigInt
  integer cents with exact half-up division; regression tests for $4.27, $4.35, $4.77, $1.01, $0.01 and the maximum.
- **F03 MEDIUM (fixed):** check-in net worth summed JS-number cents and lost cents beyond 2^53. Now BigInt cents end
  to end, formatted from cents (`formatCents`); tests with 100–300 maximum balances and negative balances.
- **F04 MEDIUM (fixed):** progress used `floor(percent + 1e-9)`, which could round up (32.999999999% → 33%). Now
  `floor(saved_cents * 100 / target_cents)` in BigInt; tests one cent below boundaries.
- **F05 LOW (fixed):** the check-in month was limited to the last 24 months and year ≥ 2000. Now any past month or
  this month (UTC), via a month input with a `max`; the one-per-month rule is unchanged.
- **F02 MEDIUM (fixed before release, Ryan 2026-11-14 "fix it now before the merge"; was backlog):** owners/members can write check-in rows directly through the table API
  (RLS-scoped to their own household), so the database does not enforce that a check-in has exactly one line per
  profile item, and direct line edits don't update the parent's `updated_by`/`updated_at`; `create_monthly_check_in`
  also accepts an empty balance list (shown as a complete $0.00 net worth). No cross-household or viewer access.
  Suggested fix (own reviewed change with a hosted migration): revoke direct INSERT/UPDATE/DELETE on the two check-in
  tables, route all writes through the functions, have `create_monthly_check_in` build the line set from the profile
  server-side (amounts keyed by profile item id), and bump the parent audit fields on every line change; add tests for
  omitted, duplicated and deleted lines.
- **Engine backlog (LOW, not changed: P07 forbids Money Priority Engine changes):** `money-priority-goal-intelligence.ts`
  `roundMoney` has the same float tie flaw as F01 (`requiredMonthlyFunding` can be one cent low on exact half-cent
  ties). Fix in its own reviewed engine change with integer-cent rounding.
- **Re-review (same reviewer) at `6e4e712f633c7c447d25e62e73c0edef294e8230`: REVIEW RESULT PASS.** F01, F03, F04 and
  F05 FIXED; F02 NOT FIXED (accepted MEDIUM backlog); no new findings; exact-head CI run 43566044631 green (`fast`,
  `rls-matrix` 1217, `e2e-isolation`). Reviewer note for the F02 fix: the check-in functions are SECURITY INVOKER, so
  revoking direct table writes requires changing their execution/authorization model in the same migration (e.g.
  SECURITY DEFINER with explicit membership and owner/member checks), or legitimate saves would break.
- **F02 fixed (Ryan: fix before merge).** Migration `20261114120000_ffh_p07_check_in_write_integrity.sql`: direct
  client writes to check-in lines and direct INSERT/UPDATE of check-ins revoked (SELECT kept; owners/members may still
  delete a whole check-in under RLS). `create_monthly_check_in` / `update_monthly_check_in` are now SECURITY DEFINER
  with `search_path=''`, check sign-in, take the household from the caller's own membership and require owner/member
  (`private.can_write_household_financials`). Create builds the lines from the profile and requires exactly one entry
  per profile item (none missing, extra, repeated, foreign or of the wrong kind); edit requires one amount per line and
  always stamps the parent's `updated_by`/`updated_at`. RLS matrix 1122 assertions (check-in tables moved out of the
  generic full-CRUD loop into 78 dedicated probes); mutation checks: re-granting direct writes, removing the
  completeness checks and skipping the audit stamp each fail the matrix. Hosted apply needs Ryan (procedure part 3).
- **FFH-P07 F02 hosted migration applied (Ryan).** `20261114120000` applied; hosted parity **9/9** (migrations 22,
  `table_grants` 229).
- **F02 re-review (same reviewer) at `b9c182eb`: REVIEW RESULT PASS**, F02 FIXED, two new LOW findings, both fixed
  before release at Ryan's request ("Fix N01 and N02 first"):
  - **N01 LOW (fixed):** simultaneous edits of one check-in listing lines in different orders could deadlock. Migration
    `20261114130000_ffh_p07_check_in_edit_lock.sql` locks the check-in row (`FOR UPDATE`) before any line.
    `scripts/rls-ci/test-check-in-concurrency.sh` (CI only, real parallel sessions) reproduces the deadlock on the old
    body and requires both saves, applied as complete sets, on the fixed body; zero residue.
  - **N02 LOW (fixed):** the matrix now has an active member of household C who creates and edits check-ins through
    the functions (`created_by`/`updated_by` = the member, snapshot unchanged); 1126 assertions. Restricting the
    functions to owners makes the matrix fail.
  - Reviewer note (UNVERIFIED, not a finding): check-ins saved before F02 are not rewritten. Production never served
    the Goals pages; the only check-ins in the shared database are synthetic Preview QA rows saved through the app.
- **FFH-P07 N01 hosted migration applied (Ryan, 2026-11-15).** `20261114130000` applied; hosted parity **9/9**
  (migrations 23).
- **N01/N02 re-review (same reviewer) at `34fa409319955db11cd3a450d15d16b1d619787f`: REVIEW RESULT PASS.** N01 and
  N02 FIXED, no new findings; exact-head CI run 43676392748 green (`fast`, `rls-matrix` 1126 + both concurrency
  tests, `e2e-isolation`). The reviewer marked the hosted apply UNVERIFIED from CI alone; Ryan's hosted parity 9/9 at
  migrations 23 (above) covers it. No BLOCKER/CRITICAL/HIGH/MEDIUM finding remains open for P07.

## 2026-11-15 / 2026-11-18 — FFH-P07 released and closed (Ryan)

- **Release authorized by Ryan** ("Release FFH-P07: merge PR #155 at ae97e90e… into main"). PR #155 merged into
  protected `main` as `1c4753dab2e3a9e38fbfbe34ce82397e92047f43`. Release checklist: only docs changed after the
  reviewed code head `34fa4093`; clean fast-forward of `main`; no new environment variables; no Money Priority Engine
  file changed; exactly the four P07 migrations, all already applied to hosted (parity 9/9, migrations 23).
- **Production smoke test 12/12** (`DEPLOYED_AUTH_SMOKE PASS 12/12`, run by Ryan on 2026-11-18; the Builder's
  container cannot reach `vercel.app`). FFH-P07 is **CLOSED**.
- Open backlog from P07: the Money Priority Engine's float rounding-tie flaw (LOW, own reviewed engine change).

## 2026-11-17 — FFH-P07 closure carry and FFH-P08 planning continuity

- **Owner instruction:** announce each completed phase explicitly as **PHASE COMPLETE — START A FRESH CLAUDE CODE CHAT**.
  Claude Code Builder starts a fresh chat for each new phase; the repository handoff is the source of continuity.
- **P07 CLOSED:** PR #155 merged to Production `main` at `1c4753dab2e3a9e38fbfbe34ce82397e92047f43`;
  Ryan reported Production smoke 12/12. P07 closure documentation was prepared in draft PR #161,
  then carried into the non-Production P08 phase branch to avoid a docs-only Production deployment.
- **P08 scope status:** roadmap account-security item is next, but the detailed proposal at
  `docs/FFH-P08_PROPOSAL.md` and decisions R1–R8 are **NOT APPROVED**. No implementation, auth
  provider changes, hosted SQL, real-data cleanup or Production merge authorized by this cleanup.
- **CI blocker to address before implementation merge:** [run 44216093879](https://github.com/Ryan42062001/Family-Finance-Hub/actions/runs/44216093879)
  on the P07 close-out/proposal head had `rls-matrix` SUCCESS and `fast` FAILURE at high-severity
  `npm audit` (9 HIGH, 6 MODERATE advisories reported). Triage with package/dependency evidence;
  do not reduce the audit gate, misstate CI as green, or assume production exploitability.

## 2026-11-18 — FFH-P08 decisions R1–R8 and audit exception (Ryan)

- **R1–R8 approved as recommended** (`docs/FFH-P08_PROPOSAL.md` §9): email change deferred; deletion via a SECURITY
  DEFINER SQL function only if the spike and a read-only hosted check prove it works (else back to Ryan); owners of a
  shared household refused; deletion permanent with re-authentication and typed `DELETE`; optional second
  authenticator plus Owner-assisted reset; 12-character minimum password, Secure password change on; optional TOTP
  enforced in the database; TestA/TestB password-only, synthetic TestC for 2FA QA. This does **not** authorize any
  hosted Supabase/Auth, Vercel, secret or Production change; each is separate.
- **Before coding:** fresh independent different-model threat-model review of the design
  (`docs/workflow/FFH-P08_THREAT_MODEL_REVIEW_PROMPT.md`).
- **Audit gate, option 2 approved:** `scripts/audit-gate.mjs` replaces bare `npm audit --audit-level=high` in CI with
  the same threshold and one exception, GHSA-fc5q-39xc-vjpf in `picomatch` (no patched release; dev-only ESLint
  toolchain; attacker must supply the glob pattern), valid while HIGH, absent from `npm audit --omit=dev`, and until
  **2027-01-18**. Any new exception needs Ryan's approval. PR #163; `docs/workflow/FFH-P08_DEPENDENCY_AUDIT.md`.

## 2026-11-18 — FFH-P08 threat-model review round 1: FAIL; design Revision 1

- Independent different-model review at `5c87b119be0ca7efcafeb58dd2911de299803d9e`: **FAIL** (TM-01 CRITICAL direct
  deletion RPC; TM-02 MFA via Auth API; TM-03 incomplete MFA coverage; TM-04 provider password change; TM-05 deletion
  race; TM-06 stale tokens after factor removal; TM-07/TM-08 MEDIUM). Receipt: `docs/workflow/FFH-P08_THREAT_MODEL_REVIEW.md`.
- Builder response: `docs/FFH-P08_PROPOSAL.md` §10 (binding). R1–R8 unchanged. New decisions R9–R11 pending Ryan.
  Implementation blocked until the targeted re-review passes.

## 2026-11-18 — FFH-P08 threat-model round 2: FAIL; design Revision 2

- Re-review at `9af9287412fc04bb9e4264cbe336c82741daf375`: **FAIL** (N01 HIGH `aal2` not bound to an approved factor;
  N02 HIGH clock-based epoch; N03 MEDIUM lock order; N04 MEDIUM view coverage). TM-01/04/07/08 resolved
  (01/04 conditional on the spike).
- Builder response: proposal §11 (binding). The `iat` epoch is withdrawn in favour of `auth.sessions` liveness; no
  clock fallback. R9–R11 remain pending Ryan. Implementation still blocked.

## 2026-11-18 — FFH-P08 R9–R11 approved (Ryan, as recommended)

- **R9:** turn on the Supabase Auth setting requiring the current password for every password update (applied to
  hosted Auth later, only with Ryan's per-change authorization).
- **R10:** accept the Auth-level residual that a stolen `aal1` session of a person without 2FA may enroll a first
  factor; FFH's database never honours an unapproved factor (proposal §11.2).
- **R11:** Owner-assisted 2FA reset only after identity is confirmed in person or by a call Ryan places to a number he
  already had; never an inbound message alone.
- Implementation still waits for the round 3 threat-model re-review; then the CI-only spike (§11.6).

## 2026-11-18 — Build-first / audit-at-the-end workflow (Ryan)

- The routine pre-build independent threat-model review is **no longer a required gate** (FFH-P08's round 3 is not
  needed). The Builder builds the complete approved phase in one chat, merges green PRs into the phase branch without
  Manager approval, keeps CI/security tests intact, and updates docs alongside code (no standalone docs PRs).
- After the full phase is built: freeze an exact candidate SHA for **one** fresh independent different-model HIGH-risk
  audit; fix BLOCKER/CRITICAL/HIGH with targeted re-review of those fixes only; MEDIUM/LOW per release policy.
- Unchanged: Ryan separately authorizes every hosted Supabase/Auth or Vercel change, secret, real-data operation and
  Production release; synthetic data only; TestA/TestB isolation preserved; serious vulnerabilities found mid-build
  are fixed immediately. Phase close-out still announces PHASE COMPLETE — START A FRESH CLAUDE CODE CHAT.
- FFH-P08 proceeds on proposal §11 (with §10/§3–§8 where not overridden) and R1–R11.

## 2026-11-18 — Six standing efficiency rules (Ryan)

Autonomous phase work; bundled PRs (no standalone docs PRs); keep working during CI but never merge before green;
batched Owner decisions with recommendations; targeted plus final exact-head Browser QA; concise docs kept current.
Recorded in `docs/WORKFLOW.md`. One comprehensive different-model HIGH-risk audit at the end of P08, targeted
re-reviews for serious fixes; all CI, RLS, isolation and release protections unchanged. P09 is being planned
separately by ChatGPT Work; the P08 Builder does not touch it.

## 2026-11-18 — R6 amended: minimum password length 8 (Ryan)

Ryan chose 8 characters instead of the recommended 12 (Supabase's recommended minimum; no forced character classes).
App validation, CI stack config, tests, QA rows and the hosted-settings procedure updated to match.

## 2026-11-18 — FFH-P08 Browser QA and independent audit 1

- **Browser QA** (ChatGPT Work mode, Preview `43b5e1d`): 34 PASS / 0 FAIL / 3 NOT RUN (Q9 widths, Q11 device dark mode:
  unchanged by P08; Q24's final cancelled-link reopen: covered by the matrix/P06 tests). TestC completed Q36 and was
  deleted. No `qa-finding` issues. Results: PR #168 comment.
- **Audit 1 FAIL** at `ed915d41`: F01 HIGH fixed (session must postdate the authenticator), F02/F03 MEDIUM fixed;
  receipt `docs/workflow/FFH-P08_AUDIT.md`. Targeted re-review pending.
- **Backlog (LOW, F04):** invitation create/cancel are still direct owner-only RLS writes rather than household-locked
  RPCs as proposal §11.4 states. RLS limits them to the owner's own household; no cross-household effect or deletion
  race was shown. Suggested fix: move both into RPCs that lock the household row first; revoke direct writes.

## 2026-11-18 — FFH-P08 audit re-review PASS; hosted fix migration applied

- Targeted re-review PASS at `ce854b7cf95691f9fed46cbc228323c24220326d` (F01–F03 resolved, F04 LOW backlog).
- Ryan applied `20261118110000` to hosted (CRLF fixed), parity 9/9, migrations 25.
- Production release of P08 still needs Ryan's separate exact-SHA authorization and a 12/12 Production smoke.

## 2026-11-18 — FFH-P08 released to Production and closed

- Ryan authorized "Release FFH-P08 at 1aaa96cd89f1e35b49d61c23731f2a37e23ed632"; PR #176 merged as
  `2a62022b5e5ae9d60a32fd7ac6745ffb4366e904` after exact-head CI green (fast, rls-matrix, e2e-isolation).
- Production smoke **12/12** at `https://family-finance-hub-taupe.vercel.app` serving `2a62022` (run by the Builder after
  Ryan approved adding the Production and Preview hosts to the Family-Finance-Hub environment); signed-out `/account*`
  and `/auth/two-factor` redirect to sign-in. FFH-P08 is **CLOSED**.

## 2026-11-18 — FFH-P09 started; Builder interpretations of issue #170

Ryan authorized P09 nonproduction source implementation within #170 (fresh chat). Builder choices inside the spec,
for the audit to check:
- **"Today"** is the UTC calendar date, as everywhere else in the app (`todayUtc()`); all bill dates are date-only.
- **Upcoming 30 days** = today through today + 29 days, every occurrence in that window (a monthly bill can appear
  twice). **Forecast** = the rest of the current month from today, then the next 11 calendar months; passed dates are
  never shown (nothing implies paid/unpaid).
- **Debts** count as bills with their minimum payment, monthly only, on the same due-date/reminder rules.
- **Monthly planning amount** on /bills = sum of every expense's monthly equivalent + debt minimums (scheduled or not).
- A reminder needs a due date (database CHECK); clearing the date clears the reminder.
- Saving the Bills form with the pre-filled next due date unchanged keeps the original anchor (so Jan 31 / Feb 29
  anchors are not replaced by a clamped occurrence); a different date becomes the new anchor.
- The database derives `monthly_amount` (trigger + CHECK); legacy monthly-only writers keep working for monthly
  rows; a monthly-only change to a quarterly/yearly row is refused (no silent reinterpretation).
- CSV: all current steps (recommended, worth considering, needs more information) in engine rank order; columns
  Order, Step, Status, Monthly amount (USD), Goes to, Why; UTF-8 BOM, CRLF, every cell quoted, formula neutralisation
  with a leading apostrophe. No step ids or "technical wording".
- QA rows Q38–Q45 (P08 uses Q32–Q37).

## 2026-11-18 — FFH-P09 hosted steps and Preview QA round 1

- Hosted (Ryan): pre-check `25 | false | false`; migration `20261118120000` applied and recorded; existing rows
  `0 | 0 | 0`; parity 8/9 (CRLF in the new trigger function) → `strip-cr.sql` → **9/9**, 26 migrations. Preview on
  the phase branch; smoke 12/12; `e2e-isolation` PASS at `837f383` (first attempt ran before the domain moved).
- QA at `837f383`: Q39, Q40, Q42, Q44, Q45 PASS. Q41 FAIL (#180, MEDIUM): the footnote said "paid" → reworded with a
  regression test. Q38 phone width and Q43 native print preview could not be verified in the fixed-width Cloud
  Browser (not defects): those parts are now Ryan's device checks; the Builder confirmed the deployed print stylesheet
  hides the header (Playwright, print media, Preview `/demo`).

## 2026-11-19 — FFH-P09 independent audit PASS; both findings fixed

- Different-model end-of-phase audit at `6bd5c708e16b9d9fabaa86f2258cd0a50736d669`: **PASS** (0 BLOCKER/CRITICAL/HIGH).
  P09-01 MEDIUM (stale Bills form could move a month-end anchor) and P09-02 LOW (upgrade check not in CI) both fixed.
  QA findings #180 and #182 fixed and closed. Receipt: `docs/workflow/FFH-P09_AUDIT.md`.
- Owner device checks (2026-11-19): Q38 phone layout PASS, Q43 native print preview PASS, Q41 re-check PASS.

## 2026-11-19 — FFH-P09 released to Production and closed

- Ryan authorized "Release FFH-P09 at d4de2a1c9ae91ee92566b42d3f1d3d3faba748bf"; PR #186 merged as
  `83979c1c9e3b6f2e6ac1f26f3d5643c8f98061db` after exact-head CI green (fast, rls-matrix incl. P09 upgrade check,
  e2e-isolation).
- Production smoke **12/12** at `https://family-finance-hub-taupe.vercel.app` serving `83979c1`; signed-out
  `/bills`, `/plan/print`, `/plan/steps-csv` and `/account` redirect to sign-in. FFH-P09 is **CLOSED**.

## 2026-11-19 — FFH-P10 started; Builder interpretations of issue #171

Ryan authorized P10 nonproduction implementation of #171 plus the #188 lessons-learned rule (fresh chat). Phase branch
`phase/ffh-p10-can-we-afford-it` = fast-forward of #187's close-out (`304d606`) on Production `83979c1`; phase PR #189.
Builder choices inside the spec, for the audit to check:
- **Verdict source:** `runHomeScenarioAdapter` / `runVehicleScenarioAdapter` (the Scenario Lab adapters, which call the
  canonical evaluators unchanged) on a freshly loaded server baseline. Tests assert deep equality with the evaluator
  and with a Scenario Lab run for the same inputs. No evaluator, engine or policy file changed.
- **Inputs:** the browser sends only form text (strict keys; no household ID). Money is parsed to exact cents on the
  server. Blank optional costs stay unknown (null) so the evaluator returns "more information needed". Blank credits
  and earnest money mean none (the conservative reading: more cash needed). Repairs and down payment must be entered
  (0 allowed). Refused before evaluation: down payment above price; vehicle cash down above price + known taxes/fees;
  trade-in value without the loan payoff; a goal not in the server household.
- **P09 double counting:** "current housing payment that ends" may not exceed the housing the plan already counts
  (housing-category expense monthly equivalents + mortgage minimums), so the purchase never removes costs the plan never
  counted. Vehicle ongoing costs are entered as the change from today.
- **Guided scope:** home sale proceeds and the windfall adapter stay in Scenario Lab (advanced). Two options max, same
  purchase type. Each option runs independently on the same baseline.
- **Rules of thumb** (`lib/purchase-check/guidance.ts`), all comparisons in whole cents; exactly at the threshold
  counts as within:
  - 28%: P&I + taxes + insurance + HOA + mortgage insurance (the evaluator's figures; maintenance/utilities excluded,
    as in Fannie Mae's housing-expense definition) ÷ gross monthly income. 36%: that + recorded minimum debt payments.
    ARM: starting payment, with the lifetime-cap payment shown as a note. An existing mortgage is included with a note
    when the purchase may replace it (we don't guess it is paid off).
  - 20/3/8: down = cash down + trade-in equity vs 20% of price (paid in full = within; term not applicable); term ≤ 36
    months; all vehicle loan payments (new + recorded `auto` debts) ≤ 8% of gross monthly income. If a trade-in payoff
    exists and auto loans are recorded, which loan closes is unknown → Insufficient information.
  - Vehicle value: price + user-entered value of other vehicles kept ≤ 50% of gross yearly income; never guessed.
  - Emergency savings: only `protected_reserve` cash ÷ post-purchase (essential expenses + minimum debt payments),
    against max(3, the plan's effective emergency months). Protected cash needed for the purchase = outside guideline.
  - Gross income incomplete (any active source without gross) → every income ratio is Insufficient information.
- **Sources rechecked 2026-11-19:** Fannie Mae glossary (28/36 "guideline", gross income; Selling Guide allows DTI
  above 36%), Money Guy 20/3/8 (20% down, ≤ 36 months, all car payments ≤ 8% of gross), Ramsey (total value of
  vehicles ≤ half of annual income), CFPB (3–6 months of expenses). The cloud environment's network blocks these
  hosts, so they were checked through web search of the publishers' own pages, not a direct page fetch.
- **Navigation:** What if? replaces the Scenario Lab tab (desktop and phone); Scenario Lab is under Tools on What if?
  and stays detailed-only; `/what-if` is in Simple view's menu. QA rows Q46–Q57.
- **Pre-existing canonical wording (LOW, backlog, not changed in P10):** when the purchase needs protected cash (or
  data is missing), the evaluators run no post-purchase engine but still emit "cannot preserve employer match / Secure
  funding / required goal" risks, because `planImpact` booleans default to false. The verdict is unaffected. P10 shows
  those risks verbatim and explains that the post-purchase plan was not modeled. Suggested fix (a later approved
  phase): emit those risks only when a post-purchase engine exists. Builder-found in P10 local visual check.
- Local visual check (2026-11-19): synthetic example household at 390/820/1280 px, light and dark; no horizontal
  overflow. Found and fixed: vehicle loans are stored as `auto_loan` (not `auto`); unlabeled partial figures when
  costs are unknown (now flagged); "blank means none" placeholders.

## 2026-11-19 — FFH-P10 Preview QA PASS; frozen for audit

- Ryan moved the fixed Preview domain to `phase/ffh-p10-can-we-afford-it`. At `c8734bd` (#190 merge): CI `fast`,
  `rls-matrix`, `e2e-isolation` PASS 58/58; Preview smoke 12/12; signed-out `/what-if*` redirect to Sign in.
- Browser QA (Work mode) Q46–Q57 **PASS**, no `qa-finding` issues; `ZZ-A-Temp` deleted, finished signed out. Phone-width
  parts of Q46 and Q57 are Ryan's device checks (NOT RUN in the Cloud Browser).
- Whole-phase `/code-review high` before freezing: 6 findings (1 important: an unhandled action rejection could crash
  the page; 5 nits), all fixed in #190 before the merge.

## 2026-11-19 — FFH-P10 independent audit FAIL at 865783a; all findings fixed

- Different-model audit: `REVIEW RESULT: FAIL — 865783a`: P10-01 HIGH (pre-selected "payment ends"), P10-02 HIGH
  (blank maintenance could still give a positive verdict), P10-03 MEDIUM (mortgage insurance defaulted to None), P10-04
  MEDIUM (36% counted a mortgage that may be replaced), P10-05 MEDIUM (reserve breach asserted when protected cash was
  needed). Canonical evaluators, isolation and read-only boundaries verified intact. All five fixed in the P10 input
  contract / advisory layer (no evaluator change). Receipt: `docs/workflow/FFH-P10_AUDIT.md`.
- Standing rule from P10-01/03: the guided form pre-answers no question (every choice starts at "Choose…").

## 2026-11-19 — FFH-P10 released to Production and closed

- Ryan authorized "Release FFH-P10 at eca9d43bb20a642d16b31013005510b609900014"; PR #189 merged as
  `cc7c70724df7bc3b8e5729cbec1fcd96cf6ef57e` after exact-head CI green (run 44458649330: fast, rls-matrix,
  e2e-isolation). Production served `cc7c707` within a minute; Production smoke **12/12**; signed-out `/what-if`,
  `/what-if/purchase?type=home|vehicle`, `/bills`, `/plan`, `/account` redirect to sign-in. FFH-P10 is **CLOSED**.
- Re-review PASS at `eca9d43` (P10-01–05 resolved); QA Q46–Q57 PASS (Q48–Q50 re-run at `eca9d43`); Owner device checks
  Q46/Q57 PASS. No hosted Supabase or environment-variable change.

### Lessons learned (issue #188 — first run)

Evidence reviewed: CI runs on the phase (one `e2e-isolation` BLOCKED, otherwise green), `/code-review high` (6 findings),
the independent audit (FAIL, 2 HIGH + 3 MEDIUM → PASS), Browser QA (no findings), Owner steps (Preview move, audit and
re-check pastes, QA runs, device checks, release), environment limits (publisher sites blocked by the network policy).

1. **Guided-input contract check before freezing — proposed ADOPT (needs Ryan's approval; not applied).**
   - *Evidence:* audit `FAIL — 865783a`: P10-01 (form pre-selected "payment ends") and P10-02 (blank maintenance gave a
     positive verdict) were HIGH. Neither was caught by 1039 calculation tests, the pre-freeze `/code-review high`
     (6 other findings) or Browser QA (Q48 followed the pre-filled answers).
   - *Root cause (shown):* every P10 test compared P10 with the evaluator **for the same inputs**, so none could catch
     inputs the user never gave. Nothing in the pre-freeze step asked which answers the form supplies by default or
     which evaluator inputs are flagged missing only conditionally (`monthlyMaintenancePlanningAmount`).
   - *Smallest fix:* one line in `docs/WORKFLOW.md` phase step 4: for a phase with a financial input form, before
     freezing, add a test that no choice is pre-answered and that every evaluator input left blank is refused or yields
     "more information needed" (checked against the evaluator's own missing-data rules).
   - *Benefit:* avoids this phase's extra cycle (fix PR #192, a second CI round, targeted re-review, Q48–Q50 re-run and
     two extra Owner pastes). *Cost/risk:* one test per form; no new tooling or permissions.
   - *Measure next phase:* the independent audit raises no implicit-default or unknown-treated-as-known finding.
2. Considered and **REJECTED** (not actionable): the `e2e-isolation` BLOCKED run on `304d606` (the carry-forward push
   preceded the same-day Preview move; one comment, green on every P10 code commit); the blocked publisher hosts (a
   one-off citation check, done via the publishers' own pages in search results).

Prior (P09) improvements, checked against P10 evidence:
- Day-one phase PR (#189) held QA, audit, device and release evidence; no release-prep docs PR — **helped**.
- Same-day Preview move: done before the first P10 code merge; `e2e-isolation` 58/58 on every P10 code commit —
  **helped**.
- `/code-review high` before freezing: caught 1 important + 5 nits before the audit — **helped**, but missed the input-
  contract HIGHs (item 1).
- Event-driven CI notifications: no polling needed — **helped**.
- Owner device checks: Q46/Q57 phone parts PASS on Ryan's phone, NOT RUN in the Cloud Browser as designed — **helped**.
- Local DB harness: PASS at phase start; P10 had no schema change, so no measurable benefit this phase — keep.
- One-paste hosted migration generator: **not exercised** (no migration in P10); its hosted effectiveness remains
  unproven until a real authorized hosted migration uses it.

## 2026-11-19 — Ryan approved the FFH-P10 lessons-learned improvement (implement in P11)

Ryan approved item 1 of the P10 lessons learned. Implement it during the next authorized phase (FFH-P11) in that phase's
normal development branch: no separate documentation PR, no Production change, and do not start P11 until it is
separately authorized. Keep the `docs/WORKFLOW.md` change minimal (one line in phase step 4). Contract for every guided
financial form:
1. Financial questions have no preselected answers that imply information the user hasn't supplied.
2. Missing required financial amounts never silently become $0 or produce an unsupported positive conclusion.
3. Missing required information triggers validation or a "More information needed" outcome.
4. Explicitly entered $0 and legitimate optional inputs keep working where supported.
5. Each new guided financial form gets focused tests for the above.
Measure: the P11 independent audit raises no implicit-default or unknown-treated-as-known finding.
