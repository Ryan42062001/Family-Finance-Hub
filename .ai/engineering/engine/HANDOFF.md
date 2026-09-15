# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-013 — Spousal-IRA Shared Compensation Ledger
Role: Core Financial Engine Engineer
Worker status: READY_FOR_MANAGER
Task state retained: REMEDIATION
Execution mode: STANDARD_CHAT
Approved integration base: `phase-5-money-priority-engine`
Branch: `ffh/ffh-013-final-audit-remediation-2`
Pull request: #25 — draft, open, unmerged at worker handoff
PRODUCTION_SHA: `8d9cbc62e47c651ad8e6564f325c20ffd67a439b`
PRODUCTION_CI: Foundation CI #546 — run `34911857129`, job `104200881078` — SUCCESS
HANDOFF_SHA: this documentation-only worker handoff commit; its exact immutable SHA is reported to Manager after the commit exists and therefore is not self-referenced inside this file
MANAGER_VERDICT: PENDING
AUDIT_STATUS: NOT_READY

## Scope completed

This worker remediated only the three Manager-reconciled blockers from the fresh dual re-audit of frozen target `115f947e28cfae831a550f239c58dd0b59ca5798`: R01, R02, and R03/P03. No new IRA tax policy, correction mechanics, HSA/SIMPLE redesign, Supabase/live-data work, unrelated retirement refactor, merge, acceptance, closure, audit routing, or FFH-017 activation was performed.

## R01 — missing aggregate spouse IRA YTD

Root cause: a spouse's missing authoritative aggregate Traditional + Roth IRA YTD could be materially relevant to the MFJ post-YTD shared compensation feasible set. Missing/absent account evidence therefore could not be allowed to behave as a known zero when that uncertainty could alter definite new-room exposure.

Remediation:
- aggregate Traditional + Roth IRA YTD preserves `null` if any authoritative component is unknown;
- absence of a recorded IRA account is not proof of zero aggregate YTD where shared compensation can bind;
- when the missing spouse YTD can affect the shared feasible set, both affected owner opportunities are fail-closed for definite new room and receive targeted `more_information_needed` evidence;
- known-zero remains distinct from unknown;
- owner-local behavior is preserved when the missing spouse fact cannot affect the other owner's legal room;
- no correction amount or tax-correction mechanics were invented.

Direct regressions cover the `$10,000/$5,000` adversary with unknown, known-zero, and `$8,000` spouse YTD; reversed spouse roles; person/account ordering; multiple Traditional/Roth records; absent recorded IRA account; and equal/non-scarce owner-local cases.

## R02 — one current-year contribution-period authority

Root cause: the first R02 remediation centralized the Secure path, but the final source-authority regression exposed two additional materially equivalent current-year remaining-month implementations in `money-priority-engine.ts` and `money-priority-user-plan.ts`.

Remediation:
- neutral authority remains `lib/calculations/money-priority-contribution-period.ts` / `remainingContributionMonths(asOfDate, taxYear)`;
- `money-priority-secure.ts`, `money-priority-engine.ts`, and `money-priority-user-plan.ts` delegate to that helper where current-year remaining contribution months are required;
- prior retirement-account/floor consumers remain on the same neutral authority;
- duplicate local Date/month implementations were removed;
- the neutral helper has no dependency back into those consumers, so the centralization does not introduce a circular dependency;
- accepted full-year reporting semantics remain separate and unchanged.

The decisive final R02 failure was the source guard identifying `money-priority-engine.ts` and `money-priority-user-plan.ts`; after both were centralized, the exact production candidate passed the complete Foundation workflow.

## R03 / P03 — strict calendar-date validation

Root cause: JavaScript Date normalization can transform impossible ISO-looking dates into a later valid date, producing an incorrect shorter remaining-period horizon.

