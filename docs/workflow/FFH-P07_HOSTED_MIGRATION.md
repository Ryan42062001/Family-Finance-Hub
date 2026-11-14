# FFH-P07 hosted migration `20261114100000` procedure

Applies `supabase/migrations/20261114100000_ffh_p07_goals_and_check_ins.sql` (savings goals and monthly check-ins)
to hosted Supabase.

**What it changes:** it only **adds** things: three new tables (`savings_goals`, `monthly_check_ins`,
`monthly_check_in_balances`) with their RLS policies, two trigger functions, one helper and two check-in functions.
No existing table, policy, function or row is changed. Production code doesn't use the new tables until FFH-P07 is
released, so Production keeps working as it does now. Preview and Production share this one Supabase project.

**Each step needs Ryan's explicit authorization before it runs.** Steps 1, 3 and 5 are read-only; steps 2, 3's fix
(only if needed) and 4 change the hosted database. Ryan runs everything in the Supabase SQL Editor (one **New query**
per step). Nothing is deleted or repaired automatically.

**Evidence rule:** share only the outputs this document asks for (counts, `true`/`false`, hashes, the parity rows,
an error code name). Never share user IDs, household IDs, emails, names or amounts, and never screenshot table rows.

Reviewed source: phase head `108c76e8e16155102a6308ada89a93679dbe2d07` (PR #151; CI run 43559892101 at the PR head
`9571ac7`: `fast` pass, `rls-matrix` 1208/1208 with parity MATCH).

## Step 1: read-only precheck (authorize: "read-only precheck")

```sql
select
  to_regclass('public.savings_goals') is null              as no_savings_goals_table,
  to_regclass('public.monthly_check_ins') is null          as no_check_ins_table,
  to_regclass('public.monthly_check_in_balances') is null  as no_balances_table,
  exists (select 1 from supabase_migrations.schema_migrations
          where version = '20261114100000')                as migration_already_recorded,
  (select count(*) from supabase_migrations.schema_migrations) as migrations_recorded;
```

Expected: `true | true | true | false | 19`. Anything else: STOP and report the row.

## Step 2: apply the migration (authorize: "apply migration 20261114100000")

1. Open the file on GitHub at the reviewed commit:
   `https://github.com/Ryan42062001/Family-Finance-Hub/blob/108c76e8e16155102a6308ada89a93679dbe2d07/supabase/migrations/20261114100000_ffh_p07_goals_and_check_ins.sql`
   and use **Copy raw file** (the copy icon), not a selection from the page.
2. In a new query type `begin;` on the first line, paste the **whole file exactly as it is** below it (keep every
   comment; comments inside `$$ … $$` are part of the stored function and the parity hash), and type `commit;` on
   the last line. **Run.**

- **Success:** "Success. No rows returned."
- **Any error:** everything rolls back and nothing changes. STOP and report the error code/first line only. A lock
  timeout can be retried once after a minute.

## Step 3: function body check (authorize: "body check and fix if needed")

Read-only check that the five stored function bodies are exactly the repository text (a paste from Windows or a
phone can add `\r` characters):

```sql
select n.nspname || '.' || p.proname as fn, md5(p.prosrc) as body_md5, position(E'\r' in p.prosrc) > 0 as has_cr
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('monthly_check_in_before_write', 'monthly_check_in_balance_before_update',
                    'check_in_amount', 'create_monthly_check_in', 'update_monthly_check_in')
order by 1;
```

Expected exactly:

```
private.check_in_amount                        | 197ab41b04245ac4085ef4048c92c542 | false
private.monthly_check_in_balance_before_update | c57c7ef9c817e388e3a0383488b21afb | false
private.monthly_check_in_before_write          | 39153e14e6f3e138a5b191e1636f816c | false
public.create_monthly_check_in                 | 5b7530a329b83eb01f89565c1ae34b98 | false
public.update_monthly_check_in                 | b4cb896672ff9eda0a3a80541f8ba271 | false
```

- **All match:** go to step 4.
- **Any `has_cr` is `true`:** run this once, then re-run the check and expect the table above:

```sql
do $fix$
declare
  f regprocedure;
begin
  foreach f in array array[
    'private.check_in_amount(jsonb)'::regprocedure,
    'private.monthly_check_in_balance_before_update()'::regprocedure,
    'private.monthly_check_in_before_write()'::regprocedure,
    'public.create_monthly_check_in(date, boolean, jsonb)'::regprocedure,
    'public.update_monthly_check_in(uuid, boolean, jsonb)'::regprocedure]
  loop
    execute replace(pg_get_functiondef(f), E'\r', '');
  end loop;
end
$fix$;
```

  `create or replace` keeps each function's owner, grants, triggers and settings; only the body text changes.
- **A hash differs and `has_cr` is `false`:** STOP and report the mismatching row (the paste was altered).

