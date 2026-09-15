# FFH-013 — Final Fresh Technical & Mathematical Re-audit — 4b7ed998

**Role:** Technical & Mathematical Auditor  
**Execution mode:** `STANDARD_CHAT`  
**Audit lane:** fresh independent Technical & Mathematical audit  
**Manager control-plane head verified:** `401d7c074ba8bfd1e55771e4ada63f35b7bbaef0`  
**Exact frozen implementation target:** `4b7ed99894e396beadc02a537dad45963f5db1d5`  
**Frozen packet:** `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_4b7ed998.md`  
**PR:** `#25 — FFH-013: remediate final R01 R02 R03 audit findings`  
**Production candidate:** `8d9cbc62e47c651ad8e6564f325c20ffd67a439b`  
**Final worker/handoff head:** `d5aa88d8b26aac5ca0c857ff949c031aec8a2559`  
**Verdict:** **PASS**

This report is a fresh independent audit of only the exact frozen implementation target above. The Financial Policy & Scenario Auditor's conclusions and verdict were not used. The prior Technical FFH-013 report was treated only as historical finding context; each remediated condition was reverified against the exact frozen source/test evidence. Later Manager/control-plane commits were used only to establish workflow, task, packet, and routing state.

## Frozen-target custody and CI evidence

Independent repository checks establish:

- current Manager control-plane head is exactly `401d7c074ba8bfd1e55771e4ada63f35b7bbaef0`;
- PR #25 is merged and its merge commit is exactly frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5`;
- candidate Foundation CI run `34911857129`, job `104200881078`, is green at exact production SHA `8d9cbc62e47c651ad8e6564f325c20ffd67a439b` through AI-state validation, dependency audit, calculations, security contract, typecheck, lint, and build;
- final-head Foundation CI run `34912465644`, job `104202768407`, is green at exact final worker head `d5aa88d8b26aac5ca0c857ff949c031aec8a2559` through the same required gates;
- compare `8d9cbc62e47c651ad8e6564f325c20ffd67a439b..d5aa88d8b26aac5ca0c857ff949c031aec8a2559` changes only `.ai/engineering/engine/HANDOFF.md` and `.ai/tasks/FFH-013.md`;
- compare `d5aa88d8b26aac5ca0c857ff949c031aec8a2559..4b7ed99894e396beadc02a537dad45963f5db1d5` contains **zero changed files**;
- therefore the frozen integration target is file-identical to the fully green final worker head and contains the same production tree as the validated candidate plus documentation-only worker/task updates.

Green CI was treated as supporting regression evidence, not proof of the financial semantics below.

## Findings

**No CRITICAL, HIGH, MEDIUM, or LOW findings.**

No reachable technical, mathematical, ledger-conservation, ordering, rounding, contribution-period-authority, invalid-date, or protected-regression defect was identified in the exact frozen target within the approved FFH-013 scope.

## R01 — missing aggregate spouse IRA YTD — CLEARS

The frozen evaluator aggregates Traditional + Roth IRA YTD by owner while preserving unknowns: if any represented IRA YTD component is unknown, the aggregate remains unknown rather than being converted to zero. Missing account inventory is also detected independently from represented-account values.

For an MFJ unequal-compensation pair, the implementation establishes the owner conditional limits but, when either spouse's authoritative aggregate IRA YTD is absent or unknown, it sets both affected compensation-capacity results to unresolved and attaches the targeted missing-YTD reason. The resulting IRA opportunities are `more_information_needed` with `remainingAnnualRoom = null`. `createRetirementCapacityLedger()` therefore creates unverified entries with no original/remaining allocatable room, and `remainingRetirementCapacity()` returns `null` rather than a positive amount.

The required `$10,000/$5,000` adversary clears:

- A aggregate Traditional + Roth YTD known `$0`;
- B aggregate Traditional + Roth YTD unknown;
- A room: unresolved / no definite allocatable room;
- B room: unresolved / no definite allocatable room;
- both affected opportunities: targeted `more_information_needed`;
- ledger entries: unverified, no verified allocatable room.

