# FFH-012 — Financial Policy & Scenario Audit

Date: 2026-09-11
Role: Financial Policy & Scenario Auditor
Verdict: FAIL — REMEDIATION REQUIRED

## Checkpoint reviewed

- Integrated implementation: `b33e97320c8907193ba8f6a571b0d92684237f18`
- Manager control-plane checkpoint supplied for audit: `fb6d19641a490763c15ef3f1eb9f6e3f47934e7a`
- Milestone branch observed later during audit: `559a2a3e86d0990b33162d541ab712d25070dfa5`; comparison from the supplied control-plane checkpoint changed only `.ai/tasks/FFH-020.md`, so the FFH-012 implementation under review remained the designated `b33e973...` integration.
- Foundation CI run `34614840278`, job `103314058423`, ran on exact head SHA `b33e973...`. `Test calculations` passed; the later `Test security policy contract` step failed. The calculation-step pass is evidence, not a substitute for this policy audit.

## Authorities applied

- `.ai/shared/DECISIONS.md` — FFH-D005.
- `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md`.
- `.ai/shared/WORKFLOW.md` financial invariants, especially no phantom rounding dollars and order invariance.
- `.ai/tasks/FFH-012.md` acceptance criteria.
- Accepted FFH-010 normalized HSA input contract and migration.

## Finding 1 — HIGH — ambiguous spouse/partner identity is treated as proven married-spouse authority

Household scenario: two active nondependent people are represented as `self` and `spouse_partner`; both have normalized 2026 HSA facts. The schema value does not distinguish a legal spouse from a non-spouse partner. The focused FFH-012 `married()` fixture is even built through a helper whose default tax filing status is `single`, while the evaluator still applies married-family sharing solely from the relationship value.

Approved policy/decision involved: FFH-D005 rules 9–11 and FFH-007 section 7 authorize the shared ordinary-base/equal-default rule for married spouses. Missing material facts that can change family-sharing treatment must remain targeted `more_information_needed`; Engineering may not invent policy or identity semantics.

Expected behavior: the implementation must have an authoritative fact/contract proving that the two people are spouses before applying the married-spouse shared-family rule. If the accepted data contract cannot distinguish spouse from partner, the affected married-family legal-capacity decision is unresolved and must be returned to Manager/App-Data authority rather than assuming `spouse_partner` means spouse.

Observed implementation behavior: `evaluateHsaLegalCapacity` creates `marriedPairIds` whenever exactly two active nondependent people have relationship `self` or `spouse_partner`, with no legal-marriage discriminator and no tax-filing check. It then applies one shared ordinary base and equal/explicit spouse allocation. The database schema defines the same value as `spouse_partner`, explicitly conflating the identities. The FFH-012 focused `married()` fixture inherits `tax_filing_status: "single"` from `raw()` yet still asserts the married shared-base behavior.

Evidence:
- `supabase/migrations/20260829223642_phase_5_ownership_and_planning_foundation.sql`: `relationship in ('self','spouse_partner',...)`.
- `lib/calculations/money-priority-hsa-legal-capacity.ts` at `b33e973...`: `marriedPeople` filters on `self` / `spouse_partner` and derives the pair from count only.
- `lib/calculations/ffh-012-hsa-legal-capacity.test.ts` at `b33e973...`: `raw()` defaults to `tax_filing_status: "single"`; `married()` changes people to `self` + `spouse_partner` but does not replace that preference before married-family assertions.
- FFH-007 A9–A14 consistently state the legal structure in terms of married spouses.

Blocks FFH-012 closure: YES. This is a policy/data-authority gap with potentially material household impact. Manager must route the identity-contract decision; the auditor does not choose a new rule.

## Finding 2 — MEDIUM — equal allocation can create $0.01 of spendable shared-family legal capacity

Household scenario: married spouses, both under 55, both eligible with family coverage for a partial year that produces an odd-cent period-aware shared ordinary base, no alternate allocation, no YTD. Example: seven shared-family eligible months in 2026.

Approved policy/decision involved: FFH-D005 married-family ordinary base is one shared base, equal by default absent another agreement. FFH workflow invariant: rounding must not create phantom dollars. FFH-007 requires owner ceilings plus total couple maximum and forbids doubling the family base.

Expected behavior: the two default owner ordinary allocations must sum to no more than the period-aware shared ordinary base. Any cent remainder must be assigned or withheld deterministically without increasing the legal base.

Observed implementation behavior: the evaluator first rounds the shared base, then divides it by two and independently rounds both spouses upward when the half-cent is positive. For seven months: `round(7 * 8750 / 12) = 5104.17`; each spouse receives `round(5104.17 / 2) = 2552.09`; the two owner allocations total `5104.18`. `marriedSharedRemaining` is then calculated from the sum of the owner ceilings. `createRetirementCapacityLedger` uses that aggregate as the married-family group room, and owner groups use each rounded owner ceiling, so the extra cent can be consumed. This is not the Build-stage display-only cent tolerance; it is upstream legal-capacity creation.

