# FFH-004 — Phase 5C Retirement Policy Independent Review

Date: 2026-09-08
Role: Retirement & Tax-Advantaged Policy Analyst
Status: PROPOSED POLICY — READY FOR MANAGER SYNTHESIS
Starting branch checkpoint reviewed: `711b7e895dc9cd29283af9c981cfcbe15cb4db63`

## QUESTION

What retirement-side protections and opportunity-cost constraints should govern Phase 5C when legitimate goals compete with additional retirement for recurring Build capacity?

## CURRENT CANONICAL POLICY

Classification: ESTABLISHED FFH PROJECT POLICY / VERIFIED REPOSITORY STATE.

1. Employer-match capture remains a Secure concern and is separate from additional retirement.
2. Phase 5A separates legal contribution capacity from the retirement planning floor.
3. The normal protected retirement baseline is 15% of complete gross household income.
4. `BEHIND` may raise the protected target using the projection-required corrective rate, capped at the existing 25% protected corrective ceiling and separately constrained by feasible recurring cash flow.
5. `ON_TRACK` retains the normal 15% baseline.
6. `AHEAD` may use the existing 12% baseline only when the Phase 5A durable-surplus tests are satisfied.
7. The existing 5% employee-saving guardrail applies to BEHIND / ON_TRACK and relaxes for AHEAD; actual match capture remains protected even if it requires more.
8. Scheduled contributions are reconciled against legal capacity. Current-year scheduled contributions reserve room before truly additional opportunity is exposed.
9. `additionalRetirementOpportunityAnnual` represents verified opportunity above the protected-floor shortfall; it is not equivalent to household cash-flow capacity and is not itself a required allocation.
10. Phase 5B Goal Intelligence is derived evidence only. It does not currently reduce retirement, protect new goal dollars, or change Build economics.

## POLICY GAP / UNCERTAINTY

Phase 5A identifies a protected floor and additional retirement opportunity, while Phase 5B identifies richer goal evidence. The missing Phase 5C rule is how recurring Build capacity should treat retirement dollars above the protected floor when those dollars compete with goals.

The principal risk is collapsing three different concepts into one number:

- protected retirement need;
- verified legal contribution room;
- discretionary/contestable retirement opportunity above the protected floor.

If those are collapsed, a goal could improperly reduce the protected floor, scheduled contributions could be double-counted, or statutory room could be mistaken for available cash flow.

## PROPOSED POLICY

Classification for this section: PROPOSED FFH PROJECT POLICY unless otherwise labeled.

### 1. Employer match is non-contestable

Classification: ESTABLISHED FFH PROJECT POLICY.

Goal competition must never reduce the employee contribution required to capture an available employer match or the associated employer-match protection already classified in Secure.

Phase 5C starts only after authoritative Secure behavior has been satisfied or explicitly reported as unsatisfied/infeasible.

### 2. The Phase 5A protected retirement floor is non-contestable inside ordinary Build goal competition

Classification: PROPOSED FFH PROJECT POLICY.

Ordinary goals must not reduce the recurring contribution pace required to satisfy `protectedAnnualAmount` / `protectedRetirementFloorRate` from Phase 5A.

The recurring retirement floor need is the unsatisfied sustainable pace represented by `protectedFloorShortfallAnnual`; for recurring monthly planning, its ordinary pace is conceptually `protectedFloorShortfallAnnual / 12`, subject to the existing authoritative feasibility and legal-routing constraints.

This is a trajectory floor, not a requirement to manufacture a current-year catch-up contribution beyond feasible cash flow or verified legal room.

If a household cannot fund both the protected retirement floor and a near-term goal, Phase 5C should expose the constraint rather than silently converting protected retirement into discretionary retirement.

A genuinely required obligation that should outrank the retirement floor must be classified through the appropriate Secure / required-obligation policy path or escalated for Manager policy synthesis; an ordinary goal record should not bypass the floor merely by having a deadline.

