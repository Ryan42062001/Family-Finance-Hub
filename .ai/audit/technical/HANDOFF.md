# Technical Audit Handoff

## FFH-012 — HSA Legal-Capacity Calculation — Workflow V3.1 frozen technical re-audit

**Audit role:** Technical & Mathematical Auditor  
**Audit date:** 2026-09-12  
**Execution mode:** `STANDARD_CHAT`  
**Frozen audit target:** `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`  
**Control-plane base when audit artifact branch was created:** `5d941d2c8f90984b749a98af9aedbe1e4bf90ba1`  
**Verdict:** **FAIL — REMEDIATION REQUIRED**  
**FFH-012 safe to close:** **NO**

This is a fresh independent technical/mathematical re-audit of the exact frozen target required by `.ai/audit/FFH-012_FROZEN_AUDIT_PACKET.md`. Later milestone commits were treated as Manager control-plane/task/audit-document lineage only and did not change the audited production target. The separate Financial Policy & Scenario Auditor verdict was not read or relied on. No production behavior or Manager-owned lifecycle state was modified.

## Audit basis

The audit applied Workflow V3.1/V3/V2 controls, FFH-D005, the accepted FFH-022 HSA legal-marriage authority contract, the frozen FFH-012 packet, the exact frozen implementation/tests, persistence/input reachability needed to test adversarial states, and exact GitHub CI/commit evidence.

FFH-025 is integrated at the frozen target. Comparing the immediate pre-FFH-025 parent `19bc304008959a3df46ff77256afb94f13712782` to `ffde8440...` shows only four changed paths:

- `.ai/tasks/FFH-025.md`
- `.ai/work-helper/HANDOFF.md`
- `lib/calculations/ffh-025-hsa-compound-authority-materiality.test.ts`
- `lib/calculations/money-priority-hsa-legal-capacity.ts`

The frozen target therefore contains the bounded FFH-025 authority-materiality remediation without unrelated Build/persistence/UI/security-file changes.

## Finding disposition

| ID | Severity | Status | Disposition |
|---|---|---|---|
| A — compound unknown legal-spouse-authority materiality | HIGH | CLOSED at frozen target | FFH-025 now blocks missing/explicit-unknown authority when both candidates could be eligible and family coverage is present or unresolved, while preserving supported locality for fully known self-only facts and known-ineligible counterparties. |
| B — odd-cent shared-capacity conservation | HIGH | CLOSED | Integer-cent allocation deterministically conserves `$5,104.17 = $2,552.08 + $2,552.09` with no lost/extra cent. |
| C — Build/account reconciliation | HIGH | CLOSED | `$8,750` annual shared capacity reconciles as `$4,375 + $4,375`; monthly account routing is `$364.58 + $364.58 = $729.16`; Build consumes/routes the actual destination ledger values and rejects any positive residual. |
| D — candidate-pair cardinality bypass | HIGH | **OPEN / BLOCKING** | With three or more active nondependent `self`/`spouse_partner` candidate records, the evaluator sets no candidate pair, can ignore a valid target-year A/B authority row, skips the authority-materiality guard, and can fall back to independent HSA family limits. This can double the ordinary family capacity from `$8,750` to `$17,500`. |
| E — transitional HSA fixture helper can overwrite canonical uncertainty | LOW | OPEN / NON-BLOCKING | `withNormalizedHsaFacts()` still rewrites HSA YTD tax year, profiles, and twelve month rows from legacy account hints. Dedicated canonical adversarial tests do not depend solely on this helper, so this remains test-maintenance debt rather than a production-closure blocker. |

## Finding A — CLOSED at frozen target

The FFH-025 materiality predicate now treats legal-spouse status as material in each month when both candidate people could be HSA-eligible and family coverage is known or still possible (`family` or `unknown`). Missing or explicit `unknown` pair/year authority then adds targeted `legal_spouse_authority` missing-data state to both candidate people rather than exposing positive HSA capacity.

