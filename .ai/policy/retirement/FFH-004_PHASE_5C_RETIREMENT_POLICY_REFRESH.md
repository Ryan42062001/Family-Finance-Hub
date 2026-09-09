# FFH-004 — Phase 5C Retirement Policy Refresh After FFH-005

Date: 2026-09-08
Role: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE — RETIREMENT-SIDE RECOMMENDATION REFRESHED; READY FOR MANAGER SYNTHESIS
Verified refresh starting branch: `f6a138e78083afe6bdf83bc42117c705bda9ca09`

## PURPOSE OF THIS REFRESH

FFH-004 had already produced the independent retirement-side Phase 5C recommendation in `PHASE_5C_RETIREMENT_POLICY.md`. This refresh revalidates that recommendation against the latest canonical repository state, the current Phase 5A Hybrid Retirement Floor specification, the current Phase 5B Goal Intelligence specification, and the now-complete FFH-005 Regulatory Research handoff.

The core FFH-004 conclusion is unchanged. The material refinement is that Phase 5C must distinguish verified tax-advantaged opportunity from opportunity that is only apparently available because legal/account facts are incomplete or because the current evaluator has a known regulatory-model mismatch candidate.

This refresh does not use the Goals Policy specialist's Phase 5C conclusion as a policy input. A repository comparison surfaced that FFH-003 artifacts now exist, but this role did not adopt or reconcile their conclusions. Cross-policy arbitration remains Manager-owned.

## QUESTION

What retirement dollars must remain protected, what retirement dollars may flex when legitimate household goals compete for recurring Build capacity, and how should verified tax-advantaged opportunity, uncertainty, user preferences, and retirement trajectory affect that competition?

## CURRENT CANONICAL POLICY

Classification: ESTABLISHED FFH PROJECT POLICY / VERIFIED REPOSITORY STATE.

1. Employer-match capture is a Secure concern and is separate from additional retirement.
2. Phase 5A separates legal contribution capacity from the policy retirement floor.
3. The normal protected baseline is 15% of complete gross household income.
4. `BEHIND` can raise the protected target using the projection-required corrective rate, subject to the existing 25% protected corrective ceiling and feasible recurring cash flow.
5. `ON_TRACK` retains the normal 15% baseline.
6. `AHEAD` may use the established 12% baseline only when Phase 5A's durable-surplus requirements are satisfied.
7. The existing 5% employee-saving guardrail applies to BEHIND / ON_TRACK and relaxes for AHEAD, but actual employer-match capture remains protected even when it requires more.
8. Supported scheduled contributions reserve current-year capacity before truly additional retirement opportunity is exposed.
9. `additionalRetirementOpportunityAnnual` is an opportunity signal above the protected-floor shortfall; it is not equivalent to household cash-flow capacity and is not itself mandatory allocation demand.
10. Phase 5B Goal Intelligence is deterministic derived evidence. It does not itself reduce retirement or elevate new goal dollars into protected status.
11. Goal Intelligence separates necessity, core need versus desired solution, deadline flexibility, consequence severity, borrowing/debt exposure, schedule state, reasonableness, and deterministic stable tie-breaking. A user-entered fixed date on an optional goal does not make that goal essential.
12. Same normalized household state + policy version + tax year + preferences + explicit as-of date must produce the same authoritative recommendation.

## POLICY GAP / UNCERTAINTY

The central Phase 5C retirement-side gap is not whether retirement should always win. It is where the non-negotiable boundary ends and the flexible opportunity begins.

The following quantities must remain separate:

- Secure employer-match requirement;
- protected retirement policy floor;
- feasible protected-floor shortfall;
- legally verified contribution capacity;
- scheduled future contributions already reserving capacity;
- retirement saving that is desirable but not legally routable through a supported destination;
- additional retirement opportunity above the protected floor;
- recurring Build capacity;
- one-time cash;
- user preference.

Collapsing those concepts would either raid protected retirement for goals or wrongly require every remaining legal tax-advantaged dollar to be funded before legitimate goals.

## PROPOSED POLICY

Unless labeled otherwise, conclusions below are PROPOSED FFH PROJECT POLICY pending Manager approval.

### 1. Employer match remains fully non-contestable

