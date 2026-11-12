# Family Finance Hub agent guidance

Read `docs/WORKFLOW.md` (how work flows and what needs approval) and `.ai/CURRENT_PHASE.md` (what is being built now)
before starting. `.ai/DECISIONS.md` records standing decisions. Repository evidence outranks chat memory; `.history/` is
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

## Commands

- `npm run verify`: validator, tests, security tests, typecheck, lint, build
- `npm test`, `npm run test:security`, `npm run typecheck`, `npm run lint`, `npm run build`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
