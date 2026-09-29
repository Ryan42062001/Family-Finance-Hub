# FFH-017 — Fresh Technical & Mathematical Closure Audit — `5c96b993`

**Role:** Technical & Mathematical Auditor  
**Execution mode:** STANDARD_CHAT_HIGH  
**Exact frozen implementation audited:** `5c96b99373c7c2593fbbb5766b109347f1588fcd`  
**Manager/control-plane audit base verified:** `84a5ce450618b25a1a90bc798361e7a87c3b8d49`  
**Assigned audit branch:** `audit/ffh-017-technical-5c96b993`  
**Frozen packet:** `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_5c96b993.md`

## Verdict

**FAIL — REMEDIATION REQUIRED**

The R05 implementation closes prior Technical finding `TMA-017-06`: a confirmed, non-legacy `necessity = unknown` peer is now treated as a possible Essential/OUTRANK claimant when known urgency/harm facts permit that supported resolution.

The R06 implementation also correctly fixes the prior post-Bucket-1 blanket freeze for the audited retirement / possible-CO_PRIORITY invariance shapes.

However, R06 does not satisfy its frozen-packet **below-only locality** requirement. A stronger unresolved tranche can already have a known cross-domain disposition of `BELOW` while its recurring pace remains unresolved. Because `materialMissingGoals` includes only tranches whose disposition is `MORE_INFORMATION_NEEDED`, such a stronger unresolved BELOW claimant never reaches `materialGoalAnalyses` / `potentialBelowOnlyGoals`. A weaker known BELOW goal can therefore receive scarce Bucket-3 dollars that are not invariant to resolution of the missing fact.

No new Financial Policy & Scenario Auditor closure conclusion or verdict was requested, read, copied, or used.

## Target custody and CI evidence

Fresh repository/GitHub verification established:

- live Manager/control-plane audit base: `84a5ce450618b25a1a90bc798361e7a87c3b8d49`;
- assigned Technical audit branch was **identical** to that checkpoint before audit writes;
- PR #32 is merged;
- final PR head: `be34ce35b64d0a0512b8913e2d65fa779d013db7`;
- frozen integration target: `5c96b99373c7c2593fbbb5766b109347f1588fcd`;
- independent final-head -> integration comparison: **zero changed files**;
- exact integration Foundation CI: run `35305470058`, job `105476660670`, SUCCESS;
- calculations: **914 / 914 PASS**;
- security: **21 / 21 PASS**;
- production dependency audit: **0 vulnerabilities**;
- AI-state validation, typecheck, lint, and build completed successfully.

Green CI was treated as corroborating evidence only.

## Finding summary

| ID | Severity | Status | Result |
|---|---|---|---|
| TMA-017-07 | **MEDIUM** | **OPEN / BLOCKING** | R06 below-only locality misses unresolved tranches whose disposition is already BELOW but whose recurring request remains unknown, allowing weaker known BELOW allocations to consume contested Bucket-3 capacity. |

No CRITICAL or HIGH finding was identified on this target. No additional LOW finding was identified.

## TMA-017-07 — MEDIUM — unresolved BELOW claimant is omitted from Bucket-3 reservation

### Frozen-packet requirement

R06 explicitly requires:

> a known BELOW allocation may consume only capacity proven independent of a stronger unresolved below-only claimant; do not globally freeze unrelated residual capacity.

Accepted Phase-5C Goal policy also requires:
- Bucket 3 retirement-junior goals to use deterministic lexicographic financial ordering;
- missing evidence to block only the contested decision it can change;
- stable identity only as the terminal tie-break after financial factors.

### Frozen implementation path

The frozen implementation builds:

```ts
const materialMissingGoals = coreTranches.filter((goal) =>
  goal.disposition === "MORE_INFORMATION_NEEDED"
  && (goal.remainingCoreNeedAmount === null || goal.remainingCoreNeedAmount > 0));
```

`materialGoalAnalyses` is derived only from this set.

Later, R06 constructs:

```ts
const potentialBelowOnlyGoals = materialGoalAnalyses.filter((item) =>
  !item.resolution.possibleDispositions.has("OUTRANKS")
  && !item.resolution.possibleDispositions.has("CO_PRIORITY")
  && item.resolution.possibleDispositions.has("BELOW"));
```

Therefore an unresolved tranche whose current disposition is already `BELOW` never becomes a `potentialBelowOnlyGoal`, even when its request is unresolved and its eventual amount can change which Bucket-3 goal should receive scarce capacity.

This state is reachable because `determineGoalRetirementDisposition()` returns `BELOW` for Optional goals **before** recurring-pace completeness is required.

At the same time, `goalMonthlyPaces()` can still return `null` when the deadline/month count is unavailable.

Such a tranche is recorded in `localUnresolvedTranches`, but that collection only affects output state/missing-data text. It does not reserve contested Bucket-3 capacity.

