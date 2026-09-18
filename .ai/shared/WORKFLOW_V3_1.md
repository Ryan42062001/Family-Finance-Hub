# Family Finance Hub — Workflow V3.1 Determinism Overlay

Status: APPROVED / CANONICAL OPERATING OVERLAY / CONTROL-PLANE ONLY
Task: FFH-027
Base workflow: `.ai/shared/WORKFLOW_V3.md` + `.ai/shared/WORKFLOW.md`

This overlay tightens control-plane determinism without changing financial policy, production behavior, specialist authority, or the five-department operating model.

Future Manager activation prompts and replacement-chat bootstraps should include `.ai/shared/WORKFLOW_V3_1.md` in addition to `.ai/shared/WORKFLOW_V3.md` and `.ai/shared/WORKFLOW.md`. Repository/task/runtime/CI evidence remains authoritative over chat memory.

## 1. Machine-checkable task state

New tasks should use `Schema: FFH_TASK_V1` and the template in `.ai/tasks/TASK_TEMPLATE.md`.

All task states must remain within the canonical lifecycle:
`QUEUED`, `ACTIVE`, `VALIDATING`, `READY_FOR_MANAGER`, `ACCEPTED`, `AUDIT_READY`, `CLOSED`, `BLOCKED`, `REMEDIATION`.

Do not create ad hoc lifecycle states such as `READY_FOR_MANAGER_VERIFICATION`. Put finer-grained gate detail in `Activation`, `AUDIT_STATUS`, `Next action`, or Manager Integration Record fields instead.

`TASK_INDEX.md` is still a Manager-maintained dashboard/cache, but its task state must match the authoritative task file at committed checkpoints. Temporary in-edit drift is acceptable; committed control-plane drift is not.

Run `npm run ai:validate-state` before accepting control-plane changes. CI also runs this validator.

## 2. Manager Integration Record

Every `FFH_TASK_V1` task carries one compact Manager Integration Record with:
- `PRODUCTION_SHA`
- `VALIDATED_CI`
- `HANDOFF_SHA`
- `INTEGRATION_SHA`
- `MANAGER_VERDICT`
- `AUDIT_STATUS`

These fields remain semantically distinct. `N/A — <reason>` is allowed for verification-only or control-plane tasks where a production checkpoint is not meaningful.

A worker reaching `READY_FOR_MANAGER` is not equivalent to Manager acceptance. A merged PR is not equivalent to Manager acceptance. An integrated checkpoint is not automatically audit-ready. Closure requires the task's required audit/validation gates plus Manager disposition.

## 3. Merge-versus-acceptance lifecycle

Preferred production flow:
`ACTIVE -> VALIDATING -> READY_FOR_MANAGER -> ACCEPTED -> integrate/merge -> AUDIT_READY -> CLOSED`.

When a task must be integrated before final acceptance evidence is available, record that explicitly in the Manager Integration Record and keep the lifecycle state at the narrowest truthful gate. Never use PR merge state as a substitute for task state.

## 4. CI failure ownership registry

Manager owns `.ai/manager/KNOWN_CI_DEBT.md`.

Known inherited failures receive stable `CI-###` identifiers with exact failure identity, ownership basis, last verified checkpoint, and closure gate. Tasks should reference these IDs instead of repeatedly copying ambiguous prose.

A known-debt entry never excuses new failures. If failure identity changes, re-attribute from evidence rather than assuming the old debt still applies.

## 5. Frozen audit packets

For high-impact audits, especially dual technical/policy audits, Manager should create or instantiate the packet structure in `.ai/audit/AUDIT_PACKET_TEMPLATE.md`.

Both auditors receive the same frozen target SHA, requirements, changed-file set, integration CI, prior findings, and known CI debt. They do not receive each other's verdicts before submitting their own.

Auditors may inspect additional evidence necessary to verify the frozen target, but may not silently switch the audited checkpoint.

## 6. Dependency-driven activation metadata

New tasks should record:
- `Activation`
- `Blocked by`
- `Next owner`
- dependency classification

These fields are routing metadata, not new authority. Manager remains the router. Workers do not activate dependent tasks merely because a prerequisite appears complete; Manager verifies the transition first.

