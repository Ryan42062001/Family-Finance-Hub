# FFH-039 — Scenario Lab Product + Technical Contract

Status: DISCOVERY / DESIGN COMPLETE — READY FOR MANAGER REVIEW  
Role: Product & Technical R&D Engineer  
Task: FFH-039  
Execution mode: STANDARD_CHAT_HIGH  
Research branch: research/ffh-039-scenario-lab-contract  
Verified Manager/control-plane head: 177cce093cd24fd9169361ff4ccb397ac7b6b5d1  
Phase-6 product baseline: ae11a48359d082e615b76822b6bbe3a7f379a8d2  

## 1. Executive contract

Scenario Lab v1 should be a deterministic, ephemeral, authenticated planning workspace layered on the accepted Phase-5 Money Priority Engine.

Its product job is:

> Let a household change explicit assumptions, rerun the same authoritative financial engine, and understand exactly what changes — without changing the household's real profile and without converting hypothetical assumptions into legal facts.

The smallest useful v1 is not a second financial engine and not a general spreadsheet. It is a versioned scenario envelope around the existing normalized household snapshot, canonical Money Priority Engine, specialized affordability/windfall/user-plan evaluators, and Recommendation Refresh comparison semantics.

R&D product/technical recommendation for v1:

- ephemeral in-memory scenario drafts/results only;
- no Scenario Lab Supabase tables or migrations in v1;
- server-authoritative baseline loading and scenario execution;
- a typed overlay on an immutable normalized baseline rather than arbitrary JSON patching;
- one canonical Phase-5 engine rerun for financial-profile changes;
- specialized adapters for Home, Vehicle, Windfall, and Your Plan rather than reimplementing their financial logic;
- explicit baseline fingerprint + policy basis on every draft/run;
- fail-closed stale detection before rerunning an old draft;
- exact separation of recurring changes from one-time cash events;
- preserved legal-capacity ledgers and exact-cent reconciliation;
- before/after explanation driven by Recommendation Refresh plus module-specific results;
- no "apply scenario to profile" action in v1.

This is a product/technical architecture recommendation only. Manager owns whether to accept it, authorize implementation, assign task IDs, sequence work, and set audit/integration gates.

## 2. Verified repository basis

The assigned research branch and canonical main were both verified at 177cce093cd24fd9169361ff4ccb397ac7b6b5d1.

The Phase-6 product baseline ae11a48359d082e615b76822b6bbe3a7f379a8d2 is the first parent of that Manager activation commit. The baseline-to-current delta is limited to Phase-6/control-plane documentation. No Phase-5 production source change is introduced by that delta.

Relevant accepted production surfaces inspected:

- lib/supabase/money-priority-snapshot.ts
- lib/calculations/money-priority-snapshot.ts
- lib/calculations/money-priority-engine.ts
- lib/calculations/money-priority-hypothetical.ts
- lib/calculations/home-affordability.ts
- lib/calculations/vehicle-affordability.ts
- lib/calculations/money-priority-windfall.ts
- lib/calculations/money-priority-user-plan.ts
- lib/calculations/money-priority-recommendation-refresh.ts
- lib/calculations/money-priority-core.ts
- lib/calculations/money-priority-retirement-capacity.ts
- lib/calculations/money-priority-retirement-projection.ts
- lib/calculations/money-priority-planning-assumptions.ts
- lib/calculations/money-priority-tax-policy.ts
- lib/calculations/money-priority-policy.ts
- relevant unit/adversarial tests for the same surfaces.

The accepted runtime flow is:

persisted household data
-> server-side Supabase loader
-> strict raw snapshot validation
-> normalized MoneyPrioritySnapshot
-> runMoneyPriorityEngine
-> Existing Cash / Secure / Build / Optimize
-> one authoritative retirement-capacity ledger
-> ranked recommendations + warnings + residual needs.

Scenario Lab must enter this flow before the canonical engine or through an already-accepted specialized post-engine adapter. It must not bypass it.

## 3. Core user jobs

Scenario Lab v1 should solve five primary jobs.

### 3.1 "What happens if this part of our financial life changes?"

Examples: take-home pay falls, childcare starts, an expense disappears, a debt is paid off, a goal moves, retirement contributions change.

The answer must show both financial-state and recommendation consequences.

### 3.2 "Can we afford this major purchase without breaking the rest of the plan?"

Home and Vehicle should preserve their existing specialized affordability contracts while becoming first-class Scenario Lab scenario types.

### 3.3 "What should happen to a one-time amount?"

Windfall should remain a one-time post-engine allocation problem, not be converted into monthly income or mixed into recurring capacity.

### 3.4 "What if we choose a different allocation than the recommendation?"

Your Plan should remain an allocation-level override model against a particular engine result. It must not rewrite the underlying household profile.

### 3.5 "Why did the answer change?"

Scenario Lab should expose changed assumptions, changed normalized financial basis, recommendation/allocation differences, missing facts, and specialized module risks. It should not reduce the comparison to one opaque score.