### Exact adversary

Use:
- additional retirement request = **$0/month**;
- available recurring Bucket-3 capacity = **$100/month**.

#### Goal A — stronger unresolved BELOW claimant
- confirmed Optional goal;
- Fixed deadline flexibility;
- Critical consequence;
- known positive core principal;
- missing usable target date / `monthsRemaining = null`;
- therefore recurring core request = `null`;
- cross-domain disposition = `BELOW`.

#### Goal B — weaker known BELOW claimant
- confirmed Optional goal;
- Flexible deadline;
- Low consequence;
- known core principal;
- 12 usable months;
- recurring request = **$100/month**;
- disposition = `BELOW`.

Financial Bucket-3 ordering is unambiguous if both requests are known:
- same Optional necessity;
- Fixed outranks Flexible;
- Critical also outranks Low;
- Goal A is senior to Goal B before user priority or stable ID.

But in the frozen target:

1. Goal A is **not** in `materialMissingGoals` because its disposition is already BELOW.
2. Therefore Goal A is absent from `materialGoalAnalyses` and `potentialBelowOnlyGoals`.
3. Because no material-missing goal is detected, execution follows the ordinary non-missing path.
4. The ordinary `below` list filters for `requestedMonthlyAmount > 0`; Goal A's null request is omitted.
5. Goal B is the only routable BELOW tranche and receives the full **$100**.

Now resolve only Goal A's missing usable deadline to a supported positive recurring period.

Goal A remains BELOW, gains a positive request, and is financially ordered ahead of Goal B. Under scarce $100 capacity, Goal B's prior $100 allocation can disappear entirely.

Therefore Goal B's $100 was never independent of the missing Goal-A pace fact.

The final plan may still be labeled `more_information_needed` because Goal A is in `localUnresolvedTranches`, but that label does not cure the concrete misallocation already emitted to Goal B.

### Why this is blocking

This violates:
- the frozen packet's explicit R06 below-only locality requirement;
- deterministic Bucket-3 lexicographic ordering;
- FFH-D004 missing-evidence locality: contested capacity must remain unresolved rather than being assigned to another claimant.

The defect is lower-bucket only:
- it does not raid Secure;
- it does not weaken the protected Phase-5A retirement floor;
- it does not move Optional dollars above retirement;
- it does not break cent conservation.

That bounded impact is why this audit classifies it **MEDIUM**, but it remains a closure-blocking financial allocation defect.

### Bounded remediation boundary

R06 lower-bucket analysis must include unresolved tranches whose cross-domain disposition is already definitively BELOW but whose request amount/pace is unresolved.

For those tranches:
- do not invent the unresolved request as authoritative;
- derive only a supported conservative bound needed to prove independence;
- reserve capacity ahead of weaker known BELOW claims when supported resolutions can place the unresolved claimant ahead;
- allow only residual Bucket-3 dollars proven independent of the missing fact;
- do not globally freeze unrelated capacity.

A direct regression should reproduce the Optional/Fixed/Critical missing-pace claimant ahead of Optional/Flexible/Low known $100 claimant under $100 residual capacity.

## R05 disposition

**R05 / prior TMA-017-06: CLEARS.**

Frozen production now permits `canResolveToOutrank()` when necessity is:
- `essential`, or
- `unknown`

provided the goal is not legacy-unconfirmed and known/unknown urgency and harm facts can support OUTRANK.

`strongestPotentialOutrankOrdering()` also maps unresolved necessity to Essential only for conservative internal ordering evidence; the actual tranche remains `MORE_INFORMATION_NEEDED`.

Direct verified shapes:
- known Essential/Fixed/High $200 versus confirmed necessity-unknown Fixed/Critical $200 under $200 capacity -> known goal receives $0 definite contested allocation;
- necessity-unknown with Flexible/Low/none facts -> cannot become OUTRANK, so independent known OUTRANK proceeds;
- no unknown necessity is written back as authoritative fact.

## R04 preservation

**CLEARS.**

Retained behavior remains correct:
- stronger unresolved Essential potential-OUTRANK peer reserves contested Bucket-1 capacity;
- Essential uncertainty provably unable to OUTRANK does not suppress independent known OUTRANK;
- senior known OUTRANK proceeds ahead of lower-ranked unresolved potential claimant;
- bounded maximum demand reserves no more than supported possible request;
- unresolved amount/pace is not funded as fact.

## R06 retirement / CO_PRIORITY invariance

**CLEARS for the directly required senior-lower-bucket shapes.**

Verified frozen behavior:

1. Capacity $500, known OUTRANK $200, retirement request $100, unresolved Important $100 with nature unknown:
   - known OUTRANK = $200;
   - retirement = invariant $100;
   - unresolved Important remains unallocated;
   - residual = $200.

