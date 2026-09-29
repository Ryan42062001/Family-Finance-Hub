# FFH-003 — Phase 5C Goals / Cash Flow Allocation Policy Analysis

Role: Goals, Cash Flow & Allocation Policy Analyst
Status: COMPLETE — INDEPENDENT GOALS-SIDE RECOMMENDATION; PENDING MANAGER SYNTHESIS
Date: 2026-09-08

## QUESTION

How should Phase 5C use Phase 5B Goal Intelligence to decide whether recurring funding for a household goal should outrank, share priority with, or remain below **additional retirement opportunity**, while preserving Phase 5A retirement-floor protections, Secure-stage safeguards, one-time/recurring separation, residual-needs accounting, determinism, and explainability?

This analysis is intentionally independent. It does not adopt or respond to the FFH-004 Retirement Policy conclusion.

## CURRENT CANONICAL POLICY

The repository currently establishes the following relevant policy boundaries:

1. Secure-stage solvency, emergency/reserve, required-obligation, debt, insurance-exposure, and employer-match protections outrank ordinary Build-stage wealth optimization.
2. Existing deployable cash and recurring monthly capacity are separate resources. Existing-cash deployment occurs before recurring allocation, and a residual-needs snapshot prevents the same requirement from being funded twice.
3. Current Build policy uses a two-pass hierarchy that places required/protective goals before additional retirement and important/optional goals after retirement. Phase 5C has not yet been approved to change that behavior.
4. Phase 5A separates:
   - legal contribution capacity;
   - the protected retirement planning floor; and
   - additional retirement opportunity above the protected floor.
   Phase 5A explicitly does not decide later goal-versus-retirement competition.
5. Phase 5B Goal Intelligence is derived evidence only. It does not itself allocate cash, protect new goal dollars, reduce retirement contributions, accelerate goals, or change Build economics.
6. Goal Intelligence separates:
   - necessity: Essential / Important / Optional / unknown;
   - core need from the full desired target;
   - preservation/restoration from improvement/upgrade;
   - deadline flexibility: Fixed / Limited / Flexible / unknown;
   - consequence severity;
   - schedule state;
   - borrowing/debt exposure; and
   - target reasonableness.
7. A fixed date on an optional goal does not make the goal essential. Financing risk can amplify a legitimate need but cannot convert discretionary spending into an essential need.
8. Fully funded goals require $0 of additional monthly funding. Legacy goals whose Goal Intelligence has not been confirmed remain conservatively unclassified rather than inheriting historical defaults as user evidence.
9. Goal ordering is deterministic and lexicographic rather than driven by a user-facing magic score; stable ID terminates otherwise complete ties.

Current code still computes Goal Intelligence alongside the pre-Phase-5C Build allocator. That implementation fact is not itself approval of a Phase 5C policy.

## POLICY GAP

The repository does not yet define:

- which specific **goal dollars**, rather than whole goals, may outrank additional retirement;
- how an essential core need should be separated from an upgraded desired solution during allocation;
- what an actual tie with additional retirement means when capacity is scarce;
- how schedule state, consequence, deadline flexibility, debt exposure, and reasonableness should interact without becoming an opaque score;
- how missing Goal Intelligence should affect only the decisions that depend on it;
- how recurring allocation should consume the post-existing-cash residual need without double counting scheduled contributions or one-time cash; or
- the acceptance scenarios Engineering must later satisfy.

## PROPOSED POLICY

### 1. Compete by funding tranche, not by whole-goal label

A goal whose `coreNeedAmount` is known must be decomposed into two economic tranches after existing-cash residual reconciliation:

```text
remainingTargetNeed
= max(0, targetAmount - currentAmount)

remainingCoreNeed
= max(0, coreNeedAmount - currentAmount)

remainingDesiredExcess
= max(0, remainingTargetNeed - remainingCoreNeed)
```

This intentionally applies eligible saved dollars to the core need first for **priority analysis**. Once the core need is satisfied, the remaining target is desired-solution excess even if the underlying household need was essential.

If `coreNeedAmount` is unknown, the engine must not assume the full target is core need.

### 2. Phase 5C Goals Policy competes only with additional retirement above the protected floor

Goal Intelligence must not, by this Goals-side specification alone, reduce:

- Secure employer-match capture;
- authoritative Secure reserve/debt/required-obligation protections; or
- the Phase 5A protected retirement floor.

