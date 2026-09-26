# FFH-052 — Independent Scenario Lab Null-Preferences Technical Audit

**Role:** Technical & Mathematical Auditor  
**Execution:** STANDARD_CHAT_HIGH / FAST_REFRESH  
**Audit target:** `d5f2ed64d856a67bb24dd44aac2e8dbfd988639a` (immutable PR #71 production/test head)  
**Canonical base / assigned audit branch initial head:** `e747d27ddc16c97413bc9832fba37e40797e5a01`  
**Audit branch:** `audit/ffh-052-null-preferences-technical-d5f2ed64`  
**Manager routing packet:** PR #71 issue comment `5746138914`  
**Governing documents:** `.ai/shared/WORKFLOW_V3_1.md`, `.ai/shared/WORKFLOW_V3.md`, `.ai/shared/WORKFLOW.md`, `.ai/roles/technical-audit.md`, `.ai/tasks/FFH-026.md`, Financial Engine Reconciliation Gate where applicable.

## Independent verdict

**PASS WITH NON-BLOCKING FINDINGS**

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 2 |

The null-preferences crash is corrected at the frozen target. The hypothetical expense and capacity results reconcile exactly, and no profile or database write path was identified in the invoked Scenario Lab flow. Two bounded evidence-coverage gaps remain: dedicated executable preference-transition cases and an authenticated end-to-end persisted-state before/after proof. Neither reveals a production defect in the reviewed implementation; both should remain visible to Manager's release-readiness disposition.

**Independence:** I did not read or rely on the Policy Auditor's verdict/reasoning. Worker assertions and green CI were corroboration only, not proof. I did not modify PR #71's product/test head.

## 1. Immutable custody and permitted scope

Fresh live GitHub verification:

- Canonical `main` at routing and audit: `e747d27ddc16c97413bc9832fba37e40797e5a01` (identical compare).
- The assigned audit branch initially compared IDENTICAL to that canonical base: ahead 0, behind 0, files 0.
- PR #71 head remained exactly `d5f2ed64d856a67bb24dd44aac2e8dbfd988639a`, one commit ahead of canonical base.
- PR #71 remained OPEN / DRAFT / UNMERGED and was not Manager-accepted.
- The exact target commit/PR patch changes only:
  1. `lib/calculations/money-priority-recommendation-refresh.ts` (one-line guard replacement);
  2. `lib/calculations/ffh-041-scenario-lab.test.ts` (one new 20-line authenticated dependency-stub regression).
- No migration, schema, RLS, application action, loader, package, or saved-profile mutation is in that diff.
- The synthetic PR merge SHA is **not** the audited product SHA.

No code was substituted from an audit branch or later Manager/control-plane checkpoint.

## 2. Null guard and comparison semantics

Frozen production patch:

```ts
const before = (previous.preferences ?? {}) as unknown as Record<string, unknown>;
const after = (current.preferences ?? {}) as unknown as Record<string, unknown>;
```

Both values are normalized locally for the purpose of enumerating and comparing preference fields; the patch does not assign either normalized value back to `previous.preferences` or `current.preferences`.

The immediately following field-key union is stable-sorted, excludes display-only keys, compares values through `canonicalEqual`, and emits informational preference changes with `previousValue`/`currentValue` when values differ.

**Independent transition truth-table hand-check:** I evaluated the exact guard, key-union, and canonical comparison expressions in a separate dependency-free JavaScript adversary. This is an independent **logic hand-check**, not a runtime execution/import of the repository module:

| Transition | Preference-field change outcome |
|---|---|
| null → null | zero preference changes; no dereference |
| null → populated | populated fields reported as changed |
| populated → null | previously populated fields reported as changed |
| null → empty object | zero field changes; null and empty remain distinct in the overall financial-basis fingerprint |
| empty object → null | zero field changes; fingerprint can still distinguish the basis |
| populated amount → null | affected field reported |
| populated amount → omitted | affected field reported |
| unchanged populated | zero field changes |

Absent-versus-empty nuance: at the **field-change-list** layer, null and `{}` enumerate no fields. At the **full financial-basis fingerprint** layer, null and `{}` remain distinct. Consequently a representation-only null ↔ empty comparison can yield `refresh_recommended` even with no per-field preference changes if authoritative recommendations stay equivalent. That is conservative and does not silently treat absent preferences as a saved empty record.

The normal snapshot schema is `preferences: <normalized object> | null`; the raw snapshot builder returns null when raw preferences are absent. A supplied raw empty object normalizes to a populated object containing the contract's existing normalization defaults; it is not silently created by this PR.

### Malformed/unknown values

The new `?? {}` guard addresses *nullish* inputs, not arbitrary hostile structures. Raw data entering from Supabase is a row object or null, the normalized engine snapshot type admits object/null, and the typed generic scenario validator rejects planning-preference overrides when baseline preferences are absent (`missing_entity`). Protected/unknown generic fields are rejected by the existing validator. An arbitrary non-object `preferences` injected directly into the internal comparison function is outside that normalized contract and is **not** proven fail-closed by the new line; no such broader claim is made here.

## 3. The exact $500/month financial effect

Frozen regression constructs:
- take-home income: $5,000/month;
- baseline housing expense: $3,500/month;
- existing minimum debt payment: $200/month;
- baseline monthly plan capacity: $1,300;
- scenario housing expense: $4,000/month;
- scenario monthly plan capacity: $800.

Independent cent hand-check:

```text
baseline: 500,000 - 350,000 - 20,000 = 130,000 cents = $1,300/month
scenario: 500,000 - 400,000 - 20,000 =  80,000 cents =   $800/month
delta:     80,000 - 130,000           = -50,000 cents = -$500/month
```

The scenario mutates only the hypothetical recurring expense for stable entity `housing`. The canonical engine reruns against the modified **copy**, not an alternate capacity calculator. The output DTO uses `USD/month` for both capacity amounts and allocation deltas, preserving unit identity.

The recommendation-refresh engine's `detectProfileChanges` also reports the `expense.monthlyAmount` change, and `addBasisChanges` reports the `feasibility.monthlyPlanCapacity` change. Fingerprints capture the material expense/capacity change. This ensures that the repair suppresses only the null crash; it does not suppress non-preference change notices or claim the hypothetical result is the saved baseline.

This PR does not change routing, annual/monthly conversion, destination allocation, or shared-capacity algorithms. The Financial Engine Reconciliation Gate is not newly triggered for those mechanisms, but the directly affected capacity delta independently reconciles exactly.

## 4. Missing-data semantics and profile preservation

The Supabase snapshot loader uses `.maybeSingle()` for `household_financial_preferences`. When there is no row, its input to `buildMoneyPrioritySnapshot` is null; the normalized result preserves `preferences: null`. `moneyPrioritySnapshotToRaw` likewise returns null when the normalized baseline is null.

The generic ScenarioDefinition validator explicitly rejects any `planning_preferences` override against a null baseline with `missing_entity`; the overlay never fabricates the rest of that preferences contract. The FFH-052 scenario overrides only an existing expense. Therefore baseline and hypothetical preferences both remain null.

The comparison guard operates only on temporary local objects and cannot create authoritative tax, retirement, insurance, or household preferences. Existing recommendation/engine missing-data states and lists are derived from the actual rerun and transported through `scenarioEngineSummary` and `scenarioRefreshComparison`; the patch does not alter or fill them. `null` is not being converted to zero, false, or a new persisted preference record.

The frozen regression asserts both baseline snapshot preferences null and deep equality of the original synthetic raw profile before/after. That is genuine evidence of in-memory non-mutation, but not evidence of a live persisted-profile before/after transaction.

## 5. Authenticated scenario, stale fail-closed and household isolation

Independent source inspection traces:

`ScenarioLabPage` / server actions → `resolveScenarioHouseholdAuthority` → `loadMoneyPrioritySnapshot(authority.householdId)` → canonical engine/baseline fingerprint → stale and generic-validation gates → overlay/engine rerun → comparison DTO.

- Auth authority comes from authenticated claims and a membership query filtered by the claims subject; client request cannot select a household.
- The generic transport's exact-key validator rejects a client-supplied `householdId`.
- Every run loads the current household snapshot before validating the client's fingerprint/policy basis; stale requests return `stale_baseline` with null scenario summary/provenance.
- The stored profile and baseline engine are separate from the hypothetical overlay.
- The production snapshot loader filters all financial collections and the optional preferences row by server-authoritative `household_id`, and does not issue inserts/updates/deletes.

The new worker regression uses a dependency stub with `authenticated: true`; it exercises the actual generic execution function but **does not itself exercise real claims/membership, Supabase RLS, a multi-household transaction, or live HTTP transport**.

### Read-only live Supabase verification

Linked project `tsqwvggojeudgspnumze` reported `ACTIVE_HEALTHY`.

Read-only inspection of live PostgreSQL policy catalog found RLS enabled on:
- `household_members`;
- `household_financial_preferences`;
- `expenses`;
- `income_sources`;
- `accounts`;
- `debts`;
- `goals`;
- `retirement_accounts`.

Their SELECT policies use `private.can_read_household(household_id)`. Inspection of that helper's live definition showed a membership lookup requiring:
`household_members.household_id = target_household_id` AND `household_members.user_id = auth.uid()`.

Owner/member financial-write policies use `private.can_write_household_financials(household_id)`; those roles are separate from the Scenario Lab read path.

This confirms the **deployed structural RLS/membership predicates** relevant to these reads. No authenticated two-household negative probe was executed in this audit.

## 6. Database non-persistence boundary

Independent review of the invoked page, server actions, authority resolver, loader, generic execution, overlay, engine rerun and comparison found **no profile/financial write call**. The page and workspace do not contain browser-persistence APIs (`localStorage`, `sessionStorage`, or `indexedDB`), and the server action calls read-only loader functions and pure calculations. The PR diff cannot add a write path because it touches only the comparison guard and a test.

That supports a **source-level no-write verdict** for the exact affected path. It is not a claim that a separate authenticated production HTTP + database row-diff verification happened. No production financial/profile data was written or mutated for this audit.

## 7. Test sufficiency, adversaries, and CI attribution

Independently inspected:
- exact two-file PR patch;
- canonical Recommendation Refresh implementation and pre-existing regression suite;
- exact new FFH-052 generic authenticated execution test;
- scenario snapshot builder/raw adapter/definition validator/overlay/runner;
- generic server execution, fingerprint, authority, actions, page/workspace;
- Supabase snapshot loader;
- live RLS/helper catalog.

Independent adversarial checks were explicitly bounded to:
- nullish/field-transition logic truth table, distinguished from module execution;
- exact-cent capacity conservation;
- source-traced stale, auth, no-write, preference-missing and household-scoping paths;
- read-only live RLS definition verification.

Worker-reported test outcomes were **not** re-executed independently against a local checkout in this audit. The immutable product SHA's existing FULL Foundation CI is supporting evidence:
- run `35476026916`, #791;
- `verify` job `105985308021`;
- `head_sha = d5f2ed64d856a67bb24dd44aac2e8dbfd988639a`;
- conclusion SUCCESS;
- classifier FULL;
- calculations, security, dependency audit, state validation, typecheck, lint, build and final guardrails successful.

CI success does not prove the missing explicit transition tests or a live persisted-state negative test.

## 8. Findings

### TMA-052-01 — LOW / NON-BLOCKING — explicit preference-transition regression coverage

Only the null→null authenticated scenario is newly exercised end-to-end by the frozen test. The actual comparison guard/key-union logic independently hand-checks correctly for null→populated, populated→null, populated field→null and null↔empty. However the new regression does not assert those outputs from the real `assessRecommendationRefresh` module or assert `detectedChanges`/capacity-delta notices in its primary scenario.

**Impact:** future refactors could regress the transition/status transport without this test catching them. No current production defect was identified from source/logic review.

**Suggested follow-up:** add direct module tests for the transition matrix and an authenticated DTO check for the expense + feasibility change notices, preserving absent-baseline null.

### TMA-052-02 — LOW / NON-BLOCKING — persisted-state and multi-household runtime evidence gap

The new saved-profile assertion is in-memory only. Independent source tracing proves no reachable write call on the affected Scenario Lab execution path, and read-only live catalog checks confirm household-scoped RLS predicates. There was no authenticated two-household production-safe HTTP run with transactional persisted before/after profile row evidence in this audit.

**Impact:** the exact implementation shows no new write or isolation defect, but the runtime claims should not be overstated from a dependency stub or static SQL-policy inspection.

**Suggested release-readiness evidence:** under FFH-026's authorized production-safe smoke scope, capture an authenticated test-household baseline/profile row snapshot, run the hypothetical expense scenario, confirm no persisted profile/expense changes, and confirm a distinct user's household remains unreadable. Do not use real household data or weaken RLS.

Neither LOW finding grants release/Private Beta authorization. Manager retains the exact deployment acceptance gate.

## 9. Final disposition

**PASS WITH NON-BLOCKING FINDINGS**

The frozen PR #71 target repairs the null-preferences dereference without altering saved preference authority, and the stated hypothetical $500/month capacity delta is exact. No blocking source-level financial, auth, stale, household-scoping, or persistence defect was identified. Test/evidence gaps are bounded and explicitly separated from verified behavior.

PR #71 must remain DRAFT/UNMERGED until Manager reconciles independently submitted Technical and Policy verdicts and explicitly accepts the exact implementation. PR #68/deployment and Private Beta remain separate release gates. No production implementation, database content, RLS configuration, or Policy Auditor file was modified by this auditor.