## 4. Scenario Lab v1 domain model

The core model should distinguish four things that must never collapse into one another:

1. Baseline facts — current normalized household data loaded from authoritative persistence.
2. Hypothetical assumptions — explicit user-entered scenario overrides.
3. Derived financial state — the immutable scenario snapshot and canonical engine result.
4. User allocation preference — optional Your Plan overrides applied after the engine recommendation.

A conceptual v1 contract:

ScenarioDraft
- local scenario id and title;
- definitionVersion;
- baselineFingerprint;
- baseline policy basis: money-priority policy, planning-assumptions version, tax-policy version, tax year, as-of date;
- zero or more typed primitive overrides;
- zero or one specialized module: home, vehicle, windfall, or none;
- optional Your Plan allocation overrides;
- local lifecycle metadata only.

ScenarioRunResult
- baseline fingerprint and policy basis used for the run;
- status: valid, more_information_needed, invalid, or stale_baseline;
- baseline engine summary;
- scenario engine result when the scenario changes the underlying financial basis;
- specialized evaluation result when applicable;
- Recommendation Refresh comparison when baseline and scenario engine results differ;
- Your Plan evaluation when requested;
- explicit hypothetical assumption provenance;
- warnings and missing data;
- execution/debug metadata that contains no raw sensitive values.

The definition must be a discriminated typed contract. Arbitrary JSON Patch, arbitrary property paths, and untyped object merges are out of scope because they make legal-field protection, validation, provenance, and conflict detection too fragile.

## 5. Typed override classes

The v1 implementation should support bounded override classes rather than mirroring every persistence field.

### Recurring financial overrides

- existing income source: replacement take-home amount, gross amount, active state;
- synthetic/additional income source when the user explicitly supplies both its meaning and amount;
- existing recurring expense: replacement amount/treatment where the existing normalized contract supports it;
- synthetic recurring expense: explicit amount, essential flag, cash-flow treatment;
- existing debt: balance, minimum payment, APR and existing supported debt fields where the user explicitly supplies them;
- goal: target amount, current amount, date, user priority, planned contribution, and already-supported goal facts;
- existing retirement account: scheduled employee contribution and already-supported planning inputs;
- person planned-retirement age;
- insurance exposure values already represented by the normalized snapshot;
- existing planning preferences that are already accepted product inputs and are safe to scenario as assumptions.

### One-time overrides/events

- explicit cash inflow;
- explicit cash use;
- cash-funded debt payoff represented atomically as both cash consumption and debt change;
- goal completion;
- Windfall through the existing Windfall allocator;
- purchase cash uses only through the Home/Vehicle adapter when those modules own the event.

### Protected legal/statutory fields

Scenario Lab must not infer these from adjacent overrides:

- HSA legal-spouse authority;
- HSA month eligibility/coverage;
- HSA last-month/testing-period facts;
- SIMPLE plan-limit category;
- IRA/HSA YTD contributions;
- filing-status eligibility;
- compensation definitions used for legal contribution limits;
- any other statutory fact whose meaning is not identical to the changed cash-flow fact.

A scenario may eventually permit an explicit hypothetical legal-fact assumption only after the responsible policy/regulatory contract authorizes that surface. Until then the baseline value — including null/unknown — remains authoritative for calculation.

In particular, a paycheck change must not silently rewrite IRA compensation, plan-eligible compensation, MAGI, filing status, HSA eligibility, or SIMPLE eligibility.

## 6. Financial-engine reuse contract

### 6.1 Canonical rerun path

For every generic profile-change scenario:

1. load the authoritative current normalized snapshot;
2. convert through one shared, lossless normalized-to-raw adapter;
3. clone;
4. apply only validated typed overrides;
5. preserve unoverridden null/unknown fields exactly;
6. call runMoneyPriorityEngine with the same accepted policy contract and an explicit as-of date;
7. use the returned canonical recommendations, residual needs, and legal-capacity ledger.

The current money-priority-hypothetical module already proves the basic pattern: immutable clone, explicit bounded changes, validation, policy-version lock, and rerun through runMoneyPriorityEngine. Its current change type is narrower than Scenario Lab requires, so future implementation should generalize that adapter rather than fork the engine.

### 6.2 No separate calculation path

Scenario Lab code must not separately compute:

- monthly plan capacity;
- reserve need;
- debt priority;
- goal-versus-retirement competition;
- retirement legal capacity;
- HSA capacity;
- spouse IRA shared capacity;
- Secure/Build/Optimize allocations;
- retirement floor;
- final recommendation order.

Those remain Phase-5 engine responsibilities.

### 6.3 Legal/tax capacity recomputation

A scenario rerun creates a fresh capacity ledger from the scenario snapshot. This is the safe recomputation boundary.

