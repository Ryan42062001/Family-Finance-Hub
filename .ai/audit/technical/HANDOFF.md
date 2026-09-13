# Technical Audit Handoff

## FFH-013 — Spousal-IRA Shared Compensation Ledger — frozen Workflow V3.1 technical audit

**Audit role:** Technical & Mathematical Auditor  
**Audit packet:** `FFH-013-0a8c2f2a-2026-09-13`  
**Execution mode:** `STANDARD_CHAT`  
**Frozen audit target:** `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`  
**Manager control-plane base when audit branch was created:** `188f9acbf32b9811cf07153b2fe4005cfdcae8a1`  
**Production checkpoint:** `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457`  
**Worker handoff checkpoint:** `234b900706d34c4b1bb5fdafb8c8a889d73b1414`  
**PR:** `#21`  
**Verdict:** **FAIL — REMEDIATION REQUIRED**  
**FFH-013-M01 disposition:** **CLOSED**

This is a fresh independent Technical & Mathematical Auditor review of the exact frozen FFH-013 integration target required by `.ai/audit/FFH-013_FROZEN_AUDIT_PACKET_0a8c2f2a.md`. The separate Financial Policy & Scenario Auditor verdict was not read or relied on. Later Manager/control-plane commits were used only to obtain the frozen packet, current workflow, reconciliation gate, and routing state; they were not substituted for the frozen financial-behavior target. No production behavior, Manager-owned task state, or dependent-task activation was modified.

## Evidence inspected

The audit read Workflow V3.1/V3/V2, `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`, `TASK_INDEX.md`, `FFH-013.md`, the frozen packet, Technical Auditor role/handoff, `KNOWN_CI_DEBT.md`, `FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`, FFH-D006, and accepted FFH-015 / FFH-012 / FFH-028 evidence only as necessary for regression preservation.

Exact frozen implementation/test evidence inspected included:

- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-build.ts`
- `lib/calculations/money-priority-existing-cash.ts`
- `lib/calculations/money-priority-windfall.ts`
- `lib/calculations/money-priority-engine.ts`
- `lib/calculations/money-priority-retirement-projection.ts`
- `lib/calculations/ffh-013-spousal-ira-ledger.test.ts`
- `lib/calculations/money-priority-advanced-retirement.test.ts`
- `lib/calculations/phase-5-closure-spousal-ira.test.ts`
- `lib/calculations/money-priority-existing-cash-full.test.ts`
- `lib/calculations/money-priority-windfall.test.ts`
- the retained FFH-015 SIMPLE and FFH-012/025/028 HSA regression surfaces.

Repository lineage and CI evidence were independently inspected for the approved base, production SHA, worker handoff, integration SHA, PR #21, candidate Foundation CI, integration/control-plane comparisons, and later broadened-workflow proof.

## Target lineage / scope

The production delta from approved base `b5111010ebc1f104709a4b27f8c79daef555f435` to `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457` contains the expected FFH-013 retirement-capacity/routing implementation and tests plus task/handoff documentation. Production SHA to worker handoff contains only control-plane/handoff documentation. Production SHA to frozen integration target adds no financial-calculation changes; the later integration delta is control-plane/workflow documentation, including the CI trigger update. The frozen target therefore has the same FFH-013 financial behavior as the inspected production candidate.

## What is technically correct

The implementation makes substantial progress toward FFH-D006:

- Traditional + Roth actual YTD is aggregated by owner; multiple IRA accounts do not independently multiply owner YTD or owner capacity.
- In baseline scarce unequal-compensation cases, the higher-compensation spouse is limited by own supported compensation and the lower spouse can expose spousal-IRA capacity subject to one shared MFJ group.
- Shared and owner groups are represented separately in the retirement-capacity ledger; group room is initialized from a maximum rather than summed duplicate account room.
- `remainingRetirementCapacity()` applies entry, owner-group, and shared-group constraints; `consumeRetirementCapacity()` decrements the applicable entry/group state so Existing Cash, Secure, Build, and later Windfall cannot normally recreate an already-consumed shared pool.
- Missing material owner/compensation/account-inventory/YTD facts are generally targeted as `more_information_needed`; absence of a spouse IRA record is not treated as authoritative zero YTD where it is material.
- Roth direct-contribution eligibility remains a separate constraint from compensation capacity, and Traditional IRA deductibility remains separate from contribution eligibility/shared compensation capacity.
- Input arrays are normalized/sorted for group identity and routing, preventing raw input order from being a legal-capacity rule.
- The retained SIMPLE/HSA/workplace calculation suites remain green and no separate regression in those accepted domains was identified.

Those correct properties do not cure the three HIGH findings below.

## Findings

| ID | Severity | Status | Technical disposition |
|---|---|---|---|
| T1 — annual equal-owner tie is not capped to the common shared MFJ group before owner shares are computed | HIGH | **OPEN / BLOCKING** | Existing Cash/Windfall annual tie routing can let stable account identity determine thousands of dollars when tied owner-conditional room exceeds the shared group. Total shared consumption is clipped safely, but equal-fulfillment/final-cent neutrality is violated. |
| T2 — active scheduled/current-plan IRA contributions are not reserved in the planning capacity ledger | HIGH | **OPEN / BLOCKING** | Schedules remain separate from YTD, which is correct, but no reservation is made before Existing Cash/Secure/Build/Windfall consume the ledger. Additional recommendations can reuse legal room already occupied by the active plan. |
| T3 — shared MFJ compensation group/warnings are gated by pre-YTD scarcity | HIGH | **OPEN / BLOCKING** | If joint compensation is not initially below the sum of conditional maxima, owner YTD excess can make shared compensation material later without creating the shared group; the other spouse can then be overstated and supported-excess warnings can be skipped. |
| FFH-013-M01 — recurring equal-fulfillment cent reconciliation | HIGH | **CLOSED** | The recurring monthly helper caps to shared monthly authority before splitting, uses the same helper for prepass and execution, consumes exact annual cents implied by routed monthly cents, and passes the required `$10,000.01` adversarial case exactly. |

No CRITICAL finding was identified. No additional MEDIUM or LOW finding is necessary beyond the test-sufficiency consequences of T1–T3.

## T1 — HIGH — annual tied-spouse routing violates owner neutrality

`consumeRetirementCapacityForEqualOwnerTie()` calculates `totalAvailableCents` by summing owner-conditional available room and caps the requested one-time amount only to that sum. It does **not** cap the amount to the common shared MFJ group before proportional owner targets are calculated. It then consumes those owner targets sequentially against the ledger.

Reachable adversarial reproduction:

- owner A conditional room: `$7,500.00`;
- owner B conditional room: `$7,500.00`;
- common shared MFJ room: `$10,000.01`;
- tied one-time retirement demand: `$15,000.00`.

The helper first plans `$7,500.00 + $7,500.00`. The first stable-sorted account consumes `$7,500.00`, leaving `$2,500.01` in the shared group; the second account is then clipped to `$2,500.01`. Household legal conservation remains `$10,000.01`, but stable identity determines a `$4,999.99` material allocation difference rather than only an unavoidable final cent. Reassigning stable account IDs can flip which spouse receives the large share.

Existing Cash and Windfall both call this annual helper for financially tied MFJ IRA destinations. Their callers do not pre-cap tied demand to shared-group room, so this is not an unreachable helper-only defect.

This violates FFH-D006 rule 9 and the Financial Engine Reconciliation Gate's equal-fulfillment/final-cent rule. The focused FFH-013 test requests only `$5,000.01` against `$10,000.01` of shared room, so it never exercises an annual tied request that exceeds the shared pool.

## T2 — HIGH — scheduled/current-plan IRA reservations are omitted

FFH-D006 rule 4 requires actual YTD to reduce legal capacity once while active scheduled/current-plan allocations **reserve planning capacity without being relabeled as YTD**.

The frozen evaluator correctly aggregates only `employeeContributedYtd` into IRA YTD. However, `createRetirementCapacityLedger()` receives only the resulting opportunities and initializes legal/planning room from those YTD-derived amounts. The engine then immediately supplies that ledger to Existing Cash/Secure/Build, and Windfall later clones the resulting final ledger. No initial step reserves `monthlyEmployeeContribution` / active current-plan IRA schedules against owner/shared planning capacity.

This matters because the retirement projection and Build assessment do treat the current monthly contribution schedule as current baseline retirement saving and compute `recommendedMonthlyIncrease` as an **additional** amount. A participant with `$7,500` legal annual IRA room, YTD `$0`, and an active `$625/month` IRA schedule can therefore still expose the full `$7,500` ledger room to one-time or additional recurring routing. The current plan already intends `$7,500/year`, yet another consumer can reuse that same legal room.

The implementation has correctly avoided falsely recording planned dollars as YTD, but it omitted the required planning reservation. The FFH-013 focused scenarios use zero monthly IRA contributions, and the Existing Cash/Windfall retirement tests do not exercise a scheduled MFJ IRA reservation against the shared ledger.

This violates FFH-D006 rules 4 and 6 and the baseline no-double-consumption invariant.

## T3 — HIGH — YTD can make shared compensation material after the shared group was skipped

For unequal-compensation MFJ pairs, the frozen evaluator computes:

- higher owner conditional limit = `min(individual limit, higher own compensation)`;
- lower owner conditional limit = individual IRA limit;
- joint compensation = both spouses' supported compensation.

It creates the shared MFJ compensation group only when `jointCompensation < higherLimit + lowerLimit` **before applying actual YTD**. The excess warnings are also inside that guarded shared-group path.

Reachable reproduction for spouses under age 50:

- A compensation: `$10,000`;
- B compensation: `$5,000`;
- each individual limit: `$7,500`;
- A actual IRA YTD: `$8,000`;
- B actual IRA YTD: `$0`.

`jointCompensation = $15,000` and `higherLimit + lowerLimit = $15,000`, so the shared group is not created. A correctly reaches zero owner room, but B still exposes `$7,500` additional room. If B uses it, household actual-plus-new contributions become `$15,500` against `$15,000` supported joint compensation. Under FFH-D006's approved equations, `sharedRemaining` is `$7,000`, so B's conditional additional maximum is only `$7,000`. The higher-owner excess warning is also skipped because warning generation is inside the shared-group branch that did not execute.

The existing supported-excess regression uses an already-scarce compensation pair, so it enters the shared branch and does not challenge this boundary.

This violates FFH-D006 rules 1, 2, 5, and 12 and is a direct legal-capacity overstatement.

## Financial Engine Reconciliation Gate and FFH-013-M01

The **required recurring Build adversarial case passes exactly** at the frozen target:

- shared MFJ annual remaining: `$10,000.01`;
- conditional owner room: `$7,500.00` each;
- authoritative recurring amount: `$833.33/month`;
- tied destination routes: `$416.67 + $416.66 = $833.33/month` exactly;
- annual ledger consumption: `$5,000.04 + $4,999.92 = $9,999.96`;
- shared annual remainder: `$0.05`.

The recurring helper converts annual room to authoritative monthly cents, caps the tied request to the shared recurring monthly authority **before** owner shares are calculated, assigns only the unavoidable odd monthly cent by stable identity, converts routed monthly cents back to exact annual cents, and throws if actual consumption differs from that exact annual representation. Build's planning/prepass and actual tied-spouse router use the same recurring helper. The final Build invariant requires exact aggregate monthly equality with destination monthly allocations and has no epsilon/tolerance escape.

Reversing account input order preserves the material result. Therefore **FFH-013-M01 is independently CLOSED** and should not be reopened by remediation of the separate findings.

The **overall Financial Engine Reconciliation Gate is nevertheless NOT satisfied for FFH-013**, because the gate also applies to one-time/Windfall destination equality, equal-fulfillment, shared consumption, and stable-identity final-cent behavior. T1 violates that standard in the annual tied-spouse path. T2 additionally leaves current-plan reservations outside the planning-capacity reconciliation model.

## Shared/owner ledger and multi-account conclusion

Within cases where the shared group is correctly instantiated, shared and owner ledgers are conserved across staged consumers. Multiple Traditional/Roth accounts for one owner cannot multiply room: owner YTD aggregates across represented accounts, the owner group uses one owner-level maximum, and a first account's consumption reduces the owner group seen by the owner's other accounts. The same shared group prevents both spouses' multiple accounts from independently multiplying the household pool.

This part is technically sound, including staged direct ledger tests. T3 shows that the shared group is not instantiated for every case where actual YTD makes the joint constraint material, so the representation is not yet a complete implementation of the approved feasible set.

## Build / Existing Cash / Windfall conclusion

- **Build recurring routing:** PASS for the required recurring-cent reconciliation and staged shared-group consumption; M01 is CLOSED.
- **Existing Cash:** shares the authoritative engine ledger with later stages, so it does not recreate a fresh shared pool; however its tied-spouse annual helper is affected by T1, and scheduled reservations are absent under T2.
- **Windfall:** clones the engine's final retirement-capacity ledger, so earlier Existing Cash/Secure/Build consumption is preserved rather than recreated; however its tied-spouse annual helper is also affected by T1 and the underlying ledger never received the T2 scheduled reservation.
- **Cross-consumer shared-group conservation:** PASS when the group exists; T3 is the exception because some YTD-material shared constraints are never represented as a group.

## Ordering / final-cent conclusion

Raw person/account array order is not used as a statutory capacity rule. Pair/group identities and ledger entries are sorted/canonicalized, and the required recurring case remains invariant when account input order is reversed.

However, T1 means **stable identity has a prohibited substantive effect** in overloaded annual tied-spouse routing: sorted ID determines which spouse consumes the large first share of the shared pool. Stable identity therefore affects much more than the final unavoidable cent. This is blocking even though raw array reordering alone remains deterministic.

## Roth and Traditional tax-rule preservation

Roth direct-contribution eligibility remains evaluated separately after compensation/shared legal-capacity constraints; the shared compensation ledger does not manufacture direct Roth eligibility. Traditional IRA contribution eligibility/shared compensation capacity also remains separate from Traditional deductibility. The retained closure regression confirms MFJ Traditional deductibility continues to use the persisted spouse relationship independently of compensation routing.

No blocking Roth-eligibility or Traditional-deductibility regression was identified.

## SIMPLE / HSA / workplace regression conclusion

FFH-013 does not rewrite the accepted FFH-015 SIMPLE category/year or catch-up policy, and no SIMPLE regression was identified. HSA opportunities continue through their dedicated legal-capacity evaluator; the retained FFH-012/025/028 HSA regressions remain present and the full calculation suite is green. Unrelated workplace retirement behavior also remains covered by the advanced/workplace suites.

The three open findings are therefore FFH-013 IRA/shared-ledger defects, not evidence that accepted SIMPLE/HSA/workplace behavior regressed.

## Test sufficiency conclusion

The FFH-013 suite is meaningfully adversarial in several areas: one-earner/zero-earner MFJ behavior, scarce joint compensation, asymmetric YTD, both spouses with YTD, multiple IRA accounts, missing spouse inventory, missing YTD, supported excess in an already-scarce case, person/account reordering, staged ledger consumption, the exact M01 recurring-cent case, Roth/Traditional separation, and broader retirement regressions.

It is **not sufficient for closure** because it misses all three reachable blocking cases discovered independently:

1. annual tied demand exceeding the shared MFJ group while conditional owner room remains larger in aggregate (T1);
2. nonzero active scheduled IRA contributions that should reserve planning capacity without becoming YTD (T2);
3. owner YTD excess making the joint constraint material when pre-YTD joint compensation was not initially scarce (T3).

The Existing Cash and Windfall suites likewise do not provide end-to-end MFJ overload/scheduled-reservation coverage for those cases. Green tests therefore do not establish the required feasible-set/reconciliation semantics.

## CI and failure attribution

Exact production candidate Foundation CI run `34732621610`, job `103658103064`, head `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457`, passes AI-state validation, production dependency audit, calculations, security, Type Check, lint, and build.

No Foundation CI run was found whose exact head SHA is frozen integration target `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`; this audit therefore does **not** claim exact-target CI execution. The production-to-integration comparison contains no financial-calculation change. The integration updates the workflow trigger surface rather than weakening its verification steps. A later broadened-workflow Foundation CI run `34733564895`, job `103660789091`, head `2f05ecf31e6f155ea3a47b45b5f82967b389f9df`, passes the same full gate set, and the comparison from the green production candidate to that later checkpoint contains no financial-calculation changes.

Accordingly there is no evidence of a new type/lint/build regression at the frozen financial behavior. CI-001 remains CLOSED and was not reused to excuse any failure. The blocking audit findings are semantic/mathematical cases not exercised by the green suite.

## Final disposition

**FAIL — REMEDIATION REQUIRED**

FFH-013-M01 is **CLOSED**: the recurring Build cent-reconciliation remediation is exact, order-stable, and conserves the required `$10,000.01` adversarial case. However, the exact frozen target does not fully implement FFH-D006 or the Financial Engine Reconciliation Gate because three independent HIGH defects remain:

- annual tied-spouse Existing Cash/Windfall routing can let stable identity determine material allocation when shared capacity is the binding constraint;
- active scheduled/current-plan IRA contributions are not reserved against the planning ledger;
- owner YTD excess can make shared MFJ compensation binding after the evaluator has skipped creation of the shared group, overstating the other spouse's additional room and skipping the required excess warning.

Manager retains remediation, closure, and FFH-017 activation authority. This audit does not close FFH-013 and does not activate FFH-017.