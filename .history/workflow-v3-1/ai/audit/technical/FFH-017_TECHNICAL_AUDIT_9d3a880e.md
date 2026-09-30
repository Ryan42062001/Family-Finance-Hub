# FFH-017 — Fresh Independent Technical & Mathematical Audit

Audit role: Technical & Mathematical Auditor  
Execution mode: STANDARD_CHAT  
Audit date: 2026-09-15  
Repository: `Ryan42062001/Family-Finance-Hub`  
Manager control-plane head verified: `4912736fbe0d4de28350ac009f23659ff93c5b3a`  
Exact frozen implementation target: `9d3a880e02365b4445b8070344c72c928ca34511`  
Frozen packet: `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_9d3a880e.md`  
PR: `#26 — FFH-017: Phase 5C recurring goal-retirement competition`

## Final verdict

**FAIL — REMEDIATION REQUIRED**

The exact frozen target does not satisfy FFH-D004 and the Financial Engine Reconciliation Gate. Three reachable HIGH defects remain in production behavior. A separate LOW control-plane evidence-reference defect does not itself affect the financial result.

This audit was performed independently. The Financial Policy & Scenario Auditor's conclusions or verdict were not read or relied upon.

## Frozen-target custody and validation evidence

Verified repository lineage:

- Manager control-plane head is exactly `4912736fbe0d4de28350ac009f23659ff93c5b3a`.
- PR #26 final accepted head is `0e7c139b374716ad0e701d0f3c8ae05f9fac1692`.
- Integration/frozen target is `9d3a880e02365b4445b8070344c72c928ca34511`.
- Independent compare `0e7c139b374716ad0e701d0f3c8ae05f9fac1692..9d3a880e02365b4445b8070344c72c928ca34511` reports zero changed files.
- Last production financial-engine checkpoint is `1393ea928eb5756f16a6af063a68360892200bd6`.
- Independent compare from that production checkpoint to the frozen target shows later changes are tests/fixtures, CI infrastructure, worklog/handoff, and AI control-plane records; no later production calculation file changed.

Foundation CI evidence is green but was treated only as corroborating evidence:

- run `34999388253` on `545d3b12710086b0fefb44be9b7823309f30da0e` is SUCCESS and executed dependency install, AI-state validation, dependency audit, calculations, security contract, typecheck, lint, and build on `FFH-Windows-Runner`;
- the live GitHub jobs endpoint identifies that run's verify job as `104483702758`;
- run `35000961119`, job `104488944773`, on handoff head `c7882907854579488eb82f4d9f18799b51522550` is SUCCESS through the same gates.

The task/frozen packet records job `104483637634` for run `34999388253`; that job reference does not match GitHub's live job identity. See TMA-017-04.

## Authority inspected

The audit read and applied:

- `.ai/shared/WORKFLOW_V3_1.md`
- `.ai/shared/WORKFLOW_V3.md`
- `.ai/shared/WORKFLOW.md`
- `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`
- `.ai/tasks/TASK_INDEX.md`
- `.ai/tasks/FFH-017.md`
- `.ai/roles/technical-audit.md`
- `.ai/audit/FFH-017_FROZEN_AUDIT_PACKET_9d3a880e.md`
- FFH-D004 in `.ai/shared/DECISIONS.md`
- `.ai/policy/goals/FFH-003_PHASE_5C_GOAL_COMPETITION_POLICY.md`
- `.ai/policy/goals/FFH-003_REVALIDATION_ADDENDUM.md`
- `.ai/policy/retirement/PHASE_5C_RETIREMENT_POLICY.md`
- `.ai/policy/retirement/FFH-004_PHASE_5C_RETIREMENT_POLICY_REFRESH.md`
- closed FFH-013 retirement-capacity evidence only as necessary to re-establish M01, schedule reservation, shared-ledger, and staged-consumer invariants.

Primary frozen production code independently inspected:

- `lib/calculations/money-priority-build-competition.ts`
- `lib/calculations/money-priority-build.ts`
- `lib/calculations/money-priority-goal-intelligence.ts`
- `lib/calculations/money-priority-snapshot.ts`
- `lib/calculations/money-priority-retirement-capacity.ts`
- `lib/calculations/money-priority-engine.ts`
- `lib/calculations/money-priority-windfall.ts`

Focused frozen tests/evidence independently inspected include:

- `lib/calculations/money-priority-build-competition.test.ts`
- `lib/calculations/ffh-017-goal-retirement-competition.test.ts`
- `lib/calculations/ffh-013-spousal-ira-ledger.test.ts`
- `lib/calculations/ffh-013-final-audit-remediation.test.ts`
- retained retirement-account/HSA/SIMPLE/workplace regression surfaces.

## Findings

| ID | Severity | Disposition |
|---|---|---|
| TMA-017-01 — missing goal facts globally freeze unrelated Phase 5C allocations | HIGH | OPEN / BLOCKING |
| TMA-017-02 — non-tied retirement annual-to-monthly conversion can expose a recurring pace above verified annual legal room | HIGH | OPEN / BLOCKING |
| TMA-017-03 — desired-solution excess is recorded but never emitted as its required BELOW retirement recurring tranche | HIGH | OPEN / BLOCKING |
| TMA-017-04 — pre-handoff CI job ID in canonical task/packet does not match live GitHub job identity | LOW | OPEN / NON-FINANCIAL |

No CRITICAL finding was identified. No additional MEDIUM finding was identified.

## TMA-017-01 — HIGH — missing information is not localized to the tradeoff it can change

### Required authority

FFH-D004 rule 14 requires missing evidence to block only the contested tradeoff that depends on it. The accepted Goals policy is more explicit: conservative uncertainty must leave only contested capacity unresolved and must not freeze unrelated retirement or goal allocations. Its Scenario 14 requires a legacy unconfirmed goal to receive no new Phase 5C elevation while unrelated verified Build allocation continues.

Optional/lifestyle dollars remain below additional retirement regardless of a fixed date or financing plan, so financing details that cannot change an Optional goal's cross-domain class are not material to whether retirement may allocate first.

### Frozen implementation

`determineGoalRetirementDisposition()` checks `goal.state === "more_information_needed"` before checking whether the goal is Optional or whether the missing field can actually change its disposition. `buildRecurringGoalRetirementCompetition()` then collects every `MORE_INFORMATION_NEEDED` goal with null/positive remaining core into `materialMissingGoals` and immediately returns a plan with:

- additional retirement allocation = `$0`;
- every goal allocation = `$0`;
- total Phase 5C allocation = `$0`;
- all available competition capacity left unused.

Production normalization defaults `goal_intelligence_confirmed` to false for legacy rows. Goal Intelligence therefore gives an unconfirmed legacy goal `state = more_information_needed`, making that ordinary legacy record sufficient to freeze otherwise verified Phase 5C retirement/goal allocation.

The post-production test rescue adds `legacy-goal-test-fixtures.ts`, a test-only adapter that fills missing legacy goal facts and marks them confirmed. That keeps older tests green but does not change production's fail-closed normalization.

### Reachable adversaries

**Adversary A — legacy unconfirmed goal**

- retirement floor known and satisfied;
- additional retirement request verified and legally routable;
- recurring capacity available;
- one legacy goal has `goal_intelligence_confirmed = false` and positive remaining need.

Accepted behavior: the legacy goal receives no new elevation; unrelated verified retirement/goal allocation continues.

Frozen behavior: the legacy goal becomes material `MORE_INFORMATION_NEEDED`; the entire Phase 5C competition returns zero allocations.

**Adversary B — Optional goal with irrelevant missing borrowing details**

- Goal Intelligence is otherwise confirmed;
- necessity = Optional;
- core amount and deadline are known;
- `borrowing_likelihood = likely`, but expected borrowing amount/APR are missing;
- verified additional retirement exists.

