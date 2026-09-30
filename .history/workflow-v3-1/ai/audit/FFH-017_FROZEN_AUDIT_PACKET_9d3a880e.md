# FFH-017 Frozen Audit Packet — `9d3a880e`

Packet ID: `FFH-017-9d3a880e-2026-09-15`

Task: FFH-017 — Phase 5C Recurring Goal-versus-Retirement Competition
Workflow: V3.1
Audit target state: FROZEN / AUDIT_READY — HISTORICAL FAILED AUDIT TARGET

## Exact frozen implementation target

`9d3a880e02365b4445b8070344c72c928ca34511`

Audit this exact integration SHA only. Later Manager control-plane commits are not part of the financial implementation target.

## Historical packet erratum

Technical finding TMA-017-04 identified that this packet originally recorded the wrong verify-job ID for successful Foundation CI run `34999388253`. Manager re-queried GitHub and verified the run's successful `verify` job is `104483702758`. This metadata correction does not alter the frozen financial target, the run, or any financial behavior.

## Integration evidence

PR: #26 — `FFH-017: Phase 5C recurring goal-retirement competition`

Accepted final PR head:
`0e7c139b374716ad0e701d0f3c8ae05f9fac1692`

Integration SHA:
`9d3a880e02365b4445b8070344c72c928ca34511`

Manager comparison of accepted PR head -> integration reports **zero changed files**. The frozen integration tree is therefore file-identical to the accepted PR head.

## Production / validation checkpoints

Last FFH-017 production-code change:
`1393ea928eb5756f16a6af063a68360892200bd6`

The delta after this production checkpoint through the accepted PR head contains tests/fixtures, CI infrastructure, worklog/handoff, and AI control-plane records only; no later production financial-engine file change was identified.

Pre-handoff fully-green PR head:
`545d3b12710086b0fefb44be9b7823309f30da0e`

Foundation CI:
- run `34999388253`
- job `104483702758`
- conclusion: SUCCESS
- runner: repository-scoped `FFH-Windows-Runner`

Final handoff commit:
`c7882907854579488eb82f4d9f18799b51522550`

Foundation CI on final handoff commit:
- run `35000961119`
- job `104488944773`
- conclusion: SUCCESS

Both successful runs include:
- dependency install;
- `npm run ai:validate-state`;
- production dependency audit;
- full calculations;
- security policy contract;
- typecheck;
- lint;
- build.

Later accepted-head deltas after the final handoff CI are `.ai/**` Manager/worklog lifecycle synchronization only. No production, test, or workflow file changed after the fully-green handoff commit.

## CI infrastructure note

The repository exhausted its included private-repository GitHub-hosted runner allocation while retaining a `$0` Actions budget. Foundation CI was moved to a repository-scoped Windows self-hosted runner so validation can continue at `$0` hosted-runner cost.

Runner labels:
`[self-hosted, Windows, X64, ffh-local]`

Workflow run steps use `cmd.exe`; Windows PowerShell execution policy was not weakened.

This infrastructure change does not alter financial-engine semantics.

## Accepted policy authority

