# FFH-013 Final Fresh Technical & Mathematical Re-Audit

## Audit identity

- Task: `FFH-013 — Spousal-IRA Shared Compensation Ledger`
- Role: Technical & Mathematical Auditor
- Audit lane: fresh independent final re-audit
- Execution mode: `STANDARD_CHAT`
- Manager control-plane head verified: `96d9d35328feb1b2e5f2d0501f0d3d28a63c7746`
- Exact frozen implementation target audited: `115f947e28cfae831a550f239c58dd0b59ca5798`
- Frozen packet: `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_115f947e.md`
- Final remediation PR: `#24`
- Production candidate: `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1`
- Candidate Foundation CI: run `34882801756`, job `104105952541` — success
- Final worker/handoff head: `23c1caa75cd4d66021161f0b540e2b00ec12e074`
- Final-head Foundation CI: run `34883153453`, job `104107126587` — success
- Frozen integration SHA: `115f947e28cfae831a550f239c58dd0b59ca5798`
- Worker-head versus frozen integration comparison: **zero changed files**; the integration commit is behaviorally identical to the final worker head.

Green CI was treated as regression evidence, not proof. No conclusions or verdict from the Financial Policy & Scenario Auditor were used.

## Exact verdict

**FAIL — REMEDIATION REQUIRED**

## Findings

### HIGH — TMA-01: Missing spouse aggregate IRA YTD can expose phantom legal room when post-YTD facts would make the MFJ shared constraint material

The frozen implementation only fail-closes paired MFJ IRA owners for missing aggregate spouse YTD when the shared compensation constraint is already material **before** YTD is applied. If the pre-YTD owner conditional maxima happen to sum exactly to joint compensation, missing YTD is treated as non-material and definite contribution room may be exposed.

Independent adversary:

- MFJ
- A compensation: `$10,000`
- B compensation: `$5,000`
- IRA statutory limits: `$7,500` each
- A aggregate IRA YTD: known `$0`
- B aggregate IRA YTD: **unknown**

At the frozen SHA, the pre-YTD conditional owner maxima are `$7,500 + $7,500 = $15,000`, equal to the `$15,000` joint-compensation pool. Because the code tests pre-YTD materiality with a strict `<`, the missing B YTD does not produce the required shared `more_information_needed` state and A can be shown definite room.

But the unknown fact can materially change the feasible set. If B's missing aggregate IRA YTD later resolves to `$8,000`, post-YTD shared room becomes `$7,000`, owner remaining totals become `$7,500`, and B has supported excess. That is the protected A03-style state in which the shared MFJ feasible set is material and must fail closed to zero new room for the affected shared group. A's previously exposed definite room is therefore phantom capacity.

This violates FFH-D006's missing-material-fact rule: unknown aggregate IRA YTD is not zero and must fail closed when it can change remaining owner/shared legal room. It also prevents the Financial Engine Reconciliation Gate from clearing because the engine can expose legal allocatable capacity without authoritative facts needed to prove that capacity exists.

Required remediation is production work by the Core Financial Engine Engineer, not this audit lane. Add an adversarial regression covering a pre-YTD non-binding/equality case whose unknown spouse YTD can make the post-YTD shared feasible set material or supported-excess fail-closed.

### MEDIUM — TMA-02: P03 does not establish one authoritative remaining-current-year contribution-period calendar

`lib/calculations/money-priority-retirement-accounts.ts` and `lib/calculations/money-priority-retirement-floor.ts` correctly consume `remainingContributionMonths()` from `lib/calculations/money-priority-contribution-period.ts` for the IRA schedule-reservation path. However, `lib/calculations/money-priority-secure.ts` still defines its own materially equivalent `remainingContributionMonths()` calendar implementation and uses it for current-year retirement pacing.

The final P03 acceptance condition explicitly requires that there be no second materially equivalent contribution-period calendar implementation. That condition is not met at `115f947e...`.

The pinned September and December IRA reservation arithmetic itself is correct, and this duplicate does not currently demonstrate double-consumption of the IRA schedule ledger. The finding is nevertheless blocking for P03 because the frozen packet's single-authority assertion is false and two financial-engine surfaces can drift semantically.

### MEDIUM — TMA-03: P03's `invalid date => 12` helper contract is not satisfied for impossible ISO calendar dates

The shared helper constructs `new Date(`${asOfDate}T00:00:00.000Z`)` and checks only `Number.isNaN(date.getTime())` plus tax-year equality. JavaScript normalizes some impossible calendar dates rather than rejecting them. For example:

- `2026-09-31` normalizes to `2026-10-01` and produces `3` remaining months, not the required invalid-date fallback of `12`.
- `2026-02-30` similarly normalizes into March rather than returning `12`.

The existing helper test covers an obviously unparsable string but not an impossible calendar date. Because this helper drives active-schedule planning reservations, malformed-but-normalizable input can materially alter reserved capacity. The pinned helper semantic therefore does not fully clear.

## Required adversary results

### T1 — CLEARS

For the required non-scarce unequal-compensation case (`$100,000 / $50,000`, limits `$7,500 / $7,500`, YTD `$8,000 / $0`):

