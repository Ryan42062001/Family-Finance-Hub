# FFH-046 — Core Engine Worklog

Task: FFH-046 — Windfall Tax-Authority Fail-Closed Remediation
Role: Core Financial Engine Engineer
State: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Refresh mode: FAST_REFRESH
Branch: `ffh/ffh-046-windfall-tax-authority-fail-closed`
PR: #62 — draft / open / unmerged / mergeable
Blocking frozen audit target: `8f4b1c443684446cdf9b619bd35336f5873265bc`
Manager/control-plane assignment head: `929dedc9f98f7f35b0a81ec4532f845a7d87494b`

PRODUCTION_SHA: `3a045c4acae7b32efe68165c021dfc34c1a1209a`
FINAL_VALIDATION_SHA: `c5d1b6863707460f046dfd1fc1cf2d0aea82d88c`
FULL_CI: `35443929743` / job `105899505669` — SUCCESS

## Remediation

Closed the confirmed FFH-045-P01 defect at `allocateWindfall()` without adding tax policy.

- runtime tax-treatment membership is checked against the existing four-value enum;
- unsupported non-null treatment returns invalid with zero deployable/allocations and the otherwise-unreserved amount held;
- `known_taxable_liability_provided` with missing/null liability returns more-information-needed with the otherwise-unreserved amount held;
- explicit finite nonnegative zero remains a valid supplied liability;
- malformed finite/nonnegative liability rules remain fail closed;
- null/omitted tax treatment preserves existing uncertain behavior;
- accepted explicit-known arithmetic and downstream routing remain unchanged.

Authenticated Scenario Lab required no second validator/evaluator. Existing FFH-042/043 delegation inherits the allocator result.

## Exact controls

Missing liability:
`$12,345.67 = $200.00 other + $300.03 restricted + $400.04 earmarked + $11,445.60 held`; deployable/allocated `$0`.

Unsupported treatment:
`$10,000.00` gross = `$10,000.00` held; deployable/allocated `$0`; invalid.

Explicit zero:
`$10,000.00` gross, `$0.00` known tax, `$10,000.00` authorized deployable, `$0.00` allocated, `$10,000.00` residual on the direct no-destination control.

Explicit positive:
reservations `$1,900.08`; authorized deployable `$10,445.59`; direct no-destination residual `$10,445.59`; total `$12,345.67`.

Uncertain treatment:
otherwise-unreserved amount remains entirely held for review; no tax percentage is invented.

All reconciliation assertions use integer cents.

## Validation history

- `3a045c4a...`: production/regression candidate; calculations/security green; typecheck exposed test-only inferred-type issue.
- `c57c3c3b...`: test-only typing repair; FULL CI `35443773684` SUCCESS.
- `c5d1b686...`: final test-only exact-reconciliation strengthening; FULL CI `35443929743` / `105899505669` SUCCESS.

Production Windfall source blob is unchanged after `3a045c4a...`.

## Scope

Production/test files:
- `lib/calculations/money-priority-windfall.ts`
- `lib/calculations/money-priority-windfall.test.ts`
- `lib/calculations/ffh-043-scenario-specialized-wiring.test.ts`

Final handoff additionally changes only FFH-046 task/index/Core evidence.

No App/Data evaluator, schema, persistence, profile write, UI redesign, new tax policy/percentage, FFH-038, FFH-047, or Phase 7 work.

Worker blocker: NONE.

READY_FOR_MANAGER
