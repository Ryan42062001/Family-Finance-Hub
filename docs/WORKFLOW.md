# Family Finance Hub workflow

Adopted by the Product Owner (Ryan) on 2026-11-11. It replaces Speed Workflow V2.1 and the 2026-11-07 progress-first
amendment. The old per-step approval process and Workflow V3/V3.1 material are historical evidence only (`.history/`
and git history), never active authority.

## Roles

- **Product Owner — Ryan.** Decides what to build. Gives explicit Ryan merge authorization for every merge into `main`
  (each one is a Production release) and approves any other hosted configuration change, real-data operation or
  spending.
- **Builder — Claude Code by default; ChatGPT/Codex only as the fallback when Claude credits run out.** One AI
  coding agent working directly in the repository: it plans, writes code and tests, runs checks, pushes its own branch,
  reads CI, opens PRs, fixes findings and merges its own PRs into phase branches. It holds context in the repo, not in
  chat. Only one builder works on a branch at a time.
- **Browser QA — ChatGPT Work mode in the Cloud Browser.** After each merge into a phase branch it runs
  `docs/workflow/QA_CHECKLIST.md` on the Vercel Preview with the synthetic TestA/TestB accounts, and files problems as
  GitHub issues labeled `qa-finding` (template: QA finding). Prompt: `docs/workflow/WORK_MODE_PROMPT.md`. It never
  writes code, touches Supabase, Vercel settings or Production, or sees real data or secrets. It doesn't use @Chrome or
  @Computer, because those reach Ryan's signed-in accounts.
- **Independent reviewer — a different AI session than the Builder**, once per phase, on the exact PR head
  (`docs/workflow/REVIEW_PROMPT.md`):
  - routine phases (LOW/MEDIUM risk): a fresh Claude session that sees only the diff;
  - HIGH-risk phases (auth, household isolation, money calculations, schema/RLS) and the pre-release audit: a
    **different model**, normally ChatGPT.

Chat is for deciding *what* and reviewing *results*. Build steps are not relayed between chats.