Classification: ESTABLISHED FFH PROJECT POLICY.

Goal-versus-retirement competition begins only after Secure employer-match behavior. No Goal Intelligence evidence, user priority, target date, or AHEAD status may reduce the employee contribution required to capture an available employer match in the Recommended Plan.

A household may choose a different Your Plan, but that preference must not rewrite the authoritative Recommended Plan and must surface the existing override/conflict semantics when protected match is reduced.

### 2. The Phase 5A protected retirement floor remains non-contestable inside ordinary Build competition

Ordinary Build goals may not reduce the recurring retirement pace represented by the Phase 5A protected floor.

For policy purposes, the protected recurring need is the nonnegative unsatisfied amount represented by `protectedFloorShortfallAnnual`, converted to the engine's recurring planning period without inventing more cash flow or legal room.

The protected floor is a policy need, not a promise that every protected dollar is currently legally routable through a modeled tax-advantaged account. If legal routing is insufficient, Phase 5C must expose the routing/capacity constraint rather than fabricate an allocation. Unroutable retirement need must remain visible but must not create phantom consumption of recurring cash.

### 3. Only retirement above the protected floor is contestable

Once Secure match and the feasible/routable protected floor are satisfied, retirement above that floor is a contestable Build opportunity.

A goal may reduce retirement only from this contestable tranche.

Conceptually:

`contestable retirement <= verified remaining legal room after YTD + one-time + Secure + scheduled reservations + protected-floor routing`

and

`contestable retirement <= recurring Build capacity remaining after higher-order approved needs`.

`additionalRetirementOpportunityAnnual` may inform this tranche only to the extent the underlying account/shared-group room is genuinely verified under the current legal-capacity model.

### 4. Retirement trajectory changes how strongly contestable retirement should be defended

#### BEHIND

The protected floor already carries corrective behavior. After that floor is satisfied, additional retirement should receive the strongest retirement-side preference because the projection still indicates a shortfall.

Retirement-side boundary:
- discretionary/optional goal dollars should not displace additional retirement;
- a flexible deadline by itself should not displace additional retirement;
- only strongly evidenced legitimate household needs should be candidates to displace additional retirement;
- the exact goal evidence threshold belongs to Manager synthesis with Goals Policy;
- structural shortfall must remain visible even if some contestable retirement is redirected to a qualifying goal.

#### ON_TRACK

After the protected floor is satisfied, additional retirement is meaningfully contestable.

Retirement-side boundary:
- strong legitimate goal evidence may displace part or all of additional retirement;
- weaker/discretionary goal evidence should not automatically displace additional retirement;
- remaining verified tax-advantaged opportunity is a real opportunity cost but is not a command to max every account.

#### AHEAD

After the established AHEAD floor is satisfied, additional retirement is the most flexible.

Retirement-side boundary:
- legitimate life goals may consume some or all contestable retirement capacity without constituting a retirement-policy failure;
- remaining legal tax-advantaged room does not become protected merely because it exists;
- employer match, the AHEAD floor, legal-routing integrity, and explicit uncertainty remain protected.

### 5. Tax-advantaged opportunity cost is a secondary retirement preference, not a protected floor

Classification: PROPOSED FFH PROJECT POLICY informed by VERIFIED CURRENT EXTERNAL FACTS from FFH-005.

Verified remaining tax-advantaged room can strengthen the case for additional retirement because using recurring capacity elsewhere may forgo an account-specific current-year opportunity. However, Phase 5C must not convert all verified legal room into mandatory retirement saving.

Policy rules:
- tax-advantaged opportunity cost applies only above Secure match and the protected floor;
- it is strongest for BEHIND, meaningful for ON_TRACK, and least controlling for AHEAD;
- it may be used only when the relevant room is verified and legally routable;
- no contribution deadline, carryforward assumption, or account-expiration tie-break may be invented from memory;
- Manager may adopt a specific timing-based tie-break only when Regulatory Research has explicitly verified the relevant timing rule for that account/opportunity;
- account routing remains downstream of the amount decision unless Manager separately approves a retirement-account sequencing policy change.

### 6. Known legal-capacity mismatch candidates cannot be treated as verified opportunity

Classification: PROPOSED FFH PROJECT POLICY based on FFH-005 verified findings.

