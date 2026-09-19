# FFH-009 — Spousal-IRA Scarce-Compensation Legal-Capacity Policy

Date: 2026-09-08
Role: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE POLICY RECOMMENDATION — READY FOR MANAGER SYNTHESIS
Scope: FFH-005 R6 only. No production code.

## QUESTION

How should Family Finance Hub represent and consume married-filing-jointly IRA contribution capacity when joint compensation is below the sum of both spouses' individual IRA dollar limits, without turning a product routing choice into a false statutory owner priority?

## CURRENT CANONICAL POLICY / REPOSITORY STATE

Classification: ESTABLISHED FFH PROJECT POLICY / VERIFIED REPOSITORY STATE.

1. FFH-005 R6 is a Manager-classified merge blocker. The current MFJ path can sequentially allocate scarce joint compensation by sorted owner ID before exposing owner-specific IRA room.
2. Current `money-priority-retirement-accounts.ts` aggregates Traditional + Roth IRA YTD by owner, correctly recognizes one combined IRA annual limit per person, and separately evaluates Roth direct-contribution eligibility and Traditional IRA deductibility.
3. Current MFJ compensation logic sorts IRA owner IDs, gives the first owner up to that owner's IRA statutory limit from household compensation, then gives later owners only the leftover compensation. That deterministic split is project modeling, not statutory owner-specific capacity.
4. Existing FFH baseline invariants require statutory room, YTD contributions, scheduled contributions, one-time cash, recurring cash flow, and routing demand to remain distinct; a dollar cannot be consumed twice.
5. FFH-D004 already establishes that recommendations are not execution. Actual authoritative financial facts reduce legal/principal capacity; a prior recommendation by itself does not.
6. FFH-009 is limited to the spousal-IRA compensation-capacity issue. It does not redesign IRA MAGI phaseouts, Traditional deductibility, Roth-vs-Traditional preference, HSA policy, Phase 5C, or SIMPLE behavior.

## POLICY GAP / UNCERTAINTY

Classification: VERIFIED CURRENT EXTERNAL FACT + PROJECT POLICY GAP.

FFH-005 revalidation, based on IRS Publication 590-A and current 2026 IRA limits, established:

- For 2026, each individual's combined Traditional + Roth IRA dollar limit is $7,500, or $8,600 if age 50 or older, before other applicable constraints.
- Except for the spousal-IRA rule, spouses determine contribution limits separately using their own compensation.
- When spouses file jointly and one spouse has lower compensation, the lower-compensation spouse's spousal-IRA limit depends on combined compensation reduced by the other spouse's actual Traditional + Roth IRA contributions for the year.
- The statute/guidance does not create a permanent first-owner/second-owner compensation allocation.

Therefore legal capacity is not a fixed pair of owner-specific room numbers before contribution choices are made. In scarce-compensation cases it is a **feasible set** constrained by individual limits and a shared joint-compensation resource.

## PROPOSED POLICY

Unless explicitly labeled otherwise, this section is PROPOSED FFH PROJECT POLICY pending Manager approval.

### 1. Separate the legal feasible set from the routing decision

FFH must not pre-allocate joint compensation to spouses merely to produce a single owner-room number.

The legal-capacity layer must represent:

- each spouse's individual combined IRA annual limit;
- each spouse's actual Traditional + Roth IRA YTD total;
- supported tax-year IRA compensation for each spouse;
- the shared joint-compensation constraint where the spousal-IRA rule applies;
- any owner-specific compensation ceiling that still applies to the higher-compensation spouse; and
- account-specific Roth eligibility / Traditional deductibility separately from compensation capacity.

The routing layer may later choose a valid point inside that feasible set. That choice is FFH product policy, not statutory owner priority.

### 2. Required tax-year facts

For an MFJ spousal-IRA capacity decision, FFH requires:

1. filing status = married filing jointly for the tax year;
2. two relevant active spouses/persons;
3. supported tax-year IRA compensation for each spouse;
4. age-derived individual IRA dollar limit for each spouse;
5. actual tax-year Traditional + Roth IRA contributions YTD for each spouse across all represented IRAs; and
6. enough account/tax-profile facts to evaluate the specific account destination being considered.