### 3. Only retirement above the protected floor is contestable

Classification: PROPOSED FFH PROJECT POLICY.

After employer-match protection and the protected retirement floor are satisfied, additional retirement becomes contestable Build capacity.

Goal funding may reduce only this additional retirement amount.

`additionalRetirementOpportunityAnnual` is an upper-bound opportunity signal, not an allocation demand. Actual additional retirement must also be constrained by remaining recurring household capacity and authoritative account routing.

Therefore:

`actual additional retirement allocation <= verified remaining legal room`

and

`actual additional retirement allocation <= recurring Build capacity remaining after Secure + protected floor + any higher-order approved Build need`.

### 4. Retirement status changes the strength of the opportunity-cost signal above the floor

Classification: PROPOSED FFH PROJECT POLICY.

#### BEHIND

The protected floor may already include the existing corrective-rate behavior. After that floor is satisfied, remaining additional retirement opportunity should still carry the strongest retirement-side preference because the household retains a projected shortfall.

Retirement-side recommendation:
- low/discretionary goals should not displace additional retirement;
- flexible goals should generally not displace additional retirement merely because the user supplied an aggressive date;
- only strongly evidenced legitimate goal needs should be candidates to displace additional retirement, and the exact goal threshold/ranking belongs to Manager synthesis with Goals Policy;
- if `structurallyInfeasibleCorrectiveRate = true`, the engine must preserve that structural shortfall as an explicit warning even when additional retirement above the protected floor is redirected to a goal.

#### ON_TRACK

Once the protected floor is satisfied, additional retirement is meaningfully contestable.

Retirement-side recommendation:
- high-quality legitimate goal evidence may outrank some or all additional retirement;
- medium-strength goal evidence may compete with additional retirement;
- low/discretionary goal evidence should not automatically outrank additional retirement;
- final goal-band mapping belongs to Manager synthesis with Goals Policy.

#### AHEAD

Once the lower Phase 5A protected floor is satisfied, additional retirement is the most contestable of the three statuses.

Retirement-side recommendation:
- legitimate goals may reduce additional retirement without being treated as a retirement-policy failure;
- FFH should not require full use of every remaining tax-advantaged opportunity before allowing legitimate life-goal funding;
- the engine must still preserve employer match, the AHEAD protected floor, legal-capacity integrity, and any verified timing constraint Manager later approves from Regulatory Research.

### 5. Missing retirement data blocks confident retirement-downshift decisions

Classification: PROPOSED FFH PROJECT POLICY, consistent with existing repository principle that missing data blocks only dependent decisions.

If the Hybrid Retirement Floor returns `more_information_needed`, Phase 5C must not confidently say that a goal can reduce retirement below an unknown floor.

Required behavior:
- preserve any independently verified Secure employer-match protection;
- do not fabricate additional retirement room;
- do not classify the household as AHEAD merely to free capacity for goals;
- return a targeted retirement-tradeoff `more_information_needed` state for the affected decision;
- unrelated goals/decisions that do not depend on the uncertain retirement tradeoff may remain independently assessable.

Examples of retirement facts that can block the tradeoff include incomplete gross income, retirement projection inputs, unsupported/unverified scheduled retirement contributions, unknown HSA long-term intent when relevant to the protected-rate calculation, and unresolved legal account capacity needed for routing.

### 6. Legal room, scheduled contributions, and cash-flow capacity remain separate

Classification: ESTABLISHED FFH PROJECT POLICY + PROPOSED Phase 5C enforcement rule.

Phase 5C must preserve these separate quantities:

- verified original legal capacity;
- contributions already made;
- supported scheduled future contributions;
- current-year room after scheduled reservation;
- protected retirement floor shortfall;
- additional retirement opportunity above the floor;
- recurring household Build capacity;
- one-time cash.

No Phase 5C tradeoff may cause scheduled contributions to be counted again as new retirement demand.

