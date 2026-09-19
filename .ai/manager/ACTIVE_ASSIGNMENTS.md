# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-10
Workflow: V3 overlay + V2 safeguards
Detailed task authority: `.ai/tasks/FFH-###.md`
Dashboard: `.ai/tasks/TASK_INDEX.md`
Integration/readiness queue: `.ai/manager/INTEGRATION_QUEUE.md`

# FFH-PW-003 — Retirement-capacity remediation and HSA integration

Status: ACTIVE

## Completed / accepted in current wave

- FFH-009 — Retirement Policy — ACCEPTED / synthesized as FFH-D006.
- FFH-010 — App/Data HSA persistence + normalized contract — ACCEPTED at `8f39e7d6e638711a80300786869a407113d3d0c4`, Foundation CI #300 SUCCESS; live migration deployment now routed through FFH-020 and parity through FFH-016 afterward.
- FFH-011 — App/Data SIMPLE persisted-field contract — ACCEPTED at in-place checkpoint `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`; CI #348 returned to the 54-failure FFH-012 baseline after removing the incremental FFH-011 SIMPLE regression. Live migration deployment now routed through FFH-020; parity remains FFH-016; Core formula consumption remains FFH-015.
- FFH-014 — Workflow V2 upgrade — CLOSED / FFH-D007 adopted.
- FFH-019 — Workflow V3 overlay — CLOSED / Manager accepted; integrated at `11c757141fb17c00c5b37bc702cbd0ed55c38a5c`.

## Current execution

### FFH-012 — HSA legal-capacity calculation
Owner: Core Financial Engine Engineer
State: REMEDIATION
Task: `.ai/tasks/FFH-012.md`
Isolated candidate: `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546`
Evidence: CI #308 FAILURE with 54 task-owned HSA-related calculation failures; the same aggregate failure count remains at accepted FFH-011 checkpoint CI #348.
Next gate: focused D005 owner remediation -> exact validation -> current FFH-012 handoff -> `READY_FOR_MANAGER` / `BLOCKED` / escalation as supported.

### FFH-020 — accepted FFH-010 / FFH-011 live migration deployment
Owner: Application, Data & Integration Engineer
State: ACTIVE / DEPLOYMENT-ONLY ENVIRONMENT REMEDIATION
Task: `.ai/tasks/FFH-020.md`
Verified target: linked Supabase project `tsqwvggojeudgspnumze`.
Verified starting blocker: project is healthy, but live migration history ends at `20260903135253 phase_5b_goal_intelligence`; accepted migrations `20260909005000` and `20260909033000`, plus all six required HSA/SIMPLE schema objects, are absent.
Execution mode: WORK_MODE_HIGH_VALUE because the task requires current Supabase guidance, controlled live migration application, migration/schema/RLS/security evidence, and precise failure handling. Work mode is an accelerator, not a dependency.
Fallback: ordinary chat uses GitHub + linked Supabase tooling sequentially and follows the same preflight/deploy/verify boundaries.
Next gate: exact accepted migration deployment -> migration/schema/RLS/advisor evidence -> current App/Data handoff -> `READY_FOR_MANAGER` / `BLOCKED`.

## Blocked

### FFH-016 — live Supabase migration/runtime parity
Owner: Application, Data & Integration Engineer
State: BLOCKED / VERIFICATION-ONLY PRE-MERGE GATE
Task: `.ai/tasks/FFH-016.md`
Reason: accepted FFH-010/011 migrations are absent from linked project `tsqwvggojeudgspnumze`, so downstream PostgREST/RLS/persistence/reload/runtime/browser tests remain prerequisite-blocked.
Unlock: Manager accepts FFH-020 live deployment evidence, then explicitly reactivates FFH-016. Do not run a separate FFH-016 worker chat while FFH-020 is active.

## Queued

- FFH-013 — Core spousal-IRA shared compensation ledger — QUEUED behind FFH-012.
- FFH-015 — narrow R1 SIMPLE Core remediation — QUEUED; FFH-011 dependency is satisfied, but wait for a collision-safe Core slot while FFH-012 is active.
- FFH-017 — Phase 5C implementation — QUEUED / policy approved; retirement-capacity baseline must stabilize first.
- FFH-018 — docs-only CI efficiency hardening — QUEUED for Product R&D discovery after current red remediation stabilizes.

# Current role status