Accepted behavior: Optional remains BELOW additional retirement regardless of borrowing details; retirement can allocate first.

Frozen behavior: Goal Intelligence marks the goal `more_information_needed`; `determineGoalRetirementDisposition()` returns `MORE_INFORMATION_NEEDED` before reaching the Optional rule; the entire competition is zeroed.

### Technical consequence

This is not merely conservative handling. It changes allocations that are mathematically and policy-independent of the missing fact and violates the accepted locality requirement. It can suppress hundreds or thousands of dollars of otherwise verified recurring allocation.

**Blocking:** yes.

## TMA-017-02 — HIGH — non-tied retirement routing violates annual/monthly legal-capacity reconciliation at cent boundaries

### Required authority

The Financial Engine Reconciliation Gate requires exact annual/monthly reconciliation. When a stage exposes a recurring monthly amount but the legal ledger is annual, the conversion must be deterministic and may not present a monthly destination amount inconsistent with the annual amount actually consumed. One-cent/odd-cent boundaries are explicitly required audit cases.

### Frozen implementation

MFJ tied-spouse routing correctly uses the closed FFH-013 recurring helper, which floors annual cents to supported monthly cents and verifies `annual cents == monthly cents * 12`.

The ordinary non-tied path in `money-priority-build.ts` does something different:

Planner/prepass:

1. consume the full remaining annual room on a clone;
2. compute monthly routable capacity with `roundMoney(consumedAnnualAmount / 12)`.

Actual router:

1. annualize requested monthly amount with `remainingMonthly * 12`;
2. cap to annual room and consume that annual amount;
3. report `allocatedMonthlyAmount = roundMoney(consumedAnnualAmount / 12)`.

The planner and router are internally consistent with each other, but the conversion is not legally reconciled at half-cent boundaries.

### Exact adversarial reproduction

Single non-tied verified retirement destination with exactly `$0.06` annual legal room remaining:

- annual room = `$0.06`;
- `$0.06 / 12 = $0.005`;
- `roundMoney($0.005)` = `$0.01/month`;
- planner therefore exposes `$0.01/month` routable capacity;
- router receives `$0.01/month`, annualizes to `$0.12`, caps/consumes only the actual `$0.06` legal room, then again reports `$0.01/month`.

Resulting concrete destination representation:

- `allocatedMonthlyAmount = $0.01`;
- `allocatedAnnualAmount = $0.06`;
- the displayed recurring monthly pace implies `$0.12/year`, twice the verified annual legal room.

The final Build monthly equality check passes because both aggregate and destination use the same rounded `$0.01` monthly figure. It does not compare that monthly pace back to the `$0.06` annual legal consumption.

This boundary is reachable whenever any ordinary retirement destination has a cent-exact residual legal room in the half-cent-up interval after division by 12; `$0.06` is the smallest direct example.

### Technical consequence

The exact frozen target can expose a recurring retirement pace above verified annual legal room. This violates the Reconciliation Gate's annual/monthly conversion rule and its one-cent-boundary requirement. It also means the overall planner/router equivalence is equivalence to the same incorrect conversion, not proof of legal reconciliation.

This defect applies to non-tied ordinary retirement destinations and is separate from the correctly reconciled MFJ tied-spouse path.

**Blocking:** yes.

## TMA-017-03 — HIGH — desired/excess recurring tranche disappears instead of remaining BELOW additional retirement

### Required authority

FFH-D004 requires goal competition to be tranche-based. Desired-solution excess must remain below additional retirement, and each nonzero recurring tranche must receive an OUTRANKS / CO_PRIORITY / BELOW / MORE_INFORMATION_NEEDED relationship. The accepted Goals policy defines a separate `excessMonthlyPace`, explicitly lists desired/excess as retirement-junior, and requires outputs for the recurring monthly pace and disposition of each applicable tranche.