2. No-OUTRANK: capacity $600, retirement request $500, unresolved Important potential-CO_PRIORITY $100:
   - all supported senior requests fit;
   - retirement remains invariant at $500;
   - unresolved goal remains unallocated;
   - residual = $100.

3. Scarce possible CO_PRIORITY: capacity $500, retirement $500, unresolved Important potential-CO_PRIORITY $100:
   - retirement share differs by supported resolution;
   - retirement remains unresolved at $0 definite allocation;
   - full $500 remains unassigned pending missing fact.

The blocking R06 defect is specifically the separately required below-only locality path described in TMA-017-07.

## R02 preservation

**CLEARS.**

R05/R06 did not alter the authoritative non-tied retirement recurring helper.

Retained exact boundaries:
- $0.06 annual -> $0.00/month; $0.06 residual;
- $0.11 -> $0.00/month; $0.11 residual;
- $0.12 -> $0.01/month; exact $0.12 consumption;
- $0.13 -> $0.01/month; $0.01 residual;
- $0.23 -> $0.01/month; $0.11 residual;
- $0.24 -> $0.02/month; exact $0.24 consumption;
- $0.25 -> $0.02/month; $0.01 residual.

Monthly cents × 12 remain exactly equal to annual ledger consumption.

## R03 preservation

**CLEARS.**

Core and desired excess remain distinct tranches.

Desired excess:
- remains BELOW additional retirement;
- cannot inherit core OUTRANK/CO_PRIORITY status;
- remains separately represented.

Protected mixed case remains:
- $600 core;
- $400 retirement;
- $600 desired excess;
- exact $1,600 allocation;
- $0 residual.

## Protected FFH-013 M01

**CLEARS EXACTLY.**

Retained regression at the frozen target proves:
- shared annual room: **$10,000.01**;
- owner conditional room: **$7,500 each**;
- Build authority: **$833.33/month**;
- routes: **$416.67 + $416.66**;
- annual legal consumption: **$9,999.96**;
- shared annual remainder: **$0.05**;
- account-order reversal preserves the result.

## Financial Engine Reconciliation Gate

**Exact arithmetic / custody mechanics CLEAR.**

Verified/preserved:
- integer monthly-cent competition accounting;
- aggregate allocation + residual = available capacity exactly;
- retirement aggregate = concrete destination totals;
- exact annual/monthly retirement conversion;
- no over-route;
- no epsilon/tolerance financial waiver;
- no positive monetary residual clamp;
- deterministic financial ordering and terminal final-cent handling;
- owner/shared/scheduled retirement capacity conservation;
- Existing Cash -> Secure -> Build -> Windfall no-reuse;
- protected retirement floor remains protected.

TMA-017-07 is not a reconciliation arithmetic failure. It is an **allocation-ownership correctness failure**: the cents reconcile exactly, but they can be assigned to the wrong BELOW claimant before a stronger missing request is resolved.

## Other preservation checks

No new regression was identified in:
- Roth direct-contribution eligibility vs Traditional deductibility;
- SIMPLE;
- HSA;
- workplace retirement;
- spouse/shared IRA conservation;
- multiple-account nonmultiplication;
- factual YTD vs future schedule reservations;
- recommendation vs execution semantics.

## Independent checks performed

1. live control-plane / assigned branch identity;
2. exact frozen target custody;
3. PR #32 final-head -> integration zero-file-diff check;
4. exact integration CI/job gates;
5. 914/914 calculation evidence;
6. 21/21 security evidence;
7. R05 necessity-unknown senior OUTRANK adversary;
8. R05 negative-control non-OUTRANK necessity uncertainty;
9. R04 stronger unresolved Essential peer;
10. R04 provably non-OUTRANK Essential locality;
11. R04 senior known vs lower unresolved potential OUTRANK;
12. R04 bounded maximum reservation;
13. R06 invariant retirement after known OUTRANK;
14. R06 no-OUTRANK invariant retirement;
15. R06 scarce possible-CO_PRIORITY fail-close;
16. **new R06 unresolved-BELOW stronger-claimant adversary**;
17. R02 adjacent annual-cent boundaries;
18. R03 Scenario-8 and exact $1,600 mixed case;
19. FFH-013 M01 exact pin;
20. staged retirement-capacity no-reuse and preserved account-type regressions.

## Closure condition

FFH-017 **must not close** on this Technical audit.

Blocking finding:
- **TMA-017-07 — MEDIUM** — R06 below-only locality omits unresolved tranches whose disposition is already BELOW but whose recurring request remains unknown, permitting contested Bucket-3 capacity to be assigned to a weaker known BELOW claimant.

Manager should route one bounded R06 follow-up for below-only unresolved-request locality, establish a new frozen implementation target, and require the canonical fresh closure audit gate.

No production code, accepted policy, Manager task/index state, merge state, downstream activation, or Supabase/live-database state was changed by this audit.
