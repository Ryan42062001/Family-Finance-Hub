# Family Finance Hub — Workflow V3 Operating Overlay

Status: APPROVED / CANONICAL OPERATING OVERLAY / CONTROL-PLANE ONLY
Task: FFH-019
Base workflow: `.ai/shared/WORKFLOW.md` (Workflow V2 safeguards remain in force)

This file is the Workflow V3 operating overlay for **Family Finance Hub**, the personal-finance website/application. It changes how the AI team is organized and activated; it does not change financial policy, production behavior, task lifecycle semantics, checkpoint vocabulary, branch safety, integration gates, or audit standards unless this file explicitly says so.

If this overlay conflicts with Workflow V2 on chat lifecycle, workforce presentation, or execution-mode routing, this overlay wins after Manager acceptance. All other Workflow V2 rules remain authoritative.

## Project identity boundary

Do not confuse this repository with the user's other projects:
- **Family Finance Hub** = personal-finance website/application.
- **The War Room** = live fantasy-football draft assistant.
- **The Chip Winner** = in-season fantasy helper.
- **ECOG website** = church website.

## Simple department model

Keep the existing specialist charters and separation of duties, but present the team as five departments rather than ten always-present employee chats:

1. **Management**
   - Manager / Architect

2. **Financial Policy**
   - Retirement & Tax-Advantaged Policy Analyst
   - Debt & Liquidity Policy Analyst
   - Goals, Cash Flow & Allocation Policy Analyst

3. **Engineering**
   - Core Financial Engine Engineer
   - Application, Data & Integration Engineer

4. **Research**
   - Regulatory & Financial Research Analyst
   - Product & Technical R&D Engineer

5. **Audit**
   - Technical & Mathematical Auditor
   - Financial Policy & Scenario Auditor

This is an operating simplification, not a merger of authority. Specialist distinctions remain real because they protect correctness and allow safe parallelism when needed.

The on-demand **Troubleshooting & Build Specialist** remains temporary and is not a sixth permanent department.

## Durable roles, disposable chats

**ROLE = DURABLE**  
**CHAT = DISPOSABLE**  
**TASK = UNIT OF WORK**  
**REPOSITORY = MEMORY**  
**MANAGER = ROUTER / INTEGRATOR**

Worker chats should normally be task-scoped. Prefer one fresh worker chat per meaningful FFH task, especially for Engineering, Policy, Research, and Audit.

Small remediation on the exact same task/branch/PR may stay in the same chat when the chat remains responsive and focused.

Manager chat may span a milestone/phase, but should normally roll over at a phase or major milestone boundary, or earlier when conversation size causes material slowdown, stale-state errors, or repetitive reasoning.

Replacement chats reconstruct state from repository evidence. Do not require the user to transfer large prior-chat summaries.

## Fresh-chat bootstrap

A fresh worker should normally receive only a compact instruction such as:

`Continue Family Finance Hub as <ROLE>. Refresh the repository. Read .ai/shared/WORKFLOW_V3_1.md, .ai/shared/WORKFLOW_V3.md, .ai/shared/WORKFLOW.md, your .ai/roles/<role>.md charter, .ai/tasks/TASK_INDEX.md, your active task file, relevant canonical decisions, and your role HANDOFF.md. Execute only the assigned task under the canonical workflow. If no task is assigned, remain IDLE.`

Repository/task/runtime/CI evidence outranks chat memory.

## Context hygiene

Start with minimum sufficient context. Do not reread the entire project history for routine task execution.

For ordinary worker startup, prioritize:
1. current milestone/integration branch and SHA;
2. `WORKFLOW_V3.md` + `WORKFLOW.md`;
3. role charter;
4. `TASK_INDEX.md`;
5. active task file;
6. role handoff;
7. relevant branch/PR/runtime/CI state;
8. only the decisions/predecessor evidence required by the task.

Broader roadmap/history review is appropriate for Manager roadmap/architecture decisions, cross-domain policy synthesis, major integration, or contradictions.

## Work-mode acceleration

`STANDARD_CHAT_HIGH` is the default execution environment. `WORK_MODE_PREFERRED` is reserved for tasks where autonomous computer/tool execution provides substantial practical benefit over a High-reasoning normal chat.

Manager applies one routing test:

> Does autonomous computer/tool execution materially reduce user interaction or execution overhead compared with Standard Chat High?

Use `STANDARD_CHAT_HIGH` when the answer is no, marginal, or uncertain. Use `WORK_MODE_PREFERRED` only when the answer is yes and the execution burden is substantial.

Reasoning difficulty, task importance, code involvement, several files, broad repository scope, GitHub dependence, or High reasoning effort do not independently justify Work mode.

Typical `STANDARD_CHAT_HIGH` work:
- management/control-plane routing;
- architecture, strategy, financial policy, requirements, and research interpretation;
- repository/GitHub inspection and PR/CI review;
- independent audits of bounded checkpoints;
- bounded implementation and straightforward remediation;
- test design and diagnosis from existing logs/evidence.

