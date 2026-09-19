# FFH-052 — Independent Scenario Lab Null-Preferences Financial Policy & Scenario Audit

## Identity and custody

- Repository: `Ryan42062001/Family-Finance-Hub`
- Role: Financial Policy & Scenario Auditor; fresh independent audit.
- Execution: `STANDARD_CHAT_HIGH`; refresh: `FAST_REFRESH`.
- Assigned branch: `audit/ffh-052-null-preferences-policy-d5f2ed64`.
- Initial branch/canonical-main SHA independently verified: `e747d27ddc16c97413bc9832fba37e40797e5a01`.
- Immutable implementation/test target audited **only**: `d5f2ed64d856a67bb24dd44aac2e8dbfd988639a`.
- Source PR: **#71**, open, DRAFT, unmerged; its live head was reverified at the immutable target before report publication.
- Manager immutable routing packet: PR #71 comment **5746138914**, dated 2026-09-19.
- Task context: `.ai/tasks/FFH-026.md`; governing workflow V3.1/V3/V2, `.ai/roles/policy-audit.md`, Financial Engine Reconciliation Gate, accepted FFH-039 Scenario Lab product/technical contract, and relevant canonical Money Priority/Recommendation Refresh source and regressions.
- The Technical Auditor's report, verdict, and reasoning were not opened, read, or used.
- Audit is policy/scenario-only; no production implementation, task state, migration, database row, or source PR was modified.

## Final verdict

**PASS WITH NON-BLOCKING FINDINGS**

- CRITICAL: **0**
- HIGH: **0**
- MEDIUM: **0**
- LOW: **1** — test-evidence hardening only; not a demonstrated financial-policy behavior defect.

The exact target does not exhibit the null-preferences policy failure on the reviewed source and existing executed $500 recurring-expense regression. Missing preferences are not fabricated; no added routing authority, financial-capacity reuse, or profile-write path was identified. FFH-026's deployed runtime privacy/persistence verification remains a separate release gate, not authorization supplied by this audit.

---

## 1. Exact target change and regression

Independent base-to-target compare:

`e747d27ddc16c97413bc9832fba37e40797e5a01 -> d5f2ed64d856a67bb24dd44aac2e8dbfd988639a`

One commit, two changed files only:

1. `lib/calculations/money-priority-recommendation-refresh.ts`: replaces unconditional cast of `previous.preferences`/`current.preferences` to record with `(preferences ?? {})` for *comparison only*.
2. `lib/calculations/ffh-041-scenario-lab.test.ts`: adds the named FFH-026 authenticated mock scenario regression.

No changes to scenario override semantics, accepted financial policy, Money Priority Engine, snapshot normalizer, raw adapter, Supabase loader/auth, schema/RLS, profile persistence, package, or deployment configuration.

The fix does **not** assign `{}` to a snapshot or database profile. Its use of `{}` is confined to enumerating the union of keys in `detectProfileChanges`.

## 2. Direct expense/capacity scenario evidence

The new source regression explicitly creates:

- saved raw profile with `preferences = null`;
- monthly active take-home **$5,000**;
- essential monthly housing **$3,500**;
- monthly minimum credit-card payment **$200**;
- authenticated dependency stub returning the normalized household snapshot;
- one typed hypothetical expense replacement `housing: $3,500 -> $4,000/month`.

The accepted snapshot aggregation is:

`monthlyCashFlowBeforeSavings = monthlyTakeHomeIncome - monthlyRequiredOutflow - monthlyDiscretionaryExpenses`.

The independent exact-cent hand-check is:

| Item | Baseline | Hypothetical |
|---|---:|---:|
| Monthly take-home | $5,000.00 | $5,000.00 |
| Essential housing | $3,500.00 | $4,000.00 |
| Debt minimum | $200.00 | $200.00 |
| Cash flow / plan capacity before savings | **$1,300.00/month** | **$800.00/month** |

Exact change: `$800.00 - $1,300.00 = -$500.00/month`. No tolerance, unexplained offset, or hidden residual was needed.

The test asserts:
- `executeScenarioRun(...).status === "valid"`;
- baseline summary monthly plan capacity `1300`;
- scenario summary monthly plan capacity `800`;
- normalized baseline snapshot `preferences === null`;
- original in-memory raw profile deep-equals its pre-run clone.

This is **direct executable test evidence**, and the target's FULL Foundation CI passed. The test's `savedProfile` object is an in-memory fixture; its name must not be construed as proof of a production database read-after-run.

Financial meaning: the $500 hypothetical expense increases required outflow by $500 and reduces available recurring capacity by exactly $500. It does not state that another $500 is available to fund a new destination, and it does not bypass the original Secure/Build/retirement priority engine.

## 3. Null-to-null, null-to-populated, populated-to-null matrix