**Per-phase Claude Code chat handoff (Ryan's instruction, 2026-11-17):** At the end of each
phase, after the release/closure result is confirmed, the Manager must clearly tell Ryan
**PHASE COMPLETE — START A FRESH CLAUDE CODE CHAT**. The next phase starts with a new
Claude Code Builder chat; continuity lives in `.ai/HANDOFF.md`, `.ai/DECISIONS.md`,
`.ai/CURRENT_PHASE.md`, the roadmap and review receipts, not the previous chat.
Carry phase close-out documentation forward to the next authorized phase release;
do not merge docs alone into `main` merely to update status, because that deploys Production.

**Standing efficiency rules (Ryan, 2026-11-18):**
1. Work autonomously within the approved phase: build, test, fix CI and merge green phase-branch work without
   routine Manager checkpoints.
2. Minimise PR overhead: bundle related changes and their documentation; no standalone documentation PRs unless
   genuinely necessary.
3. Don't idle during CI: continue independent work, but never merge before the required checks pass.
4. Batch Owner decisions with recommended options; interrupt Ryan only for essential decisions, blockers, hosted
   changes or Production authorization.
5. Coordinate targeted Browser QA on stable features plus a final exact-head QA, preserving isolation and
   regression coverage.
6. Keep documentation concise and current alongside development, with a clear final phase handoff.

## Approval levels

| Action | Approval |
|---|---|
| Edit code, tests and docs; push the Builder's own branch; open or update a draft PR | None |
| Run CI, including the disposable local-database RLS matrix with synthetic data | None |
| Merge the Builder's own PR into a phase branch (`phase/...`) once CI is green (`fast` and `rls-matrix`) | None (standing Owner permission, 2026-11-11) |
| Merge anything into `main`, which **is a Production release** (Vercel deploys `main` automatically) | Ryan, explicitly, as a release decision |
| Hosted Supabase or Vercel changes, production deployment, auth/email configuration, Private Beta | Ryan, explicitly, per change |
| Anything touching real household or financial data, secrets, paid resources or destructive hosted operations | Ryan, explicitly, per change |

There are no one-time "GO" tokens. A failed disposable run is simply fixed and rerun.

## Phase loop

1. **Plan and set up (same day; workflow update after FFH-P09).** Ryan states the goal. The Builder writes a short
   scope in `.ai/CURRENT_PHASE.md`, creates the `phase/...` branch and opens the **phase PR** (phase branch → `main`,
   draft, "do not merge without release authorization"). That one PR collects the QA result tables, the audit receipt
   and the release evidence, and becomes the release PR. The same day, Ryan moves the Preview domain to the phase
   branch (see Preview setup) so every phase commit is QA'd and isolation-tested automatically from the first merge.
2. **Build (build-first, Ryan 2026-11-18).** No pre-build independent design or threat-model review is required. The
   Builder builds the whole approved phase in one chat: code, disposable spikes, tests and docs updated alongside the
   code (no standalone documentation PRs). Every push runs CI; green PRs merge into the phase branch without waiting
   for Manager approval. A serious vulnerability found during the build stops the affected work until it is fixed.
3. **Preview QA, in parallel.** After a merge, the Preview is deployed and Work mode runs the QA checklist while the
   Builder moves on to the next item. The Builder picks up `qa-finding` issues and fixes them. Ryan only does the
   steps that need his accounts or approval (hosted checks, Production, secrets) and his own look-and-feel review.
4. **Phase review — one audit at the end.** First the Builder runs `/code-review high` on the whole phase diff
   (`git diff <production SHA>...<phase head>`) and fixes what it confirms; this cheap pass catches what the audit
   would otherwise send back. For a guided financial input form it also adds tests that no answer is pre-selected and that a blank
   required amount is refused or gives "More information needed", never $0 (typed 0 still works). When the full phase is built, CI is green and the preview is accepted, the
   Builder freezes an exact candidate SHA and one fresh independent reviewer audits the changed scope there (prompt: `docs/workflow/REVIEW_PROMPT.md`): security and household isolation, money calculations, data handling, regressions.
   - **BLOCKER / CRITICAL / HIGH:** fix before merge, rerun CI, and have the reviewer re-check just that fix.
   - **MEDIUM / LOW / NIT:** record in the final-audit backlog (`.ai/DECISIONS.md` or the phase PR) with severity,
     file and suggested fix, then continue.
5. **Merge = release.** Day-to-day work merges into the phase branch by the Builder once CI is green. Vercel deploys
   every push to `main` to Production automatically (Owner decision, 2026-11-12, "Option 2"), so merging a phase into
   `main` **is** a production deployment and needs explicit Ryan merge authorization for the reviewed head, given as a
   release decision. Before asking, the Builder runs the release checklist below and writes the release evidence in
   the phase PR description (no separate release-prep documentation PR: it costs a CI cycle and changes the SHA). The
   phase state in `.ai/CURRENT_PHASE.md` stays as it is until the close-out records CLOSED.
6. **Lessons learned (Ryan, issue #188).** After the Production release and smoke test, before announcing
   **PHASE COMPLETE**, the Builder reviews the phase's real evidence: CI and test failures, bottlenecks, QA and audit
   findings, Owner manual steps, environment/tool limits, and whether the previous phase's improvements actually
   helped (retire any that added friction). It proposes **zero to three** improvements; zero is a good outcome. Each
   one gives the evidence (PR/issue/run), the demonstrated root cause, the smallest fix, the benefit, the cost/risk,
   how the next phase will measure it, and ADOPT / DEFER / REJECT. Never invent a lesson, repeat a fixed one or add
   overhead for its own sake; if nothing qualifies, write "Lessons learned: no actionable process improvements
   identified; workflow unchanged." Record it in the phase close-out and `.ai/HANDOFF.md` (no separate report or
   issue). Anything needing new permissions, hosted access, financial-policy or security changes, or a material
   workflow change waits for Ryan.
7. **Private Beta / wider release.** Before inviting anyone outside the household, one comprehensive independent
   whole-product audit runs on a frozen candidate, findings are fixed and re-checked, and Ryan separately authorizes it.

## Release checklist (every merge into `main`)

Before the merge:
- Every environment has the variables the build needs: `NEXT_PUBLIC_SITE_URL` (Production = the live site's exact
  origin; each phase Preview = that branch's Preview URL, branch-scoped), `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Missing `NEXT_PUBLIC_SITE_URL` makes auth fail closed with
  "Authentication origin is not configured".
- Hosted Supabase parity still matches if migrations changed. Each new migration is applied with ONE paste: the
  Builder generates `scripts/hosted/apply-<version>.sql` with `node scripts/hosted/build-apply.mjs <migration> --out
  scripts/hosted/apply-<version>.sql` (optional phase checks in `scripts/hosted/checks/<version>.sql`), commits it,
  and gives Ryan its raw link at that commit. The file pre-checks, applies, records, repairs paste-introduced CRLF
  (`scripts/rls-local/strip-cr.sql`), runs the phase checks and compares parity in one transaction; any failure
  applies nothing and names what failed. Ryan pastes back the PASS table. CI rehearses the newest migration's file
  on every push (`scripts/rls-ci/hosted-rehearsal.sh`, CRLF paste plus a must-fail control).

Right after the merge, once Vercel reports the Production deployment Ready:
- `node scripts/smoke/deployed-auth-smoke.mjs https://family-finance-hub-taupe.vercel.app` must be 12/12. If not,
  fix the cause or use Vercel Instant Rollback, and record the incident in `.ai/DECISIONS.md`.

## Preview setup (one fixed address)

Vercel's automatic branch address for a long phase name does not resolve on this project, so every phase uses one
fixed Preview address: `https://family-finance-hub-preview.vercel.app`.
- Vercel → Settings → Domains: that domain is connected to the **Preview** environment and the **current phase
  branch**. On the day each phase branch is created, Ryan edits it to the new `phase/...` branch (before the first
  merge into it, so `e2e-isolation` isn't BLOCKED by an old build).
- Environment variable `NEXT_PUBLIC_SITE_URL` = that address (Config, Preview, all branches). Supabase Redirect URLs
  include `https://family-finance-hub-preview.vercel.app/**`.
- The Vercel Toolbar must stay **Off** (Project Settings → General → Vercel Toolbar). It loads from `vercel.live`,
  which the automated isolation check blocks and reports as REFUSED.
- Vercel Deployment Protection must not put a Vercel login in front of the Preview, or Work mode and the smoke test
  are blocked (the smoke test reports `BLOCKED`, not a pass).
- After switching the domain or changing variables, redeploy the phase branch, then run
  `node scripts/smoke/deployed-auth-smoke.mjs https://family-finance-hub-preview.vercel.app` (12/12).

## Continuous checks (`.github/workflows/ci.yml`)

- **`fast`** (every push): validator, calculation tests, security tests, typecheck, lint, production build and
  the audit gate `scripts/audit-gate.mjs` (`npm run verify` plus audit). The gate fails on any HIGH/CRITICAL
  advisory like `npm audit --audit-level=high`, except one listed in `scripts/audit-exceptions.json` that is HIGH (not
  critical), dev-only (absent from `npm audit --omit=dev`) and before its review date (Ryan, 2026-11-18). Each new
  exception needs Ryan's approval.
- **`rls-matrix`** (every push): builds a disposable local Supabase database on the CI runner, applies all migrations,
  runs `scripts/rls-local/preflight.sql` and the 1306-assertion two-household `scripts/rls-local/matrix.sql`, requires
  rollback and zero residue, and tears the database down. Synthetic data only; never connects to hosted Supabase.
- **`full-phase`** (label `full-phase-ci` or manual dispatch): the same checks pinned to an exact candidate SHA.

- **`E2E isolation (Preview)`** (job `e2e-isolation` in `ci.yml`, every push to a `phase/...` branch; re-run it from the
  Actions tab): waits until Vercel's commit status for that exact commit reports a successful Preview build, then signs in to the fixed Preview
  address as TestA and as TestB with real browsers (`scripts/e2e/isolation.mjs`). For each account it checks the
  "Signed in as" email, the household name, that Your plan, Overview, Financial profile, Goals, Planning, Scenario Lab, Account, Bills, the plan print view, What if? and the purchase check
  load and show nothing of the other household (its email, household name or `ZZ-` records), that the money plan
  renders, and that sign-out returns to Sign in, clears the session cookie and protects pages again. A negative
  control then confirms that a wrong expected identity is rejected. It only reads; it adds or changes no data.
  - Credentials come only from the Actions secrets `FFH_E2E_A_EMAIL`, `FFH_E2E_A_PASSWORD`, `FFH_E2E_B_EMAIL` and
    `FFH_E2E_B_PASSWORD`. They are never printed, and no screenshots, traces or videos are recorded.
  - Missing secrets report `BLOCKED` (exit 3) and the job fails; it never reports a pass without testing.
  - Production and every host except `https://family-finance-hub-preview.vercel.app` are refused (exit 2). While it
    runs, every request the browser makes is checked: any request, redirect or WebSocket to another address is
    blocked and the run reports REFUSED (exit 2) in a fixed sentence. The output never contains anything the site
    can choose (host names, URLs, paths, page text, build details, error text, status codes or counts), only
    PASS/FAIL per named check. **If a Preview run is ever REFUSED, rotate the TestA/TestB passwords** and update the
    four GitHub secrets. The browser also runs behind a dead proxy
    that only the Preview bypasses, with service workers off and WebRTC disabled (trapped in every frame and limited
    to the dead proxy), so credentials can only ever reach the Preview.
  - Before signing in, the suite reads `/api/build-info` and requires that the Preview address serves this exact
    commit as a Preview build, and checks again after each account. If the fixed Preview domain points at another
    branch or an older build, or a newer build takes over during the run, it reports BLOCKED (exit 3). Point the domain at the current phase branch (see Preview setup).
  - Local rehearsal only: with `FFH_E2E_ALLOW_LOCALHOST=1` the script also accepts an `http://localhost` origin backed
    by a synthetic mock; this is refused whenever `CI` or `GITHUB_ACTIONS` is set.

CI evidence belongs to the exact commit it ran on. A failing or unrun check is reported as failing or unrun, never as
passing.

## Non-negotiable boundaries

- No real household or financial data in the repository, tests, logs, previews or shared evidence. Synthetic only.
- Authentication, household isolation and money calculations fail closed. Cross-household access is never acceptable.
- No invented financial policy; money routing and reconciliation stay exact.
- No secrets in the repository or CI output.
- Supabase schema/RLS changes go through migrations in a reviewed PR; nothing is applied to hosted Supabase without
  Ryan's explicit approval.
- Known exploitable security issues, data-loss risks or live incidents are fixed or isolated immediately, not
  deferred to a backlog.
- Do not weaken CI, the validator or branch protection to get a green result.
