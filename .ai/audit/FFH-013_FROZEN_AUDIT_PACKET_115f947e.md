# FFH-013 — Frozen Dual-Audit Packet

AUDIT_PACKET_ID: `FFH-013-115f947e-2026-09-14`
PARENT_TASK: `FFH-013`
AUDIT_TARGET_SHA: `115f947e28cfae831a550f239c58dd0b59ca5798`
MANAGER_ACCEPTANCE_RECORD: `.ai/tasks/FFH-013.md`
REQUIRED_AUDITS: `BOTH`
FROZEN_AT: `2026-09-14`

## Governing requirements
- `.ai/tasks/FFH-013.md`
- `.ai/policy/retirement/FFH-009_SPOUSAL_IRA_LEGAL_CAPACITY_POLICY.md`
- FFH-D006
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`
- accepted FFH-015 SIMPLE behavior
- accepted FFH-012/FFH-028 HSA behavior

## Exact implementation evidence
- Final remediation PR: `#24`
- Production/test candidate: `0a4d46eda86d1a95c566ccd5a4315b0838b10bb1`
- Candidate Foundation CI: run `34882801756`, job `104105952541` — SUCCESS through AI-state validation, dependency audit, calculations, security, Type Check, lint, and build.
- Final worker/handoff head: `23c1caa75cd4d66021161f0b540e2b00ec12e074`
- Final-head Foundation CI: run `34883153453`, job `104107126587` — SUCCESS through the same gates.
- Integration SHA / exact frozen behavior target: `115f947e28cfae831a550f239c58dd0b59ca5798`
- `23c1caa75cd4d66021161f0b540e2b00ec12e074..115f947e28cfae831a550f239c58dd0b59ca5798` contains zero file changes; the merge freezes the exact fully-green tree.
- Known inherited CI debt: `NONE`; CI-001 remains closed.

