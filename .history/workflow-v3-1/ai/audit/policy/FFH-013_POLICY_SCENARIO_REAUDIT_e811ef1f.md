# FFH-013 — Financial Policy & Scenario Re-Audit

Date: 2026-09-13
Role: Financial Policy & Scenario Auditor
Process: canonical Workflow V3.1
Execution mode: STANDARD_CHAT
Frozen packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_e811ef1f.md`
Frozen target: `e811ef1f1f786196d909391262b19d71fe0f9a71`
Final verdict: **FAIL — REMEDIATION REQUIRED**

## Independence and target boundary

This is a fresh independent financial-policy and household-scenario re-audit of only `e811ef1f1f786196d909391262b19d71fe0f9a71`.

Manager control-plane head `aac67d9fc0808e12255b938e3c0d675401d7552f` was verified separately and was not substituted for the frozen implementation target. The new Technical & Mathematical Auditor verdict was not read or used.

No production code, Manager task/index state, FFH-013 closure state, FFH-017 activation state, policy, schema, or live/Supabase state was modified.

## Accepted policy authority inspected

Repository-accepted authority:

- FFH-D006 — MFJ spousal-IRA scarce-compensation capacity.
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`.
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`.
- frozen FFH-013 task and audit packet.
- accepted HSA/SIMPLE/workplace behavior only for preservation review.

No new external regulatory rule was necessary. The accepted FFH-009 / FFH-D006 policy was not rewritten.

Core accepted policy relevant to this audit:

- unequal-compensation MFJ scarce capacity is a shared feasible set, not a fixed spouse-priority allocation;
- equal-compensation spouses do not receive a manufactured lower-spouse enhancement;
- actual Traditional + Roth IRA YTD consumes legal capacity exactly once;
- an active scheduled/current-plan contribution is a future planning reservation, not actual YTD;
- a planned future dollar may not be recommended again merely because it is not yet YTD;
- owner conditional maxima are non-additive and must be paired with the shared MFJ constraint where that constraint applies;
- supported owner/joint excess fails the legally affected owner/shared set closed without invented correction mechanics;
- Roth direct eligibility and Traditional deductibility remain separate from shared compensation capacity;
- stable identity may resolve only an unavoidable final cent after approved financial routing factors.

## Repository / CI lineage verified

Remediation production/test candidate:
`5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`

Candidate Foundation CI:
- run `34737929168`;
- job `103672520594`;
- AI-state validation PASS;
- production dependency audit PASS;
- calculations PASS;
- security PASS;
- Type Check PASS;
- lint PASS;
- build PASS.

Final worker/handoff head:
`c298ac4bfe0d63f248c2a7ec993f0d8031c7377d`

Final-head Foundation CI:
- run `34738110144`;
- job `103673023089`;
- all the same gates PASS.

Frozen integration:
`e811ef1f1f786196d909391262b19d71fe0f9a71`

The final worker head and frozen integration have the same Git tree SHA, `edbb304f599250d91d37e578c18bf05be08261af`; the merge commit introduces no file difference from the fully-green final head.

Green CI is corroborating execution evidence only and does not override the policy finding below.

## Finding-by-finding disposition

### FFH-013-A01 — CLOSED

Annual tied routing now caps the requested tied amount to the common MFJ shared group before proportional/equal-fulfillment integer-cent allocation.

For `$15,000` tied demand against `$10,000.01` shared room, the supported allocation is materially equal:

- spouse route A: `$5,000.01`;
- spouse route B: `$5,000.00`;
- total: `$10,000.01`;
- no material owner-ID priority.

Reversing incidental input/account ordering leaves the economic result unchanged; stable identity may determine only the unavoidable final cent.

**A01 independently clears.**

### FFH-013-A02 — OPEN / REMEDIATION REQUIRED

The remediation correctly introduces a distinct `scheduled` ledger consumer and does not relabel scheduled dollars as YTD. However, the amount reserved for an IRA active schedule is not faithful to the repository's own schedule semantics.

The frozen evaluator derives an IRA planning reservation as:

`max(0, monthlyEmployeeContribution * 12 - aggregate IRA YTD)`

and assigns that result to account planning reservations.

That treats the current monthly contribution as though it were a full-year annual contribution target. But the persisted/UI field is explicitly **"Your monthly contribution"**, and the retirement-floor model separately treats current monthly schedules as future pace over the **remaining contribution months** in the tax year. The snapshot also has a separate `annualContributionTarget` field, so a monthly schedule is not itself the annual-target authority.

This causes both over-reservation and, more importantly, reachable under-reservation.

#### A02 blocking adversary

As of September 1, 2026, use an otherwise supported scarce MFJ household:

- spouse A compensation `$10,000`;
- spouse B compensation `$0`;
- A actual Traditional + Roth IRA YTD `$7,000`;
- B YTD `$0`;
- A active monthly IRA contribution `$500`;
- B active monthly IRA contribution `$0`;
- both under age 50.

Before current-plan reservations:

- shared MFJ legal room = `$10,000 - $7,000 = $3,000`;
- A owner additional room = `$7,500 - $7,000 = $500`;
- B conditional additional room = `$3,000`.

The active A schedule is still a positive future schedule. With four contribution months remaining, it requests `$2,000` of future contributions, of which only `$500` can be supported by A's owner limit. Accepted policy therefore requires the current plan to reserve that supported `$500` before recommending new IRA dollars, leaving at most `$2,500` of new shared room.

Frozen reservation math instead computes:

- annualized monthly pace = `$500 * 12 = $6,000`;
- reservation = `max(0, $6,000 - $7,000 YTD) = $0`.

The ledger therefore leaves the full `$3,000` shared room available for new one-time/Build/Windfall consumption even though at least `$500` of that room is already claimed by the still-active future schedule. A reachable plan can consequently combine the `$7,000` actual YTD, `$3,000` new recommendation, and the still-active `$500` supported future scheduled contribution, overcommitting the `$10,000` shared compensation pool by `$500`.

That is exactly the class of double-planning A02 is required to prevent.

The converse occurs when YTD is low late in the year: for example, a `$500/month` IRA schedule on September 1 with `$0` YTD is treated as a `$6,000` reservation even though only `$2,000` remains on the current monthly schedule over four remaining months. This suppresses otherwise unreserved legal capacity. That converse is conservative, but it confirms the same semantic root cause: the implementation turns a current monthly schedule into a fabricated full-year target instead of reserving the supported future scheduled amount.

**Classification: HIGH / BLOCKING.**

Required policy behavior is not to invent an annual target. Reserve the authoritative active future schedule for the applicable remaining period (or use another explicitly authoritative schedule/target fact), cap it through owner/shared legal capacity, keep it distinct from YTD, and ensure all later consumers see that reservation exactly once.

### FFH-013-A03 — CLOSED

Post-YTD materiality now handles the required `$10,000 / $5,000` unequal-compensation case with `$8,000 / $0` YTD conservatively. The higher spouse exceeds the supported owner ceiling; the unequal-compensation shared feasible set is treated as material and additional shared-group room is zero rather than exposing phantom spouse capacity. Person ordering does not change the outcome.

**A03 independently clears.**

### FFH-013-A04 — CLOSED

Supported excess in an unequal-compensation shared feasible set now fails new shared-group contributions closed.

Verified policy cases include:

- `$4,000 / $2,000` compensation with `$5,000 / $0` YTD: both additional rooms zero and owner-excess warning;
- lower-spouse owner excess: shared group zero plus owner warning;
- supported joint-compensation excess: shared group zero plus joint warning.

Warnings explicitly avoid inferring withdrawal mechanics, earnings calculations, penalties, recharacterization, filing mechanics, or other correction advice.

**A04 independently clears.**

### FFH-013-A05 — CLOSED

The household-facing account-options recommendation now states that spouse-specific IRA maxima in an MFJ shared group are **conditional and non-additive** and identifies the remaining shared MFJ compensation planning capacity. The underlying shared ledger also continues to cap concrete routing.

The canonical `$10,000 / $0` household is therefore no longer presented as having `$7,500 + $7,500 = $15,000` of independent legal household room.

**A05 independently clears.**

### FFH-013-M01 — CLOSED

Recurring reconciliation remains exact at the `$10,000.01` boundary:

- Build authority: `$833.33/month`;
- spouse routes: `$416.67 + $416.66 = $833.33/month`;
- annual legal consumption: `$5,000.04 + $4,999.92 = $9,999.96`;
- shared annual remainder: `$0.05`;
- no epsilon/tolerance or hidden positive-residual clamp creates capacity;
- account-order reversal preserves the material result.

Stable identity determines only the unavoidable recurring cent.

**M01 independently clears.**

### FFH-013-M02 — CLOSED

For equal compensation `$10,000 / $10,000`, individual limits `$7,500 / $7,500`, and YTD `$8,000 / $0`:

- A additional room = `$0`;
- A receives an owner-local excess warning;
- B independently retains `$7,500` room;
- no `ira:mfj-compensation:*` group is created merely because A exceeded A's owner limit.

The reverse-owner case is symmetric; person/account reorder is materially invariant. The remediation does not weaken unequal-compensation A04 fail-closed behavior.

**M02 independently clears.**

## Other household / policy scenarios

Except for A02's schedule-reservation defect, the frozen target is coherent across the requested household cases:

- scarce-compensation one-earner / low-earner households: PASS;
- reverse which spouse has compensation: PASS;
- asymmetric actual YTD: PASS;
- equal compensation: PASS;
- multiple Traditional/Roth IRA account records: PASS; owner/shared ledgers prevent capacity multiplication;
- missing spouse compensation: targeted information-needed;
- missing aggregate spouse IRA YTD when the shared set can bind: targeted information-needed;
- no recorded spouse IRA account is not treated as proof of zero YTD when material: PASS;
- supported owner/joint excess: PASS after A04/M02 distinctions;
- exact cent / odd-cent / input-order cases: PASS except no finding beyond A02;
- owner/account reorder: PASS;
- Roth direct-contribution eligibility remains separate from compensation capacity: PASS;
- Traditional IRA deductibility remains separate from contribution eligibility/capacity: PASS.

## Preservation review

No FFH-013 remediation regression was identified in:

- accepted FFH-015 SIMPLE category/limit behavior;
- accepted FFH-012 / FFH-028 HSA legal-capacity behavior;
- unrelated 401(k)/403(b)/TSP/457/SIMPLE opportunity behavior;
- Roth direct-eligibility semantics;
- Traditional IRA deductibility semantics.

The PR's schedule-specific change is confined to IRA planning reservations; non-IRA scheduled reservation paths continue through their existing logic. Full candidate and final-head calculation suites are green.

## Findings

### FFH-013-P03 — HIGH — active IRA monthly schedule can be omitted or overstated as a planning reservation

**Severity: HIGH**
**Blocking: YES**
**Maps to: FFH-013-A02**

Root cause: the frozen implementation infers a full-year IRA target from `monthlyEmployeeContribution * 12` and subtracts YTD, even though the repository models the field as a current monthly contribution pace and separately computes remaining contribution months.

Material impact: when YTD already exceeds that inferred annualized pace but an active monthly schedule remains positive, the schedule receives zero reservation and later consumers can recommend capacity already claimed by the future schedule. In a scarce MFJ pool this can overcommit the current plan beyond the accepted shared compensation constraint.

The opposite late-year case can over-reserve capacity. Both are the same semantic defect.

No additional CRITICAL, HIGH, MEDIUM, or LOW policy/scenario finding was identified.

## Final disposition

- A01: **CLOSED / CLEARS**
- A02: **OPEN / REMEDIATION REQUIRED**
- A03: **CLOSED / CLEARS**
- A04: **CLOSED / CLEARS**
- A05: **CLOSED / CLEARS**
- M01: **CLOSED / CLEARS**
- M02: **CLOSED / CLEARS**

The remediation substantially fixes the prior shared-compensation, excess, conditional-maxima, equal-compensation, and cent-reconciliation defects, but A02's active-schedule reservation remains materially inconsistent with the accepted planning-reservation policy and can permit double-planning of future IRA capacity.

**Final verdict: FAIL — REMEDIATION REQUIRED**

Manager alone owns remediation routing, FFH-013 closure, and FFH-017 activation.