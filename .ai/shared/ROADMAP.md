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

## Phase 5 approved policy / workflow

- Phase 5A Hybrid Retirement Floor: IMPLEMENTED; final integrated audit required.
- Phase 5B Goal Intelligence: IMPLEMENTED; final integrated audit required.
- Phase 5C recurring goal-versus-retirement competition: IMPLEMENTED / CLOSED as FFH-017 on frozen target `c563d011...` after fresh independent Technical PASS + Policy PASS with zero findings.
- HSA legal-capacity/data contract: APPROVED as FFH-D005.
- MFJ spousal-IRA scarce-compensation capacity: APPROVED as FFH-D006.
- Workflow V2 task/integration safeguards: APPROVED as FFH-D007 and remain authoritative underneath V3.
- Workflow V3 operating overlay: APPROVED/CANONICAL through FFH-019 for five-department workforce presentation, task-scoped chats, context hygiene, and Work-mode routing/fallback.

## Completed tasks relevant to current wave

### FFH-009 — Spousal-IRA scarce-compensation policy
COMPLETE / synthesized as FFH-D006.

### FFH-010 — HSA persistence + normalized input contract
Owner: Application, Data & Integration Engineer
Status: COMPLETE / MANAGER ACCEPTED
Accepted production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4`
Validation: Foundation CI #300 SUCCESS on exact production checkpoint.
Deployment status: accepted migration `20260909005000` is not yet applied to the linked Supabase project; FFH-020 now owns deployment before FFH-016 resumes independent parity.

### FFH-011 — SIMPLE persisted-field contract
Owner: Application, Data & Integration Engineer
Status: COMPLETE / MANAGER ACCEPTED
Accepted/in-place integration checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`.
Foundation CI #348 returned to the 54-failure FFH-012 baseline after the one incremental FFH-011 SIMPLE regression was removed.
Deployment status: accepted migration `20260909033000` is not yet applied to the linked Supabase project; FFH-020 now owns deployment. Core statutory SIMPLE formula consumption remains FFH-015.

### FFH-014 — Workflow V2 operating-system upgrade
Owner: Manager / Architect
Status: CLOSED
Result: FFH-D007 adopted.

### FFH-019 — Workflow V3 operating overlay
Owner: Manager / Architect
Status: CLOSED / MANAGER ACCEPTED
Integration checkpoint: `11c757141fb17c00c5b37bc702cbd0ed55c38a5c`.
Result: five-department user-facing model, durable roles/disposable chats/task-as-unit/repository-as-memory, fresh task-scoped worker chats, Manager rollover guidance, and Work-mode routing/fallback. No production financial behavior or audit gate changed.

## Active wave — FFH-PW-003

Status: ACTIVE

### FFH-012 — HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
State: REMEDIATION
Isolated Core candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Foundation CI #308: FAILURE with 54 task-owned HSA-related calculation failures.
Next gate: focused FFH-D005 owner remediation, exact validation, current FFH-012 handoff, READY_FOR_MANAGER/BLOCKED/escalation.

### FFH-020 — Deploy accepted FFH-010 / FFH-011 Supabase migrations
Owner: Application, Data & Integration Engineer
State: BLOCKED / DEPLOYMENT-ONLY ENVIRONMENT REMEDIATION
Execution mode: WORK_MODE_HIGH_VALUE; normal-chat fallback valid.
Verified blocker being remediated: linked project `tsqwvggojeudgspnumze` is healthy but live migration history ends at `20260903135253 phase_5b_goal_intelligence`; accepted FFH-010/011 migrations and all six required schema objects are absent.
Authorized scope: apply exact accepted `20260909005000_ffh_010_hsa_input_contract.sql` then `20260909033000_ffh_011_simple_plan_limit_contract.sql` through a proper migration-history mechanism; verify live migration history, schema/RLS/policy/grant presence, and available security-advisor evidence. No source edits, backfills, policy/Core changes, or unrelated live refactors.
Next gate: deployment evidence + App/Data handoff -> READY_FOR_MANAGER or BLOCKED.

### FFH-016 — Live Supabase migration/runtime parity verification
Owner: Application, Data & Integration Engineer
State: BLOCKED / VERIFICATION-ONLY PRE-MERGE GATE
Reason: accepted FFH-010 and FFH-011 migrations are not deployed to the intended linked project, so PostgREST/RLS/persistence/reload/runtime/browser parity cannot yet be validly tested.
Unlock: Manager accepts FFH-020 deployment evidence, then explicitly reactivates FFH-016 for the remaining independent parity gate.

## Queued work

### FFH-013 — Spousal-IRA shared compensation ledger
Owner: Core Financial Engine Engineer
State: QUEUED
Gate: FFH-012 acceptance unless Manager explicitly proves a safer reorder.

### FFH-015 — Narrow R1 SIMPLE Core remediation
Owner: Core Financial Engine Engineer
State: QUEUED
Dependency status: FFH-011 Manager acceptance SATISFIED.
Gate: collision-safe Core scheduling while FFH-012 is active. Manager chooses FFH-015 versus FFH-013 order after the FFH-012 event from exact overlap state.