The Phase 5C competition described here applies to **additional retirement opportunity above the protected retirement floor**.

If scarce household capacity cannot satisfy both an approved retirement-floor requirement and a materially urgent essential core goal, that is a cross-domain structural conflict for Manager synthesis with FFH-004. FFH-003 does not unilaterally resolve it by weakening retirement policy.

### 3. Four cross-domain disposition states

Each recurring goal tranche should receive one deterministic Phase 5C disposition:

```text
OUTRANKS_ADDITIONAL_RETIREMENT
CO_PRIORITY_WITH_ADDITIONAL_RETIREMENT
BELOW_ADDITIONAL_RETIREMENT
MORE_INFORMATION_NEEDED
```

A zero remaining tranche is satisfied and excluded from competition.

These states are policy relationships, not Goal Intelligence priority bands and not numeric scores.

### 4. OUTRANKS_ADDITIONAL_RETIREMENT

Only the **remaining core-need tranche** may outrank additional retirement, and only when all of the following are true:

- Goal Intelligence is confirmed;
- necessity is Essential;
- `coreNeedAmount` is known;
- a usable recurring funding pace can be calculated; and
- the evidence shows both material urgency and material harm.

For this policy:

**Material urgency** exists when either:
- deadline flexibility is Fixed; or
- consequence severity is Critical.

**Material harm** exists when either:
- consequence severity is High or Critical; or
- debt exposure is High.

Therefore examples that can outrank additional retirement include an essential core need with a fixed deadline and high consequence, or an essential core need with a critical consequence even if the date has some flexibility.

`behind` schedule state by itself does not promote a goal into this class.

### 5. CO_PRIORITY_WITH_ADDITIONAL_RETIREMENT

A core-need tranche may share priority with additional retirement when it is materially important but does not meet the outrank test.

The Goals-side recommendation is:

**Essential core need:** CO_PRIORITY when confirmed, core need is known, recurring pace is usable, and at least one of these is true:
- deadline flexibility is Limited;
- consequence severity is Moderate, High, or Critical; or
- debt exposure is Moderate or High.

**Important core need:** CO_PRIORITY only when all are true:
- Goal Intelligence is confirmed;
- the core amount is known;
- nature is Preservation or Mixed rather than pure Improvement;
- deadline flexibility is Fixed or Limited; and
- consequence severity is High or Critical.

Debt exposure may strengthen the explanation for an Important goal but is not sufficient by itself to create co-priority.

### 6. BELOW_ADDITIONAL_RETIREMENT

The following remain below additional retirement opportunity:

- every Optional goal tranche, regardless of a self-imposed fixed date or financing plan;
- every desired-solution excess tranche above the confirmed core need;
- pure improvement/upgrade dollars that do not satisfy the co-priority criteria;
- Important goals that do not satisfy the narrow co-priority test;
- Essential core needs whose evidence is confirmed but materially flexible/low-consequence enough not to meet outrank or co-priority criteria; and
- unclassified legacy goals unless information is specifically required because another fact already establishes a potentially competing essential need.

A high borrowing APR on an Optional goal never upgrades it above additional retirement.

### 7. Tie behavior: equal fulfillment ratio, not array order or arbitrary winner

When capacity is insufficient to fully fund all items in a `CO_PRIORITY_WITH_ADDITIONAL_RETIREMENT` bucket, allocate the available capacity proportionally to each item's immediate recurring request using one equal fulfillment ratio:

```text
fulfillmentRatio
= min(1, availableCapacity / sum(tiedRequestedAmounts))

allocation_i
= requestedAmount_i * fulfillmentRatio
```

Retirement is one member of that tie bucket using its approved additional-retirement monthly request. Each eligible goal core tranche is another member.

This means a $300 goal request and a $600 additional-retirement request sharing $600 of available capacity receive $200 and $400 respectively, rather than giving all $600 to whichever item appears first.

Cent rounding must reconcile exactly to available capacity. Stable ID may determine only a final unavoidable one-cent remainder after proportional allocation; it must not determine substantive priority.

### 8. Immediate recurring funding need

For a valid future deadline with `M` funding months:

```text
fullTargetMonthlyPace = remainingTargetNeed / M
coreMonthlyPace       = remainingCoreNeed / M
excessMonthlyPace     = fullTargetMonthlyPace - coreMonthlyPace
```

All amounts are bounded at zero and use repository money-rounding/reconciliation rules.

