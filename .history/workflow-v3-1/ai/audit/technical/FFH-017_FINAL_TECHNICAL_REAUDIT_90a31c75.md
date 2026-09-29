# FFH-017 — FINAL Fresh Technical & Mathematical Re-audit — `90a31c75`

**Role:** Technical & Mathematical Auditor  
**Execution mode:** STANDARD_CHAT  
**Exact frozen implementation audited:** `90a31c755ea88310e58bb9e06ade60af73e182f5`  
**Manager control-plane base verified before audit:** `f0e9825f17144b9f24fafbbe1a97816051dec8b9`  
**Assigned audit branch:** `audit/ffh-017-technical-90a31c75`  
**Frozen packet:** `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_90a31c75.md`  
**Historical failed target used only for finding-closure context:** `9d3a880e02365b4445b8070344c72c928ca34511`

## Verdict

**FAIL — REMEDIATION REQUIRED**

The remediated target closes prior R02 / TMA-017-02 and R03 / TMA-017-03 and materially improves R01 / TMA-017-01. However, R01 still has one reachable blocking boundary: known OUTRANK allocation is committed before materially unresolved Essential OUTRANK peer capacity/order is known. The missing fact can change which OUTRANK goal should receive scarce capacity, so the allocation is not independent and must remain unresolved.

No Financial Policy & Scenario Auditor re-audit conclusion or verdict was requested, read, copied, or used.

## Target custody and validation

Repository/GitHub state was independently refreshed.

- Manager control-plane head verified: `f0e9825f17144b9f24fafbbe1a97816051dec8b9`.
- Assigned audit branch was verified at that exact Manager head before audit writes.
- Remediation PR #28 is merged.
- PR #28 final head: `401204a34ec8ddf2305e073a1938f3cfb27a8900`.
- Frozen integration target / merge SHA: `90a31c755ea88310e58bb9e06ade60af73e182f5`.
- Independent final-head -> integration comparison: **zero changed files**.
- Production checkpoint: `0a421f00e42ee1699d51dea7abdb37118bed631f`.
- Final production/test validation head: `a6a8087db007d3012db8fe426e63a2988a0f95a8`.
- The delta from validation head to final PR head is control-plane/worklog/handoff only; no production or test file changes.
- Foundation CI run `35171621516`, job `105044311457`: SUCCESS on `a6a8087...`.
- Final worker/handoff run `35296861758`, job `105451103749`: SUCCESS on `401204a...`.
- Exact integration Foundation CI run `35297206526`, job `105452111495`: SUCCESS on `90a31c75...`.
- Integration CI executed dependency install, AI-state validation, production dependency audit, calculations, security contract, typecheck, lint, and build.
- Exact integration calculation log: **904 tests / 904 pass / 0 fail**.
- Security log: **21 tests / 21 pass / 0 fail**.

Green CI was treated as corroborating evidence only.

## Authorities read

The audit independently read the required Workflow V3.1 / V3 / V2 contracts, Technical Auditor charter, FFH-017 task/index, frozen packet, Financial Engine Reconciliation Gate, FFH-D004, the accepted Phase 5C Goals and Retirement policy artifacts named by the packet, historical Technical FFH-017 finding evidence only for closure context, and closed FFH-013 evidence necessary to re-check M01 and retirement-capacity preservation.

Key accepted rules relevant to the blocking result are:

- FFH-D004 rule 11: multiple OUTRANK tranches use deterministic lexicographic financial ordering.
- FFH-D004 rule 14: missing evidence blocks the contested tradeoff that depends on it; contested capacity remains unresolved rather than silently assigned.
- The Goals revalidation addendum requires missing evidence that can switch a core tranche among OUTRANK / CO_PRIORITY / BELOW to leave the affected competition unresolved while unrelated capacity continues.

## Findings

| ID | Severity | Status | Result |
|---|---|---|---|
| TMA-017-05 | **HIGH** | **OPEN / BLOCKING** | R01 remains incomplete: known OUTRANK dollars are allocated before a materially unresolved Essential peer that can resolve into a higher-ranked OUTRANK request. |

No CRITICAL finding was identified. No additional MEDIUM or LOW finding was identified.

## TMA-017-05 — HIGH — unresolved OUTRANK peer can be bypassed before R01 fail-close

### Frozen implementation behavior

`buildRecurringGoalRetirementCompetition()` currently:

1. classifies all core tranches;
2. identifies `materialMissingGoals`;
3. allocates all currently known `OUTRANKS` core tranches;
4. only **after that allocation** checks `materialMissingGoals.length` and returns the remaining capacity unresolved.

That ordering is safe only when every material missing goal is provably lower than the already-funded OUTRANK tranches. The implementation does not establish that condition.

### Reachable adversary

Use scarce recurring capacity of exactly **$200/month**.

**Goal A — fully known**
- Essential
- Fixed deadline
- High consequence
- known core request = **$200/month**
- disposition = `OUTRANKS`

