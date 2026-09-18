# FFH-017 — Core Engine Worklog

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
State: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Branch: `ffh/ffh-017-r01-outrank-peer-remediation`
PR: #31 — draft / open / unmerged
Approved integration base: `phase-5-money-priority-engine`
Historical failed frozen targets:
- `9d3a880e02365b4445b8070344c72c928ca34511`
- `90a31c755ea88310e58bb9e06ade60af73e182f5`
R04 production checkpoint: `23fb87ae8b352e2a3d06aa1836ca2081fbb37544`
Refreshed validation checkpoint: `b2c5d46f4f7abe58f6f1530e31107379ea6c037e`

## Fresh-state / audit reconciliation

Both final independent re-audits of `90a31c75...` found the same remaining HIGH R01 boundary:
- `TMA-017-05`
- `FFH-017-P02`

The shared defect was not R02, R03, or monetary reconciliation. A known OUTRANK tranche could consume scarce Bucket-1 capacity before a materially unresolved Essential peer was known well enough to determine whether that peer should itself enter OUTRANK and rank ahead.

R02, R03, the Financial Engine Reconciliation mechanics, and protected FFH-013 M01 were explicitly cleared by both re-audits and are preserved.

## R04 production change

Only `money-priority-build-competition.ts` changed in production.

The allocator now distinguishes unresolved material core tranches that can still validly resolve into OUTRANK.

For each known OUTRANK tranche, it computes:
1. which unresolved Essential peers could still become OUTRANK;
2. the strongest valid ordering each unresolved peer could attain using only unresolved classification dimensions;
3. a bounded maximum monthly core request derived from authoritative remaining target/core bounds and months;
4. how much current Bucket-1 capacity must be reserved for higher-ranked unresolved peers;
5. how many cents are therefore provably independent and safe to allocate to the known OUTRANK tranche.

A known OUTRANK gets no more than that independently provable amount. If it cannot be fully funded independently, lower-ranked known OUTRANK tranches stop because they cannot have independent entitlement to the same contested scarce capacity.

This does not invent the unresolved peer's actual core amount or recurring pace. The peer itself remains `MORE_INFORMATION_NEEDED` with a null request; the bounded value is only an upper bound used to avoid assigning capacity whose ownership could change.

## Locality preservation

R04 does not restore the historical global freeze.

Direct cases prove:
- higher-ranked unresolved Essential/Fixed/Critical peer can keep scarce Bucket-1 capacity unresolved ahead of known Essential/Fixed/High;
- Essential uncertainty whose facts already make OUTRANK impossible does not block an independent known OUTRANK;
- Important uncertainty does not block an independent OUTRANK because Important never OUTRANKS in FFH-D004 V1;
- a known senior Critical OUTRANK can proceed ahead of a lower-ranked unresolved High potential-OUTRANK peer;
- when the higher-ranked unresolved peer's maximum possible request is bounded below total capacity, the known OUTRANK may receive only the residual capacity proven independent;
- existing Optional/lifestyle and legacy-unconfirmed locality regressions remain green.

## Test change

Only `ffh-017-audit-remediation.test.ts` changed in the test surface.

Five direct R04 regressions were added:
- higher-ranked unresolved Essential OUTRANK peer / scarce Bucket-1 fail-close;
- Essential uncertainty provably unable to OUTRANK;
- unresolved Important locality;
- senior known OUTRANK ahead of lower-ranked unresolved potential OUTRANK;
- bounded higher-ranked unresolved peer reserves only its maximum potential request.

## Validation

Initial exact production/test candidate:
`23fb87ae8b352e2a3d06aa1836ca2081fbb37544`

Foundation CI:
- run `35302462197`
- job `105467760539`
- conclusion: SUCCESS

Observed evidence:
- AI state validation: PASS — 21 task files index-consistent;
- production dependency audit: 0 vulnerabilities;
- calculations: 909/909 PASS;
- security: 21/21 PASS;
- typecheck: PASS;
- lint: PASS;
- build: PASS.

Direct CI test evidence:
- FFH-013 M01: PASS;
- R04 direct regressions: PASS;
- R01 material Essential/Important fail-close: PASS;
- R02 exact annual/monthly conversion and `$0.06` boundary: PASS;
- R03 Scenario-8 desired-excess and `$600/$400/$600` mixed case: PASS.

## Branch freshness

The R04 branch was cut at Manager routing checkpoint `4e75037ae5f53418af3f50c7a9af9f17fd09f0dd`.

The milestone later advanced to `272607a3667496e81df324524ea890f0a6dbac4b` through three Manager/control-plane commits affecting only FFH-031/workflow/audit/task metadata. No R04 production or test file overlapped.

The branch was synchronized with that milestone state in merge checkpoint:
`b2c5d46f4f7abe58f6f1530e31107379ea6c037e`

PR #31 remains a two-file implementation diff relative to the current milestone base.

Refreshed exact-head Foundation CI:
- run `35302662526`
- job `105468356418`
- conclusion: SUCCESS through dependency install, AI-state validation, dependency audit, calculations, security, typecheck, lint, and build.

## R02 / R03 / M01 preservation

R02 production code was not changed. Existing direct tests remain green:
- annual cents are floored to exact full-year monthly authority;
- `$0.06` annual room cannot present `$0.01/month`.

R03 production code was not changed. Existing direct tests remain green:
- core-satisfied Scenario-8 desired excess remains a separate `BELOW` tranche;
- `$600` core + `$400` retirement + `$600` desired excess conserves exactly `$1,600`.

Protected FFH-013 M01 remains exact:
- shared annual room `$10,000.01`;
- conditional owner room `$7,500` each;
- Build `$833.33/month`;
- routes `$416.67 + $416.66`;
- annual legal consumption `$9,999.96`;
- shared annual remainder `$0.05`.

## Financial Engine Reconciliation Gate

R04 changes allocation authority before the existing reconciliation path; it does not change the monetary unit or ledger arithmetic.

Preserved:
- authoritative recurring unit = integer monthly cents;
- aggregate allocation + residual = capacity exactly;
- concrete retirement destinations = authoritative aggregate retirement allocation;
- exact annual/monthly retirement reconciliation;
- no epsilon/tolerance financial waiver;
- no positive residual clamp;
- deterministic final-cent handling;
- no scheduled/YTD or staged-capacity reuse.

## Worker result

Worker blocker: NONE.

Return to Manager for independent acceptance/integration. Do not merge, self-accept, self-audit, create the frozen target, or activate auditors from this worker lane.

READY_FOR_MANAGER
