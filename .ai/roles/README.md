# Family Finance Hub — Role Charters

These compact role files let replacement chats bootstrap from the repository instead of depending on long manually maintained prompts.

## Fresh-chat bootstrap

A replacement chat should receive only a short instruction such as:

`Continue Family Finance Hub as <ROLE>. Refresh the repository. Read .ai/shared/WORKFLOW.md, your .ai/roles/<role>.md charter, .ai/tasks/TASK_INDEX.md, your active task file, relevant canonical decisions, and your role HANDOFF.md. Then continue the assigned task from repository evidence.`

The repository, task file, and verified runtime/CI evidence outrank the replacement prompt.

## Permanent roles

- `manager.md`
- `retirement-policy.md`
- `debt-liquidity-policy.md`
- `goals-cashflow-policy.md`
- `core-engine.md`
- `application-data.md`
- `regulatory-research.md`
- `product-rnd.md`
- `technical-audit.md`
- `policy-audit.md`

## On-demand escalation specialist

- `troubleshooting-build.md`

Troubleshooting & Build is not an always-active permanent employee. It is activated only under the Workflow V2 escalation rule or an explicit Manager assignment.

## Rotation guideline

Replace chats proactively after roughly 3–5 substantial tasks, after a prolonged troubleshooting episode, or when responsiveness/context quality degrades. A fresh chat should reconstruct state from GitHub rather than carrying forward large conversational summaries.