The required asymmetric regression is covered: A is eligible/self-only, B is eligible with coverage unknown, and pair/year authority is missing or explicitly unknown. A no longer exposes an unconditional `$4,400` self-only amount. Additional frozen FFH-025 regressions independently support locality and protected-semantic behavior: both fully known self-only candidates remain actionable; a known-ineligible counterparty does not unnecessarily trigger the authority gate; confirmed non-spouses evaluate independently; confirmed legal spouses with family coverage share the family ordinary base; `spouse_partner`, filing status, and married-allocation rows do not establish legal marriage; prior-year authority does not carry; pair/input order is invariant; and unrelated IRA/workplace opportunities remain usable while HSA is `more_information_needed`.

## Finding B — CLOSED

For an affirmative legal-spouse shared ordinary base, the frozen evaluator rounds the base to money, converts it to integer cents, gives the first canonical owner `floor(totalCents / 2)`, and gives the second canonical owner the exact remainder. Canonical person-ID ordering makes the remainder deterministic and input-order invariant.

Required boundary case:

`$5,104.17 = $2,552.08 + $2,552.09`

The exact cent is conserved; there is no tolerance-based leakage or phantom routable cent.

## Finding C — CLOSED

The frozen Build path derives routable monthly retirement capacity from actual annual destination-ledger consumption. Each destination converts its consumed annual amount with `roundMoney(consumedAnnualAmount / 12)`, and actual routing uses the same account-level conversion. Build throws if any positive `retirementToRoute` remains; there is no cent-sized epsilon escape hatch.

Required reconciliation case:

- annual ordinary shared capacity: `$8,750.00`;
- owner A annual destination: `$4,375.00`;
- owner B annual destination: `$4,375.00`;
- owner A monthly route: `$364.58`;
- owner B monthly route: `$364.58`;
- aggregate monthly Build/account route: `$729.16`.

The engine therefore reconciles displayed/routed account amounts rather than presenting an idealized `$729.17` monthly aggregate that cannot be reproduced by the two destination routes.

## Finding D — HIGH — OPEN / BLOCKING

### Defect

At the frozen target, candidate people are all active, nondependent household people whose relationship is `self` or `spouse_partner`, sorted by ID. A legal-spouse candidate pair is formed only when that candidate array has **exactly two** entries. If the candidate count is three or more, `candidatePairIds` becomes empty. That makes candidate authority unavailable, married-pair state unavailable, and the unknown-authority materiality guard inapplicable for the actual pair.

This is unsafe because the application/persistence contract does not guarantee exactly two such records. The HSA person action accepts `self` and `spouse_partner` and does not enforce a maximum-two canonical pair; the HSA UI does not impose that maximum; the household-person migration has no one-self/one-spouse-partner cardinality constraint; and snapshot loading admits the active records without rejecting this ambiguity. The state is therefore application/persistence reachable, not merely a hand-constructed impossible snapshot.

### Minimal deterministic reproduction

Use target year 2026 with three active, nondependent household records: A=`self`, B=`spouse_partner`, C=`spouse_partner`. A and B are under 55, HSA-eligible for all twelve months, have family HDHP coverage for all twelve months, and have zero current-year HSA contributions. C does not need to own an HSA account. Add explicit target-year authority confirming A and B are legal spouses.

Because there are three spouse candidates, the evaluator forms no candidate pair and does not select the valid A/B authority row. A and B can fall through to independent evaluation, each exposing the `$8,750` family ordinary limit. The household can therefore expose `$17,500` of ordinary HSA room even though confirmed legal spouses A/B must share one `$8,750` ordinary family pool.

### Why this blocks closure

This violates FFH-D005 and FFH-022's pair-specific legal-authority contract and the no-overstatement requirement. The error is financially material and can route contributions above the lawful shared ordinary capacity. It is not cured by the now-correct two-candidate unknown-authority materiality logic.

Manager-directed remediation should ensure ambiguous/multiple spouse-candidate states cannot silently fall back to independent family limits. A bounded fix could derive an explicit canonical pair from authoritative pair/year data where unambiguous, or return targeted `more_information_needed` when multiple candidates make pair identity ambiguous. A regression should include a third candidate with no HSA account plus an affirmative A/B target-year authority row.

## Finding E — LOW — OPEN / NON-BLOCKING

