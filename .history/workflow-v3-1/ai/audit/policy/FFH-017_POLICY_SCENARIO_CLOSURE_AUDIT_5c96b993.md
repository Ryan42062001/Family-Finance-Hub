# FFH-017 — Fresh Independent Financial Policy & Scenario Closure Audit — 5c96b993

- Role: Financial Policy & Scenario Auditor
- Execution mode: `STANDARD_CHAT_HIGH`
- Audit lane: fresh independent closure audit
- Assigned audit branch: `audit/ffh-017-policy-5c96b993`
- Manager control-plane head verified at audit start and immediately before audit write: `84a5ce450618b25a1a90bc798361e7a87c3b8d49`
- Exact frozen implementation target: `5c96b99373c7c2593fbbb5766b109347f1588fcd`
- Frozen packet: `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_5c96b993.md`
- Historical failed targets used only as closure-history evidence:
  - `9d3a880e02365b4445b8070344c72c928ca34511`
  - `90a31c755ea88310e58bb9e06ade60af73e182f5`
  - `c009a8c22d92715696018c7089eb5ad1a79a3cf1`
- The Technical & Mathematical Auditor's current closure-audit conclusions/verdict were not requested, inspected, consulted, copied, or relied upon.

## Final verdict

**FAIL — REMEDIATION REQUIRED**

R05 closes the unresolved-necessity potential-OUTRANK policy boundary and R06 closes FFH-017-P03's invariant retirement/co-priority defect. One narrower blocking missing-information locality defect remains in Bucket 3.

## Finding FFH-017-P04

**MEDIUM — Bucket-3 BELOW-only uncertainty suppresses a provably safe partial allocation to a known lower-ranked BELOW goal.**

### Accepted policy boundary

FFH-D004 rule 14 requires:

> Missing evidence blocks only the contested tradeoff that depends on it; contested capacity remains explicitly unresolved rather than silently assigned to retirement or goals.

The accepted Goals policy further requires:

- `more_information_needed` blocks only the classification/allocation that depends on the missing fact;
- conservative uncertainty leaves only **contested** capacity unresolved;
- unrelated retirement and goal allocations continue.

The accepted multi-goal policy defines Bucket 3 as deterministic lexicographic goal ordering after retirement/co-priority demands.

The frozen audit packet makes the R06 BELOW-only requirement explicit:

> a known BELOW allocation may consume only capacity proven independent of a stronger unresolved below-only claimant; do not globally freeze unrelated residual capacity.

The same bounded-independence principle is already accepted and implemented for Bucket 1: a known OUTRANK request may receive a safe partial allocation while a bounded stronger unresolved claimant retains the contested reserve.

### Frozen implementation behavior

For material unresolved goals that can resolve only to `BELOW`, the frozen allocator computes a bounded maximum request and compares the unresolved peer's strongest possible BELOW ordering against each known BELOW goal.

For a known BELOW goal, it calculates:

`independentCapacity = stableBelowCapacity - reservedForHigherPotentialBelow`

But if that independent capacity is positive yet smaller than the known goal's full request, the code executes:

`if (independentCapacity < requested) break;`

and allocates **$0** to that known goal.

That converts a partially contested request into a fully frozen request. The positive independently safe portion is left unresolved even though no supported resolution can take it away from the known goal.

### Adversarial scenario

All higher-order retirement/co-priority demands are verified.

Recurring Phase 5C capacity: **$250/month**.

Additional retirement request: **$100/month**.

After retirement, Bucket-3 capacity is therefore **$150/month**.

Goal U — unresolved stronger potential BELOW claimant:
- confirmed/non-legacy row;
- necessity: `unknown`;
- nature: Improvement;
- deadline flexibility: Flexible;
- consequence: Low;
- debt exposure: None;
- remaining core need: **$1,200**;
- months remaining: **12**;
- recurring core pace: **$100/month**;
- disposition today: `MORE_INFORMATION_NEEDED` because necessity is unknown.

Every supported resolution of necessity remains BELOW:
- Essential -> BELOW because urgency/harm/co-priority conditions are not met;
- Important -> BELOW because Improvement/Flexible/Low is explicitly retirement-junior;
- Optional -> BELOW by rule.

The strongest supported Goal-U ordering is financially ahead of a known Optional BELOW goal, so reserving up to Goal U's known $100 request is appropriate.

Goal K — known lower-ranked BELOW:
- confirmed Optional/lifestyle;
- known $100/month recurring request.

With $150 Bucket-3 capacity and Goal U bounded at $100:

- if U ranks ahead of K, U can take at most $100 and K still has **$50**;
- if U ranks behind K, K can receive its full $100;
- therefore **at least $50/month for K is independent of the unresolved necessity fact**.

The correct conservative result is:
- reserve the contested $100 maximum for U;
- allow K to receive the independently safe **$50**;
- leave the remainder of K's request unresolved.

The frozen implementation instead:
- computes the $50 independent capacity;
- sees that $50 < K's $100 request;
- breaks;
- allocates K **$0**;
- leaves the full $150 Bucket-3 capacity unresolved.