If the product cannot establish a spouse's total tax-year Traditional + Roth IRA YTD, absence of a recorded IRA account must not automatically be interpreted as zero contributions when scarce joint compensation matters.

### 3. Statutory feasible-set semantics

Classification: MATHEMATICAL CONSEQUENCE of VERIFIED CURRENT EXTERNAL FACT.

Let:

- `C_A`, `C_B` = supported IRA compensation for spouses A and B;
- `C_joint = C_A + C_B`;
- `L_A`, `L_B` = each spouse's age-appropriate individual combined IRA dollar limit;
- `X_A`, `X_B` = each spouse's total actual + planned current-plan Traditional/Roth IRA contribution for the tax year.

#### Unequal compensation

If `C_A > C_B`, A is the higher-compensation spouse and B is the lower-compensation spouse for this rule.

The supported legal feasible set is:

- `0 <= X_A <= min(L_A, C_A)`;
- `0 <= X_B <= L_B`; and
- `X_A + X_B <= C_joint`.

If `C_B > C_A`, reverse A and B.

This is equivalent to the lower-compensation spouse's IRS formula: the lower spouse may use combined compensation remaining after the other spouse's actual IRA contributions, while the higher-compensation spouse does not receive a new statutory right to exceed that spouse's own compensation.

#### Equal compensation

If `C_A == C_B`, neither spouse has lower compensation for purposes of a spousal enhancement. Each spouse is limited by that spouse's own compensation:

- `0 <= X_A <= min(L_A, C_A)`;
- `0 <= X_B <= min(L_B, C_B)`.

Do not use account ID, person ID, display order, income-source order, or account balance to manufacture a "lower spouse" when compensation is equal.

### 4. Actual YTD contributions consume the feasible set first

Classification: STATUTORY / MATHEMATICAL CONSEQUENCE.

Define:

- `Y_A`, `Y_B` = actual authoritative tax-year Traditional + Roth IRA contributions YTD for each spouse.

Actual YTD contributions reduce the available feasible set exactly once.

For unequal compensation where A is the higher-compensation spouse:

- `sharedCompensationRemaining = max(0, C_joint - Y_A - Y_B)`;
- `higherOwnerRemaining = max(0, min(L_A, C_A) - Y_A)`;
- `lowerOwnerIndividualRemaining = max(0, L_B - Y_B)`;
- `conditionalMaxAdditional_A = min(higherOwnerRemaining, sharedCompensationRemaining)`;
- `conditionalMaxAdditional_B = min(lowerOwnerIndividualRemaining, sharedCompensationRemaining)`.

The two conditional owner maxima are **not additive independent room**. Both consume the same shared compensation ledger.

Household maximum additional IRA compensation capacity is:

`min(sharedCompensationRemaining, higherOwnerRemaining + lowerOwnerIndividualRemaining)`.

For equal compensation, each owner uses `max(0, min(L_i, C_i) - Y_i)`; no spousal enhancement is created.

### 5. Expose conditional owner room plus shared capacity, not a fake split

Classification: PROPOSED FFH PROJECT POLICY.

In a scarce-compensation MFJ case, FFH should expose each spouse's **conditional maximum additional contribution** together with the shared joint-compensation remaining amount and a shared-capacity-group identifier.

Example: one spouse has $10,000 of compensation, the other has $0, both are under age 50, and neither has contributed YTD.

Correct representation:

- spouse A conditional maximum: $7,500;
- spouse B conditional maximum: $7,500;
- shared joint-compensation remaining: $10,000;
- household maximum additional IRA contribution across both spouses: $10,000.

Incorrect representation:

- spouse A legal room = $7,500;
- spouse B legal room = $2,500 solely because A's owner ID sorted first.

The UI/engine must not sum conditional owner maxima and present $15,000 as independently available room.

### 6. Shared-capacity ledger is authoritative during allocation

Classification: PROPOSED FFH PROJECT POLICY / MATHEMATICAL CONSEQUENCE.

Every IRA allocation in the current plan must consume:

1. the owner's combined Traditional + Roth individual remaining limit;
2. the owner's applicable compensation constraint;
3. the household MFJ shared-compensation remaining ledger where R6 applies; and
4. the account-specific route constraint (for example direct Roth eligibility).

