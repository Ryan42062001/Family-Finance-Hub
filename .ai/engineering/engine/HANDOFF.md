# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
Status: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Branch: `ffh/ffh-017-r01-outrank-peer-remediation`
Pull request: #31 — draft / open / unmerged
Approved milestone branch: `phase-5-money-priority-engine`
Current synchronized milestone checkpoint: `272607a3667496e81df324524ea890f0a6dbac4b`

Historical failed frozen targets:
- `9d3a880e02365b4445b8070344c72c928ca34511`
- `90a31c755ea88310e58bb9e06ade60af73e182f5`

PRODUCTION_SHA: `23fb87ae8b352e2a3d06aa1836ca2081fbb37544`
FINAL_VALIDATION_SHA: `b2c5d46f4f7abe58f6f1530e31107379ea6c037e`
VALIDATED_CI: Foundation CI run `35302662526`, job `105468356418` — SUCCESS on `b2c5d46f4f7abe58f6f1530e31107379ea6c037e`
SUPPORTING_PRODUCTION_CI: Foundation CI run `35302462197`, job `105467760539` — SUCCESS on `23fb87ae8b352e2a3d06aa1836ca2081fbb37544`
HANDOFF_SHA: This documentation/control-plane commit; exact SHA is the commit containing this handoff
INTEGRATION_SHA: Not yet established for R04
MANAGER_VERDICT: PENDING
AUDIT_STATUS: REQUIRED — new Manager-frozen target + fresh independent closure audit after acceptance/integration

## Assigned objective

Close only R04: the shared HIGH `TMA-017-05` / `FFH-017-P02` defect where a known OUTRANK goal could receive scarce Bucket-1 capacity before a materially unresolved Essential peer was known well enough to determine whether it should enter OUTRANK and rank ahead.

Preserve all already-cleared R02, R03, reconciliation, retirement-capacity, and FFH-013 M01 behavior.

## Work completed

Production change is bounded to:
- `lib/calculations/money-priority-build-competition.ts`

Test change is bounded to:
- `lib/calculations/ffh-017-audit-remediation.test.ts`

The allocator now identifies material unresolved Essential peers that can still resolve into OUTRANK. Before funding each known OUTRANK tranche, it reserves the bounded maximum recurring capacity required by any higher-ranked unresolved potential-OUTRANK peer. The known tranche receives only capacity demonstrably independent of those unresolved peers.

If the known tranche cannot be fully funded independently, lower-ranked known OUTRANK tranches do not claim the same contested Bucket-1 capacity.

No unknown core amount or recurring pace is assigned to the unresolved goal. The upper bound is used only to prove which current cents are independent.

## R04 proof

Direct green regressions prove:

1. Essential/Fixed/High known OUTRANK + unresolved Essential/Fixed/Critical peer under scarce capacity: known High receives no definite contested allocation.
2. Unresolved Essential peer whose known facts make OUTRANK impossible: independent known OUTRANK proceeds.
3. Unresolved Important peer: cannot block independent OUTRANK because Important never OUTRANKS in V1; its dependent downstream tradeoff remains unresolved.
4. Known Critical OUTRANK ahead of a lower-ranked unresolved High potential-OUTRANK: senior known allocation proceeds.
5. Higher-ranked unresolved peer with a bounded maximum request: only that maximum is reserved; independently safe residual capacity may fund the known OUTRANK.
6. Existing Optional and legacy-unconfirmed locality tests remain green.
7. No unknown core amount or recurring pace is fabricated.

## Validation evidence

Exact production/test candidate `23fb87ae8b352e2a3d06aa1836ca2081fbb37544`:
- Foundation run `35302462197`, job `105467760539` — SUCCESS;
- calculations: 909/909 PASS;
- security: 21/21 PASS;
- AI state validation PASS;
- production dependency audit: 0 vulnerabilities;
- typecheck PASS;
- lint PASS;
- build PASS.

The branch was then synchronized with three non-overlapping Manager/control-plane commits from the current milestone. They changed FFH-031/workflow/audit/task metadata only and did not overlap either R04 file.

Exact refreshed validation head `b2c5d46f4f7abe58f6f1530e31107379ea6c037e`:
- Foundation run `35302662526`, job `105468356418` — SUCCESS through every standard gate.

PR #31's production/test surface remains exactly two R04 files against the current milestone base. The final worker return additionally changes only four `.ai` task/index/worklog/handoff documentation files.

## Preserved cleared behavior

R02 — CLEARED behavior preserved:
- R02 production code unchanged;
- exact annual-cent -> monthly-cent authority tests PASS;
- audited `$0.06` annual-room boundary PASS: no false `$0.01/month` recurring authority.

R03 — CLEARED behavior preserved:
- R03 production code unchanged;
- Scenario-8 core-satisfied desired-excess test PASS;
- `$600 core + $400 retirement + $600 desired excess = $1,600` exact conservation test PASS.

Protected FFH-013 M01 — preserved exactly:
- shared annual room `$10,000.01`;
- owner conditional room `$7,500` each;
- Build authority `$833.33/month`;
- routes `$416.67 + $416.66`;
- annual legal consumption `$9,999.96`;
- shared annual remainder `$0.05`.

## Financial Engine Reconciliation Gate

R04 changes only which scarce OUTRANK cents are authorized before missing facts resolve.

Unchanged and green:
- authoritative recurring unit is integer monthly cents;
- aggregate allocation plus residual equals available capacity exactly;
- concrete retirement destination totals equal the authoritative retirement aggregate;
- annual/monthly retirement consumption reconciles exactly;
- no epsilon/tolerance or positive-residual clamp;
- deterministic ordering/final-cent rules remain;
- existing shared/owner/scheduled/staged capacity cannot be reused.

## Branch / scope safety

The branch originally started at Manager R04 routing checkpoint `4e75037ae5f53418af3f50c7a9af9f17fd09f0dd`.

Milestone advancement to `272607a3667496e81df324524ea890f0a6dbac4b` was independently compared and consisted only of non-overlapping control-plane changes. Those commits are incorporated in `b2c5d46...`.

No schema, UI, Supabase/live-data, HSA, SIMPLE, workplace-retirement, FFH-D004, FFH-013 policy, R02, R03, or Phase 6 production behavior was changed.

## Remaining blocker / exact next action

Worker blocker: NONE.

Manager / Architect should independently review PR #31, R04 adversarial behavior, exact changed scope, and CI. If accepted, Manager owns integration/merge, exact `INTEGRATION_SHA`, a new frozen FFH-017 target/packet, activation of the required fresh independent closure audit lanes, and eventual task closure.

Do not reuse either failed target as the new audit target.

READY_FOR_MANAGER
