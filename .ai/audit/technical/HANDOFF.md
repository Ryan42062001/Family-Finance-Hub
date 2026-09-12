# Technical Audit Handoff

## FFH-012 — HSA Legal-Capacity Calculation — post-FFH-028 Workflow V3.1 technical re-audit

**Audit role:** Technical & Mathematical Auditor  
**Audit date:** 2026-09-12  
**Execution mode:** `STANDARD_CHAT`  
**Frozen financial-behavior target:** `51c3cd5978837b892f0323617b49986347c7d938`  
**Control-plane base when audit branch was created:** `72bfc06f086e22946603990f4d517c60de8f6853`  
**Verdict:** **PASS WITH NON-BLOCKING FINDINGS**  
**Manager closure authority:** unchanged; this audit does not close FFH-012.

This was a fresh independent Technical & Mathematical Auditor re-audit of the exact post-FFH-028 frozen target required by `.ai/audit/FFH-012_FROZEN_AUDIT_PACKET_51c3cd59.md`. Later milestone commits were treated only as Workflow V3.1/control-plane/task/audit-document lineage and did not redefine the financial-behavior target. The new Financial Policy & Scenario Auditor verdict was not read or relied on. No production behavior, Manager-owned task state, or policy artifact was modified.

## Authoritative basis and target lineage

The audit applied Workflow V3.1/V3/V2, FFH-D005, the accepted FFH-022 HSA legal-marriage authority policy, FFH-012/022/025/028 task contracts, the frozen packet, exact implementation/tests at `51c3cd59...`, and exact GitHub commit/CI evidence necessary to test the frozen target.

The FFH-028 production comparison is bounded. Comparing pre-FFH-028 approved baseline `e06bf586f6c43254eb64816cc7482f6b9212beda` to FFH-028 production SHA `f266c112abff752e268c48dd097d7d562ac58169` changes exactly:

- `lib/calculations/money-priority-hsa-legal-capacity.ts`
- `lib/calculations/ffh-028-hsa-candidate-pair-cardinality.test.ts`

Comparing `f266c112...` to frozen target `51c3cd5978837b892f0323617b49986347c7d938` adds only task/handoff/control-plane documentation. Therefore the audited frozen target has the same financial-behavior tree as the inspected FFH-028 production remediation.

## Finding disposition

| ID | Severity | Status | Technical disposition |
|---|---|---|---|
| A — compound unknown legal-spouse-authority materiality | HIGH | **CLOSED** | Missing/explicit-unknown pair-year authority blocks HSA capacity whenever both candidates could be eligible and family coverage is present or unresolved, while preserving conservative locality. |
| B — odd-cent shared-capacity conservation | MEDIUM | **CLOSED** | Integer-cent shared allocation exactly preserves `$5,104.17 = $2,552.08 + $2,552.09`, deterministically. |
| C — Build/account reconciliation | HIGH | **CLOSED** | `$8,750 = $4,375 + $4,375` and account-level monthly routing `$364.58 + $364.58 = $729.16` reconcile exactly; any positive Build routing residual is rejected. |
| D — candidate-pair cardinality bypass | HIGH | **CLOSED** | FFH-028 no longer lets three-or-more candidate ambiguity erase the candidates and silently fall back to independent family HSA limits; materially ambiguous HSA owners become `more_information_needed`. |
| E — `withNormalizedHsaFacts()` can overwrite canonical fixture uncertainty | LOW | **OPEN / NON-BLOCKING** | Helper behavior remains a test-maintenance hazard, but the material adversarial/legal-capacity regressions independently construct canonical facts and do not make this helper authoritative for production correctness. |

No new CRITICAL, HIGH, or MEDIUM finding was identified.

## Finding A — CLOSED

At the frozen target, the FFH-025 materiality helper evaluates each month as material when both candidate people could be HSA-eligible and family coverage is known or still possible (`family` or `unknown`). Missing or explicit `unknown` target-year legal-spouse authority then produces targeted `legal_spouse_authority` missing-data state instead of unsupported positive capacity.

