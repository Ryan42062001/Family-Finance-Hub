# FFH-P08 hosted changes (Ryan only, each step separately authorized)

Preview and Production share one Supabase project. **Every step below needs Ryan's explicit authorization before it
runs; nothing here is done by the Builder.** Share only the outputs asked for (true/false, counts, hashes, parity
rows, an error's first line), never ids, emails, names or amounts.

**Order:** 1 → 2 → 3 → 4 before Preview QA of P08; 5 only when needed. The migration is safe for the current
Production app: live sessions keep working (their session rows exist); the new functions are unused until release.

## 1. Read-only privilege check (authorize: "P08 read-only check")

Confirms hosted Supabase allows what the design needs (local spike: all `true`, `false`, `23`).

```sql
select
  has_table_privilege('postgres', 'auth.sessions', 'SELECT')     as sessions_select,
  has_table_privilege('postgres', 'auth.sessions', 'DELETE')     as sessions_delete,
  has_table_privilege('postgres', 'auth.users', 'DELETE')        as users_delete,
  has_table_privilege('postgres', 'auth.mfa_factors', 'SELECT')  as factors_select,
  has_table_privilege('postgres', 'auth.mfa_factors', 'DELETE')  as factors_delete,
  exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'sessions' and column_name = 'factor_id') as sessions_factor_id,
  exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'sessions' and column_name = 'aal')       as sessions_aal,
  to_regclass('private.mfa_approved_factors') is not null       as already_applied,
  (select count(*) from supabase_migrations.schema_migrations)  as migrations_recorded;
```

Expected: seven `true`, then `false`, then `23`. Anything else: STOP and report the row (P08 returns to the Builder).

## 2. Auth settings (authorize: "P08 auth settings")

In the Supabase dashboard (Authentication → Sign In / Providers → Email, and Authentication → Multi-Factor):
- **Secure password change**: on (R6).
- **Minimum password length**: 8; no forced character classes (R6, amended by Ryan 2026-11-18).
- **Require current password when updating password** (R9). If the dashboard has no switch for it, set
  `security_update_password_require_current_password: true` through the Management API's Auth config.
- **TOTP (App Authenticator)**: enroll and verify enabled (R7).

Then report each as on/off. The Builder's CI proves the provider behaviour; Preview QA Q36 proves it on hosted.

## 3. Apply migration `20261118100000` (authorize: "apply migration 20261118100000")

1. Open `supabase/migrations/20261118100000_ffh_p08_account_security.sql` at the **release-candidate commit the
   Builder names** and use **Copy raw file**.
2. Paste the whole file into a new SQL Editor query exactly as it is (it already starts with `begin;` and ends with
   `commit;`) and **Run**. Success: "Success. No rows returned." Any error: everything rolls back; STOP and report
   the first line.
3. Record it: `insert into supabase_migrations.schema_migrations(version, name) values ('20261118100000', 'ffh_p08_account_security');`
4. Run `scripts/rls-local/parity.sql` and compare with `scripts/rls-local/parity.expected.txt` (must be 9/9 MATCH,
   migrations 24). Report the rows. If a function body differs only by `\r` characters, re-paste from the raw file.

## 4. Preview and test accounts (authorize: "P08 preview")

- Vercel → Settings → Domains: point `family-finance-hub-preview.vercel.app` at `phase/ffh-p08-account-security`,
  redeploy, then run the Preview smoke test (12/12).
- Create synthetic **TestC** (and, for Q36's deletion step, a throw-away synthetic account) for two-factor QA. Never
  use TestA/TestB (the automated isolation suite needs them password-only) and never real accounts.

## 5. Owner-assisted two-factor reset (per request; R11)

Only after confirming the person's identity **in person, or by a phone call you place to a number you already had**
— never on an inbound message, a newly supplied number or email, or knowledge of household details alone. Keep your
own note of date, account, reason and approval outside the repository. Then, in the SQL Editor:

```sql
select private.owner_reset_mfa('<the person''s user id from Authentication → Users>', '<short reason, 5–200 chars>');
```

It removes the person's authenticators and FFH approvals, ends every session and records an audit row. They sign in
with their password and may set up a new authenticator.

## 6. Test-account cleanup (per account)

Stray **synthetic** accounts (never TestA/TestB, never real ones) are removed by signing in as that account and
using **Account → Delete my account**. No bulk SQL against hosted.