Actual YTD amounts remain actual YTD unless the scenario explicitly changes an already-authorized hypothetical field. Scheduled scenario contributions are planning consumption, not invented historical contributions. Shared/owner/group capacity must be consumed through the same ledger functions as the accepted engine.

Unknown legal inputs remain unknown and can produce more_information_needed. Scenario Lab must never substitute zero, false, a spouse/account inference, or a heuristic eligibility answer merely so a hypothetical can produce a numerical result.

## 7. Recurring versus one-time money contract

Every override/event must declare its temporal class. Recurring and one-time dollars cannot be interchangeable.

Recurring:
- take-home/gross income;
- recurring expenses;
- debt minimums;
- scheduled retirement contributions;
- goal saving pace.

One-time:
- windfall/cash inflow;
- cash purchase/down payment;
- one-time cash use;
- cash-funded payoff;
- related-goal completion when modeled as an event.

A one-time inflow must not become monthly income. A one-time purchase must not reduce cash and then be charged again as a recurring expense. A debt payoff must not both remove principal and independently consume the same cash twice.

Atomic multi-effect scenario operations are required where a real event has linked effects. Home/Vehicle already demonstrate this pattern by coordinating cash, new debt, disappearing/current costs, new expenses, and related-goal completion in one specialized evaluation.

## 8. Exact reconciliation and no-reuse contract

Any Scenario Lab implementation that changes routed money remains subject to the repository Financial Engine Reconciliation Gate.

The scenario architecture must preserve:

- exact aggregate-to-destination equality;
- cent-rounded authoritative amounts;
- one-time cash consumed once;
- existing-cash deployments not reused by a purchase or Windfall;
- related-goal earmarked cash consumed once;
- unrelated earmarked cash unavailable;
- protected reserve unavailable to discretionary purchases;
- debt principal not reused after payoff;
- recurring monthly capacity allocated once;
- one authoritative retirement account/group ledger per scenario run;
- actual YTD, scheduled/current-plan use, Existing Cash, Secure, Build, Windfall, and explicit additional contributions never reusing the same contribution capacity;
- deterministic final-cent handling;
- no epsilon/tolerance waiver or hidden residual clamping.

The accepted tests around Home, Vehicle, Windfall, Your Plan, spousal IRA, HSA, and Phase-5C already provide regression evidence that future Scenario Lab tests should preserve.

## 9. Specialized module integration

### Home

INCLUDE as an adapter over evaluateHomeAffordability.

The existing Home evaluator already:
- models cash-to-close;
- protects reserves and unrelated earmarks;
- handles related-goal cash;
- models mortgage and non-debt housing costs without double counting principal/interest;
- models sale proceeds/timing;
- reruns the canonical engine;
- checks employer match, Secure needs, required goals, and retirement displacement;
- exposes missing-data states and separate financing quality.

Scenario Lab should display the Home result plus the before/after engine comparison. It should not reimplement mortgage or affordability policy.

### Vehicle

INCLUDE as an adapter over evaluateVehicleAffordability.

The existing evaluator already models acquisition cost, trade equity/negative equity, financing, recurring operating-cost changes, protected cash, goal linkage, employer match, required goals, and retirement displacement through authoritative reruns.

### Windfall

INCLUDE as a post-engine one-time adapter over allocateWindfall.

Windfall must begin from the final scenario engine's immutable retirement-capacity ledger. It must not be converted to profile cash before the engine unless a specifically modeled scenario operation requires that behavior.

The existing allocator correctly holds uncertain-tax proceeds for review rather than inventing a tax percentage and leaves unallocated windfall available instead of forcing taxable investing.

### Your Plan

INCLUDE as the optional final allocation layer using evaluateUserPlan.

Your Plan changes recommendation allocations, not household facts. Old allocation IDs must be reconciled against the current scenario result; disappeared allocations are superseded/invalid rather than retargeted by display name.

### Recommendation Refresh

Use Recommendation Refresh in two roles:

1. baseline-versus-scenario explainability: compare the current baseline engine with the scenario engine and expose detected profile, recommendation, allocation, feasibility, and override-status changes;
2. basis semantics: reuse its canonical concept of a financially relevant basis when defining Scenario Lab's baseline fingerprint.

Recommendation Refresh must not be mistaken for permission to mutate the real household profile. Scenario results are hypothetical even when Recommendation Refresh says the hypothetical recommendation materially changed.

## 10. Composition boundary for v1

A v1 scenario may contain multiple simple typed overrides, but at most one specialized one-time/purchase module: Home, Vehicle, or Windfall.

Your Plan may optionally layer after the resulting engine/specialized evaluation because it represents user allocation preference, not another financial event.

The implementation must reject overlapping representations of the same event. Examples:

- a Home scenario may not also add a second manual mortgage for that same purchase;
- a Vehicle scenario may not separately subtract the same down payment as generic cash use;
- a Windfall scenario may not add the same gross proceeds again as generic cash inflow;
- a cash-funded debt payoff must be one atomic operation, not an unrelated cash-use override plus an independently entered payoff that can drift.

