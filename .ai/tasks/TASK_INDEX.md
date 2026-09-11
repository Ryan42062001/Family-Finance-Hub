# Family Finance Hub — Task Index

Manager-maintained execution dashboard. Individual `.ai/tasks/FFH-###.md` files are authoritative.

Last refreshed: 2026-09-11

| Task | Owner | State | Production / integration checkpoint | Validation / next gate |
|---|---|---|---|---|
| FFH-009 | Retirement Policy | ACCEPTED | policy artifact | FFH-D006 complete for current wave |
| FFH-010 | App/Data | ACCEPTED | `8f39e7d6e638711a80300786869a407113d3d0c4` | CI #300 SUCCESS; live deployment remains FFH-020 |
| FFH-011 | App/Data | REMEDIATION | accepted source `a89e9ae...`; milestone `b33e973...` | Security textual-contract remediation still required after deployment/history sequencing stabilizes |
| FFH-012 | Core Engine | REMEDIATION | production `6acdcce...`; integration `b33e973...` | Dual audit FAIL; FFH-022 authority + FFH-023 technical remediation active |
| FFH-013 | Core Engine | QUEUED | Not yet established | Wait for FFH-012 remediation/re-audit disposition |
| FFH-014 | Manager | CLOSED | documentation/workflow | Workflow V2 / FFH-D007 adopted |
| FFH-015 | Core Engine | QUEUED | Not yet established | Wait for FFH-011 validation remediation and current retirement-capacity blockers |
| FFH-016 | App/Data | BLOCKED | N/A — VERIFICATION-ONLY | Wait for Manager-accepted FFH-020 deployment, then resume live parity |
| FFH-017 | Core Engine | QUEUED | Not yet established | Phase 5C; wait for retirement-capacity blockers to stabilize |
| FFH-018 | Product R&D | QUEUED | discovery first | CI hardening/test-observability after current recovery wave stabilizes |
| FFH-019 | Manager | CLOSED | `11c757141fb17c00c5b37bc702cbd0ed55c38a5c` | Workflow V3 adopted |
| FFH-020 | App/Data | BLOCKED | N/A — DEPLOYMENT-ONLY | Pre-existing migration history/dependency drift; wait for FFH-024 recovery plan |
| FFH-021 | Manager | CLOSED | control-plane only | Work Helper / Super Troubleshooter role upgrade adopted |
| FFH-022 | Retirement Policy | ACTIVE | policy authority task | Define authoritative legal-marriage contract for HSA spouse-sharing |
| FFH-023 | Work Helper | ACTIVE | remediation candidate not yet established | Fix FFH-012 cent/reconciliation defects; spouse semantics wait for FFH-022 approval |
| FFH-024 | Product R&D | ACTIVE | research/recovery plan | Define safe Supabase migration-history reconciliation before FFH-020 live writes |

## Current verified events
- FFH-012 Technical & Mathematical Audit: `FAIL — REMEDIATION REQUIRED`; Auditor evidence integrated via PR #10.
- FFH-012 Financial Policy & Scenario Audit: `FAIL — REMEDIATION REQUIRED`.
- Both audits independently identify the ambiguous `spouse_partner` authority problem.
- Technical audit blocks on one-cent Build reconciliation.
- Policy audit separately identifies a partial-year equal-allocation phantom legal cent.
- FFH-020 App/Data preflight is BLOCKED by pre-existing migration-history/dependency drift; no live schema/history write was made.

## Active-chat target
- Financial Policy / Retirement & Tax-Advantaged Policy Analyst — FFH-022.
- Work Helper / Super Troubleshooter — FFH-023.
- Research / Product & Technical R&D Engineer — FFH-024.
- Management / Manager — event-driven only.

## IDLE / blocked departments
- Engineering: IDLE until FFH-022/023 or FFH-024 creates an implementation-ready event; FFH-020 and FFH-016 remain BLOCKED.
- Audit: IDLE after dual FFH-012 FAIL; re-audit only after new integrated remediation checkpoint.
- Regulatory Research: IDLE unless FFH-022 identifies a genuinely unresolved external legal-rule question.

## Work Helper routing
Work Helper owns technical recovery, not protected semantics. It may immediately fix the two cent/reconciliation defects under FFH-023, but it must not infer legal marriage from `spouse_partner`, filing status, or a new schema field until Manager accepts FFH-022 authority.

## Integration/readiness disposition
- FFH-012 is REMEDIATION, not AUDIT_READY/CLOSED.
- FFH-020 remains BLOCKED; do not run `db push`, `migration repair`, MCP `apply_migration`, manual DDL, or migration-history edits until Manager reviews FFH-024.
- FFH-011 remains REMEDIATION.
- Phase 5 / PR #5 remains NOT MERGE READY.
