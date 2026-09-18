# FFH-017 — Core Engine Worklog

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
State: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Branch: `ffh/ffh-017-r07-below-locality-remediation`
PR: #34 — draft / open / unmerged
Approved integration base: `phase-5-money-priority-engine`
Manager routing checkpoint: `d0724ec9e990c4b2b743cfc66a285fa296d7bd1b`
Production / validation checkpoint: `33bfa79fc1b3d7a6471b35cecc44dfb72d246906`

## R07 findings

R07-A / TMA-017-07 MEDIUM:
request-null tranches already definitively BELOW were omitted from Bucket-3 reserve analysis.

R07-B / FFH-017-P04 MEDIUM:
positive independent capacity for a weaker known BELOW claim was frozen unless the entire request fit.

R02, R03, R04, R05, R06, exact reconciliation, protected Phase-5A floor, staged-capacity no-reuse, and FFH-013 M01 remain preservation gates.

## R07-A implementation

Non-legacy definitive-BELOW request-null core tranches now participate in Bucket-3 locality analysis.

The missing pace remains unresolved and unfunded. A conservative maximum is used only for reserve analysis. Ordering uses only already-known financial factors, so missing period evidence cannot invent a stronger rank.

Required Optional/Fixed/Critical vs Optional/Flexible/Low $100 residual adversary PASS:
- unresolved stronger allocation $0;
- weaker known allocation $0;
- residual $100 unresolved.

## R07-B implementation

Known BELOW allocation is now capped by independently safe capacity rather than all-or-nothing full-request fit.

Required $250 total / $100 retirement / $100 stronger unresolved reserve / $100 weaker request PASS:
- retirement $100;
- weaker known BELOW $50;
- unresolved claimant $0;
- residual unresolved $100.

Zero-independent-capacity control PASS.

## Validation

Rejected first candidate:
`59b67db6c897e3a28ec266118602fdab04f37ce5`
- Foundation CI `35346105263` / job `105602938132` FAILED one pre-existing missing-date locality regression;
- root cause: missing period evidence had been promoted into stronger ordering;
- candidate rejected.

Final production / validation:
`33bfa79fc1b3d7a6471b35cecc44dfb72d246906`

Foundation CI:
- run `35346849145`
- job `105605334966`
- SUCCESS
- calculations 917/917 PASS
- security 21/21 PASS
- AI-state validation PASS — 22 task files index-consistent
- production dependency audit 0 vulnerabilities
- typecheck PASS
- lint PASS
- build PASS

Named log proof:
- R07-A PASS;
- R07-B positive partial PASS;
- R07-B zero-independent PASS;
- missing/invalid-date locality PASS;
- R04/R05/R06 direct regressions PASS;
- R02 exact recurring-cent boundaries PASS;
- R03 Scenario-8 and $600/$400/$600 exact case PASS;
- FFH-013 M01 exact boundary PASS.

## Financial Engine Reconciliation Gate

Authoritative unit remains integer monthly cents.

Preserved:
- aggregate allocation + residual = available capacity exactly;
- retirement aggregate = concrete retirement destination totals;
- exact annual/monthly retirement conversion;
- no epsilon/tolerance waiver;
- no hidden positive residual clamp;
- deterministic final-cent handling;
- protected Phase-5A floor;
- no shared/owner/scheduled/staged capacity reuse.

## Scope / freshness

Validated production/test files:
- `lib/calculations/money-priority-build-competition.ts`
- `lib/calculations/ffh-017-audit-remediation.test.ts`

No financial implementation changed after `33bfa79f...`.

The milestone advanced after validation through unrelated control-plane work. The final handoff commit incorporates latest canonical control-plane state while preserving the validated R07 production/test blobs byte-for-byte.

Worker blocker: NONE.

Return to Manager for independent review/acceptance. Do not merge, self-accept, self-audit, freeze a target, or activate FFH-017 auditors from this worker lane.

READY_FOR_MANAGER
