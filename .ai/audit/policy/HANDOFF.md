# Financial Policy & Scenario Auditor Handoff

## Current assignment

FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition — FINAL fresh independent Financial Policy & Scenario re-audit of the remediation target.

## Exact target audited

- Manager control-plane head verified at audit start and before audit write: `f0e9825f17144b9f24fafbbe1a97816051dec8b9`
- Assigned audit branch: `audit/ffh-017-policy-90a31c75`
- Frozen implementation target: `90a31c755ea88310e58bb9e06ade60af73e182f5`
- Frozen packet: `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_90a31c75.md`
- Historical target `9d3a880e02365b4445b8070344c72c928ca34511` was used only as historical finding evidence.
- Report: `.ai/audit/policy/FFH-017_POLICY_SCENARIO_REAUDIT_90a31c75.md`
- Report commit: `b7ef832eadb143e66f85e3669eaf63e14330dbf6`
- The Technical & Mathematical Auditor's new re-audit conclusions/verdict were not requested, inspected, consulted, copied, or relied upon.

## Verdict

**FAIL — REMEDIATION REQUIRED**

## Finding

**HIGH — FFH-017-P02: R01 missing-information locality can overcorrect into unsupported certainty inside the scarce OUTRANK bucket.**

The remediation correctly fixes the historical global-freeze cases for Optional, legacy-unconfirmed, and other provably lower-priority unknowns. It also correctly fails closed when a material Essential/Important unknown is the only contested tradeoff.

However, `buildRecurringGoalRetirementCompetition(...)` allocates all known OUTRANK core tranches before checking `materialMissingGoals`. That is unsafe when a materially unresolved Essential tranche could itself resolve to OUTRANK and rank ahead of a known OUTRANK tranche under the accepted financial ordering.

Adversarial example:

- recurring capacity: $400/month;
- verified additional retirement request: $100/month;
- Goal A: confirmed Essential, Fixed, High consequence, known $400/month core pace -> OUTRANK;
- Goal B: confirmed Essential, Fixed, Critical consequence, unknown core amount/pace -> MORE_INFORMATION_NEEDED.

If Goal B later resolves to a positive $400/month core pace, it becomes OUTRANK and ranks ahead of Goal A; if its core resolves to zero, Goal A may receive the $400. Therefore Goal A's $400 is not independent of the missing Goal B fact.

The frozen implementation allocates Goal A's $400 first, then detects Goal B's material uncertainty and returns `more_information_needed` with no capacity left. That violates FFH-D004's rule that capacity whose outcome can change must remain unresolved.

This finding is blocking because it can create an actionable recurring recommendation for a weaker known goal while a stronger Critical Essential need may claim the same scarce Bucket-1 capacity once authoritative core facts are supplied.

## Historical P01 status

The original FFH-017-P01 global-freeze examples are materially remediated:

- Optional unknown core remains BELOW and does not freeze verified retirement;
- Optional irrelevant missing borrowing detail remains local;
- legacy-unconfirmed goal gains no elevation and does not freeze unrelated known allocations;
- lower-priority unknown does not suppress known OUTRANK;
- lower-priority unknown does not suppress known CO_PRIORITY;
- standalone genuinely material Essential/Important uncertainty remains fail-closed.

Historical P01 nevertheless cannot be treated as fully closed because FFH-017-P02 is the opposite locality failure within mixed scarce OUTRANK competition.

## Other boundary status

- R02 exact non-tied annual/monthly retirement reconciliation: CLEARS
- R03 separate desired/excess recurring tranche: CLEARS
- Essential OUTRANK with complete facts: CLEARS
- Essential CO_PRIORITY: CLEARS
- Important BEHIND -> BELOW retirement: CLEARS
- Important ON_TRACK/AHEAD narrow co-priority: CLEARS
- Optional/lifestyle BELOW: CLEARS
- sufficient/scarce co-priority common fulfillment: CLEARS
- odd-cent/one-cent exactness: CLEARS
- financially equivalent input reversal: CLEARS
- protected Phase 5A floor / no ordinary-goal raid: CLEARS
- desired/excess remains retirement-junior: CLEARS
- core-satisfied excess scenario: CLEARS
- $600 core + $400 retirement + $600 excess with $1,600 capacity: CLEARS exactly
- factual YTD vs future schedules: CLEARS
- scheduled-capacity no-reuse: CLEARS
- multiple retirement accounts: CLEARS
- spouse/shared IRA: CLEARS
- Existing Cash -> Secure -> Build -> Windfall custody: CLEARS
- Roth eligibility / Traditional deductibility: CLEARS
- SIMPLE / HSA / workplace retirement: CLEARS
- user preference cannot override legal/policy boundaries: CLEARS
- recommendations/plans remain distinct from execution: CLEARS

## Protected FFH-013 M01

**CLEARS exactly:**

- shared annual room: $10,000.01
- owner conditional room: $7,500 each
- Build authority: $833.33/month
- routes: $416.67 + $416.66
- annual legal consumption: $9,999.96
- shared annual remainder: $0.05

## Provenance / validation

- PR #28 final head: `401204a34ec8ddf2305e073a1938f3cfb27a8900`
- frozen integration: `90a31c755ea88310e58bb9e06ade60af73e182f5`
- independent compare final PR head -> frozen integration: zero changed files
- Foundation CI run `35297206526`, job `105452111495`: SUCCESS on exact frozen target
- install, AI-state validation, dependency audit, calculations, security contract, typecheck, lint, and build all completed successfully
- green CI was supporting evidence, not proof

## Manager action

FFH-017 remains blocked from closure on FFH-017-P02.

Remediation must preserve the successful targeted-locality fixes while preventing a known OUTRANK allocation from becoming definite when a materially unresolved Essential tranche can still alter that same scarce OUTRANK ordering/capacity entitlement.

Do not close FFH-017 or activate downstream work from this audit lane. Manager owns remediation routing, new frozen-target creation, reconciliation with the separate Technical & Mathematical audit, acceptance, and eventual closure.
