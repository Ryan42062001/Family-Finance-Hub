# Phase 5 — Money Priority Engine V2

## Objective
Answer the household question: **What should I do with my money next?**

Phase 5 turns the household's saved financial profile into an explainable, deterministic plan for both existing deployable cash and future monthly cash flow. The engine uses four operating states: **Stabilize**, **Secure**, **Build**, and **Optimize**.

The engine must never automatically move money or modify live household records.

## Product principles
- Recommendations must be explainable in plain language.
- Same normalized household state + same policy version + same tax year + same preferences + same explicit as-of date = same recommendation.
- AI may explain recommendations later but may never determine ranking or allocation.
- Solvency, required obligations, insurance exposure, liquidity, and employer benefits outrank wealth optimization.
- Do not require every tax-advantaged account to be maxed before funding legitimate life goals.
- Treat retirement as a trajectory, not a binary maxed/not-maxed state.
- Known future expenses should become sinking funds instead of future emergencies.
- Preserve a distinction between **Recommended Plan** and **Your Plan** when users override recommendations.
- Missing data blocks only decisions that depend on it.
- Current tax-law limits and planning assumptions live in versioned policy rather than scattered magic numbers.

## Authoritative calculation flow

```text
normalized household snapshot
→ provisional Secure / Build / Optimize
→ existing-cash deployment
→ residual-needs snapshot
→ authoritative Secure
→ Build
→ feasibility
→ Optimize
→ normalized recommendations
```

Existing cash and recurring cash flow are separate funding resources. One-time cash deployment cannot silently become recurring capacity. Residual needs prevent the same requirement from being funded twice.

## Required outflow and committed expenses

```text
monthlyRequiredOutflow
=
monthlyEssentialExpenses
+ monthlyCommittedNonEssentialExpenses
+ monthlyMinimumDebtPayments
```

Essential expenses participate in both required cash flow and the ordinary emergency-reserve base. Nonessential expenses explicitly marked required participate in required cash flow but do not inflate the full emergency-reserve base. Discretionary expenses participate in neither. Goal and retirement contributions are not reclassified as committed expenses.

## Secure
Secure handles immediate deductible exposure, employer-match protection, high-priority debt, dedicated student-loan policy, and the authoritative emergency reserve. The deductible reserve and emergency reserve share the same protected cash pool where appropriate so dollars are not double-counted.

Ordinary emergency targets are 3–6 months according to household liquidity risk. A known, dated income disruption can create a temporary exceptional reserve above six months under the versioned exceptional-reserve policy. Household preference may raise the effective target, but cannot reduce a concrete exceptional target below the policy requirement.

Student loans use ordinary debt policy only when no material repayment-plan, forgiveness, tax, or employer-benefit consideration changes the acceleration decision. Special-strategy student loans remain separately inspectable and are not silently treated like ordinary consumer debt.

## Build
Build uses an explicit two-pass allocation order:

```text
protected required/protective goals
→ remaining required/protective goal pace
→ additional retirement
→ important goals
→ optional/lifestyle goals
```

Goal ranking is lexicographic: economic class, deadline type, consequence, months remaining, user priority, then stable ID. A lower-order preference cannot overpower a higher-order protective factor.

Retirement separates three concepts:

```text
legal contribution capacity
≠ tax eligibility / treatment
≠ engine-recommended contribution amount
```

Employer match remains exclusively a Secure concern. Additional retirement routing respects account ownership, annual capacity, shared statutory limits, tax eligibility, and supported account mechanics. Missing legal or tax facts produce targeted information-needed states rather than fabricated capacity.

For 401(k), 403(b), and TSP opportunities, the 2026 employee-deferral ceiling is coordinated by participant and then constrained by the account's defined-contribution annual-additions ceiling: the lesser of the versioned $72,000 limit or persisted `plan_eligible_compensation_annual` for that specific plan/sponsoring employer. Person-wide `estimatedTaxableCompensationAnnual` is never substituted for this plan-specific fact. Known account employee and employer YTD additions count toward that account ceiling. Eligible age-based catch-up amounts are kept outside ordinary annual additions while remaining subject to applicable deferral and compensation rules. Multiple workplace accounts return `more_information_needed` when employer/plan identity is insufficient to determine separate-plan treatment. Missing plan-specific compensation or employer YTD additions likewise blocks a definitive legal-capacity state.

