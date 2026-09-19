# FFH-017 — Fresh Technical & Mathematical Closure Audit — `b236239f`

**Task:** FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition  
**Role:** Technical & Mathematical Auditor  
**Execution mode:** STANDARD_CHAT_HIGH  
**Refresh mode:** Fast Refresh  
**Exact frozen financial target audited:** `b236239f2b364cd1e643d01af07d4b8d788ffdf9`  
**Manager/control-plane audit base verified:** `d60c6812de357e2fa31706d3323e6486f0daeff9`  
**Assigned audit branch:** `audit/ffh-017-technical-b236239f`  
**Frozen packet:** `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_b236239f.md`

## Verdict

**FAIL — REMEDIATION REQUIRED**

The R07 implementation closes the exact historical Technical finding `TMA-017-07` for unresolved **core** tranches and correctly implements R07-B positive partial-independent BELOW allocation.

However, one adjacent Bucket-3 missing-pace defect remains on the protected R03 desired-excess surface. A desired-excess tranche can be definitively `BELOW`, have positive remaining desired excess, and still have `requestedMonthlyAmount = null` because its usable period is unresolved. R07's new reservation analysis only enrolls unresolved core tranches, so such an unresolved desired-excess claimant can be omitted while a weaker known BELOW claimant consumes the same scarce Bucket-3 capacity.

No Manager acceptance conclusion was used as proof. No new Financial Policy & Scenario Auditor verdict or conclusion was requested, inspected, copied, or used.

## Custody / exact-target evidence

Fresh verification established:

- live Manager/control-plane checkpoint at audit start: `d60c6812de357e2fa31706d3323e6486f0daeff9`;
- assigned Technical audit branch was **identical** to that checkpoint before audit writes;
- exact frozen target: `b236239f2b364cd1e643d01af07d4b8d788ffdf9`;
- PR #34 is merged;
- PR #34 final accepted head: `f7a05dba598f7f0afe4cba25b83c248330348754`;
- accepted head -> integration comparison: **zero changed files**;
- validated R07 production/test checkpoint: `33bfa79fc1b3d7a6471b35cecc44dfb72d246906`;
- the R07 production file and R07 remediation-test blobs at the exact integration target are byte-identical to the validated production/test checkpoint;
- production CI run `35346849145`, job `105605334966` — SUCCESS;
- exact integration CI run `35372213554`, run #685, job `105688599976` — SUCCESS;
- exact integration calculations: **917 / 917 PASS**;
- exact integration security tests: **21 / 21 PASS**;
- AI-state validation, dependency audit, typecheck, lint, and build passed.

Green CI was treated as evidence only.

## Finding summary

| ID | Severity | Status | Result |
|---|---|---|---|
| TMA-017-08 | **MEDIUM** | **OPEN / BLOCKING** | R07 reserves unresolved definitive-BELOW **core** tranches but omits unresolved desired-excess BELOW tranches, allowing a weaker known Bucket-3 allocation to consume capacity that can later belong to the desired-excess claimant when its missing pace resolves. |

No CRITICAL, HIGH, or LOW finding was identified.

## Historical TMA-017-07 disposition

**CLOSED.**

The exact historical adversary now clears.

### R07-A exact adversary

Stronger unresolved claimant:
- Optional;
- Fixed;
- Critical;
- positive core principal;
- usable period missing;
- core recurring request = null;
- disposition = BELOW.

Weaker known claimant:
- Optional;
- Flexible;
- Low;
- known $100/month core request;
- disposition = BELOW.

Available Bucket-3 capacity:
- $100/month;
- retirement request = $0.

R07 now includes the stronger non-legacy, request-null, definitive-BELOW **core** tranche in `materialGoalAnalyses`, gives it a conservative maximum-demand bound for reserve evidence only, and leaves its actual request/allocation unresolved.

Result:
- stronger unresolved allocation = $0;
- weaker known allocation = $0;
- remaining capacity = $100;
- state = MORE_INFORMATION_NEEDED.

This closes `TMA-017-07` at the exact core-tranche boundary.

The ordering logic also correctly avoids fabricating a missing period as a stronger financial-rank fact: the unresolved source itself is used for BELOW ordering, while the one-month value is used only to bound possible demand.

## R07-B positive partial-independent allocation

**CLEARS.**

