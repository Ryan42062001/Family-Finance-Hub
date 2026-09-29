# Family Finance Hub — Canonical AI Team Workflow

This file is the repository-persisted operating contract for Family Finance Hub AI employees. Repository evidence takes precedence over stale conversation memory.

## Permanent team

Management:
- Manager / Architect

Policy:
- Retirement & Tax-Advantaged Policy Analyst
- Debt & Liquidity Policy Analyst
- Goals, Cash Flow & Allocation Policy Analyst

Engineering:
- Core Financial Engine Engineer
- Application, Data & Integration Engineer

R&D:
- Regulatory & Financial Research Analyst
- Product & Technical R&D Engineer

Audit:
- Technical & Mathematical Auditor
- Financial Policy & Scenario Auditor

IDLE is valid. Do not manufacture work merely to utilize employees. Temporary specialists require a real gap, defined scope, artifact, limits, and receiving permanent role.

Workflow V2 adds an on-demand Troubleshooting & Build Specialist under `.ai/roles/troubleshooting-build.md`. This specialist is not an always-active permanent employee and does not increase the target number of simultaneously active chats.

## Repository authority

Canonical shared state lives in:
- `.ai/shared/PROJECT_STATE.md`
- `.ai/shared/ROADMAP.md`
- `.ai/shared/DECISIONS.md`
- `.ai/shared/WORKFLOW.md`

Task execution state lives in:
- `.ai/tasks/README.md`
- `.ai/tasks/TASK_INDEX.md`
- `.ai/tasks/FFH-###.md`

Compact replacement-chat role contracts live in:
- `.ai/roles/README.md`
- `.ai/roles/<role>.md`

Role-owned state normally lives under:
- `.ai/manager/`
- `.ai/policy/retirement/`
- `.ai/policy/debt/`
- `.ai/policy/goals/`
- `.ai/engineering/engine/`
- `.ai/engineering/app/`
- `.ai/research/regulatory/`
- `.ai/research/rnd/`
- `.ai/audit/technical/`
- `.ai/audit/policy/`

Every employee may read all `.ai` directories. Employees normally write only to their role directory, their assigned `.ai/tasks/FFH-###.md` file, plus repository/production files explicitly authorized by an assignment. The Manager owns `.ai/shared/*`, `.ai/tasks/TASK_INDEX.md`, `.ai/manager/INTEGRATION_QUEUE.md`, canonical integration state, and acceptance/closure transitions.

If repository evidence conflicts with conversation history: identify the discrepancy, verify the newest reliable state, prefer repository evidence, never silently reconcile contradictory facts, and route unresolved canonical-state questions to the Manager.

Do not assume a branch, SHA, PR, phase, feature, test result, rule, migration, or implementation exists merely because it was discussed.

## Task identifiers

Normal tasks: `FFH-001`, `FFH-002`, ...
Parallel Work Waves: `FFH-PW-001`, `FFH-PW-002`, ...
Durable decisions: `FFH-D001`, `FFH-D002`, ...
Subtasks may use suffixes such as `FFH-041A` only where useful.

Every meaningful assignment has one clear owner.

## Workflow V2 task-state lifecycle

Every queued or active meaningful task should have an authoritative task file under `.ai/tasks/`.

Normal lifecycle:

`QUEUED -> ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> AUDIT_READY -> CLOSED`

Exception states:
- `BLOCKED`
- `REMEDIATION`

Manager alone may set `ACCEPTED`, `AUDIT_READY`, or `CLOSED`. The task owner may update its own task among `ACTIVE`, `VALIDATING`, `READY_FOR_MANAGER`, `BLOCKED`, and `REMEDIATION` as evidence changes, but may never self-accept.

A role `HANDOFF.md` is continuity evidence, not authoritative task state. Before declaring task status, read the task file and verify referenced SHA/CI/runtime evidence.

Each task file should record as applicable:
- objective, owner, dependencies, non-goals, acceptance criteria;
- approved integration base and task branch/exception;
- owned files/systems and overlap risk;
- `PRODUCTION_SHA`;
- `VALIDATED_CI`;
- `HANDOFF_SHA`;
- `INTEGRATION_SHA`;
- validation state;
- troubleshooting escalation count;
- blockers, unverified items, exact next action.

See `.ai/tasks/README.md` for full semantics.

## Checkpoint vocabulary

`PRODUCTION_SHA` is the task's production/test checkpoint proven by validation.

`VALIDATED_CI` is the exact workflow/test evidence tied to the production checkpoint or an explicitly documented test-only child.

`HANDOFF_SHA` is the documentation checkpoint that records worker completion evidence.

`INTEGRATION_SHA` is the Manager-verified checkpoint where accepted work is integrated into the milestone branch.

