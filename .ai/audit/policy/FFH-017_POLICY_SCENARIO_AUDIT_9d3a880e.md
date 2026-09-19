# FFH-017 — Fresh Independent Financial Policy & Scenario Audit — 9d3a880e

- Role: Financial Policy & Scenario Auditor
- Execution mode: `STANDARD_CHAT`
- Audit lane: fresh independent Financial Policy & Scenario audit
- Manager control-plane checkpoint verified at audit start and immediately before report write: `4912736fbe0d4de28350ac009f23659ff93c5b3a`
- Exact frozen implementation target: `9d3a880e02365b4445b8070344c72c928ca34511`
- Frozen packet: `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_9d3a880e.md`
- Technical & Mathematical Auditor conclusions/verdict: not consulted or relied upon

## Final verdict

**FAIL — REMEDIATION REQUIRED**

One blocking Financial Policy & Scenario finding was identified on the exact frozen target.

## Finding FFH-017-P01

**MEDIUM — Phase 5C missing-goal handling is broader than the accepted FFH-D004 locality rule and can suppress otherwise definite goal/retirement allocations.**

### Accepted policy

FFH-D004 establishes all of the following:

- Optional/lifestyle dollars and desired-solution excess remain below additional retirement regardless of self-imposed deadline or borrowing evidence.
- Important core is below additional retirement while the household is `BEHIND`.
- missing evidence blocks only the contested tradeoff that depends on that missing evidence;
- unrelated or already-determined competition results must not be silently suppressed merely because another fact is unknown.

A missing fact is therefore material only when resolving it can change the affected tranche's amount, disposition, or a competition result that depends on that tranche.

### Frozen implementation behavior

`determineGoalRetirementDisposition(...)` evaluates generic goal missingness before the known-Optional rule. In particular, `goal.coreNeedAmount === null`, `goal.remainingCoreNeedAmount === null`, an unusable recurring pace, or `goal.state === "more_information_needed"` returns `MORE_INFORMATION_NEEDED` before `goal.necessity === "optional"` can return `BELOW`.

`buildRecurringGoalRetirementCompetition(...)` then treats any such tranche with null/positive remaining core as a material missing goal and returns a household-wide competition result with:

- additional retirement allocation = `$0`;
- every goal allocation = `$0`;
- total allocation = `$0`;
- all contested capacity held unresolved.

This is correct for genuinely material unknowns whose resolution could change the competition. It is not correct when the missing fact cannot change the cross-domain disposition.

### Adversarial policy scenario

Consider an otherwise complete Phase 5C household with:

- protected retirement floor already satisfied/reserved outside competition;
- verified additional retirement opportunity of `$500/month`;
- `$1,000/month` of recurring competition capacity;
- a confirmed Optional goal whose other classification facts establish that it is Optional, but whose `coreNeedAmount` is not recorded.

Goal Intelligence itself does not require a core-need amount merely because a goal is Optional: it adds the missing-core requirement only for Essential goals. A fully confirmed Optional goal can therefore have `necessity = "optional"`, no missing classification evidence, and `coreNeedAmount = null`.

Under FFH-D004, the cross-domain result is still definite: the Optional goal is below additional retirement. FFH may leave the Optional goal's own residual amount unresolved, but the missing amount cannot justify suppressing the verified `$500/month` additional-retirement allocation that outranks it.

On the frozen implementation, the null core amount is checked first, the Optional goal becomes `MORE_INFORMATION_NEEDED`, and the global missing-goal branch allocates `$0` to retirement and `$0` to every goal. The same global branch can also suppress a separate fully known OUTRANK/CO_PRIORITY goal tranche merely because an unrelated lower-priority goal has an immaterial-to-disposition missing fact.

### Why this is blocking

This does not create an illegal contribution or over-route money; it is conservative in the direction of withholding recommendations. However, it materially violates FFH-D004's explicit uncertainty-locality contract and can erase recommendations whose relative priority is already known. Because missing-fact locality is a central Phase 5C acceptance rule, this is blocking for FFH-017 closure.

### Required remediation boundary

Do not weaken fail-closed behavior for genuinely material unknowns. Instead, distinguish missing facts that can change a tranche's disposition/request from missing facts that cannot change the already-determined cross-domain order.

At minimum add regressions proving:

