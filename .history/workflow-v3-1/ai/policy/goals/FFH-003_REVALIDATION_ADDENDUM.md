# FFH-003 — Revalidation Addendum

Role: Goals, Cash Flow & Allocation Policy Analyst
Task: FFH-003
Date: 2026-09-08
Status: COMPLETE — REVALIDATED; PENDING MANAGER SYNTHESIS

## Purpose

This addendum revalidates the independent Goals/Cash Flow Phase 5C recommendation in `FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md` against the current repository state and tightens two implementation-policy areas requested for FFH-003: user-priority boundaries and multi-goal scarcity behavior.

This addendum does not adopt or respond to FFH-004. It does not define retirement law, retirement account routing, or production implementation.

## Revalidated repository state

At revalidation, `phase-5-money-priority-engine` was at `f6a138e78083afe6bdf83bc42117c705bda9ca09`.

The prior FFH-003 handoff commit was `003024cce0a69e10a7370e174f477db11150b47d`. Live comparison from that commit to the revalidation head showed exactly one later commit, affecting only `.ai/research/regulatory/HANDOFF.md`. No Phase 5A, Phase 5B, Build, residual-needs, snapshot, or Goals-policy source changed after FFH-003 completion.

Therefore the existing FFH-003 core recommendation remains valid as the independent Goals-side proposal.

## Confirmed Goals-side Phase 5C policy recommendation

### 1. Goal protection is relative, not global

Phase 5B reserves `protected` for existing Secure and retirement protections. Phase 5C should not relabel ordinary goals globally as `protected`.

A qualifying goal core tranche may instead receive the relationship `OUTRANKS_ADDITIONAL_RETIREMENT`. That means only that recurring core-need pace is senior to additional retirement opportunity. It does not make the goal senior to Secure, employer match, emergency/debt safeguards, or the Phase 5A protected retirement floor under this Goals-side specification.

### 2. Core need versus desired target remains the controlling boundary

After existing-cash residual reconciliation:

```text
remainingTargetNeed = max(0, targetAmount - currentAmount)
remainingCoreNeed = max(0, coreNeedAmount - currentAmount)
remainingDesiredExcess = max(0, remainingTargetNeed - remainingCoreNeed)
```

Existing eligible goal balance is treated as satisfying the core need first for priority analysis. Once `remainingCoreNeed = 0`, no remaining dollar may retain essential-core precedence merely because the full desired target is not funded.

If `coreNeedAmount` is unknown, the full desired target must not be assumed to be core need.

### 3. Required monthly pace is tranche-specific immediate need

For a usable future deadline with `M` remaining funding months:

```text
coreMonthlyPace = remainingCoreNeed / M
fullTargetMonthlyPace = remainingTargetNeed / M
excessMonthlyPace = fullTargetMonthlyPace - coreMonthlyPace
```

The engine competes on the applicable monthly pace, not the entire outstanding principal.

A planned future contribution is schedule evidence, not present funding. It does not reduce `currentAmount`, `remainingCoreNeed`, or `remainingTargetNeed` until an authoritative later snapshot actually reflects the funded balance.

A recommendation also does not mutate the future goal balance. Actual recorded funding, not the prior recommendation, changes later residual need.

### 4. Deadline treatment

- Fixed: strongest timing evidence; may support `OUTRANKS_ADDITIONAL_RETIREMENT` for an Essential core tranche when material harm is also present.
- Limited: material timing evidence; normally supports at most co-priority unless consequence evidence independently reaches the existing outrank rule.
- Flexible: does not create urgency merely because the user prefers an earlier date. A Critical consequence may still independently support the established Essential-core outrank test.
- Missing/invalid/past-due date: no fabricated recurring pace. The affected competition becomes targeted information/decision needed.

A fixed Optional deadline remains Optional.

### 5. Consequence treatment

Underfunding consequence severity remains distinct from necessity.

- Critical/High consequences can support stronger treatment only for a legitimate core need.
- Moderate consequence can support Essential-core co-priority under the existing FFH-003 proposal.
- Low consequence does not independently elevate a goal.
- A dramatic consequence description cannot elevate an Optional goal across the retirement boundary when necessity remains Optional.

Borrowing/debt exposure remains an amplifier of a legitimate need, never a converter of discretionary spending into essential need.

### 6. Schedule state is not a cross-domain ranking lever

