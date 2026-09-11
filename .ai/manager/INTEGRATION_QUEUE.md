# Family Finance Hub — Manager Integration & Readiness Queue

Workflow V2 integration/readiness control with Workflow V3 workforce overlay.

Last refreshed: 2026-09-11

## Audit ready

### FFH-012 — HSA legal-capacity calculation
State: AUDIT_READY
Current production checkpoint: `9140d19c27d206b75e2a1825065e58047f1443c2`
Current handoff checkpoint: `8854ebac7861da215aaac87501adad36bb95bbe0`
Current integration checkpoint: `1487b192491a704ca3500b42d22a50289ee1551b`
Integration validation: Foundation CI #404 / run `34624938204` / job `103347645465` on the exact integration SHA passed dependency setup/audit and `Test calculations`, then failed `Test security policy contract`. Typecheck, lint, and build were skipped by fail-fast and are not claimed green.

Manager independently attributed the reached security failure to FFH-011, not FFH-012/FFH-023: the SIMPLE security test is byte-identical at the accepted FFH-011 and current integration checkpoints (blob `02297242910c554aa9ada8bf099197f20dfbc41e`), the accepted/current SIMPLE code uses the same local-variable + shorthand form, and PR #11 does not modify the test or SIMPLE normalization block.

Gate: two fresh independent re-audits on exact integration `1487b192491a704ca3500b42d22a50289ee1551b` — Technical/Mathematical and Financial Policy/Scenario. Both must pass before Manager may close FFH-012.

## Accepted remediation

### FFH-023 — FFH-012 audit remediation
State: ACCEPTED
Production: `9140d19c27d206b75e2a1825065e58047f1443c2`
Handoff: `8854ebac7861da215aaac87501adad36bb95bbe0`
Integration: `1487b192491a704ca3500b42d22a50289ee1551b`
PR #11: MERGED
Disposition: technical remediation accepted/integrated; parent FFH-012 remains audit-gated. The additive legal-spouse-authority migration was not deployed.

## Remediation

### FFH-011 — SIMPLE persisted-field contract
State: REMEDIATION
Previously accepted checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`
Current evidence: stale source-shape security assertion is independently re-proven on the current milestone. The semantic implementation predates FFH-023 and is unchanged by PR #11.
Manager gate: one narrow App/Data remediation iteration preserving the semantic contract, then fresh validation and Manager review.
Scheduling: FFH-020 is BLOCKED, so App/Data may activate FFH-011 now in a fresh branch/chat. Do not mutate live Supabase state.

## Blocked live recovery

### FFH-020 — Deploy accepted migrations / migration-history recovery
State: BLOCKED
Blocker: secure execution environment with supported Supabase CLI, transferable authentication/link, and protected pre-change backup is unavailable in the attempted runtime. No history repair or DDL write occurred.

### FFH-016 — Live Supabase migration/runtime parity
State: BLOCKED
Unlock: Manager accepts a completed FFH-020 deployment event, then reactivates FFH-016.

## Queued Core work
FFH-013, FFH-015, and FFH-017 remain queued. Do not start new Core production work until FFH-012 re-audit disposition is known and overlap is reassessed. FFH-015 additionally waits for FFH-011 validation stability.

## Integration procedure reminder
A red branch-level CI run is attributed by owned surface and checkpoint evidence, not merely by newest head. Stable integrated work may advance to audit when an unrelated inherited failure is independently isolated and separately routed; the unrelated task remains a merge blocker until remediated.

Phase 5 / PR #5 remains NOT MERGE READY.