No stage may recompute a fresh $10,000 shared pool after another stage already consumed part of it.

The shared group should be conceptually similar to a ledger such as `ira:mfj-compensation:<tax-year>`; exact field/type naming belongs to Engineering.

### 7. Multiple Traditional/Roth IRA accounts do not multiply capacity

Classification: STATUTORY / ESTABLISHED FFH PROJECT POLICY.

For each spouse:

- aggregate actual YTD across all Traditional and Roth IRAs;
- share one individual combined IRA limit across those accounts;
- then apply the MFJ shared-compensation constraint across both spouses.

A person with three IRA account records does not receive three compensation limits or three annual dollar limits.

### 8. Direct Roth eligibility and Traditional deductibility remain separate

Classification: ESTABLISHED FFH PROJECT POLICY.

R6 changes compensation-capacity representation only.

- Roth direct-contribution MAGI rules may reduce or eliminate the amount routable to a Roth IRA even when combined IRA compensation room exists.
- Traditional IRA contribution eligibility may remain while deductibility is partial or none.
- Unused legal IRA compensation capacity is not automatically "Roth room" or "deductible Traditional room."

The account router must intersect the shared compensation ledger with each account's already-authoritative tax eligibility/deductibility behavior.

### 9. Planned future contributions are reservations, not YTD facts

Classification: ESTABLISHED FFH PROJECT POLICY + PROPOSED R6 APPLICATION.

Distinguish:

- **actual YTD contribution** — statutory room already consumed;
- **authoritative active scheduled contribution** — planning reservation that consumes the current plan's cloned capacity ledger;
- **new recommendation/allocation in this run** — consumes the current plan ledger as routed;
- **old recommendation not reflected in current authoritative schedule or actual data** — does not consume legal room.

A scheduled or recommended future dollar must not be added to `Y_A`/`Y_B` as though already contributed. It instead reserves/consumes the planning ledger so the same future capacity is not recommended twice.

### 10. One-time, Secure, Build, Windfall, and Your Plan consumers share one R6 ledger

Classification: PROPOSED FFH PROJECT POLICY consistent with existing capacity-ledger invariants.

All consumers of IRA capacity must use the same current-plan owner and shared compensation ledgers:

- eligible one-time existing-cash deployment;
- any Secure-stage IRA routing if an approved policy path exists;
- Build retirement routing;
- Windfall Mode;
- Your Plan adjustments; and
- hypothetical reruns that include IRA contributions.

Later consumers see capacity already consumed/reserved by earlier authoritative allocations. Windfall/hypothetical modes clone the relevant ledger state; they do not mutate or recreate the baseline statutory room.

### 11. Deterministic routing without statutory owner priority

Classification: PROPOSED FFH PROJECT POLICY.

The legal-capacity evaluator must remain owner-neutral and order-invariant.

When routing a household retirement amount:

1. apply existing approved account opportunity/tax/routing factors first;
2. consume the shared compensation ledger only when a contribution is actually routed/reserved;
3. never rank spouses by person ID, account ID, display order, account creation time, or array order;
4. if two spouse IRA routes remain financially equivalent after all approved routing factors, split the scarce amount by equal fulfillment ratio across the tied owner-level requests;
5. use stable ID only for an unavoidable final-cent remainder.

This equal-fulfillment tie rule is a PRODUCT POLICY choice, not a statutory rule. It prevents winner-take-all owner-ID behavior while retaining deterministic output.

No new spouse-priority preference is required for R6. If a future product feature explicitly lets users prefer funding one spouse first, that preference may select among legally feasible allocations but may not alter legal capacity or be described as statutory priority.

### 12. Missing-information behavior

Classification: PROPOSED FFH PROJECT POLICY.

Return targeted `more_information_needed` for the R6-dependent decision when any fact needed to establish scarce-compensation capacity is materially unknown, including:

- MFJ status/tax year unresolved;
- one spouse's supported IRA compensation unknown;
- owner/spouse identity unresolved;
- one spouse's aggregate Traditional + Roth IRA YTD unknown when shared compensation could bind;
- account ownership unknown;
- required tax-profile data for the selected Roth/Traditional route unknown.

