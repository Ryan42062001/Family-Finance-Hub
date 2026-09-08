# Family Finance Hub — Project State

Last refreshed: 2026-09-08

## Repository state

Repository: `Ryan42062001/Family-Finance-Hub`

Default/canonical branch: `main`

Verified `main` SHA at refresh: `8d68af5d5cdeef866d4a8a481bc3bb31f098199e`

Active development branch: `phase-5-money-priority-engine`

Verified Phase 5 branch SHA before workflow bootstrap: `e979ff19f09fdd07a954347150608a87122f5183`

Open PR:
- PR #5 — `Phase 5: Money Priority Engine`
- base: `main`
- head: `phase-5-money-priority-engine`
- state: OPEN
- merged: false
- observed mergeable state during refresh: false

Branch comparison observed at refresh:
- Phase 5 branch is 180 commits ahead of `main`
- Phase 5 branch is 1 commit behind `main`
- merge base: `70fb1c9a8808256f24c14d059aa4959dc49cec62`
- the newer `main` commit is `8d68af5d5cdeef866d4a8a481bc3bb31f098199e` (`Refresh Family Finance Hub milestone status`), a README milestone-status update

Do not assume the Phase 5 branch is merge-ready until branch freshness is reconciled and required audits pass.

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

The Phase 5 branch contains a large deterministic Money Priority Engine implementation, including repository evidence for:
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
- Phase 5A hybrid retirement floor
- Phase 5B Goal Intelligence

Classification: IMPLEMENTED BUT NOT FULLY VERIFIED as a merge-ready milestone. The branch has successful CI at its pre-bootstrap head, but the branch is behind `main` and later Phase 5A/5B work has not yet received the final independent dual-audit gate required by the new canonical workflow.

## Phase 5A

Repository documentation defines and implementation/tests cover a hybrid retirement floor separating legal contribution capacity from protected planning-policy retirement saving.

Classification: IMPLEMENTED BUT NOT YET CANONICALLY ACCEPTED FOR MERGE under the new workflow.

## Phase 5B

Repository documentation defines and implementation/tests cover Goal Intelligence as derived deterministic evidence. It does not itself alter Build allocation economics.

Repository documentation explicitly states Phase 5C will consume Goal Intelligence evidence when actual goal-versus-retirement allocation competition is introduced.

Classification: IMPLEMENTED BUT NOT YET CANONICALLY ACCEPTED FOR MERGE under the new workflow.

## Phase 5C and later refinement

Conversation history indicates Phase 5C–5G policy/design work was discussed outside the repository. That discussion is useful context but is not repository-verified canonical state.

Until a specialist analysis is persisted and approved by Manager:
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

Foundation CI also runs `npm audit --omit=dev --audit-level=high` before the test/type/lint/build gates.

Verified GitHub Actions evidence at refresh:
- Foundation CI run #240 on `e979ff19f09fdd07a954347150608a87122f5183`
- conclusion: SUCCESS

No claim is made here about a later checkpoint until new CI/test evidence is observed.

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

Repository documentation explicitly defers or conservatively handles certain advanced retirement cases when required facts are not persisted, including special 403(b) service catch-up and governmental 457(b) last-three-years catch-up behavior.

Person-level HSA eligibility/coverage independently of represented HSA account records remains future scope.

Do not silently upgrade these boundaries into implemented behavior.

## Current management assessment

Current milestone: Phase 5 — Money Priority Engine

Milestone status: ACTIVE / NOT MERGE READY

Primary immediate needs:
1. establish canonical `.ai` workflow and assignments;
2. reconcile Phase 5 branch freshness with current `main`;
3. define/approve unresolved Phase 5C goal-versus-retirement policy before implementation;
4. independently verify current statutory retirement/HSA facts that materially affect pending policy;
5. require dual audit after the integration/policy/implementation checkpoint before merge.