Required adversary:

- total Phase-5C capacity = $250;
- verified retirement request/allocation = $100;
- stronger unresolved BELOW-only maximum reserve = $100;
- weaker known BELOW request = $100.

Exact cent hand-check:

```text
available                     25,000 cents
retirement                   -10,000
stable Bucket-3 capacity      15,000
unresolved stronger reserve  -10,000
independent known-BELOW room   5,000
```

Therefore:
- retirement = $100;
- unresolved stronger claimant = $0 definite allocation;
- weaker known claimant = **$50** definite allocation;
- unresolved residual = $100;
- total definite allocation = $150;
- $150 + $100 residual = exactly $250.

The implementation uses:

```ts
independentCapacity =
  stableBelowCapacityCents
  - min(stableBelowCapacityCents, reservedForHigherPotentialBelow)

allocated = min(requested, independentCapacity)
```

It no longer requires the weaker full request to fit before allocating the independently safe partial amount.

The zero-independent-capacity control also clears:
- total $200;
- retirement $100;
- unresolved stronger reserve $100;
- weaker known allocation $0;
- residual $100.

## TMA-017-08 — MEDIUM — unresolved desired-excess claimant is outside R07 reservation analysis

### Reachable state

The protected R03 implementation intentionally creates a distinct desired-excess tranche:

```ts
const excessTranches = goalIntelligence.flatMap((goal) => {
  if (goal.remainingCoreNeedAmount === null) return [];
  const excess = max(0, remainingTarget - remainingCore);
  if (excess <= 0) return [];
  const requested = goalMonthlyPaces(goal).excess;
  return [{
    trancheType: "desired_excess",
    disposition: "BELOW",
    requestedMonthlyAmount: requested,
    ...
  }];
});
```

When:
- `remainingCoreNeedAmount` is known;
- positive desired excess remains;
- `monthsRemaining` is null or unusable;

`goalMonthlyPaces()` returns:

```ts
excess: remainingExcess <= 0 ? 0 : null
```

So a positive desired-excess tranche can be:
- definitively BELOW;
- request-null;
- locally unresolved.

### R07 enrollment gap

The new R07 set is:

```ts
const definitiveBelowRequestUnresolvedGoals = coreTranches.filter(...)
```

and `materialGoalAnalyses` is built from:
- material missing **core** tranches;
- definitive-BELOW request-unresolved **core** tranches.

Unresolved desired-excess tranches are present only in `localUnresolvedTranches`.

That affects the final plan state/missing-data text, but does not reserve Bucket-3 capacity ahead of weaker known BELOW requests.

### Exact adversary

Available recurring capacity:
- $100/month;
- additional retirement request = $0.

#### Goal A — stronger unresolved desired excess
Use a confirmed goal with:
- Essential necessity;
- Fixed deadline flexibility;
- Critical consequence;
- core already satisfied: `remainingCoreNeedAmount = 0`;
- positive remaining target/desired excess = $1,200;
- `monthsRemaining = null`.

Frozen behavior:
- Goal A core request = $0;
- Goal A desired-excess disposition = BELOW;
- Goal A desired-excess request = null;
- Goal A desired-excess is in `localUnresolvedTranches`;
- Goal A does **not** enter `materialGoalAnalyses`.

#### Goal B — weaker known BELOW
Use:
- Optional;
- Flexible;
- Low consequence;
- known positive core request = $100/month.

Frozen execution with Goal A unresolved:

1. `materialGoalAnalyses.length === 0`.
2. Execution follows the ordinary lower-bucket path.
3. The ordinary BELOW list filters for `requestedMonthlyAmount > 0`.
4. Goal A desired excess is omitted because its request is null.
5. Goal B receives the full **$100**.
6. The result is labeled MORE_INFORMATION_NEEDED because Goal A is locally unresolved, but Goal B's concrete $100 allocation is already emitted.

Now resolve only Goal A's missing usable period to 12 months.

Then:
- Goal A desired-excess request becomes $100/month;
- it remains BELOW additional retirement;
- Goal B remains BELOW;
- the code's own Bucket-3 comparator evaluates Goal A's Essential/Fixed/Critical source ahead of Goal B's Optional/Flexible/Low source;
- with only $100 capacity, Goal A receives $100 and Goal B receives $0.

