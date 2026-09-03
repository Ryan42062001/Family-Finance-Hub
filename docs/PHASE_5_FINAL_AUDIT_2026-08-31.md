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

## Fresh final-audit remediation (baseline `dd615405da67bb4a67bf49caec285752669be331`)

The next independent audit identified two HIGH cross-module retirement-capacity gaps and one MEDIUM raw-boundary gap. This focused package preserves the verified core one-time existing-cash → Secure → Build ledger and extends its semantics:

- **P5-FRESH-01 — Windfall final capacity.** Windfall now clones the final authoritative ledger and consumes only remaining verified direct IRA/HSA account and supported shared-group room as the `windfall` consumer. Original opportunity room is not reconstructed. The former scalar cross-group subtraction is removed; `retirementCatchUpApplied` may reduce only the descriptive planning need and never legal capacity. The account/group invariant now covers one-time + Secure + Build + Windfall.
- **P5-FRESH-02 — Your Plan ledger-aware conflicts.** Your Plan semantics remain replacement, not additive: an override replaces its account-specific Recommended Plan amount. Conflict analysis rebuilds the authoritative ledger model from original verified opportunity room, retains fixed one-time consumption, then routes the complete Your Plan employer-match and Build retirement amounts. IRA, HSA, owner, workplace, compensation, YTD, annual-additions, and catch-up constraints remain coordinated through the ledger. Optional additional current-year contributions permit a combined Windfall/Your Plan analysis. Overrides are preserved, while known excess produces a high-severity warning and unknown capacity produces an information-needed warning.
- **P5-FRESH-03 — strict booleans.** `parseStrictBoolean` accepts only actual `true`/`false`. Every decision-relevant raw boolean is explicitly nullable or optional-default. Strings, numbers, arrays, objects, and boxed/coercible values fail with structured `invalid_boolean` diagnostics before calculation; nullable absence remains `null`, and only documented optional defaults apply.

The adversarial tests include Build-, Secure-, and one-time-exhausted Windfall room; partial room; multiple IRAs; owner and married-family HSAs; separate groups; catch-up; unknown capacity; large projection shortfall; Your Plan shared-limit, prior-consumption, spouse, employer-match, catch-up, and unknown-capacity cases; a combined existing-cash/Secure/Build/Windfall/Your Plan immutability scenario; and every audited boolean field. The earlier 25 latest-remediation tests and all prior calculation/security tests remain enabled.

No migration required.

Fresh final-audit remediation complete — pending independent clean audit.

## Married-family HSA remediation (baseline `3572888d3f411ec9f28b28ab4a61d3684c6b06f2`)

The remaining HIGH finding was rooted in the married-family HSA source capacity. Ordinary family room is now a single couple-wide bucket: the 2026 family base limit minus aggregate known spouse YTD contributions. Uneven contribution histories are never forced into equal halves, and multiple accounts cannot multiply the shared limit.

Age-55 catch-up capacity remains owner-specific and can be routed only to that owner's HSA. The persisted snapshot does not identify which YTD dollars are ordinary versus catch-up. When a catch-up-eligible spouse has positive YTD contributions, the engine therefore returns `more_information_needed` for the ambiguous capacity instead of fabricating ordinary or catch-up room. A certainly over-limit aggregate clamps remaining room to zero and exposes a diagnostic.

The corrected ledger is shared by existing-cash deployment, Secure, and Build. Windfall continues to clone the final ledger, and Your Plan continues to use replacement semantics while evaluating the corrected HSA groups. Direct coverage includes the `$8,000/$0` failure, the uneven-YTD matrix, one and two age-55 spouses, ambiguous attribution, over-limit YTD, multiple HSA accounts, every downstream consumer, and collection permutations.

No migration required.

Married-family HSA remediation complete — pending independent clean audit.

## HSA household-uncertainty remediation (baseline `9e41c9e61a38a7b3b9ae7b81905b2e003c517815`)

- **P5-FRESH-AUD-02 — household-wide HSA legal structure.** Married-spouse HSA eligibility and coverage are resolved across all HSA accounts before any actionable room is exposed. When an unknown or inconsistent spouse fact could change whether the married-family limit applies, every affected spouse HSA becomes `more_information_needed`. A known spouse therefore cannot receive optimistic independent room while the other spouse's sharing facts are unresolved. Explicit ineligibility remains a known non-sharing state, and two known self-only coverages remain independently modeled. Owner catch-up room, multiple accounts, Existing Cash, Secure, Build, Windfall, Your Plan, affordability reruns, and refresh fingerprints all inherit the same household decision.
- **P5-FRESH-AUD-03 — exact authoritative annual amounts.** Build now records the exact annual retirement amount consumed from the legal-capacity ledger in addition to its cent-rounded monthly display pace. Recommended Plan and no-override Your Plan use that exact annual amount for capacity accounting. Explicit monthly overrides are still annualized, so a real four-cent excess remains a conflict while display rounding alone does not fabricate one.

