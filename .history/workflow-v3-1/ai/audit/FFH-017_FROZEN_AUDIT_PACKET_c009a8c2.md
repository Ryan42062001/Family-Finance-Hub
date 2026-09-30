# FFH-017 Frozen Audit Packet — `c009a8c2`

Packet ID: `FFH-017-c009a8c2-2026-09-17`

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition  
Workflow: V3.1  
Audit target state: FROZEN / AUDIT_READY — R04 CLOSURE TARGET  
Execution mode for each audit lane: `STANDARD_CHAT_HIGH`

## Exact frozen implementation target

`c009a8c22d92715696018c7089eb5ad1a79a3cf1`

Audit this exact integration SHA only. Later Manager/control-plane commits are not part of the financial implementation target.

Historical failed targets remain immutable evidence and must not be substituted:
- `9d3a880e02365b4445b8070344c72c928ca34511`
- `90a31c755ea88310e58bb9e06ade60af73e182f5`

## Manager acceptance / integration evidence

R04 remediation PR:
#31 — `FFH-017: remediate R04 OUTRANK peer uncertainty`

Production checkpoint:
`23fb87ae8b352e2a3d06aa1836ca2081fbb37544`

Pre-acceptance exact PR head:
`f58d96f145e96db62a4df85743e2d240a25e5ace`

Foundation CI on that exact PR head:
- run `35302990436`
- job `105469345639`
- conclusion: SUCCESS

Manager acceptance commit:
`381413b76799bd56caa2a9ce31717d9c9efca637`

Integration SHA / frozen target:
`c009a8c22d92715696018c7089eb5ad1a79a3cf1`

Manager compare of accepted PR head -> integration reports **zero changed files**.

Exact integration Foundation CI:
- run `35303342028`
- job `105470402709`
- run #658
- conclusion: SUCCESS
- runner: repository-scoped `FFH-Windows-Runner`
- AI-state validation: PASS
- production dependency audit: 0 vulnerabilities
- calculations: 909 tests / 909 pass / 0 fail
- security: 21 tests / 21 pass / 0 fail
- typecheck: PASS
- lint: PASS
- build: PASS

Green CI is evidence, not proof. Each auditor must independently inspect the frozen implementation and required financial/policy boundaries.

## Exact blocking history to close

Both independent re-audits of prior frozen target `90a31c75...` failed on the same remaining R01 boundary defect.

Technical:
- `TMA-017-05` — HIGH / BLOCKING

Policy:
- `FFH-017-P02` — HIGH / BLOCKING

Shared root defect:
A known OUTRANK goal could receive scarce Bucket-1 capacity before resolving a materially unknown Essential peer that could itself become OUTRANK and rank ahead.

The prior auditors explicitly cleared:
- R02 exact non-tied annual/monthly retirement reconciliation;
- R03 desired/excess recurring tranche routing;
- Financial Engine Reconciliation mechanics;
- protected FFH-013 M01.

Do not reopen those cleared areas absent actual regression evidence.

## R04 required semantics

Before committing a known OUTRANK allocation, determine whether any unresolved material core tranche can validly resolve into OUTRANK in a way that changes:
- Bucket-1 entitlement;
- financial ordering;
- scarce-capacity ownership.

If yes:
- capacity whose owner/order can change remains unresolved;
- do not fabricate unknown core amount;
- do not fabricate unknown recurring pace;
- allow only allocation proven independent of the missing fact.

If no:
- preserve targeted locality;
- do not restore the historical global freeze.

At minimum preserve locality for:
- Optional/lifestyle unknowns;
- legacy-unconfirmed goals;
- Important goals that cannot OUTRANK in V1;
- unrelated lower-priority uncertainty.

## Required direct R04 adversaries

Independently verify at minimum:

1. Known Essential / Fixed / High OUTRANK A + unresolved Essential / Fixed / Critical B capable of becoming a stronger OUTRANK + scarce capacity:
   - A must not receive definite contested allocation before B resolves.

2. Unresolved Essential peer already provably unable to become OUTRANK:
   - independent known OUTRANK may proceed.

3. Unresolved Important goal:
   - must not block an already-independent OUTRANK merely because it is unknown;
   - any actually affected co-priority/retirement tradeoff remains fail-closed.

4. Optional/lifestyle uncertainty remains local.

