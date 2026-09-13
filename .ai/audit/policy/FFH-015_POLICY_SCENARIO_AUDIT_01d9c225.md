# FFH-015 — Financial Policy & Scenario Audit

Role: Financial Policy & Scenario Auditor
Execution mode: STANDARD_CHAT
Audit type: fresh independent policy/scenario audit
Frozen audit target: `01d9c22522d331ca560895e1ad59e6fab9827e8b`
Manager control-plane checkpoint used for task/audit documentation: `5d4f01b66409cbc486a9df75fb7783b210decc78`
Production checkpoint: `378f18728615732e281d527e56fce9fb1b387406`
Implementation handoff checkpoint: `ab75d3691ecf5fcedfdb6e8146f31bfba8dc4018`
Frozen packet: `.ai/audit/FFH-015_FROZEN_AUDIT_PACKET_01d9c225.md`

## Independence

This audit did not read or reuse the new Technical & Mathematical Auditor verdict. The audit remained pinned to integration SHA `01d9c22522d331ca560895e1ad59e6fab9827e8b`; later Manager/control-plane material was used only as the frozen assignment/evidence envelope and was not substituted for the audited financial-behavior checkpoint.

No production code, Manager-owned task/shared state, policy/research authority, database state, or credentials were modified.

## Final verdict

`PASS`

No CRITICAL, HIGH, MEDIUM, or LOW policy/scenario finding was identified in the frozen FFH-015 behavior.

## Repository policy/regulatory authority inspected

Primary accepted repository authority:

- `.ai/research/regulatory/FFH-005_REVALIDATION_ADDENDUM.md` — accepted 2026 regulatory revalidation and R1 source finding;
- `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md` — accepted retirement uncertainty/locality and verified-room policy boundaries;
- `.ai/tasks/FFH-011.md` — Manager-accepted persisted/runtime SIMPLE category and tax-year authority contract;
- `.ai/tasks/FFH-015.md` — bounded remediation scope and acceptance requirements;
- `.ai/audit/FFH-015_FROZEN_AUDIT_PACKET_01d9c225.md` — frozen target, exact checkpoints, scenario matrix, and required dual-audit questions;
- `.ai/shared/WORKFLOW_V3_1.md`, `.ai/shared/WORKFLOW_V3.md`, `.ai/shared/WORKFLOW.md`, `.ai/roles/policy-audit.md`, and `.ai/tasks/TASK_INDEX.md` for audit/process boundaries.

No new external IRS lookup was required for this audit. The repository-accepted regulatory record already freezes the relevant 2026 facts and identifies the authoritative IRS sources used by Regulatory Research. This audit evaluates implementation against that accepted repository authority rather than redefining policy.

Accepted 2026 SIMPLE facts used:

- standard base: `$17,000`;
- certain-applicable higher base: `$18,100`;
- standard general age-50+ catch-up: `$4,000`;
- certain-applicable higher general age-50+ catch-up: `$3,850`;
- age 60–63 catch-up: `$5,250`, replacing rather than stacking the general catch-up.

## Implementation and test evidence inspected

At exact frozen target `01d9c225...`:

- `lib/calculations/money-priority-tax-policy.ts`;
- `lib/calculations/money-priority-retirement-accounts.ts`;
- `lib/calculations/money-priority-retirement-capacity.ts`;
- `lib/calculations/money-priority-snapshot.ts`;
- `lib/calculations/ffh-015-simple-core-remediation.test.ts`;
- `lib/calculations/ffh-006-retirement-statutory-remediation.test.ts`;
- `lib/calculations/money-priority-advanced-retirement.test.ts`;
- `lib/calculations/money-priority-retirement-integration.test.ts`;
- only related code/evidence needed to trace category authority, tax-year authority, YTD room, localized uncertainty, and unrelated-account behavior.

The production-to-integration comparison `378f187... -> 01d9c225...` is two commits ahead but changes only `.ai/engineering/engine/HANDOFF.md`. Therefore the executable/test tree at the frozen integration checkpoint is the same as the production checkpoint exercised by candidate CI.

## Policy behavior findings

### 1. Standard SIMPLE capacity — PASS

