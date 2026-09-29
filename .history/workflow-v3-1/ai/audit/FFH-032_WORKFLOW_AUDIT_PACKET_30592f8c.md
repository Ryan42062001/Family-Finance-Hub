# FFH-032 Workflow / Control-Plane Audit Packet — `30592f8c`

Packet ID: `FFH-032-30592f8c-2026-09-18`

Task: FFH-032 — Compact Next-Activation Handoff Table  
Audit type: fresh independent workflow / control-plane audit  
Execution mode: `STANDARD_CHAT_HIGH`

## Exact audited target

`30592f8cf130293c5e875b8fd391d3bc8ded92e0`

Audit this exact integration SHA only. Later Manager/control-plane packet commits are outside the audited target.

## Candidate / integration custody

Candidate branch:
`manager/ffh-032-next-activation-table`

Exact candidate:
`6a702a6b819df15f83393f3120c9ff1a49a9f780`

PR:
#33 — FFH-032: add compact next-activation handoff table

Candidate Foundation CI:
- run `35307998098`
- job `105484045453`
- SUCCESS

Integration:
`30592f8cf130293c5e875b8fd391d3bc8ded92e0`

Candidate -> integration:
**zero changed files**

Integration Foundation CI:
- run `35308143791`
- job `105484465816`
- SUCCESS

## Intended workflow behavior

Every meaningful employee handoff should end with a compact `Next Activation` table:

| Order | Employee / Role | Status | Copy/paste activation prompt |
|---|---|---|---|
| 1 | <role> | <status> | <short complete prompt> |

Allowed statuses:
- `RECOMMEND TO MANAGER` — worker recommendation only;
- `ACTIVATE NOW` — Manager only after live-state verification;
- `WAIT` — successor identified but a real gate remains;
- `IDLE` — no activation justified.

## Required audit checks

Independently verify at minimum:

1. **Manager authority is preserved.**
   - Workers cannot self-authorize downstream work.
   - Only Manager may use `ACTIVATE NOW`.

2. **No speculative routing.**
   - Workers must not invent tasks, branches, SHAs, or unsupported downstream roles.
   - A worker awaiting acceptance/reconciliation should normally recommend Manager rather than guess the next specialist.

3. **Prompt completeness without prompt bloat.**
   - When established, activation prompt includes repository/project identity, role, task, execution mode, refresh mode, branch/frozen target, repository pointers, bounded objective, must-not boundaries, and expected return.
   - Repository pointers are preferred to copied history.

4. **WAIT / IDLE remain valid.**
   - Workflow must not manufacture work merely to populate the table.

5. **Parallelism safety is preserved.**
   - Multiple Manager `ACTIVATE NOW` rows require normal dependency/overlap safety.

6. **Existing control-plane safeguards are unchanged.**
   - task lifecycle and Manager acceptance;
   - branch/base/SHA custody;
   - checkpoint vocabulary;
   - independent-audit separation;
   - financial reconciliation gates;
   - CI attribution;
   - merge/release gates;
   - repository-as-authority rule.

7. **All employee families inherit the rule.**
   - Engineering;
   - Policy;
   - Research;
   - Audit;
   - Work Helper;
   - Manager.

8. **No production financial/application behavior changed.**

## Exact changed surface

- `.ai/shared/WORKFLOW_V3_1.md`
- `.ai/roles/README.md`
- `.ai/roles/manager.md`
- `.ai/tasks/FFH-032.md`
- `.ai/tasks/TASK_INDEX.md`

No financial calculation, application runtime, Supabase/live-data, or deployment file is part of the target.

## Fresh audit lane

Assigned branch:
`audit/ffh-032-workflow-30592f8c`

The auditor must:
- start from the Manager packet checkpoint;
- audit exact target `30592f8cf130293c5e875b8fd391d3bc8ded92e0`;
- not rely on Manager acceptance as proof;
- publish a canonical report under `.ai/audit/technical/**`;
- update `.ai/audit/technical/HANDOFF.md`;
- return report commit, handoff commit, findings, and verdict.

Allowed verdicts:
- PASS
- PASS WITH NON-BLOCKING FINDINGS
- FAIL — REMEDIATION REQUIRED

Manager retains final closure/remediation authority.
