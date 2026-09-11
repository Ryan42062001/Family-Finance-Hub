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

`Continue Family Finance Hub as <ROLE>. Refresh the repository. Read .ai/shared/WORKFLOW_V3.md, .ai/shared/WORKFLOW.md, your .ai/roles/<role>.md charter, .ai/tasks/TASK_INDEX.md, your active task file, relevant canonical decisions, and your role HANDOFF.md. Execute only the assigned task under the canonical workflow. If no task is assigned, remain IDLE.`

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

For every newly created meaningful task, Manager should assess whether **ChatGPT Work mode** would materially accelerate execution.

Classify the task as one of:

### `STANDARD_CHAT`
Normal chat + repository/web/tooling is sufficient. Work mode is unlikely to save meaningful time.

Typical examples:
- focused financial-policy analysis;
- narrow regulatory verification;
- scoped code review;
- small isolated implementation;
- audit of a well-bounded checkpoint.

### `WORK_MODE_PREFERRED`
Work mode would likely save meaningful time because the task benefits from sustained multi-step repository navigation, repeated edits/tests, browser/runtime interaction, evidence gathering, or broad cross-file inspection.

Typical examples:
- multi-file implementation;
- substantial refactor/test cycles;
- live Supabase/runtime parity verification;
- complex integration investigation;
- broad repository audit/reconciliation;
- large evidence-gathering tasks.

### `WORK_MODE_HIGH_VALUE`
Work mode is expected to provide major acceleration because the task is long-running, highly interactive, browser/database heavy, or requires many sequential tool steps.

This classification is a recommendation, **not a dependency**.

## Work-credit fallback

Any `WORK_MODE_PREFERRED` or `WORK_MODE_HIGH_VALUE` task must include a normal-chat fallback whenever the underlying work can still be completed without Work mode.

If Work credits are exhausted or Work mode is unavailable:
- do not mark the project blocked merely because the accelerator is unavailable;
- continue through normal ChatGPT execution, exact patches/commands, repository tools, web research, or user-returned runtime evidence as appropriate;
- split work into smaller sequential steps if needed;
- block only the exact step that truly requires an unavailable capability.

Manager activation should surface:
- `EXECUTION MODE: STANDARD_CHAT | WORK_MODE_PREFERRED | WORK_MODE_HIGH_VALUE`
- `FALLBACK: ...` when Work mode is preferred/high-value.

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
- fallback when Work mode is preferred/high-value.

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