The tax-policy helper uses the standard `$17,000` base unless the accepted category is explicitly `certain_applicable_higher`. For a standard category, age 50+ outside the 60–63 band receives `$4,000`; under 50 receives no age catch-up.

Resulting standard ceilings are:

- under 50: `$17,000`;
- age 50–59: `$21,000`;
- age 60–63: `$22,250`;
- age 64+: `$21,000`.

### 2. Verified certain-applicable higher capacity — PASS

A current-target-year explicit higher category selects the `$18,100` base and the `$3,850` general catch-up outside the 60–63 band.

Resulting higher-category ceilings are:

- under 50: `$18,100`;
- age 50–59: `$21,950`;
- age 60–63: `$23,350`;
- age 64+: `$21,950`.

This closes the prior `$150` overstatement for affected higher-category ages 50–59 and 64+.

### 3. Age 60–63 replacement semantics — PASS

The implementation selects `$5,250` for ages 60–63 instead of adding it to either general catch-up. The standard and higher bases remain category-specific, but the catch-up itself is the single `$5,250` age-band amount. No stacking path was found.

### 4. Age 64+ return to general catch-up — PASS

At age 64+, the implementation leaves the 60–63 branch and returns to the category-specific general catch-up: `$4,000` for standard and `$3,850` for current verified higher-category SIMPLE.

### 5. Under-50 behavior — PASS

Under age 50, catch-up is zero regardless of SIMPLE category. The category changes only the applicable base.

### 6. Current-year category authority — PASS

The retirement-account evaluator treats SIMPLE category authority as current only when `simplePlanLimitTaxYear === snapshot.asOfYear`. Higher capacity is granted only when that current authority is explicitly `certain_applicable_higher`.

### 7. Legacy boolean is not policy authority — PASS

Snapshot normalization keeps legacy `simpleHigherLimitEligible` separate. It is not promoted into `simplePlanLimitCategory`, and the legal-capacity evaluator does not use the legacy boolean to grant the higher category. A legacy `true` without accepted category/year authority therefore cannot produce higher room.

### 8. Missing authority semantics — PASS

Missing/unknown current category authority is not represented as verified standard eligibility. The evaluator may retain the standard ceiling as a conservative reference value, but it marks the SIMPLE opportunity `more_information_needed` with a targeted authority request. The capacity ledger then treats that opportunity as unverified and gives it no consumable legal room.

This preserves the accepted distinction: unknown capacity is neither zero nor positive verified room, and no unsupported SIMPLE dollars can be routed merely because a conservative reference ceiling is displayed.

### 9. Stale prior-year authority — PASS

A prior-year category does not carry forward. When the persisted SIMPLE category tax year differs from the snapshot target year, category authority is treated as missing and the opportunity becomes targeted `more_information_needed`; stale higher authority cannot grant current-year higher capacity.

### 10. Exact-limit YTD — PASS

Remaining SIMPLE room is clamped as `max(0, statutoryLimit - YTD)`. Exact YTD at the applicable legal limit therefore produces zero additional room.

### 11. Just-below-limit YTD — PASS

The same subtraction preserves the exact positive residual immediately below the applicable category/age limit; the focused FFH-015 tests exercise this boundary.

### 12. Excess YTD — PASS

YTD above the supported statutory ceiling produces zero remaining legal room rather than negative room or manufactured capacity.

### 13. Household-facing capacity/category consistency — PASS

The statutory ceiling, remaining annual room, explanation state, and downstream capacity verification are all derived from the same current category/year authority. No path was found where the household receives a higher SIMPLE consumable amount while the legal/policy category remains standard, stale, legacy-only, missing, or unknown.

### 14. Unrelated retirement accounts remain usable — PASS

Retirement capacity is account/opportunity-local. A SIMPLE opportunity with missing category authority becomes unverified without invalidating independently verified 401(k), workplace, or IRA opportunities. The FFH-015 focused regression includes an unrelated-retirement-account preservation case.

### 15. HSA and prior retirement behavior — PASS

FFH-015 does not modify HSA policy/capacity implementation. Its changed production surface is limited to SIMPLE retirement/tax-policy logic and associated retirement tests. Existing HSA and previously accepted retirement-account behavior remains outside the remediation and is retained by the broader calculation/integration test suite.