Fresh source/test verification also clears the required resolutions and invariants:

- resolving B YTD to known `$0` restores the known feasible set with conditional owner room `$7,500/$7,500`;
- resolving B YTD to `$8,000` preserves the protected post-YTD shared fail-closed state with zero new room for the affected shared group and the supported-excess warning;
- reversing which spouse has the missing YTD produces the same material fail-closed result;
- reversing person input order and IRA account input order is materially invariant;
- multiple Traditional/Roth records cannot hide the unknown because one unknown component propagates to the owner aggregate;
- absence of a recorded spouse IRA account is not treated as proof of zero aggregate YTD when the shared spousal feasible set applies;
- equal-compensation cases preserve owner-local behavior: the known spouse can retain verified owner room while the spouse with unknown own YTD remains `more_information_needed`, and no MFJ shared group is manufactured solely from equal compensation;
- no withdrawal, recharacterization, earnings, penalty, or correction mechanics are invented.

This satisfies FFH-D006 missing-material-fact rules and the reconciliation requirement that no legal allocation be initialized from an unresolved material fact.

## R02 — one current-year contribution-period authority — CLEARS

The neutral authority is exactly:

- `lib/calculations/money-priority-contribution-period.ts`
- `remainingContributionMonths(asOfDate, taxYear)`

Fresh source inspection verifies the materially equivalent current-year contribution-period consumers use that authority:

- `money-priority-retirement-accounts.ts` imports and uses it for current-year IRA schedule pacing;
- `money-priority-retirement-floor.ts` imports and uses it for the current-year scheduled reservation horizon;
- `money-priority-secure.ts` imports and uses it for remaining-year employer-match pacing and legal-capacity reservation;
- `money-priority-engine.ts` imports and uses it for the authoritative Secure allocation/consumption path;
- `money-priority-user-plan.ts` imports and uses it for current-year employer-match capacity verification.

PR #25 removes the former local `remainingContributionMonths(...)` implementations from Secure, engine, and user-plan; retirement-accounts and retirement-floor were already on the neutral helper. The new exact-source regression scans production calculation files for the prior `12 - getUTCMonth()`-equivalent pattern and reports no remaining occurrence. Manual inspection of the named consumers found no local duplicate function or alternative current-year remaining-month formula.

The neutral helper has no imports, so the centralization does not introduce a circular dependency.

Distinct full-year semantics remain intentionally distinct. For example, the hybrid retirement floor still computes full-year sustainable/reporting amounts with a 12-month horizon while separately evaluating the current-year reservation with `remainingContributionMonths(...)`; Build recurring retirement capacity and user-plan Build amounts remain full-year recurring-plan semantics rather than being incorrectly changed to a remaining-current-year employer-match horizon. No genuinely different annual-reporting contract was collapsed into the current-year helper.

## R03 / P03 strict invalid calendar dates — CLEARS

The shared helper now uses strict `YYYY-MM-DD` component parsing and validates month/day bounds with explicit leap-year logic before computing the inclusive remaining-month count. JavaScript Date normalization is not used to convert impossible calendar dates into a shorter horizon.

Fresh source verification establishes the required exact results:

- missing date => `12`;
- clearly unparsable date => `12`;
- wrong tax year => `12`;
- `2026-09-31` => `12`;
- `2026-02-30` => `12`;
- `2026-02-29` => `12` because 2026 is not a leap year;
- valid `2024-02-29` for tax year 2024 => valid February result `11`;
- `2026-01-01` => `12`;
- `2026-09-01` => `4`;
- `2026-12-01` => `1`.

The as-of month is inclusive because the validated result is `13 - month`.

## P03 valid-date scheduling — CLEARS

The valid-date schedule behavior remains correct and distinct from factual YTD.

Pinned September adversary:

- compensation `$10,000/$0`;
- A factual IRA YTD `$7,000`;
- active schedule `$500/month`;
- as-of `2026-09-01`;
- four supported remaining months;
- opportunity-level future schedule intent `$2,000`;
- owner legal room `$500`;
- ledger reservation capped to exactly `$500`;
- factual `contributedYtd` remains `$7,000`;
- shared scheduled consumption is exactly `$500`;
- shared new-recommendation room falls from `$3,000` to `$2,500` before later consumers;
- the ledger invariant holds.

Pinned December behavior also clears: `$500/month` at `2026-12-01` reserves one supported month, `$500`, rather than annualizing to `$6,000`.

The production engine passes its `asOfDate` into retirement opportunity evaluation before the capacity ledger is created, so the schedule reservation is embedded in the authoritative ledger before Existing Cash, Secure, Build, or Windfall can consume it.

The hybrid retirement-floor path does not consume the reservation a second time: it reads the already-reserved shared scheduled amount for IRA current-year support while using a clone for floor analysis. Staged tests show scheduled capacity plus later one-time/Build/Windfall consumption exactly exhausts, but never exceeds, the original shared group.

## Protected FFH-013 behavior

### T1 — CLEARS

For non-scarce unequal compensation `$100,000/$50,000` with YTD `$8,000/$0`:

- A additional room = `$0`;
- B additional room = `$7,500`;
- A receives the owner-local excess warning;
- no false zero-room MFJ shared group suppresses B.

Reverse-owner excess and person/account order reversal preserve the material result.

### A01 — CLEARS

The annual tied-owner helper caps the requested amount to the one common shared MFJ group **before** proportional owner allocation. For `$15,000` tied annual demand against `$10,000.01` shared room, the exact routes are:

- `$5,000.01`;
- `$5,000.00`;
- aggregate `$10,000.01`;
- shared remainder `$0.00`.

Changing stable account identity can affect only the unavoidable one-cent remainder; it cannot create a material owner priority.

### A02 — CLEARS

Actual YTD and active schedules remain separate representations. YTD reduces legal capacity once; schedules are planning reservations recorded as `consumed.scheduled`; later consumers see the reduced entry/owner/shared group room. Partial-YTD, zero-YTD, multiple-account, and staged-consumer tests preserve exact-once consumption.

### A03 — CLEARS

Compensation `$10,000/$5,000`, YTD `$8,000/$0` remains fail-closed for the affected shared relationship with no phantom spouse capacity.

### A04 — CLEARS

Compensation `$4,000/$2,000`, YTD `$5,000/$0` produces zero new room for the affected shared MFJ group plus the supported-excess warning. No correction mechanics are invented.

### A05 — CLEARS

Conditional owner maxima remain explicitly non-additive. Household-facing reasons identify the one shared MFJ compensation pool, the ledger holds the shared amount once, and a one-time request cannot sum both conditional owner maxima as independent household room.

## M01 — CLEARS EXACTLY

The required recurring Build boundary remains exact:

- shared annual room: `$10,000.01`;
- owner conditional room: `$7,500` each;
- authoritative Build allocation: `$833.33/month`;
- concrete routes: `$416.67 + $416.66`;
- aggregate routed monthly amount: exactly `$833.33`;
- concrete annual legal consumption: `$5,000.04 + $4,999.92 = $9,999.96`;
- shared annual remainder: exactly `$0.05`.

The recurring tie helper uses integer monthly cents, converts each routed monthly amount to the exact annual cents it consumes, and throws if the legal-ledger consumption does not equal `monthly cents × 12`. Build's prepass and actual router call the same tie helper. Build also throws unless concrete monthly destination allocations equal the authorized retirement monthly amount with no positive residual.

No epsilon/tolerance is used as a financial reconciliation waiver, and no positive residual is silently clamped away. Stable identity is used only to resolve the unavoidable final cent after equal fulfillment.

Account-order reversal preserves the exact material result.

## M02 — CLEARS

Equal compensation `$10,000/$10,000`, YTD `$8,000/$0` remains owner-local:

- A room `$0`;
- B room `$7,500`;
- A owner-local excess warning;
- no MFJ shared compensation group is created solely from owner excess;
- reversing owner/person/account ordering remains materially invariant.

