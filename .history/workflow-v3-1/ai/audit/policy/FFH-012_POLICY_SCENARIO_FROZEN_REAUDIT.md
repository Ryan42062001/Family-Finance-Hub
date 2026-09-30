# FFH-012 — Fresh Financial Policy & Scenario Frozen Re-Audit

Date: 2026-09-12
Role: Financial Policy & Scenario Auditor
Process: canonical Workflow V3.1
Execution mode: STANDARD_CHAT
Audit packet: `FFH-012-ffde8440-2026-09-12`
Frozen audit target: `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`
Final verdict: **PASS WITH NON-BLOCKING FINDINGS**

## Independence / checkpoint boundary

This is a fresh task-scoped policy/scenario audit of the exact frozen production behavior at `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`. Later milestone commits were treated as Manager control-plane/task/audit documentation only and were not substituted as the financial-behavior target. The Technical & Mathematical Auditor's new verdict was not read or used.

Repository state at audit start showed `phase-5-money-priority-engine` at `3816f0fb572bcc330fd9dc2fafdbeae4297791fe`, but the frozen packet and FFH-012 task explicitly preserve `ffde8440...` as the audit target.

No production behavior, Manager-owned task state, shared state, or lifecycle state was modified by this audit.

## Accepted authority applied

The audit applies only already accepted authority:

- FFH-D005 — person-level, tax-year-bound, period-aware HSA legal-capacity contract; unknown-safe behavior; owner-specific catch-up; aggregate YTD; multiple-account non-multiplication; normalized downstream propagation.
- FFH-007 as incorporated by FFH-D005 — month-sensitive eligibility/coverage, Medicare handling, equal married-family ordinary default, targeted missing-information behavior, deterministic routing and no optimistic legacy backfill.
- FFH-022 — explicit pair-specific target-HSA-tax-year legal-spouse authority with `confirmed_legal_spouses`, `confirmed_not_legal_spouses`, and `unknown`; no authority from `spouse_partner`, filing status, allocation rows, input ordering, or prior-year state; unknown authority blocks only materially spouse-dependent HSA results; independently supportable HSA/IRA/workplace routes may continue.

No new HSA legal or policy rule was invented for this audit.

## Prior finding disposition

### Finding A — CLOSED

**Historical severity:** HIGH.

The compound unknown legal-spouse-authority materiality defect is corrected at the frozen target.

The integrated predicate treats spouse authority as material for a month when:

1. both people may still be HSA-eligible (`eligibility !== ineligible` for both); and
2. family coverage is known or remains possible for either person (`family` or `unknown`).

When target-year authority is missing or explicitly `unknown`, any month meeting both conditions causes targeted HSA `more_information_needed` for the candidate pair. This is a general materiality condition, not a hardcoded fixture.

Independent scenario review:

- A eligible/self-only + B eligible/coverage unknown + authority missing -> A HSA blocked: correct.
- Same facts + explicit `unknown` authority -> A HSA blocked: correct.
- A eligible/self-only + B eligibility unknown/family + authority missing -> A HSA blocked: correct.
- A eligible/self-only + B eligibility unknown/coverage unknown + authority unknown -> A HSA blocked: correct.
- Both known eligible/self-only + authority missing -> each independently exposes `$4,400`: correct because spouse status cannot change the supported self-only result.
- A eligible/self-only + B known ineligible (even if B has family coverage data) + authority missing -> A remains local/actionable: correct because B cannot participate in family sharing for that month.
- Confirmed non-spouses, A self-only/B family -> independent `$4,400` / `$8,750`, no married shared group: correct.
- Confirmed legal spouses, A self-only/B family, both eligible -> one `$8,750` shared ordinary base and equal `$4,375` / `$4,375` default: correct.
- `spouse_partner` relationship without authority -> does not create marriage authority: correct.
- MFJ/MFS filing status without authority -> does not create marriage authority: correct.
- `single`/HOH filing status cannot erase affirmative authority; only a consistency warning is produced: correct.
- married-allocation rows without affirmative spouse authority remain non-authoritative: correct.
- prior-year authority does not authorize the target year: correct.
- candidate/person/account/profile/month input reversal does not change the legal result: correct.
- unresolved HSA spouse authority does not suppress independently supported Traditional IRA or workplace 401(k) opportunities: correct.

The accepted FFH-022 authority contract is also preserved through persistence/runtime/UI: authority is pair/year-specific, tri-state, canonical-order constrained, defaults to unknown, and is captured separately from the `spouse_partner` relationship label and planning filing status.

**Disposition: CLOSED.**

### Finding B — CLOSED

**Historical issue:** odd-cent shared-capacity conservation.

