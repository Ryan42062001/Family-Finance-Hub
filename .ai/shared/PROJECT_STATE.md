# Family Finance Hub — Project State

Last refreshed: 2026-09-11

## Repository state
Repository: `Ryan42062001/Family-Finance-Hub`
Canonical branch: `main`
Verified main SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`.
Active milestone branch: `phase-5-money-priority-engine`
Verified latest production integration checkpoint before this Manager control-plane refresh: `1487b192491a704ca3500b42d22a50289ee1551b` (FFH-023 / FFH-012 remediation, PR #11 merged).
PR #5 remains open/unmerged. Phase 5 is NOT MERGE READY.

Workflow V3 remains canonical for workforce/chat/execution routing; Workflow V2 remains authoritative for task lifecycle, checkpoint, CI ownership, integration, troubleshooting, financial safeguards, and audit gates.

## Phase 5 current state
FFH-010: ACCEPTED; live migration deployment remains under blocked FFH-020.
FFH-011: REMEDIATION for a stale/overly textual SIMPLE security-contract assertion; Manager re-proved ownership at the current integration checkpoint.
FFH-012: AUDIT_READY after FFH-023 remediation integration. Production SHA `9140d19c27d206b75e2a1825065e58047f1443c2`; integration SHA `1487b192491a704ca3500b42d22a50289ee1551b`.
FFH-013: QUEUED.
FFH-015: QUEUED; wait for FFH-011 validation stability and safe Core scheduling.
FFH-016: BLOCKED pending accepted FFH-020 deployment evidence.
FFH-017: QUEUED / Phase 5C policy approved.
FFH-018: QUEUED CI-hardening/test-observability discovery after current recovery wave.
FFH-019: CLOSED / Workflow V3 adopted.
FFH-020: BLOCKED before first history repair on secure CLI/auth/backup capability.
FFH-021: CLOSED / Work Helper role adopted.
FFH-022: ACCEPTED / legal-spouse authority contract.
FFH-023: ACCEPTED / audit remediation integrated at `1487b192...`; parent FFH-012 re-audit remains required.
FFH-024: ACCEPTED / Supabase migration-history recovery plan.

## Current CI evidence
Foundation CI #404 / run `34624938204`, job `103347645465`, on exact FFH-012 remediation integration SHA `1487b192491a704ca3500b42d22a50289ee1551b`:
- dependency setup/audit: PASS
- Test calculations: PASS
- Test security policy contract: FAIL
- typecheck: SKIPPED
- lint: SKIPPED
- build: SKIPPED

The integrated FFH-012 calculation gate is green. The overall workflow is not green.

Manager independently re-proved that the reached security mismatch is FFH-011-owned validation debt rather than FFH-023:
- the exact SIMPLE security-test blob is unchanged from accepted FFH-011 (`02297242910c554aa9ada8bf099197f20dfbc41e`);
- the accepted/current SIMPLE implementation uses the same local-variable + property-shorthand normalization shape;
- PR #11 does not change that security test or SIMPLE block;
- the stale regex requires a literal inline source expression absent from the accepted code.

This permits FFH-012 re-audit under the workflow's inherited-failure ownership rule while FFH-011 remains separately blocked from final Phase-5 merge readiness.

## Smallest useful workforce
ACTIVATE NOW:
- Auditor/QA — Technical & Mathematical Auditor — fresh FFH-012 re-audit on `1487b192491a704ca3500b42d22a50289ee1551b`.
- Auditor/QA — Financial Policy & Scenario Auditor — separate fresh FFH-012 re-audit on the same exact checkpoint.

AVAILABLE IN PARALLEL:
- Implementation Engineer / App-Data — narrow FFH-011 security-contract remediation now that FFH-020 is blocked.

BLOCKED:
- FFH-020 live recovery/deployment until a secure Supabase CLI/auth/protected-backup environment is available.
- FFH-016 live parity until FFH-020 is accepted.

IDLE:
- Financial Policy after FFH-022 acceptance.
- R&D after FFH-024 acceptance.
- Core Engineering pending FFH-012 re-audit disposition.
- Manager between orchestration events.

## Merge blockers
Phase 5 remains blocked by: FFH-012 dual re-audit verdicts; FFH-011 security-contract remediation; FFH-020 deployment/recovery; FFH-016 live parity; FFH-013; FFH-015; FFH-017; full branch validation through all CI stages; final integrated audits/remediation; and final PR #5 merge review.

## Exact next sequence
1. Run both fresh independent FFH-012 re-audits on integration `1487b192491a704ca3500b42d22a50289ee1551b`.
2. Independently verify each auditor verdict before closing or remediating FFH-012.
3. In parallel, App/Data may execute the narrow FFH-011 security-contract remediation; it is independent of the HSA re-audits.
4. Resume FFH-020 only in an execution environment satisfying the accepted secure CLI/auth/backup gate; FFH-016 remains blocked until then.
5. Do not start additional Core production work until FFH-012 re-audit disposition is known and overlap is reassessed.
6. Restore full green branch validation before Phase-5 merge readiness is considered.