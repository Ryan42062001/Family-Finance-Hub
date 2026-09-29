# FFH-013 — Final Fresh Financial Policy & Scenario Re-audit

- Role: Financial Policy & Scenario Auditor
- Execution mode: STANDARD_CHAT
- Audit lane: fresh independent policy/scenario audit
- Manager control-plane checkpoint verified at audit start: `96d9d35328feb1b2e5f2d0501f0d3d28a63c7746`
- Exact frozen implementation target: `115f947e28cfae831a550f239c58dd0b59ca5798`
- Frozen packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_115f947e.md`
- Technical & Mathematical Auditor verdict/conclusions: not consulted or relied upon

## Final verdict

**FAIL — REMEDIATION REQUIRED**

The valid-date T1/P03 remediation is materially correct and all pinned A/M policy boundaries rechecked below remain faithful. However, P03 does not fully satisfy its explicit invalid-date fallback contract. The repository authority `remainingContributionMonths(asOfDate, taxYear)` treats some calendar-invalid ISO-looking dates as normalized valid dates, shrinking the reservation horizon instead of using the required 12-month fallback. That can under-reserve active IRA schedules and expose phantom new recommendation capacity in an exported production calculation surface.

## Frozen-target provenance

PR #24 is the final remediation PR. Candidate `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1` has successful Foundation CI run `34882801756`, job `104105952541`. Final worker/handoff head `23c1caa75cd4d66021161f0b540e2b00ec12e074` has successful Foundation CI run `34883153453`, job `104107126587` through AI-state validation, dependency audit, calculations, security, type check, lint, and build.

Independent frozen-tree verification confirms `23c1caa75cd4d66021161f0b540e2b00ec12e074..115f947e28cfae831a550f239c58dd0b59ca5798` contains zero file differences. The final-head CI run reports tree `d690907916041cbf1d20e00ad8da120fbf9e9202`, and frozen integration commit `115f947e...` points to the same tree. Green CI is treated as supporting evidence only.

## Findings

### MEDIUM — P03 invalid-date fallback is incomplete and can under-reserve active IRA schedules

Accepted P03 semantics require absent, invalid, or non-current-year `asOfDate` values to use the existing 12-month fallback.

`lib/calculations/money-priority-contribution-period.ts` constructs `new Date(`${asOfDate}T00:00:00.000Z`)` and falls back only when the resulting time is `NaN` or the parsed year differs from the tax year. JavaScript normalizes some impossible calendar dates rather than producing `NaN`.

Adversarial boundary:

- `remainingContributionMonths("2026-09-31", 2026)` normalizes to October 1, 2026 and returns `3`.
- Accepted policy requires the invalid date to return the 12-month fallback.
- With one-earner compensation `$10,000/$0`, zero IRA YTD, and an active `$500/month` IRA schedule, the invalid date therefore models only `$1,500` of future pace instead of the fallback `$6,000`.
- The shared `$10,000` compensation pool can consequently retain `$8,500` before new recommendation consumption instead of the fallback-policy `$4,000`, exposing up to `$4,500` of planning capacity that the accepted invalid-date fallback says must remain reserved.

The normal top-level engine later applies stricter date validation in Build, which limits ordinary end-to-end exposure, but that does not make the stated repository-authority contract true: the shared helper itself and the exported IRA opportunity evaluator can still produce the shorter reservation horizon for a calendar-invalid ISO-looking date. Because P03 explicitly pins invalid-date fallback semantics and because the mismatch can create phantom recommendation room, P03 cannot clear on this frozen target.

Required remediation condition is semantic, not prescriptive: calendar-invalid dates must be recognized as invalid by the contribution-period authority and must produce the 12-month fallback, with regression coverage for ISO-looking impossible dates (for example, a non-leap February 29 and a 31st day in a 30-day month).

No other Financial Policy & Scenario findings were identified on the frozen target.

## T1 — non-scarce unequal compensation

**CLEARS.** For `$100,000/$50,000` compensation, `$7,500` individual limits, and `$8,000/$0` YTD:

- A additional room is `$0`.
- B additional room is `$7,500`.
- the owner excess warning remains owner-local;
- no zero MFJ shared group is created solely from A's owner-only excess;
- no withdrawal, recharacterization, penalty, or correction mechanics are invented.

Reverse-owner and people/account reordering preserve the same financial meaning. The remediation gates the MFJ shared group on whether the joint constraint is actually material after YTD facts, rather than treating every unequal-compensation owner excess as a household-wide shared failure.

T1 also preserves genuinely scarce cases. A03 (`$10,000/$5,000`, `$8,000/$0` YTD) makes the joint remainder `$7,000` versus `$7,500` of owner-local remaining room, so the shared constraint is material and the affected group fails closed. A04 (`$4,000/$2,000`, `$5,000/$0` YTD) likewise leaves only `$1,000` joint remainder against `$7,500` of owner-local remaining room and fails the affected shared group closed.

## P03 — active monthly IRA reservation horizon

**DOES NOT CLEAR overall because of the MEDIUM invalid-date finding above.** The valid/current-year implementation behavior itself is correct:

- absent/null, clearly unparsable, and wrong-tax-year inputs use the 12-month fallback;
- January returns 12, September returns 4, and December returns 1 with the as-of month included;
- monthly schedule pace is kept separate from factual YTD;
- scheduled IRA reservations are capped by owner/shared legal room in the capacity ledger rather than being treated as an authoritative annual contribution target;
- reservations enter the ledger exactly once and downstream Existing Cash / Build / Windfall IRA consumers see already-reduced capacity;
- the main engine forwards its `asOfDate` to IRA opportunity evaluation;
- multiple Traditional/Roth accounts share owner and MFJ capacity instead of multiplying it;
- full-year reporting remains separate from current-year reservation semantics.

Required September household (`$10,000/$0`, A YTD `$7,000`, A schedule `$500/month`, `2026-09-01`) is correct: factual YTD remains `$7,000`; four months of pace are represented, but A has only `$500` supported owner room; the ledger reserves exactly `$500`; the shared group moves from `$3,000` to `$2,500` available for new recommendations. December correctly reserves one supported month, not twelve.

## Accepted policy boundaries

### A01 — tied-spouse routing

**CLEARS.** `$15,000` annual demand against `$10,000.01` shared capacity is capped to the common shared pool before equal fulfillment, producing `$5,000.01 + $5,000.00`. Reverse account IDs alter only the unavoidable final-cent recipient; input order does not create a material spouse priority.

### A02 — scheduled contributions are reservations, not YTD

**CLEARS as an architecture/policy boundary.** Factual YTD and prospective schedule reservation are distinct fields. Partial YTD is not subtracted from the future schedule pace a second time. Both spouses and multiple IRA accounts reserve through owner/shared ledgers rather than multiplying capacity. P03's malformed-date horizon defect is separately blocking because it can size that reservation incorrectly for an invalid date.

### A03 — post-YTD shared materiality

**CLEARS.** `$10,000/$5,000` compensation and `$8,000/$0` YTD creates a materially binding shared feasible set after YTD facts and does not surface phantom spouse capacity.

### A04 — supported excess in a genuinely affected scarce set

**CLEARS.** `$4,000/$2,000` compensation and `$5,000/$0` YTD fails the affected shared group closed for new contributions, while warnings remain descriptive and do not invent tax-correction mechanics. Reverse-owner and joint-excess variants preserve the same fail-closed policy.

### A05 — conditional maxima are non-additive

**CLEARS.** One-earner scarce compensation can show conditional owner maxima, but household-facing reasons identify them as conditional/non-additive and all consumers draw from one MFJ group. A `$15,000` request against a `$10,000` shared group consumes only `$10,000`.

### M01 — cents-level recurring reconciliation

**CLEARS.** The protected boundary remains faithful: `$416.67 + $416.66 = $833.33/month`; annual legal consumption is `$5,000.04 + $4,999.92 = $9,999.96`; the shared annual remainder is exactly `$0.05`. Reordering preserves the financial result and no phantom cents are created.

### M02 — equal compensation

**CLEARS.** `$10,000/$10,000` compensation with `$8,000/$0` YTD creates no lower-compensation spouse and no MFJ shared group solely from owner-only excess. A has `$0` additional room, B has `$7,500`, and the warning is owner-local. Reverse owner, people order, and account order preserve the result. The unequal-compensation A04 shared fail-closed case remains intact.

## Additional scenario and preservation review

The frozen implementation and regression evidence preserve the following accepted boundaries apart from the P03 malformed-date finding:

- one-earner and zero/low-compensation-spouse households;
- scarce and non-scarce unequal compensation;
- asymmetric YTD and exact joint exhaustion;
- both spouses actively scheduled and multiple Traditional/Roth IRA accounts;
- missing spouse account/YTD facts where shared capacity could bind are not silently inferred as zero;
- supported owner/joint excess remains warning-only and fails affected new shared contributions closed where policy requires;
- person/account reordering and one-cent boundaries remain deterministic and materially neutral;
- Roth direct-contribution eligibility remains separate from IRA contribution-capacity logic;
- Traditional IRA deductibility remains separate from legal contribution room;
- FFH-015 SIMPLE limit/catch-up behavior is unchanged;
- FFH-012/FFH-028 HSA legal-capacity and spouse-authority behavior is unchanged;
- unrelated 401(k)/403(b)/457(b) retirement-capacity behavior remains covered and the FFH-013 remediation diff does not modify those policy formulas.

## Manager closure condition

Financial Policy & Scenario audit is blocking FFH-013 closure only on the P03 invalid-calendar-date fallback defect above. T1, A01-A05, M01, and M02 clear on frozen target `115f947e...`.

Do not close FFH-013 or activate FFH-017 from this audit lane. After remediation, Manager should designate a new exact frozen target and route a fresh independent re-audit under the canonical workflow.
