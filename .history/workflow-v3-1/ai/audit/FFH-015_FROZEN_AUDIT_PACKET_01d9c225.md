# FFH-015 — Frozen Dual Audit Packet

## Packet identity
AUDIT_PACKET_ID: `FFH-015-01d9c225-2026-09-12`
PARENT_TASK: `FFH-015`
AUDIT_TARGET_SHA: `01d9c22522d331ca560895e1ad59e6fab9827e8b`
MANAGER_ACCEPTANCE_RECORD: `.ai/tasks/FFH-015.md` and PR #19
REQUIRED_AUDITS: `BOTH`
FROZEN_AT: `2026-09-12 America/New_York`

## Governing requirements
- Task: `.ai/tasks/FFH-015.md`
- Accepted persisted/runtime category authority: `.ai/tasks/FFH-011.md` and its accepted implementation evidence
- Regulatory revalidation: `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md`, especially SIMPLE finding R1
- Retirement policy refresh: `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`
- Workflow: `.ai/shared/WORKFLOW_V3_1.md`, `.ai/shared/WORKFLOW_V3.md`, `.ai/shared/WORKFLOW.md`

## Frozen external facts to verify against repository authority
For 2026:
- standard SIMPLE salary-reduction base: 17,000;
- certain-applicable higher SIMPLE base: 18,100;
- general SIMPLE age-50+ catch-up: 4,000;
- certain-applicable higher SIMPLE general age-50+ catch-up: 3,850;
- age 60–63 SIMPLE catch-up: 5,250, replacing rather than stacking the general catch-up.

The accepted regulatory record identifies prior higher-category use of 4,000 rather than 3,850 as a 150 overstatement candidate for affected ages 50–59 and 64+.

## Exact implementation evidence
- Integration SHA: `01d9c22522d331ca560895e1ad59e6fab9827e8b`
- PR: #19
- Production SHA: `378f18728615732e281d527e56fce9fb1b387406`
- Handoff SHA: `ab75d3691ecf5fcedfdb6e8146f31bfba8dc4018`
- Foundation CI: run `34729503423`, job `103649562344` — PASS
- Known inherited CI debt: NONE; CI-001 is CLOSED

Changed implementation/test files:
- `lib/calculations/ffh-006-retirement-statutory-remediation.test.ts`
- `lib/calculations/ffh-015-simple-core-remediation.test.ts`
- `lib/calculations/money-priority-advanced-retirement.test.ts`
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-integration.test.ts`
- `lib/calculations/money-priority-tax-policy.ts`

## Required independent audit questions
Both auditors must independently determine whether exact target `01d9c22522d331ca560895e1ad59e6fab9827e8b`:
1. consumes only the accepted FFH-011 category plus matching tax-year authority for the higher SIMPLE category;
2. prevents the legacy `simple_higher_limit_eligible` boolean from independently granting higher capacity;
3. implements standard 17,000 / 4,000 behavior correctly;
4. implements certain-applicable higher 18,100 / 3,850 behavior correctly;
5. applies 5,250 for ages 60–63 as a replacement catch-up and does not stack catch-ups;
6. handles age boundaries 49/50, 59/60, 63/64 correctly using the project age-at-tax-year-end convention;
7. keeps missing, unknown, legacy-only, and stale-tax-year category authority conservative and targeted rather than granting higher room;
8. maintains exact annual-room/YTD subtraction and capacity-ledger behavior without double counting catch-up room;
9. preserves unrelated 401(k)/workplace/IRA/HSA logic and previously accepted FFH-012/FFH-028 behavior;
10. has sufficient regression coverage for category, age-band, exact-limit, stale/legacy authority, and unrelated retirement behavior;
11. introduces no new CI/type/lint/build failure and does not reuse closed CI-001 as an attribution bucket.

## Scenario matrix both auditors must inspect
- standard SIMPLE, under 50;
- standard SIMPLE, age 50–59;
- standard SIMPLE, age 60–63;
- standard SIMPLE, age 64+;
- certain-applicable higher SIMPLE in the same four age bands;
- exact YTD at statutory limit => zero remaining room;
- YTD just below and above the applicable limit where existing product behavior defines warning/room semantics;
- legacy higher-limit boolean true but no accepted category/year authority;
- accepted higher category with stale tax year;
- unknown/missing category;
- unrelated 401(k) capacity unchanged;
- input ordering/determinism where materially relevant.

## Prior finding to close
Finding R1: accepted regulatory research identified the certain-applicable higher SIMPLE general catch-up mismatch as a HIGH-CONFIDENCE implementation mismatch candidate. Auditors must independently decide whether FFH-015 closes R1 without creating a new material defect.

## Auditor independence rules
- Use two fresh separate Auditor/QA chats.
- Both audit this exact SHA; do not switch to later documentation/control-plane heads.
- Neither auditor may read or reuse the other auditor's new verdict before submitting its own.
- Do not modify production code during audit.
- Findings are `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- Final verdict must be exactly `PASS`, `PASS WITH NON-BLOCKING FINDINGS`, or `FAIL — REMEDIATION REQUIRED`.

## Manager disposition after audits
FFH-015 remains `AUDIT_READY`. FFH-013 remains QUEUED. Manager compares both independent verdicts against this same frozen target and closes FFH-015 only when all blocking audit gates are satisfied.