This bounded composition rule keeps v1 useful without requiring a general event-sourcing engine.

## 11. Nullable and unknown facts

Scenario Lab inherits the accepted unknown-safe behavior.

Rules:

- baseline null remains null unless that exact field has an allowed explicit scenario override;
- missing gross income remains missing even if take-home changes;
- missing legal capacity remains missing even if the household could afford a contribution;
- absence of a spouse/account/record is not converted to authoritative zero when current policy says inventory completeness is unknown;
- a scenario preset may prefill a user-editable assumption only when that assumption is a product-planning value, not a legal fact;
- more_information_needed is a valid Scenario Lab result and must be displayed as such;
- comparison UI must distinguish "result worsened" from "result became indeterminate because a required fact is unknown."

## 12. Baseline fingerprint and stale-scenario model

### 12.1 Fingerprint basis

Each draft must bind to a versioned financial basis containing:

- canonical normalized MoneyPrioritySnapshot;
- Money Priority policy version;
- planning-assumptions version;
- tax-policy version;
- tax year;
- explicit as-of date;
- Scenario Lab fingerprint-schema version.

Recommendation Refresh already canonicalizes entity ordering, rounds monetary values, excludes display-only text, and separates financial-basis from recommendation fingerprints. Scenario Lab implementation should reuse/extract that canonical basis logic rather than define different "stale" semantics.

For Scenario Lab, use a server-generated versioned SHA-256 digest of the canonical basis, for example scenario-basis-v1:<digest>. This digest is only change detection/provenance; it is not authorization, encryption, or an access token.

### 12.2 Run-time stale check

Every run/rerun should:

1. authenticate and resolve the household server-side;
2. reload the current normalized baseline;
3. regenerate the current basis fingerprint;
4. compare it to the draft's baselineFingerprint before applying overrides.

If they differ, return stale_baseline and do not silently run the old draft against the new profile.

### 12.3 Explicit rebase

The user may explicitly rebase an ephemeral draft onto the current profile.

Rebase rules:
- preserve the user's typed override intent;
- validate every stable referenced entity ID;
- never retarget by display name;
- references to deleted/replaced entities become unresolved and require user action;
- refresh the baseline fingerprint/policy basis;
- rerun only after the rebase succeeds.

A policy-version/tax-year change is baseline staleness even if household monetary facts are unchanged.

## 13. Scenario lifecycle

### Create

Capture a fresh server baseline fingerprint, policy basis, and an empty or category-template draft. No scenario row is persisted.

### Edit

Edit the local draft only. Editing never writes to household profile tables.

### Rerun

Explicit action. The server stale-checks the baseline, validates overrides, runs the canonical engine/module, and returns a new immutable result.

Do not rerun expensive financial logic on every keystroke.

### Reset

Return the draft to its category template and current captured baseline. Reset does not touch the household profile.

### Duplicate

Create a new local draft with a new local scenario identity, copied typed overrides, and the same baseline fingerprint. The duplicate remains independently editable.

### Compare

v1 should support baseline plus up to two scenario drafts in one comparison view. Scenario-to-scenario comparison is allowed only when both share the same current baseline fingerprint and policy basis.

If either draft is stale, rebase or discard it before direct comparison.

### Discard

Remove the local draft and result from memory. No server delete is needed in v1 because no scenario persistence exists.

### Commit/apply

Out of scope for v1. Scenario Lab must not expose an "apply to profile" operation that writes hypothetical assumptions into authoritative household facts.

## 14. Persistence decision

### v1: EPHEMERAL

R&D's product/technical recommendation is ephemeral v1.

Why:
- all requested core value can be delivered by deterministic reruns over the current baseline;
- the household profile remains the only authoritative persisted financial state;
- no RLS/schema/version/delete complexity is needed before product usefulness is proven;
- there is no risk of saved hypothetical legal assumptions being mistaken for real legal facts;
- Scenario Lab can be implemented and audited without live migration work;
- create/edit/reset/duplicate/compare/discard all work within one authenticated session.

v1 persistence semantics:
- scenario drafts/results live in client memory for the Scenario Lab page session;
- do not use localStorage as a hidden financial-data store;
- refresh/navigation may discard unsaved drafts, with a clear user warning when a dirty draft would be lost;
- no cross-device sharing, saved links, collaboration, or history in v1.

### Future persisted option

If Manager later authorizes persistence after v1 usage evidence, persist the scenario definition/provenance, not a second authoritative household profile.

A future data contract would likely need:
- scenario id;
- household id;
- creator;
- title;
- definition version;
- baseline fingerprint;
- captured policy/planning/tax versions and as-of date;
- typed override payload/version;
- optional non-authoritative cached comparison result with source fingerprint;
- created/updated timestamps.

RLS must reuse household read/write authority. Hypothetical legal fields must remain tagged assumptions. Cache/result rows must be invalidated by basis/version mismatch. Deleting a scenario must not delete or rewrite household financial records.