`lib/calculations/hsa-test-fixtures.ts` remains capable of overwriting deliberately canonical uncertainty: `withNormalizedHsaFacts()` forces each HSA account's YTD tax year to the requested year, rebuilds profiles, and generates twelve `confirmed` month rows from legacy account-level eligibility/coverage hints. If applied to a fixture intended to preserve partial-year, unknown, Medicare-timing, or stale-year facts, it can replace the condition the test meant to exercise.

The frozen FFH-012/FFH-025 adversarial coverage directly constructs canonical facts for the material legal-capacity scenarios reviewed here, so Finding E does not independently invalidate production correctness. It remains LOW test-maintenance debt.

## Frozen packet regression matrix

| Audit question | Result | Technical evidence/disposition |
|---|---|---|
| Locality | PASS for the intended two-candidate contract | Fully known self-only facts stay actionable; known-ineligible counterparty does not unnecessarily block the eligible owner. |
| No marriage inference | PASS for supported candidate-pair states | Relationship, filing status, and allocation data do not create affirmative legal-spouse authority. |
| Unrelated-route usability | PASS | HSA `more_information_needed` does not disable otherwise valid IRA/workplace retirement routes. |
| Ordering invariance | PASS | Pair normalization/sorting and deterministic cent remainder assignment preserve equivalent results under reordered inputs. |
| Target-year authority isolation | PASS | Authority lookup requires target tax year and normalized pair identity; prior-year authority does not carry. |
| Target-year/YTD isolation | PASS | Current-year employee + employer HSA contributions are aggregated by owner; stale/prior-year facts do not silently reduce the target-year room. |
| Medicare | PASS | Medicare timing participates in month eligibility and proration so Medicare-ineligible months do not contribute ordinary capacity. |
| Catch-up | PASS | Age-55 catch-up remains owner-specific/nontransferable rather than part of the shared ordinary family base. |
| Partial-year | PASS | Ordinary capacity is month-prorated from normalized eligibility/coverage facts. |
| Multi-account | PASS | Capacity is grouped by owner/shared group rather than multiplied by the number of HSA accounts. |
| Cents/reconciliation | PASS | Findings B and C remain exact at required cent boundaries. |
| Candidate-pair cardinality / authority reachability | **FAIL** | Finding D can erase pair identity when three or more candidate household records exist and materially overstate family HSA room. |

## CI-001 independent attribution

Foundation CI for the exact frozen target is run `34669630244`, job `103488407900`, head SHA `ffde8440a4e671ab91ea02c35df8a73e1a3da18e`. GitHub reports:

| Gate | Frozen target |
|---|---|
| Install dependencies | PASS |
| Production dependency audit | PASS |
| Test calculations | PASS |
| Test security policy contract | PASS |
| Type check | FAIL |
| Lint | SKIPPED |
| Build | SKIPPED |

The immediate pre-FFH-025 parent `19bc304008959a3df46ff77256afb94f13712782` has Foundation CI run `34668565637`, job `103485384458`, with the same gate pattern: calculation/security PASS, Typecheck FAIL, lint/build skipped. The exact parent-to-frozen comparison changes only the four FFH-025 paths listed above. This independently establishes that the red Typecheck gate predates FFH-025 and that FFH-025 did not introduce a changed legacy TypeScript surface merely by integration. Per Workflow V3.1 and `.ai/manager/KNOWN_CI_DEBT.md`, CI-001 remains inherited known debt and is not assigned to FFH-012/FFH-025 on the basis of this run.

The skipped lint/build gates are not claimed as passing at the frozen target; they are unexecuted because the inherited Typecheck gate failed first.

## Final disposition

**FAIL — REMEDIATION REQUIRED**

Findings A, B, and C are closed at the frozen target, and the required two-candidate authority/materiality, deterministic cent, and Build reconciliation regressions are technically sound. However, new Finding D is a HIGH protected-semantic defect in a reachable household state: three or more spouse-candidate records can prevent selection of valid pair/year authority and can expose independent family HSA limits that exceed the lawful shared ordinary capacity. FFH-012 must not be closed until that ambiguity/cardinality path is remediated and independently re-audited.

Manager retains task lifecycle, acceptance, merge, and closure authority. This audit changed only the Technical Auditor-owned handoff artifact and made no production change.