# Family Finance Hub — Project State

Last refreshed: 2026-09-08

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`

Default/canonical branch: `main`

Verified `main` SHA: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`

Active development branch: `phase-5-money-priority-engine`

Verified AI-workflow bootstrap commit: `840c0b2e43ddd914f34b4ee29a7d3edff2b18dfe`

Pre-bootstrap Phase 5 code/test checkpoint: `e979ff19f09fdd07a954347150608a87122f5183`

Open PR:
- PR #5 — `Phase 5: Money Priority Engine`
- base: `main`
- head: `phase-5-money-priority-engine`
- state: OPEN
- merged: false
- mergeable: true when re-read after the AI workflow bootstrap

Latest verified branch comparison after bootstrap:
- Phase 5 branch: 181 commits ahead of `main`
- Phase 5 branch: 1 commit behind `main`
- status: diverged
- merge base: `70fb1c9a8808256f24c14d059aa4959dc49cec62`
- current `main`-only commit: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e` (`Refresh Family Finance Hub milestone status`), a README milestone-status update

PR mergeability being true does not make the branch fresh or satisfy the Family Finance Hub merge gate. FFH-002 still owns freshness reconciliation and exact-checkpoint verification.

## Stable product state on main

`main` contains the completed foundation, household financial profile, dashboard, and Phase 4 planning tools.

Verified stable capabilities include:
- Next.js + TypeScript application foundation
- Supabase authentication and household-scoped tenancy/RLS
- household financial profile
- dashboard financial summaries
- paycheck planning
- emergency-fund planning
- debt payoff planning
- mortgage extra-payment planning
- savings-goal projections
- retirement contribution pacing
- automated calculation/security/type/lint/build verification through Foundation CI

Classification: IMPLEMENTED AND VERIFIED on stable `main` to the extent supported by merged repository history and CI evidence.

## Active Phase 5 product state

Phase 5 is not merged to `main`.

The Phase 5 branch contains repository evidence for:
- Stabilize / Secure / Build / Optimize priority flow
- existing-cash deployment and residual-needs reconciliation
- committed-expense handling
- employer-match and debt prioritization
- student-loan policy handling
- ordinary and exceptional emergency reserves
- goal ranking and two-pass Build behavior
- retirement projection, account routing, and legal-capacity ledgers
- HSA household/couple capacity handling and uncertainty propagation
- Recommended Plan versus Your Plan
- Windfall Mode
- Home and Vehicle affordability through authoritative hypothetical reruns
- Recommendation Refresh / material-profile-change logic
- strict snapshot numeric/boolean validation
- Phase 5A Hybrid Retirement Floor
- Phase 5B Goal Intelligence

Classification: IMPLEMENTED BUT NOT FULLY VERIFIED as a merge-ready milestone. The pre-bootstrap code/test checkpoint has successful CI, but the branch remains behind `main` and Phase 5A/5B have not yet received the final independent dual-audit gate required by the canonical workflow.

## Phase 5A

Repository documentation and tests cover a Hybrid Retirement Floor separating legal contribution capacity from protected planning-policy retirement saving.

Classification: IMPLEMENTED BUT NOT YET CANONICALLY ACCEPTED FOR MERGE under the new workflow.

## Phase 5B

Repository documentation and tests cover Goal Intelligence as derived deterministic evidence. It does not itself alter Build allocation economics.

Repository documentation explicitly states Phase 5C will consume Goal Intelligence evidence when actual allocation competition is introduced.

Classification: IMPLEMENTED BUT NOT YET CANONICALLY ACCEPTED FOR MERGE under the new workflow.

## Phase 5C and later refinement

Conversation history indicates Phase 5C–5G policy/design work was discussed outside the repository. That discussion is useful context but is not repository-verified canonical state.

Until current specialist analysis is persisted and approved by Manager:
- Phase 5C+ refinements are PROPOSED / NOT APPROVED for production implementation.
- Engineering must not invent or implement those policies from chat memory.

## Validation state

The Phase 5 branch package scripts define:
- `npm test`
- `npm run test:security`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run verify` combining those checks

Foundation CI also runs `npm audit --omit=dev --audit-level=high` before calculation/security/type/lint/build gates.

Verified GitHub Actions evidence:
- Foundation CI run #240 on `e979ff19f09fdd07a954347150608a87122f5183`
- conclusion: SUCCESS

No Foundation CI run was observed yet for the documentation-only AI workflow bootstrap when this state was refreshed. Do not claim one until observed.

## Architecture summary

Financial calculation architecture:
- pure TypeScript calculation modules under `lib/calculations/`
- deterministic Money Priority submodules and tests
- explicit normalized household snapshot boundary
- derived retirement-capacity ledger
- separate one-time and recurring allocation concepts
- hypothetical rerun modules for Home/Vehicle scenarios

Persistence/application architecture:
- Next.js application
- Supabase persistence
- household-scoped RLS
- migrations under `supabase/migrations/`
- snapshot/persistence support under `lib/supabase/`

Test architecture:
- Node built-in test runner with TypeScript strip-types for calculation tests
- dedicated security contract tests
- TypeScript typecheck
- ESLint
- production Next.js build
- GitHub Actions Foundation CI

## Known important boundaries / deferred areas

Repository documentation explicitly defers or conservatively handles advanced retirement cases when required facts are not persisted, including special 403(b) service catch-up and governmental 457(b) last-three-years catch-up behavior.

Person-level HSA eligibility/coverage independently of represented HSA account records remains future scope.

Do not silently upgrade these boundaries into implemented behavior.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine

Milestone status: ACTIVE / NOT MERGE READY

Active parallel wave: `FFH-PW-001`

Primary immediate needs:
1. reconcile Phase 5 branch freshness with current `main` (FFH-002);
2. independently define Goals-side Phase 5C policy (FFH-003);
3. independently define Retirement-side Phase 5C constraints (FFH-004);
4. verify current 2026 statutory retirement/HSA facts (FFH-005);
5. Manager synthesizes policy before any Phase 5C implementation;
6. require independent Technical and Policy audits on the later completed checkpoint before merge.
