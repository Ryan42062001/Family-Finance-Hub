# FFH-013 — Frozen Dual-Audit Packet

AUDIT_PACKET_ID: `FFH-013-e811ef1f-2026-09-13`
PARENT_TASK: `FFH-013`
AUDIT_TARGET_SHA: `e811ef1f1f786196d909391262b19d71fe0f9a71`
MANAGER_ACCEPTANCE_RECORD: `.ai/tasks/FFH-013.md`
REQUIRED_AUDITS: `BOTH`
FROZEN_AT: `2026-09-13`

## Governing requirements
- `.ai/tasks/FFH-013.md`
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`
- FFH-D006
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`
- accepted FFH-015 SIMPLE behavior
- accepted FFH-012/FFH-028 HSA behavior

## Exact implementation evidence
- Remediation PR: `#23`
- M02 production/test candidate: `5e3f21cadcaeb4ad26c58448d8e5a6b76af45f63`
- Final worker/handoff head: `c298ac4bfe0d63f248c2a7ec993f0d8031c7377d`
- Integration SHA: `e811ef1f1f786196d909391262b19d71fe0f9a71`
- Candidate Foundation CI: run `34737929168`, job `103672520594` — PASS through AI-state validation, dependency audit, calculations, security, Type Check, lint, and build.
- Final-head Foundation CI: run `34738110144`, job `103673023089` — PASS through the same gates.
- `c298ac4b...` to `e811ef1f...` compare contains zero file changes; the merge commit freezes the exact fully-green tree.
- Known inherited CI debt: `NONE`; CI-001 remains closed.

