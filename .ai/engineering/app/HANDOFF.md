# Application, Data & Integration Engineer Handoff

HANDOFF

Task ID: FFH-008

Role: Application, Data & Integration Engineer

Status: COMPLETE — ANALYSIS ONLY / READY FOR MANAGER SYNTHESIS

Verified starting state: Analysis began after refreshing `phase-5-money-priority-engine` at `71705039f0abf1945202631109975edeb5632920`. During the session the branch advanced to `247af1866490521c69b08ca2fbac3926444730e3`. A direct compare showed the intervening two commits changed only `.ai/manager/HANDOFF.md` and `.ai/shared/PROJECT_STATE.md`; no production, schema, migration, snapshot, application, or HSA calculation files changed. The current Manager assignment still marks FFH-008 `ASSIGNED — ANALYSIS ONLY` and requires Manager synthesis with FFH-007 before any HSA implementation.

Assigned objective: Map the current HSA persistence/runtime architecture and propose minimum safe data-contract options needed to implement future Manager-approved FFH-007 policy and resolve FFH-005 R3/R4. Do not implement schema, application, UI, migration, or calculation changes.

## Work completed

- Refreshed canonical shared state, Manager assignments/handoff, Retirement Policy handoff, Regulatory Research handoff, current branch/head, and relevant repository architecture.
- Inspected the HSA-relevant Supabase migration history, `household_people`, `retirement_accounts`, household financial preferences, role-aware RLS, financial-profile forms/actions, Supabase snapshot loader, normalized snapshot contract, authoritative retirement-account opportunity logic, HSA capacity ledger-facing behavior, and focused HSA tests.
- Mapped the exact current HSA data path from persistence through UI/application capture, snapshot loading, normalization, and authoritative legal-capacity calculation.
- Identified current data ownership/null/default semantics and the mismatch between account-level persistence and person/couple-level legal semantics.
- Produced technical data-contract options for R3 and R4 without defining HSA financial policy.
- No production code, schema, migration, UI, HSA behavior, live data, or canonical Manager/shared files were modified.

## Exact current HSA persistence/runtime contract

### Persisted account/person fields

`household_people` is the financial-person model and is deliberately separate from authenticated household membership. Relevant existing fields include stable `id`, `household_id`, `relationship`, `birth_date`, `planned_retirement_age`, `is_dependent`, `is_active`, and later tax/retirement-planning fields. It currently has no person-level HSA eligibility, HSA coverage history, Medicare date, HSA tax-year profile, or HSA contribution-attribution fields.

`retirement_accounts` is currently the only persisted HSA legal-fact location. HSA-relevant fields are:
- `owner_person_id uuid null` — household-scoped FK to `household_people`; nullable and `ON DELETE SET NULL`;
- `account_type` includes `hsa`;
- `employee_contributed_ytd numeric(14,2) null`;
- `employer_contributed_ytd numeric(14,2) null`;
- `hsa_coverage_type text null`, constrained to `self_only | family | unknown` when non-null;
- `hsa_eligible boolean null`;
- normal account balance and recurring contribution fields.

There is no HSA-specific affirmative database default. `hsa_eligible` and `hsa_coverage_type` remain nullable. That is important: legacy absence is already representable as unknown.

`household_financial_preferences` contains the tax-profile year/status/AGI context and later `expected_hsa_medical_spending_annual`, but no HSA legal-eligibility facts. `expected_hsa_medical_spending_annual` is a Phase 5A planning-intent input for long-term HSA accumulation, not statutory contribution eligibility.

Current HSA account YTD fields are not independently tax-year-keyed on `retirement_accounts`; their year semantics depend on surrounding planning context and application freshness. This makes adding more unversioned annual HSA legal facts directly to the account row undesirable.

### Application capture path

The normal `/financial-profile` retirement UI currently loads and edits only:
- account name;
- account type;
- balance;
- monthly employee contribution;
- monthly employer contribution.

The add/update server actions write only those same basic retirement-account fields. Although `hsa` is selectable as an account type, the normal UI/actions do not capture or update:
- `owner_person_id`;
- `employee_contributed_ytd` / `employer_contributed_ytd`;
- `hsa_eligible`;
- `hsa_coverage_type`;
- person-level HSA facts;
- Medicare timing;
- partial-year/monthly eligibility;
- last-month-rule facts;
- ordinary-vs-catch-up YTD attribution.

