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

`Continue Family Finance Hub as <ROLE>. Refresh the repository. Read .ai/shared/WORKFLOW_V3.md, .ai/shared/WORKFLOW.md, your .ai/roles/<role>.md charter, .ai/tasks/TASK_INDEX.md, your active task file, relevant canonical decisions, and your role HANDOFF.md. Then execute only the assigned task from repository evidence. If no task is assigned, remain IDLE.`

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

## Work mode

Manager classifies new meaningful tasks as:
- `STANDARD_CHAT`
- `WORK_MODE_PREFERRED`
- `WORK_MODE_HIGH_VALUE`

Work mode is an accelerator, not a required dependency. Any Work-preferred/high-value task should include a normal-chat fallback whenever the underlying task can still be completed without Work mode.

Work Helper recovery tasks are usually `WORK_MODE_HIGH_VALUE` when they involve repeated repository/test/CI/runtime iterations.

## Context hygiene

Do not preserve a huge chat merely because it contains history that belongs in GitHub. Replace chats proactively when responsiveness or context quality degrades. Newly created task chats reconstruct state from canonical files rather than carrying forward large manual summaries.