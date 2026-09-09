# Application, Data & Integration Engineer Handoff

HANDOFF

Task ID: FFH-008

Role: Application, Data & Integration Engineer

Status: COMPLETE — ANALYSIS ONLY / RECONCILED WITH FFH-007 / READY FOR MANAGER SYNTHESIS

Verified starting state: FFH-008 analysis began after refreshing `phase-5-money-priority-engine` at `71705039f0abf1945202631109975edeb5632920`. During the analysis the branch advanced through Manager/shared documentation. Before the first FFH-008 handoff write, `247af1866490521c69b08ca2fbac3926444730e3` was observed. A concurrent wave then landed FFH-006 production remediation and `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md`; the first FFH-008 handoff commit was `fa5f1223d6fab7208d31b2f09bfaf76682610f28`. A compare from `247af186...` to `fa5f1223...` showed only the FFH-006 retirement-account source/test changes, the FFH-007 policy artifact, and this role-owned handoff. No App/Data production/schema/migration/UI file was modified by FFH-008.

Assigned objective: Map the current HSA persistence/runtime architecture and propose minimum safe data-contract options needed to implement Manager-approved FFH-007 policy and resolve FFH-005 R3/R4. Do not implement schema, application, UI, migration, or calculation changes.

## Work completed

- Refreshed canonical project/Manager state and verified FFH-008 is `ASSIGNED — ANALYSIS ONLY` under FFH-PW-002.
- Inspected HSA-relevant Supabase migrations/schema, person/account ownership, role-aware RLS, financial-profile forms/actions, Supabase snapshot loader, runtime normalization, authoritative HSA legal-capacity calculation, and focused HSA tests.
- Mapped the exact current HSA persistence -> application -> snapshot -> normalization -> Core Engine path.
- Identified current null/default semantics, data-capture gaps, tax-year/versioning gaps, and the mismatch between account-level storage and person/couple-level HSA legal semantics.
- Produced minimal interim, minimum-complete, and richer long-term data-contract options.
- Re-read the concurrently landed FFH-007 policy artifact and reconciled the technical recommendation with its completed policy recommendation.
- No production schema, migration, application code, UI, HSA calculation behavior, or live Supabase data was modified.

# 1. Exact current HSA data flow

## Database / persistence

`household_people` is the existing financial-person model and is separate from authenticated household membership. It stores person identity/relationship/birth-date/planning facts but no HSA eligibility history, coverage history, Medicare timing, last-month-rule choice/status, married-family allocation, or HSA contribution attribution.

`retirement_accounts` is currently the only persisted HSA legal-fact location. Relevant fields include:

- `owner_person_id uuid null` -> household-scoped `household_people` FK, `ON DELETE SET NULL`;
- `account_type` including `hsa`;
- `employee_contributed_ytd numeric(14,2) null`;
- `employer_contributed_ytd numeric(14,2) null`;
- `hsa_coverage_type text null`, constrained to `self_only | family | unknown` when non-null;
- `hsa_eligible boolean null`;
- normal account balance and recurring contribution fields.

There is no affirmative HSA database default. Legacy absence is representable as unknown.

The HSA account YTD fields and account-level HSA eligibility/coverage facts are not independently keyed by tax year. Their annual meaning therefore relies on surrounding planning context and data freshness. Adding more timeless annual legal facts to the account row would repeat that weakness.

`household_financial_preferences.expected_hsa_medical_spending_annual` is a Phase 5A planning-intent fact used to distinguish long-term HSA accumulation from expected medical spending. It is not HSA contribution eligibility.

Current financial tables use household-scoped role-aware authorization. Any later HSA financial tables should preserve the current `can_read_household` / `can_write_household_financials` pattern rather than invent a weaker authorization model.

## Application capture

The current `/financial-profile` retirement UI reads/edits only:
- name;
- account type;
- balance;
- monthly employee contribution;
- monthly employer contribution.

The corresponding add/update actions write only those basic fields. Selecting `hsa` does **not** collect:
- `owner_person_id`;
- employee/employer YTD contributions;
- `hsa_eligible`;
- `hsa_coverage_type`;
- monthly/period eligibility or coverage;
- Medicare timing;
- last-month-rule facts/choice;
- married-family allocation;
- historical ordinary/catch-up attribution.

Therefore an HSA created through the normal financial-profile flow does not, by itself, contain enough legal-capacity facts to become confidently actionable in the current engine. Missing fields must not be inferred merely because the UI created an HSA row.

## Snapshot loader / normalization

`lib/supabase/money-priority-snapshot.ts` explicitly selects the HSA account fields and passes them to `buildMoneyPrioritySnapshot`.

