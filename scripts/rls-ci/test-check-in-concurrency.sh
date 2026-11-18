#!/usr/bin/env bash
# FFH-P07 review N01: REAL parallel PostgreSQL sessions in run-matrix's disposable CI database.
# Two household editors save the same check-in at the same time, listing its two balance lines in
# opposite orders. With the pre-N01 function body this deadlocks (one save fails); with the tracked
# fix (check-in row locked first) both saves succeed one after the other, each applied as a whole.
# Synthetic fixtures only; everything created here is removed again and zero residue is required.
# NEVER invoke on an Owner laptop, hosted database or an existing non-CI project.
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" &&
   "${RUNNER_ENVIRONMENT:-}" == "github-hosted" ]] ||
  { echo 'FFH_P07_CONCURRENCY_BLOCKED_SCOPE' >&2; exit 1; }
container="${1:-}"
work="${2:-}"
[[ "$container" =~ ^supabase_db_ffh_ci_rls_[a-zA-Z0-9_]+$ && -d "$work" &&
   "$work" == "${RUNNER_TEMP:-/tmp}"/ffh-rls-* ]] ||
  { echo 'FFH_P07_CONCURRENCY_BLOCKED_INPUT' >&2; exit 1; }
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGSERVICE PGPORT PGDATABASE PGUSER PGPASSWORD DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "${!name:-}" ]] || { echo 'FFH_P07_CONCURRENCY_BLOCKED_ENV' >&2; exit 1; }
done
[[ "$(docker ps --filter "name=^$container$" --format '{{.Names}}')" == "$container" ]] ||
  { echo 'FFH_P07_CONCURRENCY_BLOCKED_CONTAINER' >&2; exit 1; }
db() {
  docker exec -i "$container" psql -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres
}
fail(){ echo "FFH_P07_CONCURRENCY_FAIL=$1" >&2; exit 1; }
owner='00000000-0000-4000-8000-000000000a01'
member='00000000-0000-4000-8000-000000000a02'
house='00000000-0000-4000-8000-000000000a11'
before_fix='supabase/migrations/20261114120000_ffh_p07_check_in_write_integrity.sql'
with_fix='supabase/migrations/20261118100000_ffh_p08_account_security.sql'
[[ -f "$before_fix" && -f "$with_fix" ]] || fail 'MIGRATION_FILES_MISSING'

# Only the update function of each file is loaded (the earlier file's revokes are already applied).
function_from() {
  python3 - "$1" <<'PY'
import sys
s = open(sys.argv[1]).read()
a = s.index('create or replace function public.update_monthly_check_in(')
print(s[a:s.index('$$;', a) + 3])
PY
}

baseline="$(db <<SQL
SELECT ((SELECT count(*) FROM auth.users WHERE id IN ('$owner','$member')) = 0
 AND (SELECT count(*) FROM public.households WHERE id = '$house') = 0)::int;
SQL
)" || fail 'BASELINE_READ'
[[ "$baseline" == 1 ]] || fail 'BASELINE_NOT_EMPTY'

# Synthetic household with one owner, one member, one account and one debt, and one check-in
# created through the real function as the signed-in owner.
db >/dev/null <<SQL
INSERT INTO auth.users(id,instance_id,aud,role) VALUES
 ('$owner','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('$member','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
-- FFH-P08: each synthetic user gets a live session (id = user id) for private.session_ok().
INSERT INTO auth.sessions(id,user_id,aal) SELECT u.id,u.id,'aal1' FROM auth.users u
 WHERE NOT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id=u.id);
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$owner',true);
SELECT set_config('request.jwt.claims',json_build_object('sub','$owner','session_id','$owner','aal','aal1','role','authenticated')::text,true);
INSERT INTO public.households(id,name,created_by) VALUES('$house','ffh-ci-check-in-race','$owner');
COMMIT;
INSERT INTO public.household_members(household_id,user_id,role) VALUES('$house','$member','member');
INSERT INTO public.accounts(household_id,name,account_type,balance) VALUES('$house','ffh-ci-account','checking',100);
INSERT INTO public.debts(household_id,name,debt_type,current_balance) VALUES('$house','ffh-ci-debt','other',50);
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$owner',true);
SELECT set_config('request.jwt.claims',json_build_object('sub','$owner','session_id','$owner','aal','aal1','role','authenticated')::text,true);
SELECT public.create_monthly_check_in(DATE '2026-01-01', true, (
  SELECT jsonb_agg(x) FROM (
    SELECT jsonb_build_object('item_type','account','item_id',id,'amount','100.00') x FROM public.accounts WHERE household_id='$house'
    UNION ALL
    SELECT jsonb_build_object('item_type','debt','item_id',id,'amount','50.00') FROM public.debts WHERE household_id='$house') s));
COMMIT;
SQL
ids="$(db <<SQL
SELECT c.id || ' ' || (SELECT l.id FROM public.monthly_check_in_balances l WHERE l.check_in_id=c.id AND l.item_type='account')
 || ' ' || (SELECT l.id FROM public.monthly_check_in_balances l WHERE l.check_in_id=c.id AND l.item_type='debt')