This is broader than FFH-D004 permits and fails the frozen packet's explicit BELOW-only locality requirement.

### Why this is blocking

The defect is conservative:
- no unknown amount is invented;
- no retirement/legal room is overstated;
- no protected retirement floor is raided;
- no unsafe higher-priority dollar is routed away.

Therefore severity is **MEDIUM**, not HIGH.

It is nevertheless blocking because:
- missing-information locality is an approved Phase 5C policy rule;
- the frozen packet explicitly requires BELOW-only independent capacity to continue;
- the implementation knowingly identifies positive independent capacity but suppresses it solely because it cannot satisfy the full known request;
- this is the same class of global-overfreeze defect previously treated as closure-blocking, now narrowed to partial Bucket-3 funding.

### Required remediation boundary

Do not weaken the unresolved-peer reserve and do not assign unknown Goal-U ranking or classification as fact.

For a known BELOW goal:

1. calculate the supported maximum demand of any unresolved financially senior BELOW-only claimant;
2. preserve that reserve;
3. allocate up to the **independently safe partial amount** of the known goal, not only when its full request fits;
4. stop lower-ranked known BELOW allocations once no independent capacity remains;
5. keep the unresolved peer itself at `MORE_INFORMATION_NEEDED` unless its actual classification is known;
6. do not invent necessity, amount, pace, or ordering.

Minimum regression:

- $250 total capacity;
- $100 verified retirement;
- unresolved necessity-unknown Improvement/Flexible/Low/NONE goal with known $100 pace and all supported resolutions BELOW;
- known lower-ranked BELOW request $100;
- expected known BELOW allocation: **$50**;
- unresolved peer allocation remains $0 / `MORE_INFORMATION_NEEDED`;
- remaining capacity preserves the $100 unresolved reserve exactly.

Add a control where no independent Bucket-3 capacity exists and the known lower-ranked BELOW goal correctly remains $0.

## R06 / FFH-017-P03 closure

**CLEARS.**

The former blanket material-missing return has been replaced by supported-resolution locality analysis.

### P03 direct scenario

Capacity $500:
- known OUTRANK $200;
- retirement request $100;
- unresolved Important goal with known $100 pace and only nature unknown.

After Bucket 1, all supported Important resolutions allow the full $100 retirement request:
- Preservation/Mixed -> CO_PRIORITY and both $100 requests fit;
- Improvement -> retirement remains senior and receives $100.

Frozen target now allocates:
- known OUTRANK: $200;
- retirement: **$100**;
- unresolved Important allocation: $0;
- residual: $200.

**CLEARS.**

### No-OUTRANK P03 form

Capacity $600:
- retirement request $500;
- unresolved Important goal with known $100 pace and only nature unknown.

Every supported resolution allows retirement $500 in full.

Frozen target now allocates retirement **$500** and leaves the goal unresolved.

**CLEARS.**

### Scarce possible-CO_PRIORITY form

Capacity $500:
- retirement request $500;
- unresolved Important goal with known $100 pace and a supported CO_PRIORITY resolution.

Retirement's exact share can change if the goal becomes CO_PRIORITY.

Frozen target correctly keeps the retirement share unresolved rather than presenting a falsely final amount.

**CLEARS.**

### Mixed unresolved senior-demand form

Potential OUTRANK demand is reserved before lower-bucket invariance testing. Verified retirement/known co-priority dollars proceed only from capacity left after the supported senior reserve.

**CLEARS.**

FFH-017-P04 concerns only partial-independent allocation inside the BELOW bucket.

## R05 policy boundary

**CLEARS.**

A confirmed non-legacy goal with `necessity = unknown` is now treated as a potential Essential/OUTRANK peer when its other authoritative facts permit that supported resolution.

Verified behavior:

- known Essential/Fixed/High $200 request;
- unresolved necessity-unknown Fixed/Critical $200 peer;
- $200 capacity.

The known High goal receives $0 definite contested allocation until necessity resolves.

Negative control:
- necessity unknown;
- Flexible/Low/None facts;
- OUTRANK impossible under every supported resolution.

The independent known OUTRANK proceeds.

Unknown necessity remains unknown in the returned tranche; no unknown classification is assigned as authoritative fact.

## R04 preservation

**CLEARS.**

- stronger unresolved Essential potential-OUTRANK demand reserves contested Bucket-1 capacity;
- provably non-OUTRANK Essential uncertainty does not suppress independent known OUTRANK;
- senior known OUTRANK proceeds ahead of lower-ranked unresolved potential claimant;
- bounded higher-ranked unresolved peer reserves only its supported maximum;
- partial-independent Bucket-1 allocation remains supported;
- no unknown core amount or recurring pace is funded as fact.

## R02 preservation

**CLEARS.**

Frozen retirement-capacity code continues to derive full-year recurring authority from integer annual cents and requires exact annual reconciliation.

Preserved boundaries include:
- $0.06 annual room -> $0.00/month;
- $0.11 -> $0.00/month;
- $0.12 -> $0.01/month;
- $0.13 -> $0.01/month with $0.12 annual consumption and $0.01 residual;
- no monetary epsilon/tolerance waiver;
- no hidden positive-residual clamp.

