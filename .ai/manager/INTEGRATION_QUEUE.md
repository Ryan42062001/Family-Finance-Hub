# Family Finance Hub — Manager Integration & Readiness Queue

Workflow V2 integration/readiness control with Workflow V3 workforce overlay.

Last refreshed: 2026-09-11

## Audit ready

### FFH-012 — HSA legal-capacity calculation
State: AUDIT_READY
Production checkpoint: `6acdcce25a69bd4449eccea94d480d09b685d1fd`
Handoff checkpoint: `b7d01e5bb2df470f76306fab0452679142ba9144`
Integration checkpoint: `b33e97320c8907193ba8f6a571b0d92684237f18`
Integration validation: Foundation CI run `34614840278`, job `103314058423` passed dependency install, dependency audit, and `Test calculations`. The workflow then failed at the separately attributed FFH-011 security-contract step. Required independent Technical/Mathematical and Policy/Scenario audits are now authorized on the exact integration checkpoint.

## Remediation

### FFH-011 — SIMPLE persisted-field contract
State: REMEDIATION
Previously accepted checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`
New evidence: after FFH-012 calculation fail-fast cleared, integration CI run `34614840278` reached security and failed. The FFH-011 security test requires a literal inline `simplePlanLimitCategory: nullableString(...)` expression, while the accepted implementation already uses a local variable plus property shorthand. The mismatch existed at the accepted FFH-011 checkpoint and was not introduced by FFH-012.
Manager gate: one narrow App/Data remediation iteration, semantic contract preserved, then fresh validation and Manager review. Same-role execution should follow the current FFH-020 event unless explicitly rescheduled.

## Active deployment remediation

### FFH-020 — Deploy accepted FFH-010 / FFH-011 Supabase migrations
State: ACTIVE
Type: LIVE DEPLOYMENT / ENVIRONMENT REMEDIATION
Execution mode: WORK_MODE_HIGH_VALUE with normal-chat fallback
Manager scope remains unchanged: apply only the exact accepted migrations in order through a history-recording mechanism and prove live migration/schema/RLS/policy/grant evidence. No source migration edits or financial-policy changes.

## Blocked runtime verification

### FFH-016 — Live Supabase migration/runtime parity
State: BLOCKED
Unlock: Manager accepts FFH-020 deployment evidence, then reactivates FFH-016.

## Queued Core work
FFH-013, FFH-015, and FFH-017 remain queued. Do not start new Core production work until FFH-012 audit disposition is known and overlap is reassessed. FFH-015 also waits for current FFH-011 validation remediation to stabilize.

## Integration procedure reminder
A red branch-level CI run is attributed by owned surface and checkpoint evidence, not merely by newest head. Stable integrated work may advance to audit when an unrelated inherited failure is independently isolated and separately routed; the unrelated task remains a merge blocker until remediated.

Phase 5 / PR #5 remains NOT MERGE READY.