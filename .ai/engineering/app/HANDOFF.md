# Application, Data & Integration Engineer Handoff

HANDOFF

Task ID: FFH-010

Role: Application, Data & Integration Engineer

Status: COMPLETE — FFH-D005 APPLICATION/DATA CONTRACT IMPLEMENTED — EXACT PRODUCTION CI GREEN — READY FOR MANAGER ACCEPTANCE

Verified starting / refreshed state: FFH-010 was resumed after Manager documented production checkpoint `ca22dac0dd6a10ec4d3c81daa057d430667f4406` as red under Foundation CI #296. Before remediation, the current `phase-5-money-priority-engine` head was refreshed to `713f100dcd15ba39d9698bddc73b681630ea84d1`; the commits after `ca22dac...` were Manager/shared documentation only and did not collide with FFH-010 production files. Manager canonical state still identified FFH-010 as the only active specialist task, a hard predecessor to FFH-012, and required green exact-checkpoint CI plus a current App/Data handoff before acceptance.

Final FFH-010 production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4` (`test: align Secure fixtures with FFH-D005 HSA contract`).

Final production checkpoint parent: `713f100dcd15ba39d9698bddc73b681630ea84d1` (Manager documentation refresh). The final remediation commit changed only `lib/calculations/money-priority-secure.test.ts` to align stale fixtures with the already-required FFH-D005 normalized HSA contract; it did not weaken or change production HSA semantics.

Assigned objective: Implement only the Application/Data side of approved FFH-D005 by establishing safe HSA persistence, capture, loader, and normalized snapshot contracts. Do not implement Core Engine HSA legal-capacity calculations, FFH-011/R1 SIMPLE behavior, FFH-013/R6, or Phase 5C.

## Work completed

- Added additive HSA persistence for person/tax-year profiles, person/tax-year/month statuses, optional household/tax-year married ordinary-allocation overrides, and explicit HSA-account YTD tax-year binding.
- Preserved null/unknown as non-affirmative and did not backfill legacy account HSA hints into canonical person-year/month facts.
- Added HSA financial-profile capture/actions for financial people, person-year legal-context facts, 12 month statuses, HSA account owner/YTD binding, and optional explicit alternate married ordinary allocation.
- Kept legacy `retirement_accounts.hsa_eligible` and `hsa_coverage_type` as compatibility/current hints only; new actions do not write them as annual legal authority.
- Added Supabase snapshot loading for the new HSA tables and `hsa_ytd_tax_year`.
- Added a required normalized `snapshot.hsa` contract containing `profiles`, `months`, and `marriedAllocations` plus required normalized `hsaYtdTaxYear` on retirement-account snapshots.
- Enforced deterministic normalization, tax-year/month validation, known-person references, enum validation, duplicate-key rejection, nonnegative alternate allocations, and stable sorting.
- Preserved spouse HSA facts independently of spouse HSA destination/account existence.
- Preserved the contract through hypothetical reruns so Home/Vehicle-style recalculation paths do not silently drop HSA legal-input facts.
- Ensured HSA input changes participate in Recommendation Refresh financial-basis invalidation through the full normalized snapshot fingerprint rather than by duplicating HSA-specific refresh policy.
- Added focused calculation and security/static-contract tests for the new contract.
- Diagnosed the remaining Foundation CI #296 TypeScript failures from the exact GitHub diagnostics: one Secure normalized snapshot fixture lacked required `hsa`, and two Secure retirement-account fixtures lacked required `hsaYtdTaxYear`.
- Fixed those test fixtures explicitly with `hsa: { profiles: [], months: [], marriedAllocations: [] }` and `hsaYtdTaxYear: null`; the production contract remains required rather than optional.

## Persistence contract

Migration file:
`supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql`

Schema additions represented by that migration:

- `retirement_accounts.hsa_ytd_tax_year smallint null`
  - tax-year range constrained when present;
  - only valid for HSA account rows;
  - explicitly binds employee/employer HSA YTD aggregates to a tax year;
  - null remains unknown/unverified rather than implicitly current-year.

- `person_hsa_tax_year_profiles`
  - one household/person/tax-year profile;
  - Medicare effective date;
  - explicit last-month-rule status;
  - testing-period status;
  - confirmation/version metadata;
  - household-scoped person integrity.

- `person_hsa_month_statuses`
  - one household/person/tax-year/month status;
  - eligibility `eligible | ineligible | unknown`;
  - coverage `self_only | family | none | unknown`;
  - evidence `confirmed | planning_assumption | unknown`;
  - no automatic cross-year creation/carry-forward.

- `household_hsa_married_allocations`
  - optional explicit alternate ordinary allocation only;
  - household/tax-year scoped;
  - two distinct household people and nonnegative amounts;
  - no persisted equal default and no statutory formula duplicated into schema.

RLS/grants in the migration follow the existing household role model:
- read: `private.can_read_household(household_id)`;
- insert/update/delete: `private.can_write_household_financials(household_id)`;
- explicit authenticated grants with RLS enabled.

## Normalized runtime contract

`MoneyPrioritySnapshot` now requires:

```ts
hsa: {
  profiles: HsaTaxYearProfile[];
  months: HsaMonthStatus[];
  marriedAllocations: HsaMarriedAllocation[];
}
```

Normalized retirement accounts require:

```ts
hsaYtdTaxYear: number | null
```

Key semantics preserved:
- person + tax year is canonical for HSA legal-input context;
- month status is explicit and unknown-safe;
- future planning assumptions are distinguishable from confirmed facts;
- Medicare timing and last-month-rule status are explicit rather than inferred;
- multiple HSA accounts do not multiply person facts;
- spouse facts may exist with no spouse HSA account;
- no automatic cross-year carry-forward;
- alternate married allocation exists only when explicitly recorded;
- equal spouse ordinary allocation remains derived policy for the Core Engine, not a persisted default;
- legacy account HSA fields remain compatibility hints and are not promoted to annual legal certification;
- HSA YTD without explicit tax-year binding remains identifiable as incomplete/unsafe for remediated legal-capacity use.

## FFH-010 files changed

Role-owned production/test changes from the FFH-010 implementation sequence:

1. `supabase/migrations/20260909005000_ffh_010_hsa_input_contract.sql` — added.
2. `app/financial-profile/hsa/actions.ts` — added.
3. `app/financial-profile/hsa/page.tsx` — added.
4. `app/planning/retirement/page.tsx` — HSA legal-fact profile navigation.
5. `lib/supabase/money-priority-snapshot.ts` — new HSA persistence loader inputs.
6. `lib/calculations/money-priority-hsa-input-contract.ts` — added normalized HSA input contract/validation.
7. `lib/calculations/money-priority-snapshot.ts` — required `snapshot.hsa`, `hsaYtdTaxYear`, normalization/warnings.
8. `lib/calculations/money-priority-hypothetical.ts` — HSA contract serialization/round-trip preservation.
9. `lib/calculations/money-priority-hsa-input-contract.test.ts` — added.
10. `lib/calculations/money-priority-hsa-contract-hypothetical.test.ts` — added.
11. `tests/security/hsa-input-contract.test.ts` — added.
12. `lib/calculations/money-priority-secure.test.ts` — stale normalized fixture compatibility repair; no production behavior change.

Manager/shared `.ai` files also changed concurrently during the overall compare window, but those are not FFH-010 App/Data implementation changes and are not claimed as role-owned production work.

## Tests / validation actually observed

Exact final production checkpoint validated:
`8f39e7d6e638711a80300786869a407113d3d0c4`

GitHub Foundation CI:
- workflow: `Foundation CI`
- run number: `#300`
- run ID: `34306364189`
- job ID: `102323779857`
- conclusion: `SUCCESS`
- exact commit: `8f39e7d6e638711a80300786869a407113d3d0c4`