## R03 preservation

**CLEARS.**

Core and desired-solution excess remain separate tranches.

Desired excess:
- stays `BELOW`;
- never inherits core OUTRANK/CO_PRIORITY status;
- remains retirement-junior;
- consumes only residual capacity after senior demands.

Protected mixed scenario remains exact:
- core: $600/month;
- additional retirement: $400/month;
- desired excess: $600/month;
- capacity: $1,600/month;
- exact total allocation: **$1,600**;
- residual: $0.

Core-satisfied Scenario-8 desired excess remains a separate BELOW tranche.

## Other policy/scenario preservation

**CLEARS absent FFH-017-P04:**

- recurring Build-only competition;
- Secure protections remain upstream;
- protected Phase 5A retirement floor remains outside ordinary goal competition;
- ordinary goals cannot raid the protected floor;
- complete-fact OUTRANK / CO_PRIORITY / BELOW classification;
- true co-priority equal-fulfillment behavior;
- odd-cent / one-cent deterministic reconciliation;
- user priority remains subordinate to approved financial evidence;
- factual YTD remains distinct from future schedules;
- scheduled retirement capacity is not reused;
- multiple retirement accounts do not multiply owner/shared legal room;
- spouse/shared IRA semantics remain non-additive;
- Existing Cash -> Secure -> Build -> Windfall uses one staged capacity ledger;
- Roth eligibility remains distinct from Traditional deductibility;
- SIMPLE / HSA / workplace-retirement semantics remain unchanged;
- recommendations/plans remain distinct from execution;
- unknown core amount, pace, necessity, or classification is not silently fabricated.

## Protected FFH-013 M01

**CLEARS exactly.**

At frozen target `5c96b99373c7c2593fbbb5766b109347f1588fcd`:

- shared annual room: **$10,000.01**;
- owner conditional room: **$7,500 each**;
- Build authority: **$833.33/month**;
- route A: **$416.67/month**, annual **$5,000.04**;
- route B: **$416.66/month**, annual **$4,999.92**;
- aggregate annual legal consumption: **$9,999.96**;
- shared annual remainder: **$0.05**.

Account-order reversal remains pinned and the retirement-capacity invariant remains asserted.

## Financial Engine Reconciliation Gate

**CLEARS arithmetic/legal-capacity reconciliation; DOES NOT CLEAR overall policy locality because of FFH-017-P04.**

Verified:
- authoritative recurring unit remains integer monthly cents;
- aggregate allocation + residual equals available capacity exactly;
- retirement aggregate routes to concrete destinations exactly when retirement is allocated;
- annual/monthly retirement conversion reconciles exactly;
- no over-route;
- no hidden positive residual suppression;
- no financial epsilon/tolerance waiver;
- deterministic final-cent behavior remains intact;
- shared/owner/scheduled/staged capacity is not reused;
- protected retirement floor remains protected.

FFH-017-P04 is a policy-locality under-allocation defect, not an arithmetic reconciliation defect.

## Provenance / validation

- Manager control-plane head: `84a5ce450618b25a1a90bc798361e7a87c3b8d49`.
- Assigned audit branch verified at that same exact start checkpoint before audit writes.
- Exact frozen financial target: `5c96b99373c7c2593fbbb5766b109347f1588fcd`.
- Final PR #32 head: `be34ce35b64d0a0512b8913e2d65fa779d013db7`.
- Independent final-head -> integration compare: **zero changed files**.
- R05/R06 production/test scope is limited to:
  - `lib/calculations/money-priority-build-competition.ts`;
  - `lib/calculations/ffh-017-audit-remediation.test.ts`.
- Exact integration Foundation CI run `35305470058`, job `105476660670`: SUCCESS.
- Frozen packet records:
  - calculations: 914/914 PASS;
  - security: 21/21 PASS;
  - AI-state validation PASS;
  - dependency audit 0 vulnerabilities;
  - typecheck PASS;
  - lint PASS;
  - build PASS.
- Green CI was treated as supporting evidence, not policy proof.

The required BELOW-only partial-independent adversary is not directly represented by the frozen R05/R06 test additions, which is why the 914-test suite can remain green while FFH-017-P04 persists.

No production code, accepted policy, task state, merge state, downstream activation, or Supabase/live-data state was modified by this audit lane.

## Finding summary

| ID | Severity | Result |
|---|---|---|
| FFH-017-P04 | MEDIUM | Blocking — Bucket-3 BELOW-only uncertainty suppresses a positive partial allocation already proven independent of a stronger unresolved BELOW-only claimant. |

No other Financial Policy & Scenario finding was identified on this frozen target.

## Manager closure status

**BLOCKED from the Financial Policy & Scenario lane.**

Do not close FFH-017 or activate downstream work on frozen target `5c96b99373c7c2593fbbb5766b109347f1588fcd`.

Manager should route a narrowly scoped Bucket-3 partial-locality remediation, preserve the now-correct R05/R06/R04/R03/R02 behavior and M01 pin, freeze a new exact target, and require fresh independent closure audit.
