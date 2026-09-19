# FFH-013 — Fresh Independent Financial Policy & Scenario Re-audit — 4b7ed998

- Role: Financial Policy & Scenario Auditor
- Execution mode: `STANDARD_CHAT`
- Audit lane: fresh independent Financial Policy & Scenario re-audit
- Manager control-plane checkpoint verified at audit start: `401d7c074ba8bfd1e55771e4ada63f35b7bbaef0`
- Exact frozen implementation target: `4b7ed99894e396beadc02a537dad45963f5db1d5`
- Frozen packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_4b7ed998.md`
- Technical & Mathematical Auditor conclusions/verdict: not consulted or relied upon

## Final verdict

**PASS**

No `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW` Financial Policy & Scenario findings were identified on the exact frozen target.

The frozen implementation satisfies R01, R02, and R03/P03; preserves T1, A01-A05, M01, M02, active-schedule semantics, tax-treatment separation, cross-stage capacity conservation, and the previously accepted SIMPLE/HSA/workplace-retirement boundaries; and does not invent correction, penalty, withdrawal, recharacterization, earnings, or filing policy.

## Frozen-target provenance

PR #25 — `FFH-013: remediate final R01 R02 R03 audit findings` — is merged. Its final worker/handoff head is `d5aa88d8b26aac5ca0c857ff949c031aec8a2559` and merge/frozen integration SHA is `4b7ed99894e396beadc02a537dad45963f5db1d5`.

Candidate `8d9cbc62e47c651ad8e6564f325c20ffd67a439b` has successful Foundation CI run `34911857129`, job `104200881078`. Final worker/handoff head `d5aa88d8b26aac5ca0c857ff949c031aec8a2559` has successful Foundation CI run `34912465644`, job `104202768407`. Both jobs complete AI-state validation, dependency audit, calculation tests, security-policy-contract tests, type check, lint, and build successfully.

Independent compare of `d5aa88d8b26aac5ca0c857ff949c031aec8a2559..4b7ed99894e396beadc02a537dad45963f5db1d5` contains zero changed files. Green CI is supporting evidence, not proof; the policy/scenario conclusions below come from the exact frozen source and scenario boundaries.

## R01 — missing spouse aggregate IRA YTD

**CLEARS.**

For the required MFJ household with compensation `$10,000/$5,000`, A aggregate Traditional + Roth IRA YTD known `$0`, and B aggregate YTD unknown:

- B's unknown aggregate YTD is not treated as zero;
- both affected IRA-owner opportunities expose `remainingAnnualRoom = null` and `more_information_needed` rather than definite legal room;
- the missing-information reason explicitly requests B's authoritative total Traditional + Roth IRA contributions YTD and states that absence of a recorded IRA account does not establish zero;
- capacity-ledger entries derived from the unresolved opportunities are unverified and cannot become allocatable room.

Known-zero is materially distinct. Resolving B YTD to `$0` restores the known feasible set and permits `$7,500/$7,500` conditional owner maxima before routing. Resolving B YTD to `$8,000` preserves the scarce post-YTD shared fail-closed result: both affected additional-room values become `$0`, the MFJ shared group remains material, and the warning describes the supported excess without inventing a correction action.

Reverse spouse roles, person order, account order, multiple Traditional/Roth records, and absence of a recorded spouse IRA preserve the same missing-material-fact outcome.

The implementation is conservative without creating a universal missing-spouse-YTD rule. The paired fail-closed treatment applies to unequal-compensation MFJ cases where the spousal shared feasible-set relationship exists. Equal compensation creates no lower-compensation spouse and no spousal shared feasible set; with `$10,000/$10,000`, A YTD known `$0`, B YTD unknown, A retains definite `$7,500` owner-local room while B alone is `more_information_needed`. Non-IRA retirement/HSA domains are not globally suppressed by this IRA-specific uncertainty.

This treatment is faithful to FFH-D006: actual YTD is an authoritative historical fact that may already lie outside the supported feasible set, so an unknown spouse total cannot be bounded by assuming it was lawful. Where unequal-compensation spousal capacity exists, that unknown can therefore alter the post-YTD joint remainder; where no spousal enhancement exists, independent known owner room remains local.

## R02 — single current-year contribution-period authority

**CLEARS from a financial-policy / semantic-authority perspective.**

The neutral current-year authority is `lib/calculations/money-priority-contribution-period.ts` / `remainingContributionMonths(asOfDate, taxYear)`.

Materially equivalent current-year contribution-period consumers delegate to that authority:

- IRA opportunity/schedule reservation evaluation;
- hybrid retirement-floor current-year reservation;
- Secure employer-match current-year legal pacing;
- engine-level current-year Secure routing/consumption;
- User Plan current-year employer-match legal pacing.

The remediation removes the prior local `12 - getUTCMonth()` contribution-period implementations from Secure, engine, and User Plan. Retirement-account opportunity and retirement-floor consumers already use the shared helper. The source regression additionally scans calculation production files for the prior direct calendar pattern.

The consolidation does not collapse genuinely different semantics. Full-year reporting and annualized plan metrics remain explicitly 12-month measures where that is their intended meaning. In particular, the retirement floor still reports monthly schedules on a full-year annualized basis and builds a separate full-year capacity snapshot, while its current-tax-year reservation uses `remainingContributionMonths(...)`. User Plan likewise preserves annualized Build-plan semantics while using the shared current-year period for employer-match capacity. No economic meaning of full-year reporting was silently converted into a remaining-year measure.

## R03 / P03 — invalid-date contribution-period authority

**CLEARS.**

The shared helper no longer relies on JavaScript `Date` normalization. It requires strict `YYYY-MM-DD` components, validates tax year, month range, month-specific day count, and leap-year rules before returning the inclusive remaining-month count.

Required results are satisfied:

- absent date => `12`;
- clearly invalid/unparsable date => `12`;
- wrong tax year => `12`;
- `2026-09-31` => `12`;
- `2026-02-30` => `12`;
- `2026-02-29` => `12` because 2026 is not a leap year;
- valid `2024-02-29` for tax year 2024 => `11` remaining months, confirming valid leap-day treatment;
- January 2026 => `12`;
- September 2026 => `4`, including September;
- December 2026 => `1`.

Impossible ISO-looking dates can no longer normalize into a shorter supported planning horizon.

## P03 active-schedule policy

**CLEARS.**

For compensation `$10,000/$0`, A factual IRA YTD `$7,000`, A active schedule `$500/month`, and as-of `2026-09-01`:

- factual YTD remains `$7,000`;
- the active monthly schedule is represented separately as future planning pace;
- September through December produces `$2,000` of future schedule pace;
- owner legal room supports only `$500` additional;
- the authoritative ledger caps the schedule reservation at exactly `$500`;
- the shared MFJ pool moves from `$3,000` post-YTD room to `$2,500` after the reservation;
- later one-time / Build / Windfall consumption cannot reuse the reserved `$500`.

The engine forwards its `asOfDate` into IRA opportunity evaluation, so the production path uses the same remaining-period semantics. In December, `$500/month` reserves only one supported month, subject to legal room. No `monthly × 12` value is relabeled as current-year factual YTD, and YTD is not subtracted from an invented annual schedule target.

Both spouses with active schedules and multiple Traditional/Roth IRA records remain bounded by owner/shared ledgers rather than multiplying contribution capacity.

## Protected FFH-013 boundaries

### T1 — non-scarce unequal known-fact owner excess

**CLEARS.** Compensation `$100,000/$50,000`, YTD `$8,000/$0` produces A `$0`, B `$7,500`, an owner-local A warning, and no zero MFJ shared group. Reverse-owner excess and person/account reordering preserve the financial result.

### A01 — tied-spouse routing

**CLEARS.** `$15,000` demand against `$10,000.01` shared room is capped to the common shared capacity before equal fulfillment and routes `$5,000.01 + $5,000.00`. Stable identity affects only the unavoidable final cent; reversing IDs does not create a material spouse priority.

### A02 — schedule reservation versus factual YTD

**CLEARS.** Active schedules remain planning reservations, not YTD facts. Partial YTD is not counted again as future scheduled contribution, both-spouse/multiple-account reservations share owner/group capacity, and staged consumers cannot reuse reserved room.

### A03 — post-YTD shared materiality

**CLEARS.** Compensation `$10,000/$5,000`, YTD `$8,000/$0` creates a materially affected shared feasible set and exposes no phantom spouse contribution capacity.

### A04 — supported excess in an affected scarce set

**CLEARS.** Compensation `$4,000/$2,000`, YTD `$5,000/$0` fails affected new shared contribution room closed. Supported owner/joint excess variants remain warning-only; the implementation does not invent withdrawal, recharacterization, earnings, penalty, or correction mechanics.

### A05 — conditional maxima are non-additive

**CLEARS.** Conditional spouse maxima that draw on one MFJ capacity are explicitly described as conditional/non-additive. A `$15,000` household request against a `$10,000` shared group consumes only `$10,000`; household-facing output does not present two `$7,500` conditional maxima as `$15,000` independent room.

### M01 — cent-exact recurring reconciliation

**CLEARS.** Shared annual room `$10,000.01` and Build authority `$833.33/month` route `$416.67 + $416.66`. Annual legal consumption is `$5,000.04 + $4,999.92 = $9,999.96`, leaving exactly `$0.05` shared annual room. Reordering preserves the result; no phantom cent or hidden over-routing appears.

### M02 — equal compensation

**CLEARS.** Compensation `$10,000/$10,000`, YTD `$8,000/$0` produces A `$0`, B `$7,500`, an owner-local warning, and no MFJ shared group created solely from A's excess. Reverse-owner, person-order, and account-order variants remain owner-local, while the unequal-compensation A04 shared fail-closed behavior remains intact.

## Additional scenario / preservation review

The exact frozen target preserves the accepted policy meaning for:

- one-earner and zero/low-compensation spouse households;
- lower-compensation spouse treatment;
- equal compensation;
- unequal but non-scarce known-fact households;
- genuinely scarce compensation;
- asymmetric YTD and exact shared exhaustion;
- both spouses with active schedules;
- multiple Traditional/Roth IRA accounts without multiplied owner/shared room;
- missing spouse IRA inventory and missing aggregate IRA YTD;
- known-zero versus unknown YTD;
- one-cent boundaries and person/account reordering;
- supported owner and supported joint excess;
- Roth direct-contribution eligibility as a separate account-route constraint;
- Traditional IRA deductibility as a separate tax-treatment result;
- FFH-015 SIMPLE limit/catch-up behavior;
- FFH-012/FFH-028 HSA period-aware/legal-spouse-authority behavior;
- unrelated 401(k)/403(b)/457(b) contribution-capacity behavior.

No new tax/statutory/correction policy was introduced by the audited remediation.

## Financial Engine Reconciliation Gate — policy/scenario disposition

**CLEARS for this Policy Auditor lane.**

The audited household outcomes do not expose or route more IRA capacity than accepted policy permits:

- missing material IRA facts do not initialize definite allocatable room;
- actual YTD, owner capacity, and shared MFJ capacity are not independently additive;
- scheduled capacity is reserved exactly once in the authoritative ledger;
- Existing Cash, Secure, Build, and Windfall use/clone the authoritative consumed ledger rather than recreating fresh IRA room;
- exact-cent shared routing preserves aggregate legal capacity;
- stable identity resolves only an unavoidable final cent in true spouse ties;
- planner and actual recommendation surfaces remain financially consistent with the same owner/shared capacity model.

This policy/scenario disposition does not substitute for the independent Technical & Mathematical Auditor's reconciliation review.

## Manager closure condition

No blocking Financial Policy & Scenario condition remains on frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5`.

This audit lane does not close FFH-013 or activate FFH-017. Manager must still reconcile both fresh independent audit verdicts under Workflow V3.1 before any closure/dependency transition.