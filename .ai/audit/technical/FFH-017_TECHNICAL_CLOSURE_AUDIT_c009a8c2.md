# FFH-017 — Fresh Technical & Mathematical Closure Audit — `c009a8c2`

**Role:** Technical & Mathematical Auditor  
**Execution mode:** STANDARD_CHAT_HIGH  
**Exact frozen implementation audited:** `c009a8c22d92715696018c7089eb5ad1a79a3cf1`  
**Manager/control-plane audit base verified:** `0cee62f328c179906669e830e307348952261011`  
**Assigned audit branch:** `audit/ffh-017-technical-c009a8c2`  
**Frozen packet:** `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_c009a8c2.md`

## Verdict

**FAIL — REMEDIATION REQUIRED**

The R04 implementation correctly closes the previously reported known-OUTRANK versus unresolved-**Essential** core-amount boundary, preserves R02/R03 and the protected FFH-013 M01 path, and retains exact reconciliation behavior.

However, one material R04 blind spot remains: `canResolveToOutrank()` only treats a missing-data peer as a potential OUTRANK peer when its **current derived necessity is already `essential`**. A reachable, non-legacy, Goal-Intelligence-confirmed goal may instead have `necessity = "unknown"`; that missing necessity is itself material evidence and may later resolve to Essential. If its already-known urgency/harm and recurring-core facts would then make it a financially senior OUTRANK request, the current allocator does not reserve its contested Bucket-1 capacity.

No new Financial Policy & Scenario Auditor closure conclusion or verdict was requested, inspected, copied, or used.

## Target custody / GitHub evidence

Fresh repository/GitHub verification established:

- live milestone/control-plane head at audit start: `0cee62f328c179906669e830e307348952261011`;
- assigned Technical audit branch was **identical** to that checkpoint before audit writes;
- PR #31: merged;
- PR #31 accepted final head: `381413b76799bd56caa2a9ce31717d9c9efca637`;
- frozen integration / merge SHA: `c009a8c22d92715696018c7089eb5ad1a79a3cf1`;
- independent accepted-head -> integration comparison: **zero changed files**;
- exact integration Foundation CI: run `35303342028`, job `105470402709`, SUCCESS;
- exact integration calculation log: **909 tests / 909 pass / 0 fail**;
- security contract: **21 tests / 21 pass / 0 fail**;
- production dependency audit: 0 vulnerabilities;
- AI-state validation, typecheck, lint, and build completed successfully.

Green CI was treated as evidence, not proof.

## Finding summary

| ID | Severity | Status | Result |
|---|---|---|---|
| TMA-017-06 | **HIGH** | **OPEN / BLOCKING** | R04 potential-OUTRANK detection excludes a confirmed non-legacy peer whose necessity is materially unknown but can resolve to Essential and become a senior OUTRANK claimant. |

No CRITICAL finding was identified. No additional MEDIUM or LOW finding was identified.

## TMA-017-06 — HIGH — missing necessity can still change scarce OUTRANK ownership

### Accepted semantic boundary

The frozen packet requires R04 to handle any unresolved material core tranche that can validly resolve into OUTRANK in a way that changes:
- Bucket-1 entitlement;
- financial ordering;
- scarce-capacity ownership.

FFH-D004 also requires:
- OUTRANK only for Essential core need when the required evidence is established;
- deterministic lexicographic ordering for multiple OUTRANK tranches;
- missing evidence to leave the contested tradeoff unresolved rather than assigning it silently.

The Goal Intelligence model explicitly supports:
- `GoalNecessity = "essential" | "important" | "optional" | "unknown"`;
- `goalIntelligenceConfirmed = true` while an individual field such as necessity is still `"unknown"`;
- targeted missing data: "The importance of the underlying need is required."

Therefore `necessity = "unknown"` is not synonymous with legacy-unconfirmed. It is a reachable material-fact state.

### Frozen R04 implementation

`canResolveToOutrank(goal)` begins:

```ts
if (isLegacyUnconfirmedGoal(goal) || goal.necessity !== "essential") return false;
```

So every non-legacy material peer with `necessity === "unknown"` is excluded from `potentialOutrankPeers`.

By contrast, `strongestPotentialOutrankOrdering()` conservatively resolves other unknown dimensions:
- unknown deadline flexibility -> fixed;
- unknown consequence -> critical;
- unknown debt exposure -> high;
- unknown nature -> preservation;
- unknown/invalid months -> one-month strongest ordering.

It does not resolve unknown necessity to Essential because the earlier guard excludes the peer.

### Reachable adversary

Use **$200/month** scarce Phase-5C recurring capacity.

