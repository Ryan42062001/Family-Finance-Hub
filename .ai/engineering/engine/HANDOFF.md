# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Role: Core Financial Engine Engineer
Status: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Branch: `ffh/ffh-017-r05-r06-locality-remediation`
Pull request: #32 — draft / open / unmerged
Approved milestone branch: `phase-5-money-priority-engine`
Manager routing / base checkpoint: `ee8310a714d52a0ff0fae305dcbbb6e5c41f9463`

Historical failed frozen targets:
- `9d3a880e02365b4445b8070344c72c928ca34511`
- `90a31c755ea88310e58bb9e06ade60af73e182f5`
- `c009a8c22d92715696018c7089eb5ad1a79a3cf1`

PRODUCTION_SHA: `23b6001f62eab6473c4ae812e015fd259c0f9c40`
FINAL_VALIDATION_SHA: `23b6001f62eab6473c4ae812e015fd259c0f9c40`
VALIDATED_CI: Foundation CI run `35304758354`, job `105474563283` — SUCCESS
HANDOFF_SHA: This documentation/control-plane commit; exact SHA is the commit containing this handoff
INTEGRATION_SHA: Not yet established for R05/R06
MANAGER_VERDICT: PENDING
AUDIT_STATUS: REQUIRED — new Manager-frozen target + fresh independent closure audit after acceptance/integration

## Assigned findings

R05 / `TMA-017-06` HIGH:
confirmed non-legacy necessity-unknown material goals can resolve Essential and enter OUTRANK, so Bucket-1 ownership must remain unresolved when that supported resolution can change ordering.

R06 / `FFH-017-P03` MEDIUM:
post-Bucket-1 missing information may block only dollars whose result can actually change; invariant retirement/lower-bucket dollars must remain actionable.

## Work completed

Production scope:
- `lib/calculations/money-priority-build-competition.ts`

Direct-test scope:
- `lib/calculations/ffh-017-audit-remediation.test.ts`

### R05

Potential-OUTRANK detection now includes confirmed/non-legacy `necessity = unknown` when known urgency/harm facts permit an Essential OUTRANK resolution.

The conservative strongest-ordering clone resolves necessity to Essential only for internal bounding. The authoritative tranche stays `MORE_INFORMATION_NEEDED`; no classification, core amount, or pace is invented.

Required adversary passes:
- known Essential/Fixed/High $200;
- confirmed necessity-unknown Fixed/Critical peer with known $200 core pace;
- $200 capacity;
- known High receives $0 definite contested dollars.

Negative control passes:
- necessity-unknown Flexible/Low/none peer cannot become OUTRANK;
- independent known OUTRANK proceeds.

### R06

The blanket material-missing lower-bucket freeze is replaced by supported-resolution invariance analysis.

The allocator conservatively classifies the highest bucket each unresolved material goal can reach:
- potential OUTRANK demand is reserved before lower buckets;
- non-OUTRANK potential CO_PRIORITY demand is included at its bounded maximum;
- verified retirement/known CO_PRIORITY dollars proceed only when all such senior demand fits, so their amount is identical under every supported resolution;
- if scarcity lets a missing fact change the retirement/co-priority share, those dollars remain unresolved;
- BELOW allocations use only residual capacity proven independent of unresolved senior buckets and stronger below-only peers.

Required direct scenarios pass:
1. $500 capacity / OUTRANK $200 / retirement $100 / unresolved Important $100 nature-unknown => retirement $100;
2. $600 capacity / retirement $500 / unresolved Important $100 nature-unknown => retirement $500;
3. $500 capacity / retirement $500 / unresolved Important $100 possible CO_PRIORITY => retirement $0 fail-closed.

Unresolved tranche disposition remains `MORE_INFORMATION_NEEDED`.

## Exact validation evidence

Foundation run `35304758354`, job `105474563283` on exact production/test SHA `23b6001f62eab6473c4ae812e015fd259c0f9c40`:

- AI-state validation PASS;
- production dependency audit: 0 vulnerabilities;
- calculations: 914/914 PASS;
- security: 21/21 PASS;
- typecheck PASS;
- lint PASS;
- build PASS.

CI directly reports all R04, R05, R06, R02, R03, and FFH-013 M01 named regressions PASS.

## Preservation

R04 Bucket-1 behavior remains green:
- stronger unresolved Essential potential OUTRANK reserves contested capacity;
- provably non-OUTRANK Essential uncertainty remains local;
- senior known OUTRANK remains actionable ahead of lower-ranked unresolved peer;
- bounded unresolved demand reserves no more than its maximum.

R02 remains exact:
- $0.06 annual room => $0.00/month;
- adjacent cent boundaries remain green;
- no epsilon/tolerance or hidden residual clamp.

R03 remains exact:
- core and desired excess stay distinct;
- desired excess remains BELOW retirement;
- Scenario-8 passes;
- $600 core + $400 retirement + $600 desired excess = $1,600 exactly.

Protected FFH-013 M01 remains exact:
- shared annual room $10,000.01;
- conditional owner room $7,500 each;
- Build authority $833.33/month;
- routes $416.67 + $416.66;
- annual legal consumption $9,999.96;
- shared annual remainder $0.05.

## Financial Engine Reconciliation Gate

Preserved:
- integer monthly-cent authority;
- exact aggregate allocation + residual reconciliation;
- exact aggregate retirement -> destination reconciliation;
- exact annual/monthly retirement consumption;
- no epsilon/tolerance waiver;
- no positive residual clamp;
- deterministic final-cent handling;
- no shared/owner/scheduled/staged capacity reuse.

## Branch / scope safety

The assigned branch started exactly from Manager/milestone checkpoint:
`ee8310a714d52a0ff0fae305dcbbb6e5c41f9463`

The milestone remained at that exact checkpoint through production validation.

PR #32 production/test diff contains exactly the two R05/R06 files above. This final worker return adds only the FFH-017 task/index/worklog/handoff control-plane documentation required to record `READY_FOR_MANAGER`.

No schema, UI, Supabase/live-data, HSA, SIMPLE, workplace-retirement, FFH-D004, closed FFH-013 policy, or Phase 6 behavior changed.

## Remaining blocker / exact next action

Worker blocker: NONE.

Manager / Architect should independently review PR #32, changed scope, R05/R06 adversarial behavior, exact reconciliation evidence, and CI. If accepted, Manager owns merge/integration, exact `INTEGRATION_SHA`, the new frozen target/packet, required fresh independent closure audits, audit reconciliation, and final closure.

READY_FOR_MANAGER