The normalized account contract preserves:
- `ownerPersonId: string | null`;
- `employeeContributedYtd: number | null`;
- `employerContributedYtd: number | null`;
- `hsaCoverageType: string | null`;
- `hsaEligible: boolean | null`.

`hsa_eligible` is intentionally nullable and not defaulted. Only actual booleans are accepted; missing/null remains `null`. Coverage remains nullable; only `self_only`/`family` can support the current base-limit path. YTD numeric fields are nullable and strictly parsed.

This null preservation is a good compatibility invariant and should remain after remediation.

## Authoritative calculation entry

`evaluateRetirementAccountOpportunities` currently:

1. aggregates employee + employer HSA YTD across every HSA owned by the same person;
2. derives HSA participants from represented HSA accounts linked to active people;
3. collapses account-level eligibility/coverage facts to owner facts; conflicting copies become unknown;
4. resolves married-spouse HSA structure before exposing actionable room;
5. distinguishes explicit ineligibility from unknown;
6. chooses an annual self-only/family base from current account-level coverage, then adds age-55 catch-up based on person age;
7. maintains one couple-wide ordinary family bucket and separate owner catch-up buckets;
8. currently blocks positive YTD for catch-up-eligible spouses when ordinary-vs-catch-up attribution is unknown;
9. prevents multiple HSA accounts from multiplying capacity.

R3 exists because no month/tax-year coverage history, Medicare timing, or last-month-rule basis reaches this path. Current account-level booleans/coverage are too weak to prove annual room for every case.

Repository documentation already states that person-level HSA eligibility independent of account rows is future scope and that absence of an HSA account is not affirmative evidence of spouse ineligibility.

# 2. Current tests/invariants that future work should preserve

Existing focused HSA tests establish:

- multiple HSAs for one person share one annual capacity;
- married eligible spouses share one ordinary family bucket;
- age-55 catch-up remains owner-specific;
- material unknown spouse eligibility/coverage blocks optimistic family room;
- explicit ineligibility is distinct from unknown;
- unresolved HSA facts do not block unrelated retirement destinations;
- Existing Cash, Secure, Build, Windfall, Your Plan, hypothetical reruns, and refresh paths use the same HSA uncertainty/capacity model;
- person/account input order does not change entity-level output;
- current R4 implementation blocks positive YTD for catch-up-eligible spouses when attribution is absent.

The last item is implementation evidence, not proof the blocker is required policy.

# 3. Data ownership recommendation

## Person + tax year

The following should be canonical person/tax-year facts because one person may own multiple HSAs and account existence does not create eligibility:

- month/period HSA eligibility;
- month/period coverage type;
- Medicare effective timing when relevant;
- last-month-rule use/status and required testing-period basis under approved policy;
- whether future-month values are confirmed facts or planning assumptions;
- any owner-level HSA legal-context facts needed by the approved model.

Do **not** put tax-year-specific HSA status as timeless columns on `household_people`.

## HSA account

Keep on the destination/account model:

- account identity;
- `owner_person_id`;
- balance;
- actual contribution totals/transactions that landed in that account;
- account-specific contribution schedule.

Once a canonical person-year source exists, eligibility/coverage should not remain independently authoritative on every HSA account.

## Household/couple + tax year

An explicit alternate married-family ordinary-base agreement belongs to the couple/household tax-year relationship, not individual HSA accounts.

FFH-007 now proposes equal allocation absent another agreement. The equal default can be derived from policy and **does not need to be persisted as duplicated spouse/account values**. Persist only a user-confirmed alternate agreement/allocation when one exists, if Manager adopts this policy.

## Derived runtime-only values

Continue deriving rather than persisting as competing sources of truth:

- legal annual ceiling;
- owner remaining room;
- shared married-family remaining room;
- catch-up remaining room;
- capacity-ledger entries/groups;
- `more_information_needed` state;
- recommendation amounts.

# 4. Data-contract options

## Option 0 — silently reinterpret legacy account fields

**REJECT / NOT SAFE.**

Do not reinterpret legacy `hsa_eligible=true` as full-year eligibility or legacy `hsa_coverage_type` as unchanged 12-month coverage. Those rows are not tax-year-bound, are duplicated across accounts, and were not captured by a UI that explained full-year semantics. Silent promotion would turn ambiguous legacy data into affirmative legal capacity.

## Option A — minimal safe interim bridge

Create an explicit **person + tax-year annual HSA basis** that distinguishes newly confirmed semantics from legacy account hints. Exact names await Manager approval, but conceptually one row per `(household_id, person_id, tax_year)` would hold:

- an explicit annual-capacity basis/status;
- Medicare effective timing if needed by the approved basis;
- explicit last-month-rule choice/status when used;
- confirmation/source/version metadata sufficient to identify newly reconfirmed data.

Only Manager-approved supported annual cases become actionable. Partial-year/coverage-change/Medicare/last-month-rule-uncertain cases remain targeted `more_information_needed`.

Pros: smallest safe remediation and simple legacy behavior (`no new confirmed profile = unknown`).

Cons: cannot fully calculate every partial-year R3 case.

## Option B — recommended minimum complete R3 model

Use a canonical **person-tax-year profile + month-level HSA status**.

Conceptual storage:

### `person_hsa_tax_year_profile`

One row per person/tax year for tax-year-wide context, such as:
- household/person/tax-year identity;
- Medicare effective date/month when applicable;
- last-month-rule choice/status/testing-period basis under Manager-approved semantics;
- confirmation/version metadata;
- optional flags identifying planned future values versus confirmed historical/current facts.

### `person_hsa_month_status`

At most 12 rows per person/tax year:
- household ID;
- person ID;
- tax year;
- month 1..12;
- tri-state eligibility (`eligible | ineligible | unknown` or equivalent);
- coverage (`self_only | family | none/unknown` under approved enum);
- fact-vs-planning-assumption marker if Manager adopts FFH-007's projected future-month distinction;
- uniqueness on `(person_id, tax_year, month)` plus household-scoped FK integrity.

Why month rows:
- directly represent proration inputs and coverage changes;
- no interval-overlap bugs;
- tax-year explicit;
- one canonical person fact regardless of number of HSA accounts;
- spouse facts can exist even without a spouse HSA account;
- Core Engine can derive the annual limit instead of persistence storing a stale derived legal maximum.

Medicare must not be inferred from age. If Medicare effective timing is stored as a raw source fact and monthly status can also be manually supplied, there must be one documented precedence/conflict rule; do not allow two independent authorities to disagree silently.

Last-month-rule use belongs at person/tax-year scope. It is not an account fact.

## Option C — richer long-term contribution/event model

If future product value justifies it, replace manually maintained HSA YTD aggregates with contribution records keyed to:
- household;
- HSA account;
- owner person;
- tax year/date;
- amount;
- source (employee/employer/etc. as supported);
- optional contribution classification/provenance.

This improves auditability, corrections, multiple-account aggregation, and future account-sync compatibility, but is not required for R3 and should not be introduced solely as speculative scope.

# 5. FFH-007 reconciliation

During FFH-008 execution, `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md` landed with status `COMPLETE POLICY RECOMMENDATION — READY FOR MANAGER SYNTHESIS WITH FFH-008`.

Its proposed policy aligns strongly with Option B:

- HSA legal eligibility is person + tax year, not account existence;
- legacy `hsa_eligible`/coverage must not silently become full-year certification;
- annual capacity needs month-granular eligibility/coverage or lossless equivalent;
- Medicare effective timing matters and uncertain material timing produces targeted information-needed;
- last-month rule is explicit/user-selected conditional treatment, never inferred from December eligibility;
- future-month planning assumptions must be distinguishable from established facts;
- married-family ordinary base uses equal allocation by default absent another agreement, with explicit alternate allocation allowed;
- age-55 catch-up remains owner-specific;
- R4's historical ordinary-vs-catch-up deposit-label blocker should be replaced by owner annual ceilings once spouse ordinary allocation is known.

## R4 technical consequence if Manager adopts FFH-007

My earlier generic technical options included an owner-level catch-up-YTD attribution aggregate. **That additional data is not needed if Manager adopts FFH-007's owner-ceiling policy.**

Under FFH-007's proposed model:

`owner annual ceiling = owner ordinary allocation + owner-specific age-55 catch-up capacity`

`owner remaining room = owner annual ceiling - aggregate employee/employer HSA YTD for that owner`

Therefore persistence needs:
- aggregate account/owner YTD (already conceptually present, subject to tax-year freshness);
- the couple's ordinary-base allocation (derived equal default or explicit alternate agreement);
- owner age/eligible periods;
- no historical per-dollar ordinary-vs-catch-up label solely for capacity math.

A catch-up-attribution field or contribution classification ledger remains optional future provenance, not minimum R4 data, **if** Manager adopts FFH-007.

## Married-family alternate allocation storage if FFH-007 is adopted

Recommended technical shape:

- do not persist the equal default; derive it from approved policy + legal shared base;
- when the household records a different agreement, persist a tax-year-bound couple allocation object/table with explicit person allocations;
- constrain values to nonnegative amounts and prevent aggregate allocation above the legally derived shared ordinary base at the application/engine validation layer; DB structural constraints can validate shape/nonnegative values but must not duplicate versioned tax-law formulas as hard-coded schema policy;
- do not infer alternate allocation from YTD, account order, IDs, balances, or account existence;
- if YTD cannot fit equal default but could fit a legal alternate, capture an explicit agreement rather than silently rewriting allocations.

# 6. Migration / legacy / default requirements

Any later Manager-approved implementation should:

- use additive schema changes;
- default all new legal-fact/status fields to NULL/unknown, never eligible/full-year/family/last-month-qualified;
- never backfill legacy `hsa_eligible=true` into 12 affirmative months;
- never treat legacy `hsa_eligible=false` as proof of zero annual room if later period history shows earlier eligible months;
- never infer owner from household creator, authenticated user, account name, or sole adult;
- never infer spouse ineligibility from absence of a spouse HSA account;
- never carry person/month HSA status into a later tax year by default;
- define exactly one canonical source during transition. Recommended direction: newly confirmed person-year/month data becomes authoritative; account-level HSA eligibility/coverage becomes legacy/current hint only and cannot compete;
- preserve existing balance/owner/YTD data without changing its meaning;
- use current household-scoped role-aware RLS for new financial tables;
- treat migration-file creation and live Supabase deployment as separate evidence.

Legacy rows should temporarily produce targeted reconfirmation/information-needed rather than optimistic legal room. That is a deliberate compatibility cost to avoid legal-capacity overstatement.

# 7. Runtime/database parity requirements

Future acceptance should require:

- DB enums/checks and runtime unions agree exactly;
- null/unknown survives PostgREST -> loader -> normalized snapshot without coercion;
- tax year is explicit and matches the HSA tax-policy year;
- month rows reconstruct deterministically after reload;
- person-level facts are not multiplied by multiple HSA accounts;
- spouse facts can affect married-family structure even without a spouse HSA destination;
- new HSA facts participate in Recommendation Refresh/material-basis invalidation where relevant;
- projected future-month assumptions are distinguishable from confirmed values if Manager adopts that policy;
- Existing Cash, Secure, Build, Windfall, Your Plan, hypothetical reruns, and refresh paths all consume the same normalized HSA contract rather than app-layer duplicate logic;
- no persisted derived legal-room field overrides newer source facts;
- cents/YTD values reconcile exactly;
- same persisted facts reload to the same normalized HSA legal-capacity basis.

# 8. Likely future files/systems — NOT AUTHORIZED IN FFH-008

Application/Data:
- additive migration(s) under `supabase/migrations/`;
- `app/financial-profile/page.tsx` or a dedicated HSA/tax profile UI;
- `app/financial-profile/actions.ts` or dedicated HSA actions;
- `lib/supabase/money-priority-snapshot.ts`;
- `lib/calculations/money-priority-snapshot.ts` shared input contract/normalization, coordinated with Core Engine;
- security/RLS tests;
- persistence/reload tests;
- recommendation-refresh basis tests.

Core Engine under separate authorization:
- `lib/calculations/money-priority-retirement-accounts.ts`;
- potentially `money-priority-retirement-capacity.ts` depending on approved owner/married allocation representation;
- current HSA closure/married/household-uncertainty tests plus new partial-year/Medicare/last-month-rule scenarios.

# 9. Required future scenarios/tests

Manager-approved implementation should cover at least:

- full-year self-only/family;
- partial-year eligibility;
- self-only -> family and family -> self-only changes;
- more than one coverage/eligibility transition;
- known Medicare mid-year effective date;
- retroactive Medicare recomputation and possible-excess state;
- December eligibility with last-month rule not selected;
- explicit last-month-rule use with conditional/testing-period state;
- unknown material month -> targeted information-needed;
- future projected month changed -> refresh/recalculation;
- married equal default;
- explicit alternate married allocation;
- equal default incompatible with YTD but legal alternate possible -> ask for agreement, do not infer;
- one/both spouse age-55 catch-ups;
- spouse has no HSA account but person facts still affect family structure;
- multiple HSA accounts for one owner;
- legacy `hsa_eligible=true` without new period facts remains non-affirmative;
- missing account owner remains information-needed;
- R4 owner-ceiling calculation using aggregate owner YTD if FFH-007 is approved;
- unresolved HSA facts do not block unrelated IRA/workplace routing;
- DB reload parity;
- RLS owner/member/viewer/nonmember behavior;
- order invariance.

