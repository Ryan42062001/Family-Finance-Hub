# FFH-033 Workflow / Control-Plane Audit Packet — `75fad741`

Packet ID: `FFH-033-75fad741-2026-09-18`

Task: FFH-033 — Full-Workforce Activation Dashboard  
Audit type: fresh independent workflow / control-plane audit  
Execution mode: `STANDARD_CHAT_HIGH`

## Exact audited target

`75fad74160f6ed412051adb4d4f2f33c091a0517`

Audit this exact integration SHA only. Later Manager/control-plane packet commits are outside the audited target.

## Custody

Candidate:
`cbdbc400ae381e79be83ce7db15f357158a119bf`

PR:
#35 — FFH-033: full-workforce activation dashboard

Candidate CI:
- run `35349683789`
- job `105614557526`
- SUCCESS

Integration:
`75fad74160f6ed412051adb4d4f2f33c091a0517`

Candidate -> integration:
**zero changed files**

Integration CI:
- run `35349975086`
- SUCCESS

## Intended behavior

Every meaningful Family Finance Hub handoff must display the complete 11-role workforce:
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

Statuses:
- `ACTIVATE NOW` — Manager-only authorization;
- `ACTIVE` — already executing, do not duplicate;
- `RECOMMEND TO MANAGER` — worker recommendation only;
- `WAIT` — real gate remains;
- `BLOCKED` — named blocker prevents work;
- `IDLE` — no work justified.

## Required independent checks

Verify:
1. all 11 rows are mandatory, not optional;
2. workers cannot omit idle/blocked/active roles;
3. workers cannot use `ACTIVATE NOW`;
4. Manager live-state verification remains required;
5. already-active work is not duplicated;
6. actionable activation/recommendation rows contain short paste-ready prompts;
7. WAIT/BLOCKED/IDLE remain legitimate and do not manufacture work;
8. parallel activation safeguards remain intact;
9. repository authority, task lifecycle, Manager acceptance, branch/SHA custody, checkpoint semantics, audit independence, CI attribution, reconciliation, merge/release controls remain intact;
10. no financial/application/Supabase behavior changed.

## Changed surface

- `.ai/shared/WORKFLOW_V3_1.md`
- `.ai/roles/README.md`
- `.ai/roles/manager.md`
- `.ai/tasks/README.md`
- `.ai/tasks/FFH-033.md`
- `.ai/tasks/TASK_INDEX.md`
- `.ai/manager/HANDOFF.md`

## Fresh audit branch

`audit/ffh-033-workflow-75fad741`

Allowed verdicts:
- PASS
- PASS WITH NON-BLOCKING FINDINGS
- FAIL — REMEDIATION REQUIRED

Manager retains final closure/remediation authority.