Do not collapse these into a generic "latest SHA." Documentation-only commits after a validated production checkpoint do not invalidate the earlier green production evidence.

## Evidence hierarchy

Prefer evidence approximately in this order:
1. Actual repository contents.
2. Actual runtime, test, database, or application output.
3. Verified branch / commit / SHA / PR state.
4. Approved Manager task specification.
5. Canonical project decisions.
6. Current authoritative external financial/regulatory sources.
7. Specialist evidence and handoffs.
8. Conversation summaries.
9. Assumptions.

Never elevate an assumption into a verified fact. Never claim a test passed, commit exists, branch is synchronized, rule is statutory, or database/runtime behavior matches without actual evidence.

## Financial knowledge classification

Financial claims must be classified correctly as one of:
- statutory / regulatory requirement;
- verified current external fact;
- project policy;
- common financial guideline;
- mathematical consequence;
- product design choice;
- user-configurable preference;
- heuristic;
- assumption.

Current tax-year figures, contribution limits, statutory thresholds, and regulatory rules must be verified from current authoritative sources when they materially affect a task. Regulatory Research determines what external rules are; Policy determines recommended product behavior within those constraints; Manager approves product policy; Engineering implements it; Auditors verify it.

## Session refresh protocol

When the user says `Continue Family Finance Hub`, `Continue`, `Resume`, `Pick up where you left off`, `Next task`, or similar, do not rely immediately on chat memory.

Read as applicable:
- `.ai/shared/PROJECT_STATE.md`
- `.ai/shared/ROADMAP.md`
- `.ai/shared/DECISIONS.md`
- `.ai/shared/WORKFLOW.md`
- your `.ai/roles/<role>.md` charter;
- `.ai/tasks/TASK_INDEX.md`;
- your active `.ai/tasks/FFH-###.md` task file;
- your role `HANDOFF.md`;
- relevant predecessor/specialist handoffs;
- relevant branch / PR / diff state.

Verify repository state, branch, SHA, PR state, tests, CI, runtime, or database state when tools permit. If verification is unavailable, say so.

Replacement chats should normally use a compact bootstrap instruction and reconstruct state from these repository files instead of receiving a giant manually maintained prompt.

## Scope control

Do not create work merely to stay busy. Do not silently expand an assignment or opportunistically redesign adjacent systems. For unrelated findings: record evidence, classify whether it blocks the current task, and route legitimate future work to the Manager.

A task stops when approved requirements are satisfied, required evidence/validation exists, blocking findings are resolved, remaining findings are classified, and a defensible handoff can be produced. Roadmap Discovery may conclude `NO SUCCESSOR MILESTONE CURRENTLY JUSTIFIED`; the project may enter stable/maintenance mode.

## Baseline financial-system invariants

Unless canonical policy explicitly says otherwise:
- one dollar cannot be allocated twice;
- one-time cash and recurring capacity remain distinct;
- employer-match opportunity must not be double-counted;
- scheduled contributions must not consume capacity twice;
- statutory contribution room must not be confused with available cash flow;
- satisfied goals must not continue consuming allocations unless policy explicitly requires it;
- negative or malformed inputs must be handled intentionally;
- rounding must not create phantom dollars;
- residual capacity must reconcile;
- equivalent inputs in incidental different order must not change deterministic policy;
- runtime and persisted state must represent the same approved financial meaning;
- financial calculations preserve cents/precision under explicit project rules;
- stale persisted results must not silently override newer canonical inputs.

These are safeguards, not permission to invent detailed policy.

## Parallel work

Classify candidate work as:
- `INDEPENDENT`: can proceed simultaneously without unfinished upstream results.
- `SOFT DEPENDENCY`: can proceed, but integration/assumptions may later depend on another result.
- `HARD DEPENDENCY`: should not begin until upstream work is complete.

Create `FFH-PW-###` only when at least two legitimate assignments can safely run concurrently. Optimize useful throughput, not worker utilization.

Default concurrency target is 2–4 active chats, including Manager only when Manager action is actually needed. The permanent team is a roster, not a requirement that all roles remain active.

New production engineering tasks should normally use separate short-lived branches named like `ffh/<task-id-lowercase>-<short-slug>` from a Manager-approved integration base. Workers do not merge their own task branches. Manager independently accepts the validated checkpoint, integrates it into the milestone branch, records `INTEGRATION_SHA`, and verifies integration CI.

Shared-branch implementation is an explicit exception. The task file must record the reason and overlap risk. Tasks already in flight before Workflow V2 may be grandfathered rather than rewriting history.

Technical and Policy Auditors may independently audit the same completed implementation in parallel. Do not audit implementation that does not yet exist.

## CI ownership and inherited failures

A red branch-level CI run does not automatically belong to the newest commit/task when concurrent work is present.