Do not convert unknown compensation to zero merely to create a deterministic split.

Do not infer spouse YTD = $0 solely because no IRA account is recorded. A Core-only conservative implementation may keep shared/spousal-enhanced room unresolved until an authoritative zero/total can be established from the supported snapshot contract.

Missing R6 information should block only IRA capacity that depends on that information. Unrelated retirement/debt/goal decisions may continue.

### 13. Existing actual contributions that violate the feasible set

Classification: PROPOSED FFH PROJECT POLICY / MATHEMATICAL CONSEQUENCE.

If authoritative YTD facts already exceed a supported individual or joint compensation ceiling:

- clamp additional contribution room to zero for the affected shared group;
- expose a high-severity `possible_excess_ira_contribution` / equivalent warning;
- do not invent tax remediation, withdrawal mechanics, earnings calculations, or penalty advice inside R6;
- route exact excess-correction guidance to a separately approved regulatory/product path if needed.

Negative capacity must never become negative demand or phantom room.

### 14. Supported compensation semantics boundary

Classification: VERIFIED CURRENT EXTERNAL FACT + PROJECT MODEL BOUNDARY.

FFH-005 notes that statutory IRA compensation can include categories beyond a naive wage-only field. FFH-009 does not silently redefine `estimatedTaxableCompensationAnnual` to cover every statutory compensation category.

For implementation:

- use the project's supported tax-year IRA-compensation input only within its documented meaning;
- if the household reports compensation categories the current input contract cannot faithfully represent, do not claim exact legal room from an incomplete proxy;
- route a genuine unresolved external-definition issue back to Regulatory Research rather than guessing.

This is not permission to broaden FFH-009 into a general IRA compensation-schema project.

## POLICY CLASSIFICATION

### STATUTORY / REGULATORY REQUIREMENT / VERIFIED CURRENT EXTERNAL FACT

- 2026 individual combined Traditional + Roth IRA limits: $7,500, or $8,600 if age 50+.
- Individual IRA contribution limits are compensation-constrained.
- MFJ spousal-IRA treatment allows the lower-compensation spouse to use combined compensation remaining after the other spouse's actual IRA contributions.
- The rule does not prescribe a permanent owner-ID allocation of joint compensation.
- Multiple Traditional/Roth IRAs do not multiply the per-person combined limit.

### MATHEMATICAL CONSEQUENCE

- scarce MFJ compensation creates a shared feasible set rather than two independent room balances;
- actual YTD contributions reduce the feasible set;
- owner conditional maxima cannot be summed as independent household capacity;
- aggregate allocations must remain inside both owner and shared constraints.

### PROPOSED FFH PROJECT POLICY

- expose conditional owner maximum + shared compensation remaining rather than fixed owner split;
- maintain a shared MFJ IRA-compensation planning ledger;
- reserve scheduled/planned contributions without mislabeling them as YTD;
- equal-fulfillment routing for otherwise financially tied spouse IRA requests;
- targeted missing-information behavior;
- possible-excess warning with no invented remediation;
- absence of an IRA account is not automatically proof of zero spouse YTD when R6 matters.

### USER-CONFIGURABLE PREFERENCE

- Existing Roth-vs-Traditional preference may influence account routing only within legal capacity.
- No new spouse-funding preference is required for R6.
- A future explicit spouse-funding preference could choose among feasible allocations but cannot change statutory room.

## RATIONALE

The current owner-ID split solves a software determinism problem by pretending the law has already allocated scarce compensation. That is the wrong layer.

A shared feasible-set/ledger model preserves three separate truths:

1. **Legal possibility:** more than one owner allocation can be lawful before future contributions are chosen.
2. **Actual history:** YTD contributions narrow that set immediately and exactly once.
3. **Product routing:** FFH may select one deterministic valid allocation for a recommendation without rewriting legal capacity.

This model also fits FFH's existing capacity-ledger architecture and prevents one-time/Build/Windfall/Your Plan from independently spending the same joint compensation.

## EXTERNAL FACTS REQUIRED

Already available through FFH-005 revalidation / authoritative IRS sources:

- current 2026 IRA dollar limits;
- Publication 590-A general IRA compensation rule;
- Kay Bailey Hutchison Spousal IRA formula;
- combined Traditional + Roth per-person annual-limit treatment.

No new external fact is required to complete FFH-009.

## ASSUMPTIONS

Classification: ASSUMPTION unless Manager/Engineering verifies otherwise.

1. The existing person records correctly identify the two relevant spouses for MFJ planning.
2. The current tax-profile year corresponds to the IRA contribution year being evaluated.
3. `employeeContributedYtd` on IRA account records represents actual tax-year Traditional/Roth contributions rather than rollovers/conversions or another non-contribution transaction type.
4. Current account inventory/YTD facts may be incomplete; absence of an IRA account is therefore not treated as statutory zero without an authoritative project data contract establishing that meaning.
5. Existing account tax-eligibility/deductibility logic remains unchanged outside R6.

## FINANCIAL INVARIANTS

1. No owner-ID statutory priority.
2. Total routed IRA contributions for both spouses cannot exceed supported joint compensation when the spousal rule is used.
3. Each spouse cannot exceed that spouse's age-appropriate combined Traditional + Roth IRA dollar limit.
4. The higher-compensation spouse cannot use the spousal rule to exceed that spouse's own supported compensation.
5. In equal-compensation cases, neither spouse receives an invented spousal enhancement.
6. Actual YTD contributions are consumed exactly once.
7. Multiple IRAs for one spouse share one owner limit.
8. Conditional owner maxima are not additive independent room.
9. Planned/scheduled contributions are distinct from actual YTD.
10. One-time/recurring/Windfall/Your Plan consumers share one ledger state.
11. Missing compensation/YTD cannot create optimistic room.
12. Negative remaining capacity clamps to zero and surfaces the relevant warning/state.
13. Roth direct eligibility and Traditional deductibility remain separate from compensation capacity.
14. Account/person array order cannot change legal capacity.
15. Stable IDs may resolve only an unavoidable final-cent routing tie, never substantive owner legal room.

## SCENARIOS ANALYZED / ACCEPTANCE SCENARIOS

### Scenario 1 — Non-scarce compensation

Both spouses under 50. A compensation $100,000, B compensation $50,000, YTD $0/$0.

Expected: each has individual $7,500 combined IRA capacity; shared compensation does not bind. No owner split is needed.

### Scenario 2 — One earner, $10,000 joint compensation, no YTD

A compensation $10,000, B compensation $0, both under 50, YTD $0/$0.

Expected:
- A conditional max additional $7,500;
- B conditional max additional $7,500;
- shared remaining $10,000;
- household max additional $10,000;
- never display A $7,500 / B $2,500 as fixed legal room solely due to owner ordering.

### Scenario 3 — Higher earner contributes first

Same as Scenario 2; A actual YTD $7,500, B $0.

Expected: shared remaining $2,500; B maximum additional $2,500; A $0.

### Scenario 4 — Higher earner contributes only $2,500

Same base facts; A actual YTD $2,500, B $0.

Expected: shared remaining $7,500; B can still contribute up to $7,500. The engine must not preserve an earlier hypothetical $7,500 allocation to A.

### Scenario 5 — Lower-compensation spouse contributes first

A compensation $10,000, B $0. A YTD $0, B YTD $7,500.

Expected: shared remaining $2,500; A can contribute at most $2,500 despite A's individual $7,500 limit because B's actual contribution has consumed joint compensation.

### Scenario 6 — Both spouses have compensation but higher spouse below individual dollar limit

A compensation $6,000, B compensation $4,000, both under 50, YTD $0/$0.

Expected:
- A (higher-comp spouse) annual compensation ceiling $6,000;
- B conditional annual ceiling up to $7,500 subject to shared $10,000;
- household feasible maximum $10,000;
- A must never be shown as legally able to contribute $7,500.

### Scenario 7 — Equal scarce compensation

A compensation $5,000, B compensation $5,000, both under 50.

Expected: each max $5,000. Neither receives a spousal enhancement and owner ID does not create a higher/lower spouse.

### Scenario 8 — Different age-based individual limits

