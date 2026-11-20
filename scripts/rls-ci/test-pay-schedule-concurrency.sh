#!/usr/bin/env bash
# FFH-P12: REAL parallel PostgreSQL sessions in run-matrix's disposable CI database (issue #203: concurrent updates,
# stale snapshots and parent races). Synthetic fixtures only; everything created here is removed and zero residue is
# required.
#   1. Two editors save a pay schedule from the same version at the same time: exactly one save applies, the other
#      changes nothing (no lost update), and the version is bumped once.
#   2. A version-guarded delete racing a guarded update: exactly one wins.
#   3. A schedule being created while someone deletes its income: the delete waits for the create (the trigger holds
#      the income row FOR SHARE), then removes the income and, by cascade, the schedule; no orphan.
#   4. An amount edit racing its income being paused (inactive): the edit waits for the pause, then is refused (every
#      write is revalidated against the income row it holds); the schedule keeps its amount and version.
# NEVER invoke on an Owner laptop, hosted database or an existing non-CI project. Builder rehearsal on the local harness
# only: run.sh reset, then FFH_P12_RACE_LOCAL_HARNESS=1 bash scripts/rls-ci/test-pay-schedule-concurrency.sh local <empty dir>.
set -euo pipefail
if [[ "${FFH_P12_RACE_LOCAL_HARNESS:-}" != "1" ]]; then
  [[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" &&
     "${RUNNER_ENVIRONMENT:-}" == "github-hosted" ]] ||
    { echo 'FFH_P12_CONCURRENCY_BLOCKED_SCOPE' >&2; exit 1; }
