# Family Finance Hub — Project State

Last refreshed: 2026-09-08

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`

Canonical branch: `main`
Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`

Active development branch: `phase-5-money-priority-engine`
PR #5 — `Phase 5: Money Priority Engine`
- state: OPEN
- merged: false
- draft: false
- mergeable: true when last checked

Verified pre-synthesis Phase 5 head: `60de76c449bae1128908292f2efa24bb7cbd971d`.
At that head the branch was 220 commits ahead and 0 behind `main`, with current `main` as merge base. Foundation CI #277 completed SUCCESS on that exact head.

FFH-006 exact production/test checkpoint: `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`; Foundation CI #274 SUCCESS.

Manager HSA synthesis decision FFH-D005 was then persisted as a documentation-only descendant. Later Manager documentation heads must be rechecked before claiming exact-head CI.

## Stable product state on main

`main` contains completed Foundation, Household Financial Profile, Dashboard, and Phase 4 Planning Tools.

## Active Phase 5 state

Phase 5 remains implemented on PR #5 but NOT MERGE READY.

Implemented branch capabilities include the authoritative Stabilize/Secure/Build/Optimize flow, existing-cash and residual reconciliation, committed-expense handling, employer-match/debt/student-loan/reserve policy, goal ranking, retirement projection/legal-capacity ledger, Recommended Plan vs Your Plan, Windfall, Home/Vehicle hypothetical reruns, Recommendation Refresh, strict snapshot normalization, Phase 5A Hybrid Retirement Floor, and Phase 5B Goal Intelligence.

Phase 5A: IMPLEMENTED / FINAL INTEGRATED AUDIT REQUIRED.
Phase 5B: IMPLEMENTED / FINAL INTEGRATED AUDIT REQUIRED.
Phase 5C: POLICY APPROVED under FFH-D004 / PRODUCTION IMPLEMENTATION NOT YET AUTHORIZED.

## Completed waves

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
Status: COMPLETE
- FFH-002 branch reconciliation: COMPLETE
- FFH-003 Goals Policy: COMPLETE / REVALIDATED
- FFH-004 Retirement Policy: COMPLETE / CLOSED BY FFH-D004
- FFH-005 Regulatory Research: COMPLETE / REVALIDATED

### FFH-PW-002 — Retirement statutory remediation + HSA legal-capacity semantics
Status: COMPLETE AT POLICY/ANALYSIS GATE

- FFH-006 — Core Engine R1/R2 remediation: COMPLETE WITH R1 SEMANTIC BLOCKER
  - R2 governmental 457(b) high-wage Roth catch-up rule: REMEDIATED
  - R2 production commit: `df4fbe7194aacaa04955c1901f477de0c25fb134`
  - R2 validated production/test checkpoint: `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`
  - Foundation CI #274: SUCCESS
  - R1 SIMPLE higher-limit catch-up code was intentionally NOT changed because repository persistence semantics do not prove what `simpleHigherLimitEligible` means. This is an accepted task outcome, not a fabricated pass.
- FFH-007 — HSA legal-capacity policy semantics: COMPLETE
- FFH-008 — HSA persistence/runtime contract analysis: COMPLETE
- Manager synthesis of FFH-007 + FFH-008: COMPLETE through FFH-D005

## Current regulatory/modeling findings

### R1 — SIMPLE higher-limit age-50 catch-up semantics/correctness
External fact is high-confidence: certain applicable higher-limit SIMPLE plans use a distinct $3,850 general age-50+ catch-up outside ages 60–63. Current repository field semantics do not prove that `simpleHigherLimitEligible=true` denotes exactly that statutory category.

Status: MERGE BLOCKER / DATA-CONTRACT SEMANTICS UNRESOLVED.
Next path: Application/Data must establish a safe prospective/legacy field contract before Core Engine changes the $3,850 behavior. Do not reinterpret ambiguous legacy values optimistically.

### R2 — governmental 457(b) Roth catch-up
Status: REMEDIATED by FFH-006 / AWAITING LATER INTEGRATED AUDIT.

### R3 — HSA annual/full-year modeling gap
Status: POLICY/DATA CONTRACT APPROVED through FFH-D005 / PRODUCTION IMPLEMENTATION REQUIRED.

### R4 — HSA ordinary-vs-catch-up attribution blocker
Status: POLICY RESOLVED through FFH-D005. Historical deposit labeling is not required for minimum capacity math; approved owner-ceiling model replaces the blanket blocker once spouse allocation is known. PRODUCTION IMPLEMENTATION REQUIRED.

