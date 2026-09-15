# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Work Helper / Super Troubleshooter acting within Core Financial Engine scope
Worker status: BLOCKED
Task state retained: ACTIVE
Approved integration base: `phase-5-money-priority-engine` at `ecb05a6795c047365817164409739a2d0bdc7f76`
Branch: `ffh/ffh-017-goal-retirement-competition`
Pull request: #26 — open, unmerged
PRODUCTION_SHA: No rescue production change; authoritative FFH-017 production remains the implementation already on PR #26
VALIDATED_CI: BLOCKED — run `34992242373`, job attempts `104459541271` and `104459794425` failed before checkout with no steps/logs
HANDOFF_SHA: This documentation commit; exact SHA reported after creation
MANAGER_VERDICT: PENDING
AUDIT_STATUS: NOT_READY

## Outcome

The FFH-017 implementation and its focused policy/reconciliation coverage are locally green. The rescue corrected 15 stale/incomplete integration-test failures and removed temporary diagnostic workflow scope. No production financial behavior was changed.

## Failure evidence

Foundation CI run `34989685355`, job `104450794218`, at PR head `d70cef6849e6940cb44b79f702765d178cead694` exposed:
- committed expenses: 3 failures;
- Existing Cash: 2 failures;
- legacy goal ranking: 7 failures;
- Recommendation Refresh: 2 failures;
- retirement integration: 1 failure.

The previously reported Build error at `money-priority-build.ts:344` was not reproducible from the authoritative head. That line is a goal-name field at this SHA. Both TypeScript and a clean-cache Next build pass locally.

## Contract preservation

- OUTRANKS, CO_PRIORITY, BELOW, and MORE_INFORMATION_NEEDED remain distinct.
- BELOW goals remain after additional retirement; they were not deleted, cast, or widened away.
- Protected retirement floor remains outside recurring competition.
- Missing material shared-competition facts remain fail-closed.
- Equal-fulfillment and exact-cent routing code is unchanged.
- FFH-013 M01 and full IRA/HSA/SIMPLE/workplace suites pass inside the 866-test calculation run.
- Existing Cash, Secure, Build, Recommendation Refresh, Your Plan, affordability, and Windfall regressions pass.
- No schema, UI, migration, live Supabase, or policy change occurred.

## Changed rescue scope

- `lib/calculations/legacy-goal-test-fixtures.ts`
- `lib/calculations/money-priority-committed-expenses.test.ts`
- `lib/calculations/money-priority-existing-cash-full.test.ts`
- `lib/calculations/money-priority-goal-ranking.test.ts`
- `lib/calculations/money-priority-recommendation-refresh-adversarial.test.ts`
- `lib/calculations/money-priority-retirement-integration.test.ts`
- `.github/workflows/ci.yml` restored to the milestone Foundation CI
- `.github/workflows/ffh017-diagnostic-matrix.yml` removed
- unrelated FFH-013 lifecycle delta removed
- this worklog and handoff

## Validation

- `npm test` — PASS, 866/866.
- `npm run test:security` — PASS, 21/21.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS, zero errors; one unrelated existing warning.
- `npm run build` — PASS after isolating a corrupt local Turbopack cache.
- `npm run ai:validate-state` — PASS; only registered legacy task-file warnings.

## Remaining action

Exact-head Foundation CI must become runnable and pass before READY_FOR_MANAGER. Run `34992242373` failed twice before checkout without steps or logs, while all equivalent local gates pass. Manager retains acceptance, integration, audit routing, and closure.
