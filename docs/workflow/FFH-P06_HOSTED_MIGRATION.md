# FFH-P06 hosted migration `20261114020000` procedure

Applies `supabase/migrations/20261114020000_ffh_p06_invitation_security_remediation.sql` (one household per
account; column-scoped invitation INSERT; safe "already belong" denial) to hosted Supabase.

**Each step needs Ryan's explicit authorization before it runs.** Steps 1 and 5 are read-only; steps 2, 3 and 4
change the hosted database. Ryan runs everything in the Supabase SQL Editor (one **New query** per step). Nothing is
deleted, reassigned or repaired automatically.

**Evidence rule:** share only the outputs this document asks for (counts, `true`/`false`, the parity rows, an error
code name). Never share user IDs, household IDs, emails, names, invitation labels or tokens, and never screenshot
table rows.

Reviewed source: phase head `eceacfdc529bb884ed89da9cb7008d627e03d86d` (independent re-review PASS; CI run
43539148684 green).

## Step 1: read-only prechecks (authorize: "read-only precheck")

Paste and **Run**. It only reads; it returns one row of counts and flags.

```sql
select
  (select count(*) from (
     select user_id from public.household_members
     group by user_id having count(*) > 1) d)                       as users_with_multiple_households,
  (select count(*) from public.household_invitations
     where accepted_at is null and created_at > now())              as future_dated_pending_invitations,
  exists (select 1 from supabase_migrations.schema_migrations
          where version = '20261114020000')                         as migration_already_recorded,
  exists (select 1 from pg_constraint
          where conname = 'household_members_one_household_per_user') as unique_constraint_present,
  (select count(*) from supabase_migrations.schema_migrations)      as migrations_recorded;
```

Expected: `0 | 0 | false | false | 18`.

- **Both counts 0, `false`, `false`, 18:** continue to step 2.
- **`users_with_multiple_households` > 0 or `future_dated_pending_invitations` > 0: STOP.** The migration would
  refuse to run anyway (fail-closed guard). Report only the two numbers. Resolving it is a real-data decision for
  Ryan in its own reviewed step; do not edit rows.
- **`migration_already_recorded` or `unique_constraint_present` is `true`, or the count isn't 18: STOP** and report
  the row. The hosted database isn't in the expected starting state.

## Step 2: apply the migration (authorize: "apply migration 20261114020000")

Open `supabase/migrations/20261114020000_ffh_p06_invitation_security_remediation.sql` at the reviewed commit, copy
the **whole file** (it has its own `begin;` … `commit;`), paste and **Run**.

- **Success:** "Success. No rows returned."
- **Fails closed:** the error names `FFH_P06_MEMBERSHIP_COLLISION_MANUAL_REVIEW_REQUIRED` or
  `FFH_P06_FUTURE_DATED_INVITATIONS_MANUAL_REVIEW_REQUIRED`, or a lock timeout. The whole transaction rolls back and
  nothing changes. STOP and report the error code name only. A lock timeout can be retried once after a minute.

## Step 3: line-ending check, then normalize only if needed (authorize: "CRLF check and fix if needed")

The SQL Editor on Windows can store `\r` characters in the function body, which changes the parity fingerprint.
Check first (read-only):

```sql
select position(E'\r' in pg_get_functiondef(
  'public.accept_household_invitation(text)'::regprocedure)) > 0 as has_carriage_returns;
```

- **`false`:** skip the fix and go to step 4.
- **`true`:** run this once, then re-run the check and expect `false`:

```sql
do $fix$
declare
  v_def text := pg_get_functiondef('public.accept_household_invitation(text)'::regprocedure);
begin
  execute replace(v_def, E'\r', '');
end
$fix$;
```

`create or replace` keeps the function's owner, grants and `SECURITY DEFINER` setting; only the body text changes.

## Step 4: record the migration version (authorize: "record migration version")

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20261114020000', 'ffh_p06_invitation_security_remediation');
```

Expected: "Success. No rows returned." A duplicate-key error means it was already recorded: STOP and report.

## Step 5: hosted parity (authorize: "run hosted parity")

Paste the whole of `scripts/rls-local/parity.sql` and **Run**. It reads schema metadata only. All **9 of 9** rows
must match exactly, including `migrations|19`:

```
columns|227|62558cd06197b76dbd440d6a6face3cd
constraints|177|16c1b6297e4ef4ae500c12acd8c91820
function_grants|20|8f9d1e6a133a9d32cb5888d56007d7db
functions|10|271444c3f7e9bb26b0e1ef2254cc462f
migrations|19|e24d21e4f2514fc5b2bb8f2dcfd85c8b
policies|62|76e6ce12ddb03d47d76d3b0993eb8b4c
rls|17|cd7d4efafbc0eecf6aff777a874865c4
table_grants|210|d38055f86234900be200473777ce3755
triggers|2|319c7e3d349194d1a66ffa87fc9c34da
```

These rows are schema hashes, not data, and are safe to share. Any mismatch: STOP, share the mismatching rows, and
the Builder diagnoses it. Do not change hosted objects to force a match. Hosted parity is verified only when all
9 match.

## After hosted parity passes

1. Builder records the result in `.ai/DECISIONS.md` and `.ai/HANDOFF.md`.
2. Work mode QA on the fixed Preview (`https://family-finance-hub-preview.vercel.app`, serving the phase head), with
   synthetic TestA/TestB only: Q23–Q26 plus the auth regressions in `docs/workflow/QA_CHECKLIST.md`. Report
   PASS/FAIL/NOT RUN per item at the deployed commit shown by `/api/build-info`.
3. PR #143 stays out of `main` until the release checklist and Ryan's separate production-release authorization.