- A additional room: `$0`
- B additional room: `$7,500`
- A receives an owner-local excess warning
- no zero-room MFJ shared group is created solely because A is over its owner limit
- reversing the excess owner, person order, account order, and multiple-account representation does not introduce a material stable-ID priority

A03 and A04 remain preserved under fully known facts.

### P03 — DOES NOT CLEAR

The core reservation mechanics pass:

- retirement-account opportunity evaluation and retirement-floor reservation use the shared helper
- September 2026 means four remaining months, so `$500/month` has `$2,000` future pace
- with owner legal room `$500`, only `$500` is reserved
- the shared pool falls from `$3,000` to `$2,500` before new allocations
- December reserves `$500`, not twelve months
- YTD remains factual history; schedule remains a planning reservation
- the schedule reservation is capped by owner/shared legal capacity and represented once in the retirement-capacity ledger
- Existing Cash, Secure/retirement-floor, Build, and Windfall do not re-use the reserved IRA room
- multiple IRA accounts do not multiply the shared scheduled reservation
- input-order reversal is materially invariant

P03 still fails because TMA-02 violates the one-authoritative-calendar requirement and TMA-03 violates the full invalid-date fallback contract.

## Protected behavior re-verification

- **A01 — CLEARS.** `$15,000` tied annual demand against `$10,000.01` shared room routes `$5,000.01 + $5,000.00`; stable identity resolves only the unavoidable final cent.
- **A02 — CLEARS.** YTD factual history and active schedule planning reservation remain distinct; the schedule is consumed once through the shared retirement-capacity ledger.
- **A03 — CLEARS for fully known YTD.** `$10,000 / $5,000`, YTD `$8,000 / $0` does not invent spouse capacity and fails closed for the affected shared set. TMA-01 is a separate missing-fact boundary defect.
- **A04 — CLEARS.** `$4,000 / $2,000`, YTD `$5,000 / $0` produces zero new room for the affected shared group with warning-only behavior and no invented correction mechanics.
- **A05 — CLEARS.** Owner conditional maxima remain explicitly non-additive where an MFJ shared feasible set exists.

## Mathematical pin re-verification

### M01 — CLEARS exactly

Preserved values:

- shared annual room: `$10,000.01`
- owner conditional room: `$7,500` each
- Build authority: `$833.33/month`
- routes: `$416.67 + $416.66`
- exact aggregate: `$833.33/month`
- annual legal consumption: `$9,999.96`
- shared annual remainder: `$0.05`

The allocator uses integer cents, contains no epsilon/tolerance reconciliation, and does not clamp away a hidden positive residual.

### M02 — CLEARS

Equal compensation `$10,000 / $10,000`, YTD `$8,000 / $0` preserves:

- A additional room `$0`
- B additional room `$7,500`
- owner-local excess warning
- no MFJ shared group created solely from owner excess
- reverse-owner/person/account order is materially invariant

## Conservation and staged-consumer review

For fully known supported inputs, the frozen retirement-capacity ledger preserves owner and MFJ shared capacity conservation in integer cents. Exact exhaustion, one-cent boundaries, annual-cent/monthly-cent routing, multiple IRA accounts, tied allocations, and staged consumers were re-traced through the owner/group ledger and the Existing Cash -> Secure -> Build -> Windfall flow. No epsilon/tolerance or positive-residual suppression was found.

The active IRA schedule is recorded as planning consumption before new allocation and downstream consumers operate on the same authoritative ledger or a clone that derives from it; no independent schedule re-consumption was found in the protected September/December cases.

TMA-01 means this conservation proof is not sufficient for missing material facts: a mathematically conserved ledger can still be initialized from an unjustified legal-capacity state.

## Regression-preservation review

No separate blocking regression was found in the requested collateral surfaces:

- Roth direct-eligibility bands remain separate from IRA contribution capacity.
- Traditional IRA deductibility remains separate from contribution capacity.
- FFH-015 SIMPLE plan limits/coordination remain covered and green.
- FFH-012 / FFH-028 HSA capacity behavior remains covered and green.
- unrelated workplace-retirement limits, aggregated 401(k)/403(b) treatment, governmental 457 separation, age catch-up behavior, and workplace Roth catch-up handling remain covered and green.

PR #24 changed the FFH-013 remediation/calculation surfaces and did not modify the SIMPLE/HSA/workplace-limit implementation contracts. The final Foundation run remained green across the calculation suite, security contract, typecheck, lint, and build. Those results are supporting regression evidence only.

## Financial Engine Reconciliation Gate

**DOES NOT CLEAR.**

The exact-cent and staged-consumer reconciliation properties clear for the pinned fully known scenarios, but the gate as a whole fails because:

1. TMA-01 permits definite legal allocatable IRA room before a material aggregate-YTD fact is known, so the initialized legal-capacity ledger is not provably authoritative.
2. P03's contribution-period authority is duplicated (TMA-02) and its required invalid-date fallback is incomplete (TMA-03).

## Closure condition

Manager closure of FFH-013 is **blocked**. The frozen implementation requires remediation and a fresh audit of a new frozen target. This audit does not merge, close FFH-013, activate FFH-017, change policy, perform production remediation, or perform Supabase/live-database work.