Typical `WORK_MODE_PREFERRED` work:
- sustained multi-file edit/test/debug loops;
- extensive terminal, browser, application, environment, database, or deployment interaction;
- complicated CI/toolchain recovery requiring repeated experiments;
- large mechanical edits or long autonomous execution sequences;
- tasks that would otherwise require substantial user back-and-forth to perform execution steps.

### Role defaults

Manager, Policy, Research, Audit, and Engineering roles all default to `STANDARD_CHAT_HIGH`. Work Helper also defaults to `STANDARD_CHAT_HIGH`, but its recovery scope more often produces justified Work escalations.

R&D moves to Work only for hands-on experimentation/environment interaction. Auditors move to Work only when reproducing/validating the target requires substantial active environment/browser/application execution. Builders move to Work only when implementation is execution-heavy enough to justify autonomy.

### Prepare, escalate, and de-escalate

Resolve decisions in Standard Chat High before Work whenever practical. A Work assignment should already contain exact scope, acceptance criteria, approved architecture/policy, branch/base, tests, forbidden scope, known blockers, and completion criteria.

A Standard Chat worker that discovers materially heavier execution may return `WORK_MODE_ESCALATION_RECOMMENDED` with task/branch/SHA, completed work, remaining work, justification, failures, tests, required validation, and exact next action.

A Work worker whose remaining work is primarily reasoning/review/audit/policy should return `STANDARD_CHAT_HIGH_HANDOFF_RECOMMENDED` with enough evidence to continue without repeating execution.

### Work-credit fallback

Work mode is an accelerator, not a dependency unless the task identifies a capability that truly cannot be reproduced through normal tools. If Work is unavailable, continue in `STANDARD_CHAT_HIGH` as far as reasonably possible and block only the exact unavailable capability.

Manager activation should surface:
- `EXECUTION MODE: STANDARD_CHAT_HIGH | WORK_MODE_PREFERRED`;
- a one-sentence Work-mode justification when preferred;
- a Standard Chat High fallback when meaningful.

Historical terminal task files may retain legacy execution labels as history; new/current routing uses only the two modes above.

## Workforce activation

Do not present the ten-role roster as ten chats the user must keep alive.

Manager should activate only the smallest set of specialists needed for the current dependency graph. The existing default concurrency target of 2–4 active chats remains appropriate.

`ACTIVATE NOW` should list:
- Manager status;
- only specialists that are ACTIVE, BLOCKED, or newly relevant;
- department/role;
- FFH task ID;
- execution mode;
- short paste-ready activation message;
- fallback when Work mode is preferred.

IDLE specialists may be summarized compactly by department rather than individually when no action is required.

## Specialist routing remains unchanged

Retirement, Debt/Liquidity, and Goals/Cash Flow remain separate policy authorities.

Core Engine and Application/Data remain separate engineering authorities. Do not combine them merely for simplicity; they may safely run in parallel when tasks are independent, as current FFH work has demonstrated.

Regulatory Research and Product R&D remain distinct capabilities. Regulatory Research establishes current external rules; Product R&D explores future capabilities/architecture.

Technical Audit and Policy Audit remain independent. High-impact financial work may require both. Do not collapse one into the other.

## Troubleshooting remains on-demand

Keep the existing Workflow V2 Troubleshooting & Build escalation semantics. The specialist is temporary, fresh-context, and narrowly scoped.

Do not activate Troubleshooting merely because CI is red. Attribute failures first and count actual same-root owner remediation attempts according to Workflow V2.

## Handoffs

Keep handoffs concise. A handoff is a continuity pointer, not an encyclopedia.

Detailed evidence belongs in task files, audit reports, research artifacts, CI/runtime output, PR descriptions, and dedicated analysis documents. Handoffs should summarize status, checkpoint evidence, blockers, unverified items, and exact next action while pointing to detailed evidence.

## What V3 intentionally preserves

Workflow V3 does **not** simplify away:
- task-file authority;
- `PRODUCTION_SHA`, `VALIDATED_CI`, `HANDOFF_SHA`, `INTEGRATION_SHA` distinctions;
- financial-system invariants;
- policy classification discipline;
- current authoritative regulatory verification;
- branch/stale-state safety;
- CI ownership/inherited-failure attribution;
- Manager integration queue;
- dual independent audits;
- troubleshooting escalation;
- event-driven Manager behavior;
- audit severity/verdict contracts;
- merge gates;
- Roadmap Discovery / maintenance mode.

These controls are justified for a financial application.

## Transition rule

Do not interrupt or rewrite currently active FFH tasks merely to adopt V3. Existing task IDs, branch/checkpoint evidence, and in-flight remediation remain valid.

Workflow V3 is Manager-accepted and canonical for workforce presentation, chat lifecycle, execution-mode routing, and replacement-chat bootstrapping. Workflow V2 remains authoritative for all preserved task, financial, integration, troubleshooting, and audit safeguards.