Manager / Architect — EVENT-DRIVEN; current blocker-routing event complete after canonical update
Application, Data & Integration Engineer — ACTIVE on FFH-020; FFH-016 BLOCKED pending deployment acceptance
Core Financial Engine Engineer — ACTIVE / REMEDIATION on FFH-012
Retirement & Tax-Advantaged Policy Analyst — IDLE
Debt & Liquidity Policy Analyst — IDLE
Goals, Cash Flow & Allocation Policy Analyst — IDLE
Regulatory & Financial Research Analyst — IDLE
Product & Technical R&D Engineer — IDLE
Technical & Mathematical Auditor — IDLE
Financial Policy & Scenario Auditor — IDLE
Troubleshooting & Build Specialist — IDLE / ON-DEMAND

# Manager sequencing rules

- Keep active specialist execution to App/Data FFH-020 + Core FFH-012; Manager is event-driven.
- FFH-020 may deploy only the exact accepted FFH-010 then FFH-011 migrations. Any source change, live drift requiring redesign, hotfix, backfill, unrelated RLS/auth/config change, or migration failure needing repair returns to Manager.
- FFH-016 remains independently blocked; reactivate it only after Manager verifies/accepts FFH-020 deployment evidence.
- Do not make App/Data repair Core financial behavior or Core repair live persistence/runtime state outside task authority.
- Reactivate Manager when FFH-020 or FFH-012 reaches `READY_FOR_MANAGER`, `BLOCKED`, requests escalation, or when explicit user coordination is requested.
- Two actual same-root owner-remediation failures are required before Troubleshooting escalation; docs-only red reruns do not count.
- Do not start FFH-013 and FFH-015 concurrently while Core overlap risk is unresolved; choose order after the FFH-012 Manager event.
- Do not start FFH-017, audits, or FFH-018 now.
- PR #5 body remains stale and must be refreshed before final merge review, not while core/runtime execution state is still moving.

# Final Phase-5 audit wave — 2026-09-18

Status: ACTIVE

FFH-016 is CLOSED / Manager ACCEPTED. Final integrated audit target is frozen at `b8e60292a1f13fb66f0c055f2c3f4e110bd380f9`.

## Active

### FFH-036 — Final Integrated Phase-5 Technical & Mathematical Audit
Owner: Technical & Mathematical Auditor
State: ACTIVE
Execution: STANDARD_CHAT_HIGH
Branch: `audit/ffh-036-phase5-final-technical-b8e60292`
Shared packet: `.ai/audit/FFH-PHASE5_FINAL_AUDIT_PACKET_b8e60292.md`

### FFH-037 — Final Integrated Phase-5 Financial Policy & Scenario Audit
Owner: Financial Policy & Scenario Auditor
State: ACTIVE
Execution: STANDARD_CHAT_HIGH
Branch: `audit/ffh-037-phase5-final-policy-b8e60292`
Shared packet: `.ai/audit/FFH-PHASE5_FINAL_AUDIT_PACKET_b8e60292.md`

Audits are independent. Do not expose either verdict/reasoning to the other before submission.

PR #5 remains NOT MERGE READY. Manager must reconcile both verdicts before any final merge review. Phase 6 remains gated.

# Final Phase-5 merge review — 2026-09-18

Status: ACTIVE

- FFH-036: CLOSED / ACCEPTED — PASS WITH NON-BLOCKING FINDINGS.
- FFH-037: CLOSED / ACCEPTED — PASS WITH NON-BLOCKING FINDINGS.
- FFH-038: QUEUED / NON-BLOCKING post-Phase-5 HSA hardening; do not activate before merge closure.
- PR #5: FINAL MERGE REVIEW; not yet merged at this checkpoint.
- Phase 6: WAIT until PR #5 merge and post-merge CI/state reconciliation.

Manager owns the remaining merge/release sequence. No specialist is active unless a blocker is discovered.

# Post-Phase-5 state — 2026-09-18

Status: PHASE 5 CLOSED / NO ACTIVE SPECIALIST WORK

- PR #5: MERGED at `c0a5d87ea96a778066982e28fbb52083e61a3451`.
- FFH-036 / FFH-037: CLOSED / ACCEPTED.
- FFH-038: QUEUED / NON-BLOCKING; wait for Manager activation after phase transition.
- FFH-026: QUEUED for Phase 7.
- Phase 6 Scenario Lab: READY / NOT STARTED.
- Manager: event-driven; next action is a separate Phase-6 activation decision, not implicit continuation.