Goals-side recommendation is now explicit:

- `funded`: exclude; request $0.
- `past_due`: targeted decision/information needed; no divide-by-zero or one-month fabrication.
- `more_information_needed`: block only the dependent competition.
- `on_track` and `behind`: explanation/schedule-health evidence only for Phase 5C cross-domain allocation.

`behind` must not improve the goal's disposition or goal-to-goal allocation rank. The required pace and real deadline already represent the financial catch-up requirement; using `behind` as a ranking lever would make priority partly dependent on the user's reported planned contribution and create avoidable gaming.

### 7. Multi-goal scarcity order

After Secure and the approved Phase 5A protected retirement floor have been handled, Phase 5C Goals-side allocation should use these semantic buckets:

```text
1. OUTRANKS_ADDITIONAL_RETIREMENT core tranches
2. CO_PRIORITY core tranches + actionable additional-retirement request
3. BELOW_ADDITIONAL_RETIREMENT goal tranches
```

#### Bucket 1 — multiple OUTRANK goal tranches

When capacity cannot satisfy every OUTRANK core pace, preserve deterministic lexicographic goal ordering rather than using array order or a magic score.

Higher-order financial evidence must precede user preference. Use the established Goal Intelligence / goal-ranking concepts: necessity/core status, consequence, deadline flexibility, time remaining, and other approved financial evidence. Only after meaningful financial factors tie may user priority break the tie; stable goal ID is last.

Allocate sequentially up to each ordered core monthly pace until Bucket 1 capacity is exhausted.

This allows a materially more urgent core need to be completed before a weaker but still retirement-senior core need.

#### Bucket 2 — true co-priority with additional retirement

Evaluate the entire bucket as a set. Available capacity is shared by equal fulfillment ratio across all co-priority goal core requests plus the approved actionable additional-retirement request:

```text
fulfillmentRatio = min(1, availableCapacity / totalBucketRequest)
allocation_i = request_i * fulfillmentRatio
```

User priority must not change these proportional shares. Otherwise an item would not actually be co-priority.

Stable IDs may be used only to reconcile unavoidable final-cent remainder deterministically.

#### Bucket 3 — retirement-junior goals

After Bucket 2 requests are satisfied or capacity is exhausted, remaining BELOW goal tranches use deterministic lexicographic goal ordering. User priority may break a tie only after all approved financial factors; stable ID remains last.

### 8. User-priority boundary

`userPriority` is a preference, not financial necessity evidence.

It MUST NOT:

- change Essential / Important / Optional classification;
- change core need or desired excess;
- convert Flexible to Limited/Fixed;
- raise consequence severity or debt exposure;
- move Optional or desired-excess dollars above additional retirement;
- move an Important goal into co-priority unless the substantive co-priority test is independently satisfied;
- move a goal through Secure or the protected retirement floor;
- enlarge the required monthly pace; or
- alter proportional shares inside the true co-priority bucket.

It MAY:

- break otherwise meaningful goal-to-goal ties within the same cross-domain disposition after all approved financial factors; and
- influence presentation ordering when economic outputs are otherwise identical.

Stable ID terminates the tie after user priority.

### 9. Partial versus full goal funding

A goal can occupy more than one economic tranche simultaneously.

Example:

```text
target = 20,000
core = 8,000
current = 5,000
```

The remaining $3,000 core need may qualify for higher Phase 5C treatment. The other $9,000 remaining target is desired excess and does not inherit that treatment.

If later actual funding raises current balance to $8,000, the elevated core tranche becomes satisfied and immediately disappears from future competition. The remaining $12,000 is retirement-junior desired excess.

If current balance reaches target, the whole goal is satisfied and requests $0.

### 10. One-time versus recurring funding

- Existing-cash deployment remains one-time.
- One-time goal deployment increases the residual goal balance exactly once before recurring analysis.
- One-time retirement deployment does not become monthly capacity.
- Recurring Phase 5C uses only post-higher-stage recurring capacity.
- Scheduled future contributions do not count as existing cash or existing goal balance.
- A recommended recurring allocation is not treated as executed in a later run unless persisted financial facts actually changed.

### 11. Missing-information boundary

Unknown data should block only the financially contested decision it can change.

