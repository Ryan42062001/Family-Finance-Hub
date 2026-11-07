# Speed Workflow V2.1 — Family Finance Hub

## 2026-11-07 Owner sequencing amendment — focused phase audits, comprehensive final audit

**Controlling amendment after merge:** [PROGRESS_FIRST_POLICY.md](PROGRESS_FIRST_POLICY.md). Build and verify a coherent feature/phase, then commission **ONE short fresh independent changed-scope audit at the end of EVERY phase or major feature**. The auditor examines the changed code, owner/security boundaries, calculations and risk-specific regression evidence at an exact SHA. If any **BLOCKER / CRITICAL / HIGH** finding exists, stop the affected merge/use, remediate promptly, re-run relevant CI and conduct **targeted independent re-audit** before moving that affected PR onward. If findings are only **MEDIUM / LOW / NIT**, document them with sources/severity/ownership in the final-audit backlog and allow continued development or normal Owner-approved feature merge. Reassess/escalate underclassified serious consequences rather than waiving them.

This amendment **preserves per-phase independent audit** but reduces scope and discourages repeated expansive architecture campaigns and full-project remediation for non-high findings at every small feature. **ONE comprehensive frozen-integration audit, batched remediation and targeted fresh re-audit happen at the next final release candidate.** Original phase-level FULL checks/immutable custody and mandatory automated checks remain required wherever existing branch/CI contracts enforce them until specifically reviewed/changed; no fake PASS, disabled validator, automatic merge or bypass. Mark accepted features `FEATURE_ACCEPTED_PENDING_FINAL_AUDIT` without claiming they have passed the comprehensive release audit. Existing CLOSED statuses and failed historical evidence remain unchanged.

Unrelated feature development may proceed while a known high-risk operation is isolated. **Known exploitable security, cross-owner personal/financial data access, data loss, secrets, live-production incidents and irreversible destructive operations must be stopped/fixed immediately** and never deferred to inflate progress. Preserve protected branches, focused tests, owner previews, explicit Owner merge/deploy, sensitive-data and provider boundaries.

## Execution mode — owner policy (2026-10-24)

- **Regular Chat is the default execution environment** for the Project Manager, the single Primary Builder for a phase, and each fresh Independent Auditor. Builder and Auditor must remain independent conversations when an independent audit is required.
- **Super Builder means ChatGPT Work mode.** Reserve it for a narrowly defined task that genuinely requires browser/computer use, a complete interactive development environment, local terminal/integration execution, or another unavailable capability that connected GitHub/provider tools and CI cannot accomplish reliably.
- **Escalation requires owner approval.** The regular Builder should first report the exact blocker, which validation is unavailable, the smallest proposed Super Builder task, and the reason ordinary connected tools, CI, and owner preview are insufficient. Do not spend Work-mode usage merely for convenience.
- **Do not weaken verification.** If regular Chat cannot run or prove a required test, mark that evidence unresolved and stop at the applicable gate; never replace it with an unsupported PASS. Use available connected tools, exact-head GitHub Actions checks, and owner-operated previews where authorized.
- **Execution-mode choice changes no project governance.** Keep the existing phase authority, one Primary Builder/phase PR, source-of-truth hierarchy, immutable SHA and CI/audit gates, fresh auditor independence, protected branch rules, and separate explicit owner approvals for merge, deployment, secrets, paid resources, destructive actions, and production changes.
- Prior references to a "Codex Builder" describe the builder role or historically used execution mode, **not a requirement to use Work mode by default**.


Product Owner: Ryan. Manager / Architect / Planner: ChatGPT. Default execution is one fresh Primary Builder for one coherent phase. At MEDIUM/HIGH freeze, route one fresh independent Auditor. Repository evidence outranks chat memory. Archived V3/V3.1 materials are historical evidence, never active task authority.

## Lifecycle

`PLANNED → BUILDING → PREVIEW_READY → PUNCH_LIST → FREEZE_READY → AUDITING → REMEDIATING (if required) → CLOSED`

Normal evidence flow: Build → FAST → whole-phase owner preview → consolidated punch list → Phase Sync → exact-head FULL PHASE CI → immutable freeze → independent audit when required → remediation and re-audit when required → explicit Ryan merge authorization → merge → post-merge FAST → Closure Sync → closure FAST → CLOSED. No automatic merge. Do not retarget a frozen audit SHA. Changes after freeze require a new exact-head candidate and relevant re-audit.

FAST runs on branch pushes, including post-merge main. Ordinary PR events do not duplicate FAST. FULL PHASE CI is deliberate through a `full-phase-ci` PR label event or explicit manual full dispatch; it checks out the PR's exact head (or explicitly supplied SHA) and never deploys. CI evidence belongs to the checked-out SHA. Phase Sync and Closure Sync are governance checkpoints recording phase state and evidence.

Production deployment is a separate explicit Product Owner decision. Phase activation, CI, audit, merge, and closure do not authorize deployment, Private Beta, paid custom domain/configuration, live auth changes, financial data mutation, or Supabase schema/RLS changes. Preserve existing PRs until separately reviewed. Money routing/reconciliation and financial policy remain exact and fail closed; authentication and household isolation remain fail closed. Never include secrets or real household financial data in repository/shared evidence.