1. a confirmed Optional goal with an unknown core amount does not suppress otherwise verified additional retirement; the Optional goal remains `BELOW` and any unresolved Optional amount remains unresolved locally;
2. an unrelated lower-priority missing fact cannot suppress a fully known OUTRANK or CO_PRIORITY tranche;
3. genuinely material Essential/Important unknowns still fail closed for the tradeoff(s) whose outcome depends on those facts;
4. no unresolved amount is silently assigned to a goal or retirement destination.

Manager should freeze a new exact target after remediation and route fresh independent audit.

## Policy/scenario areas that clear

Except for FFH-017-P01, the exact frozen target is consistent with the accepted FFH-D004 behavior reviewed below.

### Recurring Build scope and protected floor — CLEARS

Phase 5C operates on recurring Build capacity. `money-priority-build.ts` calculates the protected Phase 5A retirement-floor request first, allocates that amount before ordinary competition, subtracts it from competition capacity, and sets ordinary competition capacity to zero if a protected-floor shortfall remains. Goals therefore cannot raid the protected retirement floor.

Secure remains upstream. Build receives only capacity remaining after the authoritative Secure allocation path.

### Goal-core versus desired/excess — CLEARS

The competition request uses `remainingCoreNeedAmount / monthsRemaining`. Remaining desired/excess principal is tracked separately and is not promoted into the goal-core competition request. End-to-end Build reasons explicitly identify excluded desired/excess principal.

### OUTRANKS behavior — CLEARS for complete material facts

Confirmed Essential core with the accepted urgency/harm evidence routes before additional retirement. The direct scenario pin allocates a `$1,000/month` OUTRANK goal before retirement when only `$1,200/month` is available, leaving `$200/month` for additional retirement.

Multiple OUTRANK goals use financial ordering first, user priority only after the approved financial factors tie, then stable identity.

### BELOW behavior — CLEARS when the necessary disposition facts are known

A fully known Optional goal is below additional retirement, and a fully known Important goal is below retirement for a `BEHIND` household. With sufficient facts, retirement receives its verified request before BELOW goal funding.

The FFH-017-P01 finding is specifically that some facts which are not necessary to establish this already-known BELOW relationship are nevertheless treated as globally material.

### CO_PRIORITY — CLEARS

With sufficient recurring capacity, both additional retirement and the co-priority goal core receive their requested amounts.

Under scarcity, the implementation applies one common fulfillment ratio across additional retirement and all co-priority goal-core requests. The pinned `$750` capacity versus `$1,000` goal + `$500` retirement request yields `$500` goal + `$250` retirement, exactly a 50% fulfillment ratio.

Odd-cent and one-cent cases reconcile in integer cents; stable identity is used only for the unavoidable final-cent tie.

### Multiple goals / ordering — CLEARS except the missing-fact locality finding

Financially equivalent input order does not change material allocations. User priority cannot alter co-priority proportional shares or cross-domain disposition; it participates only after the approved financial ordering factors tie for sequential goal ordering.

### MORE_INFORMATION_NEEDED — PARTIALLY CLEARS / BLOCKED BY FFH-017-P01

Genuinely material goal uncertainty is correctly fail-closed: an Essential goal with unknown core amount/pacing does not receive invented funding and contested retirement dollars are not silently assigned through that unresolved tradeoff.

Material retirement uncertainty likewise exposes no definite contested Phase 5C allocation.

However, the implementation fails the accepted locality rule for missing goal facts that cannot change an already-determined relative disposition, as described in FFH-017-P01.

### Recommendations remain recommendations — CLEARS

The audited production changes are calculation/routing logic. Build produces modeled allocations/recommendations and consumes a current-plan capacity ledger; it does not persist an executed contribution or goal funding event. FFH-D004's distinction between recommendations/plans and authoritative later facts remains intact.

## Retirement-capacity preservation

### Factual YTD versus future schedules — CLEARS

Closed FFH-013 semantics remain present at the frozen target: factual IRA YTD is distinct from active future schedule reservations, and schedules reserve planning capacity without being relabeled as YTD.

### No reuse of scheduled retirement capacity — CLEARS

The FFH-013 capacity ledger remains authoritative. Scheduled reservations reduce the ledger before new one-time/Build/Windfall consumption; later consumers use the remaining ledger rather than recreating annual room.

### Spouse/shared IRA capacity — CLEARS

Shared MFJ IRA compensation groups and owner constraints remain conserved. Multiple Traditional/Roth account records do not multiply the owner's or household's legal capacity.