FFH-005 identified current repository mismatch/model-gap candidates that can affect actionable retirement room:

- certain higher-limit SIMPLE age-50 catch-up handling may overstate 2026 room by $150 in the affected category;
- governmental 457(b) age-based catch-up routing does not currently apply the verified 2026 high-wage Roth catch-up constraint;
- HSA full-year capacity cannot always be established from the current annual `hsa_eligible` boolean because statutory HSA eligibility is month-sensitive and Medicare/last-month-rule facts can matter;
- the current HSA ordinary-versus-catch-up YTD attribution block is a conservative FFH modeling choice, not a verified statutory labeling requirement.

Phase 5C retirement policy therefore must not use affected unverified/mismodeled room to:

- claim that the protected floor is sustainably satisfied;
- classify a household more optimistically;
- increase contestable retirement opportunity;
- block a goal solely because apparently available retirement room may be overstated;
- tell the user a contribution destination is confidently available.

Until Manager-authorized remediation or semantic clarification resolves the affected case, use targeted `more_information_needed` / conservative exclusion for the affected retirement opportunity rather than fabricated certainty.

### 7. Missing information should block only the dependent retirement tradeoff

If the protected floor itself is uncertain, Phase 5C must not confidently reduce retirement for a goal.

If the protected floor is known and satisfied but only one possible additional-retirement route is uncertain, the uncertainty should block only the contested amount that depends on that route. Other verified routes and unrelated decisions remain usable.

Required missing-information discipline:
- unknown legal capacity is not zero;
- unknown legal capacity is not positive room;
- an unknown extra-retirement opportunity cannot be used to manufacture either retirement dominance or goal dominance;
- separately verified employer match remains protected;
- a household cannot be classified AHEAD merely to free goal capacity when retirement inputs are materially incomplete.

### 8. HSA long-term retirement use remains intent-sensitive

Classification: ESTABLISHED FFH PROJECT POLICY with FFH-005 refinement.

Only the long-term portion of supported HSA contributions belongs in the Phase 5A retirement-saving rate. Expected current medical use remains excluded according to existing policy.

FFH-005 adds a separate legal-capacity warning: even when long-term intent is known, HSA contribution room itself must not be assumed full-year merely from an annual eligibility flag unless Manager confirms that persisted field semantically means verified full-year/last-month-rule-qualified eligibility or the data model is enhanced.

The ordinary-versus-catch-up YTD attribution issue should be described as FFH modeling uncertainty, not statutory labeling law.

### 9. User preferences may change contestable retirement, not protected retirement in the Recommended Plan

Classification: PROPOSED FFH PROJECT POLICY consistent with existing Recommended Plan / Your Plan separation.

User preferences may:
- favor a legitimate goal over some contestable additional retirement;
- favor more retirement than the minimum protected trajectory;
- select among policy-permitted gray-zone outcomes after higher-order safeguards are satisfied.

User preferences may not, in the authoritative Recommended Plan:
- waive employer-match protection;
- redefine BEHIND as ON_TRACK or AHEAD;
- reduce the Phase 5A protected floor;
- manufacture legal contribution room;
- turn a discretionary goal into protected need merely by increasing priority or tightening a deadline;
- convert one-time cash into recurring capacity.

A user may explicitly choose a different Your Plan, but the product must keep the authoritative recommendation and any resulting conflicts/shortfalls visible.

### 10. Determinism and order invariance are required policy behavior

The Phase 5C retirement decision must be a pure consequence of normalized financial inputs, current policy/tax-policy versions, explicit `asOfDate`, verified legal-capacity state, and approved goal evidence.

Required deterministic behavior:
- no wall-clock reads;
- no AI-generated ranking;
- no dependence on incidental account/goal array order;
- cent-consistent residual calculations;
- stable identity/tie-breaking where equivalent policy evidence requires it;
- same inputs produce the same protected retirement amount, contestable retirement amount, uncertainty state, and explanation.

Phase 5C should not introduce a hidden numeric "retirement versus goals" magic score. Manager should approve explicit relationship rules and any true tie behavior.

## POLICY CLASSIFICATION

