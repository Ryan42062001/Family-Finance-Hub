# Speed Workflow V2.1 — Family Finance Hub

Product Owner: Ryan. Manager / Architect / Planner: ChatGPT. Default execution is one fresh Primary Builder for one coherent phase. At MEDIUM/HIGH freeze, route one fresh independent Auditor. Repository evidence outranks chat memory. Archived V3/V3.1 materials are historical evidence, never active task authority.

## Lifecycle

`PLANNED → BUILDING → PREVIEW_READY → PUNCH_LIST → FREEZE_READY → AUDITING → REMEDIATING (if required) → CLOSED`

Normal evidence flow: Build → FAST → whole-phase owner preview → consolidated punch list → Phase Sync → exact-head FULL PHASE CI → immutable freeze → independent audit when required → remediation and re-audit when required → explicit Ryan merge authorization → merge → post-merge FAST → Closure Sync → closure FAST → CLOSED. No automatic merge. Do not retarget a frozen audit SHA. Changes after freeze require a new exact-head candidate and relevant re-audit.

FAST runs on branch pushes, including post-merge main. Ordinary PR events do not duplicate FAST. FULL PHASE CI is deliberate through a `full-phase-ci` PR label event or explicit manual full dispatch; it checks out the PR's exact head (or explicitly supplied SHA) and never deploys. CI evidence belongs to the checked-out SHA. Phase Sync and Closure Sync are governance checkpoints recording phase state and evidence.

Production deployment is a separate explicit Product Owner decision. Phase activation, CI, audit, merge, and closure do not authorize deployment, Private Beta, paid custom domain/configuration, live auth changes, financial data mutation, or Supabase schema/RLS changes. Preserve existing PRs until separately reviewed. Money routing/reconciliation and financial policy remain exact and fail closed; authentication and household isolation remain fail closed. Never include secrets or real household financial data in repository/shared evidence.