Successful CI steps on that exact SHA:
- checkout/setup;
- install dependencies;
- production dependency audit;
- calculation tests;
- security policy contract tests;
- TypeScript typecheck;
- lint;
- production build.

Focused FFH-010 test coverage included in the green calculation/security runs:

`lib/calculations/money-priority-hsa-input-contract.test.ts`
- canonical person/year/month normalization;
- explicit unknown and planning-assumption state;
- legacy hints do not create canonical annual authority;
- HSA YTD tax-year preservation;
- multiple HSA accounts do not duplicate person facts;
- spouse facts without spouse HSA destination;
- tax-year isolation/no carry-forward;
- explicit alternate allocation only;
- input-order invariance;
- malformed/orphan month and enum rejection;
- Recommendation Refresh basis changes when HSA facts change.

`lib/calculations/money-priority-hsa-contract-hypothetical.test.ts`
- hypothetical reruns preserve `snapshot.hsa` and `hsaYtdTaxYear` without adding App-layer legal-capacity calculation.

`tests/security/hsa-input-contract.test.ts`
- additive schema shape;
- tax-year constraints;
- unknown defaults;
- no legacy backfill;
- role-aware RLS/grant contract;
- database/runtime enum alignment;
- loader contract;
- explicit person/YTD tax-year requirements in actions;
- actions do not write legacy legal-hint fields;
- equal married allocation is not persisted as a default.