fi
container="${1:-}"
work="${2:-}"
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGSERVICE PGPORT PGDATABASE PGUSER PGPASSWORD DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "${!name:-}" ]] || { echo 'FFH_P12_CONCURRENCY_BLOCKED_ENV' >&2; exit 1; }
done
if [[ "${FFH_P12_RACE_LOCAL_HARNESS:-}" == "1" ]]; then
  [[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" && -d "$work" ]] || { echo 'FFH_P12_CONCURRENCY_BLOCKED_LOCAL' >&2; exit 1; }
  db() { psql -h /tmp -p 55432 -U postgres -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -d postgres; }
else
  [[ "$container" =~ ^supabase_db_ffh_ci_rls_[a-zA-Z0-9_]+$ && -d "$work" &&
     "$work" == "${RUNNER_TEMP:-/tmp}"/ffh-rls-* ]] ||
    { echo 'FFH_P12_CONCURRENCY_BLOCKED_INPUT' >&2; exit 1; }
  [[ "$(docker ps --filter "name=^$container$" --format '{{.Names}}')" == "$container" ]] ||
    { echo 'FFH_P12_CONCURRENCY_BLOCKED_CONTAINER' >&2; exit 1; }
  db() { docker exec -i "$container" psql -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres; }
fi
fail(){ echo "FFH_P12_CONCURRENCY_FAIL=$1" >&2; exit 1; }
owner='00000000-0000-4000-8000-000000000c01'
member='00000000-0000-4000-8000-000000000c02'
house='00000000-0000-4000-8000-000000000c11'
inc_a='00000000-0000-4000-8000-000000000c21'
inc_b='00000000-0000-4000-8000-000000000c22'
inc_c='00000000-0000-4000-8000-000000000c23'

baseline="$(db <<SQL
SELECT ((SELECT count(*) FROM auth.users WHERE id IN ('$owner','$member')) = 0
 AND (SELECT count(*) FROM public.households WHERE id = '$house') = 0)::int;
SQL
)" || fail 'BASELINE_READ'
[[ "$baseline" == 1 ]] || fail 'BASELINE_NOT_EMPTY'

as_user() { # user id; the rest of stdin runs as that signed-in user inside one transaction
  printf "BEGIN;\nSET LOCAL statement_timeout='30s';\nSET LOCAL ROLE authenticated;\n"
  printf "SELECT set_config('request.jwt.claim.sub','%s',true);\n" "$1"
  printf "SELECT set_config('request.jwt.claims',json_build_object('sub','%s','session_id','%s','aal','aal1','role','authenticated')::text,true);\n" "$1" "$1"
}

db >/dev/null <<SQL
INSERT INTO auth.users(id,instance_id,aud,role) VALUES
 ('$owner','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('$member','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
INSERT INTO auth.sessions(id,user_id,aal) SELECT u.id,u.id,'aal1' FROM auth.users u
 WHERE u.id IN ('$owner','$member') AND NOT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.id=u.id);
$(as_user "$owner")
INSERT INTO public.households(id,name,created_by) VALUES('$house','ffh-ci-pay-schedule-race','$owner');
COMMIT;
INSERT INTO public.household_members(household_id,user_id,role) VALUES('$house','$member','member');
INSERT INTO public.income_sources(id,household_id,name,monthly_amount) VALUES
 ('$inc_a','$house','ffh-ci-pay-a',4333.33),('$inc_b','$house','ffh-ci-pay-b',1000),('$inc_c','$house','ffh-ci-pay-c',2000);
$(as_user "$owner")
INSERT INTO public.income_pay_schedules(household_id,income_source_id,frequency,expected_deposit_amount,next_expected_deposit_date)
 VALUES ('$house','$inc_a','biweekly',2000,(now() at time zone 'utc')::date + 5),
        ('$house','$inc_c','monthly',2000,(now() at time zone 'utc')::date + 9);
COMMIT;
SQL
sched="$(db <<<"SELECT id FROM public.income_pay_schedules WHERE income_source_id = '$inc_a';")" || fail 'FIXTURE_READ'
sched_c="$(db <<<"SELECT id FROM public.income_pay_schedules WHERE income_source_id = '$inc_c';")" || fail 'FIXTURE_READ'
[[ -n "$sched" && -n "$sched_c" ]] || fail 'FIXTURE_INCOMPLETE'
echo 'FFH_P12_CONCURRENCY=FIXTURE_CREATED'

# Each statement holds its row lock for 2 s before committing, so the two sessions are guaranteed to overlap.
guarded() { # user, SQL statement returning the affected row count, log file
  { as_user "$1"; echo "$2"; echo "SELECT pg_sleep(2);"; echo "COMMIT;"; } | db >"$3" 2>&1
}
race() { # name, user 1, statement 1, user 2, statement 2
  local log_1="$work/pay-schedule-$1-1.log" log_2="$work/pay-schedule-$1-2.log"
  guarded "$2" "$3" "$log_1" & local p1=$!
  sleep 0.3
  guarded "$4" "$5" "$log_2" & local p2=$!
  s1=0; s2=0
  wait "$p1" || s1=$?
  wait "$p2" || s2=$?
  [[ "$s1" == 0 && "$s2" == 0 ]] || { cat "$log_1" "$log_2" >&2; fail "RACE_$1_SESSION_FAILED"; }
  r1="$(grep -E '^[0-9]+$' "$log_1" | head -n1)"; r2="$(grep -E '^[0-9]+$' "$log_2" | head -n1)"
}
update_sql() { echo "WITH r AS (UPDATE public.income_pay_schedules SET expected_deposit_amount = $1 WHERE id = '$sched' AND household_id = '$house' AND version = $2 RETURNING 1) SELECT count(*) FROM r;"; }

# 1. Same version, two editors: exactly one applies.
race same-version "$owner" "$(update_sql 2111.11 1)" "$member" "$(update_sql 2222.22 1)"
[[ "$r1" == 1 && "$r2" == 0 ]] || fail "SAME_VERSION_NOT_SERIALIZED ($r1/$r2)"
result="$(db <<<"SELECT expected_deposit_amount || '|' || version || '|' || (updated_by = '$owner') FROM public.income_pay_schedules WHERE id = '$sched';")"
[[ "$result" == "2111.11|2|true" ]] || fail "SAME_VERSION_RESULT ($result)"
echo 'FFH_P12_CONCURRENT_SAME_VERSION=ONE_APPLIED_ONE_REFUSED'

# 2. Guarded delete racing a guarded update from the same version: exactly one wins.
race delete-vs-update "$member" "WITH r AS (DELETE FROM public.income_pay_schedules WHERE id = '$sched' AND household_id = '$house' AND version = 2 RETURNING 1) SELECT count(*) FROM r;" \
  "$owner" "$(update_sql 2333.33 2)"
[[ "$r1" == 1 && "$r2" == 0 ]] || fail "DELETE_VS_UPDATE_NOT_SERIALIZED ($r1/$r2)"
[[ "$(db <<<"SELECT count(*) FROM public.income_pay_schedules WHERE id = '$sched';")" == 0 ]] || fail 'DELETE_VS_UPDATE_RESULT'
[[ "$(db <<<"SELECT monthly_amount FROM public.income_sources WHERE id = '$inc_a';")" == "4333.33" ]] || fail 'DELETE_CHANGED_INCOME'
echo 'FFH_P12_CONCURRENT_DELETE_VS_UPDATE=ONE_WON'

# 3. Creating a schedule while its income is deleted: the delete waits, then cascades; no orphan.
create_sql="WITH r AS (INSERT INTO public.income_pay_schedules(household_id,income_source_id,frequency,expected_deposit_amount,next_expected_deposit_date) VALUES ('$house','$inc_b','weekly',250,(now() at time zone 'utc')::date + 3) RETURNING 1) SELECT count(*) FROM r;"
t0=$(date +%s%N)
race create-vs-delete "$owner" "$create_sql" "$member" "WITH r AS (DELETE FROM public.income_sources WHERE id = '$inc_b' RETURNING 1) SELECT count(*) FROM r;"
elapsed_ms=$(( ($(date +%s%N) - t0) / 1000000 ))
[[ "$r1" == 1 && "$r2" == 1 ]] || fail "CREATE_VS_DELETE ($r1/$r2)"
[[ "$elapsed_ms" -ge 3500 ]] || fail "CREATE_VS_DELETE_DID_NOT_WAIT (${elapsed_ms}ms)"
[[ "$(db <<<"SELECT count(*) FROM public.income_pay_schedules WHERE income_source_id = '$inc_b';")" == 0 ]] || fail 'CREATE_VS_DELETE_ORPHAN'
echo 'FFH_P12_CONCURRENT_CREATE_VS_INCOME_DELETE=SERIALIZED_NO_ORPHAN'

# 4. An amount edit racing its income being paused: the pause holds the income row; the edit's trigger waits for it
#    (FOR SHARE), then sees an inactive income and refuses. The schedule keeps its old amount and version.
log_1="$work/pay-schedule-edit-vs-pause-1.log"; log_2="$work/pay-schedule-edit-vs-pause-2.log"
t0=$(date +%s%N)
guarded "$member" "WITH r AS (UPDATE public.income_sources SET is_active = false WHERE id = '$inc_c' RETURNING 1) SELECT count(*) FROM r;" "$log_1" & p1=$!
sleep 0.3
guarded "$owner" "WITH r AS (UPDATE public.income_pay_schedules SET expected_deposit_amount = 77.77 WHERE id = '$sched_c' AND household_id = '$house' AND version = 1 RETURNING 1) SELECT count(*) FROM r;" "$log_2" & p2=$!
s1=0; s2=0
wait "$p1" || s1=$?
wait "$p2" || s2=$?
elapsed_ms=$(( ($(date +%s%N) - t0) / 1000000 ))
[[ "$s1" == 0 && "$(grep -E '^[0-9]+$' "$log_1" | head -n1)" == 1 ]] || { cat "$log_1" >&2; fail 'PAUSE_NOT_APPLIED'; }
[[ "$s2" != 0 ]] && grep -q 'only an active income source' "$log_2" || { cat "$log_2" >&2; fail 'EDIT_ON_PAUSED_INCOME_NOT_REFUSED'; }
[[ "$elapsed_ms" -ge 2000 ]] || fail "EDIT_DID_NOT_WAIT (${elapsed_ms}ms)"
result="$(db <<<"SELECT expected_deposit_amount || '|' || version FROM public.income_pay_schedules WHERE id = '$sched_c';")"
[[ "$result" == "2000|1" ]] || fail "EDIT_VS_PAUSE_RESULT ($result)"
echo 'FFH_P12_CONCURRENT_EDIT_VS_INCOME_PAUSE=WAITED_AND_REFUSED'

db >/dev/null <<SQL
DELETE FROM public.households WHERE id = '$house';
DELETE FROM auth.sessions WHERE user_id IN ('$owner','$member');
DELETE FROM auth.users WHERE id IN ('$owner','$member');
SQL
final="$(db <<SQL
SELECT ((SELECT count(*) FROM auth.users WHERE id IN ('$owner','$member')) = 0
 AND (SELECT count(*) FROM public.households WHERE id = '$house') = 0
 AND (SELECT count(*) FROM public.income_sources WHERE household_id = '$house') = 0
 AND (SELECT count(*) FROM public.income_pay_schedules WHERE household_id = '$house') = 0)::int;
SQL
)" || fail 'FINAL_READ'
[[ "$final" == 1 ]] || fail 'RESIDUE'
echo 'FFH_P12_PAY_SCHEDULE_CONCURRENCY=PASS ZERO_RESIDUE=PASS'