**Goal B — materially unresolved amount**
- Essential
- Fixed deadline
- Critical consequence
- remaining/core amount unknown
- therefore its recurring request is unknown
- because urgency/harm are already sufficient but recurring core pace is unknown, disposition = `MORE_INFORMATION_NEEDED`

Goal B is financially stronger than Goal A if its core amount later resolves positive: both are Essential/Fixed, but Critical consequence ranks ahead of High consequence under the frozen lexicographic ordering.

Current frozen control flow allocates Goal A's full **$200** before the material-missing check, then returns `more_information_needed` with Goal B at $0 and no remaining capacity.

But a valid resolution of Goal B to any positive recurring core request makes Goal B an `OUTRANKS` tranche that must be ordered ahead of Goal A. Under the accepted Bucket-1 scarcity rule, the same $200 capacity can therefore belong to Goal B instead.

So Goal A's $200 is not an allocation independent of the missing fact. It is contested capacity that was assigned before the material uncertainty was resolved.

### Why this blocks

This violates:
- FFH-D004 rule 11 (ordered multi-OUTRANK scarcity);
- FFH-D004 rule 14 (contested capacity remains unresolved);
- the R01 frozen-packet requirement that materially contested Essential/Important uncertainty remain fail-closed.

The direct remediation suite covers:
- Optional unknown amount locality;
- Optional irrelevant borrowing uncertainty;
- legacy-unconfirmed isolation;
- lower-priority unknown not suppressing known OUTRANK;
- lower-priority unknown not suppressing known CO_PRIORITY;
- a material Essential unknown **by itself**;
- a material Important unknown **by itself**.

It does not cover a materially unresolved Essential OUTRANK peer together with a known OUTRANK tranche under scarce capacity.

### Required remediation boundary

Before committing a known OUTRANK allocation, the allocator must determine whether any unresolved material core tranche can validly resolve into the OUTRANK bucket in a way that can change Bucket-1 scarcity/order. If yes, only demonstrably independent senior allocation may proceed; otherwise the contested Bucket-1 capacity must remain unresolved.

This finding does **not** require globally freezing lower-priority unknowns. The already-correct Optional/legacy/lower-priority locality behavior should remain.

## R01 disposition

**R01 / TMA-017-01: DOES NOT FULLY CLEAR.**

Correctly remediated portions:
- Optional/lifestyle unresolved facts remain retirement-junior where they cannot alter cross-domain ordering.
- Unknown Optional core amount is not fabricated.
- Irrelevant Optional borrowing uncertainty does not suppress verified retirement.
- Legacy-unconfirmed goals gain no unsupported elevation and do not globally freeze known allocations.
- Known OUTRANK remains actionable alongside genuinely unrelated lower-priority unknowns.
- Known CO_PRIORITY remains actionable alongside genuinely unrelated lower-priority unknowns.
- Material Essential/Important uncertainty by itself remains fail-closed.

Blocking residual:
- material Essential uncertainty that can alter the OUTRANK scarcity/order is checked only after known OUTRANK allocation has already consumed capacity.

## R02 disposition — exact non-tied annual/monthly reconciliation

**R02 / TMA-017-02: CLEARS.**

The remediation adds one authoritative ordinary recurring helper:
`consumeRetirementCapacityRecurringMonthly()`.

It:
- converts verified annual room to annual integer cents;
- uses `Math.floor(annualCents / 12)` for full-year monthly authority;
- converts routed monthly cents back to exactly `monthlyCents * 12` annual cents;
- consumes the ledger by that exact annual amount;
- throws if actual consumed annual cents differ from routed monthly cents × 12.

Both:
- `routableRetirementMonthlyCapacity()` planner/prepass, and
- `routeRetirementMonthlyAmount()` execution router

call that same helper for ordinary non-tied recurring destinations.

Independent cent-boundary hand-check:

| Annual room | Supported monthly | Annual consumed | Explicit annual residual |
|---:|---:|---:|---:|
| $0.06 | $0.00 | $0.00 | $0.06 |
| $0.11 | $0.00 | $0.00 | $0.11 |
| $0.12 | $0.01 | $0.12 | $0.00 |
| $0.13 | $0.01 | $0.12 | $0.01 |
| $0.23 | $0.01 | $0.12 | $0.11 |
| $0.24 | $0.02 | $0.24 | $0.00 |
| $0.25 | $0.02 | $0.24 | $0.01 |

Thus the historical $0.06 -> false $0.01/month defect is closed.

The residual cents remain in the ledger rather than being silently clamped away. No epsilon/tolerance comparison is used to waive the reconciliation invariant. Later stages receive the already-consumed ledger state, so consumed annual authority is not recreated.

## R03 disposition — desired/excess tranche completeness

**R03 / TMA-017-03: CLEARS.**

Frozen production now models:
- `trancheType: "core"`
- `trancheType: "desired_excess"`