`Activation: READY` means the dependency graph permits work to start. `Activation: ACTIVE` or `USER_AUTHORIZED` means execution is currently authorized. `Activation: BLOCKED` must name the real blocker.

## 7. Execution-mode classification and credit efficiency

Family Finance Hub has two canonical forward-looking execution classifications:
- `STANDARD_CHAT_HIGH`
- `WORK_MODE_PREFERRED`

`STANDARD_CHAT_HIGH` is the default. Work mode is a scarce execution resource and is chosen for execution leverage, not task prestige or reasoning difficulty.

For every new task and every meaningful re-routing decision, Manager must ask:

> Does autonomous computer/tool execution materially reduce user interaction or execution overhead compared with Standard Chat High?

If **NO**, use `STANDARD_CHAT_HIGH`.

If **YES** and the execution burden is substantial, use `WORK_MODE_PREFERRED`.

If the benefit is marginal, uncertain, or primarily reasoning-related, use `STANDARD_CHAT_HIGH`.

The following do **not** justify Work mode by themselves:
- importance or priority;
- conceptual difficulty;
- code-related scope;
- several files;
- GitHub dependence;
- High reasoning effort;
- architecture/policy complexity;
- broad repository reading that normal repository tools can handle.

### Role defaults

Unless the task itself demonstrates substantial autonomous-execution value:
- Manager / Control Plane: `STANDARD_CHAT_HIGH`;
- Financial Policy roles: `STANDARD_CHAT_HIGH`;
- Strategy / decision-style analysis: `STANDARD_CHAT_HIGH`;
- Regulatory and Product R&D: `STANDARD_CHAT_HIGH`;
- Technical and Policy Audit: `STANDARD_CHAT_HIGH`;
- Core Engine and Application/Data Engineering: `STANDARD_CHAT_HIGH`;
- Work Helper / Super Troubleshooter: `STANDARD_CHAT_HIGH` by default, with a higher likelihood of justified Work escalation when recovery is execution-heavy.

Use `WORK_MODE_PREFERRED` primarily for execution-heavy work such as sustained edit-test-diagnose-fix loops, extensive terminal/browser/application interaction, repeated environment manipulation, complicated CI recovery, live database/deployment work, large mechanical changes, or long autonomous experimentation that would otherwise require substantial user back-and-forth.

### Prepare before Work escalation

Whenever practical, Standard Chat High roles should resolve policy, architecture, acceptance criteria, branch/base, required tests, forbidden scope, and known blockers before Work mode begins. Work mode should execute an already-bounded task rather than research, define policy, implement, audit, and manage the same task in one session.

### Standard Chat High -> Work escalation

A Standard Chat worker may return `WORK_MODE_ESCALATION_RECOMMENDED` when actual execution proves materially heavier than expected. The handoff must include:
- task ID;
- current branch;
- exact current SHA when relevant;
- work already completed;
- remaining work;
- why autonomous execution now materially helps;
- files/components involved;
- known failures;
- tests already run;
- required validation;
- exact next action.

Manager verifies the escalation and updates routing metadata when appropriate. The Work-mode worker continues from that checkpoint; it must not restart completed investigation without cause.

### Work -> Standard Chat High de-escalation

When the remaining work becomes primarily reasoning, policy, architecture, research interpretation, audit analysis, review, or handoff, the Work-mode worker should return `STANDARD_CHAT_HIGH_HANDOFF_RECOMMENDED` with branch/SHA, completed execution, remaining reasoning work, evidence, tests, blockers, and exact next action.

The objective is maximum useful autonomous execution per Work session, not simply the fewest Work sessions.

### Legacy compatibility

Historical terminal task files may retain legacy labels `STANDARD_CHAT` or `WORK_MODE_HIGH_VALUE` as immutable workflow evidence. Do not use those labels for new or current routing. When a historical task is materially reopened, reclassify it using the two canonical modes above.

## 8. Validation compatibility rule

The state validator applies canonical state/index consistency to all current tasks. Stronger field requirements apply to `FFH_TASK_V1` tasks so historical tasks do not need mass formatting rewrites merely to adopt this overlay.

