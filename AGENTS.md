# Family Finance Hub agent guidance

Read `docs/WORKFLOW.md` (how work flows and what needs approval), `.ai/HANDOFF.md` (where the last builder stopped)
and `.ai/CURRENT_PHASE.md` (what is being built now) before starting. When Claude Code is out of credits, ChatGPT
builds instead: see `docs/workflow/TWO_MODE_WORKFLOW.md`. `.ai/DECISIONS.md` records standing decisions. Repository evidence outranks chat memory; `.history/` is
historical evidence only.

## Working rules

- Work on your own branch and a draft PR. Push freely; every push runs CI (`fast` and `rls-matrix`).
- Run `npm run verify` before pushing. Report exact pass/fail counts; never call a failing or unrun check passing.
- You may merge your own PRs into a phase branch (`phase/...`) once CI is green (standing Owner permission).
- A merge into `main` is a Production release (Vercel auto-deploys `main`). Ryan explicitly authorizes each one as a
  release decision, after the release checklist in `docs/WORKFLOW.md`; run the Production smoke test right after.
- Ryan also authorizes any other hosted Supabase/Vercel change, real-data operation or spending. Ask before any of those.
- Synthetic data only. No secrets or real household or financial data anywhere in the repo, CI or PRs.
- Auth, household isolation and money calculations fail closed. Do not invent financial policy.
- Schema/RLS changes are migrations in a reviewed PR. The RLS matrix (`scripts/rls-local/*.sql`, run by
  `scripts/rls-ci/run-matrix.sh` in CI) must stay green.
- Check open GitHub issues labeled `qa-finding` (browser QA by ChatGPT Work mode) and fix or triage them. Keep
  `docs/workflow/QA_CHECKLIST.md` current when screens change.
- At the end of a phase, an independent reviewer (a different AI session) audits the changed scope. Fix
  BLOCKER/CRITICAL/HIGH before merge; record MEDIUM/LOW/NIT in the final-audit backlog.
- After each release and smoke test, run the short evidence-based lessons-learned review (`docs/WORKFLOW.md`, phase
  loop step 6; issue #188): zero to three real improvements, or "no actionable process improvements identified".

## Builder efficiency (Ryan, 2026-11-18; each phase is a fresh chat, so these live here)

- **Environment:** start each Claude Code chat on the cloud environment **Family-Finance-Hub** (its setup script installs
  PostgreSQL and runs `npm ci`; created 2026-11-18). If `psql`/PostgreSQL is missing, the chat is on the wrong one.
- **CI:** after opening a PR, subscribe to its activity (`subscribe_pr_activity`) so CI results arrive as events; don't
  poll or sleep. Read only the failing job's last lines, not whole logs. Keep working on independent items meanwhile.
- **Database work locally first:** `scripts/rls-local/local-harness/run.sh all` (preflight, 1304+ matrix, coverage,
  P09 upgrade check and the one-paste hosted-apply rehearsal in seconds; needs `apt-get install -y postgresql`, which the environment setup script does). CI stays the source of
  truth; race tests and the real-provider suite run only in CI. Real `auth.*` table shapes:
  `docs/workflow/FFH-P08_SPIKE_RESULTS.md` (fixtures must set NOT NULL columns such as `mfa_factors.created_at`).
- **Never push without a passing `npm run verify`.** New migrations change `scripts/rls-local/parity.expected.txt`:
  compute it locally (`run.sh reset`, then `psql ... -F '|' -f scripts/rls-local/parity.sql`). Every section matches CI
  except `table_grants`, which the local auth stub can't reproduce: keep the committed `table_grants` row unless the
  migration changes table grants (then take that row from the first CI run's parity diff).
- **Hosted migrations are one paste** (`docs/WORKFLOW.md` → Release checklist): generate and commit
  `scripts/hosted/apply-<version>.sql` with `scripts/hosted/build-apply.mjs`, add any data checks to
  `scripts/hosted/checks/<version>.sql`, rehearse with `run.sh hosted-rehearsal`, then give Ryan the raw link.
- **Phase start:** open the phase PR (phase → `main`, draft) at once and ask Ryan to move the Preview domain the same
  day. **Before freezing:** run `/code-review high` on the whole phase diff. **Release:** evidence goes in the phase PR
  description, not a separate docs PR.
- **Smoke tests:** the environment allows the Production and Preview sites, so run
  `NODE_USE_ENV_PROXY=1 node scripts/smoke/deployed-auth-smoke.mjs <site>` yourself (Node's fetch needs that variable to
  use the proxy); only the merge into `main` needs Ryan.
- **Ask Ryan for pasted text** (SQL rows, PASS/FAIL lists, finding IDs) rather than screenshots, and ask only for what
  the next step needs. Never copy real emails, ids or amounts from his evidence into the repo.

## Commands

- `npm run verify`: validator, tests, security tests, typecheck, lint, build
- `npm test`, `npm run test:security`, `npm run typecheck`, `npm run lint`, `npm run build`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
