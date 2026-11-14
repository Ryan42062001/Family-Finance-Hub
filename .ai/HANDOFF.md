# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-14 by Claude Code.

- **Phase:** FFH-P06 household invitations (HIGH risk). Phase branch `phase/ffh-p06-household-invitations`; phase
  PR #143 (draft into `main`, NOT merged). Production is FFH-P05 at `1bd1b59`.
- **Status:** hosted migration `20261114020000` applied and hosted parity **9/9** (2026-11-14). Remediation merged at `eceacfd` (PR #144); CI run 43539148684 green (fast, rls-matrix 970/970 +
  concurrency, e2e 34/34). Fresh independent re-review PASS at `eceacfd`; Manager accepted.
- **Next:** Work mode QA on the Preview (Q23–Q26 plus auth regressions Q1–Q3, Q6–Q8, Q17, Q18), then the release
  checklist and Ryan's separate production-release authorization for PR #143.
- **Waiting on Ryan:** starting Work mode QA with the handoff prompt.
- **Backlog added:** N01 (raw onboarding error message), dependency advisories. N02 (this file) fixed.