Audit the frozen implementation against:
- FFH-D004 in `.ai/shared/DECISIONS.md`;
- `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`;
- `.ai/policy/goals/FFH-003_REVALIDATION_ADDENDUM.md`;
- `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md`;
- `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`;
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`;
- closed FFH-013 retirement-capacity semantics and frozen target `4b7ed99894e396beadc02a537dad45963f5db1d5`.

Do not reopen accepted policy during implementation audit. Escalate only if the frozen implementation materially conflicts with accepted authority or the accepted authority itself is internally impossible to execute safely.

## FFH-017 implementation contract to audit

Recurring Build capacity competes between approved recurring tranches and additional retirement opportunity above the protected Phase 5A retirement floor. Remaining goal-core need is economically distinct from desired-solution excess; desired/excess is retirement-junior and must not inherit core priority.

Protected retirement floor is outside the competition and ordinary goals may not raid it.

Approved dispositions:
- `OUTRANKS`
- `CO_PRIORITY`
- `BELOW`
- `MORE_INFORMATION_NEEDED`

Expected semantics:
- OUTRANKS goal-core tranches receive contested recurring capacity before additional retirement;
- BELOW goal tranches, including desired-solution excess, do not consume contested capacity ahead of additional retirement;
- true CO_PRIORITY uses deterministic common fulfillment with exact monthly cents;
- MORE_INFORMATION_NEEDED exposes no unsupported definite contested allocation and missing evidence is localized to the tradeoff it can actually change.

Goal desired/excess funding must not be promoted into goal-core need.

The closed FFH-013 retirement-capacity ledger remains authoritative for retirement routing. FFH-017 must not recreate IRA/workplace legal room.

## Financial Engine Reconciliation Gate

Audit exact recurring monthly-cents conservation:
- authoritative aggregate allocation equals concrete destination allocations;
- no hidden over-route;
- no hidden under-route or positive-residual suppression;
- no epsilon/tolerance financial waiver;
- no material ID/order priority;
- stable identity only unavoidable final cent;
- planner/prepass and actual routing use one authoritative path or exact proven equivalent;
- annual legal consumption and monthly recurring pace reconcile exactly at applicable conversion boundaries;
- already-consumed/reserved retirement capacity cannot be reused;
- protected retirement floor cannot be consumed by ordinary goal competition.

## Required adversarial / scenario audit coverage

At minimum independently verify:
1. goal OUTRANKS additional retirement;
2. retirement OUTRANKS goal / goal BELOW retirement;
3. CO_PRIORITY with sufficient recurring capacity;
4. CO_PRIORITY under scarcity;
5. odd-cent and one-cent boundaries;
6. goal/person/account input reversal;
7. MORE_INFORMATION_NEEDED for material goal facts;
8. MORE_INFORMATION_NEEDED for material retirement facts;
9. protected retirement floor cannot be raided;
10. goal desired/excess does not compete as goal core and remains a separate BELOW tranche when nonzero;
11. factual YTD and future schedules remain distinct;
12. existing schedule reservations cannot be reused;
13. spouse/shared IRA capacity remains conserved;
14. multiple retirement accounts do not multiply additional room;
15. multiple goals do not multiply recurring capacity or reuse core need;
16. Existing Cash -> Secure -> Build -> Windfall staged conservation;
17. Roth / Traditional / SIMPLE / HSA / workplace-retirement preservation;
18. order invariance where items are financially equivalent.

## Protected FFH-013 M01 regression

Preserve exactly:
- shared annual room `$10,000.01`;
- owner conditional room `$7,500` each;
- Build authority `$833.33/month`;
- routes `$416.67 + $416.66`;
- aggregate `$833.33/month`;
- annual legal consumption `$9,999.96`;
- shared annual remainder `$0.05`.

No epsilon/tolerance. No hidden residual suppression.

## Production files in FFH-017 scope

Primary production scope:
- `lib/calculations/money-priority-build-competition.ts`
- `lib/calculations/money-priority-build.ts`

Other PR changes are tests/fixtures, worklog/handoff/task state, and CI routing infrastructure. Auditors should still inspect any changed file that can materially influence the audited behavior.

## Audit lanes

Two fresh independent lanes were required:
1. Technical & Mathematical Auditor
2. Financial Policy & Scenario Auditor

Neither auditor may rely on the other auditor's verdict.

Allowed verdicts:
- PASS
- PASS WITH NON-BLOCKING FINDINGS
- FAIL — REMEDIATION REQUIRED

Classify findings only as:
- CRITICAL
- HIGH
- MEDIUM
- LOW

## Historical audit outcome

Both independent lanes returned `FAIL — REMEDIATION REQUIRED` on this target. This packet remains historical custody evidence for the failed target. A later remediation must produce a new exact candidate, Manager acceptance/integration, and a new frozen audit packet; do not silently substitute a remediated SHA into this packet.
