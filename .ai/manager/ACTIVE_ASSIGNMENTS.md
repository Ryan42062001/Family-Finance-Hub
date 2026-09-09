# Family Finance Hub — Active Assignments

Last refreshed: 2026-09-08

# FFH-PW-003 — Retirement-capacity remediation and HSA integration

Status: ACTIVE

## Completed in current wave

### FFH-009 — Define spousal-IRA scarce-compensation legal-capacity semantics
Assigned employee: Retirement & Tax-Advantaged Policy Analyst
Status: COMPLETE — MANAGER SYNTHESIZED

Result: FFH-D006 approved. Owner conditional maxima plus one shared MFJ compensation ledger; no fixed owner-ID statutory split; missing manually entered IRA account is not proof of $0 spouse YTD.

### FFH-010 — Implement FFH-D005 HSA persistence and normalized input contract
Assigned employee: Application, Data & Integration Engineer
Status: COMPLETE — MANAGER ACCEPTED

Accepted production checkpoint: `8f39e7d6e638711a80300786869a407113d3d0c4`.
Current role handoff checkpoint: `64ccac6e2901946a31bba2e0758ec9d33cce8218` (documentation-only child of validated production checkpoint).
Exact Foundation CI #300 / run `34306364189`: SUCCESS on `8f39e7d6e638711a80300786869a407113d3d0c4`.
Verified successful CI stages: dependency install, production dependency audit, calculation tests, security policy-contract tests, typecheck, lint, build.

Acceptance boundary: repository migration/source contract accepted; live linked Supabase application, PostgREST/RLS role behavior, and browser end-to-end parity remain unverified and must be resolved before merge-ready status.

# Active specialist work

## FFH-011 — Define/remediate R1 SIMPLE persisted-field contract

Assigned employee: Application, Data & Integration Engineer
Department: Engineering
Status: ACTIVE
Dependency classification: INDEPENDENT of FFH-012 after FFH-010 acceptance
Target branch: `phase-5-money-priority-engine`

Objective:
Resolve what `simple_higher_limit_eligible` / `simpleHigherLimitEligible` safely means prospectively and for legacy data so the Core Engine can later consume the field without silently applying the verified higher SIMPLE statutory limit to an ambiguous category.

Required work:
- refresh canonical state and current branch before editing;
- inspect current schema, migration history, UI/actions, snapshot loader/normalizer, and every current use of the persisted field;
- determine whether the existing field can be explicitly bound to the verified statutory certain-applicable-SIMPLE category or whether rename/new field/reconfirmation is required;
- preserve unknown/legacy safety: ambiguous historical values must not automatically become affirmative statutory evidence;
- preserve user-editable/correctable semantics and tax-year/version context where materially required;
- add or modify persistence/application tests needed to prove the chosen contract;
- do not change the Core SIMPLE statutory formula in FFH-011;
- do not implement FFH-012 HSA legal-capacity math, FFH-013 IRA behavior, or Phase 5C;
- distinguish repository migration/source changes from actual linked Supabase deployment/runtime parity;
- run/observe required validation on the exact final production checkpoint and persist a current role handoff.

Acceptance criteria:
- persisted field semantics are explicit and non-ambiguous for prospective use;
- legacy data has intentional safe behavior;
- no unsupported statutory inference is introduced;
- runtime/snapshot naming and semantics match persistence;
- exact production checkpoint and validation evidence are recorded;
- any required Core follow-up is precisely specified, not implemented here.

## FFH-012 — Implement FFH-D005 HSA legal-capacity calculation

Assigned employee: Core Financial Engine Engineer
Department: Engineering
Status: ACTIVE
Dependency classification: FFH-010 SATISFIED; independent of FFH-011 for current implementation scope
Target branch: `phase-5-money-priority-engine`

Objective:
Implement the Manager-approved FFH-D005 HSA legal-capacity policy against the accepted FFH-010 normalized input contract.