A age 52 with $12,000 compensation; B age 40 with $0 compensation; YTD $0/$0.

Expected: use A's $8,600 individual limit and B's $7,500 limit, with one shared $12,000 compensation pool. Conditional maxima are $8,600 and $7,500 but household maximum is $12,000.

### Scenario 9 — Multiple IRA accounts for one spouse

A has Traditional IRA YTD $2,000 and Roth IRA YTD $1,500; B has Roth IRA YTD $500.

Expected: A owner YTD = $3,500, B owner YTD = $500. Account count does not multiply owner or joint compensation room.

### Scenario 10 — Roth direct limit constrains destination, not shared compensation

A has legal combined IRA compensation room but direct Roth eligibility is zero from MAGI; Traditional IRA contribution remains legally available subject to existing deductibility logic.

Expected: R6 shared compensation remains available to valid IRA destinations; do not label the shared room as direct Roth room.

### Scenario 11 — Spouse has no recorded IRA account in scarce case

MFJ joint compensation is scarce. A has an IRA account. B has no recorded IRA account and B's tax-year IRA YTD cannot be authoritatively established.

Expected: do not infer B YTD = $0; return targeted more-information-needed for the shared/spousal-enhanced capacity decision.

### Scenario 12 — Missing spouse compensation

A compensation known, B compensation unknown.

Expected: no full MFJ shared-compensation feasible set can be claimed. Return targeted more-information-needed; do not substitute zero and do not allocate by ID.

### Scenario 13 — Missing owner YTD across multiple IRAs

One IRA account has unknown YTD.

Expected: owner aggregate YTD is unknown; R6-dependent shared capacity remains unresolved rather than treating missing as zero.

### Scenario 14 — Prior recommendation is not execution

Prior plan recommended $5,000 to B but current authoritative snapshot records no contribution and no active schedule/reservation.

Expected: legal YTD remains unchanged; shared capacity is not reduced by $5,000 merely because an old recommendation existed.

### Scenario 15 — Active schedule reserves planning room

A current authoritative schedule will contribute $3,000 more this tax year to A.

Expected: $3,000 is not added to actual YTD, but the current planning ledger reserves both A's owner room and $3,000 of shared compensation before allocating new one-time/Build/Windfall dollars.

### Scenario 16 — One-time then Build

Shared compensation remaining is $8,000. Existing-cash deployment routes $5,000 into A's IRA.

Expected: Build sees only $3,000 shared compensation remaining (subject to owner constraints). It must not recompute $8,000 from raw compensation.

### Scenario 17 — Windfall clone

Base plan already consumed $4,000 of a $10,000 shared pool. Windfall Mode evaluates an additional contribution.

Expected: Windfall starts from the authoritative cloned post-base ledger with $6,000 remaining, not a fresh $10,000 pool; baseline state is not mutated.

### Scenario 18 — Financially equivalent spouse routes under scarcity

Both spouse IRA destinations are equally eligible and equal in all approved routing factors; only $5,000 of shared capacity is to be allocated against two equal $5,000 owner requests.

Expected: equal-fulfillment split $2,500/$2,500, with stable ID only for a possible final-cent remainder. Reversing account/person array order does not change substantive allocation.

### Scenario 19 — Existing YTD exceeds joint compensation

Joint supported compensation $10,000; actual combined IRA YTD $11,000.

Expected: additional shared room = $0; surface possible excess warning; do not create negative demand or provide tax-remediation instructions inside R6.

### Scenario 20 — Existing higher-spouse contribution exceeds own compensation

A compensation $4,000, B compensation $2,000; A is higher-compensation spouse and has actual YTD $5,000.

Expected: A has no additional room and the current facts indicate a possible excess relative to A's supported own-compensation ceiling. B's unused compensation does not create a statutory right for A to exceed A's own compensation.

## EXPECTED OUTPUTS

An implementation should be able to expose or derive, at minimum:

- tax year;
- filing-status applicability;
- owner person IDs;
- supported compensation per spouse;
- individual age-based IRA dollar limit per spouse;
- aggregate Traditional + Roth YTD per spouse;
- higher/lower/equal compensation relationship when MFJ;
- owner individual remaining room;
- conditional owner maximum additional room;
- shared MFJ compensation group ID and remaining amount;
- household maximum additional IRA compensation capacity;
- route-level Roth/Traditional eligibility state;
- missing-data reasons;
- possible-excess warning state;
- explanations that distinguish conditional owner room from independent room.