The following is a **fresh source-path and contract-derived adversarial review** of the exact frozen implementation. PR #71's new automated test directly executes null-to-null with an expense change; it does **not** directly execute the latter two transitions (LOW finding below).

| Previous / current preferences | Refresh comparison behavior | Financial/authority behavior |
|---|---|---|
| `null -> null` | Both comparison-only maps enumerate zero preference keys; no preference-field change is fabricated or `Object.keys(null)` call made. Other real changes (e.g. housing expense) remain detectable. | Both actual snapshots retain `preferences: null`; the scenario raw adapter preserves null. |
| `null -> populated` | Previous comparison-only map has no keys; union contains populated fields. `undefined` versus recorded values produces field changes, including actual `null` values. The canonical financial-basis fingerprint retains the actual null/object distinction. | A genuinely populated authoritative record may change comparison/engine output, but a generic scenario cannot invent that record from an absent baseline. |
| `populated -> null` | Union contains previous populated fields; their removal is detected without treating missing as numerical zero or `false` in the comparison. Actual null/object basis remains distinguishable. | The underlying snapshot/raw adapter remains null after a legitimate record loss; stale prior scenario fingerprints must not be used as current authority. |

`scalar(undefined)` omits a display value from a change DTO rather than assigning a fabricated `0`, `false`, or a fake statutory fact. The UI's field-level wording does not by itself prove an explicit record-added/record-removed status, but a basis change is preserved and no extra allocation authority follows from the comparison.

`assessRecommendationRefresh` compares two existing engine results; it is **not** the engine, a persistence action, or a legal/financial fact editor.

## 4. Absent preferences and conservative unknown semantics

**CLEARS.**

The frozen snapshot normalizer uses `raw.preferences ? {...} : null`. The normalized-to-raw adapter uses `snapshot.preferences ? {...} : null`.

The generic overlay applies only explicitly supplied, validated fields to a cloned raw snapshot. `planning_preferences` overrides when the baseline preferences record is absent return a structured `missing_entity` validation issue rather than manufacturing the remainder of a household preference contract.

Unknown legal/statutory fields remain protected by the generic validator, including HSA/IRA/SIMPLE tax-year/legal facts and tax-profile status. No nullable preference is silently promoted to a positive legal contribution limit by this one-line comparison change.

An absent *optional planning-preference record* does not automatically mean that otherwise known cash flow must become zero or invalid. The canonical engine still derives the known `$5,000 - $3,500 - $200` baseline and `$5,000 - $4,000 - $200` hypothetical capacity while retaining separate missing/unknown facts where the accepted policy requires them.

The existing Recommendation Refresh logic derives recommendation materiality and urgency from canonical engine outputs. The fix does not hardcode a new emergency target, risk score, retirement floor, priority rank, or destination.

## 5. Hypothetical versus saved financial state

**CLEARS at source/contract boundary.**

The authenticated Scenario Lab run:
1. derives household authority server-side;
2. reads the current household snapshot;
3. reruns the canonical Money Priority Engine to build the baseline;
4. compares the submitted outer/nested fingerprint and policy basis to the current baseline;
5. validates a bounded scenario definition;
6. applies the hypothetical override to cloned raw inputs and reruns the same engine;
7. returns separate baseline/scenario summaries plus `provenance.hypothetical = true` and Recommendation Refresh explainability.

The expense scenario leaves `baseline.snapshot.preferences === null`; no preference creation is needed to calculate the $500 change. The original test fixture is deep-equal to its pre-run copy.

The server actions expose run/rebase/compare and specialized run/rebase, not profile insert/update/save/commit. The PR changes only a pure comparison and a test. No new hypothetical-to-profile write authority was identified.

**Evidence limitation:** the new regression's saved-profile non-mutation assertion is an **in-memory** assertion. This audit did not execute a production database before/after capture or live write-probing. Source-path/no-write findings and the separate FFH-026 deployed persistence smoke gate must not be reported as equivalent to an observed production DB transaction test.

## 6. Household isolation, authentication and staleness

**CLEARS at source/contract boundary; deployed RLS smoke belongs to FFH-026.**

`resolveScenarioHouseholdAuthority` uses authenticated claims and membership rows for that user, not a client-provided household identifier. Scenario execution loads `loadMoneyPrioritySnapshot(authority.householdId)`; the loader scopes every financial-table query, including optional `household_financial_preferences.maybeSingle()`, by `household_id`.

No cross-household profile source is selected by the changed Recommendation Refresh function. It consumes already-scoped previous/current engine results and introduces no cross-household lookup.

Existing frozen tests:
- unauthenticated run rejects before household load;
- client-provided household ID spoof is rejected as an unknown field while loading the server-derived household;
- each explicit run reloads current baseline;
- stale fingerprint/policy basis fails closed with no scenario result;
- protected client fields fail validation.