Its Scenario 8 is explicit: once core need is already satisfied, all remaining target need is desired excess and remains below additional retirement; it does not disappear from Build.

### Frozen implementation

`BuildCompetitionGoalTranche` stores `remainingDesiredExcessAmount`, but there is only one competition tranche object per goal.

`goalRequestMonthly()` calculates only:

`remainingCoreNeedAmount / monthsRemaining`

If `remainingCoreNeedAmount === 0`, it returns a zero request. There is no second desired/excess recurring request and no desired/excess monthly pace.

In `money-priority-build.ts`, goal Build requests are created only from `competition.goals`, and only the single `requestedMonthlyAmount` is routed. The desired/excess amount is included only in explanatory text saying it was excluded from the elevated core tranche.

Therefore:

- when core need is satisfied but target need remains, the goal receives a BELOW disposition with a `$0` request and is skipped entirely;
- when a goal has both core and desired-excess need, only the core request exists; after core and retirement are funded, the remaining desired/excess pace is never presented to the BELOW bucket.

### Exact adversarial reproduction

Policy Scenario 8 shape:

- target = `$15,000`;
- core need = `$5,000`;
- current amount = `$6,000`;
- remaining core = `$0`;
- remaining target / desired excess = `$9,000`;
- valid future deadline;
- additional retirement request is fully satisfiable;
- recurring capacity remains after retirement.

Accepted behavior: the `$9,000` desired-excess tranche has a recurring pace below additional retirement and may use residual Build capacity after retirement.

Frozen behavior: `goalRequestMonthly()` returns `$0`; the goal request is skipped; the residual capacity remains unallocated by Phase 5C rather than funding the lower-priority desired/excess tranche.

A second form occurs when core and excess coexist. For example, if an OUTRANK core pace is `$600/month`, additional retirement is `$400/month`, desired-excess pace is `$600/month`, and capacity is `$1,600/month`, accepted ordering is core `$600` -> retirement `$400` -> excess `$600`. Frozen Phase 5C routes only the first `$1,000` and leaves `$600` as residual capacity.

### Technical consequence

This is a central Phase 5C functional omission, not merely an explanation issue. The implementation can materially under-allocate recurring Build capacity and fails the accepted goal-core-versus-desired-excess contract.

**Blocking:** yes.

## TMA-017-04 — LOW — pre-handoff CI job reference is stale/incorrect

The canonical task and frozen packet cite Foundation CI run `34999388253`, job `104483637634`.

The run itself is valid and successful on the claimed head, but GitHub's live jobs endpoint returns the run's sole verify job as `104483702758`. That live job contains the expected successful Foundation steps and correct self-hosted runner identity.

The final handoff run `35000961119`, job `104488944773`, matches canonical records and is fully green.

This is evidence-hygiene/control-plane drift, not a financial-engine defect. It does not independently block financial correctness, but Manager should correct the stale job reference when reconciling the audit.

**Blocking:** no by itself.

## What independently clears

### Known-fact OUTRANK / CO_PRIORITY / BELOW classification

For fully known, materially complete facts, the frozen classifier implements the accepted core rules:

- qualifying Essential fixed/high or Critical/harm cases OUTRANK additional retirement;
- qualifying Essential core and narrow Important/on-track-or-ahead cases can be CO_PRIORITY;
- Optional and weak/flexible cases are BELOW.

The blocking exception is TMA-017-01: the classifier does not distinguish missing facts that can change the class from missing facts that cannot.

### Co-priority common-fulfillment mathematics

`allocateEqualFulfillmentCents()` is cent-exact:

- requests and capacity are integer cents;
- one common ratio is represented by `allocatable * item.requestedCents / totalRequested`;
- each base share is floored;
- remainder cents go first by fractional remainder and only then stable identity;
- all remainder cents must reconcile or the function throws.

Sufficient-capacity and scarce-capacity co-priority cases therefore clear, including odd-cent and one-cent aggregate boundaries.

### Order invariance

