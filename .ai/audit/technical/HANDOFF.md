# Technical Audit Handoff

## FFH-012 — HSA Legal-Capacity Calculation

**Audit role:** Technical & Mathematical Auditor  
**Audit date:** 2026-09-11  
**Verdict:** **FAIL — REMEDIATION REQUIRED**

This audit was performed independently from the integrated repository state. Production code was not modified and no Manager-owned task status was changed.

## Audited checkpoints

- Production SHA: `6acdcce25a69bd4449eccea94d480d09b685d1fd`
- Worker handoff SHA: `b7d01e5bb2df470f76306fab0452679142ba9144`
- Integration SHA / PR #8 merge: `b33e97320c8907193ba8f6a571b0d92684237f18`
- Milestone control-plane head used as audit base: `fb6d19641a490763c15ef3f1eb9f6e3f47934e7a`
- Foundation CI run: `34614840278`
- Foundation CI job: `103314058423`

The checkpoint chain is internally consistent. PR #8 is merged at the stated integration SHA and the later control-plane commit records that exact integration SHA as `AUDIT_READY`.

## CI verification

At integration SHA `b33e97320c8907193ba8f6a571b0d92684237f18`, Foundation CI independently reports:

| Step | Result |
|---|---|
| Install dependencies | PASS |
| Audit production dependencies | PASS |
| Test calculations | PASS |
| Test security policy contract | FAIL |
| Type check | SKIPPED |
| Lint | SKIPPED |
| Build | SKIPPED |

The FFH-012 integration diff from the accepted FFH-011 checkpoint `a89e9ae8637f2b5b09a6b4d4736f6b22d119295a` does not modify the security-policy contract test, its simple-plan/security source path, package/workflow configuration, or another security-policy surface. PR #8 changes are confined to FFH-012 HSA implementation/tests/evidence. Therefore the observed security-policy failure is not attributable to a change introduced by FFH-012. This supports the Manager's isolation of that failure from FFH-012, without treating the unrelated security failure itself as resolved.

## Blocking finding 1 — ambiguous `spouse_partner` is promoted to statutory spouse status

**Severity:** HIGH  
**Blocks FFH-012 closure:** YES

**Exact paths:**

- `lib/calculations/money-priority-hsa-legal-capacity.ts`
- `lib/calculations/ffh-012-hsa-legal-capacity.test.ts`
- `supabase/migrations/20260829223642_phase_5_ownership_and_planning_foundation.sql`
- `supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql`

**Reproducible scenario:**

Create an active household with exactly two nondependent people: one `relationship = "self"` and one `relationship = "spouse_partner"`. The second person is an unmarried domestic partner rather than a legal spouse. Give both people confirmed full-year 2026 HSA eligibility with family HDHP coverage, no Medicare, age under 55, separate HSA accounts, and zero current-year employee/employer YTD contributions. No explicit married-family allocation is supplied.

**Expected behavior:**

FFH-D005 requires ordinary married-family sharing only for spouses and requires unknown-safe behavior when a material legal-capacity fact is unavailable. The persisted relationship enum deliberately combines `spouse` and `partner` into one value, and the accepted FFH-010 normalized HSA contract does not provide a separate authoritative legal-marriage fact. The calculator therefore must not infer statutory spouse status from `spouse_partner` alone. It needs an authoritative legal-marriage discriminator or must return targeted more-information-needed behavior rather than applying married-family sharing.

**Actual behavior:**

`evaluateHsaLegalCapacity()` constructs `marriedPairIds` solely by taking the active, nondependent `self` plus `spouse_partner` pair. It then applies the statutory married-family shared ordinary ceiling. In the scenario above, the two unmarried partners are treated as one married HSA couple, producing one 2026 family ordinary base of `$8,750` and, absent an explicit allocation, a default `$4,375 / $4,375` split.

**Evidence:**