Evidence:
- `lib/calculations/money-priority-hsa-legal-capacity.ts` at `b33e973...`: `sharedOrdinaryBase` is rounded; no-allocation path sets both spouse allocations to `sharedOrdinaryBase / 2`, then rounds each spouse; `marriedSharedRemaining` uses `a.annualCeiling + b.annualCeiling`.
- `lib/calculations/money-priority-retirement-capacity.ts` at `b33e973...`: married-family group original room is the opportunity `sharedCapacityRemainingRoom`; `remainingRetirementCapacity` and `consumeRetirementCapacity` permit consumption up to entry + shared-group + owner-group room.
- Existing focused tests cover full-year `$8,750 -> $4,375/$4,375`, where no odd-cent split occurs, but do not cover partial-year married shared-base cent allocation.

Blocks FFH-012 closure: YES. Dollar magnitude is one cent, but the task is a legal-capacity engine and the approved invariant explicitly prohibits phantom rounding capacity.

## Finding 3 — LOW — married-ledger component `remaining` metadata is stale after consumption

Household scenario: verified married-family HSA capacity is consumed by one-time/Secure/Build/Windfall activity and the resulting capacity ledger is inspected.

Approved policy/decision involved: FFH-D005 requires all consumers to use one normalized contract and shared capacity without duplication; FFH-007 expected outputs distinguish shared ordinary capacity and owner-specific catch-up from routing.

Expected behavior: fields named `sharedCapacityRemainingRoom`, `sharedOrdinaryRemainingRoom`, and catch-up remaining room on a mutable ledger should either update with ledger consumption or be explicitly represented as immutable/original metadata so they do not communicate stale residual room.

Observed implementation behavior: in the special married-family branch of `consumeRetirementCapacity`, the function reduces `entry.remainingAnnualRoom`, `entry.accountSpecificRemainingRoom`, the married shared group, and the owner group, but does not reduce the entry's copied `sharedCapacityRemainingRoom`, `sharedOrdinaryRemainingRoom`, or `catchUpRemainingRoom`. Current routing remains safe because `remainingRetirementCapacity` clamps against the mutable total/owner groups, but the component fields can remain numerically stale after consumption.

Evidence:
- `lib/calculations/money-priority-retirement-capacity.ts` at `b33e973...`, married-family `consumeRetirementCapacity` branch.

Blocks FFH-012 closure: NO independently. Current routing is constrained by the mutable group and owner ledgers. Manager should nevertheless prevent stale `remaining` metadata from becoming user-facing or a future source of legal room.

## Scrutiny items cleared

Test-fixture migration: the PR #8 `withNormalizedHsaFacts` helper does promote legacy HSA fixture hints into full-year `confirmed` normalized facts, but it is test-only and is used to preserve the intended fully-eligible semantics of older downstream routing regressions. Production normalization still leaves legacy legal facts unknown, and dedicated FFH-010/FFH-012 tests verify that legacy `hsa_eligible` / `hsa_coverage_type` do not create person-year authority. Therefore I do not treat the fixture migration itself as a policy violation. It must not be cited as evidence that production legacy rows may be backfilled.

Owner/couple separation: current ledger routing uses both a married-family group and owner-specific HSA groups. Multiple HSA destinations for one owner share the owner group; across spouses, each spouse's account is capped by that owner's group. This prevents current routing from transferring one spouse's age-55 catch-up to the other and prevents multiple accounts from multiplying capacity.

Employee/employer YTD: HSA YTD aggregates employee + employer amounts across all HSA accounts for the owner and rejects mismatched tax-year authority.

Unknown facts/Medicare/excess: unknown material months stay `more_information_needed`; Medicare effective timing zeroes later months and can generate possible-excess warnings; tax-year-mismatched HSA YTD is not treated as current-year legal authority.

Household medical-spending treatment: Hybrid Retirement Floor separately reads expected annual HSA medical spending. If long-term HSA intent is unknown, HSA contributions are not optimistically counted as long-term retirement saving; when known, expected current medical spending is subtracted from the contribution amount counted toward long-term retirement saving.

Cross-consumer behavior: married-family regression coverage verifies corrected room across existing cash/one-time deployment, Secure, Build, Windfall, and Your Plan; unresolved HSA capacity does not fabricate allocations and does not block unrelated supported retirement routes.

Order invariance: normalized HSA profiles/months/allocations are sorted deterministically, legal opportunities are sorted by stable account ID after legal capacity is established, and focused tests reverse people/accounts/profiles/months and preserve equivalent legal results.

Build one-cent tolerance: `money-priority-build.ts` permits at most a `$0.01` monthly post-routing display residue after annual legal ledger consumption. That specific tolerance does not itself expand annual legal room. Finding 2 is separate and occurs earlier, where equal allocation actually increases the legal shared group by one cent.

## Required Manager disposition

Return FFH-012 to remediation. Do not close the task on the present integrated checkpoint. Remediation should be narrow: (1) resolve/approve an authoritative spouse-vs-partner identity contract before married-family sharing is applied, and (2) make default equal allocation cent-safe so owner allocations cannot sum above the shared legal base. Finding 3 may be handled in the same narrow remediation or tracked separately, but should not be allowed to become user-facing legal-capacity authority.

No production code was modified by this audit. No task state was changed to ACCEPTED, AUDIT_READY, or CLOSED.