Therefore a newly created HSA through the normal financial-profile path does not, by itself, contain enough persisted legal-capacity facts to become an actionable HSA destination in the current engine. This is a current data-capture boundary, not a reason to infer the missing fields.

There is also no normal application workflow in the inspected path for creating/editing the Phase 5 `household_people` HSA facts because such HSA person-level facts do not exist yet. Onboarding creates the household/profile but does not establish HSA person-year eligibility semantics.

### Snapshot loader and normalized runtime

`lib/supabase/money-priority-snapshot.ts` explicitly selects the HSA account fields from `retirement_accounts` and passes raw PostgREST rows into `buildMoneyPrioritySnapshot`.

The normalized snapshot preserves:
- `ownerPersonId: string | null`;
- `employeeContributedYtd: number | null`;
- `employerContributedYtd: number | null`;
- `hsaCoverageType: string | null`;
- `hsaEligible: boolean | null`.

The boolean validation contract marks `hsa_eligible` as nullable, not defaulted. Missing/null remains `null`; only actual booleans are accepted. The coverage string is preserved as nullable text and the evaluator accepts actionable base-limit semantics only for `self_only` or `family`; `unknown`/missing remains information-needed. Numeric YTD values remain nullable and use strict numeric parsing.

This is currently good null-preservation behavior: the runtime does not coerce legacy missing HSA facts into affirmative eligibility.

### Authoritative HSA calculation entry

`evaluateRetirementAccountOpportunities` is where the normalized HSA fields become legal-capacity inputs. Current behavior:

1. HSA employee + employer YTD is aggregated by owner across every represented HSA account. If any required owner/account YTD component is unknown, owner YTD is unknown.
2. HSA participants are inferred only from represented HSA accounts with `ownerPersonId` pointing to active `self`/`spouse_partner` people.
3. Account-level `hsaEligible` and `hsaCoverageType` values are collapsed per owner. Conflicting values across one owner's multiple HSA accounts become unknown.
4. Married-spouse structure is then derived across represented spouse owners. Unknown eligibility/coverage that could change family sharing propagates `more_information_needed` to affected spouse HSAs.
5. Explicit ineligibility remains distinct from unknown.
6. Current annual base limit is chosen from the account/owner coverage fact (`self_only` or `family`) plus age-55 catch-up from person birth date.
7. Married-family ordinary room is one shared couple bucket; owner-specific age-55 catch-ups are separate owner-only buckets.
8. Current R4 behavior treats positive YTD for a catch-up-eligible spouse as attribution-ambiguous when persisted YTD does not identify ordinary family dollars versus owner catch-up dollars. That case becomes `more_information_needed` rather than fabricating additional room.
9. Multiple HSA accounts cannot multiply owner/couple room.

The key R3 limitation is structural: the evaluator currently treats account-level annual `hsaEligible` + `hsaCoverageType` as if they are sufficient annual-capacity facts. There is no tax-year-bound month/period eligibility, coverage transition history, Medicare timing, or last-month-rule status in the normalized snapshot.

The repository documentation explicitly acknowledges that HSA eligibility/coverage are currently derived only from recorded HSA account rows and that person-level HSA eligibility independent of account records remains future scope.

## Current tests and compatibility behavior

Focused tests establish several existing invariants that future persistence work must preserve unless Manager-approved policy intentionally changes them:
- multiple HSAs for one person share one annual limit;
- two eligible spouses with family coverage expose one shared family ordinary bucket rather than duplicated limits;
- each age-55 catch-up remains owner-specific;
- unknown spouse eligibility/coverage blocks optimistic married-family room when it could change the structure;
- explicit ineligibility is distinct from unknown;
- unresolved HSA structure does not block unrelated IRA routing;
- Existing Cash, Secure, Build, Windfall, Your Plan, hypothetical reruns, and recommendation refresh consume/preserve the same information-needed HSA semantics;
- positive YTD for a catch-up-eligible spouse currently blocks additional HSA room when ordinary-vs-catch-up attribution is absent;
- people/account array permutation does not change entity-level financial output.

These tests are implementation evidence, not authority to decide whether R4 must remain policy.

## Data ownership analysis

### Facts that belong to a person + tax year, not to an HSA account

