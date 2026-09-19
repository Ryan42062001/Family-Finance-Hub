# FFH-017 — Core Engine Worklog

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
State: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Branch: `ffh/ffh-017-r08-desired-excess-locality-remediation`
PR: #36 — draft / open / unmerged
Approved integration base: `phase-5-money-priority-engine`
Manager routing / base checkpoint: `295671c89659116e93dec2d7a61f8926839f65d0`
Production / validation checkpoint: `9d092d5a3939c75a229ed0e74568b40ea37dd387`

## R08 finding

Fresh dual audits of frozen target `b236239f...` closed R07-A/R07-B but identified one shared MEDIUM blocking desired-excess locality gap:
- TMA-017-08;
- FFH-017-P05.

Positive request-null desired-excess tranches were visible in local missing-data state but absent from Bucket-3 reserve analysis, allowing weaker known BELOW allocations to consume contested capacity.

## Implementation

R08 extends the existing BELOW-only uncertainty reservation to non-legacy positive request-null `desired_excess` tranches.

The unresolved excess remains:
- disposition BELOW;
- definite allocation $0;
- request null;
- retirement-junior.

The conservative maximum demand mirrors the existing pace cent math at the shortest supported positive period and is reserve evidence only.

Financial order uses only known source factors. Missing period/date is not invented or used to strengthen rank.

No OUTRANK/CO_PRIORITY authority is introduced for desired excess.

## Direct proof

Senior adversary PASS:
- Essential / Preservation / Fixed / Critical;
- core satisfied;
- desired excess $1,200;
- missing period;
- weaker Optional / Improvement / Flexible / Low known BELOW $100;
- capacity $100;
- unresolved excess $0;
- weaker known $0;
- residual $100.

Financially-junior control PASS:
- junior unresolved Optional / Improvement / Flexible / Low desired excess;
- senior known Optional / Improvement / Fixed / Critical BELOW $100;
- capacity $100;
- known $100 proceeds;
- unresolved excess $0;
- residual $0.

## Validation

Exact candidate:
`9d092d5a3939c75a229ed0e74568b40ea37dd387`

Foundation CI:
- run `35386756540`
- job `105735352341`
- SUCCESS
- calculations 919/919 PASS
- security 21/21 PASS
- AI-state validation PASS — 23 task files index-consistent
- production dependency audit 0 vulnerabilities
- typecheck PASS
- lint PASS
- build PASS

Named proof:
- both R08 tests PASS;
- all R07 tests PASS;
- R04/R05/R06 named tests PASS;
- R02 cent boundaries PASS;
- R03 Scenario-8 and exact $1,600 mixed routing PASS;
- FFH-013 M01 PASS;
- missing/invalid-date locality PASS.

## Financial Engine Reconciliation Gate

Authoritative unit remains integer monthly cents.

R08 adversary:
- $0 allocated + $100 residual = $100 exactly.

Junior control:
- $100 allocated + $0 residual = $100 exactly.

The targeted missing-data path retains exact allocated + residual equality. No epsilon/tolerance waiver or hidden residual clamp is introduced.

Retirement routing, Phase-5A floor, core-before-excess ordering, and staged-capacity custody are unchanged.

## Scope

Production:
- `lib/calculations/money-priority-build-competition.ts`

Tests:
- `lib/calculations/ffh-017-audit-remediation.test.ts`

No policy, schema, UI, Supabase/live-data, retirement-capacity, or Phase-6 implementation changed.

Worker blocker: NONE.

Return to Manager for independent review/acceptance. Do not merge, self-accept, self-audit, freeze a target, or activate FFH-017 auditors from this worker lane.

READY_FOR_MANAGER