For financially equivalent known-fact co-priority requests, input ordering does not control the result. Stable identity is used only after fractional remainder equality in the proportional allocator. Multiple OUTRANK goals retain the separately approved lexicographic ordering contract.

### Protected retirement floor

The frozen Build stage allocates the verified/routable protected retirement-floor request before Phase 5C competition. If the protected floor remains unresolved, competition capacity is set to zero. Ordinary goals therefore do not raid a known unmet protected floor.

TMA-017-02 still applies to the annual/monthly representation used to decide routable retirement capacity at small non-tied cent boundaries.

### Closed FFH-013 capacity semantics

The frozen target retains the closed FFH-013 capacity code and tests.

Verified protected M01 remains exactly:

- shared annual room `$10,000.01`;
- owner conditional room `$7,500` each;
- Build authority `$833.33/month`;
- concrete routes `$416.67 + $416.66`;
- aggregate `$833.33/month`;
- annual legal consumption `$9,999.96`;
- shared annual remainder `$0.05`.

The tied recurring helper explicitly verifies annual cents equal monthly cents times 12 and throws on disagreement. Account-order reversal preserves the M01 result.

Scheduled IRA reservations remain separate from factual YTD, consume the current planning ledger once, preserve shared-spouse capacity, and cannot be reused by later staged consumers. Multiple Traditional/Roth records do not multiply owner/shared room.

FFH-017 does not alter the FFH-013 retirement-capacity implementation. TMA-017-02 is in FFH-017's new non-tied Build conversion path, not in the protected tied-spouse helper.

### Existing Cash -> Secure -> Build -> Windfall ledger custody

The engine continues to pass one authoritative retirement-capacity ledger from Existing Cash into Secure and Build, then returns the final cloned ledger. Windfall clones that final ledger, so earlier account/shared-group consumption is retained rather than recreated.

No separate staged-ledger recreation defect was found. TMA-017-02 affects the amount representation/annual-to-monthly conversion for non-tied Build retirement routing.

### Roth / Traditional / SIMPLE / HSA / workplace evaluators

No separate regression was identified in the underlying Roth direct-eligibility, Traditional deductibility, SIMPLE, HSA, or workplace legal-capacity evaluators. The relevant production evaluators were not changed by FFH-017, retained focused suites remain present, and both full Foundation calculation runs are green.

However, the generic FFH-017 non-tied Build routing defect TMA-017-02 can affect the final recurring monthly representation of any otherwise verified non-tied destination with an adversarial small annual residual.

## Financial Engine Reconciliation Gate

**DOES NOT CLEAR.**

The cent-exact competition allocator itself reconciles monthly capacity exactly, and the protected FFH-013 MFJ tied-spouse path remains exact. The overall FFH-017 gate nevertheless fails because TMA-017-02 produces an annual/monthly destination mismatch on reachable non-tied cent boundaries.

TMA-017-03 additionally causes an accepted BELOW goal tranche to be omitted rather than routed after retirement, leaving valid recurring capacity unused. That residual is visible rather than silently clamped, but the authoritative Phase 5C tranche model is incomplete.

TMA-017-01 violates missing-fact locality and suppresses unrelated verified allocation.

No epsilon/tolerance comparison was found that waives a financial invariant. `Number.EPSILON` is used by legacy two-decimal rounding helpers, but the blocking issue is exact unit conversion/reconciliation, not tolerance-based acceptance.

## Audit disposition matrix

