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

Verified FFH-002 reconciliation checkpoint: `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe`.

At that checkpoint, Phase 5 was verified 186 commits ahead and 0 behind `main`, with current `main` as merge base. Foundation CI #245 completed successfully on that exact reconciliation SHA.

After FFH-002, four role-owned documentation-only commits persisted Engineering/Policy/Regulatory handoffs. The last specialist head before Manager synthesis was `f6a138e78083afe6bdf83bc42117c705bda9ca09`. Comparison from the reconciliation checkpoint to that head showed only `.ai` documentation changes and no production file changes. Foundation CI #249 completed successfully on `f6a138e78083afe6bdf83bc42117c705bda9ca09`.

Manager has now begun canonical synthesis commits after that specialist checkpoint. Do not assume a post-Manager-synthesis CI result unless it is explicitly observed.

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

Classification: IMPLEMENTED BUT NOT MERGE-READY. Branch freshness is now reconciled, but known regulatory correctness/modeling findings remain and required independent audits have not yet been completed on the eventual final implementation checkpoint.

## Phase 5A

Repository documentation and tests cover a Hybrid Retirement Floor separating legal contribution capacity from protected planning-policy retirement saving.

Classification: IMPLEMENTED / REQUIRES FINAL INTEGRATED AUDIT BEFORE MERGE.

## Phase 5B

Repository documentation and tests cover Goal Intelligence as derived deterministic evidence. It does not itself alter Build allocation economics.

Classification: IMPLEMENTED / REQUIRES FINAL INTEGRATED AUDIT BEFORE MERGE.

## Phase 5C

FFH-003 Goals Policy and FFH-004 Retirement Policy independently completed. FFH-005 supplied current 2026 statutory research. Manager synthesis is recorded in `FFH-D004`.

Classification: POLICY APPROVED, NOT YET IMPLEMENTATION-AUTHORIZED.

Why implementation is not yet authorized: FFH-005 identified pre-existing retirement/HSA correctness issues that must be addressed or explicitly resolved before adding further Phase 5 engine behavior.

## FFH-PW-001 status

`FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery`: COMPLETE.

Completed tasks:
- FFH-002 — branch freshness reconciliation: COMPLETE; Manager accepts branch freshness as satisfied. The literal local `npm run verify` wrapper was not observed, but every constituent command plus production dependency audit passed in Foundation CI #245 on the exact reconciliation checkpoint; this is treated as a non-blocking validation variance for FFH-002. A literal `npm run verify` invocation should be required on the next production Engineering task where tooling permits.
- FFH-003 — Goals Policy: COMPLETE.
- FFH-004 — Retirement Policy: COMPLETE.
- FFH-005 — Regulatory Research: COMPLETE.

## Current verified regulatory findings from FFH-005

FFH-005 verified core 2026 retirement/HSA constants against authoritative IRS sources and identified four material repository findings:

### R1 — SIMPLE higher-limit age-50 catch-up mismatch candidate
High confidence. Current logic appears to pair the certain-applicable-SIMPLE higher base with the ordinary $4,000 age-50 catch-up instead of the distinct 2026 $3,850 catch-up outside the 60–63 band. Potential overstatement: $150.

### R2 — governmental 457(b) Roth catch-up rule not applied
High confidence. Current evaluator appears not to apply the 2026 high-wage Roth catch-up requirement to governmental 457(b) age-based catch-up opportunities.

### R3 — HSA annual eligibility boolean is insufficient for all statutory full-year capacity cases
High confidence modeling/data gap. HSA eligibility is month-sensitive and Medicare/last-month-rule facts can change annual capacity. Current persisted inputs do not clearly establish those facts.

### R4 — HSA ordinary-versus-catch-up YTD attribution blocker is a conservative product choice, not a verified statutory requirement
High confidence classification finding. Current conservative blocking may remain a product choice, but it must not be described as required by external law.

Manager classification:
- R1: MERGE-BLOCKING correctness issue pending Engineering remediation/semantic confirmation.
- R2: MERGE-BLOCKING correctness issue pending Engineering remediation.
- R3: MERGE-BLOCKING modeling/data-contract issue pending Policy + Application/Data resolution and implementation.
- R4: POLICY/MODELING decision required before final audit; not independently a proven statutory defect.

## Validation state

Repository scripts define:
- `npm test`
- `npm run test:security`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run verify`

Foundation CI also runs production dependency audit.

Verified recent CI:
- #245 SUCCESS on `36ecdde46b7c149bf47ccd9d4e2b082af6aa9cfe` (freshness reconciliation checkpoint).
- #249 SUCCESS on `f6a138e78083afe6bdf83bc42117c705bda9ca09` (specialist documentation head; production code unchanged from reconciliation checkpoint).

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
- person/month-level HSA eligibility semantics remain unresolved through FFH-PW-002.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine

Milestone status: ACTIVE / NOT MERGE READY

Completed parallel wave: `FFH-PW-001`

Next active wave: `FFH-PW-002 — Retirement statutory remediation + HSA legal-capacity semantics`.

Immediate needs:
1. Core Engine Engineering remediates/validates R1 and R2 only (FFH-006).
2. Retirement Policy defines approved HSA legal-capacity semantics for R3/R4 (FFH-007).
3. Application/Data Engineering independently maps the minimum persistence/runtime contract required to support safe HSA semantics, analysis-only pending policy (FFH-008).
4. Manager synthesizes FFH-007/008 and authorizes HSA implementation.
5. Only after known statutory/modeling blockers are cleared should Phase 5C production implementation begin from FFH-D004.
6. Final Technical and Policy audits run independently on the completed integrated Phase 5 checkpoint before merge.