The frozen implementation rounds the period-aware shared ordinary base to cents, converts that base to integer cents, assigns `floor(cents / 2)` to the first canonical owner, and assigns the exact residual cents to the second owner. The two owner allocations therefore always sum exactly to the rounded legal shared base.

Required regression:

`$5,104.17 = $2,552.08 + $2,552.09`

Independent cent review across one through twelve shared-family months confirms the owner-cent allocations sum exactly to each rounded shared base; no legal cent is created or discarded. Canonical owner ordering makes placement of the indivisible cent deterministic without making source-array order legally material.

**Disposition: CLOSED.**

### Finding C — CLOSED

**Historical issue:** Build/account monthly reconciliation.

The frozen Build path derives aggregate routable monthly retirement capacity by summing the same per-destination rounded monthly values used by destination routing. It does not derive the aggregate independently from an unrounded annual total.

Required regression:

- total annual shared ordinary capacity: `$8,750`
- owner annual limits: `$4,375 + $4,375`
- per-owner monthly routes: `$364.58 + $364.58`
- Build aggregate monthly HSA route: `$729.16`

The actual routing loop uses those same destination conversions and throws if any positive monthly amount remains unroutable. Because cent-denominated monthly routing cannot necessarily exhaust the annual ledger exactly, any small annual remainder stays represented in authoritative annual legal room rather than being erased or converted into a false monthly cent.

**Disposition: CLOSED.**

## New non-blocking finding 1 — LOW — confirmed-spouse `coverage=none` locality is over-conservative

**Classification:** LOW / NON-BLOCKING.

Adversarial scenario:

- target year 2026;
- explicit `confirmed_legal_spouses` authority for A/B;
- A: eligible, self-only, under 55, no Medicare, YTD zero;
- B: eligibility unknown, coverage explicitly `none` for the month;
- no family coverage is present or possible under the recorded coverage fact for that month.

Accepted FFH-007 says missing spouse/person eligibility facts justify `more_information_needed` when they can change whether the family-sharing rule applies, and missing information should block only the dependent decision. FFH-022 likewise preserves demonstrably independent HSA capacity.

Observed frozen behavior: in the affirmative-spouse branch, when A is eligible and B eligibility is unknown, A's independent self-only amount is preserved only when **both** coverages are `self_only`. With B coverage `none`, A instead receives `more_information_needed` for spouse eligibility even though resolving B's eligibility cannot create married-family sharing without family coverage.

Impact: this is conservative under-routing/over-collection of information, not optimistic legal capacity. It cannot create excess HSA room, double-count a family base, transfer catch-up, or contaminate unrelated IRA/workplace routes. The affected user may temporarily lose an otherwise supportable HSA recommendation until B's facts are completed.

This does **not** reopen Finding A: the FFH-025 unknown-legal-spouse-authority materiality predicate correctly treats the same `self_only` + `none` / no-family-possible combination as non-material. The residual locality gap exists only inside the already-affirmative married evaluation branch.

Recommended Manager disposition: track as a narrow non-blocking locality cleanup if desired; it is not a household-safety reason to keep FFH-012 open.

## New/retained non-blocking finding 2 — LOW — copied married-ledger component `remaining` metadata can become stale

**Classification:** LOW / NON-BLOCKING.

Fresh source review confirms that married-family `consumeRetirementCapacity()` decrements the authoritative account `remainingAnnualRoom`, account-specific remaining room, couple shared group, and owner group. `remainingRetirementCapacity()` clamps against those mutable authoritative values.

However, the married-family branch does not decrement copied entry component fields such as `sharedCapacityRemainingRoom`, `sharedOrdinaryRemainingRoom`, and `catchUpRemainingRoom`, while the non-married branch does. Those component fields can therefore look stale after married-family consumption.

Current Existing Cash, Secure, Build, Windfall, Retirement Floor, and Your Plan legal routing use `remainingRetirementCapacity()` / `consumeRetirementCapacity()` and remain constrained by authoritative entry/group room. No current path reviewed can recreate legal HSA room from the stale copies.

Impact: metadata/presentation/future-maintenance risk only. Do not expose or reuse these copied fields as authoritative post-consumption residual room without reconciliation.

## Frozen-packet scenario matrix