Required work:
- refresh canonical state, FFH-D005, FFH-007 policy artifact, FFH-010 handoff, and current Core retirement-capacity implementation;
- use normalized person/tax-year/month HSA facts and tax-year-bound owner YTD amounts as authoritative inputs;
- implement month-sensitive legal capacity and explicit unknown-safe behavior;
- handle Medicare timing/retroactivity using only persisted approved inputs;
- treat last-month-rule eligibility/testing-period facts explicitly and conditionally; do not invent missing facts;
- implement married ordinary HSA equal allocation by policy default and explicit alternate allocation when valid;
- keep age-55 catch-up owner-specific;
- enforce R4 owner/account/couple ceilings and prevent multiple accounts from multiplying capacity;
- propagate targeted uncertainty instead of optimistic room when decision-relevant facts are unknown;
- maintain one-time/Secure/Build/Windfall/Your Plan ledger/routing invariants and deterministic behavior;
- add adversarial tests for tax-year isolation, spouse/account permutations, month transitions, Medicare timing, alternate allocation, catch-up, YTD, unknown states, and order invariance;
- do not modify FFH-011/R1 SIMPLE semantics, FFH-013/R6, or Phase 5C;
- run/observe required validation on the exact final production checkpoint and persist a current role handoff.

Acceptance criteria:
- Core uses the accepted FFH-010 normalized contract and never legacy HSA hint fields as annual legal authority;
- no legal dollars are fabricated when facts are incomplete;
- shared and owner-specific HSA room cannot be double counted across consumers/accounts;
- downstream retirement allocation behavior remains deterministic and reconciled;
- exact production checkpoint and test/CI evidence are recorded.

# Queued work

## FFH-013 — Implement FFH-D006 spousal-IRA shared compensation ledger
Assigned employee: Core Financial Engine Engineer
Status: QUEUED AFTER FFH-012 unless Manager explicitly reorders

Reason: FFH-012 and FFH-013 touch overlapping Core retirement-capacity surfaces and should remain serialized.

## Narrow R1 Core remediation
Assigned employee: Core Financial Engine Engineer
Status: FUTURE / BLOCKED ON FFH-011

## FFH-010 live Supabase migration/runtime parity verification
Assigned employee: Application, Data & Integration Engineer
Status: REQUIRED BEFORE MERGE-READY / exact task sequencing to be set by Manager after FFH-011 or sooner if collision-free

## Phase 5C Core implementation
Assigned employee: Core Financial Engine Engineer
Status: POLICY APPROVED / NOT YET AUTHORIZED

# Current role status

Manager / Architect — ACTIVE on FFH-PW-003 orchestration
Application, Data & Integration Engineer — ACTIVE on FFH-011
Core Financial Engine Engineer — ACTIVE on FFH-012
Retirement & Tax-Advantaged Policy Analyst — IDLE
Debt & Liquidity Policy Analyst — IDLE
Goals, Cash Flow & Allocation Policy Analyst — IDLE
Regulatory & Financial Research Analyst — IDLE unless a new unresolved external fact appears
Product & Technical R&D Engineer — IDLE
Technical & Mathematical Auditor — IDLE pending stable integrated checkpoint
Financial Policy & Scenario Auditor — IDLE pending stable integrated checkpoint

# Manager sequencing rules

- FFH-010 is accepted for repository source/data-contract purposes; do not reopen it absent new evidence.
- FFH-011 and FFH-012 are now authorized in parallel.
- Manager must independently inspect each completion handoff and exact checkpoint before acceptance.
- After FFH-012 acceptance, FFH-013 may start if no new blocking conflict appears.
- After FFH-011 acceptance, authorize any required narrow Core R1 remediation only when collision-safe with current Core work.
- Live FFH-010 Supabase migration/runtime parity must be verified before Phase 5 can become merge-ready.
- Phase 5C production implementation remains gated until retirement-capacity blockers are stable.
- Auditors remain idle until there is a stable integrated checkpoint worth auditing.