The following are fundamentally person/tax-year legal-context facts because a person can own multiple HSAs and HSA contribution eligibility is not created by the existence of one account:
- HSA eligibility by month/period;
- HDHP coverage type by month/period (`self_only` / `family` / unknown/ineligible state);
- Medicare coverage/enrollment effective timing when used to determine HSA eligibility;
- other person-specific eligibility state needed by approved policy;
- last-month-rule qualification/election/testing-period status if FFH-007 requires it as an input;
- owner-specific age-55 catch-up YTD attribution if Manager chooses an aggregate R4 solution.

These facts must be tax-year-bound. Putting them as timeless columns on `household_people` would create cross-year stale-state risk.

### Facts that still belong to an HSA account

- account identity/name/provider metadata if later modeled;
- `owner_person_id` linkage;
- account balance;
- actual contributions that landed in that account, if the product continues using account-level YTD aggregates or later introduces contribution transactions;
- recurring contribution schedule when the schedule is truly account-specific.

Eligibility/coverage should not be duplicated independently on every HSA account once a canonical person-year source exists.

### Facts that belong to the household/couple tax-year relationship

A married-family ordinary-base allocation choice, if FFH-007/Manager decides the product needs an explicit spouse split, is a couple/tax-year fact because the ordinary family base is shared. It should not be stored independently on each HSA account.

The current shared-capacity ledger does not require a permanent spouse split to enforce the couple-wide cap. Therefore Engineering should not create a persisted allocation split merely for convenience. If FFH-007 chooses an IRS/default/user allocation rule, Manager should approve the semantic contract first; only then should persistence encode a household/couple tax-year choice or explicit spouse allocations.

### Derived values that should remain runtime-derived

Do not persist as competing sources of truth unless a later task explicitly authorizes snapshots/history:
- remaining annual HSA room;
- shared family remaining room;
- owner catch-up remaining room;
- final legal-capacity ledger;
- information-needed state;
- contribution recommendation amount.

Those should continue to be deterministically derived from canonical stored facts + tax policy + explicit tax year.

## Technical data-contract options

### Option 0 — Reinterpret current account fields as full-year facts

NOT RECOMMENDED / NOT SAFE as a silent migration.

It would redefine historical `hsa_eligible=true` and `hsa_coverage_type` values without evidence that users originally supplied them as full-tax-year or last-month-rule-qualified facts. The fields are not tax-year-bound, are duplicated across accounts, and are not collected by the normal financial-profile workflow. Treating existing `true` as full-year eligibility would violate the repository rule that stale/ambiguous data must not silently become affirmative financial meaning.

A no-schema approach can remain safe only by continuing to treat ambiguous existing values conservatively; it cannot provide complete R3 partial-year/Medicare/coverage-change modeling.

### Option A — Minimal safe interim: explicit person-tax-year annual certification, fail closed outside supported cases

Purpose: close the overstatement risk quickly without pretending to model every partial-year case.

Conceptual model (names intentionally non-binding pending Manager/FFH-007):
- one `person_hsa_tax_year_profile` row per `(household_id, person_id, tax_year)`;
- explicit status describing whether actionable annual capacity is established under the Manager-approved policy;
- any required last-month-rule status/evidence on that person-year row;
- optional Medicare effective date/source fact when policy uses it;
- explicit confirmation/version metadata sufficient to distinguish newly confirmed semantics from legacy account fields.

Under this option, only the policy-defined supported annual cases become actionable. Partial-year, coverage-change, Medicare/retroactivity, or last-month-rule-uncertain cases remain targeted `more_information_needed` rather than being prorated from insufficient facts.

Advantages:
- smallest safe semantic bridge;
- additive migration;
- easy legacy behavior: no new person-year row => unknown, not eligible=true;
- avoids duplicating a new annual certification across multiple HSA accounts.

Limitations:
- does not calculate all partial-year legal room;
- still needs FFH-007 to define exactly what annual certification means;
- if product requirements demand month-accurate R3 resolution now, this option is insufficient.

### Option B — Recommended minimum complete R3 model: person-tax-year + month-level HSA status

Purpose: represent month-sensitive eligibility and coverage changes without persisting a derived legal limit.

Recommended normalized persistence shape:

1. `person_hsa_tax_year_profile`
- household/person/tax-year identity;
- raw/legal-context facts that are tax-year-wide, such as Medicare effective timing if FFH-007 requires it;
- last-month-rule status/evidence fields if approved;
- confirmation/version metadata;
- optional owner-level R4 attribution aggregate only if Manager selects that strategy.

