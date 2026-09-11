# Manager / Architect Handoff

HANDOFF

Task event: FFH-012 dual-audit failure + FFH-020 deployment/history blocker routing
Role: Manager / Architect
Status: EVENT COMPLETE — FFH-012 REMEDIATION; FFH-020 BLOCKED; FFH-022/023/024 ACTIVE

## Verified repository event
Repository: `Ryan42062001/Family-Finance-Hub`
Milestone branch: `phase-5-money-priority-engine`
FFH-012 audited production/integration remains:
- production SHA `6acdcce25a69bd4449eccea94d480d09b685d1fd`
- integration SHA `b33e97320c8907193ba8f6a571b0d92684237f18`
- Foundation CI run `34614840278` / job `103314058423`: calculation PASS; separately attributed FFH-011 security-contract FAIL

Technical audit evidence was integrated via PR #10. Policy audit evidence is present under `.ai/audit/policy/`.

## FFH-012 disposition
Both independent auditors returned `FAIL — REMEDIATION REQUIRED`.

Manager accepts three blocking remediation targets:
1. HIGH protected-semantic gap — `spouse_partner` cannot be treated as proven statutory spouse authority without an approved authoritative fact/contract.
2. MEDIUM technical defect — odd-cent partial-year married equal allocation can create one cent of legal capacity beyond the rounded shared base.
3. MEDIUM technical/accounting defect — Build can report one cent more aggregate monthly allocation than is routed because the PR #8 one-cent tolerance silently accepts an unreconciled residual.

Non-blocking audit findings: stale married-ledger component remaining metadata and risk of transitional fixture adapter overwriting intentionally canonical test facts.

FFH-012 is returned from `AUDIT_READY` to `REMEDIATION`.

## FFH-012 routing
FFH-022 — ACTIVE — Retirement & Tax-Advantaged Policy Analyst.
Purpose: define the authoritative legal-marriage input/behavior contract for spouse vs non-spouse partner vs unknown. No code/schema implementation.

FFH-023 — ACTIVE — Work Helper / Super Troubleshooter.
Purpose: immediately fix the two cent/reconciliation defects with exact reproduction/regression evidence. The spouse-identity implementation is soft-blocked until Manager accepts FFH-022. Work Helper may not invent that protected semantic.

After FFH-022 is accepted, Manager may authorize FFH-023 to complete the spouse-identity technical implementation or route the persistence/UI portion to App/Data if that is cleaner.

Both independent audit roles remain IDLE until Manager integrates a new remediation checkpoint; then both must re-audit.

## FFH-020 disposition
App/Data correctly returned `BLOCKED` without live writes.

Verified blockers include:
- genuinely unapplied repository Phase 5A migration `20260902190000_phase_5a_hybrid_retirement_floor.sql` and absent expected live column;
- repository Phase 5B version `20260903134156` versus live history `20260903135253` while Phase 5B schema is already present;
- older `0001_household_foundation.sql` versus live `20260829180242 household_foundation` history mismatch;
- FFH-010 `20260909005000` and FFH-011 `20260909033000` remain absent live;
- current connected MCP migration tool cannot preserve requested repository migration versions.

No `db push`, `migration repair`, MCP migration application, manual DDL, or migration-history edit is authorized yet.

FFH-024 — ACTIVE — Product & Technical R&D Engineer.
Purpose: use current authoritative Supabase guidance and repository/live facts to design the lowest-risk supported migration-history reconciliation/deployment sequence. Diagnosis/recovery-plan only; no live writes.

FFH-020 and FFH-016 remain BLOCKED pending Manager review of FFH-024. Implementation Engineer is IDLE for this stream until an execution-ready plan is approved.

## Current smallest useful workforce
ACTIVE: Financial Policy — FFH-022.
ACTIVE: Work Helper / Super Troubleshooter — FFH-023.
ACTIVE: Product & Technical R&D — FFH-024.
IDLE: Implementation Engineer pending upstream decisions.
IDLE: Audit pending new FFH-012 integrated remediation checkpoint.
IDLE: Regulatory Research unless FFH-022 raises a new external-authority question.
Management: event-driven.

## Exact next events
1. FFH-022 returns READY_FOR_MANAGER or a precise Regulatory question.
2. FFH-023 returns a validated technical remediation candidate, BLOCKED, or ESCALATION_REQUIRED.
3. FFH-024 returns a supported migration-history recovery plan or exact capability blocker.
4. Manager reviews each result independently and activates Implementation Engineer only when semantics/recovery sequence are implementation-ready.
5. FFH-012 re-enters dual independent audit only after a new Manager-verified integration checkpoint exists.

PRODUCTION_SHA: N/A — Manager orchestration only
VALIDATED_CI: N/A for this routing event
INTEGRATION_SHA: prior FFH-012 integration remains `b33e97320c8907193ba8f6a571b0d92684237f18`; remediation integration not yet established
