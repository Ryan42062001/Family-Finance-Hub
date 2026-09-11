# Family Finance Hub — Canonical Roadmap

Last refreshed: 2026-09-10

## Product vision

Family Finance Hub is a private-first household financial planning application that helps a household understand current finances and decide what to do with the next dollar.

Long-term differentiators include the Money Priority Engine, Household Financial Roadmap, Paycheck Planner, and Scenario Lab.

## Phase status

- Phase 1 — Secure Foundation: COMPLETE
- Phase 2 — Household Financial Profile: COMPLETE
- Phase 3 — Dashboard: COMPLETE
- Phase 4 — Planning Tools: COMPLETE on stable `main`
- Phase 5 — Money Priority Engine: ACTIVE on PR #5; NOT MERGE READY / NOT MERGED
- Phase 6 — Scenario Lab: PLANNED / NOT STARTED
- Phase 7 — Private Beta: PLANNED / NOT STARTED

## Phase 5 approved policy

- Phase 5A Hybrid Retirement Floor: IMPLEMENTED; final integrated audit required.
- Phase 5B Goal Intelligence: IMPLEMENTED; final integrated audit required.
- Phase 5C recurring goal-versus-retirement competition: APPROVED as FFH-D004; implementation task FFH-017 is queued after retirement-capacity stabilization.
- HSA legal-capacity/data contract: APPROVED as FFH-D005.
- MFJ spousal-IRA scarce-compensation capacity: APPROVED as FFH-D006.
- Workflow V2 operating model: APPROVED as FFH-D007.

## Completed waves / tasks

### FFH-PW-001 — Phase 5 stabilization + Phase 5C policy discovery
COMPLETE.

### FFH-PW-002 — Retirement statutory remediation + HSA policy/data analysis
COMPLETE AT POLICY/ANALYSIS GATE.

- FFH-006: R2 remediated; R1 stopped correctly at persisted-field ambiguity.
- FFH-007: HSA policy complete.
- FFH-008: HSA persistence/runtime analysis complete.
- FFH-D005 approved.

### FFH-009 — Spousal-IRA scarce-compensation policy
COMPLETE / synthesized as FFH-D006.

### FFH-010 — HSA persistence + normalized input contract
Owner: Application, Data & Integration Engineer
Status: COMPLETE / MANAGER ACCEPTED
Accepted production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4`
Validation: Foundation CI #300 SUCCESS on exact production checkpoint.
Remaining boundary: actual linked/live Supabase migration application, PostgREST/RLS behavior, and browser/runtime parity are tracked by active FFH-016.

### FFH-011 — SIMPLE persisted-field contract
Owner: Application, Data & Integration Engineer
Status: COMPLETE / MANAGER ACCEPTED
Accepted/in-place integration checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`.
Foundation CI #348 on the exact checkpoint returns the branch to the 54-failure FFH-012 baseline after the one incremental FFH-011 SIMPLE regression was removed. Full downstream security/typecheck/lint/build were skipped by fail-fast and remain future integration-validation gates.
Live SIMPLE migration/runtime parity is now in FFH-016. Core statutory SIMPLE formula consumption remains FFH-015.

### FFH-014 — Workflow V2 operating-system upgrade
Owner: Manager / Architect
Status: CLOSED
Result: FFH-D007 adopted; task files, explicit checkpoints, event-driven Manager, isolated future task branches, CI ownership, escalation, and compact role bootstrapping are canonical.

## Active wave — FFH-PW-003

Status: ACTIVE

### FFH-012 — HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
State: REMEDIATION
Isolated Core candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Foundation CI #308: FAILURE with 54 task-owned HSA-related calculation failures; the same failure count remains after FFH-011 remediation at CI #348.
Next gate: focused FFH-D005 owner remediation, exact validation, current FFH-012 handoff, READY_FOR_MANAGER.

### FFH-016 — Live Supabase migration/runtime parity verification
Owner: Application, Data & Integration Engineer
State: ACTIVE / VERIFICATION-ONLY PRE-MERGE GATE
Scope: accepted FFH-010 HSA migration/contract plus accepted FFH-011 SIMPLE migration/contract.
Execution mode: WORK_MODE_HIGH_VALUE; normal-chat fallback is valid.
Next gate: reproducible live migration/PostgREST/RLS/persistence/runtime/browser evidence, current App/Data handoff, READY_FOR_MANAGER.

## Queued work

### FFH-013 — Spousal-IRA shared compensation ledger
Owner: Core Financial Engine Engineer
State: QUEUED
Gate: FFH-012 acceptance unless Manager explicitly proves a safer reorder.

### FFH-015 — Narrow R1 SIMPLE Core remediation
Owner: Core Financial Engine Engineer
State: QUEUED
Dependency status: FFH-011 Manager acceptance SATISFIED.
Gate: collision-safe Core scheduling while FFH-012 is active. Manager will choose FFH-015 versus FFH-013 order after the FFH-012 event from the exact overlap state.

### FFH-017 — Phase 5C implementation
Owner: Core Financial Engine Engineer
State: QUEUED / POLICY APPROVED
Gate: retirement-capacity blockers stable and Manager explicitly activates implementation.

### FFH-018 — Documentation-only CI efficiency hardening
Owner: Product & Technical R&D Engineer for discovery/design
State: QUEUED
Gate: current red remediation wave stable. Goal is to reduce docs-only full-CI churn without weakening required production validation.

## Current merge blockers

- FFH-012 HSA legal-capacity remediation.
- FFH-013 spousal-IRA production remediation.
- FFH-015 Core SIMPLE formula remediation.
- FFH-016 live Supabase/runtime parity gate.
- FFH-017 Phase 5C implementation.
- full branch validation once calculation failures no longer prevent downstream checks.
- final Technical & Mathematical Audit.
- final Financial Policy & Scenario Audit.

R2 is remediated but remains subject to integrated audit. PR #5 description/status documentation is stale and must be refreshed before final merge review.

## Expected sequence

1. Core performs focused FFH-012 remediation while App/Data executes FFH-016 in parallel.
2. Manager reviews either task only when it reaches READY_FOR_MANAGER, BLOCKED, or escalation.
3. After FFH-012 acceptance, choose a collision-safe order for FFH-015 and FFH-013; do not run overlapping Core implementations concurrently by default.
4. Complete both FFH-015 and FFH-013 with Manager integration/validation.
5. Stabilize retirement-capacity surfaces, then activate FFH-017 Phase 5C.
6. Use FFH-018 later to improve CI efficiency after the current red evidence is stabilized; do not modify CI mid-remediation merely to suppress red runs.
7. Run required independent Technical & Mathematical and Financial Policy & Scenario audits on stable integrated work.
8. Remediate blocking audit findings.
9. Refresh PR #5 description and evaluate merge gate; merge only if clean.
10. Verify post-merge CI and reconcile canonical state.

Do not pre-authorize Phase 5D–5G production work from prior chat discussion.

## Phase 6 — Scenario Lab

PLANNED / NOT STARTED. Remains downstream of an accepted Phase 5 recommendation engine. Future Phase 6 production should use smaller Workflow V2 milestone/task branches rather than repeating the single very-large-PR pattern where practical.

## Phase 7 — Private Beta

PLANNED / NOT STARTED. Includes household onboarding/invitations, recovery, security review, accessibility/mobile polish, and feedback collection.