No such schema is required or authorized by FFH-039.

## 15. INCLUDE / DEFER / REQUIRES POLICY matrix

| Scenario category | v1 classification | Existing support / evidence | Missing data or key risk | Receiving role |
|---|---|---|---|---|
| Income/paycheck change | INCLUDE | Income source take-home/gross/active fields feed normalized cash flow; Recommendation Refresh recognizes income changes | Must not infer MAGI, IRA compensation, plan compensation, filing status, employer match rules, or legal eligibility from pay alone | Core Financial Engine + App/Data |
| Recurring expense change | INCLUDE | Snapshot expenses already distinguish essential and required/discretionary treatment; hypothetical engine already accepts signed synthetic expense adjustments | Editing/removing must use typed replacement semantics so negative deltas cannot become persisted facts | Core Financial Engine + App/Data |
| One-time cash / windfall | INCLUDE | runHypotheticalMoneyPriorityEngine supports cash inflow/use; allocateWindfall is accepted post-engine allocator with tax-review hold and legal-ledger consumption | Do not count same proceeds both as baseline cash and windfall; uncertain tax remains held, not estimated | Core Financial Engine + App/Data |
| Debt balance/payment/payoff | INCLUDE | Debt fields and debt policy are already engine inputs; hypothetical helper supports added debt; Home/Vehicle prove debt reruns | Cash-funded payoff must atomically consume cash and change debt; preserve student-loan special strategy fields | Core Financial Engine + App/Data |
| Savings/goal amount/date/priority | INCLUDE | Goal target/current/date/priority and Goal Intelligence feed accepted Build competition | User priority cannot alter necessity, legal facts, economic tier, or other protected policy semantics | Core Financial Engine + App/Data |
| Retirement contribution | INCLUDE | Retirement account scheduled contributions, legal-capacity ledger, retirement floor, projection and Your Plan are accepted | Keep actual YTD separate; if legal room is unknown, show conflict/more_information_needed rather than clamping | Core Financial Engine + App/Data |
| Home purchase / affordability | INCLUDE | evaluateHomeAffordability already composes cash, financing, recurring housing cost, sale proceeds, goals and canonical engine reruns | Scenario Lab must delegate to existing evaluator and prevent duplicate manual mortgage/down-payment events | App/Data + Core Financial Engine |
| Vehicle purchase / affordability | INCLUDE | evaluateVehicleAffordability already composes acquisition cash, trade equity, financing, operating costs and engine reruns | Prevent duplicate down payment/debt representation; missing material ownership costs stay missing | App/Data + Core Financial Engine |
| Job loss | INCLUDE | Income active/amount overrides plus existing knownIncomeDisruption/end-date emergency-reserve semantics; Recommendation Refresh treats loss of income as critical | No severance, unemployment benefit, new tax treatment, or recovery date may be invented | Core Financial Engine + App/Data |
| Parental leave / temporary income reduction | INCLUDE | Same deterministic income-reduction + known-disruption-duration primitives as job-loss stress | No employer/state leave benefit or statutory entitlement may be inferred; user supplies expected income and end date | Core Financial Engine + App/Data |
| New child/dependent | DEFER | Snapshot already has person relationship/isDependent and existing reserve risk reacts to dependents | A useful dedicated event crosses childcare, insurance, goals, tax/dependent status and household/legal assumptions; v1 can model explicit costs separately without a child-event preset | Product R&D later; Goals/Cash Flow Policy and Regulatory if automatic consequences are desired |
| Childcare | INCLUDE | Straight recurring expense change using existing cash-flow treatment | Do not infer dependent-care tax credits/accounts or market cost; amount is user-supplied | Core Financial Engine + App/Data |
| Insurance changes | INCLUDE | Insurance exposures already drive deductible reserve; recurring premium can be an expense override | No coverage-adequacy advice; only user-supplied premium/deductible/OOP exposure changes | Core Financial Engine + App/Data |
| Tax filing/status changes | REQUIRES POLICY | Filing status, MAGI, spouse-living facts and 2026 tax policy already affect IRA capacity | Scenario Lab must not imply the household may legally choose a status or auto-change interdependent tax/legal facts | Regulatory Research -> Retirement & Tax-Advantaged Policy |
| Relocation | DEFER | Many effects can already be entered manually as income/expense/home overrides | Dedicated relocation needs explicit treatment of moving costs, housing overlap, state/local tax, insurance and cost-of-living assumptions; auto-estimation would broaden scope | Product R&D later; Goals/Cash Flow Policy / Regulatory as needed |
| Large medical expense | INCLUDE | Generic one-time cash use, recurring expense and insurance exposure fields can model cash impact deterministically | v1 must not infer HSA-qualified status, tax-free reimbursement, insurance coverage, negotiated cost, or deduction treatment | Core/App/Data for cash-only scenario; Retirement/Regulatory required before HSA/tax-aware medical behavior |
| Refinancing | DEFER | Existing debt fields can represent a manually changed payment/APR | Dedicated refi needs old-vs-new loan replacement, fees, term reset, break-even and refinance decision semantics; not present as one accepted adapter | Debt & Liquidity Policy + Product R&D/Core later |
| Investment-return assumptions | REQUIRES POLICY | Retirement projection currently uses canonical 4% real-return planning assumption version 2026.1 | User-selectable returns would change accepted projection semantics and could alter retirement-floor outputs | Retirement & Tax-Advantaged Policy |
| Retirement-age changes | INCLUDE | plannedRetirementAge is normalized and directly feeds the accepted retirement projection horizon | Birth date remains baseline fact; changing age cannot bypass contribution-room or missing-data rules | Core Financial Engine + App/Data |
| Monte Carlo / probabilistic simulation | REQUIRES POLICY | No accepted probabilistic engine exists; current engine is deterministic | Needs return distributions, inflation/sequence assumptions, success definition, confidence presentation and policy interpretation; implementation explicitly out of FFH-039 | Retirement & Tax-Advantaged Policy first; Product R&D only after policy for future feasibility |