No negative remaining room or negative floor shortfall may create allocation demand.

### 7. Retirement competition decides amount before account routing decides destination

Classification: PROPOSED FFH PROJECT POLICY.

Phase 5C should determine how much recurring capacity remains available for retirement after approved competition. The existing authoritative retirement-account router should then determine where that amount can legally and policy-validly go.

Phase 5C should not invent a new HSA/IRA/workplace contribution sequence solely to solve goal competition.

Any future change to account ordering must be a separate approved retirement-policy decision informed by FFH-005 where statutory/current rules matter.

### 8. One-time cash remains outside this recurring competition rule

Classification: ESTABLISHED FFH PROJECT POLICY.

FFH-004 concerns recurring Build capacity. Existing-cash and Windfall behavior remain separate. A one-time balance must not be treated as recurring capacity merely to satisfy either a goal or retirement floor.

### 9. Time-sensitive tax-advantaged opportunity may become a future tie-break only when externally verified

Classification: PROPOSED FFH PROJECT POLICY / EXTERNAL FACT DEPENDENCY.

If FFH-005 verifies that a specific contribution opportunity is non-carryforward or has a material current-year deadline, Manager may choose to make that verified timing fact an opportunity-cost tie-break in Phase 5C.

This review does not assume any such statutory rule without FFH-005 evidence.

## POLICY CLASSIFICATION

Material conclusions:

- Employer match remains Secure and non-contestable: ESTABLISHED FFH PROJECT POLICY.
- Existing 15% / 12% / 25% / 5% Phase 5A thresholds: ESTABLISHED FFH PROJECT POLICY.
- Protected retirement floor cannot be reduced by ordinary goal competition: PROPOSED FFH PROJECT POLICY.
- Only retirement above the floor is contestable: PROPOSED FFH PROJECT POLICY.
- BEHIND / ON_TRACK / AHEAD alter the strength of additional-retirement preference, not the existence of the protected floor: PROPOSED FFH PROJECT POLICY.
- Legal room is not cash-flow capacity: ESTABLISHED FFH PROJECT POLICY / MATHEMATICAL CONSEQUENCE.
- Missing retirement-floor facts block confident retirement-downshift decisions: PROPOSED FFH PROJECT POLICY consistent with existing missing-data principles.
- Exact current contribution limits/account deadlines: EXTERNAL FACTS REQUIRED; not asserted here.

## RATIONALE

1. The repository intentionally created a Hybrid Retirement Floor so retirement need would not be modeled as simply "max every account."
2. Allowing ordinary goals to consume the protected floor would erase the purpose of Phase 5A.
3. Treating all legal room as required retirement would violate the product principle that legitimate life goals do not require every tax-advantaged account to be maxed first.
4. Status-sensitive opportunity cost preserves retirement trajectory: BEHIND households sacrifice extra retirement only reluctantly; AHEAD households can use more capacity for life goals after maintaining the lower protected floor.
5. Structural infeasibility should be visible rather than hidden by allocation ordering.

## EXTERNAL FACTS REQUIRED

From FFH-005 / authoritative current sources before Manager finalizes any statutory-detail-dependent behavior:

- current 2026 contribution limits and shared-limit mechanics used by existing account types;
- any contribution timing / expiration / carryforward rules Manager intends to use as a Phase 5C tie-break;
- any HSA / IRA / workplace rule whose current legal treatment would change account routing or actionable room.

No current statutory dollar limit is relied upon in this policy recommendation.

## ASSUMPTIONS

- Phase 5A outputs remain the authoritative retirement-floor inputs unless Manager changes them.
- Phase 5C concerns recurring Build allocation competition, not Windfall/one-time-cash redesign.
- Goal Intelligence remains derived evidence and Manager will synthesize the exact goal-side eligibility thresholds with FFH-003.
- Engineering will preserve the existing legal-capacity ledger rather than reconstructing statutory room inside Phase 5C.

## FINANCIAL INVARIANTS

