# FFH-012 — Frozen Dual Re-Audit Packet — Post-FFH-028

AUDIT_PACKET_ID: `FFH-012-51c3cd59-2026-09-12`
PARENT_TASK: `FFH-012`
AUDIT_TARGET_SHA: `51c3cd5978837b892f0323617b49986347c7d938`
MANAGER_ACCEPTANCE_RECORD: `.ai/tasks/FFH-028.md` — Manager acceptance 2026-09-12
REQUIRED_AUDITS: `BOTH`
FROZEN_AT: `2026-09-12`

## Frozen-target rule

Both auditors must independently audit exact integrated target `51c3cd5978837b892f0323617b49986347c7d938`.

Later Manager task/index/audit bookkeeping commits do not redefine the financial-behavior target. Auditors may read later control-plane documentation for routing/context, but must not silently change the implementation SHA under audit.

## Why this re-audit exists

The preceding frozen target `ffde8440a4e671ab91ea02c35df8a73e1a3da18e` received:
- Financial Policy & Scenario: `PASS WITH NON-BLOCKING FINDINGS`;
- Technical & Mathematical: `FAIL — REMEDIATION REQUIRED` because of new HIGH Finding D.

At that prior target, both auditors independently considered Findings A, B, and C CLOSED. Technical Finding D showed that three or more active nondependent `self` / `spouse_partner` candidates could erase candidate-pair identity, ignore a valid pair/year authority row, and expose `$17,500` of independent family HSA capacity instead of one lawful `$8,750` shared ordinary family pool.

Manager independently verified that the state was persistence/input reachable and routed FFH-028.

## FFH-028 accepted remediation evidence

- Task: `.ai/tasks/FFH-028.md`
- PR: #17
- Approved base: `e06bf586f6c43254eb64816cc7482f6b9212beda`
- PRODUCTION_SHA: `f266c112abff752e268c48dd097d7d562ac58169`
- Validation-only tree-identical SHA: `d13c412851c8a35d1d7cc4a85054d3dcf8bae94f`
- HANDOFF_SHA: `955b6859ad7597aec1e94daee38170eb5fbe13c4`
- INTEGRATION_SHA / AUDIT_TARGET_SHA: `51c3cd5978837b892f0323617b49986347c7d938`
- Foundation CI: run `34698588257`, job `103566232253`
- CI gates: AI state PASS; install/dependency audit PASS; calculations PASS 818/818; security PASS 21/21; Type Check FAIL on separately tracked inherited `CI-001`; lint/build skipped by fail-fast.

Exact production/test change surface for FFH-028:
- `lib/calculations/money-priority-hsa-legal-capacity.ts`
- `lib/calculations/ffh-028-hsa-candidate-pair-cardinality.test.ts`

No migration, live Supabase write, financial-policy rewrite, FFH-020 work, CI workflow change, or CI-001 repair is part of FFH-028.

## Accepted FFH-028 behavior to verify independently

For candidate cardinality above two, the evaluator retains ambiguous candidate identities in the HSA fact map. For each HSA owner among those candidates, it compares the owner against every other candidate using the accepted month-level materiality predicate. If both could be HSA-eligible and family coverage is known or remains possible, pair identity is material and the affected HSA output becomes targeted `more_information_needed` rather than falling back to an independent family limit.

The correction intentionally does not infer legal pair identity from relationship labels, filing status, married allocation rows, account ownership, input order, prior-year facts, or the existence of one authority row in a still-ambiguous candidate set.

## Findings both auditors must disposition

### Finding A — compound unknown legal-spouse-authority materiality
Prior status at `ffde8440...`: CLOSED by both fresh auditors.

Required retained behavior: missing/unknown authority blocks only HSA outputs whose supported legal-capacity result can materially change under spouse/non-spouse resolution. Fully known all-self-only and known-ineligible locality remains actionable where spouse status cannot change the supported result. Unrelated IRA/workplace opportunities remain usable.

### Finding B — odd-cent shared ordinary-capacity conservation
Prior status: CLOSED.

