# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-012
Role: Core Financial Engine Engineer
Status: READY_FOR_MANAGER — residual calculation failures remediated locally; exact-SHA CI pending
Milestone start: `phase-5-money-priority-engine` at `3298b3adb22c4b2e375ed6955f6e6c7aab6cc307`
Remediation branch: `ai/ffh-012-residual-remediation`
Pull request: #8 (draft)
Production checkpoint: `6acdcce25a69bd4449eccea94d480d09b685d1fd`

Assigned objective: Determine exactly why the original approximately 54 HSA-related calculation failures fell to approximately 20, enumerate the residual failures from local test output, and apply only the narrow remediation justified by FFH-012 and the accepted FFH-010 input contract. Do not redesign the money-priority engine or repair FFH-011.

Work completed: Refreshed the live milestone and reproduced both failure sets locally. The original isolated Core checkpoint `98f9090b5a231cb12a0f68d3be7e84c2bbf4f546` produced 54 failures (804 total, 750 passed). The current milestone checkpoint produced 20 failures (792 total, 772 passed). Every current failure was captured by test identity, assertion, expected/actual values, stack, and implicated path before production code was changed.

Differential diagnosis: Fifteen residual failures used downstream fixtures that supplied only legacy `hsa_eligible` / `hsa_coverage_type` hints and omitted normalized per-person HSA profiles, eligible months, and tax-year-bound YTD data made authoritative by FFH-010. One cluster omitted a single-owner Medicare-excess warning. Two cases dropped shared ordinary/catch-up capacity fields while constructing the HSA opportunity. One reconciliation case rounded `$8,750 / 12` to monthly cents and left a display-only `$0.01` remainder that incorrectly tripped the unroutable-cash invariant. One married catch-up test expected a non-default ordinary split without specifying the explicit allocation required by FFH-D005; its fixture was completed rather than changing policy.

Why the earlier 34 failures passed: The earlier remediation corrected normalized legal-capacity behavior and updated/replaced part of the original test generation. Those cases reached the normalized HSA path or were no longer represented by unchanged test identities. They did not exercise all downstream legacy fixture builders, the single-owner warning branch, the opportunity forwarding omission, or the cent-level reconciliation boundary. The comparison therefore does not support a broad HSA rewrite.

Implementation: Added one shared normalized HSA test-fixture adapter for affected downstream suites; forwarded already-computed shared ordinary/catch-up capacity fields; preserved the single-owner Medicare-excess warning; and treated a sub-cent-derived one-cent reconciliation residue as rounding rather than legal allocatable room. Updated the married catch-up fixture to state its explicit allocation. No legal limit, eligibility, tax treatment, employer-contribution rule, or allocation priority was invented or changed.

Files changed at the production checkpoint: `lib/calculations/hsa-test-fixtures.ts`; `lib/calculations/money-priority-build.ts`; `lib/calculations/money-priority-hsa-legal-capacity.ts`; `lib/calculations/money-priority-retirement-accounts.ts`; `lib/calculations/money-priority-final-audit-remediation.test.ts`; `lib/calculations/money-priority-fresh-final-remediation.test.ts`; `lib/calculations/money-priority-hybrid-retirement-floor.test.ts`; `lib/calculations/money-priority-retirement-integration.test.ts`.

Validation actually performed: Exact formerly failing tests passed. Full `npm test` passed 792/792. FFH-012-focused and directly affected Phase-5 regressions passed. The security policy-contract suite passed 18 tests and retained one inherited FFH-011 textual-regex failure. Typecheck/build retained inherited FFH-011/test errors. Lint reported zero errors and one pre-existing warning. No CI success is claimed for the final production SHA because no workflow run exists for it.

CI evidence: Foundation CI run `34556817515` (#373) tested the milestone starting SHA and failed at Test calculations with the reproduced 20 failures. No workflow run exists for production SHA `6acdcce25a69bd4449eccea94d480d09b685d1fd` as of this handoff.

Blocking issues: No known FFH-012 calculation failure remains locally. Exact-SHA CI evidence is still missing. The inherited FFH-011 security/typecheck/build failures are out of FFH-012 scope and need separate Manager disposition.

Unverified items: Independent Manager/Technical/Financial Policy verification; exact-final-SHA CI; integration checkpoint.

Recommended next role: Manager / Architect.

Exact next action: Manager verifies PR #8 and production checkpoint `6acdcce25a69bd4449eccea94d480d09b685d1fd`, obtains or routes exact-SHA Foundation CI, and classifies inherited FFH-011 failures separately. Engineering must not mark FFH-012 `ACCEPTED`, `AUDIT_READY`, or `CLOSED`, and must not merge.

Checkpoint vocabulary: `PRODUCTION_SHA` is `6acdcce25a69bd4449eccea94d480d09b685d1fd`. `VALIDATED_CI` is not established. `HANDOFF_SHA` is the documentation commit containing this file and `.ai/tasks/FFH-012.md`; read PR #8 branch head after write. `INTEGRATION_SHA` is not established.

Constraints preserved:
- No broad money-priority-engine redesign.
- No new financial policy.
- No FFH-011 repair.
- No FFH-013/R6 or Phase 5C work.
- No acceptance, audit-ready, closure, merge, or specialist activation by Engineering.