1. Employer-match capture cannot be reduced by ordinary goal competition.
2. Goal competition cannot reduce the Phase 5A protected retirement floor.
3. Additional retirement cannot exceed verified remaining legal capacity.
4. Statutory/legal room cannot be treated as household cash-flow capacity.
5. Scheduled contributions cannot consume retirement capacity twice.
6. Contributions already made cannot remain falsely available.
7. One-time cash and recurring capacity remain distinct.
8. A satisfied retirement floor must not continue generating protected-floor demand.
9. Negative remaining legal room or negative residual floor need must clamp to zero; it must never create phantom demand.
10. Unknown legal capacity cannot be converted to zero and then treated as evidence that goals safely outrank retirement.
11. Existing account/shared-group capacity invariants remain authoritative after Phase 5C.
12. Structural retirement shortfall must remain visible when the target correction is infeasible even if the feasible protected floor is fully allocated.

## SCENARIOS ANALYZED

All legal-capacity dollar figures below are hypothetical scenario inputs for policy testing, not claims about current statutory limits.

### Scenario 1 — BEHIND, protected floor not yet met

HOUSEHOLD STATE: BEHIND
ACCOUNT TYPE: verified workplace/IRA routes available
STATUTORY LIMIT: hypothetical verified room sufficient for all listed retirement dollars
CONTRIBUTIONS ALREADY MADE: represented in ledger
EMPLOYER CONTRIBUTIONS: match already protected in Secure
SCHEDULED FUTURE CONTRIBUTIONS: sustainable $900/month retirement pace
EMPLOYER MATCH OPPORTUNITY: fully captured
REMAINING STATUTORY ROOM: $12,000 hypothetical verified room after scheduled reservation
REMAINING POLICY NEED: protected floor requires $1,500/month total; shortfall = $600/month
AVAILABLE ONE-TIME CASH: irrelevant to Phase 5C
AVAILABLE RECURRING CAPACITY: $1,000/month
OTHER COMPETING PRIORITIES: goal requests $800/month
EXPECTED RETIREMENT PRIORITY: first $600/month is protected; remaining $400/month is contestable capacity
EXPECTED ALLOCATION: at least $600/month retirement floor before ordinary goal competition
EXPECTED RESIDUAL NEED: retirement floor residual = $0 after $600; extra-retirement opportunity remains but only $400/month cash is left
WHY: goals may reduce only retirement above the floor
BEHAVIOR THAT WOULD BE WRONG: allocate $800 to goal and only $200 to retirement, reducing the protected floor by $400

### Scenario 2 — BEHIND with structurally infeasible corrective rate

HOUSEHOLD STATE: BEHIND; `structurallyInfeasibleCorrectiveRate = true`
ACCOUNT TYPE: verified route available
STATUTORY LIMIT: hypothetical verified room sufficient
CONTRIBUTIONS ALREADY MADE: known
EMPLOYER CONTRIBUTIONS: known
SCHEDULED FUTURE CONTRIBUTIONS: known
EMPLOYER MATCH OPPORTUNITY: protected
REMAINING STATUTORY ROOM: positive
REMAINING POLICY NEED: target correction exceeds existing protected/feasible ceiling
AVAILABLE RECURRING CAPACITY: entirely consumed by feasible protected floor
OTHER COMPETING PRIORITIES: legitimate goal
EXPECTED RETIREMENT PRIORITY: all feasible protected-floor capacity remains protected
EXPECTED ALLOCATION: no additional retirement above floor; goal receives no ordinary Build capacity unless Manager classifies it through a higher-order policy path
EXPECTED RESIDUAL NEED: structural retirement shortfall remains explicit
WHY: an infeasible correction is a warning, not permission to hide the shortfall
BEHAVIOR THAT WOULD BE WRONG: redirect protected floor to goal and report retirement as satisfied

### Scenario 3 — ON_TRACK, floor already satisfied, strong legitimate goal