# Phase-6 Scenario Lab kickoff — 2026-09-18

Status: ACTIVE — DISCOVERY/DESIGN ONLY

## ACTIVE

### FFH-039 — Scenario Lab Product + Technical Contract
Owner: Product & Technical R&D Engineer
Execution: STANDARD_CHAT_HIGH
Refresh: Fast Refresh
Base: `ae11a48359d082e615b76822b6bbe3a7f379a8d2`
Branch: `research/ffh-039-scenario-lab-contract`
Scope: bounded Scenario Lab v1 product/technical contract, existing-engine reuse, scenario matrix, persistence/staleness model, safety boundaries, follow-on task graph.
Must not: implement production code/UI/schema, define new financial policy, modify live Supabase, activate Phase 7, or implement FFH-038.

## WAIT / IDLE

- Manager: wait for FFH-039 READY_FOR_MANAGER/BLOCKED event.
- Core/App engineering: idle until FFH-039 acceptance and Manager task routing.
- Financial Policy / Regulatory: idle until FFH-039 identifies a concrete unresolved policy question.
- Auditors: idle; no design audit currently required.
- FFH-038: queued/non-blocking, separate from Scenario Lab.

# FFH-039 Manager disposition — 2026-09-18

Status: ACCEPTED / awaiting canonical integration of acceptance record

- FFH-039: CLOSED / ACCEPTED.
- Product R&D: WAIT / complete.
- Core Financial Engine Engineer: WAIT until Manager establishes exact post-acceptance base and issues the new Scenario Lab foundation task.
- Application, Data & Integration Engineer: WAIT behind Core foundation.
- Policy / Regulatory roles: IDLE; no v1 blocker. REQUIRES POLICY categories remain excluded.
- Auditors: IDLE until integrated production implementation is frozen.
- FFH-038: remains QUEUED / non-blocking and separate.

# Phase-6 implementation wave 1 — FFH-040 — 2026-09-18

Status: ACTIVE

## ACTIVE

### FFH-040 — Scenario Overlay + Runner Foundation
Owner: Core Financial Engine Engineer
Execution: STANDARD_CHAT_HIGH
Refresh: FAST_REFRESH
Production base: `cc8e2c207f16350c1baeab131ffd685c848948ce`
Branch: `ffh/ffh-040-scenario-runner-foundation`

Bounded scope:
typed Scenario Definition + runtime validation; immutable generic overlays; shared normalized-to-raw conversion; canonical engine rerun; generic INCLUDE categories; exact reconciliation/no-reuse/determinism/unknown-safe tests.

## WAIT / IDLE

- Manager / Architect: WAIT for FFH-040 READY_FOR_MANAGER/BLOCKED event.
- Application, Data & Integration Engineer: WAIT behind accepted Core scenario contract.
- Product & Technical R&D Engineer: IDLE; FFH-039 complete.
- Financial Policy / Regulatory roles: IDLE; no v1 policy blocker activated.
- Technical & Mathematical Auditor: IDLE until a stable integrated implementation target.
- Financial Policy & Scenario Auditor: IDLE until the same stable integrated target.
- Work Helper: IDLE / on-demand.
- FFH-038: QUEUED / non-blocking and not part of FFH-040.

# Phase-6 implementation wave 2 — FFH-041 — 2026-09-18

Status: ACTIVE

## ACTIVE

### FFH-041 — Authenticated Ephemeral Scenario Lab Surface
Owner: Application, Data & Integration Engineer
Execution: STANDARD_CHAT_HIGH
Refresh: FAST_REFRESH
Base: `75d2766fb370d506b695d722788b03af5f36a155`
Branch: `ffh/ffh-041-scenario-lab-ephemeral-surface`

## WAIT / IDLE

- Manager / Architect: WAIT for FFH-041 READY_FOR_MANAGER/BLOCKED.
- Core Financial Engine Engineer: IDLE; FFH-040 complete.
- Product & Technical R&D: IDLE; FFH-039 complete.
- Policy / Regulatory roles: IDLE; REQUIRES POLICY categories remain excluded.
- Technical & Mathematical Auditor: IDLE until integrated Phase-6 target.
- Financial Policy & Scenario Auditor: IDLE until same target.
- Work Helper: IDLE / on-demand.
- FFH-038: QUEUED / non-blocking.

# Phase-6 implementation wave 3 — FFH-042 — 2026-09-19

Status: ACTIVE

## ACTIVE