- Employer match as Secure/non-contestable: ESTABLISHED FFH PROJECT POLICY.
- Phase 5A normal/AHEAD/corrective/employee-guardrail structure: ESTABLISHED FFH PROJECT POLICY.
- Phase 5B Goal Intelligence fields and deterministic evidence structure: VERIFIED REPOSITORY STATE.
- Protected retirement floor insulated from ordinary goal competition: PROPOSED FFH PROJECT POLICY.
- Only above-floor retirement is contestable: PROPOSED FFH PROJECT POLICY.
- Tax-advantaged room as secondary opportunity-cost evidence rather than mandatory maxing: PROPOSED FFH PROJECT POLICY.
- FFH-005 SIMPLE / governmental 457(b) / HSA external findings: VERIFIED CURRENT EXTERNAL FACTS as recorded by Regulatory Research.
- Conservative exclusion of affected unverified/mismodeled room from Phase 5C opportunity: PROPOSED FFH PROJECT POLICY.
- User preferences bounded to contestable retirement in the Recommended Plan: PROPOSED FFH PROJECT POLICY.

## RATIONALE

1. Phase 5A exists specifically to separate protected retirement trajectory from legal account maxing.
2. Phase 5B exists to provide evidence for legitimate goal competition without automatically granting goals protected status.
3. Employer match has distinct employer-benefit value and is already placed in Secure.
4. A BEHIND household has greater retirement opportunity cost than an otherwise equivalent AHEAD household, but the protected floor already absorbs the non-contestable portion of that difference.
5. Verified legal room is valuable information, but it is not equivalent to available household cash and cannot become mandatory merely because an account can legally accept money.
6. Known statutory/model mismatches make it unsafe to use apparent room as a confident policy signal.
7. User choice is preserved through Your Plan rather than by weakening the authoritative Recommended Plan.

## EXTERNAL FACTS RELIED UPON

Source: FFH-005 Regulatory & Financial Research Analyst handoff, based on current authoritative IRS sources.

Material facts used in this refresh:
- current 2026 account limits and catch-up structures are tax-year/account-specific and must be modeled by the legal-capacity layer rather than invented in Phase 5C;
- certain SIMPLE higher-limit age-50 catch-up handling is a repository mismatch candidate;
- governmental 457(b) age-based catch-up can be subject to the 2026 high-wage Roth requirement, which the current evaluator does not fully apply;
- HSA eligibility is month-sensitive and full-year room is not established for every household by a generic annual eligibility boolean;
- married HSA ordinary-family capacity and owner catch-up structure do not create a statutory requirement to label prior YTD deposits as ordinary versus catch-up dollars.

No new statutory constant is embedded into this proposed Phase 5C policy.

## ASSUMPTIONS

- Phase 5A remains the authoritative source of protected-retirement-floor outputs pending Manager action.
- Phase 5B remains evidence-only until Manager approves Phase 5C.
- Current legal-capacity/account routing remains authoritative except where FFH-005 has explicitly identified a mismatch/modeling gap requiring Manager disposition.
- FFH-004 does not decide the exact goal evidence threshold for OUTRANK / CO_PRIORITY / BELOW relationships.
- Existing-cash and Windfall policy are out of scope.

## FINANCIAL INVARIANTS

1. One dollar cannot be allocated twice.
2. Employer-match opportunity cannot be reduced by ordinary goal competition.
3. Protected retirement floor cannot be reduced by ordinary goal competition.
4. Legal room is not recurring household cash-flow capacity.
5. Scheduled contributions cannot consume legal room twice.
6. YTD contributions cannot remain falsely available.
7. Additional retirement cannot exceed verified routable room.
8. A projection shortfall cannot manufacture legal capacity.
9. Known account-capacity uncertainty cannot be treated as verified opportunity.
10. One-time cash remains distinct from recurring Build capacity.
11. Negative residual need/room clamps to zero and cannot create phantom demand.
12. Structural retirement shortfall remains visible when the mathematically desired correction is infeasible.
13. A satisfied floor does not continue consuming protected allocation.
14. User preference cannot rewrite the authoritative protected floor or Secure match.
15. Equivalent normalized inputs remain order-invariant and deterministic.

## SCENARIOS ANALYZED

The original FFH-004 artifact contains ten retirement competition scenarios. The following additional scenarios incorporate the new FFH-005 evidence.