The special 403(b) 15-years-of-service catch-up is intentionally not granted. The snapshot does not contain plan permission, qualifying service, lifetime special-catch-up usage, or prior deferral history needed for its ordered calculation; ordinary age-based catch-up remains supported. The governmental 457(b) ordinary limit remains separate from the 401(k)/403(b)/TSP deferral group, but the special last-three-years catch-up is not granted because plan normal-retirement-age and unused prior-year deferral records are not modeled. These are explicit Phase 5 boundaries, not assumed zero-risk eligibility.

## Optimize
Optimize receives only capacity remaining after Secure and Build. It handles genuine low-interest-debt/investing tradeoffs and later wealth-building choices. User preferences may influence gray zones but cannot rewrite hard guardrails.

## Existing Cash and Windfall Mode
Existing cash is reconciled before recurring allocation. Protected, earmarked, debt-backed, and operating cash remain distinct from truly unallocated cash. A minimum unallocated liquidity floor applies only after required/high Secure balance needs are covered.

Windfall Mode is a separate deterministic one-time allocator that consumes the authoritative post-existing-cash engine result. It reserves explicit tax/other liabilities and restrictions first, then follows the established hierarchy. For retirement, Windfall clones the **final** authoritative capacity ledger after existing cash, Secure, and Build; it consumes only remaining verified account, owner, HSA-owner, and shared-group room as the `windfall` consumer. It never reconstructs legal room from original opportunities and never uses the household-level retirement-need scalar as a substitute for account/group capacity. The scalar remains relevant only to avoid claiming the same descriptive planning need twice. Windfall does not mutate the engine or its ledger, invent tax rates, convert a windfall into recurring income, or assume that a recommended windfall allocation was actually executed. Actual balance/debt/goal/account changes are what later alter the household snapshot.

## Recommended Plan versus Your Plan
The authoritative engine produces the Recommended Plan. User overrides produce a separate Your Plan and may change modeled outcomes, but never rewrite the authoritative recommendation. An override is a **replacement amount** for its stable account-specific allocation, not an amount added on top of the Recommended Plan. Legal-capacity analysis rebuilds the same derived ledger from original verified room, preserves fixed one-time use, then routes the Your Plan Secure employer-match and Build retirement amounts in priority order through account and supported shared-group capacity. Optional additional current-year contributions, including a Windfall result when the caller evaluates both plans together, are checked through the same ledger. The entered override remains visible even when it exceeds room, but the excess produces a high-severity conflict; unknown account/capacity facts produce a conservative information-needed warning rather than a false zero conflict. Overrides use stable allocation IDs and explicit active/superseded/invalid reconciliation. A stale allocation is never silently retargeted to a different recommendation.

## Home and Vehicle authoritative reruns
Home and Vehicle affordability use the shared hypothetical Money Priority Engine rerun path. The hypothetical post-purchase household is evaluated by the same authoritative Secure → Build → feasibility → Optimize flow rather than by a second competing priority hierarchy.

Home affordability models cash-to-close boundaries, mortgage debt, non-debt housing costs, disappearing current housing cost, related-goal completion, sale-proceeds timing, and contractual ARM stress through deterministic hypothetical inputs. Mortgage principal-and-interest is represented once as a debt minimum and is not duplicated as a housing expense.

Vehicle affordability similarly reruns the authoritative engine after modeled purchase cash usage, financing, operating-cost changes, and related-goal completion. Both calculators preserve protected/earmarked/debt-backed cash boundaries and expose employer-match, Secure, required-goal, retirement, and plan-margin effects from the recalculated engine result.

## Material Profile Change / Recommendation Refresh V1
Recommendations are valid for the financial basis that produced them. `assessRecommendationRefresh(previous, current, previousOverrides)` is a pure deterministic comparison layer over two authoritative engine results.