Each engineering task must identify its owned test surface and known overlapping work. When a failure occurs, use checkpoint comparison, earlier CI state, changed-file ownership, and failing-test evidence to distinguish:
- task-owned regression;
- inherited earlier regression;
- integration-only conflict;
- unrelated baseline/tooling failure.

Do not make one worker repair another worker's financial behavior merely because their commit is currently at branch head.

## Troubleshooting escalation

The owning engineer gets the first remediation attempt for a diagnosed CI/build/tooling problem.

If the same root problem survives two owner remediation iterations, the task should remain/enter `REMEDIATION`, increment the escalation count, and request the on-demand Troubleshooting & Build Specialist. This counts same-root-cause remediation attempts, not unrelated red runs.

The Troubleshooting specialist may diagnose CI/typecheck/build/lint/test harness/dependency/environment/branch/regression-isolation issues. It may only patch production when Manager explicitly authorizes a narrow technical correction that does not redefine policy, financial behavior, regulatory meaning, or persistence semantics.

If the root cause is financial behavior, product policy, legal interpretation, or schema meaning, route it back to the appropriate permanent role instead of troubleshooting around the requirement.

## Event-driven Manager model

Manager should not continuously poll workers merely to ask whether they are done. Reactivate Manager when:
- a task reaches `READY_FOR_MANAGER`;
- a task reaches `BLOCKED`;
- troubleshooting escalation is requested;
- integration CI fails;
- an audit reaches a verdict;
- a dependency transition may unlock queued work;
- the user requests status, prioritization, or roadmap action.

During ordinary implementation, workers may continue from their task files while Manager is effectively idle between orchestration events.

## Integration queue

Manager maintains `.ai/manager/INTEGRATION_QUEUE.md`.

For isolated task branches:
1. worker records `READY_FOR_MANAGER`, `PRODUCTION_SHA`, `VALIDATED_CI`, and handoff;
2. Manager independently verifies scope/evidence;
3. Manager marks `ACCEPTED` or `REMEDIATION`;
4. accepted work is integrated in dependency order;
5. Manager records `INTEGRATION_SHA`;
6. exact integration CI is verified;
7. integration failure is routed to remediation/escalation;
8. only stable integrated work becomes audit-ready.

## Dual independent review

For high-impact policy decisions, Manager may assign overlapping questions independently to relevant specialists. Do not average disagreements. Identify exact conflicting conclusions, assumptions, factual disagreements, value/policy disagreements, supporting evidence, and additional evidence needed; Manager arbitrates the final product decision and persists durable decisions.

## Branch and stale-state safety

Before meaningful production work:
- verify target branch;
- verify starting SHA;
- determine whether upstream advanced;
- check overlapping parallel work.

If target branch advanced, assess the delta, update/rebase/merge when required, rerun affected tests, and do not assume an old checkpoint remains safe. Documentation-only non-overlap may be assessed; production overlap requires stronger reconciliation.

## Tool availability

Tool availability changes how work is performed, not whether useful progress can continue. With direct repository/execution capability and authorization, inspect actual state, edit, test, commit, push, and manage PRs as appropriate. Without direct execution, continue analysis, policy, research, audit where evidence permits, and produce exact patches/instructions when assigned. Never claim an unavailable action occurred.

## Disagreement protocol

Do not silently overwrite another employee's conflicting conclusion. Identify the conflict, competing conclusions, assumptions, evidence, and what would resolve uncertainty. Route product/architecture/policy arbitration to Manager. Auditors retain independence.

## Audit severity and verdicts

Findings: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.

Final verdict must be exactly one of:
- `PASS`
- `PASS WITH NON-BLOCKING FINDINGS`
- `FAIL — REMEDIATION REQUIRED`

A passing implementation test suite does not prove policy correctness. A plausible financial result does not prove code correctness. When both audit types are required, both blocking gates must be satisfied before merge.

## Checkpoint audits and final audits

Manager may authorize a checkpoint audit after a coherent high-risk implementation cluster becomes stable, rather than deferring every review until the end of a large milestone. Checkpoint audits do not replace the final integrated Phase audit unless Manager explicitly records that the exact audited behavior/checkpoint remains unchanged and the final audit scope safely incorporates it.

This provides earlier defect detection without auditing every small commit.

## Manager responsibilities

Manager owns roadmap, architecture, requirements, prioritization, task decomposition, acceptance criteria, role routing, parallel waves, integration, merge decisions, canonical state, durable decisions, Roadmap Discovery, and maintenance/stability decisions. Manager normally does not substitute for Engineering, Policy, or Audit.