Prior red evidence is retained for provenance:
- Foundation CI #296 on `ca22dac0dd6a10ec4d3c81daa057d430667f4406` failed TypeScript because `lib/calculations/money-priority-secure.test.ts` had stale fixtures missing required FFH-D005 fields.
- The final repair updated those fixtures instead of weakening the normalized contract.

## Migration deployment / runtime parity evidence boundary

IMPORTANT: FFH-010 created and statically validated the migration file in the repository. This task did **not** execute that migration against a linked/live Supabase project.

Therefore the following are NOT claimed:
- that `20260909005000_ffh_010_hsa_input_contract.sql` has been applied to the linked/live Supabase database;
- that the three new HSA tables or `retirement_accounts.hsa_ytd_tax_year` currently exist in the live database;
- that live PostgREST can currently select/write those fields;
- that the RLS policies have been exercised against real owner/member/viewer/nonmember sessions;
- that browser form capture has been exercised end-to-end against a migrated live Supabase environment.

Repository migration presence + green static/security/build validation is evidence of source correctness, not evidence of deployed database/runtime parity. Live Supabase application/runtime parity remains explicitly unverified pending migration/deployment verification under the repository's deployment process.

## Known non-blocking engineering notes / unverified items

- HSA profile and 12 month-status writes are multiple PostgREST operations, not one database transaction/RPC. The contract remains unknown-safe and retryable if a partial write occurs, but transaction hardening may be considered later if Manager prioritizes it.
- Alternate-allocation actions verify that both people belong to the household and are distinct; they do not independently encode the full legal marital-relationship rule. The Core Engine must still validate approved FFH-D005 legal semantics rather than treating storage shape as policy.
- Live Supabase migration application and real role-matrix/runtime parity are unverified as described above.
- No independent Technical/Mathematical or Financial Policy/Scenario audit verdict is claimed by this handoff.

## Explicit exclusions preserved

FFH-010 did not implement or change:
- FFH-012 Core HSA legal-capacity math, month-proration math, Medicare reduction calculations, last-month-rule capacity calculations, married equal/alternate legal allocation calculation, age-55 catch-up calculation, or R4 remaining-room calculation;
- FFH-011 R1 SIMPLE persisted-field semantics;
- FFH-013 / R6 spousal-IRA shared-compensation behavior;
- Phase 5C production implementation.

`lib/calculations/money-priority-retirement-accounts.ts` was not modified by FFH-010 for HSA legal-capacity behavior.

## Coordination / next action

FFH-012 Core Engine should consume the accepted normalized `snapshot.hsa` person/tax-year/month contract and tax-year-bound owner HSA YTD values. It must not use legacy account `hsa_eligible` / `hsa_coverage_type` as annual legal authority and must not infer spouse facts, owner identity, Medicare timing, last-month-rule status, or married allocation from account existence/order/IDs.

Recommended next role: Manager / Architect verifies this handoff plus exact green Foundation CI #300 on `8f39e7d6e638711a80300786869a407113d3d0c4` and decides FFH-010 acceptance. Under current sequencing, only after Manager acceptance should FFH-011 App/Data and FFH-012 Core Engine activate in parallel.

Checkpoint: FFH-010 role work COMPLETE at exact green production SHA `8f39e7d6e638711a80300786869a407113d3d0c4`; this handoff write is documentation-only and will advance the branch to a later handoff SHA without changing the validated production checkpoint.