Exact TypeScript names are Engineering choices, but semantics may not collapse the shared feasible set back into a fixed owner split.

## EXPECTED NON-BEHAVIOR

FFH-009 does not authorize:

- owner-ID or array-order statutory priority;
- account-name based spouse priority;
- a new user spouse-priority setting;
- changes to Roth phaseouts or Traditional deductibility;
- changes to the 2026 IRA dollar constants;
- HSA, SIMPLE, Phase 5C, debt, goal, or emergency-fund behavior;
- counting old recommendations as actual contributions;
- summing conditional owner maxima as household legal room;
- treating missing spouse IRA account as proof of zero YTD;
- tax advice for correcting excess IRA contributions;
- production code.

## EDGE CASES

- one spouse age 50+, the other under 50;
- spouse compensation changes before year end;
- equal compensation;
- one spouse with no IRA account but possible outside-FFH contributions;
- Traditional + Roth accounts for the same owner;
- one owner with multiple Traditional/Roth accounts;
- Roth direct contribution prohibited but Traditional contribution allowed;
- unknown contribution YTD on any IRA in the owner group;
- joint compensation exactly equals combined YTD;
- YTD exceeds joint compensation or an owner ceiling;
- scheduled future contributions exceed remaining feasible room;
- plan rerun after new actual contribution is recorded;
- reordering people/accounts;
- rounding to cents and final-cent tie handling.

## TRADEOFFS

### Shared feasible-set model

Pros:
- legally faithful;
- avoids false owner priority;
- supports actual YTD changes naturally;
- aligns with FFH capacity ledgers;
- order-invariant.

Cons:
- UI must explain that two owner conditional maxima are not independently additive;
- downstream routing must consume a shared group correctly.

### Fixed deterministic owner split

Pros:
- simple scalar room per owner.

Cons:
- misrepresents product ordering as statutory capacity;
- can understate one spouse's legally feasible contribution;
- owner IDs can change substantive output;
- rejected.

### Winner-take-all routing tie

Pros:
- simple.

Cons:
- arbitrary household-owner bias where financial factors tie;
- rejected in favor of equal fulfillment for true routing ties.

## CONFIDENCE

HIGH on:

- the R6 legal distinction between feasible set and deterministic product allocation;
- use of actual spouse IRA contributions in the spousal-IRA compensation relationship;
- no statutory owner-ID priority;
- owner/shared ledger invariants;
- multiple-account/YTD aggregation;
- missing-data safeguards.

MEDIUM-HIGH on equal-fulfillment as the best FFH routing tie rule. It is a product-policy choice rather than an external rule and should become canonical only through Manager approval.

## OPEN QUESTIONS

1. Manager should decide whether the current account inventory contract is authoritative enough to treat "no recorded spouse IRA" as zero YTD. Retirement Policy recommends **no** unless the product has an explicit completeness guarantee; otherwise keep shared room `more_information_needed`.
2. Manager may choose exact output field names and whether `householdMaxAdditionalIraRoom` is exposed directly or derived from owner/shared ledgers.
3. If Engineering determines the current compensation input semantics cannot safely support the already-defined R6 formulas for common households, route only that data-contract gap to Manager/Regulatory Research rather than changing the policy formula.

These do not prevent FFH-009 from being implementation-ready at the policy level.

## RECOMMENDED NEXT ROLE

Manager / Architect.

Manager should synthesize FFH-009 into a durable R6 decision and issue a narrow Core Financial Engine remediation task. The Engineering task should replace the sorted-owner compensation split with owner + shared IRA capacity ledgers, preserve existing Roth/Traditional tax logic, add adversarial order-invariance/scarcity tests, and avoid unrelated retirement-policy changes.

## IMPLEMENTATION READINESS

READY FOR MANAGER SYNTHESIS.

After Manager approval: READY FOR A NARROW CORE ENGINE REMEDIATION TASK.

Not production-authorized by this specialist handoff alone.