### FFH-017 — Phase 5C implementation
Owner: Core Financial Engine Engineer
State: CLOSED
Final frozen target: `c563d011...`; fresh independent Technical + Policy closure audits PASS with zero findings.

### FFH-018 — Documentation-only CI efficiency hardening
Owner: Product & Technical R&D Engineer for discovery/design
State: QUEUED
Gate: current red remediation wave stable.

## Current merge blockers

- FFH-012 HSA legal-capacity remediation.
- FFH-013 spousal-IRA production remediation.
- FFH-015 Core SIMPLE formula remediation.
- FFH-020 accepted-migration live deployment.
- FFH-016 live Supabase/runtime parity after deployment.
- FFH-017 Phase 5C implementation.
- full branch validation once calculation failures no longer prevent downstream checks.
- final Technical & Mathematical Audit.
- final Financial Policy & Scenario Audit.

R2 is remediated but remains subject to integrated audit. PR #5 description/status documentation is stale and must be refreshed before final merge review.

## Expected sequence

1. Core continues focused FFH-012 remediation.
2. In parallel, App/Data executes FFH-020 and returns exact deployment evidence or a blocker.
3. Manager reviews FFH-020. If accepted, reactivate FFH-016 for PostgREST/RLS/persistence/reload/normalized-runtime/Recommendation Refresh/browser parity.
4. Manager handles FFH-012 independently when it reaches an event; after acceptance, choose a collision-safe order for FFH-015 and FFH-013.
5. Complete FFH-015 and FFH-013 with Manager integration/validation.
6. Stabilize retirement-capacity surfaces, then activate FFH-017 Phase 5C.
7. Use FFH-018 later to improve CI efficiency after the current red evidence is stabilized; do not modify CI mid-remediation merely to suppress red runs.
8. Run required independent Technical & Mathematical and Financial Policy & Scenario audits on stable integrated work.
9. Remediate blocking audit findings.
10. Refresh PR #5 description and evaluate merge gate; merge only if clean.
11. Verify post-merge CI and reconcile canonical state.

Do not pre-authorize Phase 5D–5G production work from prior chat discussion.

### FFH-034 — Foundation CI Documentation Fast Path + Evidence
Owner: Product & Technical R&D Engineer
State: ACTIVE / MANAGER AUTHORIZED
Execution: STANDARD_CHAT_HIGH
Branch: `ffh/ffh-034-ci-efficiency-observability`
Scope: preserve one always-running `Foundation CI / verify` job; use only a fail-closed Markdown documentation allowlist for expensive-step skipping; keep all non-doc/mixed/ambiguous/manual-dispatch runs FULL; add durable SHA/path/test-output evidence.
Gate: Manager review -> integration FULL CI -> disposable docs-only live proof -> frozen target -> fresh independent Technical/Workflow audit. No Financial Policy audit is required unless implementation crosses into financial semantics.
Non-goals: no financial code/policy, Supabase/live data, package/lock changes, branch-protection/ruleset changes, Phase-6 work, or PR #5 merge-readiness declaration.

## Phase 6 — Scenario Lab

PLANNED / NOT STARTED. Remains downstream of an accepted Phase 5 recommendation engine.

## Phase 7 — Private Beta

PLANNED / NOT STARTED. Includes household onboarding/invitations, recovery, security review, accessibility/mobile polish, and feedback collection.

## Manager roadmap reconciliation — 2026-09-18

Authoritative live task state in this reconciliation supersedes older historical sequencing earlier in this file.

- FFH-012: CLOSED.
- FFH-013: CLOSED.
- FFH-015: CLOSED.
- FFH-017: CLOSED on final frozen target `c563d011...`; Technical + Policy closure audits both PASS with zero findings.
- FFH-031 / FFH-032 / FFH-033: CLOSED.
- FFH-020: BLOCKED before any live migration-history/DDL write because a secure Supabase CLI/auth/protected-backup execution environment is still required.
- FFH-016: BLOCKED behind Manager-accepted FFH-020 deployment; it remains a verification-only pre-merge readiness gate.
- FFH-018: CLOSED — discovery/design accepted by Manager.
- FFH-034: BLOCKED only on user-admin required-`verify` ruleset activation. CI implementation is integrated; FULL #711 and DOCS_ONLY #712 are green. Ruleset verification + fresh independent Technical/Workflow audit remain before closure.
- FFH-026: QUEUED for Phase 7 after accepted Phase 5 + Phase 6.

Current Phase-5 merge-readiness sequence:
1. resolve the FFH-020 secure execution-environment blocker and complete/accept the bounded live deployment/recovery;
2. reactivate and close FFH-016 live Supabase/PostgREST/RLS/persistence/reload/browser parity;
3. run the roadmap-required final integrated Phase-5 Technical + Financial Policy audit/review on the stable post-runtime-gate baseline;
4. refresh PR #5 description/status against canonical task state and perform final merge review;
5. merge only if all gates are clean, then verify post-merge CI and reconcile canonical state.