### FFH-042 — Scenario Lab Specialized Adapter Composition
Owner: Core Financial Engine Engineer
Execution: STANDARD_CHAT_HIGH
Refresh: FAST_REFRESH
Base: `2587a547450602bf663692320e64a0aa821d0ca2`
Branch: `ffh/ffh-042-scenario-specialized-adapters`

Bounded scope:
pure Home / Vehicle / Windfall / Your Plan / Recommendation Refresh adapters; generic/specialized conflict detector; immutability/determinism; exact reconciliation/no-reuse; existing-module equivalence.

## WAIT / IDLE

- Manager / Architect: WAIT for FFH-042 READY_FOR_MANAGER/BLOCKED.
- Application, Data & Integration Engineer: WAIT for accepted FFH-042 before specialized UI/server wiring.
- Core Financial Engine Engineer: ACTIVE on FFH-042 only.
- Product & Technical R&D: IDLE; FFH-039 complete.
- Policy / Regulatory roles: IDLE; no v1 policy blocker activated.
- Technical & Mathematical Auditor: IDLE until frozen integrated Phase-6 target.
- Financial Policy & Scenario Auditor: IDLE until same target.
- Work Helper: IDLE / on-demand.
- FFH-038: QUEUED / non-blocking and separate.


# Phase-6 implementation wave 4 — FFH-043 — 2026-09-19

Status: ACTIVE

## ACTIVE

### FFH-043 — Authenticated Specialized Scenario Lab Wiring
Owner: Application, Data & Integration Engineer
Execution: STANDARD_CHAT_HIGH
Refresh: FAST_REFRESH
Production base: `768644c1e8baf41eef72fa0e857a0c474a56823e`
Branch: `ffh/ffh-043-scenario-specialized-wiring`

Bounded scope:
wire accepted FFH-042 Home/Vehicle/Windfall/Your Plan/Recommendation Refresh specialized composition into the accepted FFH-041 authenticated ephemeral Scenario Lab; refresh stable-ID entity options after explicit rebase; preserve auth/stale/no-write/accessibility boundaries.

Must not:
change Core financial semantics; add persistence/schema/RLS/profile writes; add new financial policy; implement FFH-038 or Phase 7.

## WAIT / IDLE

- Manager / Architect: WAIT for FFH-043 READY_FOR_MANAGER/BLOCKED.
- Core Financial Engine Engineer: IDLE; FFH-042 CLOSED / ACCEPTED.
- Product & Technical R&D: IDLE; FFH-039 complete.
- Financial Policy / Regulatory roles: IDLE; no v1 policy blocker activated.
- Technical & Mathematical Auditor: WAIT until FFH-043 is accepted/integrated and Manager freezes the final Phase-6 target.
- Financial Policy & Scenario Auditor: WAIT until the same frozen integrated target.
- Work Helper: IDLE / on-demand.
- FFH-038: QUEUED / non-blocking and separate.


# Phase-6 final dual audits — 2026-09-19

Status: ACTIVE / FROZEN

Frozen production target:
`8f4b1c443684446cdf9b619bd35336f5873265bc`

Shared packet:
`.ai/audit/FFH-PHASE6_FINAL_AUDIT_PACKET_8f4b1c44.md`

## ACTIVE

### FFH-044 — Final Integrated Phase-6 Technical & Mathematical Audit
Owner: Technical & Mathematical Auditor
Branch: `audit/ffh-044-phase6-final-technical-8f4b1c44`
Audit only frozen target `8f4b1c443684446cdf9b619bd35336f5873265bc`.

### FFH-045 — Final Integrated Phase-6 Financial Policy & Scenario Audit
Owner: Financial Policy & Scenario Auditor
Branch: `audit/ffh-045-phase6-final-policy-8f4b1c44`
Audit only frozen target `8f4b1c443684446cdf9b619bd35336f5873265bc`.

## WAIT / IDLE

- Manager / Architect: WAIT for both independent audit verdicts.
- Retirement, Debt/Liquidity, Goals/Cash-Flow policy roles: IDLE unless an auditor routes a concrete policy question through Manager.
- Core Financial Engine Engineer: IDLE.
- Application, Data & Integration Engineer: IDLE; FFH-043 CLOSED.
- Regulatory Research: IDLE.
- Product & Technical R&D: IDLE.
- Work Helper: IDLE / on-demand.
- FFH-038 remains separately QUEUED / non-blocking.
- Phase 7 remains NOT STARTED.


