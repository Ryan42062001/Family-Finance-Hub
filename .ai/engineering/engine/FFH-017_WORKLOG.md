# FFH-017 — Core Engine Worklog

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
State: READY_FOR_MANAGER
Branch: `ffh/ffh-017-audit-remediation`
PR: #28 — draft / open / unmerged
Approved base: `phase-5-money-priority-engine`
Historical failed frozen target: `9d3a880e02365b4445b8070344c72c928ca34511`
Remediation production checkpoint: `0a421f00e42ee1699d51dea7abdb37118bed631f`

## Fresh-state verification

A fresh repository/GitHub refresh verified the current Manager/task routing from `.ai/tasks/FFH-017.md` and `.ai/tasks/TASK_INDEX.md`. Older `.ai/manager/ACTIVE_ASSIGNMENTS.md`, `.ai/shared/PROJECT_STATE.md`, and the pre-remediation Core handoff are stale for FFH-017 and are not used as current routing authority.

The historical frozen target `9d3a880e...` remains immutable failed-audit evidence. The accepted remediation scope is only:

- R01 = `TMA-017-01` + `FFH-017-P01` targeted missing-fact locality;
- R02 = `TMA-017-02` exact non-tied annual/monthly retirement reconciliation;
- R03 = `TMA-017-03` desired/excess recurring BELOW tranche;
- `TMA-017-04` is already closed at the Manager/control-plane level and requires no production change.

## Remediation review

### R01 — targeted missing-fact locality

`money-priority-build-competition.ts` now resolves known cross-domain relationships before treating unrelated missing evidence as globally material:

- confirmed Optional/lifestyle core is `BELOW` even when an immaterial amount/detail is unresolved;
- unconfirmed legacy goals receive no new elevation and do not freeze unrelated verified allocations;
- known OUTRANK/CO_PRIORITY tranches can allocate before an unrelated lower-priority unresolved tranche;
- genuinely material Essential/Important uncertainty still fails closed for the capacity whose retirement tradeoff could change;
- null requests remain locally unresolved and receive no invented allocation.

Direct regressions in `ffh-017-audit-remediation.test.ts` cover Optional unknown core, Optional irrelevant borrowing detail, legacy isolation, known OUTRANK and CO_PRIORITY with unrelated lower-priority unknowns, and material Essential/Important fail-closed cases.

### R02 — exact recurring retirement reconciliation

`money-priority-retirement-capacity.ts` now exposes `consumeRetirementCapacityRecurringMonthly(...)` as the authoritative non-tied recurring conversion. It derives monthly authority from verified annual cents, consumes exactly `monthly_cents * 12`, and throws if the annual ledger consumption does not exactly reconcile.

Both the Build retirement prepass (`routableRetirementMonthlyCapacity`) and actual destination router (`routeRetirementMonthlyAmount`) use the same helper. This removes the former round-half-up path where `$0.06` annual room could be presented as `$0.01/month`.

Direct boundary regressions cover `$0.06`, `$0.11`, `$0.12`, `$0.13`, `$0.23`, `$0.24`, and `$0.25` annual room. Residual annual cents remain available to later one-time stages rather than being hidden or falsely converted into recurring monthly authority.

### R03 — desired/excess recurring tranche

`money-priority-build-competition.ts` now emits distinct `core` and `desired_excess` tranches. Desired/excess always carries `BELOW`, never inherits an OUTRANK/CO_PRIORITY core disposition, and may consume residual Build capacity only after additional retirement and higher-ranked competing tranches.

`money-priority-build.ts` preserves that tranche identity through Build allocations, and `money-priority-engine.ts` gives desired-excess recommendations a distinct ID so core/excess recommendations cannot collide.

Direct regressions cover the Manager-required Scenario-8 shape (core already satisfied, excess remains) and a mixed `$600` core + `$400` additional retirement + `$600` excess case that conserves all `$1,600` exactly.

## Financial Engine Reconciliation Gate review

- Authoritative recurring routing unit: integer monthly cents.
- R02 prepass and actual non-tied router share the same recurring capacity-consumption helper.
- Co-priority equal-fulfillment remains integer-cent based; stable identity remains only the unavoidable final-cent tie breaker.
- Aggregate competition allocation is checked against capacity exactly; no epsilon/tolerance is used.
- No positive monetary residual is hidden by a reconciliation clamp.
- Desired-excess is a separate retirement-junior request, not promoted into remaining CORE need.
- Existing Cash -> Secure -> Build -> Windfall ledger custody is preserved. A recurring Build conversion may leave annual residual cents that a later one-time Windfall consumer can legally use, but previously consumed annual cents cannot be reused.
- Protected FFH-013 tied-spouse reconciliation path is unchanged by R02.

## Regression-alignment review

Two existing assertions were intentionally updated after the production remediation:

1. Missing/invalid-date goals still invent no recurring pace, but they no longer freeze an unrelated fully known goal allocation. This is the required R01 locality behavior, not a weakened fail-closed invariant.
2. A recurring Build allocation that cannot consume a sub-month annual residual leaves that exact residual on the authoritative retirement ledger. Windfall may consume the residual once as one-time capacity; the combined staged claims are still pinned to the original annual room exactly. This is the required R02 annual/monthly distinction, not double spending.

`0a421f00e42ee1699d51dea7abdb37118bed631f` is the last production-file change. The current post-production delta is test/control-plane only.

## CI evidence

Supporting branch evidence: Foundation CI run `35167923979` succeeded on `32054d26ae2c460e29a64b7dfd1fa8490f461b06`, but that checkpoint still carried temporary test/CI presentation differences and is not the final validation checkpoint.

The former exact head `17e2adec51a098c09720e31108aca46489008a3b` restored the canonical workflow/package state and contained the final regression alignment, but pull-request run `35168077989` returned `action_required` before any job was created because that head was authored by `github-actions[bot]`. It is infrastructure/authorization evidence only and does not count as validation.

Final production/test validation head `a6a8087db007d3012db8fe426e63a2988a0f95a8` passed full Foundation CI run `35171621516`, job `105044311457` — SUCCESS. GitHub confirms checkout, Node setup, dependency install, AI-state validation, production dependency audit, calculation tests, security tests, typecheck, lint, and build all executed successfully.

The latest Manager PR #28 instruction independently confirmed that exact head and the post-production changed-file scope, and identified the stale Core Engineer handoff as the only remaining worker gate. This READY_FOR_MANAGER update changes only control-plane documentation. Canonical checkpoint semantics state that documentation-only commits after a validated production checkpoint do not invalidate the earlier green production evidence; no production/test behavior is changed merely to force another validation cycle.
