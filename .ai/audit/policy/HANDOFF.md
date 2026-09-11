# Financial Policy & Scenario Audit — HANDOFF

Task: FFH-012 — HSA Legal-Capacity Calculation
Re-audit after: FFH-023 — FFH-012 Audit Remediation
Audit target: `1487b192491a704ca3500b42d22a50289ee1551b`
Verdict: FAIL — REMEDIATION REQUIRED

## Prior finding disposition

- PRIOR FINDING A: OPEN — the direct `spouse_partner`/filing/allocation authority defect is structurally remediated, but unknown-authority materiality is incomplete for a compound case. If A is confirmed eligible+self-only, B eligibility is unresolved while B coverage is family/possibly family, and target-year legal-spouse authority is unknown, A can be exposed as `available` at $4,400 even though affirmative spouse authority plus B becoming eligible changes A's equal-default ordinary allocation to $4,375. FFH-022 requires targeted `more_information_needed` because the result is materially spouse-dependent.
- PRIOR FINDING B: CLOSED — the seven-month $5,104.17 shared ordinary base is split by integer cents as $2,552.08 + $2,552.09, conserving the exact legal base with deterministic canonical-owner remainder placement and order invariance.
- PRIOR FINDING C: CLOSED — Build derives aggregate monthly routable capacity from the same per-destination rounded monthly amounts used by actual account routing; $4,375 + $4,375 routes/reports $364.58 + $364.58 = $729.16 monthly, and any positive monthly reconciliation residue throws rather than being silently discarded. Exact annual room remains separately represented in the ledger.

## Blocking finding

HIGH — compound unknown spouse authority + unresolved other-person eligibility/family coverage can expose optimistic actionable HSA room. Exact path: `lib/calculations/money-priority-hsa-legal-capacity.ts` `spouseStatusIsMaterial` -> independent branch -> available HSA opportunity. Accepted FFH-022 authority is sufficient to decide the case; this is not an authority gap. Narrow remediation must block the affected HSA result without poisoning unrelated supported IRA/workplace routes or truly spouse-independent self-only capacity.

## Non-blocking finding

LOW — in `money-priority-retirement-capacity.ts`, married-family consumption still updates the authoritative account/shared/owner totals used for routing but leaves copied component fields such as `sharedOrdinaryRemainingRoom` / catch-up component remaining values stale. Current routing stays capped; do not expose/reuse those stale component values as authoritative residual room without reconciliation.

## Checkpoint / CI evidence

- FFH-023 production: `9140d19c27d206b75e2a1825065e58047f1443c2`.
- FFH-023 handoff: `8854ebac7861da215aaac87501adad36bb95bbe0`.
- Integrated audit target / PR #11 merge: `1487b192491a704ca3500b42d22a50289ee1551b`.
- Manager control plane supplied: `d765b036abc266b0a42c975e7c70c0ad8c92c3d9`, one later documentation/control-plane commit.
- Foundation CI #404 / run `34624938204` / job `103347645465` ran on exact `1487b192...`: dependency setup/audit PASS, Test calculations PASS, Test security policy contract FAIL, later typecheck/lint/build SKIPPED.
- The reached security failure is separately attributable to the FFH-011 SIMPLE textual source-shape contract and is not HSA-policy evidence. It does not cure or cause the blocking HSA materiality defect above.

Exact re-audit report: `.ai/audit/policy/FFH-012_POLICY_SCENARIO_REAUDIT.md`.

Required next role: Manager / Architect to return FFH-012 for narrow remediation of the compound unknown-authority materiality case. Manager owns task state, integration, re-audit routing, and final closure.

No production code or Manager-owned task state was changed by this audit.