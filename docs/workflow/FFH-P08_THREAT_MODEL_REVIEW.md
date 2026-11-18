# FFH-P08 threat-model review receipts

## Round 1 — FAIL (2026-11-18)

Reviewer: independent, different model (ChatGPT), read-only, pre-build design review.
Reviewed SHA: `5c87b119be0ca7efcafeb58dd2911de299803d9e` (`docs/FFH-P08_PROPOSAL.md` §1–§9, R1–R8 as approved).
Result: `THREAT-MODEL REVIEW RESULT: FAIL` — 1 CRITICAL, 5 HIGH, 2 MEDIUM. No P08 code existed.

| ID | Severity | Finding (short) | Disposition in proposal §10 |
|---|---|---|---|
| TM-01 | CRITICAL | `delete_my_account` callable directly; password/MFA/typed confirmation checked only in the server action | 10.1.4 `recent_reauth` inside the function (fresh password `amr`, single-use per session and purpose); 10.6 |
| TM-02 | HIGH | MFA enroll/verify/unenroll reachable through the Auth API without FFH re-authentication | 10.1.2 FFH factor registry (only factors approved with a fresh proof count); 10.5; residual → R10 |
| TM-03 | HIGH | Three gated helpers do not cover profiles, household insert, `is_household_member`, invitation acceptance | 10.1.3 single `session_ok()` predicate; 10.3 catalog inventory + CI coverage probe; nothing allowed at `aal1` for enrolled users |
| TM-04 | HIGH | Secure password change does not require the current password at the provider | 10.4: provider "require current password" setting (R9) + `current_password` on the update |
| TM-05 | HIGH | Deletion vs invitation acceptance/membership race | 10.6 household-row `FOR UPDATE` lock protocol shared by all membership changes; race tests |
| TM-06 | HIGH | Removing the last factor reactivates stale `aal1` access tokens | 10.1.1 security epoch (`iat` ≥ `tokens_valid_after`), bumped on every security change and reset |
| TM-07 | MEDIUM | Throw-away re-auth client: identity match and local sign-out not specified | 10.2 (fresh `getUser`, `sub` equality, `scope: 'local'`, no cookie writes, tests) |
| TM-08 | MEDIUM | Owner-assisted MFA recovery lacks identity proofing | 10.7 procedure + `private.owner_reset_mfa`; identity rule → R11 |

Reviewer-listed UNVERIFIED items are the §10.9 step 2 spike. Next: targeted re-review of §10 at a frozen SHA.