Required retained case:
`$5,104.17 = $2,552.08 + $2,552.09`.

### Finding C — Build/account reconciliation
Prior status: CLOSED.

Required retained case:
`$8,750 = $4,375 + $4,375`, with monthly destination routes `$364.58 + $364.58 = $729.16` and no positive reconciliation residue escaping routing.

### Finding D — candidate-pair cardinality bypass
Prior status: HIGH / OPEN / BLOCKING.

Required post-FFH-028 behavior:
1. A=`self`, B=`spouse_partner`, C=`spouse_partner`, all active/nondependent; A/B full-year eligible family coverage; C may own no HSA; explicit current-year A/B legal-spouse authority exists. The result must not expose two independent `$8,750` family limits. Materially affected HSA outputs must remain legally safe when the candidate set is still ambiguous.
2. The same materially ambiguous three-candidate household without affirmative resolving authority must not silently expose independent family limits.
3. Three fully known all-self-only candidates must preserve spouse-independent locality where pair identity cannot change the supported amount.
4. Unrelated Traditional IRA / workplace-plan opportunities must remain usable when only HSA pair identity is unresolved.
5. Equivalent candidate/person/account/profile/month/authority reorderings must not change the legal outcome.
6. No new mechanism may infer marriage or authoritative pair identity from non-authoritative facts.

Both auditors must independently determine whether Finding D is CLOSED at the new frozen target.

## Retained non-blocking observations to reassess

- Technical LOW Finding E: transitional `withNormalizedHsaFacts()` can overwrite deliberately canonical uncertainty if reused indiscriminately.
- Policy LOW: confirmed-spouse `coverage=none` locality may be over-conservative.
- Policy LOW: copied married-ledger component `remaining` metadata may become stale.

These were non-blocking at the prior target but must be upgraded if new evidence shows authoritative financial impact.

## Required independent questions

Each auditor must answer within their domain:
1. Does FFH-028 close the reachable three-or-more-candidate overstatement path without manufacturing pair identity?
2. Is the explicit A/B authority + third-candidate scenario legally safe?
3. Is the no-authority multi-candidate scenario safely targeted to HSA only?
4. Do all-self-only and known-ineligible locality cases remain appropriately actionable?
5. Are unrelated IRA/workplace recommendations still usable?
6. Are Findings A, B, and C preserved exactly?
7. Do confirmed two-candidate spouses/non-spouses/unknown-authority cases still behave under FFH-022?
8. Is there any inference from `spouse_partner`, filing status, allocations, account ownership, ordering, or prior-year state?
9. Are target-year authority, YTD, Medicare, catch-up, partial-year, multi-account, refresh/hypothetical, and deterministic-order semantics preserved?
10. Does Build/account routing still reconcile exactly at cent boundaries?
11. Are tests sufficient to establish the verdict rather than merely matching one happy-path implementation?
12. Does `CI-001` remain inherited, or did FFH-028 create any new failure identity?
13. Are any LOW observations now materially worse or closure-blocking?

## CI ownership

Known inherited debt: `CI-001` in `.ai/manager/KNOWN_CI_DEBT.md`.

Do not assign `CI-001` to FFH-012/FFH-028 merely because exact candidate CI is red after owned calculation/security gates pass. Conversely, do not use the registry to excuse any new or changed failure identity.

## Auditor independence rules

- Use two fresh independent Auditor/QA chats.
- Both auditors receive this same packet and exact target.
- Neither auditor may read or rely on the other auditor's new verdict before submitting its own.
- Do not modify production behavior during audit.
- Do not silently switch target SHA.
- Findings must be classified `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.
- Final verdict must be exactly one of:
  - `PASS`
  - `PASS WITH NON-BLOCKING FINDINGS`
  - `FAIL — REMEDIATION REQUIRED`

## Closure gate

FFH-012 may close only if both independent audits return a passing verdict on exact target `51c3cd5978837b892f0323617b49986347c7d938` with no unresolved blocking finding. Manager alone owns final closure and subsequent milestone sequencing.