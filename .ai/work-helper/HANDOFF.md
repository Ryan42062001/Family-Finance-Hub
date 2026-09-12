# Work Helper / Super Troubleshooter Handoff

Task: FFH-025 — HSA Compound Authority Materiality Remediation
Status: READY_FOR_MANAGER_VERIFICATION
Execution path: STANDARD_CHAT repository-tools fallback
Starting milestone checkpoint: `phase-5-money-priority-engine` at `2885838a9aaa05e35df45fd08dd69fe557d909e3`
Audited FFH-012 integration: `1487b192491a704ca3500b42d22a50289ee1551b`
Branch: `ffh/ffh-025-hsa-compound-authority-materiality`
PR: #15
PRODUCTION_SHA: `cd092685f75b49b3bd94c48ee96d63d4df01f241`
VALIDATED_CI_SHA: `1047f58de0ce8bf37cdd51cd066441b6d3cb28ab`

## Outcome
Closed the remaining HIGH FFH-012 compound legal-spouse-authority materiality defect without changing policy authority or broad HSA semantics.

The prior predicate recognized unresolved authority as material mainly when family coverage was already known. That missed asymmetric cases such as A eligible/self-only + B eligible/coverage unknown, where B could still resolve to family coverage and legal-spouse status could reduce A's supported ordinary HSA allocation from `$4,400` to `$4,375` under the accepted default equal family allocation.

The production correction now treats unresolved spouse authority as material for a month only when:
1. both parties could still be HSA-eligible; and
2. family coverage is known or still possible for either party.

This blocks the affected HSA pair conservatively while preserving locality for fully known all-self-only and known-ineligible cases.

## Test-first reproduction
Test-only checkpoint: `c9155d85985baabe9868ccb821759cc37b0317b2`
Foundation CI: run `34642782520`, job `103406283318`

Representative pre-fix result for A:
- `state = available`
- `annualLimit = 4400`
- `contributedYtd = 0`
- `remainingAnnualRoom = 4400`

Expected result:
- `state = more_information_needed`
- `annualLimit = null`
- `remainingAnnualRoom = null`
- missing-data reason includes legal-spouse authority.

Six new regressions failed before the production edit:
- missing authority + B eligible/coverage unknown;
- explicit unknown authority + B eligible/coverage unknown;
- B eligibility unknown + family;
- B eligibility unknown + family-possible coverage;
- input-order invariance;
- unrelated IRA/workplace locality because the HSA item was still incorrectly actionable.

## Production / regression changes
Changed production:
- `lib/calculations/money-priority-hsa-legal-capacity.ts`

Added regression suite:
- `lib/calculations/ffh-025-hsa-compound-authority-materiality.test.ts`

Regression coverage includes missing and explicit unknown authority, eligible/coverage-unknown, eligibility-unknown family/family-possible, all-self-only locality, confirmed non-spouse independence, confirmed legal-spouse family sharing, person/account/month order invariance, and unrelated IRA/workplace usability.

Existing accepted FFH-012 tests keep the prior remediations green:
- `$5,104.17` odd-cent shared ordinary allocation conserves every cent;
- `$8,750` annual shared room reconciles to `$729.16` monthly in Build with no synthetic leftover route.

## Exact-head validation
A temporary diagnostic workflow split was committed only to obtain independent exact-head results after the canonical fail-fast security gate masked later commands. Foundation CI run `34644012014` explicitly checked out branch head `1047f58de0ce8bf37cdd51cd066441b6d3cb28ab`.

Results:
- production dependency audit — PASS
- focused FFH-025 regressions — PASS
- focused FFH-012 HSA regressions — PASS
- focused retirement/Build/integration regressions — PASS
- full `npm test` — PASS
- `npm run lint` — PASS
- `npm run test:security` — FAIL only on inherited FFH-011 SIMPLE persisted-field textual assertion
- `npm run typecheck` — FAIL only on five inherited test-only TypeScript errors
- `npm run build` — application compilation succeeds, then Next TypeScript validation stops on the same inherited debt-priority test typing error

The temporary diagnostic `.github/workflows/ci.yml` was restored byte-for-byte to the milestone canonical workflow before handoff. It must not appear in the final PR diff.

## Inherited failures, exact ownership
Security — FFH-011 debt, not FFH-025:
- `loader and normalized snapshot carry the canonical SIMPLE limit category`
- stale regex expects `simplePlanLimitCategory: nullableString(row.simple_plan_limit_category)` even though the accepted loader now parses `rawSimplePlanLimitCategory` into the canonical enum and returns shorthand `simplePlanLimitCategory`.

TypeScript — unrelated test-only debt, not FFH-025:
- `lib/calculations/money-priority-debt-priority.test.ts(90,54)` TS18048: `'a' is possibly 'undefined'`.
- `lib/calculations/money-priority-debt-priority.test.ts(91,55)` TS18048: `'b' is possibly 'undefined'`.
- `lib/calculations/money-priority-retirement-accounts.test.ts(119,5)` TS2322: `Type '401k' is not assignable to type 'traditional_ira'`.
- `lib/calculations/money-priority-retirement-accounts.test.ts(235,5)` same TS2322.
- `lib/calculations/money-priority-retirement-accounts.test.ts(273,5)` same TS2322.

No FFH-025 production or regression file is named by the remaining failing gates.

## Policy and scope preservation
Preserved FFH-D005 + accepted FFH-022 semantics:
- authority remains canonical pair + HSA-tax-year tri-state;
- relationship, filing status, allocation rows, and prior-year records do not create marriage authority;
- affirmative spouses use married-family sharing;
- confirmed non-spouses remain independent;
- unknown/missing authority blocks only where supported spouse/non-spouse resolutions can change the HSA result;
- unrelated retirement routes remain usable.

No migration, live Supabase write, policy rewrite, broad engine redesign, FFH-011 repair, or generic TypeScript cleanup was performed.

## Milestone movement after task start
The milestone advanced four later control-plane/documentation commits after FFH-025 started. At handoff inspection its head was `2459ad1c75df98c9c53acfa572ed9a36cef8aba0`; the intervening changes touched only `.ai/tasks/FFH-026.md`, `.ai/tasks/TASK_INDEX.md`, `README.md`, and `docs/PRODUCT_ROADMAP.md`. They do not overlap FFH-025 implementation/tests or alter the validated HSA behavior.

PR #15 should be retargeted from diagnostic `main` to the current `phase-5-money-priority-engine` base and remain unmerged for Manager verification.

## Next action
Manager independently verifies PR #15, the final diff, branch/base state, PRODUCTION_SHA, exact-head CI evidence, and inherited-failure classification. If accepted, Manager owns integration. Both independent Auditor/QA roles must then re-audit the new exact integration checkpoint before FFH-012 can close.

Work Helper does not merge, self-accept, or close the parent audit finding.
