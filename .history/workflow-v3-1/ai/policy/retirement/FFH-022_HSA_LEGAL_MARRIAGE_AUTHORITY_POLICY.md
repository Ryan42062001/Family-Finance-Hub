# FFH-022 — HSA Legal-Marriage Authority Contract

Date: 2026-09-11
Role: Retirement & Tax-Advantaged Policy Analyst
Task: FFH-022
Status: POLICY COMPLETE — READY FOR MANAGER REVIEW

## Question

What authoritative household fact must Family Finance Hub require before applying the married-spouse HSA shared-family ordinary-limit/allocation rules approved in FFH-D005 / FFH-007, given that the persisted household relationship value `spouse_partner` combines legal spouses and non-spouse partners?

## Decision

Family Finance Hub must have an explicit, affirmative, pair-specific legal-spouse authority for the target HSA tax year before it may apply married-spouse HSA shared-family ordinary-limit/allocation rules.

The minimum semantic state is tri-state:

- `confirmed_legal_spouses`
- `confirmed_not_legal_spouses`
- `unknown`

Exact schema/type names are Engineering/App-Data choices. The required meaning is not optional.

This authority must identify the two household people and the HSA tax year to which the confirmation applies. A lossless effective-dated representation is acceptable, but Engineering may not derive the required authority from ambiguous or planning-only metadata.

## Governing authority and classification

### Accepted statutory / verified external rule already incorporated by FFH

FFH-D005 and FFH-007 already establish that the special ordinary HSA family limit/allocation rule applies to eligible **spouses**: one shared ordinary family base, equal by default absent another agreement, with each qualifying spouse's age-55 catch-up remaining owner-specific and nontransferable.

FFH-007 explicitly states that no additional external facts were required for that accepted HSA policy recommendation.

No new statutory interpretation is needed to answer FFH-022. The current defect is a product-data authority defect: the repository does not persist a fact proving whether `spouse_partner` is a legal spouse or a non-spouse partner.

### Accepted FFH project policy

FFH-D005 requires HSA legal inputs to be explicit, tax-year-bound, unknown-safe, and not optimistically inferred. Legacy/ambiguous facts may not be silently upgraded into stronger legal authority. Missing material spouse facts that can change family-sharing treatment produce targeted `more_information_needed`.

### Repository fact

`household_people.relationship` permits the combined value `spouse_partner`; therefore it is not an authoritative legal-marriage discriminator.

The accepted FFH-010 HSA contract persists person/tax-year profiles, month eligibility/coverage facts, and an optional tax-year married allocation, but it does not persist a separate legal-marriage discriminator.

`household_financial_preferences.tax_filing_status` is explicitly documented as a **planning tax filing status; not a filed tax return**. It therefore is not an authoritative legal-marriage fact for HSA spouse-sharing.

## Exact authoritative input required

Before married-spouse sharing is applied, the normalized HSA legal-capacity contract must be able to answer, for the relevant pair and target HSA tax year:

> Are these two household people confirmed legal spouses for the HSA spouse-sharing rule for this tax year?

Allowed semantic answers are affirmative, negative, or unknown. Missing is unknown.

Minimum identity scope:

- household identity;
- target HSA tax year;
- person-one identity;
- person-two identity;
- legal-spouse authority state;
- confirmation/provenance metadata sufficient to distinguish confirmed input from default/legacy inference.

A direct tax-year authority record or a lossless equivalent is acceptable. No automatic year-to-year carryforward may silently convert an old confirmation into current-year legal authority.

If a future implementation wants to derive this HSA-year authority from marriage effective dates or another legal-status history, that derivation requires its own approved legal/data semantics. FFH-022 does not authorize Engineering to invent such derivation.

## `spouse_partner` behavior

`spouse_partner` alone may **never** authorize married-spouse HSA sharing.

It may be used only as:

- a household/display relationship label;
- a candidate-pair signal telling the UI which two people may need legal-spouse confirmation.

It may not create, deny, or allocate statutory HSA room.

## Confirmed legal-spouse behavior

When the pair is `confirmed_legal_spouses` for the target tax year:

