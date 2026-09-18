# FFH-017 — Core Engine Worklog

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
State: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Branch: `ffh/ffh-017-r05-r06-locality-remediation`
PR: #32 — draft / open / unmerged
Approved integration base: `phase-5-money-priority-engine`
Base / Manager routing checkpoint: `ee8310a714d52a0ff0fae305dcbbb6e5c41f9463`
Production / validation checkpoint: `23b6001f62eab6473c4ae812e015fd259c0f9c40`

Historical failed frozen targets:
- `9d3a880e02365b4445b8070344c72c928ca34511`
- `90a31c755ea88310e58bb9e06ade60af73e182f5`
- `c009a8c22d92715696018c7089eb5ad1a79a3cf1`

## Fresh audit reconciliation

The fresh closure audits of `c009a8c2...` found two distinct remaining locality defects:

- R05 / `TMA-017-06` HIGH: confirmed non-legacy `necessity = unknown` can later resolve Essential and become a senior OUTRANK claimant, but frozen R04 excluded it from potential-OUTRANK reservation.
- R06 / `FFH-017-P03` MEDIUM: after Bucket-1 handling, the frozen implementation returned immediately for any material missing goal, freezing retirement/lower-bucket dollars even when those dollar results were invariant across supported resolutions.

R02, R03, R04, exact reconciliation, and FFH-013 M01 were explicitly preserved/cleared and remain regression gates.

## R05 implementation

`canResolveToOutrank()` now accepts both:
- currently Essential; and
- confirmed/non-legacy necessity-unknown

when the remaining authoritative urgency/harm facts permit an Essential OUTRANK resolution.

`strongestPotentialOutrankOrdering()` resolves unknown necessity to Essential only inside conservative ordering analysis. The output tranche remains `MORE_INFORMATION_NEEDED`; no unknown necessity is asserted as fact.

Direct regressions:
- necessity Unknown + Fixed/Critical + known $200 core pace correctly reserves scarce $200 ahead of known Essential/Fixed/High;
- necessity Unknown + Flexible/Low/none cannot become OUTRANK and does not suppress the independent known OUTRANK.

## R06 implementation

The blanket post-Bucket-1 material-missing return is replaced with bounded supported-resolution analysis.

For each unresolved material goal, the engine enumerates only valid resolved categorical states for:
- necessity;
- goal nature;
- deadline flexibility;
- consequence severity;
- debt exposure.

This analysis does not mutate or expose a fabricated classification. It is internal evidence used to determine whether a bucket can change.

Layered locality:
1. reserve maximum supported demand for unresolved peers that can reach OUTRANK;
2. identify non-OUTRANK peers that can reach CO_PRIORITY;
3. allocate verified retirement / known CO_PRIORITY only if all senior requests fit at supported maxima, making the dollars invariant;
4. if a possible CO_PRIORITY state can change the retirement/share under scarcity, keep those dollars unresolved;
5. known BELOW allocations may proceed only from capacity proven independent of unresolved senior buckets and stronger below-only peers.

Direct R06 regressions:
- $500 total / known OUTRANK $200 / retirement $100 / unresolved Important $100 nature-unknown => retirement $100 proceeds;
- $600 total / retirement $500 / unresolved Important $100 nature-unknown => retirement $500 proceeds;
- $500 total / retirement $500 / unresolved Important $100 possible CO_PRIORITY => retirement remains $0 because the share changes across resolutions.

The unresolved goal itself remains `MORE_INFORMATION_NEEDED` and receives no fabricated classification allocation.

## Changed scope

Production:
- `lib/calculations/money-priority-build-competition.ts`

Tests:
- `lib/calculations/ffh-017-audit-remediation.test.ts`

No retirement-capacity ledger code, policy, schema/UI/Supabase, HSA/SIMPLE/workplace-retirement implementation, or Phase 6 surface changed.

## Validation

Exact production/test candidate:
`23b6001f62eab6473c4ae812e015fd259c0f9c40`

Foundation CI:
- run `35304758354`
- job `105474563283`
- conclusion: SUCCESS

Evidence:
- AI-state validation PASS — 21 task files index-consistent;
- production dependency audit: 0 vulnerabilities;
- calculations: 914/914 PASS;
- security: 21/21 PASS;
- typecheck PASS;
- lint PASS;
- build PASS.

Direct log evidence confirms PASS for:
- retained R04 adversaries;
- R05 necessity-unknown potential OUTRANK;
- R05 non-OUTRANK necessity-unknown negative control;
- R06 invariant retirement after known OUTRANK;
- R06 no-OUTRANK invariant retirement;
- R06 scarce possible CO_PRIORITY fail-close;
- R02 exact recurring-cent boundaries, including $0.06;
- R03 Scenario-8 and $600/$400/$600 exact case;
- FFH-013 M01 exact shared-pool boundary.

## Financial Engine Reconciliation Gate

R05/R06 changes allocation authority only.

Preserved:
- authoritative recurring unit: integer monthly cents;
- allocated + residual = available capacity exactly;
- aggregate retirement allocation = concrete retirement destinations;
- exact annual/monthly retirement consumption;
- R02 shared planner/router path;
- no epsilon/tolerance waiver;
- no hidden positive residual clamp;
- deterministic order/final-cent behavior;
- shared/owner/scheduled/staged capacity no-reuse;
- protected Phase 5A floor remains outside ordinary competition.

## Worker result

Worker blocker: NONE.

Return to Manager for independent acceptance/integration. Do not merge, self-accept, self-audit, freeze a target, or activate auditors from this worker lane.

READY_FOR_MANAGER
