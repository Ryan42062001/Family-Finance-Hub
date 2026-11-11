# Family Finance Hub workflow

Adopted by the Product Owner (Ryan) on 2026-11-11. It replaces Speed Workflow V2.1 and the 2026-11-07 progress-first
amendment. The old per-step approval process and Workflow V3/V3.1 material are historical evidence only (`.history/`
and git history), never active authority.

## Roles

- **Product Owner — Ryan.** Decides what to build. Gives explicit Ryan merge authorization for every merge and,
  separately, approves any production deployment, hosted configuration change, real-data operation or spending.
- **Builder — one AI coding agent working directly in the repository** (Claude Code by default). It plans, writes
  code and tests, runs checks, pushes its own branch, reads CI and opens draft PRs. It holds context in the repo,
  not in chat.
- **Independent reviewer — a different AI session than the Builder** (for example ChatGPT, or a fresh Claude
  session). Reviews the finished phase diff once. It is never the Builder reviewing its own work.

Chat is for deciding *what* and reviewing *results*. Build steps are not relayed between chats.

## Approval levels

| Action | Approval |
|---|---|
| Edit code, tests and docs; push the Builder's own branch; open or update a draft PR | None |
| Run CI, including the disposable local-database RLS matrix with synthetic data | None |
| Merge the Builder's own PR into a phase branch (`phase/...`) once CI is green (`fast` and `rls-matrix`) | None (standing Owner permission, 2026-11-11) |
| Merge anything into `main` | Ryan, explicitly |
| Hosted Supabase or Vercel changes, production deployment, auth/email configuration, Private Beta | Ryan, explicitly, per change |
| Anything touching real household or financial data, secrets, paid resources or destructive hosted operations | Ryan, explicitly, per change |

There are no one-time "GO" tokens. A failed disposable run is simply fixed and rerun.

## Phase loop

1. **Plan.** Ryan states the goal. The Builder writes a short scope in `.ai/CURRENT_PHASE.md` (one branch and one
   draft PR per phase).
2. **Build.** The Builder works in small commits. Every push runs CI.
3. **Preview.** Ryan checks the Vercel Preview with synthetic accounts and lists anything to fix.
4. **Phase review.** When CI is green and the preview is accepted, the independent reviewer audits the changed scope at
   the exact PR head (prompt: `docs/workflow/REVIEW_PROMPT.md`): security and household isolation, money calculations, data handling, regressions.
   - **BLOCKER / CRITICAL / HIGH:** fix before merge, rerun CI, and have the reviewer re-check just that fix.
   - **MEDIUM / LOW / NIT:** record in the final-audit backlog (`.ai/DECISIONS.md` or the phase PR) with severity,
     file and suggested fix, then continue.
5. **Merge.** Day-to-day work merges into the phase branch by the Builder once CI is green. Merging the phase into
   `main` needs explicit Ryan merge authorization for the reviewed head. Merging never authorizes deployment.
6. **Release.** Before a production release or Private Beta, one comprehensive independent whole-product audit runs on a
   frozen candidate, findings are fixed and re-checked, and Ryan separately authorizes the deployment.

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