# 10. Parallel/collision assessment

FFH-008 itself was documentation-only and had no production collision.

FFH-006 concurrently modified `lib/calculations/money-priority-retirement-accounts.ts`, which is also the principal future HSA Core Engine surface. Future HSA production work should start only from the post-FFH-006 stable checkpoint and must not apply stale patches to that file.

Application/Data can own new schema, persistence, forms/actions, loader, and reload parity. Core Engine should own HSA legal-capacity calculation. `money-priority-snapshot.ts` is a shared contract surface and needs one agreed interface before parallel implementation.

Manager should either serialize shared-contract work or issue separate branches/tasks with explicit integration order. Do not optimize worker utilization at the cost of contract drift.

# 11. Technical recommendation to Manager

Subject to Manager synthesis of the now-complete FFH-007 recommendation:

1. **Approve Option B** as the minimum complete R3 architecture: person-tax-year profile + month-level HSA eligibility/coverage facts.
2. Keep `retirement_accounts` as HSA destinations/YTD sources, not the canonical home of person legal eligibility.
3. Keep legacy account eligibility/coverage as non-affirmative legacy/current hints until reconfirmed; never auto-promote.
4. If FFH-007 is adopted, derive equal married-family allocation by policy and persist only explicit alternate tax-year agreements.
5. If FFH-007 is adopted, remove R4's need for ordinary-vs-catch-up historical labels from the minimum data contract; use owner annual ceilings + aggregate owner YTD.
6. Keep a contribution-event ledger as a richer future option, not current mandatory scope.
7. Require explicit null/unknown defaults, tax-year binding, single-source precedence, reload parity, and targeted legacy reconfirmation.
8. Issue separate implementation-ready App/Data and Core Engine tasks only after Manager records the approved HSA policy/data contract.

This recommendation is a PRODUCT/DATA ARCHITECTURE recommendation. FFH-007 remains Policy evidence until Manager approves/synthesizes it; FFH-008 does not itself establish final financial policy.

Evidence produced:
- current HSA schema/migration history;
- role-aware RLS;
- financial-profile read/write contract;
- Supabase snapshot loader;
- normalized snapshot null/boolean/numeric semantics;
- current HSA opportunity/capacity behavior;
- focused HSA tests;
- FFH-005 regulatory handoff;
- FFH-007 completed policy recommendation;
- branch/delta verification during concurrent work.

Tests / validation actually performed: Repository inspection and branch/delta verification only. No local tests run by FFH-008. No CI triggered by FFH-008. No migration applied. No live Supabase query, migration-parity validation, or runtime persistence/reload test performed.

Files updated:
- `.ai/engineering/app/HANDOFF.md` only.

Data model changes: None.

Migrations: None.

Application behavior changes: None.

Engine contract changes: None by FFH-008.

Open findings:
- Manager has not yet synthesized/approved FFH-007 + FFH-008, so the policy artifact is not yet final canonical product behavior.
- current financial-profile UI/actions do not capture even the existing HSA legal-capacity inputs;
- current HSA eligibility/coverage is account-level and unversioned by tax year;
- current HSA YTD aggregates are not independently tax-year-keyed on the account row;
- exact future confirmation/reconfirmation UX remains a product/application decision after Manager synthesis.

Blocking issues:
- no HSA production implementation is authorized before Manager synthesis;
- R3 remains merge-blocking until approved policy/data contract is implemented and audited.

Unverified items:
- live Supabase schema/migration parity;
- household-specific HSA data quality;
- FFH-006 exact final validation/CI status beyond the source delta observed during this task;
- no assumption that legacy HSA rows were originally entered with full-year semantics.

Known risks:
- optimistic legacy backfill;
- two competing HSA sources of truth;
- stale tax-year facts;
- duplicated app-layer legal rules;
- shared snapshot/Core Engine branch collisions;
- persisted derived legal room becoming stale.

Audit status: NOT AUDITED. FFH-008 does not issue audit verdicts.

Recommended next role: Manager / Architect.

Exact next action: Manager should synthesize `.ai/policy/retirement/FFH-007_HSA_LEGAL_CAPACITY_POLICY.md` with this FFH-008 technical contract, record the approved HSA policy/data decision, and only then issue explicit implementation tasks partitioned between Application/Data and Core Engine.

Checkpoint / SHA: The first FFH-008 handoff commit was verified as `fa5f1223d6fab7208d31b2f09bfaf76682610f28`. This reconciliation update creates a later documentation-only commit; verify that exact commit before using it as the final FFH-008 checkpoint.