The **immediate recurring funding need** is the monthly pace for the applicable tranche, not the entire outstanding goal principal.

A `plannedMonthlyContribution` is schedule evidence and user-plan intent. It is not an existing balance and therefore does not reduce goal principal. Because FFH cash flow is measured before savings/goal contributions, Phase 5C must not separately subtract a planned goal contribution from capacity and then allocate the same requested pace again unless a future authoritative capacity ledger explicitly proves that amount is already consumed.

### 9. Schedule-state treatment

- `funded`: request $0; exclude from allocation.
- `on_track`: the goal still has its calculated recurring pace; on-track status does not make the remaining need disappear.
- `behind`: use the recalculated required pace; the state may strengthen explanation and lower-order goal-to-goal urgency, but it cannot upgrade Optional/desired-excess dollars across the retirement boundary.
- `past_due`: do not divide by zero or force the entire residual balance into one month. Return targeted information/decision-needed state.
- `more_information_needed`: block only the classification/allocation that depends on the missing fact.

### 10. Target reasonableness and core/solution separation

A goal can have an essential underlying need and a `potentially_high` desired target at the same time.

Only the confirmed core tranche receives essential-core treatment. The excess remains below additional retirement.

No vehicle/home/category price cap or invented “reasonable” dollar amount should be introduced by Phase 5C.

### 11. Missing-data behavior

Missing data must be targeted rather than globally blocking Build.

Examples:

- unconfirmed legacy Goal Intelligence: no new cross-domain elevation; unrelated retirement/other goals continue;
- Essential goal with missing core amount: do not treat the full target as essential; return targeted `MORE_INFORMATION_NEEDED` for cross-domain competition;
- missing/invalid/past-due date when a recurring pace is required: do not fabricate a monthly pace;
- likely borrowing with missing amount/APR: debt-exposure amplifier remains unknown rather than guessed;
- missing evidence that could reasonably switch an already-confirmed essential core need between outrank/co-priority/below should make the affected competition unresolved rather than presenting a falsely final additional-retirement allocation from the contested capacity.

Conservative uncertainty should leave only the **contested** capacity unresolved; it should not freeze unrelated Secure, retirement, or goal allocations.

### 12. Goal-to-goal ranking remains lexicographic

Phase 5C should not introduce a blended numeric score.

Within the same cross-domain disposition, retain the established deterministic lexicographic goal-ranking approach using higher-order economic/necessity evidence before lower-order timing/preferences, with stable ID as the final tie-break. Schedule state may inform explanation or a lower-order tie only where Manager explicitly approves it; `behind` must never overpower a higher-order economic classification.

## POLICY CLASSIFICATION

### ESTABLISHED FFH POLICY

- Secure protections outrank ordinary Build/Optimize allocation.
- One-time cash and recurring capacity are separate.
- Residual-needs reconciliation prevents one dollar from satisfying the same need twice.
- Phase 5A separates legal capacity, protected retirement floor, and additional retirement opportunity.
- Phase 5B Goal Intelligence is evidence-only until Phase 5C.
- Core need and desired target are separate.
- Optional fixed deadlines do not create essential status.
- Financing can amplify a legitimate need but cannot make discretionary spending essential.
- Fully funded goals request $0.
- Unconfirmed legacy Goal Intelligence remains unclassified.
- Deterministic ordering must not depend on input array order.

### PROPOSED FFH POLICY

- tranche-based goal-versus-retirement competition;
- only core tranches may outrank/share priority with additional retirement;
- the explicit OUTRANK / CO_PRIORITY / BELOW / MORE_INFORMATION_NEEDED criteria above;
- equal-fulfillment-ratio allocation for actual cross-domain ties;
- targeted conservative treatment of materially unresolved competition;
- planned goal contribution as schedule evidence rather than automatic double subtraction from recurring capacity.

### MATHEMATICAL CONSEQUENCE

Given established target, balance, core amount, deadline months, and available capacity:

- remaining-target, remaining-core, desired-excess, monthly-pace, fulfillment-ratio, and residual calculations are mathematical consequences of those inputs and the approved policy ordering.

### ASSUMPTION

- `currentAmount` represents goal-eligible saved value in the authoritative residual snapshot.
- the existing-cash/residual-needs pipeline has already applied any one-time goal deployment before Phase 5C recurring competition.
- FFH-004/Manager will provide the approved retirement-side protected-floor and additional-retirement request semantics; this document does not define statutory retirement room or account routing.

