# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-11

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6e638711a80300786869a407113d3d0c4` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | REMEDIATION | accepted source `a89e9ae...`; milestone `b33e973...` | Newly exposed security textual-contract failure after calculations cleared; narrow App/Data remediation queued behind same-role FFH-020 |
| FFH-012 | Core Engine | AUDIT_READY | production `6acdcce...`; integration `b33e973...` | Integrated calculations PASS; dual independent audits in progress |
| FFH-013 | Core Engine | QUEUED | Not yet established | Wait for FFH-012 audit disposition / collision-safe Core slot |
| FFH-014 | Manager | CLOSED | documentation/workflow | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not yet established | FFH-011 contract semantics accepted but current FFH-011 validation remediation must stabilize first |
| FFH-016 | App/Data | BLOCKED | N/A — VERIFICATION-ONLY | Wait for Manager-accepted FFH-020 deployment, then resume live parity |
| FFH-017 | Core Engine | QUEUED | Not yet established | Phase 5C; wait for retirement-capacity blockers to stabilize |
| FFH-018 | Product R&D | QUEUED | discovery first | CI hardening/test-observability work after current remediation wave stabilizes |
| FFH-019 | Manager | CLOSED | `11c757141fb17c00c5b37bc702cbd0ed55c38a5c` | Workflow V3 adopted |
| FFH-020 | App/Data | ACTIVE | N/A — DEPLOYMENT-ONLY | Apply accepted FFH-010/011 migrations exactly; return READY_FOR_MANAGER or BLOCKED |
| FFH-021 | Manager | CLOSED | control-plane only | Work Helper / Super Troubleshooter dedicated role, folder, playbook, and broader recovery authority adopted |

## Current branch-level evidence
Milestone integration SHA for FFH-012 production behavior remains `b33e97320c8907193ba8f6a571b0d92684237f18`.
FFH-012 independent audits may add auditor-owned documentation after that integration SHA without changing the audited production checkpoint.

## Active-chat target
- Audit / Technical & Mathematical Auditor — FFH-012 integrated checkpoint audit.
- Audit / Financial Policy & Scenario Auditor — FFH-012 integrated HSA policy/scenario audit.
- Engineering / Application, Data & Integration Engineer — FFH-020 remains ACTIVE.
- Management / Manager — event-driven only.

FFH-011 is REMEDIATION but should not consume a second same-role App/Data chat until FFH-020 returns unless Manager explicitly reschedules. Core Engineering, Financial Policy, Research, and Work Helper remain IDLE pending events.

## Work Helper activation
Work Helper / Super Troubleshooter is now a dedicated on-demand role under `.ai/work-helper/`. It may be activated immediately by Manager for difficult technical recovery; two failed owner attempts are no longer a mandatory prerequisite. See `.ai/shared/WORK_HELPER_OVERLAY.md`.

## Integration/readiness disposition
- FFH-012 remains `AUDIT_READY`, not CLOSED, pending independent audit verdicts.
- FFH-011 remains REMEDIATION for the newly exposed security-contract test.
- FFH-020 remains ACTIVE.
- FFH-021 is CLOSED as a workflow/control-plane upgrade.
- Phase 5 / PR #5 remains NOT MERGE READY.