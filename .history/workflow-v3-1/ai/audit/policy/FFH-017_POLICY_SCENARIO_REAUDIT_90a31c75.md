# FFH-017 — FINAL Fresh Independent Financial Policy & Scenario Re-audit — 90a31c75

- Role: Financial Policy & Scenario Auditor
- Execution mode: `STANDARD_CHAT`
- Audit lane: fresh independent final Financial Policy & Scenario re-audit
- Assigned audit branch: `audit/ffh-017-policy-90a31c75`
- Manager control-plane head verified at audit start and immediately before report write: `f0e9825f17144b9f24fafbbe1a97816051dec8b9`
- Exact frozen implementation target: `90a31c755ea88310e58bb9e06ade60af73e182f5`
- Frozen packet: `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_90a31c75.md`
- Historical failed target used only as prior-finding evidence: `9d3a880e02365b4445b8070344c72c928ca34511`
- The Technical & Mathematical Auditor's new re-audit conclusions/verdict were not requested, inspected, consulted, copied, or relied upon.

## Final verdict

**FAIL — REMEDIATION REQUIRED**

One blocking Financial Policy & Scenario finding remains on the exact frozen remediation target.

## Finding FFH-017-P02

**HIGH — The R01 locality remediation can allocate scarce OUTRANK capacity before resolving a materially unknown Essential core tranche that could outrank the already-funded goal.**

### Accepted policy

FFH-D004 and the accepted Goals revalidation require:

- missing information blocks only the contested tradeoff whose outcome could change;
- an unconfirmed legacy goal receives no unsupported cross-domain elevation and does not freeze unrelated allocations;
- Optional/lifestyle uncertainty stays retirement-junior when the uncertainty cannot alter that ordering;
- genuinely material Essential/Important uncertainty remains fail-closed for capacity whose outcome depends on the unknown fact;
- if missing evidence could switch an Essential core tranche among OUTRANK / CO_PRIORITY / BELOW, the affected contested capacity remains unresolved;
- multiple OUTRANK core tranches under scarcity are allocated in deterministic financial order, with stronger approved financial evidence ahead of weaker OUTRANK tranches.

The locality rule therefore permits known allocations to continue only when they are genuinely independent of the unresolved tranche. A known OUTRANK allocation is not independent when the unresolved Essential tranche could itself become an OUTRANK tranche that ranks ahead of it and claims the same scarce Bucket-1 capacity.

### Frozen implementation behavior

In `buildRecurringGoalRetirementCompetition(...)`, the remediation now correctly:

1. identifies known OUTRANK core tranches;
2. allocates every known OUTRANK tranche sequentially from available recurring capacity;
3. only **after those allocations**, checks `materialMissingGoals.length`;
4. when material missing goals exist, returns `more_information_needed` with retirement and later buckets held unresolved, but preserves any OUTRANK allocations already made.

This is safe for an unresolved goal already known to be below the allocated OUTRANK tranche. It is not safe when the unresolved Essential goal could itself become a stronger OUTRANK tranche.

### Adversarial policy scenario

Use otherwise verified Phase 5C facts:

- protected Phase 5A retirement floor already satisfied and outside competition;
- recurring Phase 5C capacity: **$400/month**;
- additional retirement request: **$100/month**;
- Goal A:
  - confirmed Essential;
  - Fixed deadline;
  - High consequence;
  - known remaining core and usable pace of **$400/month**;
  - therefore known `OUTRANKS`;
- Goal B:
  - confirmed Essential;
  - Fixed deadline;
  - Critical consequence;
  - target/deadline/classification facts known;
  - `coreNeedAmount` / remaining core amount unknown;
  - therefore `MORE_INFORMATION_NEEDED` because the amount/pace is not authoritative.

If Goal B later resolves to a positive core amount with a $400/month pace, it also qualifies as OUTRANK and—under the implementation's own approved financial ordering—its Critical consequence ranks ahead of Goal A's High consequence when both are Essential and Fixed.

Therefore Goal A's $400 allocation is **not definite before Goal B's core amount is resolved**:

- if Goal B core is zero/satisfied, Goal A may receive the $400;
- if Goal B has a $400 actionable core pace, Goal B should receive the scarce $400 first and Goal A should receive $0.

The missing Goal B fact directly changes the disposition/order/use of the same $400 Bucket-1 capacity.

The frozen implementation nevertheless allocates Goal A's full $400 before the material-missing check, then returns `more_information_needed` with Goal B unresolved, retirement at $0, and no remaining capacity. That is unsupported certainty in exactly the capacity whose outcome depends on the missing fact.

### Why this is blocking

