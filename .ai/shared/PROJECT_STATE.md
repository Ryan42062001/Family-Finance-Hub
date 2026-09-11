# Family Finance Hub — Project State

Last refreshed: 2026-09-11

## Repository state
Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified main SHA remains `8d68af5d5cdeef866d4a8a481bc3bb31f098199e` at this Manager event.
Active milestone branch: `phase-5-money-priority-engine`
Verified milestone integration SHA after FFH-012 PR #8: `b33e97320c8907193ba8f6a571b0d92684237f18` before this Manager control-plane refresh.
PR #5 remains open/unmerged. Phase 5 is NOT MERGE READY.

Workflow V3 remains canonical for workforce/chat/execution routing; Workflow V2 remains authoritative for task lifecycle, checkpoint, CI ownership, integration, troubleshooting, financial safeguards, and audit gates.

## Phase 5 current state
FFH-010: ACCEPTED; live migration deployment remains under FFH-020.
FFH-011: REMEDIATION after a newly exposed security-contract textual assertion failure. The accepted semantic implementation shape predates FFH-012 and remains separately owned by App/Data.
FFH-012: AUDIT_READY after PR #8 integration. Production SHA `6acdcce25a69bd4449eccea94d480d09b685d1fd`; integration SHA `b33e97320c8907193ba8f6a571b0d92684237f18`. Integration CI passed `Test calculations` and then failed at the separately attributed FFH-011 security step.
FFH-013: QUEUED.
FFH-015: QUEUED; do not proceed until current FFH-011 validation remediation stabilizes and Core slot is safe.
FFH-016: BLOCKED pending accepted FFH-020 deployment evidence.
FFH-017: QUEUED / Phase 5C policy approved.
FFH-018: QUEUED CI-hardening discovery after current remediation stabilizes.
FFH-019: CLOSED / Workflow V3 adopted.
FFH-020: ACTIVE deployment-only App/Data task.

## Current CI evidence
Foundation CI run `34614840278`, job `103314058423`, on exact FFH-012 integration SHA `b33e97320c8907193ba8f6a571b0d92684237f18`:
- install dependencies: PASS
- production dependency audit: PASS
- Test calculations: PASS
- Test security policy contract: FAIL
- typecheck: SKIPPED
- lint: SKIPPED
- build: SKIPPED

The former FFH-012 HSA calculation blocker is independently cleared at integration. The remaining observed CI failure is FFH-011-owned validation debt: its textual security test expects an inline SIMPLE category normalization expression, while the accepted code uses a local variable plus shorthand property. That shape existed at FFH-011 accepted checkpoint `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a` and was untouched by PR #8.

## Smallest useful workforce
- Technical & Mathematical Auditor — FFH-012 integrated checkpoint.
- Financial Policy & Scenario Auditor — FFH-012 integrated checkpoint.
- Application, Data & Integration Engineer — FFH-020 remains active.
- Manager — event-driven.

FFH-011 remediation waits behind the current FFH-020 same-role event unless Manager explicitly reschedules. Core Engineering, Policy, Research, and Troubleshooting otherwise remain idle.

## Merge blockers
Phase 5 remains blocked by: FFH-012 audit verdicts; FFH-011 security-contract remediation; FFH-020 deployment; FFH-016 live parity; FFH-013; FFH-015; FFH-017; full branch validation through all CI stages; final integrated audits/remediation; and final PR #5 merge review.

## Exact next sequence
1. Run independent Technical/Mathematical and Financial Policy/Scenario audits of FFH-012 at `b33e97320c8907193ba8f6a571b0d92684237f18`.
2. Continue FFH-020 independently. On its Manager event, accept/reject deployment and reactivate FFH-016 if supported.
3. Then give App/Data one narrow FFH-011 security-contract remediation iteration unless new evidence changes ownership/sequencing.
4. Do not start additional Core production work until FFH-012 audit disposition is known and overlap is reassessed.
5. Restore full green branch validation before Phase-5 merge readiness is considered.