## RATIONALE

The core principle is that **household need, desired solution, and funding mechanism are different facts**.

A household may genuinely need reliable transportation while preferring a vehicle far more expensive than the minimum solution. Protecting the whole desired target because the underlying need is essential would let lifestyle inflation displace retirement. Conversely, putting every life goal below all tax-advantaged retirement opportunity would contradict the Phase 5 principle that legitimate life goals need not wait until every tax-advantaged account is maxed.

Tranche-based competition resolves this tension without a magic score:

- materially urgent essential **core** dollars can beat additional retirement;
- meaningful but less dominant core needs can share scarce capacity;
- optional and upgrade dollars wait until after additional retirement; and
- the protected retirement floor remains a separate cross-domain safeguard for Manager synthesis.

Proportional tie allocation is preferred over array-order or winner-take-all behavior because a declared tie should visibly share scarcity. Equal fulfillment ratio gives each tied request the same fraction of its required pace, is deterministic, and remains explainable.

## ASSUMPTIONS

1. Phase 5A retirement-floor output remains authoritative input to Phase 5C after Manager synthesis.
2. Goal Intelligence evidence has already passed the snapshot's strict validation rules.
3. Existing-cash deployment and residual-needs reconciliation run before recurring Build allocation.
4. No Phase 5C rule in this document is statutory or regulatory.
5. Debt exposure used here is the already-derived Goal Intelligence evidence; FFH-003 does not create new APR thresholds or debt policy.
6. `plannedMonthlyContribution` describes a planned/scheduled goal pace, not a separately verified capacity consumption ledger.

## FINANCIAL INVARIANTS

- One dollar cannot be allocated to two competing requests.
- One-time cash cannot silently become recurring capacity.
- Recurring capacity cannot be consumed twice by planned contributions plus the Phase 5C allocator.
- Existing goal balance and one-time goal deployments reduce residual need exactly once.
- A satisfied core tranche cannot keep taking high-priority allocation merely because the desired target remains unfunded.
- A fully funded goal receives $0.
- Desired-solution excess cannot inherit the priority of a smaller essential core need.
- Optional borrowing cannot manufacture an essential goal.
- Goal allocations cannot displace Secure employer-match/reserve/debt protections under this specification.
- Goal-versus-additional-retirement allocations must not exceed post-higher-stage recurring capacity.
- Allocations plus unallocated residual capacity must reconcile to available capacity to the cent.
- Negative remaining needs, negative allocations, and phantom rounding dollars are forbidden.
- Equivalent inputs in different array order produce equivalent economic outputs.

## SCENARIOS

### Scenario 1 — Essential fixed/high core outranks additional retirement

AVAILABLE ONE-TIME CASH: $0
AVAILABLE RECURRING CAPACITY: $600/month after higher-stage/protected-floor requirements
EXISTING GOAL BALANCE: $0
GOAL TARGET: $12,000
CORE NEED: $6,000
DEADLINE: 10 months, Fixed
NECESSITY / CONSEQUENCE: Essential / High
ADDITIONAL RETIREMENT REQUEST: $400/month

Core pace = $600/month. Desired-excess pace = $600/month.

EXPECTED PRIORITY ORDER: core tranche → additional retirement → desired excess
EXPECTED RECURRING ALLOCATION: core $600; retirement $0; excess $0
WHY: confirmed essential core need has fixed urgency and high harm.
WRONG: treating all $1,200/month of the desired vehicle/solution pace as equally essential.

### Scenario 2 — Essential core outranks, residual then funds retirement

Same evidence as Scenario 1, but available recurring capacity is $900/month.

EXPECTED RECURRING ALLOCATION: core $600; retirement $300; excess $0
EXPECTED UNALLOCATED CAPACITY: $0
WRONG: giving the remaining $300 to desired excess before additional retirement.

### Scenario 3 — Essential limited/moderate core ties additional retirement

AVAILABLE RECURRING CAPACITY: $600/month
ESSENTIAL CORE REQUEST: $300/month
Deadline: Limited
Consequence: Moderate
ADDITIONAL RETIREMENT REQUEST: $600/month

Total tied request = $900; fulfillment ratio = 2/3.

EXPECTED RECURRING ALLOCATION: core $200; retirement $400
WRONG: $300/$300 simply because there are two items; $600/$0 due to array order.

