# Technical Audit Handoff

## FFH-013 — Spousal-IRA Shared Compensation Ledger — fresh frozen technical re-audit

**Audit role:** Technical & Mathematical Auditor  
**Audit packet:** `FFH-013-e811ef1f-2026-09-13`  
**Execution mode:** `STANDARD_CHAT`  
**Frozen audit target:** `e811ef1f1f786196d909391262b19d71fe0f9a71`  
**Manager control-plane base when audit branch was created:** `aac67d9fc0808e12255b938e3c0d675401d7552f`  
**Production checkpoint:** `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`  
**Final worker/handoff head:** `c298ac4bfe0d63f248c2a7ec993f0d8031c7377d`  
**PR:** `#23`  
**Verdict:** **FAIL — REMEDIATION REQUIRED**

This is a fresh independent Technical & Mathematical Auditor re-audit of the exact frozen FFH-013 target required by `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_e811ef1f.md`. The separate Financial Policy & Scenario Auditor verdict was not read or relied on. Later Manager/control-plane commits were used only for current workflow/task/audit context and were not substituted for the frozen financial implementation target. No production behavior, Manager-owned lifecycle state, or dependent-task activation was modified.

## Evidence inspected

Required control-plane/policy evidence inspected:

- `.ai/shared/WORKFLOW_V3_1.md`
- `.ai/shared/WORKFLOW_V3.md`
- `.ai/shared/WORKFLOW.md`
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`
- `.ai/tasks/TASK_INDEX.md`
- `.ai/tasks/FFH-013.md`
- `.ai/roles/technical-audit.md`
- `.ai/audit/technical/HANDOFF.md`
- `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_e811ef1f.md`
- `.ai/manager/KNOWN_CI_DEBT.md`
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`
- FFH-D006 in `.ai/shared/DECISIONS.md`

Exact frozen implementation/test evidence inspected included:

- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-build.ts`
- `lib/calculations/money-priority-existing-cash.ts`
- `lib/calculations/money-priority-windfall.ts`
- `lib/calculations/money-priority-engine.ts`
- `lib/calculations/money-priority-retirement-floor.ts`
- `lib/calculations/money-priority-secure.ts`
- `lib/calculations/ffh-013-spousal-ira-ledger.test.ts`
- `lib/calculations/ffh-013-m02-equal-compensation-excess.test.ts`
- `lib/calculations/money-priority-hybrid-retirement-floor.test.ts`
- relevant retained IRA/Roth/Traditional, SIMPLE, HSA, and workplace-retirement regression evidence.

Repository/CI evidence inspected included PR #23, production/final/integration lineage, candidate Foundation CI run `34737929168` / job `103672520594`, final-head run `34738110144` / job `103673023089`, and exact commit comparisons.

## Target lineage and CI

Candidate Foundation CI run `34737929168`, job `103672520594`, is green on exact production SHA `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63` through AI-state validation, dependency audit, calculations, security, Type Check, lint, and build.

Final-head Foundation CI run `34738110144`, job `103673023089`, is green on exact final worker/handoff head `c298ac4bfe0d63f248c2a7ec993f0d8031c7377d` through the same gates.

`5e3f21c... -> c298ac4...` changes only `.ai/engineering/engine/HANDOFF.md`. `c298ac4... -> e811ef1...` has **zero file differences**; both commits have the same tree. Therefore the frozen integration target contains exactly the financial implementation exercised by the final-head green CI. Later `e811ef1... -> aac67d9...` changes only the frozen audit packet and Manager-owned FFH-013 task/index state, not financial implementation.

`CI-001` remains CLOSED; no inherited CI debt is available to explain or mask the technical finding below. Green CI is evidence, not proof of correctness.

## Named finding disposition

| Finding | Severity | Independent disposition |
|---|---|---|
| FFH-013-A01 — annual tied-spouse shared-cap-first equal fulfillment | HIGH | **CLEARED** |
| FFH-013-A02 — scheduled/current-plan IRA reservation | HIGH | **CLEARED** |
| FFH-013-A03 — unequal post-YTD materiality at `$10k/$5k`, `$8k/$0` | HIGH | **CLEARED** |
| FFH-013-A04 — scarce unequal owner/joint supported excess fail-closed behavior | HIGH | **CLEARED** |
| FFH-013-A05 — conditional owner maxima non-additive household presentation | MEDIUM | **CLEARED** |
| FFH-013-M01 — recurring equal-fulfillment cent reconciliation | HIGH | **CLEARED / REMAINS CLOSED** |
| FFH-013-M02 — equal-compensation owner-only excess remains owner-local | HIGH | **CLEARED** |
| **T1 — non-scarce unequal-compensation owner excess incorrectly zeroes unaffected spouse** | **HIGH** | **OPEN / BLOCKING** |

No CRITICAL finding was identified. No separate MEDIUM or LOW finding is necessary beyond T1's test-sufficiency consequence.

## A01 — CLEARED

`consumeRetirementCapacityForEqualOwnerTie()` now determines the common shared group before calculating owner shares and caps annual integer cents to `min(requested, summed owner availability, common shared availability)`.

Required adversarial case independently reconciles:

- tied demand: `$15,000.00`;
- shared MFJ room: `$10,000.01`;
- conditional owner room: `$7,500.00` each;
- routed amounts: `$5,000.01 + $5,000.00 = $10,000.01`;
- shared remainder: `$0.00`.

The odd cent is assigned only after equal fulfillment has been applied. Reversing stable account IDs can move only that unavoidable cent, not a substantive share. Existing Cash and Windfall both use this remediated helper for tied MFJ IRA annual routing.

## A02 — CLEARED

The evaluator now keeps authoritative IRA YTD and active-plan reservation as separate facts. Traditional + Roth YTD is aggregated by owner. Active IRA schedule targets are converted to planning reservations net of already-recorded owner YTD; the reservation is allocated deterministically across that owner's scheduled IRA accounts.

`createRetirementCapacityLedger()` records those amounts as `consumed.scheduled` and subtracts them from entry, owner-group, and MFJ-shared planning room before any new consumer routes dollars. They are not added to `contributedYtd`.

Direct adversarial evidence clears:

- YTD `$0`, `$625/month` active IRA schedule => YTD remains `$0`, reservation `$7,500`, no additional room for that owner;
- YTD `$2,500`, same annual schedule => reservation `$5,000`, not `$7,500`, so YTD is not double counted;
- multiple Traditional/Roth accounts for one owner share one owner reservation;
- both spouses' schedules reduce one MFJ shared ledger exactly once;
- staged Existing Cash, Build, and Windfall cannot reuse scheduled room.

The retirement-floor layer reads the already-reserved IRA planning ledger rather than consuming those scheduled IRA dollars a second time. Gross verified legal capacity and post-schedule planning capacity remain separately reportable.

## A03 — CLEARED

For unequal compensation `$10,000/$5,000`, individual limits `$7,500/$7,500`, and authoritative YTD `$8,000/$0`, the evaluator now detects the higher-owner supported-compensation/individual ceiling excess after YTD even though pre-YTD joint compensation equals the sum of conditional maxima. It creates the applicable MFJ shared group, fails that affected group closed, produces `$0/$0` additional room, and emits the owner-excess warning. Person/account reorder preserves the result.

The prior phantom `$7,500` spouse room no longer exists for this required pin.

## A04 — CLEARED for the required scarce unequal case

For compensation `$4,000/$2,000` and YTD `$5,000/$0`, the higher owner's excess is detected, the scarce unequal-compensation shared feasible set is failed closed, both additional rooms are `$0`, and the warning identifies the supported owner-compensation excess without inventing contribution-correction mechanics.

The retained tests also cover lower-owner excess and joint-compensation excess in scarce unequal scenarios. A04's required behavior remains intact after M02.

## A05 — CLEARED

Where an MFJ shared compensation group applies, owner opportunity explanations explicitly state that spouse-specific maxima are conditional/non-additive and identify the shared MFJ compensation amount. The household recommendation layer also states that the spouse-specific IRA maxima are conditional/non-additive and draw from one shared MFJ pool; it does not present `$7,500 + $7,500` as `$15,000` independent room when the pool is only `$10,000`.

## M01 — CLEARED / REMAINS CLOSED

The required recurring Build case passes exactly:

- shared annual room: `$10,000.01`;
- conditional owner room: `$7,500.00` each;
- authoritative Build retirement amount: `$833.33/month`;
- routes: `$416.67 + $416.66 = $833.33/month` exactly;
- annual ledger consumption: `$5,000.04 + $4,999.92 = $9,999.96`;
- shared annual remainder: `$0.05`.

Build's prepass and execution both use the same recurring monthly-cent tie helper. Monthly cents are authoritative for recurring routing; annual legal consumption is exactly the routed monthly cents times 12. Execution computes the destination sum and throws unless it exactly equals the aggregate Build retirement allocation. No epsilon/tolerance or subtract-and-clamp allowance is used to excuse a positive reconciliation residual. Account-order reversal preserves the material result.

## M02 — CLEARED

Equal compensation `$10,000/$10,000` with individual limits `$7,500/$7,500` and YTD `$8,000/$0` now produces:

- owner A room `$0` plus owner-local possible-excess warning;
- owner B room `$7,500`;
- owner-local groups `ira:a` / `ira:b`;
- no `ira:mfj-compensation:*` group solely from A's owner excess.

The reverse-owner case is symmetric. Person and account reordering are materially invariant. The exact scarce unequal A04 case remains shared/fail-closed, so M02 did not reopen A04.

## T1 — HIGH — non-scarce unequal owner excess incorrectly zeroes unaffected spouse

The remediation defines `sharedSpousalFeasibleSetApplies = higher !== null`, which is true for **every unequal-compensation pair**, even when joint compensation is non-scarce and the shared joint-compensation constraint is mathematically redundant.

The normal no-excess path partly compensates for this with `preYtdSharedConstraintCanBind = jointCompensation < conditionalTotal`, so the accepted FFH-009 non-scarce scenario does not create a shared group at YTD `$0/$0`. But the post-YTD excess path uses:

`sharedFeasibleSetExcess = sharedSpousalFeasibleSetApplies && (ownerExcesses.length > 0 || jointExcess)`

and creates a zero MFJ shared group whenever any owner excess exists. That over-applies the scarce/shared fail-closed rule.

Independent reachable reproduction, both spouses under age 50:

- A compensation: `$100,000`;
- B compensation: `$50,000`;
- individual limits: `$7,500/$7,500`;
- A authoritative IRA YTD: `$8,000`;
- B authoritative IRA YTD: `$0`.

Accepted FFH-009 explicitly classifies `$100,000/$50,000` as **non-scarce compensation**: each spouse has independent `$7,500` combined IRA capacity and shared compensation does not bind.

FFH-D006's approved equations give:

- `sharedRemaining = $150,000 - $8,000 - $0 = $142,000`;
- `higherRemaining = max(0, $7,500 - $8,000) = $0`;
- `lowerIndividualRemaining = $7,500`;
- conditional A additional room = `$0`;
- conditional B additional room = `$7,500`;
- household maximum additional room = `$7,500`.

The frozen implementation instead sees unequal compensation (`higher !== null`), sees A in `ownerExcesses`, sets `sharedFeasibleSetExcess = true`, creates an `ira:mfj-compensation:*` group with `$0`, and applies that zero group to both spouses. Result: A `$0`, **B incorrectly `$0`**. The warning also says the affected shared MFJ group is zero even though the shared joint-compensation ceiling is not affected.

This violates:

- FFH-009 Scenario 1 non-scarce compensation;
- FFH-D006's approved mathematical representation;
- FFH-D006 rule 12 / frozen-packet requirement that supported excess fail closed only for the legally affected owner/shared feasible set;
- the same owner-locality principle that M02 correctly restores for equal compensation.

Severity is **HIGH** because a supported valid spouse IRA capacity can be suppressed by `$7,500` based solely on the other spouse's owner-only excess, materially changing household recommendations. This is the same correctness class as the Manager's HIGH M02, now exposed in an unequal-but-non-scarce household.

Required narrow remediation should preserve A01–A05, M01, and M02 while distinguishing “unequal compensation” from “shared/ scarce compensation can actually bind” for owner-excess fail-closed scope. Add direct non-scarce unequal excess tests in both owner directions and reorder variants.

## Shared/owner ledger, multiple-account, and cross-consumer conclusion

When the correct owner/shared groups are established, ledger conservation is sound. Multiple Traditional/Roth IRA accounts cannot multiply owner room; owner YTD aggregates once and the owner group constrains all of that owner's accounts. Multiple spouse accounts sharing an MFJ group cannot multiply household room. Entry/group invariants require total consumed amounts to remain within original room.

Existing Cash mutates the engine's authoritative ledger; Secure and Build then consume that same ledger. Windfall clones the final already-consumed ledger rather than recreating capacity. Scheduled reservation is present before these stages. Therefore no separate cross-consumer recreation/double-spend defect remains from A01/A02.

T1 is a **group-scope/classification** defect: it creates a zero shared group where the accepted non-scarce feasible set says the unaffected spouse remains owner-local.

## Missing-information behavior

The scarce/shared cases directly tested remain conservative: missing material spouse compensation, missing owner/account inventory, and unknown aggregate IRA YTD produce targeted information-needed rather than optimistic shared room; absence of a manually recorded spouse IRA is not used as zero when the shared constraint can bind.

At the exact `$10,000/$5,000` pre-YTD equality boundary, missing spouse YTD does not change the known owner's `$7,500` room anywhere inside the other spouse's lawful owner ceiling; known excess evidence is handled separately by A03/A04. No separate missing-data finding is opened.

## Roth / Traditional / SIMPLE / HSA / workplace preservation

No separate regression was identified in:

- direct Roth eligibility: Roth MAGI/direct-contribution status remains a distinct destination constraint rather than shared compensation room;
- Traditional IRA deductibility: contribution/shared-compensation eligibility remains technically separate from deductibility;
- FFH-015 SIMPLE: category/year authority and catch-up behavior are not rewritten by this remediation;
- FFH-012/028 HSA: HSA legal-capacity evaluation remains dedicated, and generic planned IRA reservations are zero for non-IRA opportunities;
- unrelated workplace retirement: workplace group/annual-additions logic remains intact and the full regression suite is green.

## Test sufficiency conclusion

The remediation suite is materially adversarial and now meaningfully covers every named A01–A05/M01/M02 pin: annual shared overload, final-cent reversal, scheduled-vs-YTD separation, partial YTD, multiple accounts, staged consumers, post-YTD equality materiality, scarce owner/joint excess, conditional/non-additive household presentation, exact recurring reconciliation, equal-compensation owner-local excess, and person/account reordering.

It is nevertheless **insufficient for closure** because it does not cover the reachable non-scarce unequal-compensation owner-excess case in T1. The accepted policy has an explicit `$100,000/$50,000` non-scarce scenario, but the remediation tests only pin owner-excess locality for equal compensation and fail-closed behavior for scarce unequal compensation. The missing middle quadrant allows the frozen defect to pass green CI.

## Final disposition

**FAIL — REMEDIATION REQUIRED**

All named A01–A05, M01, and M02 checks independently clear at frozen target `e811ef1f1f786196d909391262b19d71fe0f9a71`, and M01 remains CLOSED. However, new HIGH T1 is blocking: unequal compensation is being treated as sufficient to make any owner-only excess a shared-group excess, so a non-scarce household can lose the unaffected spouse's valid IRA room.

Manager retains remediation, FFH-013 closure, and FFH-017 activation authority. This audit does not close FFH-013 and does not activate FFH-017.