The desired-excess tranche:
- has a distinct tranche ID;
- is emitted whenever nonzero excess can be quantified;
- is hard-classified `BELOW`;
- never inherits core OUTRANK / CO_PRIORITY;
- has its own recurring pace derived as exact full-target monthly cents minus core monthly cents;
- receives capacity only after OUTRANK, CO_PRIORITY, and additional retirement ordering;
- receives a distinct Build recommendation ID.

Scenario-8 shape clears:
- core satisfied;
- desired excess remains;
- core request = $0;
- excess remains retirement-junior and can use residual Build capacity after additional retirement.

Required mixed case clears exactly:
- core = **$600**
- additional retirement = **$400**
- desired excess = **$600**
- total = **$1,600**
- residual = **$0**

Unique tranche IDs and one integer-cent remaining-capacity variable prevent multiple goals/core+excess tranches from reusing recurring capacity.

## Financial Engine Reconciliation Gate

**Exact-cent / ledger reconciliation mechanics: CLEAR for the remediated routing surfaces.**

Verified:
- authoritative recurring competition is monthly integer cents;
- aggregate competition allocation + residual equals capacity exactly;
- concrete Build retirement destinations sum exactly to authoritative retirement monthly allocation;
- ordinary non-tied monthly cents × 12 equal annual ledger consumption;
- tied-spouse path retains its exact helper;
- no positive residual is hidden by a tolerance or reconciliation clamp;
- proportional CO_PRIORITY remainder is assigned only after exact common fulfillment and only at final-cent resolution;
- planner and router share the same ordinary recurring helper;
- ledger capacity is consumed before later-stage reuse;
- protected retirement floor remains outside ordinary goal competition.

The overall FFH-017 task nevertheless fails because TMA-017-05 is an allocation-authority/missing-fact defect: the allocator assigns scarce OUTRANK capacity that is not proven independent of the unresolved fact.

## Protected FFH-013 M01

**CLEARS EXACTLY.**

Retained frozen regression proves:
- shared annual room: **$10,000.01**
- conditional owner room: **$7,500 each**
- Build authority: **$833.33/month**
- routes: **$416.67 + $416.66**
- annual legal consumption: **$5,000.04 + $4,999.92 = $9,999.96**
- shared annual remainder: **$0.05**
- reversed account input order preserves the material result.

No epsilon/tolerance or hidden positive-residual suppression is used for this reconciliation.

## Other preservation checks

No separate regression was identified in:
- protected Phase 5A retirement-floor sequencing / no ordinary-goal raid;
- Roth direct-contribution eligibility versus Traditional IRA deductibility separation;
- FFH-015 SIMPLE behavior;
- FFH-012/028 HSA behavior;
- unrelated workplace-retirement limit behavior;
- Traditional + Roth IRA owner/shared nonmultiplication;
- factual YTD versus future schedule reservations;
- scheduled-capacity no-reuse;
- Existing Cash -> Secure -> Build -> Windfall ledger custody;
- recommendation-versus-execution semantics.

The exact integration CI's 904 calculation tests and 21 security tests remain useful regression evidence, but they do not contain the TMA-017-05 two-goal scarcity adversary.

## Tests / adversarial checks independently performed

Source-level and mathematical checks included:

1. exact PR-head -> frozen-integration zero-file-diff verification;
2. exact integration Foundation CI/job/step verification;
3. integration log verification: 904/904 calculations, 21/21 security;
4. R01 Optional unknown core locality;
5. R01 irrelevant Optional borrowing uncertainty locality;
6. R01 legacy-unconfirmed isolation;
7. R01 known OUTRANK + unrelated lower-priority unknown;
8. R01 known CO_PRIORITY + unrelated lower-priority unknown;
9. R01 material Essential/Important fail-close;
10. **new adversary: known OUTRANK + potentially higher-ranked material Essential OUTRANK peer under scarce capacity**;
11. R02 $0.06 / $0.11 / $0.12 / $0.13 / $0.23 / $0.24 / $0.25 exact annual/monthly boundaries;
12. R02 planner/router path equivalence;
13. R03 Scenario-8 core-satisfied/excess-remains shape;
14. R03 exact $600 + $400 + $600 = $1,600 mixed case;
15. R03 multi-tranche cent conservation;
16. protected FFH-013 M01 exact pin and order reversal;
17. schedule reservation / staged ledger no-reuse evidence;
18. multiple-account nonmultiplication and retained Roth/Traditional/SIMPLE/HSA/workplace regression surfaces.

## Manager closure condition

FFH-017 **must not close** on this Technical audit.

Blocking condition:
- **HIGH TMA-017-05** — R01 targeted missing-fact locality remains incomplete at the multi-OUTRANK peer-scarcity boundary.

Manager should route a bounded R01 remediation and freeze a new exact implementation target before another required Technical closure audit.

No production code, policy, task/index state, merge state, downstream activation, or Supabase/live-data state was changed by this audit.