1. The existing FFH-D005 / FFH-007 married-family rules become eligible to apply, but only when the other approved HSA eligibility/coverage conditions actually trigger those rules.
2. One shared ordinary family base is used where the married-family rule applies.
3. Equal ordinary allocation remains the default absent an explicit valid alternate spouse allocation.
4. Any alternate married allocation must match the same household, pair, and tax year and remain constrained to the shared legal base.
5. Each qualifying spouse's age-55 catch-up remains owner-specific and nontransferable.
6. Employee/employer YTD, multiple-account aggregation, month sensitivity, Medicare, last-month treatment, and all existing unknown-safe rules remain unchanged.
7. Legal-spouse authority is a prerequisite, not a substitute for HSA eligibility/coverage facts.

## Confirmed non-spouse-partner behavior

When the pair is `confirmed_not_legal_spouses` for the target tax year:

1. FFH must not apply the married-spouse shared ordinary family base.
2. FFH must not apply the equal spouse-allocation default.
3. FFH must not use a persisted `household_hsa_married_allocations` row as authority for that pair.
4. Each person's HSA capacity is evaluated independently under the already-approved person/month HSA eligibility and coverage rules.
5. One person's HSA capacity must not consume or constrain the other person's capacity merely because the household relationship label is `spouse_partner`.
6. Any stale/inconsistent married-allocation data is non-authoritative and should surface as a validation/data-consistency issue rather than create room.

This is a mathematical/product consequence of limiting the special shared-family rule to confirmed spouses; it does not introduce a new external HSA rule.

## Unknown legal-marriage behavior

When legal-spouse authority is `unknown` or missing:

1. FFH must not assume married-spouse sharing.
2. FFH must not assume confirmed non-spouse independence where the result would differ depending on spouse status.
3. Any HSA legal-capacity result whose amount or allocation can materially change based on spouse status returns targeted `more_information_needed`.
4. An explicit married-allocation row cannot cure the missing spouse authority; allocation preference is downstream of legal-spouse authority.
5. Unrelated retirement routes and HSA capacity that are demonstrably independent of spouse status may continue.
6. In particular, known self-only HSA room may remain independently actionable when the spouse/non-spouse distinction cannot change that supported result; unknown status should block only the contested spouse-dependent family-sharing decision.

Unknown is not zero and is not affirmative legal capacity.

## Tax filing status

`tax_filing_status` is **corroborating only** for FFH-022. It is not authoritative and must not be used to authorize or deny married-spouse HSA sharing.

Reasons:

- repository schema describes it as a planning tax filing status, not a filed return or legal-marriage certification;
- FFH-012 tests demonstrate it can currently be inconsistent with relationship assumptions (`single` while married sharing is asserted);
- the accepted HSA authority chain never designated filing status as the legal-spouse discriminator.

Required handling:

- `married_filing_jointly` or `married_filing_separately` may be used as a consistency signal, but cannot substitute for affirmative legal-spouse authority;
- `single` or `head_of_household` may not be used by themselves to prove that the pair are not legal spouses;
- if filing status conflicts with the authoritative legal-spouse state, the legal-spouse authority controls HSA sharing and the inconsistency should be surfaced for reconfirmation/data cleanup rather than silently overridden.

## Minimum persistence contract

App/Data must persist, or prove a lossless equivalent of, a pair-level tax-year legal-spouse authority record.

Minimum semantics:

- pair-specific, not merely household-wide;
- tax-year-bound;
- tri-state affirmative/negative/unknown;
- new/legacy value defaults to unknown;
- no optimistic backfill from `spouse_partner`;
- no backfill from `tax_filing_status`;
- confirmation metadata retained;
- pair identity deterministic and order-insensitive;
- married-allocation records cannot be authoritative unless the matching pair/year has affirmative legal-spouse authority.

The exact table/column names, uniqueness constraints, UI form shape, and migration mechanics remain App/Data/Manager design choices.

## Minimum normalized runtime contract

The Money Priority/HSA normalized snapshot must expose the same legal-spouse authority semantics for the target tax year and relevant pair.

Core legal-capacity behavior must be:

- `confirmed_legal_spouses` -> permit evaluation of approved married-family sharing rules;
- `confirmed_not_legal_spouses` -> do not create a married shared-capacity group; evaluate owners independently;
- `unknown` / missing -> targeted `more_information_needed` wherever spouse status can change legal capacity;
- `spouse_partner` relationship label -> never converted into the affirmative state;
- filing status -> never converted into the affirmative or negative state;
- explicit married allocation -> preference only after affirmative spouse authority exists.

The legal-spouse state must flow consistently through Existing Cash, Secure, Build, Windfall, Your Plan, hypothetical reruns, and Recommendation Refresh so one path cannot recreate spouse-sharing authority another path withheld.

## Minimum UI contract