### Existing Cash -> Secure -> Build -> Windfall — CLEARS

The engine passes one authoritative retirement-capacity ledger through Existing Cash, final Secure, and final Build. A cross-stage invariant is checked after Build. Windfall starts from a clone of the final engine ledger, where prior Existing Cash/Secure/Build consumption is already reflected, so later one-time routing cannot recreate spent capacity.

### Roth / Traditional separation — CLEARS

Direct Roth eligibility and Traditional IRA deductibility remain separate account-level constraints. Phase 5C competes only over retirement opportunity already established by the retirement-capacity layer; it does not redefine those tax rules.

### SIMPLE / HSA / workplace preservation — CLEARS

Frozen tests continue to pin:

- SIMPLE standard and certain-applicable-higher limits/catch-up bands;
- conservative handling of stale/unknown SIMPLE authority;
- unrelated 401(k) capacity;
- period-aware HSA limits, HSA YTD, Medicare/last-month-rule handling, married-family sharing and missing authority;
- exact Build aggregate-to-HSA destination reconciliation;
- coordinated workplace deferral behavior.

No FFH-017 production change redefines these legal-capacity policies.

## Protected FFH-013 M01 regression

**CLEARS exactly.**

At the frozen target, the protected M01 test remains:

- shared annual room: `$10,000.01`;
- owner conditional room: `$7,500` each;
- Build aggregate authority: `$833.33/month`;
- route A: `$416.67/month` / `$5,000.04` annual legal consumption;
- route B: `$416.66/month` / `$4,999.92` annual legal consumption;
- aggregate annual legal consumption: `$9,999.96`;
- shared annual remainder: `$0.05`.

The aggregate monthly amount equals the sum of concrete destination amounts. The capacity invariant holds with no epsilon/tolerance or hidden positive-residual suppression.

## Financial Engine Reconciliation Gate

From the Financial Policy & Scenario lane, the gate clears on all reviewed monetary-routing boundaries except that FFH-017-P01 prevents full policy acceptance of the missing-information competition semantics.

Verified preserved behavior includes:

- protected floor is removed from ordinary competition before goal routing;
- competition allocations reconcile exactly to available monthly cents;
- co-priority allocation is cent-exact and order-invariant;
- concrete retirement destinations reconcile to the aggregate retirement allocation;
- shared/owner retirement ledgers prevent duplicated capacity;
- staged consumers cannot recreate consumed/reserved capacity;
- stable IDs do not establish legal or substantive spouse priority;
- no epsilon/tolerance financial waiver or hidden positive-residual clamp was identified.

## Provenance and validation evidence

PR #26 — `FFH-017: Phase 5C recurring goal-retirement competition` — is merged.

Accepted final PR head:
`0e7c139b374716ad0e701d0f3c8ae05f9fac1692`

Frozen integration:
`9d3a880e02365b4445b8070344c72c928ca34511`

Independent compare of accepted final PR head to frozen integration contains zero changed files.

Foundation CI evidence supplied in the frozen packet was independently checked at the run level:

- run `34999388253` on `545d3b12710086b0fefb44be9b7823309f30da0e` — `success`;
- run `35000961119` on `c7882907854579488eb82f4d9f18799b51522550` — `success`.

The frozen packet records AI-state validation, production dependency audit, full calculation tests, security policy contract, typecheck, lint, and build in both successful validation runs. Green CI was treated as supporting evidence, not proof.

The control-plane branch still matched Manager head `4912736fbe0d4de28350ac009f23659ff93c5b3a` immediately before the Policy Auditor report was written.

## Finding summary

| ID | Severity | Result |
|---|---|---|
| FFH-017-P01 | MEDIUM | Blocking — missing-goal fail-closed behavior is not tradeoff-local and can suppress otherwise definite OUTRANK/CO_PRIORITY/retirement allocations when the missing fact cannot change the affected relative disposition. |

No additional Financial Policy & Scenario finding was identified.

## Manager closure status

**BLOCKED from the Policy Auditor lane.**

FFH-017 should not close on frozen target `9d3a880e02365b4445b8070344c72c928ca34511` because FFH-017-P01 violates the accepted FFH-D004 missing-information locality rule.

Do not activate downstream work from this audit lane. Manager owns remediation routing, new frozen-target creation, reconciliation with the separate Technical & Mathematical audit, and eventual closure.