This is not merely presentation uncertainty. The engine can emit an actionable recurring recommendation to a weaker known OUTRANK goal while a stronger unresolved Essential tranche may be entitled to that same scarce recurring capacity once its core amount is confirmed.

The recommendation remains a recommendation rather than an executed transaction, and the defect does not create illegal retirement contribution room. However, it can materially mis-prioritize scarce household cash against an unresolved Critical Essential need. That violates FFH-D004's missing-information locality and multi-OUTRANK scarcity rules and is blocking for FFH-017 closure.

### Required remediation boundary

Do not restore the historical household-wide global freeze.

Instead, before allocating a known OUTRANK tranche, determine whether any materially unresolved tranche can still alter that tranche's Bucket-1 entitlement or ordering. Capacity that can be claimed differently under a supported resolution of the unknown must remain unresolved. Capacity proven independent of the unknown may continue.

At minimum add regressions proving:

1. known OUTRANK A + unresolved Essential B that could become a financially stronger OUTRANK under scarcity does **not** produce an unsupported definite allocation to A;
2. if the unresolved Essential B can only become CO_PRIORITY/BELOW based on already-known facts, a known OUTRANK A may continue because its senior allocation is independent;
3. Optional, legacy-unconfirmed, and other provably retirement-junior unknowns remain local and do not restore the historical global freeze;
4. a materially unresolved Important goal cannot block an already-independent OUTRANK allocation because Important never OUTRANKS in V1, but it must still block the co-priority/retirement tradeoff if its unresolved facts could change that bucket;
5. no unknown core amount or recurring pace is invented.

A new exact frozen target and fresh independent audit are required after remediation.

## Historical FFH-017-P01 closure assessment

The original historical P01 behavior is materially improved and its specific global-freeze examples now clear:

- **confirmed Optional + unknown core amount:** CLEARS locality. The Optional core remains `BELOW`, its amount stays null/unresolved, and verified additional retirement can allocate.
- **Optional + irrelevant missing borrowing detail:** CLEARS locality. Missing borrowing detail does not promote the Optional goal or suppress retirement.
- **legacy-unconfirmed goal + verified retirement/known goal:** CLEARS locality. The legacy row receives no cross-domain elevation and does not freeze unrelated known allocation.
- **lower-priority Optional unknown + known OUTRANK:** CLEARS.
- **lower-priority Optional unknown + known CO_PRIORITY:** CLEARS.
- **material Essential unknown by itself:** CLEARS fail-closed behavior.
- **material Important uncertainty where ON_TRACK/AHEAD co-priority could change:** CLEARS fail-closed behavior.

However, historical P01 cannot be treated as fully closed because FFH-017-P02 demonstrates the opposite overcorrection: the implementation now continues a known OUTRANK allocation even when the material unknown can change that same OUTRANK scarcity result.

## R02 — exact non-tied recurring retirement reconciliation

**CLEARS.**

The frozen target converts verified annual legal room to recurring monthly authority by integer cents:

- annual legal room is normalized to cents;
- recurring monthly cents are `floor(annualCents / 12)`;
- annual legal consumption is exactly `monthlyCents * 12`;
- the ledger consumption path verifies exact equality;
- annual residual cents remain explicit rather than being rounded into a phantom monthly cent.

Direct boundary evidence includes:

| Annual room | Monthly recurring authority | Annual consumed | Explicit residual |
|---:|---:|---:|---:|
| $0.06 | $0.00 | $0.00 | $0.06 |
| $0.11 | $0.00 | $0.00 | $0.11 |
| $0.12 | $0.01 | $0.12 | $0.00 |
| $0.13 | $0.01 | $0.12 | $0.01 |
| $0.23 | $0.01 | $0.12 | $0.11 |
| $0.24 | $0.02 | $0.24 | $0.00 |
| $0.25 | $0.02 | $0.24 | $0.01 |

The retirement-capacity prepass and actual Build router use the same recurring-capacity consumer for ordinary non-tied destinations. Tied spouse routing retains its exact recurring helper. No policy-level phantom legal authority was identified.

## R03 — desired/excess recurring tranche

**CLEARS.**

The frozen target now emits separate goal tranches:

- `core`;
- `desired_excess`.

Desired/excess:

- is emitted only when its principal is known and positive;
- is always `BELOW`;
- never inherits the core tranche's OUTRANK/CO_PRIORITY classification;
- is allocated only after OUTRANK, the true CO_PRIORITY bucket, and additional retirement;
- remains null/unresolved rather than fabricated when no usable recurring pace exists.

Required scenarios clear:

### Core already satisfied

Target $15,000, core $5,000, eligible saved $6,000, remaining target $9,000, remaining core $0, 10 periods:

- core recurring request: $0;
- desired/excess request: $900/month;
- retirement: $400/month;
- capacity: $1,500/month;
- retirement receives $400 first;
- desired/excess receives $900;
- $200 remains.

### Mixed core + retirement + excess

Target $12,000, core $6,000, 10 periods, no current funding:

- core request: $600/month;
- core disposition: OUTRANK;
- additional retirement: $400/month;
- desired/excess: $600/month BELOW;
- capacity: $1,600/month;
- result: **$600 + $400 + $600 = $1,600 exactly**;
- residual: $0.

## FFH-D004 disposition and scenario coverage

### OUTRANKS_ADDITIONAL_RETIREMENT

**CLEARS for complete authoritative facts.**

Confirmed Essential core with known amount/pacing and the required urgency + harm receives recurring capacity before additional retirement. Multiple known OUTRANK tranches retain deterministic financial ordering.

**Blocked only by FFH-017-P02 when a materially unresolved Essential tranche can itself alter scarce OUTRANK ordering.**

### CO_PRIORITY_WITH_ADDITIONAL_RETIREMENT

**CLEARS.**

- Essential Limited/Moderate+ cases enter true co-priority under the approved rule.
- Important is BELOW when retirement is BEHIND.
- Important ON_TRACK/AHEAD enters co-priority only for the narrow confirmed preservation/mixed + Fixed/Limited + High/Critical case.
- Sufficient capacity fulfills all requests.
- Scarce capacity applies one common fulfillment ratio across additional retirement and every co-priority core request.
- User priority does not distort proportional co-priority shares.

### BELOW_ADDITIONAL_RETIREMENT

**CLEARS.**

- Optional/lifestyle remains BELOW.
- Important BEHIND remains BELOW.
- weak/flexible confirmed Essential/Important cases remain BELOW where policy requires.
- desired/excess is always BELOW.
- additional retirement is allocated before BELOW tranches.

### MORE_INFORMATION_NEEDED

**CLEARS in standalone and lower-bucket cases, but DOES NOT FULLY CLEAR because of FFH-017-P02.**

The implementation does not invent missing core amounts or paces and correctly keeps materially unresolved co-priority/retirement tradeoffs fail-closed. The remaining failure is the premature allocation of known OUTRANK capacity before checking whether a material Essential unknown can alter that same OUTRANK scarcity result.

## Protected retirement floor / Secure boundary

**CLEARS.**

Build computes the Phase 5A protected retirement-floor shortfall before Phase 5C competition, allocates the legally routable protected floor first, subtracts it from contestable recurring capacity, and sets ordinary competition capacity to zero when a protected-floor shortfall remains unresolved.

Ordinary goals therefore cannot raid the protected retirement floor.

Secure-stage recommendations remain upstream of final Build and Build receives only the recurring capacity remaining after Secure.

## Goal core / desired solution / current funding

**CLEARS.**

- remaining core and remaining target are distinct;
- eligible current goal balance satisfies core first for priority analysis;
- current balance reduces residual principal;
- scheduled/planned future goal contributions do not reduce current principal;
- prior recommendations do not mutate future financial facts;
- full desired target is not assumed core when core amount is unknown.

## Multiple goals / determinism / user preferences

**CLEARS except FFH-017-P02.**

- financially equivalent input reversal preserves material allocation;
- integer-cent common fulfillment is deterministic;
- stable identity resolves only unavoidable final-cent ties;
- user priority appears only after approved financial ordering factors for sequential goal ordering;
- user priority does not change necessity, core amount, deadline flexibility, consequence, debt exposure, cross-domain disposition, protected-floor status, legal capacity, or co-priority shares.

## Retirement-capacity preservation

### Factual YTD versus future schedules

**CLEARS.**

Closed FFH-013 semantics remain preserved: factual YTD is historical fact; future monthly schedules are planning reservations. A schedule is not relabeled as YTD.

### Scheduled capacity no-reuse

**CLEARS.**

Scheduled reservations reduce the authoritative retirement-capacity ledger once. Existing Cash, Secure, Build, and Windfall consume the remaining ledger rather than recreating annual room.

### Multiple retirement accounts / shared owner capacity

**CLEARS.**

Traditional + Roth IRA records for one owner do not multiply owner IRA room. Shared capacity groups remain authoritative.

### Spouse/shared IRA

**CLEARS.**

MFJ shared-compensation capacity remains conditional/non-additive and exact. Person/account reordering does not create substantive spouse priority.

### Existing Cash -> Secure -> Build -> Windfall

**CLEARS.**

