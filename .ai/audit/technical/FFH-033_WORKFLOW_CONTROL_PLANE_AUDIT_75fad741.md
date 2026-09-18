# FFH-033 — Independent Workflow / Control-Plane Audit — `75fad741`

**Task:** FFH-033 — Full-Workforce Activation Dashboard  
**Role:** Technical & Mathematical Auditor acting as Independent Workflow / Control-Plane Auditor  
**Execution mode:** STANDARD_CHAT_HIGH  
**Refresh mode:** Fast Refresh  
**Exact frozen workflow target audited:** `75fad74160f6ed412051adb4d4f2f33c091a0517`  
**Manager/control-plane audit base verified:** `d5209a4da4740f228268515e28287a42f732ca8a`  
**Assigned audit branch:** `audit/ffh-033-workflow-75fad741`  
**Frozen packet:** `.ai/audit/FFH-033_WORKFLOW_AUDIT_PACKET_75fad741.md`

## Verdict

**FAIL — REMEDIATION REQUIRED**

The workflow specification itself correctly makes the complete 11-role workforce dashboard mandatory, preserves Manager-only activation authority, retains safe status semantics, and leaves all existing governance gates intact.

However, the exact frozen target does not fully implement its own requirement in the canonical live Manager handoff. `.ai/manager/HANDOFF.md` still contains the old one-row `Next Activation` table and does not end with the mandatory full 11-role dashboard. Because FFH-033 exists specifically to ensure every meaningful handoff displays the complete workforce, this is a direct acceptance-criterion failure.

Manager acceptance was treated as evidence only, not proof.

## Custody and target verification

Verified independently:

- Current Manager/control-plane checkpoint at audit start: `d5209a4da4740f228268515e28287a42f732ca8a`.
- Assigned audit branch was identical to that checkpoint before audit writes.
- Exact frozen workflow target: `75fad74160f6ed412051adb4d4f2f33c091a0517`.
- Candidate: `cbdbc400ae381e79be83ce7db15f357158a119bf`.
- Candidate -> integration comparison: **zero changed files**.
- Exact integration Foundation CI: run `35349975086`, job `105615509505` — SUCCESS.
- Integration CI executed AI-state validation, dependency audit, calculation tests, security contract, typecheck, lint, and build.
- The exact target changes only:
  - `.ai/manager/HANDOFF.md`;
  - `.ai/roles/README.md`;
  - `.ai/roles/manager.md`;
  - `.ai/shared/WORKFLOW_V3_1.md`;
  - `.ai/tasks/FFH-033.md`;
  - `.ai/tasks/README.md`;
  - `.ai/tasks/TASK_INDEX.md`.

No production financial, application runtime, Supabase/live-data, migration, deployment, or schema behavior changed.

## Findings

| ID | Severity | Status | Result |
|---|---|---|---|
| FFH-033-WF-01 | **MEDIUM** | **OPEN / BLOCKING** | The exact target's canonical Manager handoff still uses the old one-row Next Activation table and does not end with the mandatory 11-role workforce dashboard. |

No CRITICAL, HIGH, or LOW finding was identified.

## FFH-033-WF-01 — MEDIUM — canonical Manager handoff does not implement the mandatory 11-row dashboard

### Required behavior

The exact frozen Workflow V3.1 target states:

- every employee handoff and meaningful task-completion response must end with a `Next Activation` table;
- the table must list the **entire Family Finance Hub employee roster**;
- every row is always present;
- employees may not be omitted because they are idle, blocked, already active, or unrelated.

The canonical roster has exactly 11 roles:

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

The FFH-033 task acceptance criteria independently require:

> Every handoff shows all 11 roles.

`.ai/roles/README.md` and `.ai/roles/manager.md` also make the 11-row format mandatory.

### Exact frozen handoff behavior

The exact target modifies `.ai/manager/HANDOFF.md`, but its active `## Next Activation` section remains:

```text
| Order | Employee / Role | Status | Copy/paste activation prompt |
|---|---|---|---|
| 1 | Core Financial Engine Engineer | ACTIVATE NOW | ... |
```

There are no rows 2–11 in that table.

The file then continues into an FFH-033 explanatory section rather than ending with a full workforce dashboard.

Therefore the canonical Manager handoff in the exact frozen workflow tree violates both mandatory requirements:

1. **all 11 rows are not present**; and
2. the handoff does **not end** with the full-workforce Next Activation table.

### Why this is blocking

This is not merely a historical file that predates the rule and was outside the task scope.

`.ai/manager/HANDOFF.md` is explicitly part of the FFH-033 changed surface and was modified by the frozen target.

The task's purpose is to fix the exact usability failure where a handoff can show only one/current role and hide the rest of the workforce. The frozen tree still presents that failure in its canonical Manager handoff.

A newly opened user or Manager reading the canonical handoff can still see only the one-row activation view rather than the promised whole-workforce status dashboard.

The finding is classified **MEDIUM** because:
- activation authority remains safe;
- no production or financial behavior is affected;
- repository/task/SHA/audit/CI/merge governance remains intact;
- the defect is bounded to incomplete control-plane presentation/implementation.

It remains **blocking** because it directly fails FFH-033's primary acceptance criterion.

### Required bounded remediation

Update the canonical Manager handoff so its final `Next Activation` section contains all 11 canonical roles in order, with truthful statuses derived from live repository state.

