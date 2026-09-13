# Technical Audit Handoff

## FFH-015 — Narrow R1 SIMPLE Core Remediation — Workflow V3.1 frozen technical audit

**Audit role:** Technical & Mathematical Auditor  
**Audit date:** 2026-09-12  
**Execution mode:** `STANDARD_CHAT`  
**Frozen audit target:** `01d9c22522d331ca560895e1ad59e6fab9827e8b`  
**Manager control-plane base when audit branch was created:** `5d4f01b66409cbc486a9df75fb7783b210decc78`  
**Production checkpoint:** `378f18728615732e281d527e56fce9fb1b387406`  
**Engineering handoff checkpoint:** `ab75d3691ecf5fcedfdb6e8146f31bfba8dc4018`  
**Verdict:** **PASS WITH NON-BLOCKING FINDINGS**  
**R1 disposition:** **CLOSED**

This is a fresh independent Technical & Mathematical Auditor review of the exact frozen FFH-015 integration target required by `.ai/audit/FFH-015_FROZEN_AUDIT_PACKET_01d9c225.md`. The separate Financial Policy & Scenario Auditor verdict was not read or relied on. Later Manager commits were treated as control-plane/audit documentation only and were not substituted for the frozen financial-behavior target. No production behavior or Manager-owned lifecycle state was modified.

## Target lineage and scope

PR #19 is merged with merge commit `01d9c22522d331ca560895e1ad59e6fab9827e8b`. The frozen target's implementation delta from its Manager base `682ccf5f59f8f7f37923c289ab988cf6d504aacf` is limited to the Core engineer handoff plus these six calculation/test files:

- `lib/calculations/ffh-006-retirement-statutory-remediation.test.ts`
- `lib/calculations/ffh-015-simple-core-remediation.test.ts`
- `lib/calculations/money-priority-advanced-retirement.test.ts`
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-integration.test.ts`
- `lib/calculations/money-priority-tax-policy.ts`

The approved production base `61ad63ea1f41002e47708887505bf2b3365ea077` to Manager task-start head `682ccf5f...` changes only Manager/task/CI-debt documentation. Production checkpoint `378f187...` to frozen integration target `01d9c225...` changes only `.ai/engineering/engine/HANDOFF.md`. Therefore the frozen target's financial behavior is the exact inspected production candidate; no hidden persistence/UI/HSA/other production delta entered at integration.

## R1 — CLOSED

R1 was the prior use of the ordinary `$4,000` general SIMPLE catch-up for the `certain_applicable_higher` category, overstating affected 2026 capacity by `$150` outside ages 60–63.

The frozen policy table now carries distinct 2026 SIMPLE values:

- standard base: `$17,000`;
- certain-applicable higher base: `$18,100`;
- standard general age-50+ catch-up: `$4,000`;
- certain-applicable higher general age-50+ catch-up: `$3,850`;
- age-60-through-63 SIMPLE catch-up: `$5,250`.

`simpleCatchUpAmount()` applies no catch-up below 50, replaces the general catch-up with `$5,250` for ages 60–63, and otherwise selects `$3,850` only for the verified higher category. `simpleLimit()` adds exactly one selected catch-up to exactly one selected base. R1's `$150` overstatement path is removed.

Required totals are therefore:

| Category / age | Annual limit |
|---|---:|
| Standard, under 50 | `$17,000` |
| Standard, 50–59 | `$21,000` |
| Standard, 60–63 | `$22,250` |
| Standard, 64+ | `$21,000` |
| Certain-applicable higher, under 50 | `$18,100` |
| Certain-applicable higher, 50–59 | `$21,950` |
| Certain-applicable higher, 60–63 | `$23,350` |
| Certain-applicable higher, 64+ | `$21,950` |

The tax-year-end age convention is preserved by deriving age as `taxYear - birthYear`; the focused boundary regressions cover 49/50, 59/60, and 63/64 transitions.

## Accepted FFH-011 authority contract

Core grants the higher base/catch-up only when `simplePlanLimitTaxYear === taxPolicy.taxYear` and `simplePlanLimitCategory === "certain_applicable_higher"`. The legacy `simpleHigherLimitEligible` value is not consulted by the evaluator.

Adversarial tests intentionally conflict legacy and authoritative facts in both directions:

- explicit `standard` + legacy `true` remains standard;
- explicit `certain_applicable_higher` + legacy `false` receives the higher category;
- legacy `true` alone remains standard-limit and `more_information_needed`;
- stale 2025 higher category remains standard-limit and `more_information_needed` for 2026.

Snapshot/security-contract evidence also rejects malformed category/year pairing and preserves the explicit category/year through loader and hypothetical reruns. Missing/unknown authority therefore cannot become routable higher capacity through the legacy field or stale tax-year state.

## YTD, ledger, ordering, and exact-boundary review

SIMPLE employee YTD is aggregated by owner before opportunity evaluation. Remaining room is `max(0, annualLimit - contributedYtd)` and then coordinated with the owner's overall elective-deferral YTD. The focused ledger regression proves that after the base has been fully consumed, standard SIMPLE exposes exactly `$4,000` catch-up room while verified higher SIMPLE exposes exactly `$3,850`; the catch-up is not added twice.

The retirement-capacity ledger sorts entries by account ID, creates one shared elective-deferral group per owner, initializes group room from the maximum verified account room rather than summing duplicate account room, and consumes ordinary room before catch-up room. Equivalent account ordering therefore cannot manufacture additional group capacity.

The exact statutory limits are pinned by tests to zero room / `limit_reached`. Independently applying the frozen arithmetic also gives the required cent-adjacent behavior: one cent below a verified limit leaves `$0.01` and remains available; one cent above clamps to `$0.00` and remains `limit_reached`. No negative or phantom room is exposed.

## Regression preservation

FFH-015 changes only the SIMPLE authority/catch-up branch and the 2026 tax-policy datum/version. HSA opportunities exit through their dedicated HSA legal-capacity path before the changed SIMPLE branch, and the HSA limits themselves are unchanged. IRA, 401(k), 403(b), TSP, 457(b), SEP, and HSA formulas were not rewritten.

The frozen calculation suite remains green, including the previously accepted FFH-012/FFH-028 HSA regressions. The FFH-015 focused suite directly verifies unaffected 401(k) capacity, while the broader advanced-retirement and integration suites retain IRA/workplace/HSA coverage. The explicit SIMPLE category/year contract is also preserved through hypothetical reruns, so Recommendation Refresh does not need to infer authority from the legacy boolean.

## Findings

| ID | Severity | Status | Disposition |
|---|---|---|---|
| R1 — higher-category general catch-up incorrectly `$4,000` | HIGH | **CLOSED** | Frozen Core uses `$3,850` for verified higher-category ages 50–59 and 64+, with `$5,250` replacing it at 60–63. |
| T1 — focused boundary/determinism regression hardening | LOW | **OPEN / NON-BLOCKING** | The dedicated FFH-015 suite pins exact-limit zero room and category/age/ledger adversaries, but does not directly assert one-cent-below/one-cent-above outcomes or a reordered SIMPLE-account input. Frozen source arithmetic and ledger sorting/grouping independently establish those behaviors. Add direct regressions when convenient to harden against future refactors. |

No CRITICAL, HIGH, or MEDIUM technical finding remains open.

## Test sufficiency conclusion

The suite is materially adversarial rather than a mirror of the implementation: it tests contradictory legacy-vs-authoritative facts, stale-year authority, missing authority, age-band transitions, non-stacking 60–63 catch-up, exact statutory-limit exhaustion, catch-up ledger separation, combined SIMPLE/workplace deferral coordination, and an unrelated 401(k) control. Full calculation/security/type/lint/build pipelines pass.

T1 is retained because two packet matrix items are established by direct code/math review rather than dedicated FFH-015 assertions. This is LOW regression-hardening debt, not evidence of incorrect frozen behavior and not a closure blocker from the Technical Auditor perspective.

## CI and failure attribution

Exact production candidate Foundation CI run `34729503423`, job `103649562344`, head `378f18728615732e281d527e56fce9fb1b387406`, passes AI-state validation, production dependency audit, calculations, security, Type Check, lint, and build.

The exact frozen integration target also has Foundation CI run `34729794786`, job `103650352136`, head `01d9c22522d331ca560895e1ad59e6fab9827e8b`, with every same gate passing. There is no integration-only failure.

CI-001 is CLOSED by FFH-029 and is not used for attribution here. The earlier FFH-015 candidate failure at `35e48b7...` was task-owned stale policy-version test expectation and was corrected before `PRODUCTION_SHA`; no red type/lint/build gate is being hidden or inherited at the audited target.

## Final disposition

**PASS WITH NON-BLOCKING FINDINGS**

R1 is **CLOSED** at exact frozen target `01d9c22522d331ca560895e1ad59e6fab9827e8b`. The accepted FFH-011 category/year authority is enforced, legacy/stale evidence cannot independently grant higher capacity, the 2026 SIMPLE base/catch-up bands and boundaries are mathematically correct, YTD/ledger handling does not double-count catch-up capacity, unrelated retirement/HSA behavior remains preserved, and both candidate and frozen-integration CI are fully green.

The only retained item is LOW T1 test-hardening debt. Manager alone owns FFH-015 acceptance/closure and FFH-013 activation.