2. `person_hsa_month_status` (12-row maximum per person/tax year)
- `household_id`;
- `person_id`;
- `tax_year`;
- `month` 1..12;
- tri-state eligibility (`eligible | ineligible | unknown`) or equivalent nullable/enum contract;
- coverage type (`self_only | family | none/unknown`) as approved;
- unique `(person_id, tax_year, month)` plus household-scoped FK integrity.

Why month rows rather than account fields or a single annual boolean:
- directly represents eligibility proration inputs;
- directly represents self-only/family coverage changes;
- deterministic and easy to validate for exactly 12 calendar months;
- avoids range-overlap bugs from arbitrary start/end period records;
- does not multiply facts when one person has multiple HSA accounts;
- allows a spouse with no HSA account to contribute legally relevant household HSA facts;
- remains tax-year-specific;
- lets the Core Engine derive legal annual room rather than storing a stale derived limit.

Medicare should never be inferred from age alone. If FFH policy wants Medicare timing to drive month eligibility, store the actual effective date/status as a person-year source fact and have one approved normalization path derive affected months. Do not keep two independent authoritative sources (manual monthly status and Medicare-derived monthly status) without a documented precedence/conflict rule.

Last-month-rule qualification is also a person/tax-year legal-context fact, not an account property. Exact enum/status semantics must come from FFH-007/Manager; Application/Data should not invent the legal interpretation.

This is the recommended technical target if Manager wants full R3 resolution rather than a fail-closed bridge.

### Option C — Richer long-term contribution/event model

Purpose: eliminate ambiguous YTD aggregates and support transaction synchronization/history later.

Conceptual additive model:
- HSA contribution records keyed to household, HSA account, owner person, tax year, contribution date/period, amount, source (`employee`, `employer`, `other` as supported), and approved contribution classification (`ordinary`, `catch_up`, `unknown`) when known;
- derive employee/employer/ordinary/catch-up YTD totals from events;
- preserve account ownership and couple-wide/owner-specific ledger constraints in Core Engine.

Advantages:
- strongest R4 provenance/auditability;
- supports corrections, imports, multiple accounts, and future account aggregation;
- avoids manually maintaining several cumulative YTD columns.

Costs/risks:
- substantially larger application/data scope;
- transaction idempotency/import reconciliation needed;
- existing aggregate YTD columns require a compatibility strategy;
- unnecessary for R3 alone.

Do not adopt this solely to keep Engineering busy; it is a future-capability choice unless Manager finds it justified for current correctness.

## R4 technical options (policy decision remains FFH-007/Manager)

R4 is not a verified statutory requirement to label historical HSA YTD dollars as ordinary versus catch-up. Engineering therefore must not decide the policy outcome.

Technical options:

1. **Retain current conservative blocker.** No new R4 schema is required. Positive YTD for a catch-up-eligible spouse can remain `more_information_needed` if FFH-007 explicitly approves that as project policy. This is the smallest and safest persistence change.

2. **Minimal aggregate attribution.** If FFH-007 wants actionable room without a full contribution ledger, persist a tax-year-bound owner-level catch-up YTD amount/status on the person HSA tax-year profile. Existing aggregate owner HSA YTD minus verified owner catch-up YTD can then derive ordinary family YTD. This is materially safer than adding another unversioned value to each HSA account and avoids duplication across multiple accounts.

3. **Contribution ledger.** Use Option C when provenance/history/import needs justify it.

Any aggregate-attribution solution needs validation that catch-up YTD cannot exceed aggregate owner HSA YTD and must preserve unknown when attribution is not confirmed. Exact financial semantics remain policy-owned.

## Married-family allocation choice

Current engine capacity is represented as one couple-wide shared ordinary group plus separate owner catch-up groups. That architecture can enforce the legal shared ceiling without pre-splitting ordinary capacity between spouses.

Therefore the persistence layer should **not** invent an equal/default spouse allocation unless FFH-007/Manager approves that policy. If a user-selectable or default split is required, use a household/couple tax-year model with either:
- one explicit allocation method + validated spouse allocation amounts; or
- explicit spouse allocation amounts whose sum is constrained to the approved ordinary family base.

Do not store independent account-level shares that can multiply when a spouse owns multiple HSAs.

## Migration and backward-compatibility requirements

For any later authorized implementation:

- prefer additive tables/columns; no destructive rewrite is needed for R3/R4;
- new legal-fact columns/statuses must default to NULL/unknown, never `true`, `self_only`, `family`, full-year, or last-month-qualified;
- do not backfill legacy `retirement_accounts.hsa_eligible=true` into a verified person-year full-year eligibility record;
- do not infer HSA owner from household creator, authenticated user, account name, or sole active adult; legacy `owner_person_id=null` must remain information-needed until explicitly resolved;
- do not infer spouse HSA ineligibility from absence of an HSA account;
- do not carry one tax year's person/month HSA status into a later tax year by default;
- if old account-level HSA eligibility/coverage fields remain during transition, define exactly one canonical precedence rule. Recommended architecture: new person-year/month facts become canonical when explicitly confirmed; legacy account fields remain compatibility evidence and must not compete as a second source of truth;
- preserve current null semantics at the raw and normalized boundaries;
- use household-scoped FK integrity and the current role-aware RLS helpers (`can_read_household` / `can_write_household_financials`) for any new financial table;
- no migration file existence may be described as live deployment; live Supabase application must be independently verified later.

## Runtime/database parity requirements

A later production task should require all of the following before acceptance:

- DB constraints and application enums agree exactly on month, coverage, eligibility, last-month-rule, allocation, and attribution states;
- PostgREST nulls remain runtime unknowns without boolean/string coercion;
- tax-year keys are explicit and match the tax-policy year used for HSA capacity;
- person/month rows reconstruct deterministically after reload;
- multiple HSA accounts for one person consume one person/couple legal structure, not duplicated account facts;
- spouse/person facts remain available even when that spouse has no HSA account;
- changes to person HSA legal facts participate in recommendation-basis/material-profile-change detection as appropriate;
- hypothetical reruns, Windfall, Your Plan, Existing Cash, Secure, Build, and Recommendation Refresh receive the same normalized HSA facts rather than reconstructing separate application-layer rules;
- no persisted derived remaining-room value overrides fresher source facts;
- cents/amount precision and tax-year attribution reconcile across persistence and runtime;
- reload of the same stored facts produces equivalent normalized snapshot and capacity state.

## Likely future affected files/systems — NOT AUTHORIZED YET

Application/Data surfaces likely involved after Manager approval:
- new additive migration(s) under `supabase/migrations/`;
- `app/financial-profile/page.tsx` or a dedicated tax/HSA profile UI;
- `app/financial-profile/actions.ts` or dedicated HSA actions;
- `lib/supabase/money-priority-snapshot.ts`;
- `lib/calculations/money-priority-snapshot.ts` shared input contract/normalization (coordinate with Core Engine ownership);
- security/RLS contract tests for any new table;
- snapshot/persistence/reload tests;
- recommendation-refresh basis tests if new normalized HSA facts affect fingerprints.

Core Engine surfaces likely involved only under a separate Core Engine assignment:
- `lib/calculations/money-priority-retirement-accounts.ts`;
- `lib/calculations/money-priority-retirement-capacity.ts` if group semantics change;
- focused HSA tests including `phase-5-closure-hsa-capacity.test.ts`, `money-priority-married-hsa-remediation.test.ts`, `money-priority-hsa-household-uncertainty.test.ts`, plus new partial-year/Medicare/last-month-rule tests.

## Required future test/scenario coverage

A later implementation task should include, at minimum:
- full-year self-only and family cases;
- partial-year eligibility with explicit unknown months;
- self-only -> family and family -> self-only coverage transitions;
- Medicare effective mid-year / retroactive-effective-date cases under approved policy;
- December eligibility with last-month-rule qualified, not qualified, and unknown states;
- spouse with legally relevant person-level HSA facts but no HSA account;
- one person with multiple HSA accounts and one canonical person-year/month status;
- married family sharing with one/both age-55 catch-ups;
- legacy HSA rows with `hsa_eligible=true` but no new verified person-year facts remain non-affirmative under migration policy;
- missing owner remains information-needed;
- R4 known/unknown catch-up attribution according to approved policy;
- database reload produces same normalized facts and legal-capacity result;
- RLS owner/member/viewer/nonmember behavior for any new financial table;
- unrelated IRA/workplace routing remains unaffected by unresolved HSA facts;
- deterministic output under account/person/month row permutations where order is semantically irrelevant.

## Parallel/collision assessment

FFH-008 analysis itself has no production collision with FFH-006.