The retained asymmetric case remains protected: A eligible/self-only plus B eligible/coverage-unknown does not expose A's full `$4,400` as unconditional verified room. The frozen FFH-025 regressions also retain locality for both-known-self-only candidates and known-ineligible counterparties; confirmed non-spouses remain independent; confirmed legal spouses with family coverage share the family ordinary base; relationship, filing status, and married-allocation rows do not establish legal marriage; prior-year authority does not carry; ordering is invariant; and unrelated IRA/workplace opportunities remain usable when HSA requires more information.

## Finding B — CLOSED

The shared ordinary base is rounded to money and converted to integer cents. The first canonical owner receives `floor(totalCents / 2)` and the second receives the exact remainder. Canonical ID ordering makes remainder ownership deterministic and input-order invariant.

Required retained boundary:

`$5,104.17 = $2,552.08 + $2,552.09`

There is no dropped or fabricated cent and no tolerance-based leakage.

## Finding C — CLOSED

The frozen Build path derives routable monthly retirement capacity from actual annual destination-ledger consumptions. Each account destination uses `roundMoney(consumedAnnualAmount / 12)`, and actual routing uses the same destination-level conversion. The final Build invariant throws on any positive `retirementToRoute`; there is no one-cent epsilon escape hatch.

Required retained reconciliation:

- shared annual ordinary capacity: `$8,750.00`;
- owner A annual destination: `$4,375.00`;
- owner B annual destination: `$4,375.00`;
- owner A monthly route: `$364.58`;
- owner B monthly route: `$364.58`;
- aggregate account/Build monthly route: `$729.16`.

The engine therefore routes the reproducible account-level `$729.16`, not an idealized `$729.17` that the two destination routes cannot reproduce.

## Finding D — CLOSED by FFH-028

### Frozen implementation behavior

The evaluator still forms the ordinary two-person candidate pair only when there are exactly two active, nondependent household people whose relationship is `self` or `spouse_partner`. FFH-028 adds a separate ambiguity path for candidate counts greater than two instead of treating the candidate set as empty for legal-capacity safety purposes.

For three-or-more candidates, all candidate IDs are retained as ambiguous candidates. Each HSA-owning candidate is checked against every other ambiguous candidate with the same materiality predicate used by the two-person unknown-authority safety logic: if both could be eligible and family coverage is known or possible in any month, targeted legal-spouse-authority missing data is added for that HSA owner. The resulting HSA opportunity becomes `more_information_needed` and does not expose annual/monthly HSA capacity.

The implementation deliberately does **not** use a relationship label, filing status, allocation, account ownership, input ordering, prior-year state, or a single authority row to invent a canonical pair among three or more candidates.

### Required adversarial scenario

The frozen dedicated FFH-028 regression constructs:

- A = `self`, B = `spouse_partner`, C = `spouse_partner`;
- all active and nondependent;
- A/B full-year HSA-eligible with family coverage;
- C can own no HSA account;
- explicit target-year authority confirming A/B as legal spouses.

The result is not two independent `$8,750` family capacities. A/B HSA opportunities are `more_information_needed`, have no positive annual/monthly HSA capacity, and carry targeted `legal_spouse_authority` missing-data state. The prior `$17,500` overstatement path is therefore closed. Unrelated IRA/workplace opportunities remain usable.

### Additional cardinality/locality checks

The frozen FFH-028 regressions also cover:

- three candidates with no affirmative authority: materially ambiguous HSA capacity is `more_information_needed` rather than independent family limits;
- all-known self-only candidates: conservative locality remains actionable because spouse status cannot change the supported self-only result;
- known-ineligible extra candidate(s): no unnecessary authority blocker is introduced where that candidate cannot make spouse status material;
- candidate/person/account/month/authority input reordering: equivalent results remain deterministic.

The remediation therefore closes Finding D without replacing the bypass with hidden pair or marriage inference.

## Broader frozen regression/adversarial review

The following required dimensions were independently reviewed against the frozen implementation/tests and remain consistent with FFH-D005/FFH-022:

- **No marriage inference:** `spouse_partner`, filing status, allocation rows, account ownership, ordering, prior-year authority, and a single authority row in an ambiguous multi-candidate household do not manufacture a canonical legal-spouse pair.
- **Unrelated recommendation usability:** HSA `more_information_needed` remains localized; otherwise valid IRA/workplace retirement opportunities continue to be available.
- **Ordering invariance:** candidate IDs/pair identities are normalized/sorted and cent remainder assignment is deterministic; FFH-028 explicitly reorders people/accounts/months/authority input.
- **Target-year authority isolation:** authority is selected for the exact target tax year and normalized pair identity; prior-year authority does not silently carry.
- **YTD/tax-year isolation:** target-year employee plus employer HSA contributions are aggregated by owner; stale/prior-year YTD facts do not silently reduce the target-year limit.
- **Medicare:** month-level Medicare ineligibility/timing remains part of the normalized HSA eligibility path and proration.
- **Catch-up ownership:** age-55 catch-up remains owner-specific and nontransferable rather than part of the shared ordinary family pool.
- **Partial-year behavior:** ordinary capacity remains month-prorated from normalized eligibility/coverage facts.
- **Multi-account behavior:** multiple HSA accounts share the owner/shared-group capacity rather than multiplying legal contribution room.
- **Recommendation Refresh/hypothetical behavior:** normalized legal-spouse authority is carried through snapshot serialization for hypothetical reruns, and the existing refresh regression changes the recommendation when authority changes rather than reusing stale married-family capacity.
- **Cent/Build routing:** Findings B/C remain exact and FFH-028 does not alter Build or cent-allocation behavior outside the bounded HSA evaluator change.

## Finding E — LOW — retained non-blocking

`lib/calculations/hsa-test-fixtures.ts` still allows `withNormalizedHsaFacts()` to overwrite deliberately canonical fixture conditions: it forces HSA YTD tax year to the helper's requested year, rebuilds profiles, and generates twelve `confirmed` month rows from legacy account-level eligibility/coverage hints.

That can erase a partial-year, unknown, or stale-year condition if the helper is applied indiscriminately. However, the material FFH-012/025/028 adversarial regressions reviewed here construct the relevant canonical month/authority facts directly. The helper is therefore not materially authoritative for the evidence supporting Findings A-D. Finding E remains **LOW / NON-BLOCKING** and is not upgraded.

## CI-001 independent ownership review

Frozen target Foundation CI:

- run `34698898118`;
- job `103567059188`;
- exact head `51c3cd5978837b892f0323617b49986347c7d938`;
- AI control-plane validation: PASS;
- production dependency audit: PASS;
- calculation tests: PASS;
- security policy contract: PASS;
- Type Check: FAIL;
- lint: SKIPPED;
- build: SKIPPED.

Pre-FFH-028 baseline `e06bf586f6c43254eb64816cc7482f6b9212beda` Foundation CI run `34696917399`, job `103561861405`, has the same relevant gate identity: AI control-plane validation PASS, dependency audit PASS, calculations PASS, security contract PASS, Type Check FAIL, lint/build skipped.

The FFH-028 production diff changes only the HSA evaluator and its dedicated regression test, and the later production-to-frozen diff changes only control-plane/task/handoff documentation. The red Type Check gate therefore predates FFH-028 and is consistent with registered inherited CI-001; it is not assigned to FFH-012/FFH-028 merely because the frozen run is red.

**Evidence limitation:** the STANDARD_CHAT GitHub connector exposed run/job step outcomes but did not yield usable raw TypeScript compiler diagnostic lines for either job during this audit. Exact compiler-message/file parity between baseline and frozen target is therefore not independently asserted. This does not create contrary evidence of changed failure identity: step identity is unchanged, FFH-028's changed production surface is bounded, and calculations/security pass at both checkpoints. Lint/build are explicitly not claimed as passing because they were skipped behind the inherited Type Check failure.

## Final disposition

**PASS WITH NON-BLOCKING FINDINGS**

Findings A, B, C, and D are closed at the exact frozen target `51c3cd5978837b892f0323617b49986347c7d938`. FFH-028 closes the candidate-cardinality overstatement path by making materially ambiguous multi-candidate HSA outputs fail safe instead of silently exposing independent family limits, while retaining conservative locality and unrelated-route usability. The only retained technical finding is LOW Finding E, a non-authoritative test-fixture maintenance hazard.

CI-001 remains inherited known debt based on independently matched baseline/frozen gate identity and bounded FFH-028 changes, subject to the documented raw-diagnostic-text limitation above.

Manager alone owns FFH-012 acceptance and closure.