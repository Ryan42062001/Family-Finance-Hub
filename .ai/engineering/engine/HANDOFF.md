# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-015
Role: Core Financial Engine Engineer
Status: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT
Approved production integration base: `61ad63ea1f41002e47708887505bf2b3365ea077`
Manager control-plane head verified during execution: `682ccf5f59f8f7f37923c289ab988cf6d504aacf`
Branch: `ffh/ffh-015-simple-core-remediation`
Pull request: #19 (draft), targeting `phase-5-money-priority-engine`
PRODUCTION_SHA: `378f18728615732e281d527e56fce9fb1b387406`
VALIDATED_CI: Foundation CI run `34729503423`, job `103649562344` — PASS

Assigned objective: Implement only the narrow FFH-015 SIMPLE Core statutory remediation after FFH-011 established the explicit persisted/runtime plan-category contract. Preserve accepted HSA behavior, unrelated retirement capacity, and the clean FFH-029 CI baseline. Do not redesign persistence/schema/UI, implement FFH-013/FFH-017, perform Supabase work, merge, or self-accept.

Before behavior: Core did not consume the Manager-accepted FFH-011 `simplePlanLimitCategory` + `simplePlanLimitTaxYear` authority. It instead allowed the legacy `simpleHigherLimitEligible` boolean to influence higher-limit SIMPLE capacity. The SIMPLE limit helper also applied the ordinary `$4,000` age-50 catch-up to both categories outside ages 60–63, which overstated a verified certain-applicable higher plan by `$150` in those age bands. Ages 60–63 already had a distinct catch-up band but category authority was still not correctly sourced.

Root cause: The FFH-011 persistence/runtime contract was accepted after older Core formula tests and helpers had been written around the legacy boolean. Core therefore had two stale assumptions: legacy boolean authority and one shared general SIMPLE age-50 catch-up. During final CI remediation, one integration regression also still hard-coded tax-policy version `2026.2`; FFH-015 legitimately adds a new approved 2026 SIMPLE policy datum and advances that policy version to `2026.3`.

Implementation completed:
- Core now treats explicit SIMPLE category plus matching tax year 2026 as the sole authority for the higher category.
- Verified `standard` uses the `$17,000` base and `$4,000` age-50 catch-up outside ages 60–63.
- Verified `certain_applicable_higher` uses the `$18,100` base and `$3,850` age-50 catch-up outside ages 60–63.
- Ages 60–63 use the `$5,250` catch-up as a replacement band for either category; catch-ups do not stack.
- Missing, stale, unknown, or legacy-only category evidence stays conservative at the standard limit and `more_information_needed`; legacy `simple_higher_limit_eligible` cannot grant higher capacity.
- Capacity-ledger tests prove standard and higher-category catch-up room remain distinct.
- Existing Core statutory and advanced-retirement fixtures were migrated to the accepted explicit category/year contract where those tests intend verified standard/higher SIMPLE behavior.
- The engine tax-policy-version regression now expects `2026.3`, matching the newly added approved SIMPLE policy datum.

Files changed at PRODUCTION_SHA relative to the Manager control-plane branch:
- `lib/calculations/ffh-006-retirement-statutory-remediation.test.ts`
- `lib/calculations/ffh-015-simple-core-remediation.test.ts`
- `lib/calculations/money-priority-advanced-retirement.test.ts`
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-integration.test.ts`
- `lib/calculations/money-priority-tax-policy.ts`

After behavior / proved boundaries:
- Standard age 50–59 or 64+: `$21,000` total capacity.
- Verified higher age 50–59 or 64+: `$21,950` total capacity.
- Standard ages 60–63: `$22,250` total capacity.
- Verified higher ages 60–63: `$23,350` total capacity.
- Below age 50 uses only the applicable base limit.
- Exact annual-limit boundaries reach zero remaining room without category leakage.
- Legacy boolean alone and stale tax-year authority do not grant the higher limit.
- Unrelated 401(k) capacity remains unchanged.

Validation actually performed on exact PRODUCTION_SHA `378f18728615732e281d527e56fce9fb1b387406`:
- Foundation CI run `34729503423`, job `103649562344`: PASS.
- Validate AI control-plane state: PASS.
- Audit production dependencies: PASS.
- Full calculation test suite: PASS, including focused FFH-015 SIMPLE/category/age-band/boundary tests and existing FFH-011/Core regressions.
- Security policy contract: PASS.
- Type check: PASS.
- Lint: PASS.
- Build: PASS.

CI diagnosis/remediation note: Candidate `35e48b745d1d7278e0a3a9d929d4e2a32f5a71f9` failed full calculation tests. Direct candidate inspection found the remaining stale regression in `money-priority-retirement-integration.test.ts`, which asserted tax-policy version `2026.2`. Updating only that expected policy version to `2026.3` produced exact candidate `378f18728615732e281d527e56fce9fb1b387406`, after which the complete Foundation CI pipeline passed. This failure was task-owned and was not relabeled as closed CI-001 debt.

Scope / forbidden-domain verification: PR #19's worker delta against `phase-5-money-priority-engine` contains only the six calculation/test files listed above. No schema or persistence contract changes, UI changes, Supabase/live-database changes, HSA policy/implementation changes, FFH-013 implementation, FFH-017 implementation, or unrelated retirement-engine refactor were made. Accepted FFH-012/FFH-028 HSA behavior remained covered by the green full calculation/security pipeline.

Blocking issues: NONE for Engineering handoff. Manager acceptance, merge authority, and any later audit/integration lifecycle remain Manager-owned.

Unverified / intentionally not performed: Manager acceptance, merge, FFH-013 activation, FFH-017 activation, Supabase/live-database work, independent audit.

Recommended next role: Manager / Architect.

Exact next action: Manager verifies PR #19, PRODUCTION_SHA `378f18728615732e281d527e56fce9fb1b387406`, exact green Foundation CI run `34729503423` / job `103649562344`, and this Core handoff commit; Manager then owns acceptance/integration/audit routing. Engineering must not mark FFH-015 ACCEPTED/CLOSED or merge the PR.

Checkpoint vocabulary:
- `PRODUCTION_SHA`: `378f18728615732e281d527e56fce9fb1b387406`
- `VALIDATED_CI`: Foundation CI run `34729503423`, job `103649562344`, PASS
- `HANDOFF_SHA`: the documentation commit containing this file; use the repository write commit as the exact handoff checkpoint
- `INTEGRATION_SHA`: not established by Engineering

Constraints preserved:
- FFH-011 accepted SIMPLE category/year contract is the sole explicit higher-category authority.
- No persistence/schema/UI redesign.
- No HSA remediation or policy changes.
- No FFH-013 or FFH-017 implementation.
- No Supabase/live-database work.
- No unrelated retirement refactor.
- No reopening/relabeling of closed CI-001.
- No self-acceptance, merge, or Manager lifecycle transition by Engineering.