The engine carries one authoritative retirement-capacity ledger across Existing Cash, final Secure, and final Build. Windfall starts from a clone of the final engine ledger, preserving prior scheduled/one-time/Secure/Build consumption.

### Roth eligibility / Traditional deductibility

**CLEARS.**

Direct Roth eligibility and Traditional IRA deductibility remain separate account-level tax semantics; Phase 5C does not collapse or redefine them.

### SIMPLE

**CLEARS.**

Standard versus verified higher SIMPLE categories, age-band catch-up behavior, conservative stale/unknown authority handling, and unrelated 401(k) capacity remain preserved.

### HSA

**CLEARS.**

Period-aware HSA eligibility, tax-year-bound YTD, Medicare/last-month-rule handling, married-family sharing, legal-spouse authority, catch-up ownership, and targeted missing-information behavior remain preserved.

### Workplace retirement

**CLEARS.**

Existing workplace contribution-capacity semantics and employer-match Secure protection remain outside ordinary goal competition.

## Protected FFH-013 M01 regression

**CLEARS exactly.**

At frozen target `90a31c755ea88310e58bb9e06ade60af73e182f5`:

- shared annual room: **$10,000.01**;
- owner conditional room: **$7,500 each**;
- Build authority: **$833.33/month**;
- route A: **$416.67/month**, annual legal consumption **$5,000.04**;
- route B: **$416.66/month**, annual legal consumption **$4,999.92**;
- aggregate recurring allocation: **$833.33/month**;
- aggregate annual legal consumption: **$9,999.96**;
- shared annual remainder: **$0.05**.

Account-order reversal preserves the aggregate and material outcome. The shared ledger invariant holds without epsilon/tolerance or hidden residual suppression.

## Recommendations versus execution

**CLEARS.**

Build outputs modeled recommendations/allocations. No audited Phase 5C calculation mutates a persisted contribution or goal funding event. Actual later financial facts, not a recommendation, reduce principal/YTD in future snapshots.

## Financial Engine Reconciliation Gate

From the Financial Policy & Scenario lane:

**CLEARS all reviewed monetary/legal-capacity boundaries except the FFH-D004 missing-information policy gate described in FFH-017-P02.**

Verified preserved behavior:

- protected floor remains outside ordinary competition;
- aggregate retirement allocation equals concrete retirement destinations;
- R02 recurring monthly authority cannot exceed exact annual legal consumption;
- shared/owner capacity is not additive;
- scheduled capacity is consumed once;
- staged consumers do not recreate prior capacity;
- M01 preserves exact cents and explicit residual;
- co-priority cents reconcile exactly;
- no material input-order priority;
- no unknown goal dollar is invented;
- desired excess is separately represented and retirement-junior.

FFH-017-P02 prevents the overall Phase 5C policy gate from passing because an actionable goal allocation can still be asserted from capacity that is not independent of a materially unresolved Essential competitor.

## Provenance and validation

- Manager control-plane head verified: `f0e9825f17144b9f24fafbbe1a97816051dec8b9`.
- Assigned audit branch was verified at the same exact starting SHA immediately before audit writes.
- Frozen target: `90a31c755ea88310e58bb9e06ade60af73e182f5`.
- PR #28 final head: `401204a34ec8ddf2305e073a1938f3cfb27a8900`.
- Independent compare final PR head -> frozen integration: **zero changed files**.
- Foundation CI run `35297206526` is successful on exact frozen SHA `90a31c755ea88310e58bb9e06ade60af73e182f5`.
- Job `105452111495` completed all recorded required gates successfully: install, AI-state validation, dependency audit, calculations, security contract, typecheck, lint, build.
- Green CI was treated as supporting evidence, not proof.

No production implementation, accepted financial policy, task state, merge state, downstream activation, or Supabase/live-data state was changed by this audit lane.

## Finding summary

| ID | Severity | Result |
|---|---|---|
| FFH-017-P02 | HIGH | Blocking — known OUTRANK capacity is allocated before a material unresolved Essential tranche is checked, even when resolution of that tranche can change scarce Bucket-1 OUTRANK ordering and therefore the known goal's entitlement. |

No additional Financial Policy & Scenario finding was identified on this frozen target.

## Manager closure status

**BLOCKED from the Financial Policy & Scenario lane.**

Do not close FFH-017 or activate downstream work on frozen target `90a31c755ea88310e58bb9e06ade60af73e182f5`.

Manager should route a narrowly scoped remediation for FFH-017-P02, freeze a new exact implementation target, and require fresh independent audit. Manager retains sole authority for acceptance, merge/closure state, reconciliation with the separate Technical & Mathematical audit, and downstream activation.
