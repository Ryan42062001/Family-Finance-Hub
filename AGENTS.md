# Family Finance Hub agent guidance

## Owner progress-first override — 2026-11-07

**Read [docs/PROGRESS_FIRST_POLICY.md](docs/PROGRESS_FIRST_POLICY.md) first.** The Product Owner prioritizes delivery of working functionality across the project, followed by one comprehensive independent audit, batched remediation and targeted re-audit before the next release. Earlier phase-by-phase audit timing is superseded **only after this governance PR merges**. All existing source-of-truth, known security failures, safe development tests, CI, Owner merge approval, secrets, production, personal-data and provider boundaries remain binding. Never claim deferred findings PASS, skip required tests or ignore a known exploitable boundary.


## Primary Builder execution mode

**Default to regular ChatGPT Chat** for the Project Manager, Primary Builder and fresh Independent Auditor. Use ChatGPT Work mode (**Super Builder**) only for a specific unavoidable capability gap, after explaining the blocker and receiving Ryan's explicit approval. Never skip validation, change phase authority, reuse the Builder as its own independent Auditor, or bypass CI/audit/merge/deployment protections to avoid Work usage. For the controlling details, read `docs/WORKFLOW.md`.


Read `docs/WORKFLOW.md`, `.ai/CURRENT_PHASE.md`, `.ai/ARCHITECTURE.md`, and `.ai/DECISIONS.md` before phase work. Repository evidence outranks chat memory. Only five files in active `.ai/` are authoritative; `.history/` is historical evidence. Never activate archived tasks or adopt historical PRs implicitly. Ryan is Product Owner and explicitly authorizes merge and, separately, production deployment. No financial policy invention, real household data in evidence, unauthorized Supabase mutation, or cross-household access.