### Scenario 11 — apparent SIMPLE catch-up room is not fully verified

HOUSEHOLD STATE: ON_TRACK, protected floor satisfied
ACCOUNT TYPE: affected higher-limit SIMPLE age-50 case identified by FFH-005
APPARENT ADDITIONAL ROOM: includes the current evaluator's potentially overstated marginal amount
AVAILABLE RECURRING CAPACITY: positive
OTHER COMPETING PRIORITY: legitimate goal
EXPECTED RETIREMENT PRIORITY: do not count the mismatch-candidate portion as verified contestable retirement opportunity
EXPECTED OUTPUT: Phase 5C uses only verified room; affected marginal room is conservative/uncertain until remediation
WRONG BEHAVIOR: make the goal lose because the engine says the overstated marginal retirement room definitely exists

### Scenario 12 — governmental 457(b) catch-up requires unresolved Roth support

HOUSEHOLD STATE: BEHIND or ON_TRACK, floor otherwise known
ACCOUNT TYPE: governmental 457(b), age-based catch-up candidate, high-wage rule applicable according to verified facts
PLAN ROTH SUPPORT: missing or unsupported
AVAILABLE RECURRING CAPACITY: positive
EXPECTED RETIREMENT PRIORITY: ordinary verified retirement room may remain usable; affected catch-up room is not a confident routable opportunity
EXPECTED OUTPUT: targeted information-needed/conservative exclusion for the catch-up portion
WRONG BEHAVIOR: count the affected catch-up as definitely routable and use it to block a goal or claim the floor is satisfied

### Scenario 13 — HSA eligibility is only annual/ambiguous

HOUSEHOLD STATE: ON_TRACK
ACCOUNT TYPE: HSA
PERSISTED FACT: `hsa_eligible=true`, but no evidence that the field represents verified full-year or valid last-month-rule-qualified capacity
EXPECTED HSA USE: long-term intent is known
AVAILABLE RECURRING CAPACITY: positive
EXPECTED RETIREMENT PRIORITY: HSA tax-advantaged opportunity is not confidently full-year verified
EXPECTED OUTPUT: do not use assumed full-year HSA room to increase contestable retirement opportunity; request/require the missing legal eligibility basis if the tradeoff depends on it
WRONG BEHAVIOR: treat the annual boolean as conclusive full-year statutory room in every case

### Scenario 14 — HSA YTD ordinary/catch-up attribution uncertainty

HOUSEHOLD STATE: AHEAD, protected floor satisfied
ACCOUNT TYPE: married-family HSA with age-55 catch-up participant
CURRENT ENGINE STATE: attribution may return information-needed
VERIFIED EXTERNAL FACT: IRS guidance reviewed by FFH-005 does not require prior deposits to carry ordinary-versus-catch-up labels
EXPECTED RETIREMENT PRIORITY: do not call the attribution block a statutory requirement
EXPECTED OUTPUT: current conservative block may remain pending Manager modeling decision, but explanations classify it as product/model uncertainty; it cannot be used as false evidence of zero legal room
WRONG BEHAVIOR: state that federal law requires FFH's current attribution labels

## EXPECTED OUTPUTS

Phase 5C should make the following retirement-side facts independently inspectable:

- Secure employer-match amount/status;
- retirement trajectory state: BEHIND / ON_TRACK / AHEAD / MORE_INFORMATION_NEEDED;
- protected annual/monthly retirement need;
- protected-floor satisfaction/routing state;
- structural retirement shortfall if present;
- verified legal room after YTD/scheduled/fixed consumers;
- contestable additional-retirement opportunity;
- uncertainty affecting only the relevant route/tranche;
- retirement opportunity-cost strength based on trajectory;
- explicit explanation when a goal reduces only contestable retirement;
- explicit distinction between policy need, legal room, and cash-flow capacity.

## EXPECTED NON-BEHAVIOR

Phase 5C must not:

- move employer match out of Secure;
- let ordinary goal competition raid the protected floor;
- require every tax-advantaged account to be maxed before legitimate goals;
- count known mismatch-candidate room as confidently verified;
- use unknown room as zero or positive room;
- hide a retirement shortfall because legal room is exhausted;
- invent tax deadlines/carryforward rules;
- silently create a new HSA/IRA/workplace sequencing hierarchy;
- allow user preference to rewrite the authoritative Recommended Plan;
- turn an optional goal into protected need via deadline or priority manipulation;
- create nondeterministic output from incidental ordering or current wall time.