The Phase 5 relationship enum is `('self', 'spouse_partner', 'child', 'dependent_adult', 'other')`, so `spouse_partner` is not an unambiguous legal-spouse fact. The FFH-010 HSA migration adds normalized per-person/per-tax-year/month HSA facts and an optional married allocation but no legal-marriage discriminator. The FFH-012 evaluator nevertheless treats `self + spouse_partner` as the married pair. The dedicated FFH-012 test helper also leaves its base `tax_filing_status` as `single` and creates the purported married case only by adding a `spouse_partner`, demonstrating that tests encode this inference rather than testing the missing legal distinction. Filing status is not relied on here as proof of unmarried status; the defect is the promotion of an explicitly ambiguous relationship enum into a statutory spouse fact.

## Blocking finding 2 — one-cent Build tolerance permits an unreconciled allocation cent

**Severity:** MEDIUM  
**Blocks FFH-012 closure:** YES

**Exact paths:**

- `lib/calculations/money-priority-build.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-retirement-integration.test.ts`

**Reproducible scenario:**

Use a valid legally married 2026 household in which both owners are under 55, both are confirmed full-year family-HSA eligible, both have zero YTD HSA contributions, and no alternate ordinary allocation exists. The legal evaluator creates the `$8,750` shared ordinary ceiling and the default equal owner ceilings of `$4,375` each.

The aggregate routable monthly HSA room is rounded from `$8,750 / 12` to `$729.17`. Each owner-specific account can consume at most `$4,375` annually, which is rendered monthly as `round($4,375 / 12) = $364.58`. Two owner allocations therefore sum to `$729.16`.

**Expected behavior:**

The Build stage must preserve cents and reconcile its aggregate allocation to the dollars actually routed to accounts. It may deterministically route only `$729.16` and expose the remaining `$0.01`, or use another deterministic allocation/remainder method that remains consistent with the annual legal ceilings. Rounding must not create or silently discard a dollar fraction.

**Actual behavior:**

PR #8 changed the final Build invariant from rejecting any positive retirement-routing residual to rejecting only `retirementToRoute > 0.01`. In the scenario above, Build can record the aggregate HSA/retirement amount as `$729.17`, route `$364.58 + $364.58 = $729.16` to the two accounts, leave exactly `$0.01`, and accept the result because the residual is not greater than one cent. That cent is neither routed to an account nor reported as unresolved. This does not exceed the annual HSA ceiling, but it violates exact allocation/reconciliation and the workflow invariant that rounding must not create phantom or disappearing dollars.

**Evidence:**

The PR #8 patch to `money-priority-build.ts` explicitly introduces the `> 0.01` exception with a comment about annual legal limits not dividing evenly by 12. The account allocator consumes annual owner room and rounds each consumed annual amount back to monthly display amounts, while the aggregate Build amount was established from the rounded household annual room. The equal `$4,375 / $4,375` case deterministically produces the one-cent mismatch above. Existing tests allow the tolerance rather than asserting exact aggregate-to-account reconciliation for this case.

## Non-blocking finding — transitional HSA fixture adapter can overwrite normalized facts

**Severity:** LOW  
**Blocks FFH-012 closure:** NO

**Exact path:** `lib/calculations/hsa-test-fixtures.ts`

**Reproducible scenario:**

Pass a legacy-style test snapshot through `withNormalizedHsaFacts()`, or accidentally reuse the helper on a snapshot intended to exercise existing partial-year/unknown normalized HSA facts.

**Expected behavior:**

A test-only adapter used to migrate historical fixtures should be narrowly scoped and should not accidentally conceal a test's intended canonical HSA state.

**Actual behavior:**

The helper derives twelve confirmed canonical HSA month rows from the old account-level `hsa_eligible` / `hsa_coverage_type` hints and force-binds HSA YTD to the requested tax year. If reused indiscriminately, it can replace the very unknown/partial/stale-tax-year conditions that FFH-D005 requires production code to preserve.

**Evidence:**