HOUSEHOLD STATE: ON_TRACK
ACCOUNT TYPE: verified retirement routes
STATUTORY LIMIT: hypothetical remaining room $15,000
CONTRIBUTIONS ALREADY MADE: known
SCHEDULED FUTURE CONTRIBUTIONS: already satisfy protected floor
EMPLOYER MATCH OPPORTUNITY: fully captured
REMAINING POLICY NEED: protected floor $0; additional retirement opportunity positive
AVAILABLE RECURRING CAPACITY: $1,000/month
OTHER COMPETING PRIORITIES: strongly evidenced legitimate goal needs $700/month
EXPECTED RETIREMENT PRIORITY: only additional retirement is at issue
EXPECTED ALLOCATION: retirement policy permits up to $700/month of the extra-retirement capacity to be displaced by the goal if Manager/Goals policy ranks it accordingly; remaining $300/month may go to additional retirement
EXPECTED RESIDUAL NEED: protected retirement residual remains $0
WHY: ON_TRACK additional retirement is contestable
BEHAVIOR THAT WOULD BE WRONG: call the $700 goal allocation a retirement-floor violation

### Scenario 4 — ON_TRACK, discretionary deadline gaming

HOUSEHOLD STATE: ON_TRACK; protected floor satisfied
ACCOUNT TYPE: verified route
REMAINING STATUTORY ROOM: positive
AVAILABLE RECURRING CAPACITY: $600/month
OTHER COMPETING PRIORITIES: optional/lifestyle goal with an aggressive user-entered fixed date but weak necessity/consequence evidence
EXPECTED RETIREMENT PRIORITY: additional retirement should not automatically lose solely because the goal has a date
EXPECTED ALLOCATION: retirement side recommends preserving additional retirement unless Manager synthesis establishes stronger legitimate goal evidence
WHY: a deadline alone does not transform discretionary spending into protected need
BEHAVIOR THAT WOULD BE WRONG: optional goal outranks extra retirement solely due to date manipulation

### Scenario 5 — AHEAD, legitimate life goal

HOUSEHOLD STATE: AHEAD under existing durable-surplus tests
SCHEDULED FUTURE CONTRIBUTIONS: satisfy the AHEAD protected floor
EMPLOYER MATCH OPPORTUNITY: fully captured
REMAINING STATUTORY ROOM: positive hypothetical verified room
AVAILABLE RECURRING CAPACITY: $1,200/month
OTHER COMPETING PRIORITIES: legitimate important goal needs $1,000/month
EXPECTED RETIREMENT PRIORITY: additional retirement is highly contestable
EXPECTED ALLOCATION: retirement policy permits the goal to consume the $1,000/month, leaving $200/month for additional retirement, subject to Manager/Goals ranking
EXPECTED RESIDUAL NEED: protected retirement residual remains $0
WHY: FFH should not require account maxing before legitimate goals for a durably AHEAD household
BEHAVIOR THAT WOULD BE WRONG: force all $1,200/month to retirement merely because legal room exists

### Scenario 6 — Employer match incomplete

HOUSEHOLD STATE: any retirement status
EMPLOYER MATCH OPPORTUNITY: employee must contribute an additional $250/month to capture available match
AVAILABLE RECURRING CAPACITY: $500/month
OTHER COMPETING PRIORITIES: goal requests $500/month
EXPECTED RETIREMENT PRIORITY: $250/month match-capture contribution remains Secure and non-contestable
EXPECTED ALLOCATION: Secure match requirement first; only remaining $250/month can reach Phase 5C competition
BEHAVIOR THAT WOULD BE WRONG: reduce match capture to fund the goal

### Scenario 7 — Floor state requires more information

