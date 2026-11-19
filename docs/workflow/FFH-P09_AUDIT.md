# FFH-P09 independent audit receipt

- **Reviewer:** a different model from the Builder (ChatGPT), end-of-phase HIGH-risk audit, prompt per
  `docs/workflow/REVIEW_PROMPT.md` (pasted by Ryan, 2026-11-19).
- **Scope:** `2a62022b5e5ae9d60a32fd7ac6745ffb4366e904...6bd5c708e16b9d9fabaa86f2258cd0a50736d669` (PRs #178, #179, #181, #183).
- **Result:** `REVIEW RESULT: PASS — 6bd5c708e16b9d9fabaa86f2258cd0a50736d669`. 0 BLOCKER / CRITICAL / HIGH, 1 MEDIUM, 1 LOW.
- **Verified PASS by the reviewer:** household isolation, owner/member/viewer permissions, P08 session gating, trigger
  grants and `search_path`, exact-cent monthly equivalents (trigger = CHECK = TypeScript, incl. the numeric(14,2)
  maximum), legacy preservation in source, debts and Money Priority Engine unchanged, calendar recurrence, reminders
  and forecast on actual payments, CSV authorization and formula defences, print view, `strip-cr.sql`, mobile menu CSS.
- **UNVERIFIED by the reviewer (outside a source audit):** hosted parity 9/9 (Ryan's SQL Editor result, recorded in
  `docs/workflow/FFH-P09_HOSTED_CHANGES.md`); native print preview and phone layouts (Ryan's device checks Q38/Q43 PASS).

## Findings and disposition

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| P09-01 | MEDIUM | Bills form decided "date unchanged" from the server's *today*; a form left open past a due date (e.g. shown Feb 28, saved Mar 1) turned a Jan 31 anchor into Feb 28; a concurrent recurrence change was not detected. | **Fixed:** the form sends the date it showed plus the anchor and recurrence it was rendered from; the action refuses a stale form (`error=changed`), keeps the anchor only when the submitted date equals the shown one, and updates conditionally on anchor **and** recurrence. Tests in `tests/security/ffh-p09-bills-exports.test.ts`. |
| P09-02 | LOW | The legacy-row upgrade check ran only in the local harness, not in required CI. | **Fixed:** `scripts/rls-ci/p09-upgrade.sh`, a step of the required `rls-matrix` job, runs it on the runner's own throw-away PostgreSQL, requires `P09_UPGRADE_PASS` and zero residue. Mutation-checked locally: a back-fill that invents due dates fails the step (exit 3). |

Both fixes are below the re-check threshold (no BLOCKER/CRITICAL/HIGH); the reviewer may confirm them at the release
candidate if Ryan wants.
