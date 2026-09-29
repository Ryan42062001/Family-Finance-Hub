# FFH-017 Frozen Audit Packet — `90a31c75`

Packet ID: `FFH-017-90a31c75-2026-09-17`

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Workflow: V3.1
Audit target state: FROZEN / AUDIT_READY — REMEDIATED RE-AUDIT TARGET

## Exact frozen implementation target

`90a31c755ea88310e58bb9e06ade60af73e182f5`

Audit this exact integration SHA only. Later Manager control-plane commits are not part of the financial implementation target.

Historical failed target `9d3a880e02365b4445b8070344c72c928ca34511` remains immutable failed-audit evidence and must not be substituted for this remediated target.

## Manager acceptance / integration evidence

Remediation PR: #28 — `FFH-017: remediate Phase 5C audit findings R01-R03`

Remediation production checkpoint:
`0a421f00e42ee1699d51dea7abdb37118bed631f`

Final production/test validation head:
`a6a8087db007d3012db8fe426e63a2988a0f95a8`

Foundation CI on production/test validation head:
- run `35171621516`
- job `105044311457`
- conclusion: SUCCESS

Final worker/handoff head:
`401204a34ec8ddf2305e073a1938f3cfb27a8900`

Foundation CI on final handoff head:
- run `35296861758`
- job `105451103749`
- conclusion: SUCCESS

Integration SHA / frozen target:
`90a31c755ea88310e58bb9e06ade60af73e182f5`

Manager comparison of final PR head -> integration reports **zero changed files**. The frozen integration tree is file-identical to the accepted final PR head.

Integration Foundation CI:
- run `35297206526`
- job `105452111495`
- conclusion: SUCCESS
- runner: repository-scoped `FFH-Windows-Runner`

All required integration gates executed:
- checkout;
- Node setup;
- dependency install;
- `npm run ai:validate-state`;
- production dependency audit;
- full calculation tests;
- security policy contract;
- typecheck;
- lint;
- build.

## Historical findings this remediation must close

The historical frozen target `9d3a880e...` failed both independent audits.

Manager-reconciled remediation scope:

### R01 — missing-fact locality

Historical findings:
- Technical `TMA-017-01` — HIGH / BLOCKING
- Policy `FFH-017-P01` — MEDIUM / BLOCKING

Required remediated behavior:
- missing information blocks only the tranche/tradeoff whose outcome can actually change;
- unconfirmed legacy goals gain no new cross-domain elevation but do not freeze unrelated verified allocations;
- known Optional/lifestyle ordering remains BELOW additional retirement even when local amount/detail is unresolved;
- unrelated lower-priority missing facts cannot suppress fully known OUTRANK / CO_PRIORITY / retirement allocations;
- genuinely material Essential/Important unknowns remain fail-closed for contested capacity whose outcome depends on them;
- unresolved amounts are never fabricated.

### R02 — exact non-tied annual/monthly retirement reconciliation

Historical finding:
- Technical `TMA-017-02` — HIGH / BLOCKING

Required remediated behavior:
- ordinary non-tied retirement recurring pace may not imply more annual authority than is actually consumed;
- planner/prepass and actual router use one authoritative exact-cent conversion or a proven exact equivalent;
- one-cent/odd-cent annual residuals remain explicit;
- no round-half-up path may manufacture unsupported recurring monthly authority;
- no epsilon/tolerance waiver or positive-residual clamp;
- accepted tied-spouse FFH-013 path remains preserved.

Required direct boundary:
- `$0.06` annual legal room must not expose `$0.01/month` as a supported full-year recurring pace.

Manager adversarial hand-check:
- `$0.13` annual room -> `$0.01/month` recurring authority -> exactly `$0.12` annual consumption -> `$0.01` explicit annual residual.

### R03 — desired/excess recurring tranche completeness

Historical finding:
- Technical `TMA-017-03` — HIGH / BLOCKING

Required remediated behavior:
- remaining goal core and desired-solution excess are distinct recurring economic tranches;
- nonzero desired/excess is emitted explicitly and is always BELOW additional retirement;
- desired/excess never inherits OUTRANK / CO_PRIORITY from core;
- when core is satisfied but excess remains, excess may use residual Build capacity only after additional retirement and higher-ranked tranches;
- exact recurring-capacity conservation remains intact.

Required direct case:
- core request `$600/month`
- additional retirement `$400/month`
- desired excess `$600/month`
- recurring capacity `$1,600/month`
- expected exact allocation: `$600 + $400 + $600 = $1,600`, residual `$0`.