The refresh layer distinguishes:

```ts
type RecommendationRefreshState =
  | "current"
  | "refresh_recommended"
  | "materially_changed"
  | "critical_change";
```

- `current`: financially relevant basis and authoritative recommendation remain current.
- `refresh_recommended`: a relevant financial basis, policy, assumption, tax-year, or explicit-time input changed, but the authoritative recommendation remains substantially equivalent.
- `materially_changed`: the recalculated authoritative recommendation meaningfully changes order, state, urgency, allocation, destination, or feasibility.
- `critical_change`: a narrow high-impact transition means the old recommendation may now be unsafe or actively inappropriate, such as a new funding gap, loss of all modeled income, activation of a known income disruption, loss of employer-match capture, or a newly required/high Secure action.

A data change is not automatically a material recommendation change. The layer first detects financially relevant basis changes, then compares already-authoritative recalculated outputs. A small financially relevant balance change can therefore produce `refresh_recommended` when the actual recommended action remains equivalent.

### Financial-basis fingerprint
The financial-basis fingerprint includes the normalized financial snapshot plus the ordinary Money Priority policy version, planning-assumptions version, tax-policy version, tax year, and explicit `asOfDate`. It is deterministic change-detection metadata, not an authentication, encryption, authorization, or security primitive.

Canonicalization sorts stable-ID entity collections explicitly by stable ID. Monetary fields use repository cent-rounding conventions; non-money numeric fields such as APRs, ratios, months, and ages are not indiscriminately rounded to cents. Null/undefined behavior is normalized by canonical serialization. Display names, notes, titles, explanation prose, rationales, timestamps, and similar presentation metadata do not create false financial staleness.

Scoped Windfall policy is not included in the ordinary recommendation basis merely because Windfall Mode exists.

### Recommendation fingerprint and diffs
A separate recommendation fingerprint uses stable authoritative recommendation identity, meaningful rank, stage, state, urgency, cent-rounded allocations, and meaningful feasibility state rather than explanation prose. Feasible-plan numeric capacity alone does not make an otherwise equivalent recommendation materially changed. A funding-gap state and funding-gap amount remain part of meaningful feasibility comparison.

The assessment exposes combined and separated added/removed/changed recommendation diffs, allocation diffs, previous/current policy basis, and feasibility state transition so callers can explain what changed without reconstructing engine policy.

### Time and policy changes
Time is always explicit. Refresh logic never calls `Date.now()` or reads a wall clock. A changed `asOfDate` can matter because goal deadlines, promotional debt, disruption duration, retirement horizon, age boundaries, and tax year can change even when stored household values do not.

A harmless time-basis change with equivalent recommendations is refresh-worthy, not automatically material. Relevant Money Priority, tax-policy, tax-year, and planning-assumption version changes likewise make the prior basis stale even when the household profile itself is unchanged. If the authoritative recommendation also changes, severity escalates accordingly.

### Override reconciliation
Refresh never mutates the previous or current engine result. Previous Your Plan overrides are reconciled only after the new authoritative Recommended Plan exists and through the existing override machinery. Missing, invalid, or superseded allocation IDs remain explicit; they are never silently redirected or used to rewrite the new Recommended Plan.

### V1 boundaries
Recommendation Refresh V1 is calculation-only. It does not add event history, persistence, notifications, background jobs, scheduled polling, automatic refresh, UI redesign, bank sync, Scenario Lab, automatic transfers/payments/trades/contributions, or runtime web calls.

## Determinism, privacy, and security
All Phase 5 calculation modules operate on supplied normalized household objects. They do not query another household, use a service-role client, call external services, or mutate live financial records. Recommendation fingerprints are never authorization tokens. The engine remains deterministic and inspectable, and no recommendation causes automatic money movement.

Persisted financial tables remain household-scoped and protected by role-aware row-level security. Owners and members may write financial rows; viewers are read-only; household metadata changes are owner-only; and `created_by` is immutable. Phase 5 calculation modules do not bypass those controls.