| Audit requirement | Technical disposition |
|---|---|
| OUTRANKS semantics | CLEARS for materially complete core facts |
| BELOW semantics | DOES NOT FULLY CLEAR — desired excess missing; irrelevant missing facts can prevent BELOW classification |
| CO_PRIORITY semantics | CLEARS for materially complete core facts |
| MORE_INFORMATION_NEEDED semantics | DOES NOT CLEAR — TMA-017-01 over-broad/global |
| sufficient co-priority | CLEARS |
| scarce co-priority | CLEARS |
| exact common fulfillment | CLEARS |
| odd-cent / one-cent co-priority | CLEARS |
| aggregate recurring vs concrete destinations | DOES NOT CLEAR — TMA-017-02 |
| hidden positive residual suppression | no clamp/tolerance suppression found; TMA-017-03 leaves a visible but incorrect residual |
| no over-route / legal capacity | DOES NOT CLEAR — TMA-017-02 monthly pace can exceed annual legal room |
| epsilon/tolerance financial waiver | CLEARS — no invariant is waived by tolerance |
| financially equivalent input order | CLEARS for tested/inspected known-fact paths |
| stable identity final-cent rule | CLEARS in co-priority proportional allocator and M01 |
| planner/prepass vs router | same path/equivalent conversion, but DOES NOT CLEAR legal reconciliation because both share TMA-017-02 |
| protected retirement floor | CLEARS structurally, subject to TMA-017-02 conversion defect |
| goal core vs desired/excess | DOES NOT CLEAR — TMA-017-03 |
| missing material goal facts | DOES NOT CLEAR locality requirement — TMA-017-01 |
| missing retirement facts | conservative/fail-closed behavior found; no separate defect beyond locality scope |
| factual YTD vs future schedules | CLEARS via retained FFH-013 ledger semantics |
| scheduled-capacity no-reuse | CLEARS via retained FFH-013 ledger semantics |
| spouse/shared IRA conservation | CLEARS; M01 exact |
| multiple retirement accounts nonmultiplication | CLEARS in retained ledger semantics |
| multiple-goal capacity conservation | CLEARS mathematically for known requests; semantic tranche omission remains TMA-017-03 |
| Existing Cash -> Secure -> Build -> Windfall custody | CLEARS ledger custody; Build unit defect remains TMA-017-02 |
| Roth / Traditional / SIMPLE / HSA / workplace evaluator regressions | no separate evaluator regression identified |
| protected FFH-013 M01 | **CLEARS EXACTLY** |
| Financial Engine Reconciliation Gate | **DOES NOT CLEAR** |

## Test sufficiency conclusion

The FFH-017 test surface covers many happy and adversarial cases: known-fact OUTRANK/BELOW/CO_PRIORITY, sufficient/scarce ties, one-cent proportional allocation, input reversal, protected floor, missing facts, core/excess separation, and monthly aggregate equality.

It is not sufficient for closure because the direct tests encode/omit all three blocking boundaries:

1. the missing-goal test expects the whole competition to fail closed and does not test policy Scenario 14 or irrelevant missing Optional-goal facts;
2. aggregate/destination tests compare monthly totals only and never assert that a non-tied monthly route reconciles exactly back to annual ledger cents at the `$0.06` boundary;
3. the desired-excess test proves only that excess is not elevated into core; it never requires the separate BELOW excess tranche or its residual-capacity allocation.

The test-only legacy fixture adapter also fills missing legacy goal facts, so green legacy suites do not prove production Scenario 14 behavior.

## Manager blocking condition

Manager closure of FFH-017 is blocked by TMA-017-01, TMA-017-02, and TMA-017-03.

Required remediation should remain bounded to FFH-017 semantics:

- localize missing-information effects to only requests/tradeoffs whose outcome can change;
- use one exact annual-to-monthly recurring authority for ordinary non-tied retirement destinations, with integer-cent legal reconciliation equivalent to the protected FFH-013 recurring path;
- represent and route desired/excess as its own BELOW additional-retirement recurring tranche rather than informationally dropping it;
- add direct adversarial tests for legacy/unrelated missing facts, Optional irrelevant financing uncertainty, `$0.06` annual-room conversion, and desired-excess residual routing;
- correct the stale pre-handoff CI job ID in Manager-owned control-plane records separately.

Do not close FFH-017 or activate downstream work until bounded remediation is integrated, refrozen, and the required independent audit gates are re-run.
