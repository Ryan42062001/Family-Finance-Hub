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

1. **Plan.** Ryan states the goal. The Builder writes a short scope in `.ai/CURRENT_PHASE.md` (one branch and one
   draft PR per phase).
2. **Build.** The Builder works in small commits. Every push runs CI. Green PRs merge into the phase branch.
3. **Preview QA, in parallel.** After a merge, the Preview is deployed and Work mode runs the QA checklist while the
   Builder moves on to the next item. The Builder picks up `qa-finding` issues and fixes them. Ryan only does the
   steps that need his accounts or approval (hosted checks, Production, secrets) and his own look-and-feel review.
4. **Phase review.** When CI is green and the preview is accepted, the independent reviewer audits the changed scope at
   the exact PR head (prompt: `docs/workflow/REVIEW_PROMPT.md`): security and household isolation, money calculations, data handling, regressions.
   - **BLOCKER / CRITICAL / HIGH:** fix before merge, rerun CI, and have the reviewer re-check just that fix.
   - **MEDIUM / LOW / NIT:** record in the final-audit backlog (`.ai/DECISIONS.md` or the phase PR) with severity,
     file and suggested fix, then continue.
5. **Merge = release.** Day-to-day work merges into the phase branch by the Builder once CI is green. Vercel deploys
   every push to `main` to Production automatically (Owner decision, 2026-11-12, "Option 2"), so merging a phase into
   `main` **is** a production deployment and needs explicit Ryan merge authorization for the reviewed head, given as a
   release decision. Before asking, the Builder runs the release checklist below.
6. **Private Beta / wider release.** Before inviting anyone outside the household, one comprehensive independent
   whole-product audit runs on a frozen candidate, findings are fixed and re-checked, and Ryan separately authorizes it.

## Release checklist (every merge into `main`)

Before the merge:
- Every environment has the variables the build needs: `NEXT_PUBLIC_SITE_URL` (Production = the live site's exact
  origin; each phase Preview = that branch's Preview URL, branch-scoped), `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Missing `NEXT_PUBLIC_SITE_URL` makes auth fail closed with
  "Authentication origin is not configured".
- Hosted Supabase parity still matches if migrations changed (`scripts/rls-local/parity.sql`).

Right after the merge, once Vercel reports the Production deployment Ready:
- `node scripts/smoke/deployed-auth-smoke.mjs https://family-finance-hub-taupe.vercel.app` must be 12/12. If not,
  fix the cause or use Vercel Instant Rollback, and record the incident in `.ai/DECISIONS.md`.

## Continuous checks (`.github/workflows/ci.yml`)

- **`fast`** (every push): validator, calculation tests, security tests, typecheck, lint, production build and
  `npm audit --audit-level=high` (`npm run verify` plus audit).
- **`rls-matrix`** (every push): builds a disposable local Supabase database on the CI runner, applies all migrations,
  runs `scripts/rls-local/preflight.sql` and the 913-assertion two-household `scripts/rls-local/matrix.sql`, requires
  rollback and zero residue, and tears the database down. Synthetic data only; never connects to hosted Supabase.
- **`full-phase`** (label `full-phase-ci` or manual dispatch): the same checks pinned to an exact candidate SHA.

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