## Step 4: record the migration version (authorize: "record migration version")

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20261114100000', 'ffh_p07_goals_and_check_ins');
```

Expected: "Success. No rows returned." A duplicate-key error means it was already recorded: STOP and report.

## Step 5: hosted parity (authorize: "run hosted parity")

Paste the whole of `scripts/rls-local/parity.sql` (phase branch) and **Run**. It reads schema metadata only. All
**9 of 9** rows must match exactly, including `migrations|20`:

```
columns|257|e4de6fc819eaaf171e21f72919569848
constraints|196|b286c0f850718815f957143c6fd11cbf
function_grants|30|02defe5787f4b590f4f4b26c86a69249
functions|15|0e9d0c1c78df421b3fabfa0d87a5a5d7
migrations|20|0409afa6c84ccdb8fc4babe5e132cab3
policies|74|c50ee01053a71b1fa7a23bc2aa5142b8
rls|20|51d68635fe4a6ccbb613d6215363fe43
table_grants|234|ba748e33bdbc3a76ef44d4f918559ba1
triggers|4|61c4012ae44b99794d82609f1cb36e53
```

These rows are schema hashes, not data, and are safe to share. Any mismatch: STOP, share the mismatching rows, and
the Builder diagnoses it. Do not change hosted objects to force a match.

## After hosted parity passes

1. Builder records the result in `.ai/DECISIONS.md` and `.ai/HANDOFF.md`.
2. Work mode QA on the fixed Preview with synthetic TestA/TestB: Q27–Q31 plus the auth and isolation regressions in
   `docs/workflow/QA_CHECKLIST.md`, reported PASS/FAIL/NOT RUN per item at the commit shown by `/api/build-info`.
3. Independent different-model review at the frozen head (`docs/workflow/REVIEW_PROMPT.md`).
4. The phase stays out of `main` until the release checklist and Ryan's separate production-release authorization.

## Result (2026-11-14)

Applied by Ryan. Precheck as expected; migration applied in one transaction; version `20261114100000` recorded. The
first body check showed `has_cr = true` on all five functions: the SQL Editor stored the paste with CRLF line
endings (each hash equalled the repository body with `\r\n`, verified by the Builder). The step 3 fix (tested first on
a local database, where it restored the exact hashes and kept security, `search_path`, grants and triggers, with the
1208-assertion matrix still passing) was run once; all five bodies then matched exactly with `has_cr = false`.
Final hosted `parity.sql`: **9/9 match**, migrations 20.

## Part 2: follow-up migration `20261114110000` (rule C6, original wording)

Applies `supabase/migrations/20261114110000_ffh_p07_cash_flow_availability.sql`: one `create or replace` of the
trigger function `private.monthly_check_in_before_write()`, so that planned cash flow is "not available" only when the
profile has no active income AND no expenses. No table, policy, grant or saved row changes. Same evidence rule.

### 2.1 Read-only precheck (authorize: "read-only precheck 2")

```sql
select
  exists (select 1 from supabase_migrations.schema_migrations where version = '20261114100000') as p07_applied,
  exists (select 1 from supabase_migrations.schema_migrations where version = '20261114110000') as c6_already_recorded,
  (select count(*) from supabase_migrations.schema_migrations) as migrations_recorded,
  (select md5(prosrc) from pg_proc where oid = 'private.monthly_check_in_before_write()'::regprocedure) as current_body_md5;
```

Expected: `true | false | 20 | 39153e14e6f3e138a5b191e1636f816c`. Anything else: STOP and report the row.

### 2.2 Apply (authorize: "apply migration 20261114110000")

Copy the raw file from GitHub at the reviewed commit (link in the Builder's message), type `begin;` above it and
`commit;` below it, **Run**. Expected: "Success. No rows returned."

### 2.3 Body check, fix only if needed (authorize: "body check 2 and fix if needed")

```sql
select md5(prosrc) as body_md5, position(E'\r' in prosrc) > 0 as has_cr
from pg_proc where oid = 'private.monthly_check_in_before_write()'::regprocedure;
```

Expected: `8199463bb22feceef9dc5e60441a6cd6 | false`. If `has_cr` is `true`, run:

```sql
do $fix$
begin
  execute replace(pg_get_functiondef('private.monthly_check_in_before_write()'::regprocedure), E'\r', '');
end
$fix$;
```

then repeat the check. A different hash with `has_cr = false`: STOP and report it.

### 2.4 Record the version (authorize: "record migration version 2")

```sql
insert into supabase_migrations.schema_migrations (version, name)
values ('20261114110000', 'ffh_p07_cash_flow_availability');
```

### 2.5 Hosted parity (authorize: "run hosted parity 2")

Run `scripts/rls-local/parity.sql` from the phase branch. All 9 rows must match exactly (only `functions` and
`migrations` differ from part 1):

```
columns|257|e4de6fc819eaaf171e21f72919569848
constraints|196|b286c0f850718815f957143c6fd11cbf
function_grants|30|02defe5787f4b590f4f4b26c86a69249
functions|15|f09b98b85c628efd66cbf532256a64b7
migrations|21|ec9ec6cf3c29d2a7e71e5813d7559a2d
policies|74|c50ee01053a71b1fa7a23bc2aa5142b8
rls|20|51d68635fe4a6ccbb613d6215363fe43
table_grants|234|ba748e33bdbc3a76ef44d4f918559ba1
triggers|4|61c4012ae44b99794d82609f1cb36e53
```

Any mismatch: STOP and share the mismatching rows.

## Part 2 result (2026-11-14)

Applied by Ryan from phase head `63703807`. Function body `8199463bb22feceef9dc5e60441a6cd6`, `has_cr = false`;
version `20261114110000` recorded. Final hosted `parity.sql`: **9/9 match**, migrations 21.
