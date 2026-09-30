# FFH-012 — Financial Policy & Scenario Re-Audit after FFH-023

Date: 2026-09-11
Role: Financial Policy & Scenario Auditor
Verdict: FAIL — REMEDIATION REQUIRED

## Checkpoint reviewed

- Exact remediated integration checkpoint: `1487b192491a704ca3500b42d22a50289ee1551b`.
- FFH-023 `PRODUCTION_SHA`: `9140d19c27d206b75e2a1825065e58047f1443c2`.
- FFH-023 `HANDOFF_SHA`: `8854ebac7861da215aaac87501adad36bb95bbe0`.
- PR #11 is merged with merge commit `1487b192491a704ca3500b42d22a50289ee1551b`.
- Manager control-plane checkpoint `d765b036abc266b0a42c975e7c70c0ad8c92c3d9` is one later documentation/control-plane commit; it does not replace the production checkpoint under audit.
- Foundation CI #404, run `34624938204`, job `103347645465`, ran on exact head `1487b192...`: dependency setup PASS, dependency audit PASS, Test calculations PASS, Test security policy contract FAIL, later typecheck/lint/build SKIPPED.

The security failure does not establish an FFH-012/HSA calculation defect. The integrated SIMPLE security contract still requires one source-text form (`simplePlanLimitCategory: nullableString(...)` inline), while the normalized implementation computes the same value in a local `simplePlanLimitCategory` variable and uses shorthand. This is consistent with the separately tracked FFH-011 textual-validation debt. The HSA calculation gate itself passed on the exact integration checkpoint. This CI attribution does not override the independent policy finding below.

## Authorities applied

- FFH-D005 — HSA legal-capacity policy and data contract.
- FFH-022 — accepted HSA Legal-Marriage Authority Contract.
- Existing accepted FFH-007 HSA legal-capacity policy as incorporated by FFH-D005/FFH-022.
- Canonical workflow invariants: unknown material facts cannot create optimistic capacity; rounding cannot create phantom dollars; equivalent incidental ordering must not alter legal capacity; legal account capacity and display/cash-flow representations remain distinct.

## Prior finding dispositions

### PRIOR FINDING A: OPEN

The original direct defect is substantially remediated: `spouse_partner`, filing status, and married-allocation rows no longer directly create legal-spouse authority. The new contract is pair-specific, target-HSA-tax-year-bound, tri-state, canonical-order validated, and has no optimistic backfill or prior-year carryforward.

However, the implementation's unknown-authority materiality predicate is incomplete. There is an adversarial household where spouse authority and the other person's unresolved eligibility jointly change a known self-only owner's legal amount, yet the known owner is exposed as actionable instead of `more_information_needed`.

Reproducible facts:
- tax year 2026;
- two active nondependent household adults: A=`self`, B=`spouse_partner`;
- target-year legal-spouse authority missing or `unknown`;
- A has an HSA, is confirmed eligible all 12 months, confirmed `self_only`, under age 55, YTD $0;
- B has canonical 2026 HSA facts, eligibility `unknown` for the material months, coverage `family`, under age 55; whether B has an HSA destination is not what establishes spouse status;
- no alternate married allocation.

Authoritative expected behavior:
- FFH-022 says unknown spouse authority must not assume either marriage sharing or non-spouse independence when the amount/allocation can materially differ.
- Here the result is materially dependent: confirmed non-spouses (or B later confirmed ineligible) supports A's independent $4,400 self-only ordinary ceiling; confirmed legal spouses plus B later confirmed eligible with family coverage invokes the shared $8,750 family base and absent another agreement gives A the equal-default $4,375 ordinary allocation.
- Because the unresolved facts can change A's supported legal amount, A's dependent HSA room must remain targeted `more_information_needed` until the material authority/fact uncertainty is resolved.

Observed implementation behavior:
- `spouseStatusIsMaterial` detects (a) both people already eligible with family coverage on either side, (b) A eligible+family while B eligibility is unknown, or (c) B eligible+family while A eligibility is unknown.
- It does not detect A eligible+self-only while B eligibility is unknown and B coverage is family/unknown, even though resolving B eligible plus affirmative spouse authority changes A's default allocation.
- With authority unknown, no married pair is formed. The independent branch therefore gives A the full self-only $4,400 and only marks B's own unknown months unresolved. A becomes `available`; HSA `available` opportunities are eligible for normal retirement routing.

