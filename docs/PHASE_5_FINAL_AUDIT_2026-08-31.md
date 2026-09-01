# Phase 5 Money Priority Engine — Adversarial Audit Remediation

Date: 2026-09-01
Branch: `phase-5-money-priority-engine`
Original audited predecessor: `0fb33e54e5a9d2216de4d6420aa3f92badc4425d`
Latest audited checkpoint: `3185577e1919123c4c41766fa41b2ae1dffaf6db`

## Status

The original adversarial audit found authorization, workplace-compensation, input-validation, deterministic-ordering, CI, test-coverage, and documentation findings. Subsequent audit passes found four additional calculation/runtime findings at the latest audited checkpoint. This package records their focused remediation without declaring the branch clean.

**Phase 5 final audit remediation complete — pending independent clean audit.** This document does not declare Phase 5 clean or ready to merge.

## Remediation summary

- Household authorization is role-aware. Owners and members can write household financial records; viewers are read-only. Household metadata updates are owner-only.
- `households.created_by` is immutable after creation. The onboarding creator-membership bootstrap remains unchanged.
- Financial-table UPDATE policies check both the source and destination household, preventing household-ID reassignment bypasses.
- Workplace 401(k), 403(b), and TSP annual-additions calculations use only account-specific `plan_eligible_compensation_annual`. Person-wide estimated compensation is not a substitute. Missing plan compensation produces `more_information_needed`.
- Raw snapshots reject duplicate IDs, orphan references, malformed decision enums, and invalid negative/nonfinite financial values with structured diagnostics. Invalid decision dates remain conservative and are included in snapshot warnings.
- Equal-APR Optimize ordering uses stable debt ID rather than display name.
- `package-lock.json`, `npm ci`, production-dependency audit, explicit type checking, and a security-policy contract test were added to Foundation CI.
- Live owner/member/viewer/non-member and cross-household RLS behavior is a required closure check; CI's deterministic migration-contract test is supplemental and does not pretend to execute PostgreSQL RLS.

## Authorization contract

| Role | Read household data | Write financial data | Update household metadata |
|---|---:|---:|---:|
| owner | yes | yes | yes |
| member | yes | yes | no |
| viewer | yes | no | no |
| non-member | no | no | no |

Household membership administration remains outside the current invitation-flow scope. Existing bootstrap creation adds only the authenticated creator as owner.

## Retirement compensation boundary

Three compensation concepts remain distinct:

1. person-wide current taxable compensation for IRA/spousal-IRA analysis;
2. account-specific current plan-eligible compensation for 401(k), 403(b), and TSP annual additions;
3. prior-year sponsor wages for Roth catch-up treatment.

No value is inferred from another category. Multiple workplace records remain `more_information_needed` when employer/plan identity is insufficient to determine separate plan-limit treatment.

## Verification boundary

Foundation CI verifies deterministic calculations, migration-policy structure, TypeScript, lint, production build, reproducible installation, and production dependency audit. It does not have credentials or a disposable Supabase instance and therefore cannot execute live RLS behavior. Live transactional role verification and Security Advisor review are recorded separately as closure evidence.

## Intentionally deferred scope

- production Phase 5 recommendation UI;
- automatic transfers, payments, trades, or contributions;
- bank synchronization;
- persisted recommendation history and background notifications;
- full tax-return and student-loan certification simulation;
- 403(b) 15-years-of-service catch-up;
- governmental 457(b) special last-three-years catch-up;
- precise unrelated-employer plan grouping until plan/sponsor identity is persisted.

## Next decision

Run a new adversarial, read-only audit against the final remediation commit. Only that independent audit may issue a clean merge recommendation.

## Final HIGH-severity remediation (2026-09-01)

Parent checkpoint: `25baaa4314a5cf64f7e31f072931c7cf487e0e63`

Two HIGH findings identified after the earlier remediation are closed in this focused package:

- **P5-FINAL-01 — Secure employer-match legal capacity.** Secure now consumes the same authoritative retirement-account opportunity result used by Build. An uncaptured match produces an allocation only when legal employee-contribution capacity is known and available. Exhausted capacity produces no allocation; missing employee YTD, employer YTD, plan-specific compensation, or another required limit fact produces `more_information_needed`. Partial remaining room caps both the monthly recommendation over the remaining tax-year months and the recommendation's annual claim. Fully captured matches remain absent. Employer-match payroll behavior remains distinct from one-time cash deployment.
- **P5-FINAL-02 — required numeric values.** The raw snapshot boundary now has a centralized required-versus-nullable numeric contract. Missing required income, expense, account, debt, retirement-contribution, and goal numbers produce structured `missing_required_number` issues instead of being coerced to zero. Explicit zero remains valid where allowed, while absent nullable values remain `null`. Finite, sign, percentage, integer, and bounded-domain checks run before authoritative recommendations.

Adversarial regression coverage includes exhausted elective deferrals, exhausted annual additions, partial room, missing capacity facts, fully captured matches, available and catch-up room, every core required numeric family, explicit-zero/null separation, invalid bounds, and a combined optimistic-capacity attack. The cross-stage monthly-capacity invariant remains enforced.

**Final HIGH-severity remediation complete — pending independent clean audit.**

## Latest independent-audit remediation (checkpoint `3185577e1919123c4c41766fa41b2ae1dffaf6db`)

- **P5-FA-01 — cross-stage retirement legal capacity.** One authoritative derived ledger now coordinates verified legal room by account, owner, and supported shared statutory group. Consumption order is one-time concrete account contribution, Secure employer-match payroll contribution, then Build account routing. Account and group invariants prevent those claims from exceeding original verified room, with catch-up tracked separately. Build leaves projection shortfall visible but does not emit generic actionable retirement dollars without a known legal destination. Ambiguous capacity remains `more_information_needed`.
- **P5-FA-02 — strict required numbers.** Validation and normalization share `parseStrictNumber`. Finite numbers and plain trimmed decimal strings are supported; whitespace, booleans, arrays, objects, numeric junk, formatted currency, and nonfinite values fail validation. Malformed outflows therefore cannot become synthetic zero or create fake capacity.
- **P5-FA-03 — Secure shuffle invariance.** Employer-match ties end in stable account ID. High-interest debt is APR descending then debt ID. Promotional/special debt is expiration ascending, effective APR descending, then debt ID; contextual and unknown debt paths also end in debt ID. Regression tests compare entity-level destinations across permutations of all authoritative collections.
- **P5-FA-04 — goal schema parity.** Ordinary raw goals require a positive target and enforce `0 <= coreNeedAmount <= targetAmount` when core need is present. Explicit Home/Vehicle hypothetical reruns remain supported without weakening the authoritative raw-input contract.

No migration required. These findings were calculation/runtime defects; the persisted goal constraints were already correct.

Verification at implementation time: 608 calculation tests passed, 5 security-contract tests passed, production dependency audit found 0 vulnerabilities, typecheck passed, lint passed with one pre-existing warning and no errors, and the production build passed. Foundation CI evidence is recorded against the final commit after publication.

**Phase 5 final audit remediation complete — pending independent clean audit.**