The UI must distinguish household relationship labeling from legal-spouse HSA authority.

When spouse-dependent HSA capacity is needed and authority is absent, the user must be offered an explicit legal relationship confirmation for the relevant pair and tax year with at least these meanings:

- legally married spouses;
- not legally married to each other / partner;
- unknown / confirm later.

The UI must not preselect or silently infer the answer from `spouse_partner` or tax filing status.

The confirmation must be visibly associated with the target HSA tax year (or an explicitly lossless effective-dated contract). A prior-year answer may not silently become current-year authority.

Exact wording/design is a product choice; the semantic distinction is mandatory.

## Required regression scenarios

Engineering remediation and later audit must cover at least:

1. **Legal spouses, full-year family coverage:** `self + spouse_partner` plus affirmative legal-spouse authority; both eligible, under 55, zero YTD -> one 2026 shared $8,750 ordinary base and equal $4,375/$4,375 default before other existing rules.
2. **Unmarried partners, full-year family coverage:** same relationship labels and HSA facts but negative legal-spouse authority -> no married shared group/equal spouse split; each owner is evaluated independently.
3. **Unknown legal-marriage status with family coverage:** same facts but unknown/missing authority -> spouse-dependent family capacity is `more_information_needed`; no affirmative married or non-spouse result is fabricated.
4. **MFJ planning status is not authority:** `tax_filing_status = married_filing_jointly`, legal-spouse authority unknown -> still `more_information_needed` when spouse status is material.
5. **Single planning status does not override spouse authority:** affirmative legal-spouse authority plus `tax_filing_status = single` -> filing-status mismatch cannot silently disable spouse sharing; consistency warning/reconfirmation may be surfaced.
6. **MFJ planning status does not override non-spouse authority:** negative legal-spouse authority plus `married_filing_jointly` -> no spouse sharing; filing-status inconsistency is non-authoritative.
7. **Allocation row cannot create marriage:** explicit married-allocation row with unknown or negative legal-spouse authority -> allocation is ignored/rejected as legal-capacity authority and cannot create a shared group.
8. **Unknown-safe locality:** legal-spouse authority unknown but supported HSA capacity is self-only and materially independent of spouse status -> independently supported self-only room remains actionable; unrelated retirement routes continue.
9. **Material mixed case:** one person's family-coverage capacity depends on spouse status while an unrelated account/owner route is independently supported -> only the spouse-dependent HSA decision is `more_information_needed`.
10. **Tax-year isolation:** affirmative spouse authority for 2026 does not automatically authorize 2027 spouse sharing without 2027 authority or an approved lossless equivalent.
11. **Pair/order invariance:** reversing person/pair input order yields identical spouse-authority and legal-capacity results.
12. **Authority change recomputation:** changing the target-year authority from affirmative spouse to confirmed non-spouse (or to unknown) invalidates prior shared-family recommendations on Recommendation Refresh; stale shared room is not retained.

Existing FFH-012 regressions for month sensitivity, Medicare, last-month treatment, YTD/tax-year isolation, catch-up ownership, multiple HSAs, cent-safe shared allocation, exact reconciliation, and cross-consumer ledgers remain required and are not replaced by these scenarios.

## Invariants

1. Ambiguous household labels cannot create statutory HSA room.
2. Married-spouse sharing requires affirmative spouse authority for the target HSA tax year.
3. Non-spouse partners never share room solely because they are in the same household or carry `spouse_partner`.
4. Unknown spouse authority blocks only the legal-capacity decisions that depend on it.
5. Filing status cannot create or erase legal-spouse HSA authority.
6. Allocation preference cannot precede legal authority.
7. No automatic tax-year carryforward of unconfirmed legal facts.
8. Runtime, persisted state, UI capture, reruns, and recommendation refresh must represent the same spouse-authority meaning.
9. No dollar may be double-counted or created by switching between spouse/non-spouse/unknown paths.

## Authority gap disposition

No new Regulatory/R&D question is required to complete FFH-022.

The accepted authority already says the shared ordinary rule is a spouse rule and that material unknown HSA legal facts remain unknown-safe. The newly discovered issue is that the product conflated spouse and partner identity in one field and therefore lacks a sufficient authority input.

A future feature that tries to derive target-year HSA spouse authority from marriage effective dates, divorce/separation dates, state-law statuses, or another legal-status timeline would require separate approved legal/data semantics. That future derivation is outside FFH-022 and is not necessary to remediate the current `spouse_partner` defect.