Adversarial coverage includes both spouse directions; unknown eligibility and coverage; unknown versus explicit ineligibility; safe known self-only treatment; family coverage; age-55 catch-up; multiple HSAs; Existing Cash, Secure, Build, Windfall, Your Plan, Home/Vehicle, Recommendation Refresh, unrelated IRA routing, collection reordering, and a combined reserve/debt/workplace/IRA/HSA scenario. The known `$8,000/$0` family case remains exactly `$750`.

No migration required.

HSA household-uncertainty remediation complete — pending independent clean audit.

## Low follow-up closure

- The Your Plan regression suite now distinguishes the rounded `$729.17` display of an exact `$8,750.00` authoritative annual HSA allocation from an explicit user override of `$729.17` per month. The no-override path remains conflict-free; the explicit override requests `$8,750.04` annually and reports the real `$0.04` legal-capacity excess without mutating Recommended Plan.
- The current HSA data boundary is explicit: eligibility and coverage facts come from recorded HSA retirement-account records, so household resolution covers represented HSA participants/accounts. No HSA record is not treated as known ineligibility, no facts are invented for an unrepresented spouse, and complete authoritative results depend on the snapshot containing all relevant HSA participant facts. Independent person-level HSA eligibility/coverage persistence remains future scope.

No production calculation or database migration was required for these LOW test/documentation follow-ups.

## Phase 5A — Hybrid Retirement Floor

Phase 5A introduces an explicit derived retirement-floor assessment alongside, not inside, the coordinated legal-capacity ledger. It classifies the plan as `BEHIND`, `ON_TRACK`, `AHEAD`, or `more_information_needed`; uses a 15% normal gross-income baseline; raises the corrective target for projection shortfalls; applies deterministic materiality thresholds before reducing an AHEAD floor to 12%; protects employer match; retains a soft 5% employee-saving guardrail for `BEHIND`/`ON_TRACK` while allowing it to relax for a durably `AHEAD` household; and separates target, feasible protected, and legal opportunity amounts. These thresholds are stability controls, not stateful hysteresis.

The retirement savings-rate numerator is both intent-aware and capacity-aware. Reported schedules are reconciled on cloned full-year and current-year ledgers using the authoritative account/shared-group rules. Only the supported sustainable workplace employee, non-HSA employer, IRA, and long-term HSA pace counts in the numerator and projection; unsupported schedule excess cannot manufacture an optimistic status. Expected current HSA medical spending, persisted as one nullable nonnegative household preference, is excluded once at household level with a zero lower bound. Unknown HSA intent counts no HSA dollars toward the rate when contributions are positive and blocks an optimistic AHEAD status. Taxable brokerage contributions, emergency savings, goals, mortgage principal, and general cash savings do not count by default.

The current-year clone reserves sustainable expected scheduled contributions before `additionalRetirementOpportunityAnnual` is calculated, so a dollar already relied on as planned saving is not simultaneously advertised as unused legal room. The authoritative allocation ledger is not mutated. Feasibility also removes direct employee IRA contributions from incremental take-home cash. Because the snapshot has no payroll/direct source flag for employee HSA dollars, it conservatively treats them as take-home uses and exposes that assumption; workplace payroll deductions are not subtracted twice.

The existing additive migration adds `household_financial_preferences.expected_hsa_medical_spending_annual`; it inherits the table's existing role-aware RLS. This remediation requires no new migration. Phase 5A does not alter goal competition, Windfall ordering, Your Plan policy, or authoritative legal-capacity consumption.

## Phase 5B — Goal Intelligence

Phase 5B adds an explainable derived result for each goal without changing Build allocation competition. It separates Essential/Important/Optional need evidence from category, underlying need from desired solution, preservation from improvement, and an explicitly entered core need from the full desired target. Fixed/Limited/Flexible deadline evidence, required calendar-month funding, funded/on-track/behind/past-due schedule state, concrete underfunding consequences, debt exposure, and target reasonableness remain separate dimensions rather than one opaque score.

Priority bands are High, Medium, Low, Discretionary, and Unclassified; ordinary goals do not acquire the Secure/retirement `protected` meaning. Optional borrowing remains discretionary, and an expensive implementation does not inherit the necessity of its underlying need. Missing material evidence produces `more_information_needed` without inventing a category-based classification or core amount.

Migration `20260903134156_phase_5b_goal_intelligence.sql` adds nullable evidence fields and a legacy-evidence confirmation flag to `goals`, extends existing checks for explicit unknown/Critical states, and inherits the table's existing RLS policies. The financial-profile form collects the smallest coherent set of plain-language facts. Loader, normalization, hypotheticals, strict validation, Recommendation Refresh, and security contracts are aligned. Phase 5C—not Phase 5B—will decide actual goal-versus-retirement allocation.