### R6 — MFJ spousal-IRA scarce-compensation owner allocation
Status: MERGE BLOCKER / FFH-009 POLICY ACTIVE.
Current implementation can present a deterministic owner-ID split as owner-specific legal room even though the statutory feasible set depends on actual spouse contributions. Aggregate compensation is not shown to be overstated, but owner-specific feasible room can be understated.

## FFH-D005 HSA canonical direction

Approved HSA legal-capacity model:
- person + tax year is the legal-fact authority;
- month-level eligibility/coverage (or lossless equivalent) is required;
- Medicare timing and last-month-rule reliance are explicit person-year facts;
- future planning assumptions are distinguishable from confirmed facts;
- legacy account `hsa_eligible`/coverage values remain non-authoritative hints and are never auto-promoted to twelve months;
- married-family ordinary allocation defaults equally absent another agreement; alternate allocation is explicit and tax-year-bound;
- age-55 catch-up remains owner-specific;
- R4 uses owner annual ceilings plus aggregate owner employee/employer YTD;
- HSA YTD consumed for capacity must be explicitly tax-year-bound or proven equivalent;
- unknowns remain unknown and block only dependent HSA decisions;
- Application/Data establishes persistence + normalized snapshot contract first; Core Engine implements legal-capacity behavior afterward.

## Current active wave

### FFH-PW-003 — HSA contract implementation + IRA policy
Status: ACTIVE

Active:
1. FFH-009 — Retirement Policy: define R6 spousal-IRA scarce-compensation legal-capacity semantics.
2. FFH-010 — Application/Data: implement FFH-D005 HSA persistence/capture/loader/normalized snapshot contract. No Core HSA legal-capacity algorithm change in this task.

Queued:
3. FFH-011 — Application/Data: define/remediate the R1 SIMPLE higher-limit persisted field contract after FFH-010 unless Manager reorders it.
4. FFH-012 — Core Engine: implement FFH-D005 HSA legal-capacity calculation after FFH-010 establishes the normalized input contract.
5. Future Core IRA remediation task after FFH-009 Manager synthesis.
6. Phase 5C Core implementation task after retirement-capacity blockers have completed/approved implementation checkpoints and overlapping surfaces are stable.

## Validation state

Verified CI:
- #245 SUCCESS on branch-reconciliation checkpoint `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`
- #249 SUCCESS on specialist checkpoint `f6a138e78083afe6bdf83bc42117c705bda9ca09`
- #269 SUCCESS on Manager checkpoint `71705039f0abf1945202631109975edeb5632920`
- #274 SUCCESS on FFH-006 production/test checkpoint `bb5f567fb16cd6672e1ed2ec6a15ad7206a8aa64`
- #277 SUCCESS on pre-synthesis branch head `60de76c449bae1128908292f2efa24bb7cbd971d`

Literal local `npm run verify` remains unavailable in the GitHub-only execution environment used by recent workers; constituent commands plus production dependency audit were observed in CI. Future workers must not claim literal-wrapper execution unless actually observed.

No CI success is an audit verdict.

## Known deferred boundaries

- 403(b) 15-years-of-service special catch-up remains unmodeled without required plan/service/history facts.
- governmental 457(b) special last-three-years catch-up remains unmodeled without required plan retirement-age/history facts.
- precise unrelated-employer sponsor grouping remains conservative when sponsor identity is unavailable.
- contribution-event ledger is future optional architecture, not required for current HSA remediation.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine
Milestone status: ACTIVE / NOT MERGE READY
Completed waves: FFH-PW-001, FFH-PW-002
Active wave: FFH-PW-003
Active assignments: FFH-009, FFH-010
Queued assignments: FFH-011, FFH-012, later IRA remediation, later Phase 5C implementation
Tasks awaiting audit: completed integrated Phase 5 after R1/R3/R4/R6 production remediation and Phase 5C implementation

Expected sequence:
1. FFH-009 and FFH-010 run in parallel.
2. Manager synthesizes FFH-009 and issues IRA implementation if needed.
3. FFH-010 establishes HSA schema/capture/loader/snapshot contract and validation checkpoint.
4. Core Engine executes FFH-012 against that stable contract.
5. Application/Data resolves R1 field semantics through FFH-011; Core follows with a narrow R1 code task if mapping requires change.
6. Once retirement-capacity blockers are stable, implement FFH-D004 Phase 5C.
7. Run independent Technical & Mathematical Audit and Financial Policy & Scenario Audit on the integrated checkpoint.
8. Resolve findings, evaluate PR #5 merge gate, merge only if clean, then verify post-merge state.