5. Legacy-unconfirmed uncertainty remains local.

6. Senior known OUTRANK remains actionable ahead of a lower-ranked unresolved potential-OUTRANK peer.

7. Bounded higher-ranked unresolved peer:
   - reserve no more than the maximum supported possible request;
   - independently safe residual capacity may proceed.

8. Partial-independent boundary:
   - e.g. $250 capacity, known High request $200, stronger unresolved peer capped at $100;
   - no more than $150 is definite for the known goal before resolution;
   - $100 remains unresolved.

9. No unknown core amount or recurring pace is invented.

## Production/test scope of R04

Production:
- `lib/calculations/money-priority-build-competition.ts`

Direct R04 test:
- `lib/calculations/ffh-017-audit-remediation.test.ts`

The production change:
- identifies unresolved material Essential peers that can still resolve into OUTRANK;
- evaluates the strongest supported ordering such a peer can attain;
- bounds maximum possible recurring core demand from authoritative known limits;
- reserves capacity for higher-ranked unresolved potential-OUTRANK peers;
- allocates a known OUTRANK only from capacity demonstrably independent of those unresolved peers;
- stops lower-ranked known OUTRANK allocation once a senior known OUTRANK cannot be fully funded independently.

Auditors may inspect any frozen-tree file needed to verify correctness. They may not silently switch the audited checkpoint.

## R02 preservation — do not redesign

Required preserved behavior includes:
- $0.06 annual room -> $0.00/month;
- $0.12 -> $0.01/month;
- $0.13 -> $0.01/month with $0.01 annual residual;
- no epsilon/tolerance;
- no hidden residual clamp.

R02 production code was not changed by R04.

## R03 preservation — do not redesign

Core and desired excess remain distinct tranches.

Desired excess stays BELOW additional retirement.

Protected mixed case:
- core $600/month
- additional retirement $400/month
- desired excess $600/month
- capacity $1,600/month
- exact allocation $600 + $400 + $600 = $1,600
- residual $0

R03 production code was not changed by R04.

## Protected FFH-013 M01

Preserve exactly:
- shared annual room: $10,000.01
- owner conditional room: $7,500 each
- Build authority: $833.33/month
- routes: $416.67 + $416.66
- annual legal consumption: $9,999.96
- shared annual remainder: $0.05

No epsilon/tolerance. No hidden residual suppression.

## Financial Engine Reconciliation Gate

Independently verify:
- authoritative recurring unit is integer monthly cents;
- aggregate allocation + residual equals available capacity exactly;
- retirement aggregate equals concrete retirement destinations exactly;
- annual/monthly conversion reconciles exactly where applicable;
- no over-route;
- no hidden under-route or positive-residual suppression;
- no epsilon/tolerance waiver;
- deterministic ordering/final-cent handling remains intact;
- consumed/reserved shared/owner/scheduled/staged capacity cannot be reused;
- protected retirement floor remains protected.

## Accepted policy authority

Audit against:
- FFH-D004 in `.ai/shared/DECISIONS.md`;
- `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`;
- `.ai/policy/goals/FFH-003_REVALIDATION_ADDENDUM.md`;
- `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md`;
- `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`;
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`;
- closed FFH-013 evidence needed to verify M01/capacity preservation.

Do not reopen accepted policy merely because an alternate design is preferable. Escalate only a material implementation/policy conflict or internal policy impossibility.

## Fresh independent audit lanes

Technical / Mathematical branch:
`audit/ffh-017-technical-c009a8c2`

Financial Policy / Scenario branch:
`audit/ffh-017-policy-c009a8c2`

Both lanes:
- start from the same Manager control-plane packet checkpoint;
- audit only exact frozen financial target `c009a8c22d92715696018c7089eb5ad1a79a3cf1`;
- must be fresh and independent;
- must not rely on the Manager acceptance verdict as proof;
- must not rely on, copy, or wait for the other auditor's conclusion;
- may use prior findings only as closure requirements/evidence;
- must return exact report path, report commit, handoff commit, findings, and final verdict.

Allowed verdicts exactly:
- PASS
- PASS WITH NON-BLOCKING FINDINGS
- FAIL — REMEDIATION REQUIRED

Finding severities:
- CRITICAL
- HIGH
- MEDIUM
- LOW

Manager retains audit reconciliation and final closure/remediation authority.