## Changed production/test surface under PR #23
- `lib/calculations/ffh-013-m02-equal-compensation-excess.test.ts`
- `lib/calculations/ffh-013-spousal-ira-ledger.test.ts`
- `lib/calculations/money-priority-engine.ts`
- `lib/calculations/money-priority-hybrid-retirement-floor.test.ts`
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-retirement-floor.ts`

## Findings/remediations that must be independently verified

### FFH-013-A01 — annual tied routing shared-group cap
Annual equal-owner routing must cap tied demand to the common MFJ shared group before equal-fulfillment splitting. Required adversary: `$15,000` tied demand against `$10,000.01` shared room routes `$5,000.01 + $5,000.00`; stable identity may affect only the unavoidable cent.

### FFH-013-A02 — active scheduled/current-plan reservations
Active IRA schedules must consume the planning ledger exactly once, remain distinct from authoritative YTD, and prevent Existing Cash / Secure / Build / Windfall from reusing the same room.

### FFH-013-A03 — post-YTD shared materiality
Unequal compensation `$10,000/$5,000` with YTD `$8,000/$0` must not expose phantom second-spouse room. The shared feasible set must become material after YTD and the owner excess must surface.

### FFH-013-A04 — unequal-compensation owner/joint excess fail closed
Unequal compensation `$4,000/$2,000` with YTD `$5,000/$0` must fail the affected shared group closed at zero new room and warn without inventing correction mechanics.

### FFH-013-A05 — conditional maxima explanation
Household-facing output must make clear that spouse conditional maxima are non-additive and draw from one shared MFJ pool where the spousal shared feasible set applies.

### FFH-013-M01 — recurring cent reconciliation
Status before this audit: `CLOSED BY MANAGER AND PRIOR AUDITORS`; must remain independently verified.
Required boundary: shared annual room `$10,000.01`, owner conditional room `$7,500` each, Build authority `$833.33/month`, destinations `$416.67 + $416.66`, annual legal consumption `$9,999.96`, shared annual remainder `$0.05`.

### FFH-013-M02 — equal-compensation owner-only excess locality
Status before this audit: `CLOSED BY MANAGER VERIFICATION`; auditors must independently verify.
Required behavior for equal compensation `$10,000/$10,000`, under-50 owner limits `$7,500/$7,500`, YTD `$8,000/$0`:
- owner A additional room `$0` plus owner-local excess warning;
- owner B additional room `$7,500`;
- no `ira:mfj-compensation:*` shared group created solely from A's owner-only excess;
- reverse-owner case behaves symmetrically;
- person/account input reversal is materially invariant.
The unequal-compensation A04 shared fail-closed rule must remain unchanged.

## Required financial behavior
- scarce MFJ compensation is one shared legal constraint only where the accepted spousal-IRA rule applies;
- equal-compensation spouses receive no spousal enhancement and retain independent owner compensation ceilings;
- owner-conditional maxima are non-additive when a shared MFJ feasible set exists;
- actual Traditional + Roth IRA YTD consumes legal capacity once;
- scheduled/current-plan contributions are planning reservations rather than YTD facts;
- multiple accounts cannot multiply owner or household capacity;
- supported owner/joint excess fails closed only for the legally affected owner/shared feasible set;
- missing material compensation/YTD/account facts remain targeted information-needed;
- absence of a recorded spouse IRA does not prove zero spouse YTD when shared capacity can bind;
- Roth direct eligibility and Traditional IRA deductibility remain separate from compensation capacity;
- unrelated HSA, SIMPLE, and workplace-retirement behavior remains preserved.

## Financial reconciliation matrix
Applicability: `REQUIRED`
- Annual cents are authoritative for one-time/Windfall legal-capacity allocation.
- Monthly cents are authoritative for recurring Build destination reconciliation.
- Aggregate routed authority must equal the exact sum of concrete destinations.
- Owner and MFJ shared ledgers must include YTD, current-plan reservations, and new allocations exactly once.
- No epsilon/tolerance or hidden positive residual may substitute for exact reconciliation.
- Stable identity may determine only an unavoidable final cent.
- Required adversaries include A01 tied overload, A02 schedule reservation, A03 post-YTD materiality, A04 unequal excess, M01 `$10,000.01` recurring boundary, M02 equal-compensation owner-local excess, and person/account reorder.

## Technical & Mathematical Auditor questions
1. Are A01–A05, M01, and M02 all actually closed at the exact frozen SHA?
2. Is shared MFJ compensation mathematically conserved only where the accepted shared feasible set applies?
3. Are equal-compensation owner ceilings independent and owner-local under excess?
4. Are YTD, scheduled reservations, and new allocations distinct and consumed exactly once?
5. Do Existing Cash, Secure/retirement-floor, Build, and Windfall share the correct owner/shared ledger without double spending?
6. Does the exact frozen target satisfy the Financial Engine Reconciliation Gate, including exact cent/order invariance?
7. Are multiple-account, missing-fact, exact-exhaustion, owner/joint excess, and reorder boundaries sufficiently tested?
8. Are Roth eligibility, Traditional deductibility, SIMPLE, HSA, and workplace-retirement behavior preserved?

## Financial Policy & Scenario Auditor questions
1. Does the frozen behavior faithfully implement FFH-009/FFH-D006 without inventing statutory spouse priority?
2. Are shared conditional maxima clearly non-additive where a spousal shared feasible set exists?
3. Does equal compensation avoid inventing a lower-compensation spouse or shared group?
4. Does M02 preserve the unaffected equal-compensation spouse's independent legal room while warning/clamping only the excess owner?
5. Do unequal-compensation supported-excess cases remain appropriately fail closed for the affected shared group?
6. Are missing spouse compensation/YTD/account facts treated conservatively and locally?
7. Are Roth direct eligibility and Traditional deductibility still separate policy questions?
8. Are unrelated household retirement/HSA/SIMPLE recommendations preserved?

## Auditor independence rules
- Audit only `e811ef1f1f786196d909391262b19d71fe0f9a71`.
- Use this packet and authoritative repository evidence; do not rely on the other new auditor's verdict.
- Green CI is evidence, not proof.
- Findings: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- Final verdict exactly: `PASS`, `PASS WITH NON-BLOCKING FINDINGS`, or `FAIL — REMEDIATION REQUIRED`.

## Manager disposition after audits
FFH-013 closes only if both required fresh audits clear this exact frozen target with no blocking finding. FFH-017 remains queued until Manager reconciles both verdicts.