These tests use dependency stubs. They are not an actual multi-household deployed PostgREST/RLS exercise. FFH-026 retains its independent production-safe isolation requirement.

## 7. Reconciliation and recommendation-authority boundary

**CLEARS.**

The $500 is an input-to-capacity delta in `USD/month`; it is not an additional cash deployment, goal funding or annual retirement contribution. `scenarioEngineSummary` reports baseline and hypothetical amounts separately and labels feasibility `USD/month`; allocation DTOs retain explicit monthly and annual units.

Recommendation Refresh only compares existing canonical recommendation, feasibility, retirement-floor and goal-intelligence outputs. Its fingerprints/diffs do not consume cash or retirement legal room. It cannot convert the hypothetical profile into the authoritative saved household profile.

The Financial Engine Reconciliation Gate is satisfied for the applicable cash-flow boundary:
- baseline `500000 - 350000 - 20000 = 130000` cents;
- hypothetical `500000 - 400000 - 20000 = 80000` cents;
- delta `-50000` cents.

The target changes no financial allocator, legal ledger, annual/monthly conversion or routing path. No new capacity reuse is introduced by comparison-only null safety.

## 8. Finding FFH-052-P01 — LOW / NON-BLOCKING

**Missing direct executable transition and persisted-state proof in PR #71's new regression evidence.**

The new regression directly exercises an authenticated dependency-stub scenario with `null -> null` preferences and a $500 expense change; it does not add explicit `null -> populated` or `populated -> null` Recommendation Refresh tests, and its deep-equality check is in-memory only.

The exact source path was independently reviewed for both untested transitions and is null-safe, conservatively distinguishes `null` from an actual populated object in the financial basis, and does not write profile data. This is therefore **not a demonstrated policy/financial behavior defect** and does not block policy acceptance of PR #71.

**Recommended bounded evidence hardening:** add direct compare/regression cases for all three transition directions, their actual basis/field changes, and preserved unknown values; have FFH-026 capture privacy-safe persisted-profile before/after and cross-household RLS evidence in its existing deployment gate. Do not broaden the one-line null-preferences remedy or make the audit a substitute for deployment smoke.

No production-policy or implementation remediation is required from this audit.

## 9. CI and attribution

Exact PR #71 HEAD reverified as `d5f2ed64d856a67bb24dd44aac2e8dbfd988639a`, open/draft/unmerged.

FULL Foundation CI run `35476026916` / job `105985308021` — **SUCCESS**, exact head. FULL classifier, AI-state validator, dependency audit, calculations, security, typecheck, lint, build, evidence upload and guardrails passed. CI is supporting evidence only; it does not establish absent DB writes at runtime or turn source-derived transition analysis into executed test proof.

## Final disposition

**PASS WITH NON-BLOCKING FINDINGS.**

- CRITICAL: 0; HIGH: 0; MEDIUM: 0; LOW: 1 (evidence-hardening P01).
- No blocking financial-policy defect or unauthorized recommendation authority found on the immutable target.
- PR #71 remains DRAFT/UNMERGED and not self-accepted.
- The Technical Auditor's independent verdict remains a separate gate; this Policy lane did not inspect or rely on it.
- Manager owns dual-audit reconciliation/remediation routing/merge and FFH-026 release gates.

## Next Activation

| Order | Employee / Role | Status | Copy/paste activation prompt |
|---:|---|---|---|
| 1 | Manager / Architect | RECOMMEND TO MANAGER | Continue Family Finance Hub as Manager / Architect. Reconcile FFH-052 independent Policy and Technical audits for PR #71 against immutable target `d5f2ed64d856a67bb24dd44aac2e8dbfd988639a` and PR comment `5746138914`. Verify exact report/handoff SHAs, findings, PR state and CI; decide bounded remediation/acceptance without merging or authorizing Private Beta before the required gates. |
| 2 | Retirement & Tax-Advantaged Policy Analyst | IDLE | — |
| 3 | Debt & Liquidity Policy Analyst | IDLE | — |
| 4 | Goals, Cash Flow & Allocation Policy Analyst | IDLE | — |
| 5 | Core Financial Engine Engineer | IDLE | — |
| 6 | Application, Data & Integration Engineer | WAIT | FFH-026 release-readiness is a separate Manager-controlled gate; no new worker activation by this audit. |
| 7 | Regulatory & Financial Research Analyst | IDLE | — |
| 8 | Product & Technical R&D Engineer | IDLE | — |
| 9 | Technical & Mathematical Auditor | ACTIVE | Independent FFH-052 Technical lane; do not infer its verdict. |
| 10 | Financial Policy & Scenario Auditor | WAIT | — |
| 11 | Work Helper / Super Troubleshooter | IDLE | — |