Classification is about the dedicated Scenario Lab category, not whether a user can approximate part of a deferred category with generic included overrides.

## 16. Unresolved policy questions isolated by FFH-039

The following are intentionally unanswered.

### P6-POL-01 — Hypothetical tax filing status

Questions:
- Under what conditions may Scenario Lab expose filing-status alternatives?
- Which spouse-living/MAGI/household facts must move together?
- When is a hypothetical legally impossible versus merely incomplete?
- How should IRA/HSA/shared-capacity outputs be labeled when tax status is hypothetical?

Receiving sequence: Regulatory & Financial Research Analyst first for current-rule boundaries, then Retirement & Tax-Advantaged Policy Analyst for product behavior.

### P6-POL-02 — User-selectable investment return assumptions

Current retirement projection uses the accepted 2026.1 planning assumptions, including 4% real return and a 4% planning withdrawal rate.

Questions:
- whether v1+ may expose return assumptions at all;
- permitted range/scenario presets;
- whether the protected retirement floor may change with user assumptions;
- how to prevent optimistic assumptions from being presented as policy-equivalent to the canonical recommendation.

Receiving role: Retirement & Tax-Advantaged Policy Analyst.

### P6-POL-03 — Probabilistic / Monte Carlo semantics

Before any Monte Carlo implementation:
- define success/failure metric;
- accepted return/inflation/sequence models;
- number/reproducibility of trials;
- interpretation of probability bands;
- how probabilistic results interact with deterministic Money Priority recommendations;
- what constitutes actionable versus educational output.

Receiving role: Retirement & Tax-Advantaged Policy Analyst. Product R&D can later evaluate implementation feasibility only after policy is defined.

### P6-POL-04 — Tax/HSA-aware large medical event

The cash-only medical scenario can be included without new policy. A tax/HSA-aware medical category cannot.

Questions include qualified-expense authority, reimbursement timing, insurance/OOP coordination, and whether Scenario Lab should recommend HSA use versus preserving invested HSA assets.

Receiving sequence: Regulatory Research where current law is needed, then Retirement & Tax-Advantaged Policy Analyst.

### P6-POL-05 — Dedicated refinancing recommendation

A future refinance module needs the Debt & Liquidity Policy Analyst to define what the product may call favorable/neutral/caution beyond raw break-even math, including liquidity costs and term-reset tradeoffs.

This is not required for v1 because refinancing is deferred.

## 17. Recommendation Refresh and comparison model

The primary comparison should be semantic, not a raw object diff.

### Layer A — Assumptions changed

List each explicit scenario override:
- source entity and stable ID;
- field;
- baseline value;
- hypothetical value;
- temporal class;
- user-entered versus derived.

### Layer B — Financial basis changed

Reuse Recommendation Refresh categories:
- household;
- income;
- expense;
- debt;
- cash;
- goal;
- retirement;
- tax profile;
- risk;
- policy/assumptions/time.

### Layer C — Plan changed

Show:
- feasibility before/after;
- recommendations added/removed/changed;
- allocation before/after/delta;
- retirement-floor state;
- legal-capacity warnings;
- goal-ranking consequences;
- specialized Home/Vehicle/Windfall result differences.

### Layer D — Why

Surface reasons already produced by the engine/evaluator:
- recommendation whyNow/tradeoffs;
- missingData;
- warnings;
- Home/Vehicle risks;
- Windfall reservations/held-for-tax-review;
- Your Plan impacts.

Do not manufacture narrative causal claims that are not represented by the engine or explicit scenario inputs.

## 18. Page, component and server/client architecture

A bounded v1 implementation can fit the existing Next.js server/client pattern.

### Route

app/scenario-lab/page.tsx
- server component;
- authenticate;
- resolve the current household server-side;
- load normalized snapshot with the existing loader;
- run baseline engine with explicit as-of date;
- create baseline fingerprint/policy basis;
- send only the baseline view/model needed by the client.

