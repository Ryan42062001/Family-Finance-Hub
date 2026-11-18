# FFH-P08 independent audit receipts

## Audit 1 — FAIL (2026-11-18)

Different model (ChatGPT), read-only, at frozen candidate `ed915d419cd4e9e827bd1734e203e8d92f11c542` (CI run
44236377825 green; Browser QA 34 PASS / 0 FAIL / 3 NOT RUN at `43b5e1d`, same app code).

| ID | Severity | Finding (short) | Disposition |
|---|---|---|---|
| F01 | HIGH | A recently issued session could enroll + verify its own authenticator and approve it, reusing the password sign-in from before the authenticator existed | **Fixed**: migration `20261118110000` requires the approving session to be created after the authenticator (`auth.sessions.created_at > auth.mfa_factors.created_at`, both written by Supabase Auth). Matrix + real-provider negative and positive tests |
| F02 | MEDIUM | Turning 2FA off removed approvals, then ignored provider unenrol failures | **Fixed**: `turn_off_my_two_factor()` deletes approvals and `auth.mfa_factors` and ends every session in one transaction; the action no longer unenrols |
| F03 | MEDIUM | Coverage probe: gate in one policy clause hid the other; other exposed schemas not scanned | **Fixed**: USING and WITH CHECK checked separately (+ mutation 10); postgres-owned objects in `graphql_public`/`storage` flagged |
| F04 | LOW | Invitation create/cancel still direct owner-scoped table writes, not locked RPCs as §11.4 says | **Backlog** (`.ai/DECISIONS.md`): RLS keeps them owner-only and household-scoped; no cross-household or deletion race shown |

Verified by the auditor: gate and helpers, profile/household creation, approved-factor binding, session revocation,
deletion authorization and R3, lock-order race, Owner reset, exact P05/P07 RPC parity. UNVERIFIED by the auditor
(covered by Ryan's hosted checks and Browser QA): hosted settings/migration, full browser MFA lifecycle.


## Targeted re-review — PASS (2026-11-18)

Same reviewer model, at `ce854b7cf95691f9fed46cbc228323c24220326d` (exact-head CI run 44330433584 green). F01, F02,
F03 RESOLVED; F04 LOW accepted backlog; no new BLOCKER/CRITICAL/HIGH. Hosted migration `20261118110000` applied by
Ryan, parity 9/9 (25 migrations).
