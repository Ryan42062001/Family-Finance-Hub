# Technical Audit Handoff

## FFH-012 — HSA Legal-Capacity Calculation — post-FFH-023 independent re-audit

**Audit role:** Technical & Mathematical Auditor  
**Audit date:** 2026-09-11  
**Verdict:** **FAIL — REMEDIATION REQUIRED**

This re-audit was performed independently against the exact integrated FFH-023 checkpoint. Production code and Manager-owned task/acceptance state were not modified.

## Exact audited checkpoints

- Manager control-plane head used as audit base: `d765b036abc266b0a42c975e7c70c0ad8c92c3d9`
- FFH-023 production SHA: `9140d19c27d206b75e2a1825065e58047f1443c2`
- FFH-023 handoff SHA: `8854ebac7861da215aaac87501adad36bb95bbe0`
- FFH-023 integration / PR #11 merge SHA: `1487b192491a704ca3500b42d22a50289ee1551b`
- PR #11: `FFH-023: complete FFH-012 audit remediation`
- Foundation CI run: `34624938204` (`Foundation CI` run #404)
- Foundation CI job: `103347645465`
- Accepted FFH-011 comparison checkpoint: `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a`

The checkpoint chain is independently verified. Commit `9140d19...` is the production implementation commit, `8854eb...` is the Work Helper handoff commit, and `1487b192...` is the actual merge commit integrating PR #11 for independent re-audit.

## Integrated CI verification

Foundation CI run `34624938204` is attached to exact head SHA `1487b192491a704ca3500b42d22a50289ee1551b` and completed with the following gate state:

| Step | Result |
|---|---|
| Dependency setup/install | PASS |
| Production dependency audit | PASS |
| Test calculations | PASS |
| Test security policy contract | FAIL |
| Typecheck | SKIPPED |
| Lint | SKIPPED |
| Build | SKIPPED |

### Security red-step ownership

The security red step does **not** block FFH-012/FFH-023 closure by ownership.

`tests/security/simple-plan-limit-contract.test.ts` is byte-identical at the accepted FFH-011 checkpoint and at the FFH-023 integration. GitHub reports blob SHA `9118f427068861e43cd21fac062574d11201294e` at both `a89e9ae...` and `1487b192...`. The SIMPLE normalized-snapshot shape inspected by that textual regex is likewise already present at the accepted FFH-011 checkpoint. PR #11 does not modify `tests/security/simple-plan-limit-contract.test.ts` or the FFH-011 SIMPLE capture/migration surfaces; its only security-test change is the HSA input-contract security test.

The activation packet reported SIMPLE security-test blob `02297242910c554aa9ada8bf099197f20dfbc41e`; that object ID does not match the repository object returned by GitHub at either comparison checkpoint. This is a provenance-note discrepancy only. The independently material fact is that the actual blob is identical at both checkpoints and the red textual assertion predates FFH-023.

## Prior finding dispositions

### PRIOR FINDING A: OPEN

The original implementation defect — treating `spouse_partner` itself as affirmative statutory-spouse authority — is remediated. However, FFH-022's required unknown-safe legal-authority behavior is still incomplete and can expose unsupported HSA capacity. Therefore the protected-semantic finding is not closed as a whole.

Verified repaired behavior:

- affirmative married-family sharing requires `confirmed_legal_spouses` for the canonical pair and target HSA tax year;
- `confirmed_not_legal_spouses` produces independent HSA evaluation;
- missing authority is normalized to `unknown`;
- `spouse_partner` is used only as a candidate-pair signal, not affirmative authority;
- filing status does not create or erase legal-spouse authority;
- a married-allocation row does not create spouse authority;
- prior-year authority is not selected for the target tax year;
- pair identity is canonical/order-insensitive in persistence and normalization;
- authority facts are serialized through hypothetical reruns and the regression suite verifies Recommendation Refresh invalidation when authority changes.

Blocking gap: the evaluator's `spouseStatusIsMaterial` predicate fails to recognize some combinations where one person's unresolved eligibility/coverage can make the other person's otherwise-known self-only capacity depend on the unresolved legal-spouse state.

### PRIOR FINDING B: CLOSED

The odd-cent shared ordinary allocation defect is closed.

For an affirmative legal-spouse pair, the evaluator rounds the period-aware shared ordinary base to money, converts it to integer cents, assigns `floor(totalCents / 2)` to the first canonical owner, and assigns the exact remainder to the second canonical owner. Therefore owner allocations always sum exactly to the authorized shared ordinary base.

The required `$5,104.17` case now produces exactly:

- first canonical owner: `$2,552.08`;
- second canonical owner: `$2,552.09`;
- sum: `$5,104.17`.

The remainder assignment is deterministic because the candidate pair is sorted by person ID. Reversing person/account/month input order cannot change the canonical pair or the integer-cent split. Explicit alternate allocations remain owner-specific and are rejected as legal authority unless affirmative pair/year spouse authority exists; an affirmative alternate allocation remains constrained not to exceed the period-aware shared base.

No extra cent becomes routable from the equal-default split.

### PRIOR FINDING C: CLOSED

The Build/destination reconciliation defect is closed.

Build now derives aggregate routable monthly retirement capacity from the actual destination ledger consumptions, rounding each consumed annual destination amount to its monthly account route before summing. The final routing loop then routes against the authoritative ledger and throws on **any** positive `retirementToRoute`; the prior `> 0.01` escape hatch is gone.

For the required `$8,750 / $4,375 + $4,375` case:

- owner A monthly destination route = `round($4,375 / 12) = $364.58`;
- owner B monthly destination route = `round($4,375 / 12) = $364.58`;
- aggregate Build allocation = `$729.16`;
- actual destination routes = `$729.16`;
- the engine does not report `$729.17` as actionable capacity.

A dedicated FFH-023 regression asserts aggregate `$729.16`, routed `$729.16`, and the unresolved planning need separately. Positive routing residuals cannot silently disappear. Annual ledger capacity remains authoritative.

## Blocking finding — incomplete unknown-authority materiality detection

**Severity:** HIGH  
**Exact code paths:**

- `lib/calculations/money-priority-hsa-legal-capacity.ts`
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/ffh-012-hsa-legal-capacity.test.ts`
- accepted policy: `.ai/policy/retirement/FFH-022_HSA_LEGAL_MARRIAGE_AUTHORITY_POLICY.md`

**Reproducible scenario:**

Target tax year 2026. Two active, nondependent household people form the candidate pair:

- person A: `relationship = self`, age under 55, HSA profile present, no Medicare, all 12 months `eligibility = eligible`, `coverage = self_only`, HSA YTD = 0;
- person B: `relationship = spouse_partner`, age under 55, HSA profile present, no Medicare, all 12 months `eligibility = eligible`, but `coverage = unknown`, HSA YTD = 0;
- legal-spouse authority for A/B/2026 is missing or explicitly `unknown`;
- no fact is permitted to infer legal marriage from relationship, filing status, or allocation data.

**Expected result:**

FFH-022 says unknown/missing legal-spouse authority must return targeted `more_information_needed` wherever spouse status can change legal capacity, and known self-only room remains actionable only when the spouse/non-spouse distinction **cannot change that supported result**.

A's apparently independent `$4,400` full-year self-only limit is not demonstrably independent here. If B's unresolved coverage resolves to `family` and A/B resolves to `confirmed_legal_spouses`, the ordinary married-family shared base is `$8,750` and the default equal allocation gives A `$4,375`, not `$4,400`. The unresolved facts therefore change A's supported legal-capacity amount by `$25` even before considering a possible valid alternate spouse allocation.

A must not be exposed as having an unconditional `$4,400` of verified actionable HSA capacity while that material pair/year state remains unresolved.

**Actual result:**

`evaluateHsaLegalCapacity()` treats unknown spouse status as material only when:

1. both people are known eligible and at least one has known family coverage; or
2. one person is known eligible with known family coverage while the other person's eligibility is unknown.

It does **not** classify `A = eligible/self_only`, `B = eligible/coverage unknown` as spouse-status material. No legal-spouse-authority missing-data item is therefore added to A. Because there is no affirmative spouse authority, the evaluator enters the independent branch: A receives the full 2026 self-only ordinary capacity of `$4,400`. `money-priority-retirement-accounts.ts` then copies that HSA state/room directly into the retirement opportunity, making it available to downstream capacity-ledger/routing logic.

**Evidence:**

The integrated `spouseStatusIsMaterial` predicate explicitly tests known family coverage and certain unknown-eligibility combinations but omits unknown-coverage combinations that can resolve to family coverage. The accepted FFH-022 policy explicitly requires `more_information_needed` whenever spouse status can materially change the result and explicitly permits self-only locality only when the distinction cannot change the supported result.

The new FFH-023 regression named `unknown spouse authority preserves independently supported self-only capacity` sets **both** people to fully known self-only coverage. That scenario is legitimate and should remain actionable, but it does not cover the asymmetric case where the second candidate's coverage/eligibility is unresolved. The household-uncertainty tests that exercise unknown spouse coverage do so under already-affirmative spouse authority, so they do not cover the missing/unknown-authority interaction above.

**Blocks FFH-012 closure:** YES.

This is a protected-semantic legal-capacity defect, not merely a presentation or test-coverage issue. The original auto-marriage mechanism is fixed, but the accepted FFH-022 unknown-safe contract is not fully implemented.

## Non-blocking finding — transitional HSA fixture helper remains capable of overwriting canonical uncertainty

**Severity:** LOW  
**Exact path:** `lib/calculations/hsa-test-fixtures.ts`

**Reproducible scenario:**

Wrap a fixture that is intended to preserve canonical partial-year, unknown-coverage/eligibility, or stale-YTD-tax-year HSA facts with `withNormalizedHsaFacts()`.

**Expected result:**

A transitional adapter for legacy fixtures should not silently replace deliberately canonical HSA uncertainty or tax-year conditions.

**Actual result:**

The helper force-sets every HSA account's `hsa_ytd_tax_year` to the requested year, reconstructs profiles, and generates twelve `confirmed` month rows from legacy account-level `hsa_eligible` / `hsa_coverage_type` hints. If reused indiscriminately, it can erase the condition a test intended to exercise.

**Evidence:**

The helper still has this behavior at `1487b192...`. The dedicated FFH-012/023 adversarial tests directly construct canonical normalized HSA facts for partial-year, unknown, Medicare, stale-YTD, spouse-authority, odd-cent, and order-invariance cases, so current production correctness is not being inferred solely from the helper. Review of PR #11 shows additive spouse/cent regressions rather than removal/skipping of the old HSA assertions. This remains a test-maintenance hazard, not a closure blocker.

**Blocks FFH-012 closure:** NO.

## Regression/adversarial scope independently reviewed

Outside the blocking unknown-authority edge above, I found no new FFH-023 defect in the following reviewed invariants:

- **Normalized facts vs legacy hints:** production HSA legal-capacity evaluation uses normalized profiles/month rows; legacy account HSA eligibility/coverage hints do not grant canonical legal capacity.
- **Month sensitivity / partial year:** month-level eligibility and coverage drive ordinary capacity; partial-year shared-family bases remain period-aware.
- **Self-only / family:** ordinary limits are selected per month from normalized coverage state.
- **Affirmative married-family sharing:** requires affirmative target-year authority and the existing eligibility/coverage trigger; equal default and explicit alternate allocation behavior remain separated from authority.
- **Confirmed non-spouses:** no shared spouse group/equal-default allocation is created; each person's HSA facts are evaluated independently.
- **Catch-up:** age-55 catch-up remains owner-specific and nontransferable.
- **YTD:** employee plus employer HSA YTD is aggregated by owner; missing/current-year binding is enforced before room is considered known.
- **Tax-year isolation:** HSA YTD and spouse authority are selected for the target year; prior-year authority does not silently carry forward.
- **Medicare:** Medicare timing remains part of month eligibility and reduced-capacity/excess evaluation.
- **Multiple HSAs:** account entries share owner/group capacity so extra accounts do not multiply owner or couple legal room.
- **Capacity propagation:** shared ordinary remaining room, owner catch-up room, capacity basis, and shared group identifiers flow into retirement opportunities/ledger structures.
- **Odd cents / boundary values:** integer-cent shared allocation preserves the exact legal base; Build uses destination-derived monthly routing and exact positive-residual rejection.
- **Determinism/order invariance:** canonical pair sorting and deterministic account ordering preserve equivalent results under reordered inputs for the tested affirmative-authority and allocation paths.
- **Hypothetical/refresh:** normalized legal-spouse authority records are serialized through `snapshotToRaw()` before hypothetical reruns; the FFH-023 regression verifies authority changes invalidate prior shared-family recommendations.
- **One-time vs recurring:** the engine creates one authoritative retirement-capacity ledger, uses a clone for provisional planning, lets Existing Cash consume the authoritative ledger, then recomputes Secure/Build against residual needs on that same remaining ledger and enforces the cross-stage capacity invariant.
- **Secure / Build:** actionable allocations consume the same legal-capacity ledger; Build account routes must reconcile exactly with aggregate retirement allocation.
- **Windfall / Your Plan:** prior FFH-012 cross-consumer architecture/tests remain unchanged by FFH-023 except for normalized authority propagation; no new duplicate-capacity path was introduced by PR #11.
- **Persistence:** the additive `household_hsa_legal_spouse_authorities` table is pair/year keyed, canonical-order constrained, tri-state, provenance-bearing, and RLS-protected. It was integrated as repository migration state, not deployed live by FFH-023.
- **Test legitimacy:** PR #11 adds targeted authority/cent tests and does not weaken the old one-cent failures by tolerance; the exact Build tolerance was removed. The key missing test is the asymmetric unknown-authority + unknown-coverage case described above.
- **Unrelated semantics:** PR #11's changed-file set is bounded to FFH-023 task/handoff, HSA authority persistence/UI/normalization/evaluator/hypothetical paths, Build cent reconciliation, HSA/retirement regression fixtures/tests, and HSA security coverage. I found no unrelated financial-policy semantic rewrite attributable to FFH-023.

## Required bounded remediation before another technical re-audit

1. Expand unknown-authority materiality detection so `unknown`/missing legal-spouse authority blocks a person's HSA capacity whenever unresolved facts on the candidate pair can make the legally supported result differ between spouse and non-spouse resolution. This must include at least `eligible/self_only` for one person plus `eligible/coverage unknown` for the other, and the analogous unresolved eligibility/coverage permutations where family coverage remains possible.
2. Add adversarial regressions for missing **and** explicit `unknown` authority with asymmetric fact certainty. Prove that genuinely independent all-self-only facts remain actionable while any amount that can change under a legal-spouse + family resolution is `more_information_needed`.
3. Preserve the now-correct Finding B integer-cent split and Finding C exact Build routing behavior unchanged.
4. Preferably harden `withNormalizedHsaFacts()` against overwriting deliberately supplied canonical HSA facts; this remains non-blocking.

## Final disposition

**FAIL — REMEDIATION REQUIRED**

- `PRIOR FINDING A: OPEN`
- `PRIOR FINDING B: CLOSED`
- `PRIOR FINDING C: CLOSED`

FFH-023 successfully repairs both cent/accounting defects and removes the original direct `spouse_partner -> married` inference. FFH-012 still must not be closed because one material unknown-authority/unknown-coverage combination can expose HSA capacity that FFH-022 requires to remain unresolved. Manager retains final task/acceptance/closure authority.