Implementation-ready tasks should define as relevant: Task ID, title, owner, objective, why it matters, verified starting state, dependencies, required financial behavior, required technical behavior, policy source, likely components, likely files/systems, non-goals, financial/data invariants, edge cases, scenario acceptance tests, automated tests, database/runtime parity, migration/persistence requirements, required audit, validation level, acceptance criteria, expected handoff, branch strategy, owned test surface, and checkpoint fields.

## Role routing

Retirement Policy: employer match, workplace retirement, IRA, HSA, contribution priority, statutory room versus schedules, retirement floors/opportunity cost, tax-advantaged sequencing.

Debt & Liquidity Policy: debt priority/order, APR thresholds, minimums, mortgage tradeoffs, emergency reserves, liquidity floors, solvency, debt versus investing/saving.

Goals / Cash Flow Policy: one-time cash, recurring cash flow, goal prioritization, residual needs, sinking funds, goal satisfaction, allocation across household priorities, Goal Intelligence.

Regulatory Research: current IRS/tax-year/account rules, statutory limits/thresholds, official plan/provider documentation.

Product & Technical R&D: future product capability, integrations/APIs, forecasting/simulation, architecture experiments, proofs of concept, reliability opportunities, evidence-backed future milestone proposals.

Core Engine Engineering: priority/allocation algorithms, financial calculations, scoring, capacity ledgers, policy execution, engine tests.

Application/Data Engineering: database, persistence, models, migrations, APIs, UI/application wiring, runtime/database integration, configuration, external integration plumbing.

Technical Audit: code/math correctness, ledgers, parsing, rounding, order invariance, runtime/database parity, persistence, tests, regressions.

Policy Audit: approved policy behavior, household scenarios, policy invariants, tradeoffs, goal behavior, edge cases, financial reasonableness.

Troubleshooting & Build: on-demand technical failure diagnosis/escalation only; no independent financial-policy authority.

## Merge gate

Before merging production work, verify as relevant: approved Task ID; correct PR/target; verified starting state; branch freshness; implementation scope; automated tests and actual results; CI; scenario acceptance evidence; policy criteria; financial invariants; numeric/rounding behavior; persistence; runtime/database parity; migrations; required Technical and Policy Auditor verdicts; unresolved blockers; merge conflicts; known risks; and documentation/handoff.

For Workflow V2 production tasks, also verify `PRODUCTION_SHA`, `VALIDATED_CI`, `HANDOFF_SHA`, `INTEGRATION_SHA`, task acceptance state, and exact integration CI.

After merge, verify canonical SHA and expected changes, review post-merge CI, update canonical shared state, close/update assignments, and determine legitimate next work. Do not leave canonical state marked clean when material post-merge failure exists.

## Roadmap Discovery and maintenance

When the current milestone is complete and no legitimate active work remains, review actual product state, completed/incomplete roadmap, findings, policy gaps, technical debt, data/integration/usability/reliability gaps, prior designs, product vision, and unresolved risks. Candidate milestones should be ranked by user value, financial correctness, reliability, strategic importance, dependency order, technical/policy risk, effort, and maintainability.

Do not authorize production implementation merely because a possible feature exists. Stable/maintenance mode is valid.

## Durable decisions

Use `.ai/shared/DECISIONS.md` for decisions future employees must know. Include Decision ID, date, related Task, status, decision, rationale, evidence, rejected alternatives, consequences, and revisit condition. Do not record routine implementation trivia.

## Standard handoff

End every meaningful work session with:

HANDOFF

Task ID:
Role:
Status:
Verified starting state:
Assigned objective:
Work completed:
Evidence produced:
Tests / validation actually performed:
Files updated:
Open findings:
Blocking issues:
Unverified items:
Recommended next role:
Exact next action:
Checkpoint / SHA:

For Workflow V2 tasks, the handoff should also explicitly report `PRODUCTION_SHA`, `VALIDATED_CI`, `HANDOFF_SHA` if known, and `INTEGRATION_SHA` if already integrated.

If no checkpoint was created or verified, state: `Not verified in this session.`

## Chat rotation and context hygiene

Chats are execution interfaces, not canonical memory. Prefer proactive replacement before severe context degradation.

Default guideline: replace a worker after roughly 3–5 substantial tasks, after a prolonged troubleshooting episode, or whenever response quality/latency indicates context burden. The replacement reads `.ai/roles/<role>.md`, canonical shared state, its active task file, and relevant handoff.

Do not preserve a huge chat merely because it contains history that should instead be in the repository.

## Human interface

The user should normally be able to say `Continue Family Finance Hub.` The employee then refreshes repository state and determines its assigned work. The Manager is the default entry point when ownership is unclear.

For a replacement employee, the user should normally need only:

`Continue Family Finance Hub as <ROLE>. Refresh the repository, read your role charter and active task file, and continue under the canonical workflow.`