At the current frozen-state lineage, the intended classifications are structurally available from repository evidence:
- active work should be `ACTIVE`, not duplicated as another activation;
- blocked roles remain visible as `BLOCKED`;
- idle roles remain visible as `IDLE`;
- only Manager may issue `ACTIVATE NOW`;
- actionable rows carry short paste-ready prompts.

No production, policy, schema, or financial change is required.

A fresh frozen workflow target should then prove that the canonical handoff itself demonstrates the mandatory format.

## 1. Eleven-row rule in Workflow V3.1

**PASS at specification level.**

Workflow V3.1 explicitly says:
- the table lists the entire roster;
- every row is always present;
- canonical order is fixed;
- idle, blocked, active, and unrelated employees may not be omitted.

This is substantially stronger than FFH-032's compact single-successor format.

The blocking defect is implementation consistency in the canonical handoff, not ambiguity in the rule.

## 2. Role-family inheritance

**PASS.**

`.ai/roles/README.md` enumerates all permanent role families plus Work Helper and states every durable role/Work Helper must end meaningful handoffs with the full-workforce table.

All 11 canonical roles are explicitly enumerated.

No role family is exempted.

## 3. Status semantics

**PASS.**

Allowed statuses are clearly defined:

- `ACTIVATE NOW` — Manager-only authorization;
- `ACTIVE` — already executing; do not duplicate;
- `RECOMMEND TO MANAGER` — worker recommendation only;
- `WAIT` — plausible/expected successor with a real gate;
- `BLOCKED` — named blocker prevents execution;
- `IDLE` — no current activation justified.

The status model supports full-roster visibility without manufacturing work.

## 4. Manager-only activation authority

**PASS.**

Workflow V3.1 explicitly prohibits workers from using `ACTIVATE NOW`.

The Manager charter independently states:
- Manager is the only role allowed to use `ACTIVATE NOW`;
- live repository/task/dependency/branch/PR verification is required first;
- existing active work must be labeled `ACTIVE`, not duplicated.

Worker recommendations remain advisory.

No self-authorization path was introduced.

## 5. Already-active work duplication prevention

**PASS at specification level.**

The rule explicitly says:
- `ACTIVE` means already executing;
- do not create a duplicate chat/assignment;
- Manager must label existing active work `ACTIVE` rather than another `ACTIVATE NOW`.

The current repository also contains a real concurrent example: FFH-017 R07 Core Engine work is already active.

The specification safely distinguishes status from authorization.

## 6. Actionable prompt completeness

**PASS.**

For `ACTIVATE NOW` and `RECOMMEND TO MANAGER`, prompts are mandatory.

When established, prompts preserve:
- repository/project identity;
- exact role;
- task ID;
- execution mode;
- refresh mode;
- branch or frozen target;
- workflow/task/role/handoff pointers;
- bounded objective;
- must-not boundaries;
- expected return/handoff.

Repository pointers are preferred over duplicated history.

## 7. WAIT / BLOCKED / IDLE legitimacy

**PASS.**

The workflow makes these first-class outcomes and explicitly prohibits manufacturing work merely to avoid them.

Non-actionable rows may use `—`, preventing prompt bloat.

## 8. Parallel activation safety

**PASS.**

Multiple `ACTIVATE NOW` rows remain Manager-only and require verified safe parallelism with no unsafe dependency/write overlap.

No existing dependency/overlap controls were removed.

## 9. Repository authority and task lifecycle

**PASS.**

The full-workforce table is explicitly user-facing only and does not replace:
- task state;
- `Activation`;
- `Next owner`;
- repository authority.

The underlying canonical task lifecycle and Manager-only acceptance/closure transitions remain unchanged.

## 10. Branch/SHA custody and checkpoint vocabulary

**PASS.**

No checkpoint semantics were changed.

The canonical workflow still distinguishes:
- `PRODUCTION_SHA`;
- `VALIDATED_CI`;
- `HANDOFF_SHA`;
- `INTEGRATION_SHA`.

The full-workforce table does not replace branch/SHA custody.

## 11. Independent audit and frozen-target controls

**PASS.**

Workflow V3.1's material control-plane audit gate remains intact.

FFH-033 itself correctly:
- freezes an exact integration target;
- uses a fresh independent audit branch;
- requires a fresh workflow/control-plane audit before closure;
- treats later Manager packet commits as outside the frozen workflow target.

Green CI is explicitly evidence, not proof.

## 12. CI attribution and merge/release gates

**PASS.**

No CI ownership or merge/release controls were weakened.

Existing canonical safeguards remain in Workflow V3.1 / V3 / the underlying workflow.

The exact integration CI is tied to the frozen target.

## 13. Financial reconciliation governance

**PASS / NOT APPLICABLE to behavior.**

The Financial Engine Reconciliation Gate is unchanged.

FFH-033 correctly marks monetary reconciliation as not applicable because it changes no financial behavior.

Nothing in the workforce dashboard bypasses the reconciliation gate for future financial-engine work.

## 14. No production behavior changed

**PASS.**

The exact changed surface is control-plane-only under `.ai/**`.

No:
- financial calculation;
- application runtime;
- Supabase/live data;
- database/schema;
- migration;
- deployment

file changed.

## Final conclusion

The FFH-033 design is authority-safe and governance-preserving, but the exact frozen target does not fully implement the dashboard in the canonical Manager handoff that users actually consume.

That direct acceptance-criterion failure prevents closure.

**Final verdict: FAIL — REMEDIATION REQUIRED**

No production behavior, FFH-017 financial implementation, merge state, task closure, downstream activation, or Supabase/live-data state was changed by this audit.
