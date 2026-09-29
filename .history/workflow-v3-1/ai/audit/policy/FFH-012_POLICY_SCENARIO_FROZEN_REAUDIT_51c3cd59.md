# FFH-012 — Post-FFH-028 Financial Policy & Scenario Frozen Re-Audit

Date: 2026-09-12
Role: Financial Policy & Scenario Auditor
Process: canonical Workflow V3.1
Execution mode: STANDARD_CHAT
Frozen audit packet: `.ai/audit/FFH-012_FROZEN_AUDIT_PACKET_51c3cd59.md`
Frozen audit target: `51c3cd5978837b892f0323617b49986347c7d938`
Final verdict: **PASS WITH NON-BLOCKING FINDINGS**

## Independence / checkpoint boundary

This is a fresh independent financial-policy and household-scenario audit of the exact frozen production behavior at `51c3cd5978837b892f0323617b49986347c7d938` after FFH-028. The newer milestone head was used only to read Manager control-plane/task/audit documentation and was not substituted as the financial-behavior target. The Technical & Mathematical Auditor's new conclusions/verdict were not read or used.

No production behavior, Manager-owned task state, shared lifecycle state, or closure state was modified by this audit.

## Authorities applied

The audit applies already accepted repository authority only:

- FFH-D005 — person-level, tax-year-bound, period-aware HSA legal-capacity contract; unknown-safe behavior; owner-specific catch-up; employee/employer YTD aggregation; multiple-account non-multiplication; normalized downstream propagation.
- FFH-007 as incorporated by FFH-D005 — month-sensitive eligibility/coverage, Medicare handling, equal married-family ordinary default, targeted missing-information behavior, deterministic routing, and no optimistic legacy backfill.
- FFH-022 — explicit pair-specific target-HSA-tax-year legal-spouse authority; `spouse_partner`, filing status, allocation rows, account ownership, input ordering, and prior-year state are not legal-marriage authority; confirmed non-spouses are independent; missing/unknown authority blocks only materially spouse-dependent HSA results.
- The frozen audit packet for `51c3cd59...` — when more than two active nondependent `self`/`spouse_partner` candidates make legal-spouse pair identity materially ambiguous, the affected HSA result must fail closed to targeted `more_information_needed`; one A/B authority row inside an otherwise ambiguous candidate set does not by itself authorize the engine to infer that A/B are the unique HSA-relevant married pair.

No new financial-policy or legal rule was invented.

## Finding A — CLOSED

Historical issue: compound unknown target-year legal-spouse authority plus unresolved other-person eligibility/coverage could expose optimistic HSA room.

The FFH-025 materiality rule remains intact at the frozen target. For exactly two candidates, missing/unknown legal-spouse authority becomes material when both people may still be HSA-eligible and family coverage is known or remains possible for either. Affected HSA owners return targeted `more_information_needed` instead of optimistic independent room.

Regression-checked household behavior:

- A eligible/self-only + B eligible/coverage unknown + authority missing or unknown -> affected HSA blocked.
- A eligible/self-only + B eligibility unknown/family -> affected HSA blocked.
- A eligible/self-only + B eligibility unknown/coverage unknown -> affected HSA blocked.
- both confirmed eligible/self-only + authority missing -> independently supported `$4,400` self-only room remains actionable.
- known-ineligible counterpart -> local supported capacity remains actionable when the counterpart cannot participate in family sharing.
- confirmed non-spouses -> independent HSA evaluation.
- confirmed legal spouses + materially relevant family coverage -> married shared-family behavior.
- unrelated Traditional IRA/workplace retirement opportunities remain usable when only HSA authority is unresolved.

**Disposition: CLOSED.**

## Finding B — CLOSED

Historical issue: odd-cent shared-capacity conservation.

The frozen implementation still rounds the period-aware shared ordinary base to cents, converts it to integer cents, assigns `floor(cents / 2)` to the first canonical owner, and gives the exact residual cents to the second canonical owner. The two owner allocations therefore sum exactly to the rounded legal shared base.

Required regression remains exact:

`$5,104.17 = $2,552.08 + $2,552.09`

No legal cent is created or discarded. Canonical owner ordering makes the indivisible-cent placement deterministic without allowing source-array order to change total legal capacity.

**Disposition: CLOSED.**

## Finding C — CLOSED

Historical issue: Build/account reconciliation.

FFH-028 did not modify the Build/account reconciliation path. The frozen implementation continues to derive aggregate routable monthly retirement capacity from the same rounded destination amounts used by account routing.

Required regression remains exact:

- annual shared ordinary base: `$8,750`
- owner annual allocations: `$4,375 + $4,375`
- per-owner monthly routes: `$364.58 + $364.58`
- aggregate monthly route: `$729.16`

Positive monthly routing residue is not silently discarded. Exact annual legal room remains separately represented in the legal-capacity ledger rather than being converted into a false monthly cent.

**Disposition: CLOSED.**

## Finding D — CLOSED

Historical severity: HIGH / blocking.

Historical defect: with three or more active nondependent `self`/`spouse_partner` candidates, exact-two candidate-pair construction could disappear and let HSA owners fall through to independent evaluation, permitting two separate `$8,750` family limits instead of one lawfully constrained married-family result.

FFH-028 closes the unsafe path at the frozen target.

For `>2` active nondependent `self`/`spouse_partner` candidates, the evaluator retains all candidates in the HSA fact set. For every HSA owner who is one of those candidates, it compares that owner's month facts against every other candidate. If both people may still be HSA-eligible and family coverage is known or remains possible for either, the owner receives targeted `more_information_needed` for unresolved legal-spouse pair authority. The evaluator therefore cannot silently fall through to an affirmative independent family limit when pair identity is materially ambiguous.

Independent scenario dispositions:

1. **Explicit A/B current-year legal-spouse authority + third spouse candidate + family-material facts** — affected A/B HSA outputs remain `more_information_needed`; the engine does not infer that the A/B authority row proves A/B are the unique HSA-relevant married pair. Two independent `$8,750` family limits are not exposed.
2. **Three materially ambiguous candidates with no authority** — affected HSA outputs fail closed to targeted `more_information_needed`.
3. **Unrelated IRA/workplace routes** — remain available when only HSA pair identity is unresolved.
4. **All-known self-only three-candidate household** — remains local/actionable because no candidate pairing can create family-sharing capacity; supported self-only `$4,400` owner results remain available.
5. **Known-ineligible/local combinations** — an ineligible candidate does not make a pair material because both people cannot still be eligible; independently supported local capacity can continue.
6. **Exactly two confirmed legal spouses** — still receive one shared family ordinary base and equal default where family sharing applies.
7. **Exactly two confirmed non-spouses** — remain independent; no married shared group is created.
8. **Exactly two candidates with missing/unknown authority** — retain FFH-025 targeted materiality behavior.
9. **Relationship labels** — `spouse_partner` does not establish legal marriage.
10. **Filing status** — MFJ/MFS does not establish legal marriage; `single`/HOH does not erase affirmative authority.
11. **Married allocation rows** — cannot establish legal marriage; they remain downstream preference only after authoritative spouse status.
12. **Account ownership** — cannot establish pair identity or legal marriage.
13. **Prior-year authority** — does not carry into the target tax year.
14. **Input ordering** — candidate IDs/facts are canonicalized/sorted, and focused reversal regressions preserve supported results.

The `>2` fail-closed behavior is intentionally conservative according to the frozen audit packet. A lone A/B current-year authority row does not make A/B a unique pair while a third candidate remains materially capable of changing HSA spouse-sharing. This is therefore not treated as an overblocking defect.

**Disposition: CLOSED.**

## Other required HSA regressions

The frozen target remains coherent for the existing FFH-012 legal-capacity scenarios not changed by FFH-028:

- Medicare effective-month treatment removes later eligible months and can expose possible-excess risk when YTD exceeds recomputed legal room.
- Age-55 catch-up remains owner-specific and period-aware; it is not transferable between spouses.
- Employee + employer HSA YTD consume the same owner/couple legal ceiling and require the target-year binding.
- Partial-year eligibility/coverage remains period-aware.
- Multiple HSAs do not multiply owner or couple capacity across Existing Cash, Secure, Build, Windfall, or Your Plan consumers.
- Explicit alternate married ordinary allocation remains tax-year-bound, pair-specific, nonnegative, and constrained by the shared ordinary base.
- A spouse without an HSA account can still participate in married-family legal structure; lack of an HSA destination is not statutory ineligibility.
- Hypothetical reruns and Recommendation Refresh preserve/fingerprint the normalized HSA authority and legal-capacity basis rather than recreating marriage authority independently.

## Retained finding 1 — LOW — confirmed-spouse `coverage=none` locality remains over-conservative

**Classification:** LOW / NON-BLOCKING.

For exactly two `confirmed_legal_spouses`, if A is eligible/self-only while B eligibility is unknown but B coverage is explicitly `none`, family sharing cannot arise from the recorded coverage fact for that month. The affirmative-spouse branch nevertheless preserves A's self-only amount only when both coverages are specifically `self_only`; with B=`none`, A receives `more_information_needed` for spouse eligibility.

This is conservative under-routing/over-collection of information. It suppresses a supportable HSA opportunity but cannot create illegal capacity, double-count a family base, transfer catch-up, or poison unrelated IRA/workplace routes. FFH-028 did not modify this exact-two affirmative-spouse branch.

**Closure impact:** NON-BLOCKING.

## Retained finding 2 — LOW — copied married-ledger component `remaining` metadata can become stale

**Classification:** LOW / NON-BLOCKING.

In the married-family branch of `consumeRetirementCapacity`, authoritative room used by current routing is reduced through:

- `entry.remainingAnnualRoom`;
- `entry.accountSpecificRemainingRoom`;
- the couple shared group's `remainingAnnualRoom`; and
- the owner group's `remainingAnnualRoom`.

However, copied component fields such as `sharedCapacityRemainingRoom`, `sharedOrdinaryRemainingRoom`, and `catchUpRemainingRoom` are not decremented in that special branch. Those copied values can therefore become stale after one-time/Secure/Build/Windfall consumption.

`remainingRetirementCapacity()` uses the authoritative entry/shared/owner totals, so current routing remains legally capped. No current FFH-028 change expanded this metadata into an authoritative capacity source.

**Closure impact:** NON-BLOCKING unless a future consumer exposes/reuses those copied component values as authoritative residual room.

## CI ownership / frozen checkpoint evidence

Exact frozen integration CI:

- Foundation CI run: `34698898118`
- job: `103567059188`
- exact head SHA: `51c3cd5978837b892f0323617b49986347c7d938`
- Validate AI state: PASS
- dependency install/audit: PASS
- Test calculations: PASS
- Test security policy contract: PASS
- Type check: FAIL
- lint/build: SKIPPED after fail-fast

The TypeScript failure identity matches Manager-registered inherited `CI-001`: the existing `money-priority-married-hsa-remediation.test.ts` TS2339 family and `money-priority-retirement-accounts.test.ts` TS2339 diagnostics. No new FFH-012/FFH-028 failure identity was identified. Therefore the frozen red workflow does not transfer CI-001 ownership to FFH-012 or FFH-028. This policy verdict does not waive CI-001 or broader Manager release gates.

## Final disposition

All four closure findings A/B/C/D are closed from the financial-policy and household-scenario perspective at exact frozen target `51c3cd5978837b892f0323617b49986347c7d938`.

Two LOW observations remain non-blocking:

1. confirmed-spouse `coverage=none` locality can be unnecessarily conservative;
2. copied married-ledger component remaining metadata can become stale after consumption.

No CRITICAL, HIGH, or MEDIUM policy/household-safety finding remains open.

**Final verdict: PASS WITH NON-BLOCKING FINDINGS.**

Manager alone owns FFH-012 closure, dual-audit reconciliation, CI-debt routing, and subsequent milestone sequencing.