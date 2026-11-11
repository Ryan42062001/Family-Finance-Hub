# Standing decisions

- Ryan explicitly authorizes every merge into `main`, and separately decides production deployment, hosted configuration
  changes, Private Beta, real-data operations and spending.
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
