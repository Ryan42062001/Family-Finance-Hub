# FFH-P08 spike results (real local Supabase Auth, disposable CI stack)

Run 44226086535 at `952f3c1` (Supabase CLI 2.122.0, PostgreSQL 17). Proposal §11.6. All design assumptions held;
the spike is now the assertion suite `scripts/rls-ci/p08-auth-provider.mjs`, run by `rls-matrix` on every push.

| Question | Result |
|---|---|
| JWT carries `session_id`, `aal`, `amr` with per-method timestamps; PostgREST passes them to `auth.jwt()` | Yes |
| Refresh keeps the same session and the original `amr` timestamps (only `iat` advances) | Yes, so refresh cannot renew a re-authentication proof |
| MFA verify upgrades the same session; `auth.sessions.aal = aal2`, `factor_id` = the factor used | Yes (binding for N01 works; no fallback needed) |
| Verifying a factor deletes the person's other session rows | Yes; their old access tokens still reached PostgREST (200) until P08's liveness check |
| `aal1` session can enroll a factor once one is verified | No (`insufficient_aal`); R10 residual applies only to people without 2FA |
| Rogue factor B enrolled+verified from an `aal2` session coexists with A; session row then names B | Yes, so `session_ok()` refuses B sessions |
| `aal1` can unenroll a verified factor / change the password with a factor present | No / No (`insufficient_aal`) |
| Deleting an `auth.sessions` row: liveness false, refresh fails (400), refresh tokens cascade | Yes |
| `logout?scope=others` deletes other session rows | Yes |
| `postgres` (not superuser) may select/delete `auth.users`, `sessions`, `refresh_tokens`, `mfa_factors`, `identities`; user delete cascades | Yes (`auth.users` owned by `supabase_auth_admin`) |
| `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=true` enforces R9 | Yes: `current_password_required` / `current_password_invalid` |
| Auth vs database clock skew | -1 s (affects only the 5-minute freshness window) |

Hosted parity of these privileges still needs Ryan's read-only check before the hosted migration
(`docs/workflow/FFH-P08_HOSTED_CHANGES.md`).