### Scenario 4 — Important preservation fixed/high goal ties retirement

AVAILABLE RECURRING CAPACITY: $300/month
IMPORTANT CORE REQUEST: $300/month
Nature: Preservation
Deadline: Fixed
Consequence: High
ADDITIONAL RETIREMENT REQUEST: $300/month

EXPECTED RECURRING ALLOCATION: core $150; retirement $150
WHY: narrow Important-goal co-priority test is met.

### Scenario 5 — Important flexible/moderate goal remains below retirement

AVAILABLE RECURRING CAPACITY: $300/month
IMPORTANT GOAL REQUEST: $300/month
Deadline: Flexible
Consequence: Moderate
ADDITIONAL RETIREMENT REQUEST: $300/month

EXPECTED RECURRING ALLOCATION: retirement $300; goal $0

### Scenario 6 — Optional financed vacation remains below retirement

AVAILABLE RECURRING CAPACITY: $300/month
OPTIONAL GOAL REQUEST: $500/month
Deadline: Fixed
Borrowing: Likely, high debt exposure
ADDITIONAL RETIREMENT REQUEST: $300/month

EXPECTED RECURRING ALLOCATION: retirement $300; vacation $0
WRONG: promoting the vacation because the user selected a fixed date or expensive financing.

### Scenario 7 — Partial funding protects only remaining core

TARGET: $12,000
CORE NEED: $8,000
CURRENT GOAL BALANCE: $6,000
DEADLINE: 4 months

remainingTarget = $6,000
remainingCore = $2,000
remainingExcess = $4,000
core pace = $500/month
excess pace = $1,000/month

If Essential + Fixed + High, only the $500 core pace may outrank retirement. The $1,000 excess pace remains below it.

### Scenario 8 — Core already satisfied

TARGET: $15,000
CORE NEED: $5,000
CURRENT BALANCE: $6,000

remainingCore = $0
remainingTarget = $9,000

EXPECTED: no remaining goal dollars receive essential-core precedence; the $9,000 is desired-excess need and remains below additional retirement.

### Scenario 9 — Fully funded goal

TARGET: $12,000
CURRENT BALANCE: $12,000

EXPECTED RECURRING ALLOCATION: $0
EXPECTED RESIDUAL NEED: $0

### Scenario 10 — Past-due unfunded essential goal

Essential goal has a remaining balance but target date is before/as-of date.

EXPECTED: targeted MORE_INFORMATION_NEEDED / decision-needed result; no divide-by-zero; no fabricated “fund entire balance this month” request.

### Scenario 11 — One-time deployment changes recurring residual need exactly once

Initial target $12,000; core $8,000; existing goal balance $2,000. Existing-cash stage deploys $4,000 once to the goal.

Residual snapshot current amount = $6,000.

EXPECTED recurring analysis:
- remaining core = $2,000, not $6,000;
- remaining target = $6,000;
- the $4,000 one-time deployment is not also recurring capacity.

### Scenario 12 — Tie is invariant to input order

CO_PRIORITY requests:
- Goal A: $200/month
- Goal B: $400/month
- additional retirement: $600/month
- available capacity: $600/month

Total requests = $1,200; fulfillment ratio = 50%.

EXPECTED: A $100; B $200; retirement $300 regardless of input collection order.

### Scenario 13 — Essential goal missing core amount

Goal is confirmed Essential, Fixed, High consequence, but `coreNeedAmount` is missing.

EXPECTED: targeted MORE_INFORMATION_NEEDED; do not treat the entire desired target as essential. If this unresolved classification materially controls how much contested capacity can go to additional retirement, do not present that contested portion as a falsely final retirement allocation.

### Scenario 14 — Legacy unconfirmed goal does not freeze unrelated Build

Legacy goal has `goalIntelligenceConfirmed = false` and is unclassified.

EXPECTED: no new Phase 5C elevation for that goal; unrelated verified retirement/goal allocation continues. Ask for goal details only where they are needed to make the goal competitive.

## EDGE CASES

