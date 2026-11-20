# FFH-P11 independent audit receipt

- **Reviewer:** a different model from the Builder (ChatGPT), end-of-phase HIGH-risk audit, prompt per
  `docs/workflow/REVIEW_PROMPT.md` with the P11 focus list (pasted by Ryan, 2026-11-20).
- **Scope:** `cc7c70724df7bc3b8e5729cbec1fcd96cf6ef57e...694df327b80324b50471a021865d1bb4e222cf2c` (phase PR #194:
  #195, #196, #197, #199 and the P10 close-out carried from #193).
- **Result:** `REVIEW RESULT: PASS — 694df32`. No BLOCKER/CRITICAL/HIGH; 3 MEDIUM (P11-01..03).
- **Verified by the reviewer:** composite household FK and household-gated RLS; `session_ok()` through the policy
  helpers; viewer read-only; SECURITY INVOKER trigger with empty search_path and API EXECUTE revoked; integer-cent gap,
  surplus, upward catch-up and downward progress; date-only cycles with no automatic rollover; no tracker input into the
  Money Priority Engine, Bills totals or exports; the P07 account-deletion repair; hosted apply file matches the
  migration; exact-head CI 44644031382 green (matrix 1306, coverage 10/10, races 4/4, provider 38, e2e 58/58).
- **UNVERIFIED by the reviewer:** hosted Supabase (not queried; Ryan's 17/17 PASS paste recorded on #194); browser and
  device checks.

## Findings and disposition

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| P11-01 | MEDIUM | `reserved_amount numeric(14,2)` silently rounded sub-cent values and accepted `NaN` (`NaN >= 0`) on direct authenticated writes; a `NaN` row would hide the household's set-aside section | **Fixed** (Ryan: "fix all of them now"): migration `20261120100000` makes it unconstrained `numeric` with a CHECK refusing NaN, negatives, > 999,999,999,999.99 and non-whole cents |
| P11-02 | MEDIUM | Table-level INSERT/UPDATE let a member null audit columns (via the pass-through, no version bump) or change the tracker `id` | **Fixed:** insert/update privileges limited to the input columns; trigger refuses an `id` change; the account-deletion SET NULL still works (runs as table owner) |
| P11-03 | MEDIUM | A reserve-only edit skipped the bill check, so a concurrent schedule change or a passing due date could let it save against a stale cycle | **Fixed:** the trigger locks (FOR SHARE) and revalidates the bill on every insert and non-pass-through update; refused with 22023 (the app shows "changed") |

Evidence for the fixes: +13 matrix probes (1319); a new real two-session race (reserve edit vs schedule change: waits,
then refused), shown to FAIL against the pre-fix trigger and PASS with the fix; source checks in
`tests/security/ffh-p11-set-asides.test.ts`. Merged via #200 (phase head `005f312`).

## Targeted re-check

- **Reviewer:** the same different-model reviewer (ChatGPT), on the fix range `694df32...005f312` (pasted by Ryan,
  2026-11-20).
- **Result:** `RE-CHECK RESULT: PASS — 005f312`. P11-01, P11-02 and P11-03 RESOLVED; no new BLOCKER/CRITICAL/HIGH/MEDIUM.
  The reviewer confirmed the column grants, the account-deletion SET NULL path, the app's writes using only granted
  columns, revalidation under the bill row lock on every write, and RLS/session/viewer protections unchanged.
  Exact-head CI 44648090298 green (matrix 1319, coverage 10/10, races 5/5, provider 38, hosted rehearsal, e2e).
- **Hosted:** Ryan authorized and applied `scripts/hosted/apply-20261120100000.sql` at `005f312`: 17/17 PASS (hosted at
  28 migrations). Production and Preview smoke 12/12 afterwards. Q64 re-check at `005f312`: PASS.