HOUSEHOLD STATE: `more_information_needed`
MISSING FACT: incomplete gross income or material projection/scheduled-capacity/HSA-intent fact
EMPLOYER MATCH OPPORTUNITY: separately verified and protectable
REMAINING STATUTORY ROOM: unknown or partially unknown
AVAILABLE RECURRING CAPACITY: positive
OTHER COMPETING PRIORITIES: goal is fully described
EXPECTED RETIREMENT PRIORITY: no confident retirement-downshift decision
EXPECTED ALLOCATION: preserve independently verified match; return targeted more-information-needed for the goal-versus-retirement tradeoff
BEHAVIOR THAT WOULD BE WRONG: assume AHEAD or assume retirement need is zero so the goal can take all capacity

### Scenario 8 — Legal room exhausted while projection still short

HOUSEHOLD STATE: BEHIND or ON_TRACK
STATUTORY LIMIT: hypothetical verified room exhausted after YTD + scheduled reservations
REMAINING STATUTORY ROOM: $0
REMAINING POLICY NEED: retirement projection may still show shortfall
AVAILABLE RECURRING CAPACITY: positive
EXPECTED RETIREMENT PRIORITY: no phantom tax-advantaged allocation
EXPECTED ALLOCATION: retirement allocation through affected verified routes = $0; expose legal-capacity constraint/retirement shortfall; remaining cash may continue through other approved policy layers
BEHAVIOR THAT WOULD BE WRONG: allocate retirement dollars beyond verified room because projection says more saving is desirable

### Scenario 9 — Scheduled contributions already reserve room

HOUSEHOLD STATE: ON_TRACK
REMAINING STATUTORY ROOM BEFORE SCHEDULE: $8,000 hypothetical
SCHEDULED FUTURE CONTRIBUTIONS: $5,000 supported current-year reservation
REMAINING STATUTORY ROOM AFTER SCHEDULE: $3,000
PROTECTED FLOOR SHORTFALL: $1,000 annual
EXPECTED OUTPUT: additional opportunity can never be derived from the original $8,000 as though scheduled dollars were unused; at most the post-reservation room can be considered, and protected-floor need must remain separate
BEHAVIOR THAT WOULD BE WRONG: expose $7,000 additional opportunity by subtracting only the floor shortfall from original room

### Scenario 10 — One-time cash is present

HOUSEHOLD STATE: ON_TRACK or AHEAD
AVAILABLE ONE-TIME CASH: $20,000
AVAILABLE RECURRING CAPACITY: $400/month
OTHER COMPETING PRIORITIES: recurring goal
EXPECTED OUTPUT: Phase 5C recurring competition uses the $400/month recurring capacity only; the $20,000 one-time balance remains governed by existing-cash/Windfall policy
BEHAVIOR THAT WOULD BE WRONG: divide the one-time cash into artificial monthly income and use it to claim both retirement floor and goal are sustainably funded

## EXPECTED OUTPUTS

Manager/Engineering should be able to derive at least these policy states from Phase 5C:

- employer match protection preserved;
- retirement floor state: protected / satisfied / more_information_needed;
- protected recurring retirement shortfall;
- additional retirement opportunity above floor;
- retirement competition strength: strongest when BEHIND, moderate when ON_TRACK, lowest when AHEAD, unknown when floor state is uncertain;
- structural retirement shortfall warning retained when applicable;
- legal-room constraint retained independently of policy need;
- explicit explanation when a goal reduces only additional retirement rather than the protected floor.

Exact enum/type names are engineering decisions unless Manager chooses to canonize them.

## EXPECTED NON-BEHAVIOR

Phase 5C must not:

- move employer match out of Secure;
- let an ordinary goal reduce the protected retirement floor;
- equate legal room with cash-flow capacity;
- treat all remaining tax-advantaged room as mandatory saving;
- count scheduled contributions twice;
- fabricate legal capacity from a projection shortfall;
- infer AHEAD from missing data;
- create a new HSA/IRA/workplace statutory sequence without separate approval;
- convert one-time cash into recurring income;
- hide structural retirement infeasibility merely because a goal received funding;
- let a user-entered deadline by itself turn discretionary spending into a retirement-floor override.

