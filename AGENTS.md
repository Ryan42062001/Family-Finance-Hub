# Family Finance Hub agent guidance

## Owner progress-first override — 2026-11-07 (refined)

**Read [docs/PROGRESS_FIRST_POLICY.md](docs/PROGRESS_FIRST_POLICY.md) first.** For **every phase or major feature**, build and run real functional/CI checks, then have a **fresh independent auditor perform one short changed-scope end-of-phase audit**. Resolve **BLOCKER/CRITICAL/HIGH** immediately, with targeted re-audit; document **MEDIUM/LOW/NIT** in the final-audit backlog and keep building after Owner approval. At final integration/release, run **one comprehensive independent whole-product audit, remediation and re-audit**. No duplicated full-architecture campaign per feature.

Never mark unverified/failed evidence PASS or silently downgrade known severity, bypass protected branch CI/validator, expose personal/financial health data, grant unknown privileges, change a live provider/deployment, or merge without explicit Owner authorization. Known serious exploits/live failures require immediate isolation or repair. Existing project-specific safety and release contracts remain binding. This amendment becomes authoritative on the default branch only after its governance PR is approved and merged.

## Primary Builder execution mode

**Default to regular ChatGPT Chat** for the Project Manager, Primary Builder and fresh Independent Auditor. Use ChatGPT Work mode (**Super Builder**) only for a specific unavoidable capability gap, after explaining the blocker and receiving Ryan's explicit approval. Never skip validation, change phase authority, reuse the Builder as its own independent Auditor, or bypass CI/audit/merge/deployment protections to avoid Work usage. For the controlling details, read `docs/WORKFLOW.md`.


Read `docs/WORKFLOW.md`, `.ai/CURRENT_PHASE.md`, `.ai/ARCHITECTURE.md`, and `.ai/DECISIONS.md` before phase work. Repository evidence outranks chat memory. Only five files in active `.ai/` are authoritative; `.history/` is historical evidence. Never activate archived tasks or adopt historical PRs implicitly. Ryan is Product Owner and explicitly authorizes merge and, separately, production deployment. No financial policy invention, real household data in evidence, unauthorized Supabase mutation, or cross-household access.