- `coreNeedAmount = 0`: valid; no core tranche can outrank retirement.
- `coreNeedAmount = targetAmount`: no desired-excess tranche.
- current balance greater than core but less than target: core is satisfied; all remaining need is desired excess.
- current balance at/above target: fully funded, $0 request.
- missing target date: cannot compute automatic recurring pace; targeted information needed.
- invalid date: same conservative behavior; no fabricated urgency.
- one month remaining: legitimate one-month pace, subject to the same policy class.
- past due: not treated as one remaining month.
- planned contribution exactly equal to required pace: `on_track`, but remaining need still exists.
- planned contribution below required pace: `behind`; recompute required pace but do not upgrade economic class solely due to being behind.
- planned contribution above required pace: do not allocate above the economic tranche's required pace merely because the user planned more.
- borrowing likelihood Likely but amount/APR missing: debt exposure cannot be used as a confident elevation signal.
- Optional goal with Critical-sounding self-described consequence: necessity remains a higher-order gate; Optional does not outrank retirement.
- multiple tied goals: proportional fulfillment is calculated over the complete tie bucket, not sequentially.
- cent remainder in proportional tie: deterministic final-cent reconciliation only, stable ID last.
- a retirement request larger than legally routable verified room: Goals policy must not reconstruct legal room; retirement-side/account-capacity logic limits the actionable retirement member of the competition.

## EXPECTED OUTPUTS

Phase 5C should expose enough derived information for callers/auditors to understand:

- remaining target need;
- remaining core need;
- remaining desired-excess need;
- recurring monthly pace for each applicable tranche;
- cross-domain disposition for each tranche;
- evidence/reason codes that caused the disposition;
- targeted missing-data state when applicable;
- requested versus allocated amount;
- unfunded amount;
- co-priority fulfillment ratio when a tie is capacity-constrained;
- residual recurring capacity after allocation; and
- explicit indication that the retirement competitor is additional opportunity above the protected floor, not employer match or an invented statutory amount.

Exact production type names are Engineering/Manager-owned; these are semantic requirements, not code instructions.

## EXPECTED NON-BEHAVIOR

Phase 5C must not:

- weaken Secure emergency/debt/match protections;
- infer statutory retirement room;
- let a whole luxury/upgrade target inherit a smaller essential core need's precedence;
- convert a fixed Optional deadline into essential/protected status;
- elevate Optional spending because financing would be expensive;
- use goal category alone as necessity evidence;
- invent a core amount or category price ceiling;
- use a blended opaque magic score;
- treat `plannedMonthlyContribution` as goal principal already saved;
- subtract a planned contribution from capacity twice;
- turn one-time cash into recurring capacity;
- keep allocating to funded goals or satisfied core tranches;
- use array order as a financial priority rule;
- fabricate a monthly pace for past-due/missing-date goals;
- freeze unrelated Build decisions because one goal lacks metadata; or
- automatically move money.

## ORDER-INVARIANCE REQUIREMENTS

1. Reordering goals in the snapshot must not change economic allocations.
2. Reordering retirement opportunities must not alter Goals-policy priority relationships.
3. The set of tied requests must be evaluated as a set before proportional allocation.
4. Stable ID may terminate exact goal-to-goal ties and final-cent reconciliation only after meaningful financial factors.
5. Equivalent one-time residual state must produce the same recurring competition regardless of how source collections were ordered.

## ONE-TIME / RECURRING REQUIREMENTS

1. Existing-cash deployment executes before recurring Phase 5C competition.
2. One-time goal allocations increase the goal's residual current amount exactly once.
3. Recurring goal pace is recomputed from the residual need after one-time deployment.
4. One-time retirement contributions do not become monthly retirement capacity or monthly goal capacity.
5. Earmarked/protected/operating/debt-backed cash remains subject to its existing cash-purpose rules; Goal Intelligence does not raid those pools.
6. Scheduled future goal contributions are planning evidence, not one-time balances.
7. Recurring allocation consumes only the post-higher-stage recurring capacity presented to Build.

## RESIDUAL-NEEDS REQUIREMENTS

For every goal:

```text
0 <= remainingCoreNeed <= remainingTargetNeed
0 <= remainingDesiredExcess <= remainingTargetNeed
remainingCoreNeed + remainingDesiredExcess = remainingTargetNeed
```

when core need is known.

After any authoritative one-time goal deployment, the residual snapshot must be the sole source for recurring remaining-need calculations. Phase 5C must not subtract the same deployment again.

For each recurring request:

```text
allocated + unfunded = requested
```

subject to cent-rounding rules.

Across the Build competition:

```text
totalAllocated + remainingCapacity = availableRecurringCapacity
```

No negative residual or allocation is permitted.

## TRADEOFFS