FFH-018 discovery is closed. FFH-034 implementation is Manager-authorized and may proceed in parallel; it is not a financial/product correctness blocker. It is integrated and the live docs-only proof is green; required-`verify` ruleset activation/verification and fresh independent Technical/Workflow audit must still clear before the modified workflow is treated as a stable final-audit baseline.

Phase 6 Scenario Lab remains downstream of an accepted Phase 5 recommendation engine and is not authorized for production activation yet.

## Manager live-deployment reconciliation — 2026-09-18

This reconciliation supersedes older FFH-020/FFH-016 deployment-status text above.

- FFH-020: **ACCEPTED**. Phase-5A, FFH-010, and FFH-011 are live on `tsqwvggojeudgspnumze` with canonical history, schema/RLS/policy evidence, zero silent backfills, and clean security advisor.
- FFH-035: **ACTIVE**. Narrow deployment gate for the already-accepted FFH-023 legal-spouse migration `20260911170000_ffh_023_hsa_legal_spouse_authority.sql`.
- FFH-016: **BLOCKED behind FFH-035** because current milestone runtime queries the FFH-023 table; start parity only after that table is live.
- FFH-034 remains CLOSED.
- PR #5 remains NOT MERGE READY.
- Phase 6 remains PLANNED / NOT STARTED.

Current remaining Phase-5 sequence:
1. complete/accept FFH-035;
2. reactivate and close FFH-016;
3. run final integrated Phase-5 Technical + Financial Policy audits/review;
4. refresh PR #5 and perform final merge review;
5. merge only if all gates remain clean, then verify post-merge CI.

## Final Phase-5 audit gate — 2026-09-18

This section supersedes older FFH-016 sequencing text above.

- FFH-020: ACCEPTED.
- FFH-035: ACCEPTED.
- FFH-016: CLOSED / Manager ACCEPTED after independent live Supabase/RLS/persistence/runtime verification.
- Frozen final integrated production target: `b8e60292a1f13fb66f0c055f2c3f4e110bd380f9`.
- FFH-036: ACTIVE — fresh independent Technical & Mathematical final integrated audit.
- FFH-037: ACTIVE — fresh independent Financial Policy & Scenario final integrated audit.
- Shared packet: `.ai/audit/FFH-PHASE5_FINAL_AUDIT_PACKET_b8e60292.md`.
- PR #5: OPEN / NOT MERGE READY pending both audit verdicts + Manager reconciliation.
- Phase 6: remains PLANNED / NOT STARTED.

Remaining Phase-5 sequence:
1. receive both independent FFH-036 / FFH-037 verdicts on the exact same frozen target;
2. Manager reconcile findings without averaging disagreements;
3. route remediation if any blocking finding exists;
4. if both required audit gates clear, refresh PR #5 description/status and perform final merge review;
5. merge only after Manager explicitly declares the merge gate clean, then verify post-merge CI and canonical state.

## Phase-5 final dual-audit clearance — 2026-09-18

The roadmap-required final integrated audits are complete on exact frozen target `b8e60292a1f13fb66f0c055f2c3f4e110bd380f9`:
- FFH-036 Technical & Mathematical: PASS WITH NON-BLOCKING FINDINGS; 1 LOW; no blocking finding; reconciliation CLEAR.
- FFH-037 Financial Policy & Scenario: PASS WITH NON-BLOCKING FINDINGS; 2 LOW; no blocking finding.

Manager independently accepts all three LOW findings as non-blocking and queues FFH-038 for post-Phase-5 hardening. FFH-038 does not block PR #5.

Current Phase-5 sequence:
1. integrate final audit reports + Manager reconciliation into the milestone;
2. refresh PR #5 description/status against canonical state;
3. perform final merge review and required-check verification;
4. merge PR #5 only if no blocker drift exists;
5. verify post-merge Foundation CI and reconcile canonical state;
6. only then consider Phase 6 activation.

## Phase-5 closure / Phase-6 readiness — 2026-09-18

Phase 5 is complete and merged to `main` at `c0a5d87ea96a778066982e28fbb52083e61a3451` after:
- accepted Phase-5 financial implementation;
- accepted live Supabase migrations and runtime parity;
- Financial Engine Reconciliation Gate clearance;
- fresh independent FFH-036 Technical audit PASS WITH NON-BLOCKING FINDINGS;
- fresh independent FFH-037 Financial Policy audit PASS WITH NON-BLOCKING FINDINGS;
- Manager reconciliation of all three LOW findings;
- required `verify` success on exact final PR head;
- byte-identical merge-tree verification.

FFH-038 is a queued non-blocking post-Phase-5 hardening task and does not reopen Phase 5.

Phase 6 — Scenario Lab is now **READY FOR MANAGER ACTIVATION / NOT STARTED**. Manager must create/activate the bounded Phase-6 task(s) before any production work begins.