### Server action

app/scenario-lab/actions.ts
- derive household identity from authenticated server context; do not trust a client-supplied household authority claim;
- reload current normalized baseline on every explicit Run;
- stale-check the draft fingerprint;
- validate typed ScenarioDefinition;
- call the pure scenario runner;
- return a ScenarioRunDTO.

A REST/API route is not required for v1 unless future clients need it.

### Pure domain modules

Suggested technical boundaries, not production authorization:
- lib/scenarios/scenario-contract.ts
- lib/scenarios/scenario-overlay.ts
- lib/scenarios/scenario-baseline.ts
- lib/scenarios/scenario-runner.ts
- lib/scenarios/scenario-compare.ts

The normalized-to-raw adapter currently embedded in money-priority-hypothetical should have one authoritative reusable home rather than be copied into Scenario Lab.

### Client components

A practical component split:
- ScenarioLabWorkspace
- ScenarioList / ComparePicker
- ScenarioBuilder
- primitive override editors
- HomeScenarioEditor
- VehicleScenarioEditor
- WindfallScenarioEditor
- YourPlanEditor
- ScenarioResult
- ScenarioComparison
- ScenarioExplainability
- StaleBaselineNotice

Client state contains draft definitions and returned display DTOs, not authority to mutate persistence.

## 19. Accessibility and mobile architecture constraints

Scenario Lab's comparison model should be layout-independent so desktop tables can collapse into accessible mobile cards.

Requirements that affect architecture:
- every increase/decrease has text and amount, not color alone;
- no drag-only scenario ordering or allocation editing;
- all fields have explicit labels, units, baseline value and hypothetical state;
- stale/missing/invalid states are announced semantically;
- keyboard operation for create/duplicate/compare/discard;
- focus returns to the scenario result/status after rerun;
- comparison supports a compact baseline + two-scenario view on mobile instead of a horizontally unbounded matrix.

## 20. Performance contract

Scenario Lab v1 does not need a new cache or database.

The existing loader performs parallel household queries. Each explicit scenario run should reload once to prove baseline freshness, then perform all override/engine/module work in memory.

Guidelines:
- run on explicit user action, not every keystroke;
- compute baseline engine once per request;
- apply multiple primitive overrides in one clone/rerun;
- do not issue Supabase queries per override;
- cap direct comparison at baseline + two scenarios for v1;
- return a purpose-built DTO rather than serializing unrelated server/internal state when the UI does not need it;
- keep calculation functions deterministic and side-effect free.

Performance acceptance should measure server scenario-run duration and payload size, but optimization must not create a second cached financial truth.

## 21. Observability contract

Scenario execution should be diagnosable without logging household financial content.

Per run record structured non-sensitive metadata such as:
- scenario-run correlation id;
- scenario definition version;
- category/specialized adapter;
- baseline fingerprint prefix or digest;
- policy/planning/tax versions;
- as-of date;
- stale/valid/more-information/invalid result class;
- count of overrides;
- count of warnings/missing-data items;
- elapsed calculation time;
- stable error code.

Do not log raw income, account balances, tax values, medical details, scenario titles/notes, or full snapshots merely for debugging.

## 22. Test strategy

### Contract/unit tests

ScenarioDefinition:
- rejects unknown override type;
- rejects duplicate/conflicting override targets;
- rejects nonfinite/malformed money;
- preserves null explicitly;
- does not permit protected legal fields in generic overrides;
- distinguishes recurring and one-time operations.

Overlay:
- no-op exactly reproduces baseline engine;
- source snapshot/result remain deeply immutable;
- entity references use stable IDs;
- deleted/missing entities fail clearly;
- multiple overrides are deterministic independent of input order where semantics are independent.

### Financial invariants

- baseline-versus-no-op exact equality;
- monthly capacity conservation;
- one-time cash conservation;
- exact aggregate-to-destination reconciliation;
- legal-capacity ledger invariant;
- spousal IRA shared-capacity no reuse;
- HSA family/shared/catch-up no reuse;
- SIMPLE and workplace capacity preservation;
- Existing Cash -> Secure -> Build -> later consumer staging preserved;
- final-cent deterministic cases;
- no hidden residual clamping.

### Category tests

For every INCLUDE category:
- normal scenario;
- missing-data scenario;
- invalid input;
- boundary/zero/cent case;
- scenario that materially worsens plan;
- scenario that improves plan;
- stale baseline;
- deterministic rerun;
- immutable baseline.

Job loss / temporary reduction:
- loss of all income can become critical;
- known disruption with missing end date becomes more_information_needed for exceptional reserve;
- end-date duration/recovery buffer comes from existing policy;
- no unemployment/severance amount invented.

### Specialized adapters