# Phase-6 audit remediation — FFH-046 — 2026-09-19

Status: ACTIVE / REMEDIATION

Frozen failed audit target:
`8f4b1c443684446cdf9b619bd35336f5873265bc`

## ACTIVE

### FFH-046 — Windfall Tax-Authority Fail-Closed Remediation
Owner: Core Financial Engine Engineer
Execution: STANDARD_CHAT_HIGH
Refresh: FAST_REFRESH
Production base: `8f4b1c443684446cdf9b619bd35336f5873265bc`
Branch: `ffh/ffh-046-windfall-tax-authority-fail-closed`

Blocking finding:
FFH-045-P01 — HIGH. Missing/malformed Windfall tax authority can become deployable cash.

Bounded fix:
authoritative Windfall allocator validation only, plus direct and Scenario Lab regressions. No new tax policy, UI redesign, persistence/schema/profile writes, FFH-038, FFH-047, or Phase 7.

## QUEUED NON-BLOCKING

FFH-047 — Scenario Rebase Unresolved-State UX Hardening
Owner: App/Data
Source: TMA-044-01 LOW.

## WAIT / IDLE

- Manager / Architect: WAIT for FFH-046 READY_FOR_MANAGER/BLOCKED.
- Technical & Mathematical Auditor: WAIT for a new Manager-frozen remediated target.
- Financial Policy & Scenario Auditor: WAIT for a new Manager-frozen remediated target.
- App/Data: WAIT; FFH-047 is queued only.
- Policy/Regulatory roles: IDLE; FFH-046 requires no new policy.
- R&D: IDLE.
- Work Helper: IDLE / on-demand.
- Phase 7: NOT STARTED.


# Phase-6 remediated final dual re-audits — 2026-09-19

Status: ACTIVE / FROZEN

Frozen product target:
`9453deca36fe41f5d56e154cc9c8bc9de6f64da3`

Shared packet:
`.ai/audit/FFH-PHASE6_FINAL_REAUDIT_PACKET_9453deca.md`

## ACTIVE

### FFH-048 — Final Remediated Phase-6 Technical & Mathematical Re-Audit
Owner: Technical & Mathematical Auditor
Execution: STANDARD_CHAT_HIGH
Refresh: FAST_REFRESH
Branch: `audit/ffh-048-phase6-technical-reaudit-9453deca`

### FFH-049 — Final Remediated Phase-6 Financial Policy & Scenario Re-Audit
Owner: Financial Policy & Scenario Auditor
Execution: STANDARD_CHAT_HIGH
Refresh: FAST_REFRESH
Branch: `audit/ffh-049-phase6-policy-reaudit-9453deca`

Auditors must remain independent and audit the same exact frozen product target. Neither may consume the other's verdict/reasoning before submission.

## WAIT / IDLE

- Manager / Architect: WAIT for both fresh verdicts.
- Core Financial Engine Engineer: IDLE; FFH-046 CLOSED / ACCEPTED.
- Application, Data & Integration Engineer: WAIT; FFH-047 remains queued/non-blocking and must not alter this audit target.
- Policy/R&D/Research roles: IDLE.
- Work Helper: IDLE / on-demand.
- Phase 7: NOT STARTED.


# Phase-6 final closure — 2026-09-19

Status: CLOSED / ACCEPTED

Accepted product target:
`9453deca36fe41f5d56e154cc9c8bc9de6f64da3`

Accepted fresh final audits:
- FFH-048 — PASS WITH NON-BLOCKING FINDINGS; TMA-048-01 LOW only, preserved as FFH-047.
- FFH-049 — PASS; zero findings; FFH-045-P01 CLOSED.

No blocking Phase-6 finding remains.

## READY NEXT

FFH-026 — Production Deployment & Release Readiness
Owner: Application, Data & Integration Engineer
Execution: WORK_MODE_PREFERRED
State: QUEUED / DEPENDENCIES SATISFIED

Manager must first merge this Phase-6 closure control-plane checkpoint, then pin that exact canonical `main` SHA as the FFH-026 release candidate and create the worker branch.

## NON-BLOCKING BACKLOG

- FFH-047 — Scenario Rebase Unresolved-State UX Hardening — QUEUED / non-blocking.
- FFH-038 — Post-Phase-5 HSA hardening — QUEUED / non-blocking.

Neither backlog item reopens Phase 5 or Phase 6, and neither blocks FFH-026 activation.