## Accepted policy authority

Audit the frozen implementation against:
- FFH-D004 in `.ai/shared/DECISIONS.md`;
- `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`;
- `.ai/policy/goals/FFH-003_REVALIDATION_ADDENDUM.md`;
- `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md`;
- `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`;
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`;
- closed FFH-013 retirement-capacity semantics and frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5`.

Do not reopen accepted policy merely because an alternate design is preferable. Escalate only a material implementation/policy conflict or an internal policy impossibility.

## Financial Engine Reconciliation Gate

Independently audit:
- authoritative recurring routing unit is exact monthly cents;
- aggregate recurring allocation equals concrete destination allocations exactly;
- annual/monthly conversion reconciles monthly cents × 12 to annual ledger consumption exactly where applicable;
- no hidden over-route;
- no hidden under-route or positive-residual suppression;
- no epsilon/tolerance financial waiver;
- planner/prepass and actual router share one authoritative path or are proven exactly equivalent;
- consumed/reserved retirement capacity cannot be reused;
- stable identity affects only an unavoidable final cent after financial equivalence;
- protected retirement floor cannot be raided by ordinary goal competition;
- Existing Cash -> Secure -> Build -> Windfall ledger custody remains conserved.

## Protected FFH-013 M01 regression

Preserve exactly:
- shared annual room `$10,000.01`;
- owner conditional room `$7,500` each;
- Build authority `$833.33/month`;
- routes `$416.67 + $416.66`;
- annual legal consumption `$9,999.96`;
- shared annual remainder `$0.05`.

No epsilon/tolerance. No hidden residual suppression.

## Required adversarial / scenario coverage

At minimum independently verify:
1. known goal OUTRANKS additional retirement;
2. goal BELOW additional retirement;
3. CO_PRIORITY with sufficient capacity;
4. CO_PRIORITY under scarcity/common fulfillment;
5. odd-cent and one-cent boundaries;
6. goal/person/account input reversal where financially equivalent;
7. Optional unknown amount/detail remains local;
8. unconfirmed legacy goal does not freeze unrelated verified allocations;
9. unrelated lower-priority unknown does not suppress known OUTRANK;
10. unrelated lower-priority unknown does not suppress known CO_PRIORITY;
11. genuinely material Essential/Important unknown remains fail-closed;
12. retirement MORE_INFORMATION_NEEDED remains fail-closed where material;
13. protected retirement floor cannot be raided;
14. `$0.06` non-tied annual-room boundary;
15. nearby non-tied annual-cent boundaries and explicit residuals;
16. core-satisfied / desired-excess-remains Scenario-8 shape;
17. mixed `$600 core + $400 retirement + $600 excess` exact conservation;
18. factual YTD vs future schedule distinction;
19. schedule reservations cannot be reused;
20. spouse/shared IRA conservation and M01;
21. multiple accounts do not multiply legal room;
22. multiple goals do not reuse recurring capacity/core need;
23. Existing Cash -> Secure -> Build -> Windfall staged conservation;
24. Roth / Traditional / SIMPLE / HSA / workplace-retirement preservation;
25. recommendation output remains planning/recommendation, not execution.

## Production files materially changed by remediation

Primary production files:
- `lib/calculations/money-priority-build-competition.ts`
- `lib/calculations/money-priority-build.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-engine.ts`

Direct/regression tests include:
- `lib/calculations/ffh-017-audit-remediation.test.ts`
- `lib/calculations/money-priority-fresh-final-remediation.test.ts`
- `lib/calculations/money-priority-goal-ranking.test.ts`
- existing FFH-017 / FFH-013 calculation regressions.

Auditors may inspect any file in the frozen tree needed to verify behavior but may not silently switch the audited checkpoint.

## Audit lanes

Two fresh independent lanes are required:
1. Technical & Mathematical Auditor
2. Financial Policy & Scenario Auditor

Both receive this same packet and exact frozen target.

Neither auditor may rely on, copy, or wait for the other auditor's verdict before submitting their own independent report/handoff.

Allowed verdicts exactly:
- PASS
- PASS WITH NON-BLOCKING FINDINGS
- FAIL — REMEDIATION REQUIRED

Finding severities only:
- CRITICAL
- HIGH
- MEDIUM
- LOW

Manager retains audit reconciliation and final closure/remediation routing authority.
