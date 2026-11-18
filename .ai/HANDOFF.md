# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-18 — Claude Code P08 Builder: audit gate fixed (#163), #162 merged, R1–R8 approved.

- **Production:** FFH-P07 RELEASED/CLOSED; PR #155 merged the exact authorized head
  `ae97e90e7d463be62243b22ece50c7b84b2f7b5a` into protected `main` as
  `1c4753dab2e3a9e38fbfbe34ce82397e92047f43`.
  Ryan reported Production Ready and smoke PASS **12/12**; GitHub post-merge `fast`/`rls-matrix` green.
  The Owner's public Production `/api/build-info` commit check was not independently confirmed.
- **P07 closure evidence:** Owner-approved standalone goals and immutable planned-cash-flow monthly
  check-ins, owner/member write and viewer read-only, 4 authorized hosted P07 migrations,
  reported hosted parity **9/9 / 23 migrations**, three rounds of independent review,
  and Preview QA **16/16 selected checks PASS**. P07's design remains in `docs/FFH-P07_DESIGN.md`.
  Close-out originated in PR #161; this P08 branch carries its documentation without
  a separate merge into Production.
- **Active phase:** FFH-P08 — Account settings and security, HIGH risk; `phase/ffh-p08-account-security`.
  **PLANNED / scope and R1–R8 approved as recommended (Ryan, 2026-11-18) / implementation not started**.
  Email change deferred (R1). Waiting on the pre-build **threat-model review** by a different model
  (`docs/workflow/FFH-P08_THREAT_MODEL_REVIEW_PROMPT.md`); no P08 code before it returns.
- **Next roadmap item:** password change, email change, account deletion/test-account cleanup,
  authenticator-app 2FA. See `docs/FFH-P08_PROPOSAL.md` as an UNAPPROVED proposal.
  Ryan must choose proposal decisions **R1–R8** before implementation.
- **First P08 Builder action:** Start a **fresh Claude Code chat for this phase**. Verify current
  refs and approvals; read `AGENTS.md`, `docs/WORKFLOW.md`, `.ai/CURRENT_PHASE.md`,
  `.ai/DECISIONS.md`, `docs/FFH-P08_PROPOSAL.md`; present R1–R8 and review the threat model.
  No P08 code, hosted configuration, migration, real-data change or Production merge is authorized.
- **CI blocker:** PR #161 source head `80278f2e5a0e73e41b87ffac5ab6e5712ff8a79b`
  passed `rls-matrix` but its `fast` job failed the high-severity dependency audit
  (9 HIGH / 6 MODERATE), [run 44216093879](https://github.com/Ryan42062001/Family-Finance-Hub/actions/runs/44216093879).
  The new phase must triage/remediate through a reviewed change; no CI bypass or severity reduction.
- **Preview:** still associated with P07. Ryan approves any reassignment to the P08 phase branch.
- **Deferred:** P07 financial add-ons stay deferred. Separate LOW Money Priority Engine
  half-cent rounding issue retained in `.ai/DECISIONS.md`, not folded into P08 auth work.
- **Workflow:** Each completed phase gets a clear **PHASE COMPLETE — START A FRESH CLAUDE CODE CHAT**
  Manager notice. Each `main` merge independently requires Ryan's exact-SHA release approval.
- **Audit gate (2026-11-18):** PR #163 fixed the 6 MODERATE advisories and added `scripts/audit-gate.mjs` with one
  Ryan-approved exception (GHSA-fc5q-39xc-vjpf, picomatch, dev-only, review by **2027-01-18**). Remove the exception
  when picomatch ships a fix. The CI blocker notes above are historical.