Therefore Goal B's prior $100 allocation was not independent of Goal A's missing pace fact.

### Why this is blocking

This is a lower-bucket allocation-ownership defect, not an arithmetic-conservation failure.

It violates the preserved Phase-5C requirements that:
- desired excess is a real distinct recurring tranche;
- all remaining BELOW tranches use deterministic financial ordering;
- missing information leaves only the tradeoff it can change unresolved;
- one dollar cannot be assigned to a claimant before its ownership is proven independent of unresolved higher-ranked demand.

The defect does **not**:
- move desired excess above retirement;
- raid the Phase-5A retirement floor;
- alter legal retirement capacity;
- break exact cent conservation.

For that reason it is classified **MEDIUM**, matching the bounded lower-bucket impact of the historical TMA-017-07 class.

It is nevertheless closure-blocking because protected R03 desired-excess behavior is not fully safe under request-null missing-pace conditions.

### Required bounded remediation

Extend lower-Bucket unresolved-demand analysis to positive request-null desired-excess tranches where their known financial ordering can contest a weaker known BELOW allocation.

The fix should:
- keep desired excess BELOW additional retirement;
- never invent its missing recurring pace as fact;
- derive only a conservative supported maximum-demand bound for reserve analysis;
- reserve only capacity whose Bucket-3 ownership can change;
- preserve positive partial-independent allocation for weaker known goals;
- preserve unrelated capacity and avoid a global freeze.

A direct regression should cover the adversary above.

## R02 exact annual/monthly retirement reconciliation

**CLEARS.**

The authoritative retirement-capacity implementation is byte-identical to the previously cleared target.

Exact integration tests retain:

- $0.06 annual room -> $0.00/month; $0.00 consumed; $0.06 residual;
- $0.11 -> $0.00/month; $0.11 residual;
- $0.12 -> $0.01/month; $0.12 consumed; zero residual;
- $0.13 -> $0.01/month; $0.12 consumed; $0.01 residual;
- $0.23 -> $0.01/month; $0.12 consumed; $0.11 residual;
- $0.24 -> $0.02/month; $0.24 consumed; zero residual;
- $0.25 -> $0.02/month; $0.24 consumed; $0.01 residual.

The planner/prepass and router still use the same authoritative recurring-capacity helpers.

No unsupported full-year monthly pace is exposed.

## R03 core / desired-excess preservation

**Known-pace behavior CLEARS; missing-pace locality has TMA-017-08.**

The standard R03 protected cases remain correct:

### Scenario 8
- core satisfied;
- desired excess = $900/month;
- retirement = $400;
- capacity = $1,500;
- retirement = $400;
- desired excess = $900;
- residual = $200.

### Mixed exact case
- core = $600;
- retirement = $400;
- desired excess = $600;
- capacity = $1,600;
- total allocation = exactly $1,600;
- residual = $0.

Desired excess remains a distinct tranche and remains BELOW retirement.

The new finding is specifically the request-null desired-excess locality boundary.

## R04 bounded OUTRANK locality

**CLEARS.**

Exact integration CI passes retained direct regressions for:
- stronger unresolved Essential OUTRANK peer under scarcity;
- Essential uncertainty provably unable to OUTRANK;
- Important uncertainty not suppressing independent OUTRANK;
- senior known OUTRANK ahead of lower unresolved potential OUTRANK;
- bounded maximum reservation.

No R07 change weakens Bucket-1 protection.

## R05 unresolved necessity potential-OUTRANK protection

**CLEARS.**

Retained tests pass:
- confirmed necessity-unknown Fixed/Critical peer reserves scarce OUTRANK capacity;
- necessity-unknown peer that cannot become OUTRANK does not block independent known OUTRANK.

R07 does not modify this authority boundary.

## R06 invariant retirement / possible-CO_PRIORITY locality

**CLEARS.**

Retained integration regressions pass:

1. known OUTRANK + unresolved Important nature:
   - known OUTRANK $200;
   - retirement $100;
   - unresolved Important $0;
   - residual $200.

2. no-OUTRANK, all supported senior requests fit:
   - retirement remains invariant at $500;
   - unresolved goal remains $0;
   - residual $100.

3. scarce possible CO_PRIORITY:
   - retirement definite allocation remains $0;
   - contested $500 remains unresolved.