#### Goal A — known OUTRANK
- Goal Intelligence confirmed;
- necessity = Essential;
- deadline = Fixed;
- consequence = High;
- core monthly request = $200;
- disposition = OUTRANKS.

#### Goal B — confirmed but necessity materially unknown
- Goal Intelligence confirmed;
- necessity = Unknown;
- deadline = Fixed;
- consequence = Critical;
- core amount and recurring pace are known at $200/month;
- non-legacy;
- missing data includes that importance/necessity evidence is required;
- current disposition = MORE_INFORMATION_NEEDED.

Goal B is a material missing-data tranche and its current request amount is known. But R04 does not include it in `potentialOutrankPeers` because necessity is not already Essential.

Frozen allocation therefore:
1. sees no higher potential OUTRANK peer;
2. allocates Goal A's full $200 as definite;
3. only afterward returns `more_information_needed` because Goal B remains materially unresolved;
4. leaves $0 capacity unassigned.

Now resolve only Goal B's missing necessity fact to Essential.

With the already-known Fixed/Critical evidence and known recurring core pace:
- Goal B becomes OUTRANKS;
- both goals are Essential + Fixed;
- Critical consequence ranks ahead of High under the accepted lexicographic order;
- Goal B is therefore entitled to scarce Bucket-1 capacity before Goal A.

The prior $200 allocation to Goal A was not independent of the missing necessity fact.

### Why this is blocking

The implementation still assigns capacity whose financial owner/order can change when a material fact resolves.

This is the same class of correctness risk R04 was intended to eliminate, but on a different unresolved input dimension.

The defect is narrow:
- it does **not** require restoring the historical global freeze;
- Optional/lifestyle unknowns remain local;
- legacy-unconfirmed goals remain local;
- Important goals still cannot OUTRANK in V1;
- lower-ranked potential-OUTRANK peers should remain local to senior known OUTRANK allocations.

The missing case is a **confirmed, non-legacy necessity-unknown peer that can resolve to Essential and enter OUTRANK**.

## Required bounded remediation behavior

A potential-OUTRANK check must cover every non-legacy material peer whose unresolved facts can validly produce an Essential OUTRANK result, including unresolved necessity itself.

No unknown necessity/core amount/pace may be assigned as fact.

The allocator only needs a conservative bound sufficient to establish which current cents are independent of that possible resolution.

Direct regression required:
- known Essential/Fixed/High OUTRANK A requesting $200;
- confirmed non-legacy B with necessity Unknown, Fixed/Critical, known $200 core pace;
- capacity $200;
- A must not receive a definite contested $200 before B's necessity resolves.

Also preserve a negative control where necessity uncertainty cannot produce OUTRANK because known urgency/harm facts make OUTRANK impossible.

## R04 direct adversaries re-checked

### 1. Existing blocking Essential/core-amount adversary
**CLEARS.**

Known Essential/Fixed/High A versus unresolved Essential/Fixed/Critical B:
- B is included in `potentialOutrankPeers`;
- B's bounded possible request is reserved;
- A receives no contested allocation under $200 scarcity.

### 2. Essential peer provably unable to OUTRANK
**CLEARS.**

Known Limited/Moderate/none facts make OUTRANK impossible; independent known OUTRANK may proceed.

### 3. Important unresolved peer
**CLEARS.**

Important never OUTRANKS in FFH-D004 V1, so it does not block an independent OUTRANK. The later material-missing return still prevents the affected CO_PRIORITY/retirement tradeoff from being assigned.

### 4. Optional/lifestyle uncertainty
**CLEARS.**

Optional remains BELOW additional retirement and does not restore global freeze.

### 5. Legacy-unconfirmed uncertainty
**CLEARS.**

Legacy-unconfirmed goals receive no new Phase-5C elevation and do not block verified independent allocations.

### 6. Senior known OUTRANK ahead of lower-ranked unresolved Essential potential OUTRANK
**CLEARS.**

`strongestPotentialOutrankOrdering()` and the lexicographic comparator correctly permit the provably senior known OUTRANK to proceed.

### 7. Bounded higher-ranked unresolved Essential peer
**CLEARS.**

Maximum possible recurring core demand is bounded from authoritative remaining-target/core and month facts. Only that bound is reserved.

### 8. Partial-independent $250 / $200 / $100 boundary
**CLEARS mathematically.**

With:
- capacity = 25000 cents;
- known request = 20000 cents;
- higher unresolved maximum = 10000 cents;

the implementation computes:
- guaranteed independent = 25000 - 10000 = 15000 cents;
- known definite allocation = $150;
- $100 remains unresolved.

