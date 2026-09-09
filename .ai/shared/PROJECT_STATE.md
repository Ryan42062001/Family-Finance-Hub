# Family Finance Hub — Project State

Last refreshed: 2026-09-08

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`

Default/canonical branch: `main`

Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`

Active development branch: `phase-5-money-priority-engine`

Open PR:
- PR #5 — `Phase 5: Money Priority Engine`
- base: `main`
- head: `phase-5-money-priority-engine`
- state: OPEN
- merged: false
- mergeable: true when last checked

Current verified Phase 5 branch head before this state refresh: `71705039f0abf1945202631109975edeb5632920`.

Current branch comparison:
- ahead of `main`: 211 commits
- behind `main`: 0 commits
- merge base: current `main` SHA `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`

Verified FFH-002 reconciliation checkpoint: `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`.

At that checkpoint, Phase 5 was verified ahead of and 0 behind `main`, with current `main` as merge base. Foundation CI #245 completed successfully on that exact reconciliation SHA.

After FFH-002, specialist/Manager documentation advanced the branch while preserving production code. Foundation CI #249 completed successfully on specialist head `f6a138e78083afe6bdf83bc42117c705bda9ca09`. Foundation CI #269 completed successfully on Manager checkpoint `71705039f0abf1945202631109975edeb5632920`.

## Stable product state on main

`main` contains the completed foundation, household financial profile, dashboard, and Phase 4 planning tools.

Classification: IMPLEMENTED AND VERIFIED on stable `main` to the extent supported by merged repository history and CI evidence.

## Active Phase 5 product state

Phase 5 is not merged to `main`.

The Phase 5 branch contains repository evidence for:
- Stabilize / Secure / Build / Optimize priority flow;
- existing-cash deployment and residual-needs reconciliation;
- committed-expense handling;
- employer-match and debt prioritization;
- student-loan policy handling;
- ordinary and exceptional emergency reserves;
- goal ranking and two-pass Build behavior;
- retirement projection, account routing, and legal-capacity ledgers;
- HSA household/couple capacity handling and uncertainty propagation;
- Recommended Plan versus Your Plan;
- Windfall Mode;
- Home and Vehicle affordability through authoritative hypothetical reruns;
- Recommendation Refresh / material-profile-change logic;
- strict snapshot numeric/boolean validation;
- Phase 5A Hybrid Retirement Floor;
- Phase 5B Goal Intelligence.

Classification: IMPLEMENTED BUT NOT MERGE-READY. Branch freshness is reconciled, but known retirement/HSA legal-capacity correctness/modeling findings remain and required independent audits have not yet been completed on the eventual final implementation checkpoint.

## Phase 5A

Classification: IMPLEMENTED / REQUIRES FINAL INTEGRATED AUDIT BEFORE MERGE.

## Phase 5B

Classification: IMPLEMENTED / REQUIRES FINAL INTEGRATED AUDIT BEFORE MERGE.

## Phase 5C

FFH-003 Goals Policy and FFH-004 Retirement Policy independently completed. FFH-005 supplied current 2026 statutory research plus revalidation. Manager synthesis is recorded in `FFH-D004`, including the later FFH-003 revalidation clarifications on multi-OUTRANK scarcity, user-priority boundaries, and recommendations-not-execution.

Classification: POLICY APPROVED, NOT YET IMPLEMENTATION-AUTHORIZED.

## FFH-PW-001 status

`FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery`: COMPLETE.

- FFH-002 — branch freshness reconciliation: COMPLETE. Literal local `npm run verify` wrapper was not observed, but every constituent command plus production dependency audit passed in Foundation CI #245 on the exact reconciliation checkpoint. Manager treats this as a non-blocking validation variance for FFH-002; next production Engineering work must run the literal wrapper when tooling permits.
- FFH-003 — Goals Policy: COMPLETE / REVALIDATED.
- FFH-004 — Retirement Policy: COMPLETE / CLOSED BY FFH-D004.
- FFH-005 — Regulatory Research: COMPLETE / REVALIDATED.

## Current verified regulatory/modeling findings

### R1 — SIMPLE higher-limit age-50 catch-up mismatch candidate
High confidence. Current logic appears to pair the certain-applicable-SIMPLE higher base with the ordinary $4,000 age-50 catch-up instead of the distinct 2026 $3,850 catch-up outside the 60–63 band. Potential overstatement: $150.

Manager classification: MERGE-BLOCKING correctness issue pending FFH-006 semantic confirmation/remediation.

### R2 — governmental 457(b) Roth catch-up rule not applied
High confidence. Current evaluator appears not to apply the 2026 high-wage Roth catch-up requirement to governmental 457(b) age-based catch-up opportunities.

