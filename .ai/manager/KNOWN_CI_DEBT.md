# Family Finance Hub — Known CI Debt Registry

Manager-owned registry for inherited or baseline CI failures that should not be reassigned merely because a newer task is at branch head.

This file does not excuse regressions. Every red run still requires checkpoint comparison, changed-file ownership, and failing-test/error identity before attribution.

## Entry format

```md
### CI-### — <short name>
Status: OPEN | CLOSED | SUPERSEDED
Owner: <task/role or baseline>
First verified checkpoint: <SHA/run>
Last verified checkpoint: <SHA/run>
Failure identity:
- <exact test/error family>
Owned files:
- <paths>
Non-owner rule: <why unrelated tasks must not repair it>
Resolution gate: <what closes the entry>
```

## Current entries

### CI-001 — Inherited test TypeScript diagnostics after FFH-025
Status: OPEN
Owner: Existing Phase-5 test debt; exact remediation owner remains Manager-routed
First verified checkpoint: FFH-025 validation evidence before integration
Last verified checkpoint: FFH-028 validation SHA `d13c412851c8a35d1d7cc4a85054d3dcf8bae94f`; Foundation CI run `34698588257`, job `103566232253`, reaches Type Check after AI-state validation, dependency audit, calculations, and security all PASS. FFH-028 production/test changed files do not intersect the registered debt-owned tests.
Failure identity:
- `money-priority-married-hsa-remediation.test.ts:219` TS2339 family
- `money-priority-retirement-accounts.test.ts:20` four TS2339 diagnostics
Owned files:
- `lib/calculations/money-priority-married-hsa-remediation.test.ts`
- `lib/calculations/money-priority-retirement-accounts.test.ts`
Non-owner rule: unrelated tasks whose changed files do not intersect these tests or their directly implicated contracts must not inherit remediation ownership solely because their commit is newer.
Resolution gate: Manager assigns a bounded owner, the exact diagnostics are corrected or intentionally superseded, and a later validated checkpoint proves the registry entry no longer reproduces.

## Operating rules
- Add an entry only when the failure identity and ownership basis are evidence-backed.
- Reference registry IDs from task files and Manager integration notes instead of recopied prose when possible.
- Update `Last verified checkpoint` when the same failure is reproduced unchanged.
- Close or supersede entries promptly; do not let stale debt labels mask a new regression.
- If a failure changes identity, treat that as new evidence and re-attribute it rather than automatically extending the old debt.