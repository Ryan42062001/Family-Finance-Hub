# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
Worker status: READY_FOR_MANAGER
Task state: READY_FOR_MANAGER
Approved integration base / milestone branch: `phase-5-money-priority-engine` @ `5ae7f32b26ba51e40e2230d68331a83195ce8f1d`
Branch: `ffh/ffh-017-audit-remediation`
Pull request: #28 — draft, open, unmerged
Historical failed frozen target: `9d3a880e02365b4445b8070344c72c928ca34511`
PRODUCTION_SHA: `0a421f00e42ee1699d51dea7abdb37118bed631f`
FINAL_VALIDATION_SHA: `a6a8087db007d3012db8fe426e63a2988a0f95a8`
VALIDATED_CI: Foundation CI run `35171621516`, job `105044311457` — SUCCESS on `a6a8087db007d3012db8fe426e63a2988a0f95a8`
HANDOFF_SHA: This documentation/control-plane commit; exact SHA is the commit containing this handoff
INTEGRATION_SHA: Not yet established
MANAGER_VERDICT: PENDING
AUDIT_STATUS: REQUIRED — new Manager-frozen target + fresh dual re-audit after acceptance/integration

## Fresh authoritative refresh

- Live PR #28 is draft/open/unmerged and targets `phase-5-money-priority-engine`.
- The exact pre-handoff validation head is `a6a8087db007d3012db8fe426e63a2988a0f95a8`.
- Foundation CI run `35171621516`, job `105044311457`, is SUCCESS on that exact head.
- The job actually executed checkout, Node setup, `npm ci`, `npm run ai:validate-state`, production dependency audit, calculation tests, security tests, typecheck, lint, and build; every step passed.
- The live compare `0a421f00e42ee1699d51dea7abdb37118bed631f..a6a8087db007d3012db8fe426e63a2988a0f95a8` contains only `.ai/engineering/engine/FFH-017_WORKLOG.md`, `lib/calculations/money-priority-fresh-final-remediation.test.ts`, and `lib/calculations/money-priority-goal-ranking.test.ts`. No production file changed after `PRODUCTION_SHA`.
- The latest Manager PR #28 instruction independently confirms the same CI/scope evidence and identifies the stale Core handoff as the remaining worker gate.
- Historical target `9d3a880e02365b4445b8070344c72c928ca34511` remains immutable failed-audit evidence.

## R01 — targeted missing-fact locality

The remediated competition resolves known cross-domain ordering before allowing unrelated missing facts to freeze allocations.

- Optional/lifestyle core remains `BELOW` additional retirement even when its own amount/detail is unresolved; a null request stays local and receives no invented allocation.
- An unconfirmed legacy goal receives no new elevation and does not freeze unrelated verified retirement or goal allocations.
- An unrelated lower-priority unknown does not suppress a fully known `OUTRANKS` tranche.
- An unrelated lower-priority unknown does not suppress a fully known `CO_PRIORITY` tranche.
- Genuinely material Essential/Important uncertainty still returns `MORE_INFORMATION_NEEDED` and fails closed for contested capacity whose outcome can change.
- Direct remediation regressions pin all five boundaries above.

## R02 — exact non-tied annual/monthly retirement reconciliation

The authoritative non-tied recurring path is `consumeRetirementCapacityRecurringMonthly(...)`.

- Verified annual room is converted to recurring monthly authority by integer annual cents with floor division by 12.
- The exact annual amount consumed is `monthly_cents * 12`; the helper throws if annual ledger consumption does not reconcile exactly.
- Build prepass `routableRetirementMonthlyCapacity` and actual router `routeRetirementMonthlyAmount` both call the same recurring-capacity helper for ordinary destinations. MFJ tied-spouse routes keep the accepted FFH-013 recurring tie helper.
- The audited `$0.06` annual-room boundary now exposes `$0.00/month`, consumes `$0.00`, and preserves the full `$0.06` annual residual.
- Nearby direct boundaries are pinned at `$0.11`, `$0.12`, `$0.13`, `$0.23`, `$0.24`, and `$0.25`.
- Annual residual cents remain explicit for later lawful one-time consumers; no residual is silently clamped away.
- No epsilon/tolerance is used as a reconciliation safety valve; reconciliation is exact integer-cent equality.

## R03 — desired/excess recurring tranche completeness

- Goal `core` and `desired_excess` are distinct economic tranche identities.
- Every nonzero desired/excess tranche is emitted separately with disposition `BELOW`; it never inherits `OUTRANKS` or `CO_PRIORITY` from core.
- Ordering remains core according to its approved disposition -> additional retirement as applicable -> desired/excess and other BELOW tranches.
- Scenario-8 shape is pinned: core already satisfied, additional retirement routes first, and desired excess can consume residual Build capacity.
- Manager-required exact case is pinned and green: `$600` core + `$400` additional retirement + `$600` desired excess = `$1,600` allocated with `$0` residual.

## Financial Engine Reconciliation Gate

- Authoritative recurring routing unit: integer monthly cents.
- Aggregate Phase 5C allocation equals concrete Build destination totals exactly.
- Concrete retirement-account monthly allocations sum exactly to the aggregate retirement allocation or routing throws.
- Annual/monthly retirement conversion consumes exactly the annual cents represented by the monthly recurring pace.
- Odd-cent/final-cent behavior remains deterministic; stable identity is used only after approved financial equivalence is established.
- No over-route is permitted; negative remaining capacity throws.
- No under-route is hidden by epsilon/tolerance or positive-residual clamp.
- Planner/prepass and actual ordinary retirement router share the same authoritative recurring helper; tied-spouse planner/router share the accepted tied helper.
- Existing Cash -> Secure -> Build -> Windfall use the same retirement-capacity ledger lineage so consumed/reserved capacity cannot be reused.
- Recurring conversion may leave sub-month annual residual cents available to a later one-time stage exactly once; it does not fabricate recurring pace.

## Protected FFH-013 M01 — preserved exactly

- shared annual room: `$10,000.01`
- owner conditional room: `$7,500` each
- Build authority: `$833.33/month`
- routes: `$416.67 + $416.66`
- annual legal consumption: `$9,999.96`
- shared annual remainder: `$0.05`

The direct M01 regression also pins account-order invariance and the retirement-capacity invariant.

## Documentation-only handoff rule

Canonical `.ai/shared/WORKFLOW.md` and `.ai/tasks/README.md` explicitly separate `PRODUCTION_SHA`, `VALIDATED_CI`, and `HANDOFF_SHA`, and state that documentation-only commits after a validated production checkpoint do not invalidate the earlier green production evidence.

Therefore this final worker return changes only control-plane documentation; it does not alter production/tests merely to manufacture another financial validation checkpoint. The already-green exact production/test validation head remains `a6a8087db007d3012db8fe426e63a2988a0f95a8` with run `35171621516` / job `105044311457`.

## Remaining blocker / next action

Worker blocker: NONE.

Manager retains acceptance, PR merge/integration, `INTEGRATION_SHA`, creation of the new exact frozen target and frozen packet, fresh Technical & Mathematical Auditor activation, fresh Financial Policy & Scenario Auditor activation, and final closure.

READY_FOR_MANAGER