Preserve the accepted Home/Vehicle/Windfall/Your Plan regression suites and add Scenario Lab adapter tests proving:
- no duplicate cash/debt/expense representation;
- module outputs are unchanged for equivalent inputs;
- adapter cannot mutate baseline;
- module and comparison output agree on the same engine result.

### Stale/fingerprint tests

- display-only rename does not create financial staleness if canonical Refresh semantics exclude it;
- entity ordering does not create false staleness;
- cent-equivalent normalized values do not create false staleness;
- financially relevant field change does;
- policy/planning/tax/as-of version change does;
- stale run never silently executes;
- rebase never retargets a deleted entity by name.

### Server/security tests

- unauthenticated request rejected;
- household derived from authenticated membership;
- caller cannot scenario another household by supplying an ID;
- no persistence mutation occurs during run;
- no scenario operation writes profile tables;
- server action returns structured validation errors.

### Audit expectation for future implementation

Scenario Lab directly presents financial before/after consequences and can exercise legal-capacity routing. Any production implementation should therefore be frozen at an exact integration target and independently checked for technical/mathematical correctness and financial-policy/scenario preservation under the Manager's existing gates.

## 23. Bounded follow-on implementation/dependency graph

This is a product/technical decomposition for Manager consideration. It does not activate work or assign FFH task IDs.

### Node A — Core Financial Engine Engineer: Scenario overlay + runner foundation

Dependency: Manager acceptance of FFH-039.

Bounded scope:
- typed ScenarioDefinition/override contract;
- authoritative normalized-to-raw reuse;
- immutable overlay application;
- server-agnostic scenario runner;
- baseline/scenario comparison inputs;
- exact reconciliation and no-reuse tests;
- generic INCLUDE categories that only require existing policy;
- no UI, persistence, migration, or new policy.

Output should preserve the current engine and specialized evaluator outputs exactly.

### Node B — Application, Data & Integration Engineer: authenticated ephemeral Scenario Lab surface

Dependencies: Node A stable contract; Manager authorization.

Bounded scope:
- /scenario-lab server route;
- authenticated baseline load;
- server action;
- in-memory create/edit/rerun/reset/duplicate/compare/discard UI;
- baseline fingerprint/stale handling;
- accessible/mobile comparison and explainability surfaces;
- no Supabase migration or scenario persistence;
- no "apply to profile."

### Node C — Core/App-Data integration: specialized adapters

Can be split by Manager if overlap risk warrants it.

Bounded scope:
- Home adapter;
- Vehicle adapter;
- Windfall adapter;
- Your Plan layer;
- Recommendation Refresh comparison;
- conflict detector preventing duplicate event representation;
- adapter regression tests showing equivalence with existing accepted modules.

### Node D — Technical & Mathematical Auditor

Dependency: stable integrated implementation target.

Audit:
- no second engine;
- immutable baseline;
- typed override validation;
- exact reconciliation;
- cash/legal-capacity no reuse;
- deterministic ordering/rounding;
- stale/fingerprint behavior;
- specialized adapter equivalence;
- server trust boundary.

### Node E — Financial Policy & Scenario Auditor

Dependency: same frozen target as applicable.

Audit:
- all INCLUDE categories preserve accepted Phase-5 semantics;
- hypothetical assumptions are visibly hypothetical;
- unknown facts remain unknown;
- no implied legal/tax authority;
- no hidden policy expansion;
- before/after explanations match actual financial consequences.

### Separate future policy lanes — not v1 blockers

Only if Manager chooses to pursue the REQUIRES POLICY categories:
- Regulatory Research + Retirement Policy for filing-status scenarios;
- Retirement Policy for user-selectable return assumptions;
- Retirement Policy, then later Product R&D, for Monte Carlo;
- Regulatory/Retirement Policy for tax/HSA-aware medical modeling;
- Debt & Liquidity Policy before a recommendation-bearing refinance module.

DEFER categories do not block v1.

## 24. Explicit non-goals preserved

FFH-039 did not authorize and this contract does not require:
- production code;
- UI code;
- Supabase schema/migrations;
- live-data changes;
- new financial policy;
- new statutory interpretation;
- Monte Carlo implementation;
- AI/LLM financial advice;
- FFH-038 work;
- Phase 7 work;
- workflow/control-plane redesign.

## 25. R&D conclusion

The accepted Phase-5 architecture is already sufficient to support a useful deterministic Scenario Lab v1 without forking financial logic or adding persistence.

The key technical move is not new financial mathematics. It is a safe composition layer that:

- freezes an authoritative baseline;
- applies explicit typed hypothetical assumptions to an immutable clone;
- reruns the accepted engine;
- delegates special cases to already-accepted evaluators;
- fingerprints the baseline;
- refuses silent stale execution;
- explains before/after results through existing recommendation/diff semantics;
- keeps legal facts, one-time cash, recurring capacity, and user allocation preferences in distinct layers.

Manager remains responsible for accepting/rejecting this contract and deciding which follow-on tasks, owners, sequence, and audit gates to authorize.
