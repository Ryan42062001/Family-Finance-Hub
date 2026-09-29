# FFH-017 Frozen Audit Packet — `5c96b993`

Packet ID: `FFH-017-5c96b993-2026-09-18`

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition  
Workflow: V3.1  
Audit target state: FROZEN / AUDIT_READY — R05/R06 CLOSURE TARGET  
Execution mode for each audit lane: `STANDARD_CHAT_HIGH`

## Exact frozen implementation target

`5c96b99373c7c2593fbbb5766b109347f1588fcd`

Audit this exact integration SHA only. Later Manager/control-plane commits are not part of the financial implementation target.

Historical failed targets remain immutable evidence and must not be substituted:
- `9d3a880e02365b4445b8070344c72c928ca34511`
- `90a31c755ea88310e58bb9e06ade60af73e182f5`
- `c009a8c22d92715696018c7089eb5ad1a79a3cf1`

## Manager acceptance / integration evidence

R05/R06 remediation PR:
#32 — `FFH-017: remediate R05/R06 locality`

Production/test checkpoint:
`23b6001f62eab6473c4ae812e015fd259c0f9c40`

Reviewed green PR head:
`bbf47aab27a1c01f986ca6807ca5218a7e8d2c1b`

Foundation CI on reviewed green PR head:
- run `35304988906`
- job `105475235450`
- conclusion: SUCCESS

Manager acceptance commit:
`22edf52663102469c9b2cf2baa6b2ba7dde76ed4`

Final PR head after documentation-only acceptance-index sync:
`be34ce35b64d0a0512b8913e2d65fa779d013db7`

Integration SHA / frozen target:
`5c96b99373c7c2593fbbb5766b109347f1588fcd`

Manager compare of final PR head -> integration reports **zero changed files**.

Exact integration Foundation CI:
- run `35305470058`
- job `105476660670`
- run #665
- conclusion: SUCCESS
- runner: repository-scoped `FFH-Windows-Runner`
- AI-state validation: PASS
- production dependency audit: 0 vulnerabilities
- calculations: 914 tests / 914 pass / 0 fail
- security: 21 tests / 21 pass / 0 fail
- typecheck: PASS
- lint: PASS
- build: PASS

Green CI is evidence, not proof. Each auditor must independently inspect the frozen implementation and required financial/policy boundaries.

## Exact blocking history to close

Both fresh closure audits of prior frozen target `c009a8c2...` failed, but on **two distinct locality defects**.

Technical:
- `TMA-017-06` — HIGH / BLOCKING
- confirmed, non-legacy `necessity = unknown` could later resolve Essential and become a financially senior OUTRANK claimant, but R04 excluded that state from potential-OUTRANK reservation.

Financial Policy:
- `FFH-017-P03` — MEDIUM / BLOCKING
- after Bucket-1 handling, the blanket material-missing return froze retirement/lower-bucket dollars even when their monetary result was invariant under every supported resolution.

The prior auditors explicitly cleared:
- R02 exact non-tied annual/monthly retirement reconciliation;
- R03 desired/excess recurring tranche routing;
- R04 Essential-peer bounded OUTRANK behavior aside from TMA-017-06;
- Financial Engine Reconciliation mechanics;
- protected FFH-013 M01.

Do not reopen those cleared areas absent actual regression evidence.

## R05 required semantics — unresolved necessity as potential OUTRANK

A confirmed, non-legacy material goal whose current necessity is `unknown` must be treated as a potential Essential/OUTRANK peer when the remaining authoritative facts permit that supported resolution.

Required:
- use possible Essential status only as internal conservative bounding evidence;
- do not assign unknown necessity as authoritative fact;
- do not invent core amount or recurring pace;
- reserve only capacity whose Bucket-1 owner/order can actually change;
- preserve locality when known urgency/harm facts prove OUTRANK impossible.

### Required direct R05 adversaries

