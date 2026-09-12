# Financial Policy & Scenario Audit — HANDOFF

Task: FFH-012 — HSA Legal-Capacity Calculation
Process: canonical Workflow V3.1 fresh independent re-audit
Audit packet: `FFH-012-ffde8440-2026-09-12`
Frozen audit target: `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`
Verdict: **PASS WITH NON-BLOCKING FINDINGS**

## Independence / boundary

- Audited only the frozen financial-behavior target `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`.
- Later milestone commits were treated only as Manager control-plane/task/audit documentation.
- The Technical & Mathematical Auditor's new verdict was not read or used.
- No production code or Manager-owned lifecycle/task/shared state was changed.

## Prior finding disposition

- **FINDING A: CLOSED** — FFH-025 now blocks unknown/missing target-year legal-spouse authority whenever both people may still be HSA-eligible and family coverage is known or remains possible for either person. Required asymmetric `A=self-only` / unresolved-B family-possible cases are targeted `more_information_needed`; fully known self-only/self-only and known-ineligible counterpart cases remain local/actionable. Confirmed non-spouses remain independent; confirmed spouses with family coverage receive shared-family behavior. No marriage authority is inferred from `spouse_partner`, filing status, allocation rows, input ordering, or prior-year state.
- **FINDING B: CLOSED** — odd-cent shared-base allocation conserves integer cents exactly. Seven shared-family months produce `$5,104.17 = $2,552.08 + $2,552.09` with no phantom/lost legal cent.
- **FINDING C: CLOSED** — Build aggregate monthly retirement capacity is derived from the same rounded destination routes used for account routing. `$4,375 + $4,375` produces `$364.58 + $364.58 = $729.16`; any positive monthly reconciliation residue throws. Exact annual legal room remains separately represented.

## Non-blocking findings

### LOW — confirmed-spouse `coverage=none` locality is over-conservative

With explicit `confirmed_legal_spouses`, A known eligible/self-only, and B eligibility unknown but B coverage explicitly `none`, family sharing cannot arise from the recorded coverage facts. Accepted FFH-007 targeted-missing-data policy supports A's spouse-independent self-only room, but the affirmative-spouse branch preserves A only when B coverage is specifically `self_only`; `none` therefore causes A to become `more_information_needed` unnecessarily.

This suppresses a supported HSA opportunity but cannot create illegal capacity, double-count shared room, transfer catch-up, or poison unrelated IRA/workplace routes. It does not reopen Finding A, whose unknown-authority materiality predicate correctly treats no-family-possible combinations as non-material.

### LOW — copied married-ledger component `remaining` metadata can become stale

Married-family consumption decrements the authoritative account total, account-specific total, couple shared group, and owner group used by `remainingRetirementCapacity()`, but does not decrement copied fields such as `sharedCapacityRemainingRoom`, `sharedOrdinaryRemainingRoom`, or `catchUpRemainingRoom`. Current Existing Cash, Secure, Build, Windfall, Retirement Floor, and Your Plan routing remains capped by authoritative entry/group room, so this is metadata/future-use risk rather than a legal-capacity defect.

## Required household/scenario results

- unknown/missing authority + B eligible/coverage unknown: affected HSA blocked;
- unknown/missing authority + B eligibility unknown/family: affected HSA blocked;
- unknown authority + B eligibility unknown/coverage unknown: affected HSA blocked;
- all known self-only: actionable `$4,400` per supported under-55 owner;
- known-ineligible counterpart: local/non-blocking;
- confirmed non-spouses: independent HSA limits, no married group;
- confirmed legal spouses + family coverage: `$8,750` shared ordinary base, `$4,375/$4,375` equal default;
- filing status/allocation/prior-year state: non-authoritative for marriage;
- pair/person/account/profile/month ordering: legal outcome invariant;
- unresolved HSA authority: unrelated Traditional IRA/workplace 401(k) opportunities remain usable;
- Medicare, period-aware eligibility/coverage, age-55 catch-up, target-year YTD, multiple HSAs, alternate allocation, spouse-without-HSA participation, Recommendation Refresh, hypothetical reruns, and shared-ledger cross-consumer behavior remain consistent with accepted authority, subject only to the LOW locality/metadata notes above.

## CI evidence

Exact frozen target Foundation CI run `34669630244`, job `103488407900`:

- dependency setup PASS;
- production dependency audit PASS;
- Test calculations PASS;
- Test security policy contract PASS;
- Type check FAIL on Manager-tracked inherited `CI-001` diagnostics;
- lint/build skipped after fail-fast.

The policy verdict does not waive `CI-001` or broader Manager merge gates.

## Auditor evidence

Fresh frozen re-audit report:
`.ai/audit/policy/FFH-012_POLICY_SCENARIO_FROZEN_REAUDIT.md`

Report commit:
`9fe947601140b683922ffb13e091fbf49006853f`

## Manager disposition

From the financial-policy and household-safety perspective, FFH-012 is safe for Manager closure after dual-audit reconciliation. The two LOW findings are non-blocking and may be separately tracked/routed at Manager discretion.

Manager alone owns final FFH-012 closure, lifecycle state, CI-debt routing, and subsequent milestone sequencing.