Closure impact: BLOCKING. This is not an authority gap. FFH-022 explicitly resolves the required behavior: block only when spouse status can materially change the legal result. The implementation under-detects one such material combination.

### PRIOR FINDING B: CLOSED

The previous odd-cent defect is corrected.

For seven shared-family eligible months in 2026, the rounded shared ordinary base is $5,104.17. The equal-default implementation converts the shared base to integer cents and divides those cents deterministically: $2,552.08 + $2,552.09 = $5,104.17. The second owner receives the indivisible remainder cent; no cent is created. Candidate persons are canonical-ID sorted before this allocation, so incidental input order does not change household legal capacity or which canonical owner receives the remainder. Explicit alternate allocation remains a separate path and is applied only after affirmative spouse authority.

This is a mathematical/product consequence, not new financial policy: an odd number of cents cannot be split into two identical cent-denominated amounts, but the total must remain conserved. The accepted equal-default meaning is preserved to cent precision without expanding legal capacity.

Closure impact: prior blocker B is resolved.

### PRIOR FINDING C: CLOSED

The Build/account reconciliation defect is corrected at the policy-facing level.

For the full-year $8,750 shared ordinary base under equal default, destinations expose $4,375 + $4,375. Per-destination monthly display values are each rounded from their destination room ($364.58 + $364.58), and Build now derives the aggregate routable monthly capacity by summing those same per-destination rounded monthly values, producing $729.16. The actual account-routing loop uses the same monthly conversion and subtracts each routed destination amount from the aggregate amount-to-route. Any positive monthly routing residue now throws the reconciliation invariant instead of being tolerated/discarded.

At this boundary, annual legal capacity remains distinct from monthly display representation. Routing $729.16/month can consume $4,375.00 from the first destination and $4,374.96 from the second while leaving $0.04 of exact annual legal room. That annual remainder remains in the legal ledger; it is not converted into a false monthly cent and it is not erased. Aggregate monthly recommendations equal the sum of account-level monthly recommendations.

Closure impact: prior blocker C is resolved.

## Finding 1 — HIGH — compound unknown spouse authority/eligibility can expose optimistic actionable HSA room

Affected policy/scenario: FFH-022 unknown-authority locality plus FFH-D005 unknown-safe legal capacity.

Exact implementation path: `lib/calculations/money-priority-hsa-legal-capacity.ts` -> target-year `spouseAuthorityStatus` -> `spouseStatusIsMaterial` predicate -> non-married independent ordinary calculation -> account `state`; then `lib/calculations/money-priority-retirement-accounts.ts` forwards that HSA state/room and normal retirement routing may consume any `available` opportunity.

Reproducible household facts: the A self-only / B eligibility-unknown+family / authority-unknown scenario stated under Prior Finding A.

Authoritative expected behavior: A must not expose affirmative $4,400 room because resolving the still-material authority/eligibility combination can change A to the $4,375 equal-default spouse allocation. FFH-022 explicitly requires `more_information_needed` where spouse status can materially change amount/allocation.

Actual behavior: the materiality predicate evaluates false for that combination; A is evaluated independently and can become `available` at $4,400 while B remains unresolved.

Evidence: accepted FFH-022 unknown-authority rules and regression scenario definitions; integrated `money-priority-hsa-legal-capacity.ts`; integrated retirement-opportunity forwarding and Build destination filtering. Existing remediation tests cover unknown authority with already-known family coverage and known-self-only locality when the other supported result is actually self-only, but do not cover unknown authority combined with an eligibility-unknown person whose family coverage can make the known owner's self-only result spouse-dependent.

Closure impact: BLOCKS FFH-012 closure. Narrow remediation should correct materiality detection and add the compound regression without weakening the accepted locality rule for truly independent self-only capacity.

## Finding 2 — LOW — married ledger component `remaining` metadata remains stale after shared-family consumption

Affected policy/scenario: presentation/propagation of shared ordinary capacity and owner catch-up after one-time/Secure/Build/Windfall consumption.

Exact implementation path: `lib/calculations/money-priority-retirement-capacity.ts`, married-family branch of `consumeRetirementCapacity`.