1. Known Essential / Fixed / High OUTRANK A requesting $200 + confirmed non-legacy B with necessity Unknown, Fixed/Critical, known $200 core pace + $200 capacity:
   - A must receive no definite contested $200 before B's necessity resolves.

2. Necessity-unknown B whose known urgency/harm facts make OUTRANK impossible:
   - independent known OUTRANK A may proceed.

3. Partial-independent scarce Bucket-1 boundary remains bounded:
   - e.g. $250 capacity, known High request $200, stronger unresolved potential claimant capped at $100;
   - no more than $150 may be definite for the known goal;
   - $100 remains unresolved.

4. Important, Optional, legacy-unconfirmed, and provably lower-ranked states remain local according to accepted V1 policy.

## R06 required semantics — invariant lower-bucket locality

After Bucket-1 independent allocations, missing facts block only lower-bucket dollars whose owner/share can actually change under supported resolutions.

Required:
- reserve supported unresolved potential-OUTRANK demand before lower buckets;
- account for bounded unresolved potential-CO_PRIORITY demand;
- allow verified retirement / known co-priority dollars only when their amounts are invariant under every supported resolution;
- leave genuinely contested co-priority/retirement capacity unresolved;
- preserve unresolved tranche disposition as `MORE_INFORMATION_NEEDED`;
- do not invent nature, necessity, amount, pace, or cross-domain classification.

### Required direct R06 adversaries

1. Capacity $500, known OUTRANK $200, retirement request $100, unresolved Important goal with known $100 pace and only nature unknown:
   - retirement receives invariant $100;
   - unresolved goal remains `MORE_INFORMATION_NEEDED`.

2. No-OUTRANK form: capacity $600, retirement request $500, unresolved Important goal with known $100 pace and only nature unknown:
   - retirement receives invariant $500.

3. Scarce possible-CO_PRIORITY form: capacity $500, retirement request $500, unresolved Important goal with known $100 pace and a supported CO_PRIORITY resolution:
   - retirement share can change by resolution;
   - contested retirement remains unresolved/fail-closed.

4. Mixed unresolved senior-demand form:
   - unresolved potential OUTRANK reserves its full supported maximum before testing lower-bucket invariance;
   - lower-bucket dollars may proceed only from the remaining demonstrably independent capacity.

5. Below-only locality:
   - a known BELOW allocation may consume only capacity proven independent of a stronger unresolved below-only claimant;
   - do not globally freeze unrelated residual capacity.

## Production/test scope of R05/R06

Production:
- `lib/calculations/money-priority-build-competition.ts`

Direct R05/R06 test:
- `lib/calculations/ffh-017-audit-remediation.test.ts`

Auditors may inspect any frozen-tree file needed to verify correctness. They may not silently switch the audited checkpoint.

## R02 preservation — do not redesign

Required preserved behavior includes:
- $0.06 annual room -> $0.00/month;
- $0.12 -> $0.01/month;
- $0.13 -> $0.01/month with $0.01 annual residual;
- no epsilon/tolerance;
- no hidden residual clamp.

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

## R04 preservation

Preserve the already-cleared R04 behavior:
- stronger unresolved Essential potential-OUTRANK peer reserves contested Bucket-1 capacity;
- provably non-OUTRANK Essential uncertainty does not suppress independent known OUTRANK;
- senior known OUTRANK proceeds ahead of a lower-ranked unresolved potential claimant;
- reserve no more than the supported maximum possible request;
- no unknown amount/pace is funded as fact.

R05 extends the potential-OUTRANK dimensions to supported unresolved necessity; it must not weaken R04.

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
`audit/ffh-017-technical-5c96b993`

Financial Policy / Scenario branch:
`audit/ffh-017-policy-5c96b993`

Both lanes:
- start from the same Manager control-plane packet checkpoint;
- audit only exact frozen financial target `5c96b99373c7c2593fbbb5766b109347f1588fcd`;
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