PR #8 wraps several older integration/remediation fixtures with this helper. The affected assertions were retained rather than removed or loosened, and the dedicated FFH-012 tests independently exercise unknown month facts, stale YTD, Medicare, allocation uncertainty, and order invariance without depending on this adapter. Therefore this is a test-maintenance risk, not evidence that the production normalized contract is currently bypassed.

## Areas independently verified as correct at the audited checkpoint

The audit found no FFH-012 closure blocker in the following areas, assuming a legally married pair is correctly identified where marriage is relevant:

- Canonical normalized `snapshot.hsa.profiles` / `snapshot.hsa.months` drive HSA legal capacity; legacy account eligibility/coverage hints are not used by the production legal-capacity evaluator to grant twelve months of eligibility.
- Month-sensitive proration, coverage changes, unknown month handling, and explicit last-month-rule handling are represented in the evaluator/tests.
- Self-only versus family annual bases are applied month-by-month.
- Medicare effective month invalidates that month and later months; YTD above reduced legal capacity produces excess/warning behavior.
- Age-55 catch-up is owner-specific and nontransferable.
- Employee plus employer HSA YTD is aggregated against the same owner ceiling.
- HSA YTD must match the target tax year; stale/mismatched tax-year data does not silently consume current-year room.
- Multiple HSA accounts for the same owner do not multiply owner or household legal capacity.
- Shared ordinary room and owner catch-up room are propagated into account-level retirement-capacity structures.
- The retirement-capacity ledger consumes shared group and owner room together and is deterministic under account/input ordering.
- Existing Cash consumes the authoritative ledger before the final recurring Secure/Build plan is recomputed; Windfall uses a clone of the remaining ledger; Your Plan recreates the original ledger and reapplies one-time consumption before validating recurring retirement additions. No broader one-time/recurring/windfall HSA capacity double counting was found.
- PR #8's migrated legacy fixtures use the normalized test adapter rather than relying on production legacy account hints. Review of the changed test patches found retained assertions and no removed tests, skips, or broad expectation weakening merely to make the suite green. The one-cent Build tolerance is the exception and is separately blocking above.
- Dedicated FFH-012 tests cover month sensitivity, self/family coverage, Medicare/excess, tax-year isolation, married allocation mechanics, catch-up ownership, multiple accounts, uncertainty, and input-order invariance. The key missing adversarial case is an unmarried `spouse_partner`; the exact Build penny reconciliation case is also not asserted.

## Repository/workflow discrepancy

The audit instructions and technical-audit role refer to `.ai/audit/technical/HANDOFF.md`, but that path/directory did not exist at control-plane SHA `fb6d19641a490763c15ef3f1eb9f6e3f47934e7a`. This audit branch creates that Auditor-owned evidence path. This discrepancy does not change the mathematical verdict and no production or Manager-owned task state was modified.

## Required remediation before re-audit

1. Introduce or consume an authoritative legal-marriage fact for HSA spouse-sharing rules, or fail safely with targeted more-information-needed behavior when `spouse_partner` cannot be disambiguated. Add an explicit unmarried-partner regression test. Do not infer marriage from the combined relationship enum.
2. Remove the Build one-cent silent residual exception as an accounting escape hatch. Implement deterministic cent reconciliation so the aggregate amount reported as allocated exactly equals routed account allocations (or the residual is explicitly exposed/unresolved), while preserving annual owner/shared HSA ceilings. Add an exact reconciliation regression test for the `$8,750` / `$4,375 + $4,375` case.
3. Preferably harden `withNormalizedHsaFacts()` so accidental use cannot overwrite an intentionally canonical HSA test scenario; this item is non-blocking relative to the two defects above.

## Final audit disposition

**FAIL — REMEDIATION REQUIRED**

FFH-012 must not be closed at the audited checkpoint because the integrated implementation can apply married-family HSA sharing to an unmarried partner and because Build can silently accept a one-cent aggregate-to-account reconciliation mismatch. Manager retains final disposition authority.