## EDGE CASES

- Current retirement savings already exceed protected target: protected floor shortfall clamps to zero; all further retirement is contestable.
- Protected target exceeds legal room: no phantom retirement allocation; expose capacity constraint.
- Protected target exceeds feasible recurring cash: use existing feasible protected amount and preserve structural shortfall signal.
- Multiple accounts/share groups: Phase 5C amount must flow through existing capacity ledger; no duplicated room.
- HSA contributions with unknown long-term intent: do not count them optimistically toward AHEAD/floor satisfaction.
- Unverified scheduled contributions: do not treat them as sustainable floor fulfillment.
- Employer match requires employee contribution above the normal employee guardrail: actual match protection remains controlling under existing policy.
- Negative/overfunded residuals: clamp to zero and do not reverse allocation order.
- Exact tie between a goal and additional retirement: Manager synthesis should define deterministic tie behavior using Goals Policy evidence; retirement floor is not part of the tie.

## TRADEOFFS

Advantages:
- preserves the purpose of Phase 5A;
- avoids a simplistic "max retirement before goals" system;
- makes retirement opportunity cost sensitive to trajectory;
- prevents goal deadline gaming from raiding protected retirement;
- keeps legal-capacity accounting isolated from preference ranking.

Costs / limitations:
- some households may see a goal underfunded while a protected retirement contribution remains recommended;
- BEHIND households need stronger goal evidence to justify reducing extra retirement above the floor;
- missing retirement data can block a confident tradeoff even when goal data is complete;
- Manager still must synthesize exact goal-side thresholds and deterministic tie behavior from FFH-003.

## ACCEPTANCE SCENARIOS

Engineering should later encode tests demonstrating at minimum:

1. Employer-match contribution is unchanged when any goal is added/removed.
2. A BEHIND household with a positive protected-floor shortfall funds that shortfall before ordinary goal competition.
3. A goal can reduce additional retirement after the floor is satisfied without reducing the floor.
4. AHEAD reduces only the retirement protection strength above the floor; it does not eliminate employer match or the AHEAD floor.
5. `more_information_needed` retirement floor prevents a confident goal-driven retirement reduction.
6. Scheduled current-year contributions are not double-counted as fresh room.
7. Legal room exhaustion prevents phantom retirement allocation even with a projection shortfall.
8. Structural infeasibility remains visible after feasible protected floor is allocated.
9. One-time cash does not increase recurring Phase 5C capacity.
10. Equivalent account ordering does not change the total protected-floor requirement or total contestable retirement amount.

## CONFIDENCE

HIGH on the core retirement-side boundary: employer match and Phase 5A protected floor should be insulated from ordinary goal competition; only retirement above the floor should be contestable.

MEDIUM on the exact BEHIND / ON_TRACK / AHEAD mapping for which Goal Intelligence bands may outrank additional retirement, because that final threshold requires independent Goals Policy input and Manager synthesis.

## OPEN QUESTIONS

1. Which FFH-003 goal evidence combinations qualify as strong enough to displace additional retirement for BEHIND and ON_TRACK households?
2. Should Manager adopt a deterministic tie rule or proportional split when goal evidence and additional retirement have equal policy strength?
3. Should any FFH-005-verified current-year contribution deadline become a Phase 5C tie-break, and for which account types?
4. Should a truly essential goal that cannot coexist with the protected floor remain a Build infeasibility, or should some classes be promoted into a separate required/Secure policy path? Retirement Policy recommends that this be explicit rather than achieved by silently raiding the floor.

## RECOMMENDED NEXT ROLE

Manager / Architect.

Manager should synthesize this independent retirement analysis with FFH-003 Goals Policy and FFH-005 Regulatory Research before recording any durable Phase 5C decision or authorizing Engineering.

Implementation readiness: READY FOR MANAGER SYNTHESIS; NOT READY FOR ENGINEERING until Manager approval.