The raw snapshot boundary validates stable IDs, entity references, decision-driving enums, decision dates, and financial numeric domains before authoritative calculation. Fatal validation failures expose structured paths/codes without logging financial data. Calendar-invalid dates are diagnosed in snapshot warnings and continue only through conservative information-needed logic.

### Shared retirement legal-capacity ledger

The engine evaluates retirement opportunities once and creates one mutable *derived* ledger for the authoritative run. The normalized financial snapshot remains immutable. Ledger entries retain account ID/type, owner, verified or information-needed state, account room, supported shared statutory groups, elective-deferral room, annual-additions room, compensation room, and separately tracked catch-up room.

Verified room is consumed in one fixed order:

1. eligible one-time existing-cash contribution to a concrete legal destination;
2. Secure employer-match employee payroll contribution;
3. Build account routing.

Every consumption is limited by both the account entry and each supported shared group. The engine asserts that `one-time + Secure + Build <= original verified capacity` for every account and shared group. Windfall extends the same invariant on a clone of the final ledger: `one-time + Secure + Build + Windfall <= original verified capacity`. Multiple IRAs share the supported owner limit. For married spouses with family HSA coverage, ordinary capacity is one couple-wide bucket calculated as the family base limit minus aggregate couple-wide YTD contributions; it is not the sum of individually clamped half-limit residuals. The engine resolves married-spouse HSA eligibility and coverage as household legal-structure facts before exposing either spouse's actionable room. If an unresolved spouse fact could change whether family sharing applies, every affected spouse HSA is `more_information_needed`; the known spouse cannot escape through an optimistic self-only calculation. Explicit ineligibility remains distinct from unknown, and two known self-only coverages remain independently modeled. Each age-55 catch-up remains a separate owner-only bucket routable only to that owner's HSA. Because persisted YTD totals do not distinguish ordinary contributions from catch-up contributions, positive YTD for a catch-up-eligible spouse makes that attribution information-needed rather than restoring speculative room. Multiple HSA accounts cannot multiply either bucket. Supported workplace deferral groups retain their existing coordination. Sponsor grouping is never fabricated when sponsor identity is unavailable. Unknown capacity produces `more_information_needed` and no confident actionable contribution.

HSA eligibility and coverage are currently persisted on, and derived from, recorded HSA retirement-account records. Household HSA structure resolution therefore operates on the HSA participants and accounts represented in the authoritative financial snapshot. A spouse or other person with no recorded HSA account does not independently contribute person-level HSA eligibility or coverage facts to the resolver. That absence is not affirmative evidence of HSA ineligibility, and the engine does not invent eligibility or coverage for an unrepresented person. Accurate authoritative HSA calculations depend on the snapshot containing every relevant HSA participant, account, employee/employer YTD contribution, eligibility, and coverage fact. Persisting person-level HSA eligibility and coverage independently of retirement accounts remains future scope.

### Phase 5A hybrid retirement floor

Phase 5A adds a derived planning-policy result without changing the authoritative legal-capacity ledger. Legal capacity answers how much may be contributed to verified accounts; the retirement floor answers how much long-term saving should be protected. The floor reconciles reported recurring contribution schedules against the existing account/shared-group capacity model on cloned ledgers. A full-year clone constrains the sustainable pace used by the savings-rate numerator and projection, while a current-year clone reserves the expected remaining scheduled contributions before exposing truly additional opportunity. Unsupported scheduled dollars remain visible but cannot create an optimistic `ON_TRACK` or `AHEAD` result. A projection shortfall cannot create legal room, and this prospective analysis does not consume the ledger used by one-time, Secure, Build, or Windfall allocation.

