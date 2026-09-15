# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer / Work Helper rescue within approved Core scope
Worker status: READY_FOR_MANAGER
Task state: READY_FOR_MANAGER
Approved integration base: `phase-5-money-priority-engine`
Branch: `ffh/ffh-017-goal-retirement-competition`
Pull request: #26 — draft, open, unmerged
PRODUCTION_SHA: `1393ea928eb5756f16a6af063a68360892200bd6`
VALIDATED_CI: Foundation CI run `34999388253`, job `104483637634` — SUCCESS on repository-scoped self-hosted `FFH-Windows-Runner`
HANDOFF_SHA: This documentation commit; exact SHA is the commit containing this handoff
INTEGRATION_SHA: Not yet established
MANAGER_VERDICT: PENDING
AUDIT_STATUS: NOT_READY

## Implementation architecture

FFH-017 implements the accepted FFH-D004 recurring Build competition between actionable remaining goal-core need and additional retirement opportunity above the protected Phase 5A retirement floor.

Authoritative competition/allocation logic lives in `lib/calculations/money-priority-build-competition.ts`. `lib/calculations/money-priority-build.ts` consumes that result and the closed FFH-013 retirement-capacity ledger; there is no separately invented planner arithmetic for the same contested capacity.

The authoritative routing unit is recurring **monthly cents**.

## Disposition mapping

- `OUTRANKS`: qualifying goal-core tranche is funded before additional retirement.
- `CO_PRIORITY`: goal and additional retirement share scarce recurring capacity by deterministic common fulfillment ratio with exact-cent reconciliation.
- `BELOW`: additional retirement is routed before the lower-priority goal tranche; `BELOW` does not consume the goal-competition capacity ahead of retirement.
- `MORE_INFORMATION_NEEDED`: contested allocation remains zero/fail-closed when material facts are missing.

## Reconciliation / deterministic allocation

- Aggregate recurring allocation equals the sum of concrete destination allocations in monthly cents.
- Co-priority allocation uses exact integer-cent arithmetic and common fulfillment.
- Stable identity is used only for an unavoidable final-cent remainder after financial equivalence is established.
- No epsilon/tolerance reconciliation waiver is used.
- No hidden positive residual clamp or silent over-route is used.
- Existing Cash -> Secure -> Build -> Windfall capacity conservation remains intact.

## Protected semantics

- Protected retirement floor is funded/handled before the FFH-017 competition and ordinary goals cannot raid it.
- Goal desired/excess funding is not elevated into actionable goal-core need.
- Factual YTD, future schedules/reservations, statutory/legal room, recommendations, and execution facts remain distinct.
- Closed FFH-013 retirement-capacity ledgers are reused rather than recreated.
- Multiple retirement accounts do not multiply owner/shared capacity.
- Roth eligibility, Traditional deductibility, SIMPLE, HSA, and unrelated workplace-retirement behavior remain preserved.

FFH-013 M01 remains exact:
- shared annual room `$10,000.01`;
- owner conditional room `$7,500` each;
- Build authority `$833.33/month`;
- routes `$416.67 + $416.66`;
- annual legal consumption `$9,999.96`;
- shared annual remainder `$0.05`.

## Rescue / final validation history

The Work rescue corrected stale/incomplete integration-test fixtures and a narrow `BELOW` type/semantic integration issue without broadening accepted policy. Later infrastructure work moved Foundation CI from exhausted GitHub-hosted Linux minutes to the repository-scoped Windows self-hosted runner at `$0` hosted-runner cost.

The self-hosted workflow uses labels `[self-hosted, Windows, X64, ffh-local]` and `cmd.exe` for run steps so Windows PowerShell execution policy is not weakened.

Final exact-head pre-handoff validation at `545d3b12710086b0fefb44be9b7823309f30da0e`:
- Foundation CI run `34999388253`, job `104483637634` — SUCCESS;
- dependency install — PASS;
- `npm run ai:validate-state` — PASS;
- dependency audit — PASS;
- calculation tests — PASS;
- security policy contract — PASS;
- typecheck — PASS;
- lint — PASS;
- build — PASS.

Local rescue validation also recorded:
- calculations: 866/866 PASS;
- security: 21/21 PASS;
- typecheck PASS;
- lint PASS with zero errors;
- clean-cache build PASS.

## Production checkpoint boundary

`1393ea928eb5756f16a6af063a68360892200bd6` is the last FFH-017 production-code change. The later commits through green head `545d3b12710086b0fefb44be9b7823309f30da0e` change tests/fixtures, workflow infrastructure, and AI control-plane/handoff records only; they do not alter production financial-engine files.

## Scope / changed production files

Production FFH-017 scope is bounded to:
- `lib/calculations/money-priority-build-competition.ts`
- `lib/calculations/money-priority-build.ts`

The remainder of PR #26 is direct/regression tests, fixture compatibility, AI workflow/handoff/task metadata, and the self-hosted CI routing change.

## Remaining blocker

NONE for worker completion. Manager retains acceptance, merge/integration, frozen audit target creation, independent auditor activation, and task closure.

READY_FOR_MANAGER