## Final remediation surface under PR #24
- `lib/calculations/ffh-013-final-audit-remediation.test.ts`
- `lib/calculations/money-priority-contribution-period.ts`
- `lib/calculations/money-priority-contribution-period.test.ts`
- `lib/calculations/money-priority-engine.ts`
- `lib/calculations/money-priority-hybrid-retirement-floor.test.ts`
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-floor.ts`

## Manager acceptance findings

### FFH-013-T1 — non-scarce unequal-compensation owner-only excess locality
Manager verification status before audit: `CLOSED PENDING INDEPENDENT AUDIT`.

Required adversary:
- compensation `$100,000/$50,000`;
- owner IRA YTD `$8,000/$0`;
- individual IRA limits `$7,500/$7,500`;
- required additional room `$0/$7,500`;
- owner-local excess warning only;
- no zero `ira:mfj-compensation:*` group may suppress the unaffected spouse.

Reverse-owner, person-order, and account-order variants must be materially invariant. Scarce unequal-compensation A03/A04 behavior must remain unchanged.

### FFH-013-P03 — authoritative active-schedule time horizon
Manager verification status before audit: `CLOSED PENDING INDEPENDENT AUDIT`.

One neutral calendar authority now exists:
- `lib/calculations/money-priority-contribution-period.ts`
- `remainingContributionMonths(asOfDate, taxYear)`

Both `money-priority-retirement-accounts.ts` and `money-priority-retirement-floor.ts` import this same helper; no local duplicate remains.

Required September adversary:
- compensation `$10,000/$0`;
- IRA YTD `$7,000/$0`;
- active IRA schedule `$500/month`;
- `asOfDate = 2026-09-01`;
- four remaining contribution months including September;
- future pace `$2,000`, but owner legal room only `$500`;
- reserve exactly `$500` as scheduled planning capacity;
- shared room falls from `$3,000` to `$2,500` before new recommendations;
- YTD remains factual and separate from scheduled reservation.

Required December adversary: `$500/month` at `2026-12-01` reserves one month / `$500`, not a 12-month amount.

The shared helper must retain these exact semantics:
- absent date => `12`;
- invalid date => `12`;
- tax-year mismatch => `12`;
- January => `12`;
- September => `4`;
- December => `1`.

## Previously cleared behavior that must remain independently verified

### FFH-013-A01 — annual tied routing shared-group cap
`$15,000` tied demand against `$10,000.01` shared room must route `$5,000.01 + $5,000.00`; stable identity may affect only the unavoidable cent.

### FFH-013-A02 — scheduled/current-plan reservations
Active IRA schedules are planning reservations, not YTD, and must consume owner/shared planning capacity exactly once before Existing Cash / Secure / Build / Windfall.

### FFH-013-A03 — post-YTD shared materiality
Unequal compensation `$10,000/$5,000` with YTD `$8,000/$0` must not expose phantom spouse capacity.

### FFH-013-A04 — scarce unequal owner/joint excess fail closed
Unequal compensation `$4,000/$2,000` with YTD `$5,000/$0` must fail the affected shared group closed at zero new room and warn without inventing correction mechanics.

### FFH-013-A05 — conditional maxima explanation
Household-facing owner maxima must remain explicitly conditional/non-additive when one MFJ shared feasible set applies.

### FFH-013-M01 — recurring exact-cent reconciliation
Status before audit: `CLOSED BY MANAGER AND PRIOR AUDITORS`; must remain independently verified.
Required boundary: shared annual room `$10,000.01`, owner conditional room `$7,500` each, Build authority `$833.33/month`, destinations `$416.67 + $416.66`, annual legal consumption `$9,999.96`, shared annual remainder `$0.05`.

### FFH-013-M02 — equal-compensation owner-only excess locality
Status before audit: `CLOSED BY MANAGER AND PRIOR AUDITORS`; must remain independently verified.
Equal compensation `$10,000/$10,000`, YTD `$8,000/$0` must yield owner A `$0`, owner B `$7,500`, owner-local warning, and no MFJ shared group solely from A's owner-only excess.

## Required financial behavior
- scarce MFJ compensation is a shared legal constraint only when the accepted spousal-IRA feasible set actually binds;
- non-scarce owner-only excess stays owner-local;
- equal-compensation spouses receive no invented lower-spouse/shared enhancement;
- actual Traditional + Roth IRA YTD consumes legal capacity once;
- scheduled/current-plan contributions remain separate planning reservations;
- remaining-period scheduling uses one authoritative calendar helper;
- multiple IRA accounts cannot multiply owner or household room;
- Existing Cash, Secure, Build, and Windfall share the same post-reservation capacity without double spending;
- Roth direct eligibility and Traditional IRA deductibility remain separate;
- unrelated HSA, SIMPLE, and workplace-retirement behavior remains preserved.

## Financial reconciliation matrix
Applicability: `REQUIRED`.
- Annual cents are authoritative for one-time/Windfall legal-capacity allocation.
- Monthly cents are authoritative for recurring Build reconciliation.
- Aggregate routed authority must equal exact concrete destination sum.
- YTD, scheduled reservations, and new allocations are consumed exactly once.
- No epsilon/tolerance or hidden positive residual may substitute for exact reconciliation.
- Stable identity may determine only an unavoidable final cent.

## Technical & Mathematical Auditor questions
1. Are T1 and P03 actually closed at this exact SHA?
2. Are A01–A05, M01, and M02 still closed?
3. Is the MFJ shared group created only when mathematically/legal material, including non-scarce unequal-compensation cases?
4. Are YTD, active schedules, and new allocations distinct and conserved exactly once across all consumers?
5. Do both remaining-period consumers use one authoritative helper with the pinned fallback/inclusive-month semantics?
6. Does the target satisfy the reconciliation gate, including cent-exact and order-invariant boundaries?
7. Are multiple-account, missing-fact, exact-exhaustion, owner/joint-excess, and staged-consumer boundaries sufficiently tested?
8. Are Roth, Traditional deductibility, SIMPLE, HSA, and workplace behavior preserved?

## Financial Policy & Scenario Auditor questions
1. Does T1 preserve independent valid spouse room when joint compensation cannot bind?
2. Does P03 treat active monthly contributions as future planning reservations over the supported remaining current-year period rather than an invented annual target?
3. Are schedule reservations still distinct from actual YTD?
4. Are scarce unequal-compensation A03/A04 rules preserved without overextending them to non-scarce households?
5. Are conditional maxima still non-additive only where the shared feasible set applies?
6. Does equal compensation remain owner-local under excess?
7. Are Roth direct eligibility and Traditional deductibility still separate policy questions?
8. Are unrelated household HSA/SIMPLE/workplace recommendations preserved?

## Auditor independence rules
- Audit only `115f947e28cfae831a550f239c58dd0b59ca5798`.
- Do not treat later Manager control-plane commits as implementation.
- Do not rely on the other new auditor's verdict.
- Green CI is evidence, not proof.
- Findings: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- Final verdict exactly: `PASS`, `PASS WITH NON-BLOCKING FINDINGS`, or `FAIL — REMEDIATION REQUIRED`.

## Manager disposition after audits
FFH-013 closes only if both required fresh independent audits clear this exact frozen target with no blocking finding. FFH-017 remains queued until Manager reconciles both verdicts.