# Core Financial Engine Engineer Handoff

HANDOFF

Task ID: FFH-046 — Windfall Tax-Authority Fail-Closed Remediation
Role: Core Financial Engine Engineer
Status: READY_FOR_MANAGER
Execution mode: STANDARD_CHAT_HIGH
Refresh mode: FAST_REFRESH
Branch: `ffh/ffh-046-windfall-tax-authority-fail-closed`
Pull request: #62 — draft / open / unmerged / mergeable
Manager / control-plane assignment head: `929dedc9f98f7f35b0a81ec4532f845a7d87494b`
Blocking frozen audit target: `8f4b1c443684446cdf9b619bd35336f5873265bc`

PRODUCTION_SHA: `3a045c4acae7b32efe68165c021dfc34c1a1209a`
FINAL_VALIDATION_SHA: `c5d1b6863707460f046dfd1fc1cf2d0aea82d88c`
VALIDATED_CI: Foundation CI run `35443929743`, job `105899505669` — SUCCESS / FULL
HANDOFF_SHA: This final documentation/control-plane commit; exact SHA returned after creation
INTEGRATION_SHA: Not yet established
MANAGER_VERDICT: PENDING
AUDIT_STATUS: NOT_READY — Manager acceptance/integration and a newly frozen remediated Phase-6 target are required before fresh final dual re-audits

## Result

FFH-045-P01 is remediated at the authoritative Windfall allocator boundary.

`allocateWindfall()` now:
- validates runtime `taxTreatment` against only the existing accepted enum;
- preserves null/omitted treatment as uncertain;
- fails closed on unsupported treatment with zero deployable amount and zero allocations;
- requires an explicit finite nonnegative `knownTaxLiability` when treatment is `known_taxable_liability_provided`;
- distinguishes missing/null liability from explicit zero;
- holds otherwise-unreserved proceeds for tax review when the required known liability is missing/null;
- preserves explicit known-liability arithmetic, reservation ordering, post-engine retirement-capacity consumption, residual reconciliation, and no-reuse.

No second App/Data Windfall evaluator was introduced. Authenticated specialized Scenario Lab execution continues to delegate through FFH-042/043 to the same allocator and therefore inherits the same fail-closed semantics.

## Regression evidence

Direct allocator and authenticated specialized execution cover:
- omitted liability;
- null liability;
- explicit zero;
- unsupported runtime treatment;
- explicit known positive liability;
- explicit uncertain treatment;
- exact cent-level reconciliation.

Authenticated missing/null cases return non-valid more-information-needed Windfall results with no deployable amount or allocations. Unsupported treatment returns structured invalid with no deployable amount or allocations. Explicit zero remains valid.

## Exact reconciliation

Omitted-liability control:
- gross `$12,345.67`;
- other liability `$200.00`;
- restricted `$300.03`;
- earmarked `$400.04`;
- held `$11,445.60`;
- deployable/allocated/residual-deployable `$0.00`;
- exact cents: `1,234,567 = 20,000 + 30,003 + 40,004 + 1,144,560`.

Unsupported-treatment control:
- gross `$10,000.00`;
- held `$10,000.00`;
- deployable/allocated/residual-deployable `$0.00`;
- state invalid.

Explicit-zero control:
- gross `$10,000.00`;
- known tax `$0.00`;
- held `$0.00`;
- authorized deployable `$10,000.00`;
- direct no-destination allocation `$0.00`;
- residual `$10,000.00`.

Explicit-positive control:
- gross `$12,345.67`;
- known tax `$1,000.01`;
- other liability `$200.00`;
- restricted `$300.03`;
- earmarked `$400.04`;
- total reservations `$1,900.08`;
- authorized deployable `$10,445.59`;
- direct no-destination allocation `$0.00`;
- residual `$10,445.59`;
- exact cents: `1,234,567 = 190,008 + 1,044,559`.

Uncertain treatment retains the existing unknown-safe hold: after explicit reservations, the entire otherwise-unreserved amount is held for tax review and no percentage is invented.

The authenticated specialized regression independently asserts the same conservation identity in integer cents for missing, null, zero, unsupported, positive-known, and uncertain cases.

## Validation

Final FULL Foundation CI `35443929743` / `105899505669`:
- AI-state validation PASS;
- dependency audit PASS;
- calculation suite PASS;
- security suite PASS;
- typecheck PASS;
- lint PASS;
- production build PASS;
- Foundation guardrails PASS.

Production custody:
- production checkpoint `3a045c4a...`;
- final validation `c5d1b686...`;
- `money-priority-windfall.ts` is byte-identical between those checkpoints;
- intervening commits are test-only.

## Changed-file scope

Production/test:
- `lib/calculations/money-priority-windfall.ts`
- `lib/calculations/money-priority-windfall.test.ts`
- `lib/calculations/ffh-043-scenario-specialized-wiring.test.ts`

Control-plane/handoff:
- `.ai/tasks/FFH-046.md`
- `.ai/tasks/TASK_INDEX.md`
- `.ai/engineering/engine/FFH-046_WORKLOG.md`
- `.ai/engineering/engine/HANDOFF.md`

No schema, persistence, profile writes, UI redesign, new tax percentages/policy, FFH-038, FFH-047, or Phase-7 scope changed.

Worker blocker: NONE.

READY_FOR_MANAGER

## Next Activation

| Order | Employee / Role | Status | Copy/paste activation prompt |
|---:|---|---|---|
| 1 | Manager / Architect | RECOMMEND TO MANAGER | Continue Family Finance Hub as Manager / Architect under STANDARD_CHAT_HIGH with Fast Refresh. Re-review FFH-046 on draft PR #62 / branch `ffh/ffh-046-windfall-tax-authority-fail-closed`. Verify production SHA `3a045c4acae7b32efe68165c021dfc34c1a1209a`, final-validation SHA `c5d1b6863707460f046dfd1fc1cf2d0aea82d88c`, FULL Foundation CI `35443929743` / job `105899505669`, runtime tax-treatment membership validation, missing/null known-liability fail-closed hold, explicit-zero distinction, unsupported-treatment invalid behavior, direct/authenticated regressions, exact-cent reconciliation, and unchanged downstream no-reuse/retirement-capacity behavior. Accept/integrate or route further remediation. Only after accepted integration freeze a NEW remediated Phase-6 target and route fresh final Technical & Mathematical plus Financial Policy & Scenario re-audits; do not reuse frozen failed target `8f4b1c443684446cdf9b619bd35336f5873265bc` as the remediated audit target. |
| 2 | Retirement & Tax-Advantaged Policy Analyst | IDLE | — |
| 3 | Debt & Liquidity Policy Analyst | IDLE | — |
| 4 | Goals, Cash Flow & Allocation Policy Analyst | IDLE | — |
| 5 | Core Financial Engine Engineer | WAIT | — |
| 6 | Application, Data & Integration Engineer | WAIT | — |
| 7 | Regulatory & Financial Research Analyst | IDLE | — |
| 8 | Product & Technical R&D Engineer | IDLE | — |
| 9 | Technical & Mathematical Auditor | WAIT | Wait for Manager acceptance/integration and a newly frozen remediated Phase-6 target. |
| 10 | Financial Policy & Scenario Auditor | WAIT | Wait for Manager acceptance/integration and a newly frozen remediated Phase-6 target. |
| 11 | Work Helper / Super Troubleshooter | IDLE | — |