Future tasks should use `FFH_TASK_V1` unless Manager records a specific exception.

## 9. Adoption boundary

FFH-027 is control-plane only. It does not accept FFH-012, resolve FFH-020, activate Phase 6/7, change Supabase state, or alter financial calculations.

## 10. Standing workflow-improvement authority

The user has granted Manager standing authority to implement bounded workflow/control-plane upgrades whenever they materially improve determinism, reliability, auditability, task routing, prompt quality, state hygiene, observability, or execution efficiency.

Manager may make those control-plane improvements without pausing for separate per-change user approval when all of the following remain true:
- financial policy and statutory/regulatory interpretation are unchanged;
- production financial behavior is unchanged unless separately authorized through the normal task lifecycle;
- specialist role separation, Manager acceptance authority, independent audit, CI attribution, and release gates are preserved or strengthened;
- no destructive repository/database/production action is introduced;
- no live-data, secret, credential, security-boundary, external-account-permission, paid-service, or separately metered-resource action is implicitly authorized by the workflow change.

Manager should make the smallest useful upgrade, commit it to the canonical control plane, validate state consistency where applicable, and report the change after execution rather than repeatedly asking the user for permission to improve the workflow itself.

If a proposed workflow upgrade crosses any protected product, financial, security, production-data, external-account, spending, or resource-consumption boundary, the existing specialist/user authorization gate still applies.

## 11. Financial-engine reconciliation gate

Any implementation that changes money routing, monetary splitting, shared legal-capacity consumption, grouped ledgers, or annual/monthly conversion must apply `.ai/shared/FINANCIAL_ENGINE_RECONCILIATION_GATE.md`.

The worker must prove exact aggregate-to-destination reconciliation at applicable monetary boundaries. A planner/prepass and the actual router must use one authoritative reconciliation path or be proven exactly equivalent, including odd-cent and ordering cases.

Manager acceptance for such work requires an independent adversarial hand-check of at least one boundary scenario in addition to green CI. Green CI alone does not establish that routed account amounts reconcile with the aggregate amount presented by the stage.

High-impact audit packets for affected work must carry the applicable reconciliation invariants into the Technical & Mathematical audit. A reachable mismatch returns the task to `REMEDIATION`; it must not be waived with epsilon/tolerance or hidden by residual clamping.

## 12. Material control-plane audit gate

Material workflow/control-plane changes require one fresh independent Technical / Workflow audit before the governing task may remain `CLOSED`.

This gate applies when a change materially alters one or more of:
- canonical workflow semantics or lifecycle behavior;
- state validators or other machine-enforced control-plane rules;
- role authority or separation-of-duties boundaries;
- audit requirements, audit independence, or frozen-target rules;
- branch/SHA, acceptance, merge, or release controls;
- execution-mode routing defaults or escalation/de-escalation semantics;
- other governance behavior whose defect could change how production work is authorized, validated, audited, or integrated.

The gate normally does **not** apply to non-semantic wording cleanup, typo fixes, handoff refreshes, task-index synchronization, metadata corrections, prompt clarity changes, or other documentation-only maintenance that does not change authority or control behavior.

For a required control-plane audit:
- Manager freezes the exact integrated workflow/control-plane target;
- Manager provides a bounded audit packet with changed scope, intended semantics, validator/CI evidence, and preserved safeguards;
- the auditor uses a fresh independent chat in `STANDARD_CHAT_HIGH`;
- the auditor must not be the author/implementer of the target;
- the audit independently checks control-plane consistency, validator behavior where applicable, role/task/template agreement, backward-compatibility boundaries, and preservation of repository/branch/SHA/CI/audit/merge safeguards;
- green CI is evidence, not proof;
- allowed verdicts remain `PASS`, `PASS WITH NON-BLOCKING FINDINGS`, or `FAIL — REMEDIATION REQUIRED`;
- a blocking finding moves the governing task to `REMEDIATION`; Manager owns routing and closure.

A separate Financial Policy & Scenario audit is not required for control-plane-only work unless the change also alters financial policy or financial recommendation semantics.