The normal policy baseline is 15% of complete gross household income. `BEHIND` raises the corrective rate when the projection requires more, while that projection-derived rate is capped at 25% and separately constrained by feasible recurring cash flow so an extreme mathematical rate is preserved as a structural shortfall rather than presented as untouchable. Employer and match protections can make the final protected dollar target exceed a simplistic 25%-of-gross figure. `ON_TRACK` retains the normal baseline. `AHEAD` cautiously uses a 12% baseline only when the projection is on track, retirement is at least 10 years away, and the projected surplus is at least the greater of $50,000 or 20% of the target portfolio. These are deterministic materiality thresholds, not stateful hysteresis. The 5% employee-saving guardrail is a soft behavioral policy for `BEHIND` and `ON_TRACK`; it relaxes for a durably `AHEAD` household, while an available employer match remains protected at its actual required employee contribution even when that exceeds 5%.

The contribution-rate numerator includes only the legally supported sustainable pace of employee workplace contributions, non-HSA employer retirement contributions, IRA contributions, and the long-term portion of HSA contributions. Household `expected_hsa_medical_spending_annual` is subtracted once from total supported HSA contributions with a zero lower bound for the savings-rate component; null means intent is unknown when HSA contributions are positive, counts no HSA contribution toward the protected rate, and prevents an optimistic AHEAD classification. Emergency savings, goals, mortgage principal, general cash, and taxable brokerage contributions do not enter this rate by default. Retirement assets continue to affect projection sufficiency when they are represented by supported retirement accounts.

Feasibility starts with sustainable retirement saving plus genuinely incremental cash flow. Employee IRA contributions are treated as direct take-home uses. The current snapshot does not distinguish payroll from direct employee HSA funding, so employee HSA contributions are conservatively treated as take-home uses and the result exposes that assumption; employer HSA dollars are not subtracted from take-home. Workplace employee contributions remain payroll deductions and are not subtracted a second time from already-net take-home income.

The result exposes gross income, reported and supported scheduled contributions, unsupported/unverified schedule amounts, component contributions, current rate, projection corrective rate, target and feasible protected floors, portfolio/floor shortfalls, match protection, raw verified legal capacity, scheduled current-year reservation, remaining capacity after that reservation, additional opportunity above the floor, uncertainty, reason codes, and explanations. Phase 5A does **not** change goal necessity/deadline/consequence scoring, Build goal competition, temporary exceptions, sinking-fund policy, Windfall ordering, or Your Plan tradeoff policy; those remain later Phase 5B–5E work.

Employer-match behavior remains recurring payroll behavior, so an account whose only modeled opportunity is match capture is not presented as a direct one-time cash deposit. Build no longer recomputes fresh room. A retirement projection may continue to show a funding shortfall, but dollars above verified routable account room remain descriptive and do not appear in authoritative allocations. Ordinary room and catch-up room remain separately recorded instead of being collapsed into an undifferentiated balance.

### Numeric snapshot contract

Validation and normalization use the same strict raw-number parser. It accepts finite JavaScript numbers and trimmed plain decimal strings (for loader compatibility). It rejects empty or whitespace-only strings, booleans, arrays, objects, numeric junk, currency/comma formatting, and nonfinite values. Required values cannot be absent or acquire a synthetic zero; nullable values preserve absence as `null`; explicit zero remains distinct where its semantic domain permits it. Sign, percentage, integer, and bounded-domain checks run only after successful parsing. Signed expense adjustments remain restricted to the explicit hypothetical-evaluation boundary.

### Boolean snapshot contract

Decision-relevant raw booleans use `parseStrictBoolean` and accept only the JavaScript values `true` and `false`. String/number/array/object coercions are rejected with a structured `invalid_boolean` issue before authoritative calculation. Persisted non-null fields with established database/legacy defaults are explicitly classified as `optional_default`; absence uses only that documented default. Planning facts whose absence means unknown are `nullable` and preserve `null`. Validation and normalization share these semantics, so a value such as `is_active = "false"` cannot silently become active income.

### Secure deterministic destination ordering

Every scarce Secure sequence terminates in stable entity ID. Employer-match opportunities currently share the same modeled urgency and are ordered by stable account ID after eligibility and match-state filtering. High-interest debt is ordered by APR descending, then debt ID. Promotional/special debt is ordered by expiration ascending, effective/post-promotion APR descending, then debt ID. Contextual and unknown debt paths use debt ID after their financial classification. Display names and source array position are never financial tie-breakers.

