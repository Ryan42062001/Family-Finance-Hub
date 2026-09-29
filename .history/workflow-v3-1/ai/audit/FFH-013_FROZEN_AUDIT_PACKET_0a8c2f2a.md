# FFH-013 — Frozen Dual-Audit Packet

AUDIT_PACKET_ID: `FFH-013-0a8c2f2a-2026-09-13`
PARENT_TASK: `FFH-013`
AUDIT_TARGET_SHA: `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`
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
- PR: `#21`
- Production candidate: `3a78bb9bb046daff4f63e0bfa6b80e76af5bc457`
- Worker handoff: `234b900706d34c4b1bb5fdafb8c8a889d73b1414`
- Integration SHA: `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`
- Exact candidate Foundation CI: run `34732621610`, job `103658103064` — PASS through AI state, dependency audit, calculations, security, Type Check, lint, and build
- Integration after the production candidate adds only worker evidence/control-plane synchronization plus the Manager workflow/control-plane changes already present on the milestone; no later FFH-013 production-code change occurred before merge.
- Known inherited CI debt: `NONE`; CI-001 remains closed.

## Changed production/test surface
- `lib/calculations/money-priority-retirement-accounts.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-build.ts`
- `lib/calculations/money-priority-existing-cash.ts`
- `lib/calculations/money-priority-windfall.ts`
- `lib/calculations/ffh-013-spousal-ira-ledger.test.ts`
- `lib/calculations/money-priority-advanced-retirement.test.ts`
- `lib/calculations/phase-5-closure-spousal-ira.test.ts`

## Required financial behavior
- scarce MFJ compensation is one shared legal constraint, not a fixed owner-ID allocation;
- owner-conditional maxima are non-additive;
- actual Traditional + Roth IRA YTD consumes capacity once;
- planned/scheduled amounts remain planning reservations rather than YTD facts;
- multiple accounts cannot multiply owner or household capacity;
- higher-compensation spouse keeps the applicable owner compensation ceiling;
- lower-compensation spouse receives only supported spousal-IRA capacity;
- missing material compensation/YTD/account facts remain targeted information-needed;
- absence of a recorded spouse IRA does not prove zero spouse YTD when shared capacity can bind;
- supported excess creates zero new room plus warning, without invented correction mechanics;
- Roth direct eligibility and Traditional IRA deductibility remain separate from the compensation ledger;
- equal financial ties use equal fulfillment, with stable identity only for unavoidable final-cent assignment;
- unrelated HSA, SIMPLE, and workplace-retirement behavior is preserved.

## Financial reconciliation matrix
Applicability: `REQUIRED`
- Authoritative recurring routing unit: monthly cents for Build recurring destination reconciliation; annual cents remain authoritative for legal-capacity consumption.
- Aggregate-to-destination equality: Build retirement monthly allocation must equal the exact sum of concrete retirement-account monthly allocations.
- Shared/grouped conservation: owner/account consumption may not exceed owner or MFJ shared annual ledger room.
- Planner/prepass vs actual router: both tied-spouse Build paths must use the same recurring monthly-cent reconciliation helper.
- No epsilon/tolerance or positive-residual clamp may substitute for exact equality.
- Required adversarial boundary: shared pool `$10,000.01`, owner conditional room `$7,500` each, monthly authority `$833.33`, destination routes `$416.67 + $416.66`, annual legal consumption `$9,999.96`, shared annual remainder `$0.05`.
- Account/person order reversal must not change material outcomes; stable identity may determine only the unavoidable odd cent.

## Prior finding
FFH-013-M01 — HIGH recurring equal-fulfillment cent reconciliation.
Manager disposition before audit: `CLOSED BY MANAGER VERIFICATION`.
Auditors must independently determine whether it is truly closed at the frozen target.

## Technical & Mathematical Auditor questions
1. Is the shared MFJ compensation feasible-set/ledger implementation mathematically correct and owner-neutral?
2. Are owner and household groups conserved across multiple accounts and consumers?
3. Are actual YTD, planned reservations, and new allocations semantically and mathematically distinct?
4. Does the exact frozen target satisfy the Financial Engine Reconciliation Gate, including FFH-013-M01?
5. Do Build, Existing Cash, and Windfall consume the same legal capacity without double spending?
6. Are odd-cent, ordering, exact-exhaustion, excess, missing-fact, and multi-account boundaries sufficiently tested?
7. Are Roth eligibility and Traditional deductibility preserved technically?
8. Did FFH-013 create any regression in accepted SIMPLE, HSA, or workplace-retirement behavior?

## Financial Policy & Scenario Auditor questions
1. Does the frozen behavior faithfully implement the accepted FFH-009/FFH-D006 spousal-IRA policy without inventing statutory spouse priority?
2. Can any household scenario present the two conditional maxima as additive independent capacity?
3. Are missing spouse compensation/YTD/account facts treated conservatively and locally?
4. Are supported excess cases non-optimistic and free of invented correction advice?
5. Are Roth eligibility and Traditional deductibility still separate policy questions?
6. Do concrete routed household outcomes stay within accepted per-owner and shared compensation constraints?
7. Are unrelated household retirement/HSA/SIMPLE recommendations preserved?

## Auditor independence rules
- Audit only `0a8c2f2aff85d5745c28e30ccfde23b89750fab7`.
- Do not read or rely on the other new auditor verdict.
- Green CI is evidence, not proof.
- Findings: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- Final verdict exactly: `PASS`, `PASS WITH NON-BLOCKING FINDINGS`, or `FAIL — REMEDIATION REQUIRED`.

## Manager disposition after audits
FFH-013 closes only if both required audits clear the exact frozen target with no blocking finding. FFH-017 stays queued until then.