- Unconfirmed legacy goal: receives no new Phase 5C elevation; unrelated allocations continue.
- Confirmed Essential goal with unknown core amount: do not protect the full target; mark the affected cross-domain competition unresolved.
- Missing usable deadline when pace is required: no automatic recurring request.
- Unknown borrowing amount/APR: do not fabricate debt-exposure strength.
- If missing evidence could switch an Essential core tranche among OUTRANK / CO_PRIORITY / BELOW, the contested capacity should remain unresolved pending Manager synthesis of the uncertainty fallback; unrelated capacity continues normally.

## Deterministic policy invariants

1. One dollar cannot satisfy two requests.
2. One-time cash and recurring capacity are distinct.
3. Existing balance and one-time deployment reduce goal residual need exactly once.
4. Scheduled future funding does not reduce current principal.
5. A recommendation does not count as execution.
6. Satisfied goals and satisfied core tranches request $0 at the corresponding priority level.
7. Desired excess cannot inherit essential-core priority.
8. User priority cannot cross a financial-policy boundary.
9. `behind` cannot be manufactured into higher financial priority.
10. Input array order cannot change economic output.
11. Stable ID is only a terminal tie-break/remainder rule.
12. All allocations plus residual recurring capacity reconcile to available recurring capacity to the cent.
13. Negative remaining need/allocation is forbidden.
14. Goal Intelligence cannot fabricate retirement legal room.
15. Goals policy does not weaken Secure or the Phase 5A protected retirement floor absent Manager-approved cross-domain policy.

## Additional acceptance scenarios

These supplement the scenarios already defined in `FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`.

### A. User priority cannot elevate Optional goal

Two goals have identical dates and amounts. Optional Goal A has user priority 1; Essential qualifying core Goal B has user priority 9.

Expected: B retains its financially derived cross-domain disposition. A remains below additional retirement. User priority cannot reverse the economic class.

### B. User priority breaks only a same-disposition financial tie

Two OUTRANK Essential core tranches have identical consequence, flexibility, months remaining, and other approved financial evidence. Goal A has higher user priority.

Expected: A precedes B. Reversing source array order does not change that result.

### C. Stable ID breaks a complete tie

Same as B, but user priority is also equal.

Expected: stable goal ID alone terminates the tie; source array order is irrelevant.

### D. User priority does not alter co-priority proportional share

Co-priority requests are Goal A $200, Goal B $400, retirement $600; available capacity $600. Give Goal A the highest possible user priority and Goal B the lowest.

Expected: fulfillment ratio remains 50%; A $100, B $200, retirement $300. Preference does not distort a true co-priority bucket.

### E. Multiple OUTRANK goals under scarce capacity

Goal A and Goal B both qualify to outrank retirement. A has materially stronger approved financial evidence than B. A requests $300, B requests $300, retirement requests $300, available capacity is $450.

Expected: A receives $300, B receives $150, retirement $0. Array order and display names do not change output.

### F. Behind status cannot game priority

Two otherwise equivalent same-disposition goals have the same actual remaining need, deadline, and consequence. One reports a lower planned monthly contribution and therefore appears `behind`; the other is `on_track`.

Expected: Phase 5C financial ordering/allocation is unchanged solely because of `behind`; explanations may differ.

### G. Prior recommendation is not assumed executed

Month 1 recommendation allocates $300 to a goal, but Month 2 snapshot still shows the same `currentAmount`.

Expected: Month 2 residual need is not reduced by the prior recommendation. Only an actual changed balance or other authoritative financial fact reduces need.

### H. Actual partial funding satisfies core before excess

Target $15,000; core $5,000; prior current balance $3,000. A later authoritative snapshot records $2,000 more actually saved.

Expected: current = $5,000; remaining core = $0; all remaining $10,000 is desired excess and cannot retain essential-core precedence.

## Confidence

HIGH that the existing FFH-003 tranche-based recommendation remains valid against current Phase 5A/5B repository state.

HIGH on the clarified user-priority boundary, schedule-state anti-gaming rule, actual-versus-recommended funding distinction, and deterministic multi-goal ordering.

MEDIUM on the cross-domain threshold between OUTRANK and CO_PRIORITY, which remains deliberately pending Manager synthesis with the independent retirement-side analysis.

## Recommended next role

Manager / Architect should synthesize the original FFH-003 specification plus this addendum with FFH-004 and FFH-005 before approving any Phase 5C production behavior.