Future HSA implementation will overlap Core Engine-owned surfaces, especially `money-priority-snapshot.ts` and `money-priority-retirement-accounts.ts`. Manager should not authorize concurrent edits to those shared files without an explicit branch/integration plan. Application/Data can own schema, persistence, forms/actions, and loader changes while Core Engine owns pure HSA capacity algorithms, but the normalized input contract must be agreed first.

The branch advanced during this analysis only through Manager/shared documentation files, so this role-owned handoff does not overwrite those changes.

## Technical recommendation to Manager

1. Do not silently redefine current account-level `hsa_eligible` as full-year eligibility.
2. For a quick safe bridge, use Option A and keep unsupported partial-year cases information-needed.
3. If R3 must be fully resolved now, adopt Option B: canonical person + tax-year HSA profile plus month-level eligibility/coverage status, with last-month-rule/Medicare source facts at person-year scope as required by FFH-007.
4. Keep account ownership/contribution destinations on `retirement_accounts`; move legal eligibility/coverage semantics away from duplicated account rows once the new source is live.
5. For R4, retain the current conservative blocker unless FFH-007 specifically requires more actionable capacity. If it does, a tax-year-bound owner catch-up aggregate is the minimum additional data; a contribution ledger is the richer long-term model.
6. Persist a married-family allocation split only if FFH-007/Manager decides the product needs one; the existing shared capacity group does not technically require a permanent split.
7. Require explicit unknown/null defaults and user re-confirmation for legacy rows before any new fact becomes affirmative/actionable.

This is an Application/Data architecture recommendation only. It does not decide HSA statutory interpretation, equal-allocation policy, last-month-rule policy, or whether R4's conservative blocker should remain.

Evidence produced:
- current migrations/schema and role-aware RLS;
- current financial-profile read/write contract;
- Supabase snapshot loader;
- normalized snapshot validation/null semantics;
- current HSA opportunity/capacity behavior;
- focused HSA closure/married/household-uncertainty tests;
- current Manager/Regulatory/Retirement handoffs and canonical project state.

Tests / validation actually performed: Repository analysis only. No local tests were run. No Foundation CI was triggered by FFH-008 analysis. No database migration was applied. No live Supabase schema/data query or runtime reload test was performed. Existing test/CI evidence was inspected only where already persisted in repository/Manager state.

Files updated:
- `.ai/engineering/app/HANDOFF.md` — created as this analysis-only handoff.

Data model changes: None implemented.

Migrations: None created or modified.

Application behavior changes: None.

Engine contract changes: None.

Open findings:
- FFH-007 has not yet produced a completion handoff, so exact last-month-rule, married-family default-allocation, and R4 policy semantics remain Manager/Policy dependencies.
- Current financial-profile UI/actions do not collect the HSA facts already required by the current engine for actionable capacity.
- Current HSA eligibility/coverage fields are account-level, unversioned by tax year, and structurally insufficient for full R3 modeling.
- Current YTD aggregates are also not independently tax-year-keyed on the account row.

Blocking issues:
- No HSA production implementation is authorized until Manager synthesizes FFH-007 and FFH-008.
- R3 remains merge-blocking until approved data/policy semantics are implemented and later audited.

Unverified items:
- Live Supabase migration/deployment parity was not verified in this session.
- Existing household-specific HSA data quality was not inspected.
- No assumption is made that legacy HSA fields were entered with full-year semantics.
- FFH-007 final policy is not yet available in the current repository handoff.

Known risks:
- silent legacy backfill could overstate legal contribution room;
- maintaining account-level and person-year HSA facts as competing authorities could create nondeterministic/stale capacity;
- uncoordinated Core Engine/App edits to shared snapshot contracts could cause runtime/database drift;
- storing derived annual room rather than source facts would create stale legal-capacity results after tax-year/policy/profile changes.

Audit status: NOT AUDITED. FFH-008 is analysis-only and does not issue an audit verdict.

Recommended next role: Manager / Architect for FFH-007 + FFH-008 synthesis after FFH-007 completes.

Exact next action: Manager should wait for the independent FFH-007 policy handoff, reconcile it against this data-contract analysis, approve one explicit HSA canonical data model/legacy policy, and only then issue separate implementation-ready Engineering task(s) with ownership of App/Data versus Core Engine surfaces.

Checkpoint / SHA: The pre-write branch head was verified at `247af1866490521c69b08ca2fbac3926444730e3`. This handoff write creates a later documentation-only commit; verify the exact resulting SHA before treating it as the FFH-008 checkpoint.
