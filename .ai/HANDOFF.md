# Handoff (update whenever the builder changes; keep it short)

Updated: 2026-11-14 by Claude Code.

- **Phase:** FFH-P06 household invitations (HIGH risk). Phase branch `phase/ffh-p06-household-invitations`; phase
  PR #143 (draft into `main`, NOT merged). Production is FFH-P05 at `1bd1b59`.
- **Status:** remediation merged at `eceacfd` (PR #144); CI run 43539148684 green (fast, rls-matrix 970/970 +
  concurrency, e2e 34/34). Fresh independent re-review PASS at `eceacfd`; Manager accepted.
- **Next:** Ryan authorizes and runs the hosted migration `20261114020000` steps in
  `docs/workflow/FFH-P06_HOSTED_MIGRATION.md` one at a time (precheck, apply, CRLF check/fix only if needed, record
  version, parity 9/9 with migrations 19). Then Work mode QA Q23–Q26 plus auth regressions on the Preview, then the
  release checklist and Ryan's separate production-release authorization.
- **Waiting on Ryan:** authorization for step 1 (read-only precheck) of the hosted migration.
- **Backlog added:** N01 (raw onboarding error message), dependency advisories. N02 (this file) fixed.
