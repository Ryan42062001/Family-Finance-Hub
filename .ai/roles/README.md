# Family Finance Hub — Role Charters

These compact role files let replacement chats bootstrap from the repository instead of depending on long manually maintained prompts.

## Workflow V3 operating model

Family Finance Hub uses a simple five-department presentation while preserving specialist authority:
- Management
- Financial Policy
- Engineering
- Research
- Audit

The existing specialist role files remain the actual capability boundaries. The department model is for simpler activation and chat management, not for collapsing responsibilities.

Roles are durable; chats are disposable. Prefer one fresh worker chat per meaningful task. Small remediation on the exact same task/branch/PR may stay in the same chat while it remains responsive and focused.

Manager chats may span a milestone/phase but should roll over at major phase boundaries or earlier when context size materially degrades speed, focus, or state accuracy.

## Fresh-chat bootstrap

A replacement chat should normally receive only a short instruction such as:

`Continue Family Finance Hub as <ROLE>. Refresh the repository. Read .ai/shared/WORKFLOW_V3_1.md, .ai/shared/WORKFLOW_V3.md, .ai/shared/WORKFLOW.md, your .ai/roles/<role>.md charter, .ai/tasks/TASK_INDEX.md, your active task file, relevant canonical decisions, and your role HANDOFF.md. Then execute only the assigned task from repository evidence. If no task is assigned, remain IDLE.`

The repository, task file, and verified runtime/CI evidence outrank the replacement prompt.

## Permanent specialist roles

Management:
- `manager.md`

Financial Policy:
- `retirement-policy.md`
- `debt-liquidity-policy.md`
- `goals-cashflow-policy.md`

Engineering:
- `core-engine.md`
- `application-data.md`

Research:
- `regulatory-research.md`
- `product-rnd.md`

Audit:
- `technical-audit.md`
- `policy-audit.md`

## Dedicated on-demand recovery role

- `work-helper.md` — Work Helper / Super Troubleshooter

Work Helper has dedicated repository memory under `.ai/work-helper/` and follows `.ai/shared/WORK_HELPER_OVERLAY.md`.

It is not a sixth permanent department or an always-active employee. Manager may activate it directly whenever a difficult technical recovery benefits from fresh cross-cutting diagnosis. Two failed owner attempts are a strong signal, not a mandatory prerequisite.

Legacy `troubleshooting-build.md` is retained only as a compatibility pointer and is not a separate role.

## Execution mode defaults

Canonical forward-looking modes are:
- `STANDARD_CHAT_HIGH`
- `WORK_MODE_PREFERRED`

Every role defaults to `STANDARD_CHAT_HIGH`. Work mode is not a seniority or difficulty tier; it is an execution accelerator.

Role defaults:
- Manager / Architect — `STANDARD_CHAT_HIGH`
- Financial Policy roles — `STANDARD_CHAT_HIGH`
- Core Engine / Application & Data Engineering — `STANDARD_CHAT_HIGH`
- Regulatory / Product R&D — `STANDARD_CHAT_HIGH`
- Technical / Policy Audit — `STANDARD_CHAT_HIGH`
- Work Helper — `STANDARD_CHAT_HIGH` by default, with a higher likelihood of justified Work escalation for execution-heavy recovery

Use `WORK_MODE_PREFERRED` only when autonomous computer/tool execution materially reduces user interaction or execution overhead and the execution burden is substantial. Multi-file scope, GitHub use, importance, or conceptual difficulty alone are insufficient.

Standard workers may return `WORK_MODE_ESCALATION_RECOMMENDED`; Work workers may return `STANDARD_CHAT_HIGH_HANDOFF_RECOMMENDED`. Both handoffs must preserve task/branch/SHA, completed work, remaining work, evidence/tests, blockers, and exact next action.

## Context hygiene

Do not preserve a huge chat merely because it contains history that belongs in GitHub. Replace chats proactively when responsiveness or context quality degrades. Newly created task chats reconstruct state from canonical files rather than carrying forward large manual summaries.

## Mandatory handoff footer — full workforce Next Activation

Every durable employee role and Work Helper must end meaningful handoffs with the Workflow V3.1 full-workforce `Next Activation` table.

The table always contains all 11 canonical roles:
1. Manager / Architect
2. Retirement & Tax-Advantaged Policy Analyst
3. Debt & Liquidity Policy Analyst
4. Goals, Cash Flow & Allocation Policy Analyst
5. Core Financial Engine Engineer
6. Application, Data & Integration Engineer
7. Regulatory & Financial Research Analyst
8. Product & Technical R&D Engineer
9. Technical & Mathematical Auditor
10. Financial Policy & Scenario Auditor
11. Work Helper / Super Troubleshooter

Workers must classify every role truthfully. Workers may recommend Manager review but may not self-authorize downstream work or omit idle/blocked roles. Manager alone may use `ACTIVATE NOW` after live-state verification.

The goal is that the user can scan one table and know the status of the entire AI workforce without asking which employee should be opened next.