R07-B does not reopen the prior blanket-freeze error.

## Protected FFH-013 M01

**CLEARS EXACTLY.**

Exact integration CI passes the protected pin:

- shared annual room = **$10,000.01**;
- owner conditional room = **$7,500 each**;
- Build recurring allocation = **$833.33/month**;
- routes:
  - IRA A = **$416.67/month / $5,000.04 annual**;
  - IRA B = **$416.66/month / $4,999.92 annual**;
- routed annual total = **$9,999.96**;
- shared annual remainder = **$0.05**;
- reversed account order produces the same result;
- retirement-capacity invariant remains true.

The retirement-capacity, Build routing, and engine files are byte-identical to the previously cleared frozen target.

## Financial Engine Reconciliation Gate

**Exact arithmetic / ledger mechanics CLEAR.**

Independently verified for the R07 path:

- authoritative competition capacity is converted to integer cents;
- R07-A: $0 allocated + $100 residual = exactly $100;
- R07-B: $100 retirement + $50 known BELOW + $100 residual = exactly $250;
- zero-independent control: $100 retirement + $0 known BELOW + $100 residual = exactly $200;
- targeted missing-data path explicitly enforces:
  `totalAllocatedCents + remainingCents === availableCents`;
- no epsilon/tolerance reconciliation waiver is used;
- no positive monetary residual is hidden by a final clamp;
- unresolved reserves remain visible in `remainingMonthlyCapacity`;
- stable identity remains terminal after financial factors;
- ordinary retirement recurring conversion remains exact monthly-cents x 12 annual consumption;
- tied-spouse M01 routing remains exact;
- shared/owner/scheduled/staged capacity is not reused;
- Build and engine ledger paths are unchanged from the prior cleared target.

**Overall FFH-017 closure still fails** because TMA-017-08 is not a cent-conservation defect; it is an allocation-ownership defect. The dollars reconcile exactly, but a weaker known BELOW claimant can receive cents whose ownership depends on an unresolved stronger desired-excess request.

## Other protected regression surfaces

No separate regression was identified in:
- protected Phase-5A retirement floor;
- HSA;
- SIMPLE;
- workplace retirement;
- Roth eligibility versus Traditional deductibility;
- shared/spousal IRA conservation;
- multiple-account nonmultiplication;
- scheduled contribution reservation;
- Existing Cash -> Secure -> Build -> Windfall staged no-reuse;
- recommendation versus execution semantics.

The exact integration calculation/security suites corroborate these unchanged surfaces.

## Independent checks performed

1. audit branch / Manager checkpoint identity;
2. exact frozen target custody;
3. PR #34 final accepted head -> integration zero-file-diff check;
4. production/test blobs -> integration identity for R07 implementation/tests;
5. exact integration Foundation CI;
6. exact 917/917 calculation result;
7. exact 21/21 security result;
8. R07-A request-null definitive-BELOW core adversary;
9. R07-B $250 / $100 / $100 -> $50 partial-independent adversary;
10. R07-B zero-independent-capacity control;
11. closure of historical TMA-017-07;
12. R02 adjacent annual-cent boundaries;
13. R03 Scenario-8 desired-excess case;
14. R03 $1,600 mixed core/retirement/excess exact conservation;
15. R04 direct OUTRANK locality regressions;
16. R05 necessity-unknown OUTRANK regressions;
17. R06 invariant-retirement / possible-CO_PRIORITY regressions;
18. FFH-013 M01 exact shared-pool pin and reversal;
19. planner/router and staged ledger preservation;
20. **new unresolved desired-excess request-null Bucket-3 adversary**.

## Closure condition

FFH-017 **must not close** on this Technical audit.

Historical Technical finding:
- **TMA-017-07 — CLOSED** for the exact core-tranche boundary.

New blocking finding:
- **TMA-017-08 — MEDIUM** — request-null desired-excess BELOW tranches are outside R07's unresolved Bucket-3 reservation set, allowing a weaker known BELOW allocation before ownership is independent of the missing desired-excess pace.

Manager should route one bounded follow-up for desired-excess request-null Bucket-3 locality, establish a new frozen financial target, and require the canonical fresh closure audit gate.

No production code, accepted policy, Manager task/index state, merge state, downstream activation, or Supabase/live-database state was changed by this audit.
