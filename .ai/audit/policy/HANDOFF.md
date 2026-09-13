# Financial Policy & Scenario Audit — HANDOFF

Task: FFH-013 — Spousal-IRA Shared Compensation Ledger
Process: canonical Workflow V3.1 fresh independent financial-policy/scenario re-audit
Frozen packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_e811ef1f.md`
Frozen target: `e811ef1f1f786196d909391262b19d71fe0f9a71`
Verdict: **FAIL — REMEDIATION REQUIRED**

## Independence / boundary

- Audited only exact frozen behavior target `e811ef1f1f786196d909391262b19d71fe0f9a71`.
- Manager control-plane head `aac67d9fc0808e12255b938e3c0d675401d7552f` was verified separately and was not substituted as the implementation target.
- The new Technical & Mathematical Auditor verdict was not read or used.
- No production code, Manager lifecycle/task state, FFH-013 closure, FFH-017 activation, policy, or live/Supabase state was changed.

## Independent finding dispositions

- **FFH-013-A01: CLOSED / CLEARS.** `$15,000` tied demand against `$10,000.01` shared room caps to the shared group first and allocates `$5,000.01 + $5,000.00` with only final-cent deterministic identity effect.
- **FFH-013-A02: OPEN / REMEDIATION REQUIRED.** The new `scheduled` ledger consumer is distinct from YTD, but the reservation amount is derived as `max(0, monthlyContribution * 12 - YTD)`. The repository otherwise models `monthly_employee_contribution` as the active current monthly pace over remaining tax-year months. This can reserve zero for a still-active future schedule when YTD exceeds the inferred annualized pace, allowing later consumers to recommend the same future IRA capacity again. It can also over-reserve late-year capacity. See FFH-013-P03 below.
- **FFH-013-A03: CLOSED / CLEARS.** Post-YTD materiality correctly fails the unequal-compensation shared set closed in the `$10,000/$5,000`, `$8,000/$0` YTD adversary.
- **FFH-013-A04: CLOSED / CLEARS.** Unequal-compensation owner/joint supported excess fails the affected shared group closed, warns, and invents no correction mechanics.
- **FFH-013-A05: CLOSED / CLEARS.** Household-facing output now labels spouse maxima conditional/non-additive and surfaces the one shared MFJ planning capacity.
- **FFH-013-M01: CLOSED / CLEARS.** `$416.67 + $416.66 = $833.33/month`; annual legal consumption `$9,999.96`; shared remainder `$0.05`; no epsilon/tolerance/residual hiding.
- **FFH-013-M02: CLOSED / CLEARS.** Equal compensation `$10,000/$10,000`, YTD `$8,000/$0` keeps A excess owner-local, B retains `$7,500`, no MFJ shared group is invented, reverse/reorder cases are equivalent, and unequal A04 remains fail-closed.

## FFH-013-P03 — HIGH / BLOCKING

**Active IRA monthly schedule can be omitted or overstated as a planning reservation.**

Frozen evaluator reservation:
`max(0, monthlyEmployeeContribution * 12 - aggregate IRA YTD)`.

But the persisted/UI field is `Your monthly contribution`, and current-year retirement-floor logic uses the monthly schedule over remaining contribution months. The snapshot separately has `annualContributionTarget`; the monthly field is not itself annual-target authority.

Blocking adversary as of September 1, 2026:
- A/B compensation `$10,000/$0`;
- A/B actual IRA YTD `$7,000/$0`;
- A active IRA schedule `$500/month`;
- B schedule `$0`.

Legal shared room before schedules is `$3,000`; A owner room is `$500`. The still-active future A schedule should reserve that supported `$500`, leaving at most `$2,500` for new shared recommendations. Frozen math computes `$6,000 - $7,000 = $0` reservation, leaving all `$3,000` available to later consumers. A reachable current plan can therefore combine `$7,000` YTD + `$3,000` newly recommended + the still-active supported `$500` scheduled contribution, overcommitting the `$10,000` shared pool by `$500`.

The converse late-year case can over-reserve capacity because `12 × monthly` is used instead of the supported future schedule for the remaining period.

Required remediation: reserve the authoritative active future schedule for the applicable remaining period (or another explicit schedule/target authority), cap it through owner/shared legal capacity, keep it distinct from YTD, and expose the remainder to later consumers exactly once.

## Other policy/scenario conclusions

PASS except A02/P03 across:
- one-earner / low-earner scarce-compensation households;
- asymmetric YTD and exact joint exhaustion;
- equal-compensation semantics;
- multiple Traditional/Roth accounts;
- missing spouse compensation/YTD/account inventory locality;
- no-account-is-not-zero-YTD behavior when material;
- Roth direct eligibility separation;
- Traditional IRA deductibility separation;
- owner/account order invariance;
- accepted HSA behavior;
- accepted SIMPLE behavior;
- unrelated workplace-retirement behavior.

## CI / tree identity

Candidate:
- SHA `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`;
- Foundation CI run `34737929168`, job `103672520594` — full pipeline PASS.

Final worker head:
- SHA `c298ac4bfe0d63f248c2a7ec993f0d8031c7377d`;
- Foundation CI run `34738110144`, job `103673023089` — full pipeline PASS.

Frozen integration:
- `e811ef1f1f786196d909391262b19d71fe0f9a71`.

Final worker head and frozen integration share exact tree SHA `edbb304f599250d91d37e578c18bf05be08261af`; there are no file differences. Green CI does not clear P03 because the failing schedule/YTD boundary is not covered by the passing suite.

## Auditor evidence

Detailed report:
`.ai/audit/policy/FFH-013_POLICY_SCENARIO_REAUDIT_e811ef1f.md`

Report commit:
`21fbcbbbb4f7e7f1687d9c91e13c1c0aabd85b45`

## Manager disposition

FFH-013 does not satisfy the frozen Financial Policy & Scenario audit gate while A02 / FFH-013-P03 remains open. Manager alone owns remediation routing, dual-audit reconciliation, FFH-013 closure, and FFH-017 activation.