Reproducible household facts: confirmed legal spouses with shared-family HSA room; consume positive room from one spouse's HSA through any ledger consumer.

Authoritative expected behavior: fields represented as remaining component capacity should either track residual capacity or be clearly original/snapshot metadata so downstream/UI consumers cannot mistake stale component values for current legal room.

Actual behavior: the married branch decrements `entry.remainingAnnualRoom`, `accountSpecificRemainingRoom`, the couple shared group, and the owner group, so routing remains correctly capped. It does not decrement the copied entry fields `sharedCapacityRemainingRoom`, `sharedOrdinaryRemainingRoom`, or `catchUpRemainingRoom` in that branch. Those component values can therefore remain stale after consumption.

Evidence: integrated `money-priority-retirement-capacity.ts` married consume branch. `remainingRetirementCapacity` itself uses the mutable total/shared/owner groups, so this does not recreate legal capacity in current routing.

Closure impact: NON-BLOCKING independently. It should not be exposed or reused as authoritative residual room without reconciliation, but it does not change this re-audit's blocking result because Finding 1 already requires remediation.

## Scenario coverage/disposition

Policy behavior confirmed from integrated implementation plus focused regression evidence:
- one owner self-only and one owner family coverage;
- affirmative legal-spouse authority enables shared-family behavior;
- confirmed non-spouses remain independent even with `spouse_partner` labels;
- MFJ planning status does not create authority; `single` does not erase affirmative authority;
- married allocation does not create authority and remains distinct from equal default;
- wrong/prior tax-year spouse authority does not carry forward;
- explicit authority pair identity is canonical/order-insensitive;
- one/both age-55 catch-ups remain owner-specific while ordinary married room remains shared;
- multiple HSAs for one owner and multiple destinations across spouses do not multiply group room;
- employee and employer YTD aggregate into the same HSA ceiling and current-year binding is required;
- exhausted legal room clamps at zero; possible-excess warnings remain present when YTD exceeds supported ceilings;
- known Medicare timing removes later eligible months and can expose excess risk; unknown eligibility/coverage remains non-affirmative;
- unresolved spouse-dependent HSA capacity does not automatically poison unrelated IRA/workplace routes in the covered cases;
- authority is included in the normalized HSA snapshot and hypothetical reruns; Recommendation Refresh fingerprints the whole snapshot, so authority changes invalidate the financial basis and changed recommendations become material refreshes;
- seven-month odd-cent amount conservation and normal account/order invariance are covered;
- Build monthly aggregate/account reconciliation is exact under the $8,750/$4,375+$4,375 regression;
- household expected HSA medical spending remains separate from legal capacity and from long-term HSA retirement-saving treatment under the existing retirement-floor policy;
- one-time and recurring capacity use the shared legal ledger rather than creating separate statutory room.

Not cleared: the compound unknown-authority + unresolved-other-person eligibility/coverage materiality scenario in Finding 1.

## Classification notes

Accepted project policy: explicit pair/year spouse authority; tri-state status; no relationship/filing/allocation inference; targeted unknown-safe behavior; equal default; owner-specific catch-up; shared employee/employer/multi-account capacity.

Mathematical consequence: odd shared-base cents require one deterministic remainder cent; owner allocations must sum exactly to the shared base.

Implementation behavior: integer-cent equal split and Build reconciliation are correct; unknown-authority materiality detection is incomplete for the compound scenario described above.

Unsupported assumption rejected: that A's known self-only status alone proves its $4,400 result is independent while B's eligibility is unresolved and B may have family coverage. FFH-022 permits self-only locality only when the spouse/non-spouse distinction cannot change the supported result.

Authority gaps: none identified for the blocking scenario. FFH-022 already supplies the needed rule.

## Required Manager disposition

Return FFH-012 for narrow remediation of the compound unknown-authority materiality path. Preserve the closed odd-cent and Build reconciliation fixes and the correctly implemented explicit spouse-authority contract. Add a regression where A is confirmed self-only, B has unresolved eligibility with family/possibly-family coverage, and target-year legal-spouse authority is unknown; A must remain `more_information_needed` whenever resolving those facts can change A's amount/allocation. Preserve unrelated IRA/workplace routing and truly independent self-only locality.

No production code or Manager-owned task state was modified by this audit.