1. **Does FFH-025 close compound unknown-authority materiality without overblocking the packet's local cases?** YES. Known self-only/self-only and known-ineligible counterpart cases remain actionable; family-possible compound cases block.
2. **Are Findings B/C preserved?** YES. Integer-cent conservation and destination-derived Build reconciliation remain intact.
3. **Does HSA uncertainty remain targeted?** YES for the packet's required cases. Traditional IRA/workplace opportunities remain available while HSA authority is unresolved.
4. **Fully known all-self-only household actionable?** YES, `$4,400` per supported owner in the required under-55/zero-YTD case.
5. **Known-ineligible counterpart local/non-blocking?** YES.
6. **Confirmed non-spouses independent?** YES; no married shared group/equal allocation is created.
7. **Confirmed legal spouses with family coverage shared lawfully?** YES; `$8,750` ordinary shared base, equal `$4,375/$4,375` absent alternate agreement.
8. **Any marriage inference from relationship/filing/allocation/order/prior-year state?** NO evidence of such inference at the frozen target.
9. **Input/order invariance?** YES for normalized HSA inputs, affirmative spouse results, and compound materiality regressions.
10. **Target-year/YTD/Medicare/catch-up/partial-year/multi-account behavior?** CLEARED. YTD is target-year-bound and aggregates employee+employer across owner HSAs; known Medicare effective month removes later eligible months; age-55 catch-up is owner-specific and period-aware; partial-year capacity is month-sensitive; multiple HSA destinations cannot multiply owner/couple room. The LOW affirmative-spouse `coverage=none` overblocking edge above is the only new locality concern.
11. **Build/account reconciliation?** CLEARED at `$729.16` monthly and under general positive-residue invariant.
12. **CI failure attribution?** Exact target Foundation CI run `34669630244`, job `103488407900` passes install, production dependency audit, calculations, and security before Type check fails. Manager registry `CI-001` identifies the reached TypeScript diagnostics as inherited Phase-5 test debt in `money-priority-married-hsa-remediation.test.ts` and `money-priority-retirement-accounts.test.ts`; this audit found no evidence that the FFH-025 policy behavior introduced a new CI failure identity. Lint/build were skipped by fail-fast and remain broader Manager merge-gate concerns.
13. **Is test/evidence coverage sufficient for policy closure?** YES for Findings A/B/C and the frozen packet's named household scenarios. The new LOW `coverage=none` affirmative-spouse locality edge lacks a focused regression and should be added if Manager routes that cleanup, but it does not expose optimistic/illegal capacity.

## Additional policy/household checks

- **Medicare:** known effective month overrides later eligibility; recomputation can surface possible-excess risk instead of additional room.
- **HSA eligibility/coverage:** canonical person/month facts control; legacy account hints cannot fabricate annual authority.
- **Age-55 catch-up:** person-specific, period-aware, nontransferable.
- **YTD contributions:** employee + employer totals consume the same owner ceiling; wrong tax-year binding causes targeted missing information.
- **Multiple HSAs:** destinations share one owner ceiling and, for affirmative married-family cases, one couple ordinary constraint.
- **Alternate married allocation:** explicit, pair/year-bound, constrained by the shared ordinary base, and unavailable as marriage authority.
- **YTD incompatible with equal default:** returns targeted request for alternate agreement when a legal alternate split could fit.
- **Spouse without HSA account:** still participates in legal married-family structure; absence of an HSA destination is not spouse ineligibility.
- **Expected HSA medical spending:** remains separate from legal contribution capacity and prevents optimistic long-term-retirement treatment when unknown.
- **Hypothetical reruns:** preserve normalized HSA contract rather than reconstructing authority from weaker inputs.
- **Recommendation Refresh:** fingerprints the normalized snapshot; target-year spouse-authority changes invalidate stale shared-family recommendation basis.
- **Household safety:** no reviewed path creates legal capacity from missing spouse authority, stale filing status, allocation preference, prior-year authority, or source ordering.

## CI / validation evidence

Frozen target: `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`.

Foundation CI run `34669630244`, job `103488407900` on the exact frozen SHA:

- dependency setup: PASS
- production dependency audit: PASS
- Test calculations: PASS
- Test security policy contract: PASS
- Type check: FAIL on Manager-tracked `CI-001`
- lint/build: SKIPPED after fail-fast

Passing tests are supporting evidence, not the basis of the policy verdict. The verdict also rests on direct inspection of the frozen implementation and adversarial household reasoning.

## Closure assessment

From the **financial-policy and household-safety perspective**, FFH-012 is safe for Manager closure after the required independent audit process because:

- Finding A is closed without reopening optimistic spouse-authority capacity;
- Findings B and C remain closed;
- no blocking CRITICAL/HIGH/MEDIUM/LOW policy mismatch was found;
- the two LOW findings are conservative/metadata risks and do not expose illegal capacity or contaminate unrelated financial recommendations.

This statement is not a lifecycle transition. Manager alone owns FFH-012 closure, final dual-audit reconciliation, CI-debt routing, and subsequent milestone decisions.

## Final verdict

**PASS WITH NON-BLOCKING FINDINGS**