## ACCEPTANCE SCENARIOS

Future Engineering acceptance should demonstrate at minimum:

1. Employer-match recommendation is identical when competing goals are added, removed, or reordered.
2. Positive Phase 5A protected-floor shortfall is allocated/protected before ordinary goal competition when legally routable and feasible.
3. A goal may reduce additional retirement after the floor is satisfied without reducing the floor itself.
4. BEHIND, ON_TRACK, and AHEAD change only the strength/flexibility of above-floor retirement, not match protection.
5. AHEAD does not require all verified legal room to be used before legitimate goals.
6. `more_information_needed` floor state prevents confident goal-driven retirement downshift.
7. Unknown extra-room state does not become false zero room or false positive room.
8. Scheduled current-year contributions reserve capacity once and only once.
9. Legal-room exhaustion prevents phantom tax-advantaged retirement allocation while preserving visible retirement shortfall.
10. Known FFH-005 mismatch-candidate room is excluded/conservatively blocked until the authorized legal-capacity remediation resolves it.
11. HSA partial-year/full-year eligibility ambiguity does not create confident full-year additional room.
12. HSA YTD attribution uncertainty is explained as model/policy uncertainty rather than mislabeled as statutory law.
13. User preference changes only contestable retirement in the Recommended Plan; attempts to reduce match/floor remain Your Plan conflict territory.
14. One-time cash does not increase recurring Phase 5C capacity.
15. Equivalent account and goal ordering produces identical retirement protection, contestable amount, uncertainty state, and cent-rounded residuals.

## TRADEOFFS

Advantages:
- preserves Phase 5A's protected-trajectory purpose;
- preserves legitimate goal flexibility without automatic account maxing;
- makes tax-advantaged opportunity cost real but correctly bounded;
- prevents known legal-capacity mismatches from distorting goal competition;
- supports user choice without weakening the Recommended Plan;
- remains explainable and deterministic.

Costs / limitations:
- some tradeoffs become information-needed until account/legal facts are sufficient;
- affected FFH-005 mismatch/modeling findings require Manager disposition before those routes can be treated as fully verified;
- the exact cross-domain goal threshold and any true co-priority allocation rule remain Manager synthesis questions.

## CONFIDENCE

HIGH: employer match and the Phase 5A protected floor should remain outside ordinary goal competition.

HIGH: only verified legally routable opportunity should contribute to the above-floor retirement opportunity-cost signal.

HIGH: FFH-005's identified mismatch/model gaps require conservative classification rather than false legal certainty.

MEDIUM: exact cross-domain thresholds for when qualifying goals displace additional retirement, because that requires Manager synthesis with Goals Policy.

## OPEN QUESTIONS FOR MANAGER

1. Which Goal Intelligence evidence combinations may OUTRANK, CO-PRIORITIZE with, or remain BELOW additional retirement for each retirement status?
2. What deterministic allocation rule applies to a true co-priority scarcity case?
3. Should any explicitly verified account timing rule become a tie-break, and if so which rule/source/account type?
4. Should a truly essential goal that cannot coexist with the protected floor remain an explicit Build infeasibility or be classified into another required/Secure path?
5. How should Manager route FFH-005 R1/R2/R3 remediation before relying on the affected capacity in Phase 5C?
6. Should FFH retain the conservative HSA YTD attribution block as a product policy, relax it to a capacity-allocation model consistent with FFH-005, or require richer persisted HSA facts?

## RECOMMENDED NEXT ROLE

Manager / Architect.

Manager should synthesize the original FFH-004 recommendation, this FFH-005-informed refresh, the independent FFH-003 Goals Policy artifact, and FFH-005 Regulatory Research. Manager must record durable Phase 5C policy and any prerequisite legal-capacity remediation before Engineering begins Phase 5C implementation.

Implementation readiness: READY FOR MANAGER SYNTHESIS. NOT READY FOR ENGINEERING until Manager approval and disposition of material affected legal-capacity findings.