Manager classification: MERGE-BLOCKING correctness issue pending FFH-006 remediation.

### R3 — HSA annual eligibility boolean insufficient for all full-year statutory-capacity cases
High confidence data/model gap. HSA eligibility/coverage can be month-sensitive; Medicare and last-month-rule facts can alter capacity. Current persisted inputs do not clearly establish full-year capacity in every case.

Manager classification: MERGE-BLOCKING modeling/data-contract issue pending FFH-007 + FFH-008 synthesis and later implementation.

### R4 — HSA ordinary-versus-catch-up YTD attribution blocker is project modeling, not verified statutory labeling requirement
High confidence classification finding. Current conservative blocker may remain as FFH policy, but must be deliberately classified/justified rather than described as required by law.

Manager classification: POLICY/MODELING decision required through FFH-007 before final audit.

### R6 — MFJ spousal-IRA scarce-compensation allocation is modeled as fixed owner-ID split
High confidence revalidation finding. Current path can conservatively allocate scarce joint compensation sequentially by sorted owner ID before presenting per-owner room, while the spousal-IRA statutory formula depends on joint compensation reduced by the other spouse's actual IRA contributions rather than a permanent first-owner/second-owner legal-capacity split.

Impact: aggregate modeled IRA room is not shown to exceed represented joint compensation, but one spouse's legally possible room can be understated and a deterministic engineering allocation can be mistaken for statutory owner-specific capacity.

Manager classification: MERGE-BLOCKING legal-capacity representation/policy issue. Requires a separate Retirement Policy decision and later Engineering remediation; do not silently fold into FFH-006 because FFH-006 is already scoped to R1/R2.

## Validation state

Repository scripts define `npm test`, `npm run test:security`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run verify`. Foundation CI also runs production dependency audit.

Verified recent CI:
- #245 SUCCESS on `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`.
- #249 SUCCESS on `f6a138e78083afe6bdf83bc42117c705bda9ca09`.
- #269 SUCCESS on `71705039f0abf1945202631109975edeb5632920`.

No audit verdict is inferred from CI success.

## Architecture summary

Financial calculation architecture:
- pure TypeScript calculation modules under `lib/calculations/`;
- deterministic Money Priority modules/tests;
- strict normalized household snapshot boundary;
- derived retirement-capacity ledger;
- separate one-time and recurring allocation concepts;
- hypothetical reruns for Home/Vehicle.

Persistence/application architecture:
- Next.js application;
- Supabase persistence;
- household-scoped RLS;
- migrations under `supabase/migrations/`;
- snapshot/persistence support under `lib/supabase/`.

## Known deferred/model boundaries

- special 403(b) 15-years-of-service catch-up is not granted without required plan/service/prior-use facts;
- governmental 457(b) special last-three-years catch-up is not granted without required plan normal-retirement-age/prior-deferral facts;
- precise unrelated-employer sponsor grouping remains conservative when sponsor identity is unavailable;
- person/month-level HSA eligibility semantics remain unresolved through FFH-PW-002;
- spousal-IRA scarce-compensation owner allocation remains unresolved through queued FFH-009.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine

Milestone status: ACTIVE / NOT MERGE READY

Completed parallel wave: `FFH-PW-001`

Active wave: `FFH-PW-002 — Retirement statutory remediation + HSA legal-capacity semantics`.

Active tasks:
1. FFH-006 — Core Engine: ASSIGNED / no FFH-006 completion handoff observed. Current Core Engine handoff still closes FFH-002 and instructs the role to begin FFH-006 on its next continuation.
2. FFH-007 — Retirement Policy: ASSIGNED / no FFH-007 completion handoff observed. Current Retirement Policy handoff still closes FFH-004 and identifies FFH-007 as the next task.
3. FFH-008 — Application/Data: ASSIGNED / no FFH-008 completion handoff observed. `.ai/engineering/app/HANDOFF.md` does not yet exist on the current branch.

Queued task:
4. FFH-009 — Retirement Policy: define spousal-IRA scarce-compensation/legal-capacity semantics for R6 after FFH-007, because the same specialist owns both policy questions.

Next sequence:
- execute and complete FFH-006/007/008;
- Manager synthesize FFH-007/008 and authorize HSA implementation;
- complete FFH-009 and authorize any IRA remediation;
- clear R1/R2/R3/R6 production blockers;
- implement approved Phase 5C policy from FFH-D004 when overlapping Core Engine work is stable;
- run independent Technical and Policy audits on the integrated checkpoint before merge.