FROM public.monthly_check_ins c WHERE c.household_id='$house';
SQL
)" || fail 'FIXTURE_READ'
read -r check_in line_a line_b <<<"$ids"
[[ -n "$check_in" && -n "$line_a" && -n "$line_b" ]] || fail 'FIXTURE_INCOMPLETE'
echo 'FFH_P07_CONCURRENCY=FIXTURE_CREATED'

# CI-only delay: after each balance line is updated (so its row lock is held), pause, so the two
# sessions are guaranteed to overlap while each holds one line.
db >/dev/null <<SQL
CREATE FUNCTION private.ffh_ci_check_in_race_delay() RETURNS trigger LANGUAGE plpgsql
 SECURITY INVOKER SET search_path = '' AS \$trigger\$
BEGIN
  IF NEW.household_id = '$house'::uuid THEN
    RAISE NOTICE 'FFH_P07_RACE_LINE_LOCKED';
    PERFORM pg_sleep(2);
  END IF;
  RETURN NEW;
END;
\$trigger\$;
CREATE TRIGGER ffh_ci_check_in_race_delay AFTER UPDATE ON public.monthly_check_in_balances
 FOR EACH ROW EXECUTE FUNCTION private.ffh_ci_check_in_race_delay();
SQL

save() { # editor, first line, first amount, second line, second amount
  db <<SQL
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$1',true);
SELECT set_config('request.jwt.claims',json_build_object('sub','$1','session_id','$1','aal','aal1','role','authenticated')::text,true);
SELECT public.update_monthly_check_in('$check_in', true,
  jsonb_build_array(jsonb_build_object('id','$2','amount','$3'), jsonb_build_object('id','$4','amount','$5')));
COMMIT;
SQL
}
pair() {
  local name="$1" log_1="$work/check-in-${1}-1.log" log_2="$work/check-in-${1}-2.log"
  save "$owner" "$line_a" '111.11' "$line_b" '11.11' >"$log_1" 2>&1 & local p1=$!
  sleep 0.3
  save "$member" "$line_b" '22.22' "$line_a" '222.22' >"$log_2" 2>&1 & local p2=$!
  s1=0; s2=0
  wait "$p1" || s1=$?
  wait "$p2" || s2=$?
}

# RED TEAM: the pre-N01 body must reproduce the deadlock (proves the test can see it).
function_from "$before_fix" | db >/dev/null
pair before
[[ "$s1" == 0 && "$s2" != 0 || "$s1" != 0 && "$s2" == 0 ]] || fail 'DEADLOCK_NOT_REPRODUCED'
cat "$work"/check-in-before-*.log | grep -q 'deadlock detected' || fail 'DEADLOCK_NOT_REPRODUCED_MESSAGE'
echo 'FFH_P07_CONCURRENT_EDIT_BEFORE_FIX=DEADLOCK_REPRODUCED'

# The tracked fix: both saves succeed, one after the other, and the result is exactly one
# editor's complete set (never a mix of the two).
function_from "$with_fix" | db >/dev/null
pair after
[[ "$s1" == 0 && "$s2" == 0 ]] || { cat "$work"/check-in-after-*.log >&2; fail 'CONCURRENT_EDITS_NOT_BOTH_SAVED'; }
result="$(db <<SQL
SELECT (SELECT amount FROM public.monthly_check_in_balances WHERE id='$line_a') || '|' ||
       (SELECT amount FROM public.monthly_check_in_balances WHERE id='$line_b') || '|' ||
       (SELECT CASE WHEN updated_by IN ('$owner','$member') THEN 'stamped' ELSE 'unstamped' END
          FROM public.monthly_check_ins WHERE id='$check_in');
SQL
)" || fail 'RESULT_READ'
[[ "$result" == "111.11|11.11|stamped" || "$result" == "222.22|22.22|stamped" ]] || fail 'MIXED_OR_UNSTAMPED_RESULT'
echo 'FFH_P07_CONCURRENT_EDIT_WITH_FIX=BOTH_SAVED_SERIALIZED'

db >/dev/null <<SQL
DROP TRIGGER ffh_ci_check_in_race_delay ON public.monthly_check_in_balances;
DROP FUNCTION private.ffh_ci_check_in_race_delay();
DELETE FROM public.households WHERE id = '$house';
DELETE FROM auth.users WHERE id IN ('$owner','$member');
SQL
final="$(db <<SQL
SELECT ((SELECT count(*) FROM auth.users WHERE id IN ('$owner','$member')) = 0
 AND (SELECT count(*) FROM public.households WHERE id = '$house') = 0
 AND (SELECT count(*) FROM public.monthly_check_ins WHERE household_id = '$house') = 0
 AND (SELECT count(*) FROM public.monthly_check_in_balances WHERE household_id = '$house') = 0
 AND to_regprocedure('private.ffh_ci_check_in_race_delay()') IS NULL
 AND (SELECT prosecdef AND position('for update' in prosrc) > 0 FROM pg_proc
      WHERE oid = 'public.update_monthly_check_in(uuid, boolean, jsonb)'::regprocedure))::int;
SQL
)" || fail 'FINAL_READ'
[[ "$final" == 1 ]] || fail 'RESIDUE'
echo 'FFH_P07_CHECK_IN_CONCURRENCY=PASS ZERO_RESIDUE=PASS'
