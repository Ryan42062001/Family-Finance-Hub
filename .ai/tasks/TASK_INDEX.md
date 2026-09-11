# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-11

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6e638711a80300786869a407113d3d0c4` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | REMEDIATION | accepted source `a89e9ae...`; milestone inherited failure | Security textual-contract remediation remains queued after current live recovery sequencing |
| FFH-012 | Core / recovery | REMEDIATION | prior production `6acdcce...`; prior integration `b33e973...` | Dual audit FAIL; FFH-023 completing accepted remediation contract |
| FFH-013 | Core Engine | QUEUED | Not established | Wait for FFH-012 remediation/re-audit |
| FFH-014 | Manager | CLOSED | workflow docs | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not established | Wait for FFH-011/retirement blockers |
| FFH-016 | App/Data | BLOCKED | verification-only | Wait for Manager-accepted FFH-020 deployment |
| FFH-017 | Core Engine | QUEUED | Not established | Wait for Phase-5 blockers |
| FFH-018 | Product R&D / Engineering | QUEUED | discovery/infrastructure | CI hardening/test-observability after current recovery wave |
| FFH-019 | Manager | CLOSED | `11c757141fb17c00c5b37bc702cbd0ed55c38a5c` | Workflow V3 adopted |
| FFH-020 | App/Data | ACTIVE | live environment Stage A | FFH-024 accepted; perform bounded history repair + exact dry-run only, then Manager gate |
| FFH-021 | Manager | CLOSED | control-plane | Work Helper / Super Troubleshooter role adopted |
| FFH-022 | Retirement Policy | ACCEPTED | PR #12 / `07e42e531309e10cb7d1127fb022362d4d5f942b` | Legal-marriage authority is now implementation authority for FFH-023 |
| FFH-023 | Work Helper | ACTIVE | partial technical candidate `f0439bae...`; PR #11 open | Preserve cent fixes and complete cross-layer FFH-022 spouse-authority implementation; no live DB deployment |
| FFH-024 | Product R&D | ACCEPTED | research artifact `b8656413...` | Recovery plan accepted; FFH-020 Stage A reactivated |

## Current verified recovery state
- Both FFH-012 independent audits failed the prior integrated checkpoint.
- Manager accepts three blocking areas: ambiguous spouse authority, odd-cent shared allocation, and Build aggregate/account reconciliation.
- FFH-023 already reproduced and locally fixed both cent defects; full calculations on that partial candidate were 794/794. Exact-SHA CI was not established.
- FFH-022 is accepted: `spouse_partner` and planning filing status are not legal-spouse authority. Pair/year tri-state authority is required, with unknown-safe behavior.
- PR #11 remains open and must not merge until Work Helper completes the spouse-authority implementation and Manager verifies the full candidate.
- FFH-024 is accepted: foundation and Phase-5B identity drift are history-only repairs; Phase 5A/FFH-010/FFH-011 are genuinely pending.
- FFH-020 Stage A is authorized for protected backup, supported history repair, migration-list verification, and exact `db push --include-all --dry-run` only. The actual DDL push remains a separate Manager gate.

## Active-chat target
- Work Helper / Super Troubleshooter — FFH-023 complete FFH-012 audit remediation.
- Implementation Engineer / App-Data — FFH-020 Stage A migration-history recovery + dry-run.
- Manager — event-driven verification/routing.

## Idle departments
- Financial Policy: IDLE after FFH-022 acceptance.
- R&D: IDLE after FFH-024 acceptance.
- Auditor/QA: IDLE until a new integrated FFH-012 remediation checkpoint exists; both independent audits must then re-run.

## Integration/readiness disposition
- FFH-012 remains REMEDIATION.
- FFH-020 is ACTIVE only for Stage A; no live DDL push authorization exists yet.
- FFH-016 remains BLOCKED.
- FFH-011 remains REMEDIATION.
- Phase 5 / PR #5 remains NOT MERGE READY.