1. **Proportional ties versus winner-take-all:** proportional fulfillment better reflects a true tie and is order-invariant, but may leave both retirement and goal underfunded instead of fully satisfying one.
2. **Core-need reliance:** separating core from desired target prevents lifestyle inflation, but the core amount is user-supplied evidence and therefore depends on honest/usable input. The product should explain the distinction rather than pretend to appraise market value.
3. **Conservative uncertainty:** withholding only contested capacity avoids false confidence, but may temporarily leave capacity unallocated until the user answers a targeted question.
4. **Narrow Important-goal tie rule:** this allows high-consequence preservation needs to coexist with retirement without letting ordinary lifestyle goals crowd retirement. Some households may prefer a more aggressive goal-first philosophy; that belongs in a future explicit user preference only if Manager approves guardrails.
5. **Retirement-floor boundary:** this document deliberately does not decide whether an extraordinary essential goal can ever penetrate the protected retirement floor. That preserves role separation but leaves one Manager synthesis question open.

## ACCEPTANCE SCENARIOS

A future Phase 5C implementation should not be accepted unless tests/scenario evidence demonstrate at minimum:

1. Essential core + Fixed + High outranks additional retirement.
2. Essential core + Limited + Moderate shares capacity with additional retirement using equal fulfillment ratio.
3. Narrow Important + Preservation + Fixed/Limited + High/Critical can share priority.
4. Important Flexible/Moderate remains below additional retirement.
5. Optional Fixed remains below retirement.
6. Optional Likely/high-cost borrowing remains below retirement.
7. Desired excess above an essential core amount remains below retirement.
8. Partial existing balance reduces core need first for priority analysis.
9. Core already satisfied means no remaining essential-core allocation.
10. Fully funded goal produces $0.
11. Past-due unfunded goal does not fabricate a monthly pace.
12. Missing essential core amount produces targeted information needed rather than protecting the full target.
13. Unconfirmed legacy goal does not gain Phase 5C precedence and does not globally block unrelated Build.
14. One-time goal funding reduces recurring residual need exactly once.
15. Planned goal funding is not double-counted against recurring capacity.
16. Multi-item co-priority allocation is invariant to input order.
17. Reversing goal collection order produces economically identical output.
18. Tied proportional allocations reconcile to the cent with deterministic remainder handling.
19. Total recurring allocation never exceeds available recurring capacity.
20. Secure employer match/reserve/debt behavior remains unchanged by Goal Intelligence competition.
21. No Phase 5C goal rule fabricates retirement legal capacity or account routing.
22. Same normalized state + same policy version + same as-of date yields the same result.

## CONFIDENCE

HIGH on:

- tranche-based separation of core need from desired excess;
- Optional/upgrade dollars remaining below additional retirement;
- preserving Secure and Phase 5A protected-floor boundaries from the Goals side;
- targeted rather than global missing-data behavior;
- one-time/recurring/residual-needs requirements; and
- order-invariant proportional handling of an actual tie.

MEDIUM on the exact threshold that separates OUTRANK from CO_PRIORITY for Essential/Important core needs. The proposed threshold is deliberately explicit and conservative, but Manager should compare it against the independent FFH-004 retirement analysis and policy-audit expectations before approving it.

## OPEN QUESTIONS

1. Does Manager, after reviewing FFH-004, want the Phase 5A protected retirement floor to remain absolutely senior to every Phase 5C goal, or should a separately defined extraordinary-emergency exception exist? FFH-003 does not recommend weakening it without cross-domain synthesis.
2. Should Important + Preservation + Fixed/Limited + High/Critical remain a true co-priority class, or should Manager keep all Important goals below additional retirement for a simpler hierarchy?
3. When missing evidence makes an essential core classification materially ambiguous, should contested capacity remain temporarily unallocated as recommended here, or should Manager define a retirement-first fallback with an explicit uncertainty warning?
4. Should `behind` schedule state become an approved lower-order goal-to-goal tie-break after cross-domain classification, or remain explanation-only?
5. Any retirement-account statutory/capacity details required for final Phase 5C behavior must come from FFH-005 and Retirement Policy, not this role.

## RECOMMENDED NEXT ROLE

Manager / Architect.

Manager should synthesize this independent FFH-003 Goals/Cash Flow recommendation with FFH-004 Retirement Policy and FFH-005 Regulatory Research, resolve the open cross-domain questions, persist the approved Phase 5C durable policy, and only then authorize Engineering.