Remediation:
- the shared helper parses strict `YYYY-MM-DD` components;
- validates tax year, month, day, leap-year rules, and month-specific day counts before computing the inclusive remaining-month result;
- absent, unparsable, calendar-invalid, or wrong-tax-year input returns the accepted 12-month fallback;
- valid January/September/December and leap-day behavior remains intact.

Direct boundaries include `2026-09-31`, `2026-02-30`, non-leap `2026-02-29`, valid `2024-02-29`, unparsable input, wrong tax year, `2026-09-01 -> 4`, and `2026-12-01 -> 1`.

## Protected behavior / reconciliation proof

The complete green calculation suite preserves the previously cleared FFH-013 behavior, including:
- T1 non-scarce `$100,000/$50,000`, YTD `$8,000/$0` => owner room `$0/$7,500`, owner-local warning, no false zero MFJ group;
- A01 tied annual `$15,000` demand against `$10,000.01` shared room => `$5,000.01 + $5,000.00`;
- A02 reservation-vs-YTD separation and staged legal-capacity reuse prevention;
- A03 no phantom spouse capacity for `$10,000/$5,000`, YTD `$8,000/$0`;
- A04 `$4,000/$2,000`, YTD `$5,000/$0` remains fail-closed for the affected shared group without invented correction mechanics;
- A05 spouse conditional maxima remain explicitly non-additive;
- M01 shared room `$10,000.01`, owner conditional room `$7,500` each, Build authority `$833.33/month`, routing `$416.67 + $416.66`, annual legal consumption `$9,999.96`, shared remainder `$0.05`, with no epsilon/tolerance or hidden positive-residual clamp;
- M02 equal compensation `$10,000/$10,000`, YTD `$8,000/$0` => `$0/$7,500`, owner-local warning, no shared group solely from owner excess;
- P03 supported September/December scheduling and one-time reservation consumption;
- multiple-account nonmultiplication; Roth eligibility vs Traditional deductibility separation; SIMPLE, HSA, workplace retirement, Existing Cash, Secure, Build, and Windfall conservation.

The Financial Engine Reconciliation Gate is re-established for the worker candidate: no definite allocatable legal room is initialized from missing material facts; annual/monthly cents reconcile; reservations are consumed once; owner/shared capacity is conserved; and no epsilon/tolerance waiver was introduced.

## Changed implementation/test surfaces

The bounded remediation touches these financial-engine surfaces:
1. `lib/calculations/money-priority-contribution-period.ts`
2. `lib/calculations/money-priority-secure.ts`
3. `lib/calculations/money-priority-retirement-accounts.ts`
4. `lib/calculations/money-priority-engine.ts`
5. `lib/calculations/money-priority-user-plan.ts`
6. `lib/calculations/ffh-013-final-audit-remediation-2.test.ts`

Task/handoff metadata are documentation-only after `PRODUCTION_SHA`.

## Exact production validation

Foundation CI #546 on `PRODUCTION_SHA` `8d9cbc62e47c651ad8e6564f325c20ffd67a439b`:
- run `34911857129`
- job `104200881078`
- AI state validation — PASS
- dependency audit — PASS
- full calculation suite — PASS
- security contract — PASS
- typecheck — PASS
- lint — PASS
- build — PASS
- overall job conclusion — SUCCESS

No test-count claim is made here because the connector did not expose a reliable raw count; the authoritative workflow job shows every required step green.

## Worker blockers

None. Production remediation is complete and fully green. The remaining lifecycle actions belong to Manager and the required independent auditors.

## Manager next action

Manager should independently verify PR #25, the exact `PRODUCTION_SHA`/`HANDOFF_SHA` boundary, confirm changes after `PRODUCTION_SHA` are documentation-only, verify final-head Foundation CI, and then decide acceptance/integration. Only after a Manager-accepted integration target exists should Manager freeze that exact SHA and route fresh independent Technical & Mathematical and Financial Policy & Scenario re-audits. FFH-017 remains blocked until Manager closes FFH-013.