## Owner/shared conservation, multiple accounts, and staged consumers

Traditional + Roth IRA actual YTD is aggregated by owner exactly once. Multiple IRA account records do not multiply owner or shared legal room. Owner-level and shared-group ledger room is represented once and `remainingRetirementCapacity()` intersects entry, owner-group, and shared-group constraints.

Existing Cash consumes the authoritative ledger passed by the engine. Secure planning uses a clone for its prepass, while the authoritative Secure allocation consumes the main ledger. Build receives that same main ledger after Existing Cash and Secure. Windfall starts from an immutable clone of the engine's **final** authoritative ledger, so it can consume remaining room without recreating room already spent by Existing Cash/Secure/Build. Each path uses the shared tie helper for financially equivalent MFJ IRA one-time routing and the recurring helper for Build monthly routing where applicable.

The protected staged and multiple-account regressions remain green at the file-identical final target, and direct invariant checks show total entry/group consumption does not exceed original capacity.

## Tax-rule and unrelated-retirement preservation

No regression was identified in the protected adjacent contracts:

- Roth direct-contribution eligibility remains separately evaluated from compensation/shared capacity, including full/partial/none phaseout behavior;
- Traditional IRA contribution eligibility and deductibility remain separate, including covered-participant and spouse-covered deduction phaseout behavior;
- FFH-015 SIMPLE plan-specific limits, catch-ups, higher-plan-category handling, and coordination with other elective-deferral plans remain preserved;
- FFH-012/028 HSA remains on its dedicated legal-capacity path and retained HSA regressions remain green;
- unrelated workplace-retirement aggregation, governmental 457 separation, annual-additions behavior, catch-up behavior, and Roth catch-up support remain preserved.

PR #25 did not alter the accepted HSA/SIMPLE/workplace policy limits; its shared-period changes are bounded to current-year pacing authority and valid-date interpretation.

## Financial Engine Reconciliation Gate — CLEARS

The exact frozen target satisfies the applicable gate:

1. **No allocatable room from missing material facts:** R01 creates unverified ledger entries with null room.
2. **Aggregate-to-destination equality:** annual tied routing and Build recurring routing reconcile exactly to concrete destinations.
3. **Exact cents:** A01 and M01 use cent-exact routing; M01 is explicitly checked in integer monthly/annual cents.
4. **Scheduled reservation exactly once:** schedule is separate from YTD, reserved once at ledger initialization, and unavailable to later consumers.
5. **Owner/shared conservation:** account, owner, and shared groups are reduced together and invariants reject over-consumption.
6. **Planner/prepass versus actual routing:** Build prepass and actual MFJ recurring routing use the same authoritative helper; Secure prepass and actual allocation use the same remaining-period authority and ledger semantics.
7. **No epsilon/tolerance waiver:** no tolerance permits a mismatch at a financial reconciliation boundary.
8. **No hidden positive residual:** Build throws on unresolved positive retirement routing residual or aggregate/destination mismatch.
9. **Stable identity only for unavoidable final cent:** annual and monthly tied-owner paths apply shared cap and equal fulfillment first, then stable order can place only the unavoidable remainder cent.
10. **Order invariance and repeated consumption:** required person/account reversals and staged-consumer cases remain materially invariant and conserved.

## Final disposition

**PASS**

R01, R02, R03/P03, T1, A01–A05, M01, M02, valid-date schedule behavior, multiple-account nonmultiplication, staged Existing Cash/Secure/Build/Windfall conservation, Roth/Traditional separation, SIMPLE, HSA, workplace-retirement preservation, and the Financial Engine Reconciliation Gate all independently clear on exact frozen implementation target `4b7ed99894e396beadc02a537dad45963f5db1d5`.

There is no Technical & Mathematical Auditor blocking condition for Manager closure of FFH-013. Manager still owns reconciliation with the separate independent Financial Policy & Scenario audit, task closure, merge/control-plane decisions, and any subsequent FFH-017 activation. This audit did not change production code or policy, merge anything, close FFH-013, activate FFH-017, or perform Supabase/live-database work.