### Goal runtime and persistence parity

Ordinary authoritative snapshots require `targetAmount > 0`. A non-null `coreNeedAmount` must be nonnegative and no greater than `targetAmount`; equality is valid. Existing current-amount and priority semantics are unchanged. Home and Vehicle scenario reruns continue through their explicit hypothetical-input pathway; the ordinary raw contract is not weakened for temporary modeling.

### Phase 5B Goal Intelligence

Phase 5B adds a deterministic, derived `goalIntelligence` result alongside the existing Build goal assessment. It explains what a goal represents and what Phase 5C may later use when deciding goal-versus-retirement competition. Phase 5B does **not** replace the existing Build allocator, protect new goal dollars, reduce retirement contributions, accelerate goals, alter Windfall ordering, or change Your Plan policy.

Goal Intelligence separates the underlying household need from the desired solution. Necessity is recorded as Essential, Important, Optional, or unknown evidence; it is never inferred from category. Preservation/restoration is distinguished from improvement/upgrade. A core-need amount, when explicitly known, remains separate from the full desired target, so an essential transportation need does not automatically make every dollar of a luxury vehicle target essential. No category price cap or invented core amount is used.

Deadline flexibility is Fixed, Limited, Flexible, or unknown and remains distinct from necessity. A fixed date on an optional goal does not make it essential. Calendar-month funding periods produce the required monthly pace from the remaining target; funded goals require $0, and past-due unfunded goals are flagged without dividing by zero. Schedule state (`funded`, `on_track`, `behind`, `past_due`, or `more_information_needed`) remains separate from the intelligence priority band.

Concrete underfunding consequences and their explicit Low/Moderate/High/Critical severity provide explainable evidence. Borrowing likelihood, expected amount, and APR produce a debt-exposure signal, but financing amplifies a legitimate need rather than upgrading discretionary spending into an essential goal. Target reasonableness is limited to explicit core-versus-target evidence: equal is `reasonable`, a larger desired target is `potentially_high`, and missing core evidence is `more_information_needed` rather than an appraisal guess.

Goal priority bands are `high`, `medium`, `low`, `discretionary`, and `unclassified`; `protected` remains reserved for existing Secure and retirement protections. Results use lexicographic evidence and stable goal ID as the final tie-break, not a user-facing magic score. Reason codes and explanations expose necessity, flexibility, consequence, preservation/improvement, schedule, debt exposure, and solution/core distinction.

Existing goal rows predate Goal Intelligence input collection. `goal_intelligence_confirmed = false` prevents their historical database defaults from masquerading as confirmed user evidence; they continue to load and retain existing Build behavior while Goal Intelligence remains conservatively unclassified until reviewed. New inputs use nullable facts and strict enum/numeric validation. Goal metadata participates in Recommendation Refresh, survives Home/Vehicle hypothetical reconstruction, and does not consume cash or raid emergency reserves merely to calculate intelligence.

Phase 5C will consume this derived evidence when actual allocation competition is intentionally introduced.

## Phase 5 closure status
The planned Phase 5 feature set includes the authoritative priority engine, existing-cash reconciliation, committed expenses, student-loan policy, goal ranking/two-pass Build allocation, advanced retirement-account cases, exceptional emergency reserves, Recommended Plan versus Your Plan, Home and Vehicle affordability with authoritative hypothetical reruns, Windfall Mode, and Material Profile Change / Recommendation Refresh V1.

Authoritative retirement recommendations retain both their user-facing cent-rounded monthly pace and the exact annual amount consumed by the ledger. Your Plan replays the exact authoritative annual amount when no override exists; only an explicit monthly override is annualized. This prevents display rounding from creating a synthetic legal-room conflict while preserving real excess warnings.

HSA household-uncertainty remediation complete — pending independent clean audit. Existing Cash, Secure, Build, Windfall, Your Plan, Home/Vehicle hypothetical reruns, and Recommendation Refresh now inherit the household-wide HSA uncertainty decision. Closure still requires independent review of the exact remediation commit. No database migration was required.