### 16. Ordering/default/legacy escalation — PASS

Higher SIMPLE room requires the explicit current-year higher category. Default/missing category, stale category, legacy boolean, or incidental input ordering cannot synthesize that authority. The higher branch has one explicit machine-readable authority condition.

### 17. Explanation and missing-information locality — PASS

The missing-information state is targeted to the affected SIMPLE account/category-year authority. It does not mark the entire household or all retirement opportunities unusable. Downstream capacity consumption refuses the unverified SIMPLE opportunity while independently verified routes remain actionable.

## Required edge matrix

| Scenario | Expected / audited result | Verdict |
|---|---|---|
| Standard SIMPLE, under 50 | `$17,000` total ceiling | PASS |
| Standard, age 50–59 | `$17,000 + $4,000 = $21,000` | PASS |
| Standard, age 60–63 | `$17,000 + $5,250 = $22,250`; no stacking | PASS |
| Standard, age 64+ | `$17,000 + $4,000 = $21,000` | PASS |
| Higher, under 50 | `$18,100` total ceiling | PASS |
| Higher, age 50–59 | `$18,100 + $3,850 = $21,950` | PASS |
| Higher, age 60–63 | `$18,100 + $5,250 = $23,350`; no stacking | PASS |
| Higher, age 64+ | `$18,100 + $3,850 = $21,950` | PASS |
| Exact YTD limit | zero remaining room | PASS |
| Just below limit | exact positive residual | PASS |
| Above limit | zero additional legal room | PASS |
| Legacy higher boolean only | no higher authority; information needed | PASS |
| Higher category with stale tax year | no carry-forward; information needed | PASS |
| Missing/unknown category | unverified SIMPLE room; targeted information needed | PASS |
| Unrelated 401(k)/IRA/workplace route | remains independently usable | PASS |
| Ordering/default manipulation | cannot create higher authority | PASS |

## R1 disposition

`CLOSED`

R1 identified a prior risk that a certain-applicable higher SIMPLE participant age 50–59 or 64+ could receive `$4,000` rather than the verified `$3,850` general catch-up, overstating legal capacity by `$150`.

At the frozen target, the base and general catch-up are both category-aware: current verified higher-category SIMPLE receives `$18,100` plus `$3,850`, while standard SIMPLE receives `$17,000` plus `$4,000`. Ages 60–63 use `$5,250` as a replacement catch-up for either category. No alternate legacy/default/stale-authority path grants the old `$4,000` higher-category catch-up.

## Uncertainty / locality conclusion

PASS. Uncertainty remains conservative and local. Missing or stale SIMPLE category authority produces targeted `more_information_needed`; it does not become standard certainty, does not create higher capacity, and does not supply a consumable SIMPLE ledger. The rest of the household remains usable where independent evidence is sufficient.

## Unrelated-account preservation conclusion

PASS. No FFH-015 path was found that contaminates unrelated 401(k), workplace, IRA, or HSA opportunity merely because SIMPLE category authority is missing. FFH-015 does not modify HSA implementation, and existing broader regression coverage remains green.

## Candidate CI attribution

Foundation CI run `34729503423`, job `103649562344`: SUCCESS.

The job passed:

- AI control-plane validation;
- production dependency audit;
- calculation tests;
- security policy contract tests;
- TypeScript type check;
- lint;
- build.

GitHub records the run head as production SHA `378f18728615732e281d527e56fce9fb1b387406`, not integration SHA `01d9c225...`. This is not treated as exact-SHA policy proof. However, independent commit comparison shows the only production-to-integration change is `.ai/engineering/engine/HANDOFF.md`; there is no executable or test delta. Therefore the successful CI accurately covers the executable/test tree present at the frozen integration target. Policy correctness is established separately by the accepted authority-to-code/scenario audit above.

No inherited CI failure was used to excuse behavior; the frozen packet records no known inherited CI debt for this target.

## Findings by severity

- CRITICAL: none.
- HIGH: none.
- MEDIUM: none.
- LOW: none.

## Manager boundary

This audit does not close FFH-015 and does not activate FFH-013. Manager retains dual-audit reconciliation, closure, sequencing, and dependent-task activation authority.