### 9. Unknown core amount / pace fabrication
**CLEARS for the R04 Essential-core path.**

The unresolved peer's actual `requestedMonthlyAmount` remains null. The maximum possible request is internal bounding evidence only.

## R02 preservation

**CLEARS.**

R04 did not modify the R02 retirement-capacity implementation.

Exact boundaries remain:
- $0.06 annual -> $0.00/month, $0.06 residual;
- $0.11 -> $0.00/month, $0.11 residual;
- $0.12 -> $0.01/month, $0.00 residual;
- $0.13 -> $0.01/month, $0.01 residual;
- $0.23 -> $0.01/month, $0.11 residual;
- $0.24 -> $0.02/month, $0.00 residual;
- $0.25 -> $0.02/month, $0.01 residual.

The planner/prepass and actual router still use the same authoritative recurring-capacity helper, and monthly cents × 12 reconcile exactly to annual ledger consumption.

## R03 preservation

**CLEARS.**

R04 does not modify the core/desired-excess architecture.

Desired excess remains:
- a distinct tranche;
- always BELOW additional retirement;
- separate from core OUTRANK/CO_PRIORITY status;
- separately represented in recommendations.

Protected mixed case remains exact:
- core $600;
- additional retirement $400;
- desired excess $600;
- total $1,600;
- residual $0.

## Protected FFH-013 M01

**CLEARS EXACTLY.**

Retained integration regression proves:
- shared annual room = $10,000.01;
- owner conditional room = $7,500 each;
- Build authority = $833.33/month;
- routes = $416.67 + $416.66;
- annual legal consumption = $9,999.96;
- shared annual remainder = $0.05;
- reversed account order preserves the material result.

## Financial Engine Reconciliation Gate

**The exact-cent reconciliation mechanics CLEAR.**

Verified/preserved:
- authoritative recurring competition uses integer monthly cents;
- aggregate allocation + residual equals available capacity exactly;
- concrete retirement destinations equal the authoritative retirement aggregate;
- annual/monthly retirement conversion reconciles exactly;
- R02 prepass/router equivalence remains;
- no epsilon/tolerance is used as a reconciliation waiver;
- no positive monetary residual is silently clamped away;
- stable identity remains terminal/final-cent only after financial ordering;
- shared/owner/scheduled/staged retirement capacity is not reused;
- protected retirement floor remains protected;
- Existing Cash -> Secure -> Build -> Windfall custody remains conserved.

**FFH-017 nevertheless fails closure** because TMA-017-06 is an allocation-authority / missing-material-fact defect: exact cents are being assigned to a known OUTRANK claimant even though those cents are not proven independent of a missing fact that can change Bucket-1 ownership.

## Other regression preservation

No new regression was identified in:
- protected Phase 5A retirement floor;
- Roth direct eligibility versus Traditional IRA deductibility;
- SIMPLE;
- HSA;
- workplace retirement;
- spouse/shared IRA capacity;
- multiple-account nonmultiplication;
- YTD versus scheduled reservations;
- staged capacity no-reuse;
- recommendations versus execution.

Exact integration CI corroborates these retained surfaces.

## Independent checks performed

1. current control-plane / assigned-branch identity;
2. PR #31 final-head / integration custody;
3. zero-file-diff final-head -> frozen target;
4. exact integration CI and job steps;
5. integration calculation log 909/909;
6. integration security log 21/21;
7. R04 known High vs unresolved Essential Critical scarcity;
8. Essential provably non-OUTRANK locality;
9. Important unresolved locality;
10. Optional/lifestyle locality;
11. legacy-unconfirmed locality;
12. senior known Critical vs lower unresolved High;
13. bounded unresolved maximum request;
14. $250 partial-independent hand calculation;
15. no unknown core amount/pace fabrication;
16. **confirmed non-legacy necessity-unknown -> possible Essential OUTRANK adversary**;
17. R02 adjacent annual-cent boundaries;
18. R03 Scenario-8 / $1,600 exact mixed conservation;
19. FFH-013 M01 exact regression;
20. staged retirement-capacity / no-reuse regression evidence.

## Closure condition

FFH-017 **must not close** on this Technical audit.

Blocking finding:
- **TMA-017-06 — HIGH** — R04 fails to treat confirmed, non-legacy unresolved necessity as a potential Essential/OUTRANK dimension, allowing scarce Bucket-1 allocation before ownership is proven independent.

Manager should route one bounded remediation for this necessity-uncertainty boundary, establish a new frozen implementation target, and require the canonical fresh closure audit gate.

No production code, accepted policy, task/index state, merge state, downstream task activation, or Supabase/live-database state was changed by this audit.
