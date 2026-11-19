#!/usr/bin/env bash
# FFH-P11: REAL parallel PostgreSQL sessions in run-matrix's disposable CI database (issue #172: concurrent update and
# delete races). Synthetic fixtures only; everything created here is removed again and zero residue is required.
#   1. Two editors save a reported set-aside amount from the same version at the same time: exactly one save
#      applies, the other changes nothing (no silent overwrite), and the version is bumped once.
#   2. A version-guarded "stop tracking" racing a guarded update: exactly one wins.
#   3. A tracker being started while someone deletes its bill: the delete waits for the start (the trigger holds the
#      bill row), then removes the bill and, by cascade, the tracker; no orphan.
#   4. A tracker being started while someone changes the bill to monthly: the change waits for the start, so the
#      eligibility check can never be bypassed by a concurrent edit.
# NEVER invoke on an Owner laptop, hosted database or an existing non-CI project. Builder rehearsal on the local harness
# only: run.sh reset, then FFH_P11_RACE_LOCAL_HARNESS=1 bash scripts/rls-ci/test-set-aside-concurrency.sh local <empty dir>.
set -euo pipefail
if [[ "${FFH_P11_RACE_LOCAL_HARNESS:-}" != "1" ]]; then
  [[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" &&
     "${RUNNER_ENVIRONMENT:-}" == "github-hosted" ]] ||
    { echo 'FFH_P11_CONCURRENCY_BLOCKED_SCOPE' >&2; exit 1; }
fi
container="${1:-}"
work="${2:-}"
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGSERVICE PGPORT PGDATABASE PGUSER PGPASSWORD DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "${!name:-}" ]] || { echo 'FFH_P11_CONCURRENCY_BLOCKED_ENV' >&2; exit 1; }
done
if [[ "${FFH_P11_RACE_LOCAL_HARNESS:-}" == "1" ]]; then
  # Builder rehearsal against scripts/rls-local/local-harness (127.0.0.1-only Unix socket, throw-away database).
  [[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" && -d "$work" ]] || { echo 'FFH_P11_CONCURRENCY_BLOCKED_LOCAL' >&2; exit 1; }
  db() { psql -h /tmp -p 55432 -U postgres -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -d postgres; }
else
  [[ "$container" =~ ^supabase_db_ffh_ci_rls_[a-zA-Z0-9_]+$ && -d "$work" &&
     "$work" == "${RUNNER_TEMP:-/tmp}"/ffh-rls-* ]] ||
    { echo 'FFH_P11_CONCURRENCY_BLOCKED_INPUT' >&2; exit 1; }
  [[ "$(docker ps --filter "name=^$container$" --format '{{.Names}}')" == "$container" ]] ||
    { echo 'FFH_P11_CONCURRENCY_BLOCKED_CONTAINER' >&2; exit 1; }
  db() { docker exec -i "$container" psql -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres; }
fi
fail(){ echo "FFH_P11_CONCURRENCY_FAIL=$1" >&2; exit 1; }
owner='00000000-0000-4000-8000-000000000b01'
member='00000000-0000-4000-8000-000000000b02'
house='00000000-0000-4000-8000-000000000b11'
bill_a='00000000-0000-4000-8000-000000000b21'
bill_b='00000000-0000-4000-8000-000000000b22'
bill_c='00000000-0000-4000-8000-000000000b23'

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
INSERT INTO public.households(id,name,created_by) VALUES('$house','ffh-ci-set-aside-race','$owner');
COMMIT;
INSERT INTO public.household_members(household_id,user_id,role) VALUES('$house','$member','member');
INSERT INTO public.expenses(id,household_id,name,category,payment_amount,recurrence,due_anchor_date) VALUES
 ('$bill_a','$house','ffh-ci-insurance','insurance',1200,'yearly',(now() at time zone 'utc')::date + 40),
 ('$bill_b','$house','ffh-ci-water','utilities',300,'quarterly',(now() at time zone 'utc')::date + 10),
 ('$bill_c','$house','ffh-ci-taxes','other',900,'yearly',(now() at time zone 'utc')::date + 60);
INSERT INTO public.bill_set_asides(household_id,expense_id,cycle_due_date,cycle_anchor_date,cycle_recurrence,reserved_amount)
 SELECT household_id,id,due_anchor_date,due_anchor_date,recurrence,0 FROM public.expenses WHERE id = '$bill_a';
SQL
tracker="$(db <<<"SELECT id FROM public.bill_set_asides WHERE expense_id = '$bill_a';")" || fail 'FIXTURE_READ'
[[ -n "$tracker" ]] || fail 'FIXTURE_INCOMPLETE'
echo 'FFH_P11_CONCURRENCY=FIXTURE_CREATED'

# Each statement holds its row lock for 2 s before committing, so the two sessions are guaranteed to overlap.
guarded() { # user, SQL statement returning the affected row count, log file
  { as_user "$1"; echo "$2"; echo "SELECT pg_sleep(2);"; echo "COMMIT;"; } | db >"$3" 2>&1
}
race() { # name, user 1, statement 1, user 2, statement 2
  local log_1="$work/set-aside-$1-1.log" log_2="$work/set-aside-$1-2.log"
  guarded "$2" "$3" "$log_1" & local p1=$!
  sleep 0.3
  guarded "$4" "$5" "$log_2" & local p2=$!
  s1=0; s2=0
  wait "$p1" || s1=$?
  wait "$p2" || s2=$?
  [[ "$s1" == 0 && "$s2" == 0 ]] || { cat "$log_1" "$log_2" >&2; fail "RACE_$1_SESSION_FAILED"; }
  r1="$(grep -E '^[0-9]+$' "$log_1" | head -n1)"; r2="$(grep -E '^[0-9]+$' "$log_2" | head -n1)"
}
update_sql() { echo "WITH r AS (UPDATE public.bill_set_asides SET reserved_amount = $1 WHERE id = '$tracker' AND household_id = '$house' AND version = $2 RETURNING 1) SELECT count(*) FROM r;"; }

# 1. Same version, two editors: exactly one applies.
race same-version "$owner" "$(update_sql 111.11 1)" "$member" "$(update_sql 222.22 1)"
[[ "$r1" == 1 && "$r2" == 0 ]] || fail "SAME_VERSION_NOT_SERIALIZED ($r1/$r2)"
result="$(db <<<"SELECT reserved_amount || '|' || version || '|' || (updated_by = '$owner') FROM public.bill_set_asides WHERE id = '$tracker';")"
[[ "$result" == "111.11|2|true" ]] || fail "SAME_VERSION_RESULT ($result)"
echo 'FFH_P11_CONCURRENT_SAME_VERSION=ONE_APPLIED_ONE_REFUSED'

# 2. Guarded stop racing a guarded update from the same version: exactly one wins.
race stop-vs-update "$member" "WITH r AS (DELETE FROM public.bill_set_asides WHERE id = '$tracker' AND household_id = '$house' AND version = 2 RETURNING 1) SELECT count(*) FROM r;" \
  "$owner" "$(update_sql 333.33 2)"
[[ "$r1" == 1 && "$r2" == 0 ]] || fail "STOP_VS_UPDATE_NOT_SERIALIZED ($r1/$r2)"
[[ "$(db <<<"SELECT count(*) FROM public.bill_set_asides WHERE id = '$tracker';")" == 0 ]] || fail 'STOP_VS_UPDATE_RESULT'
echo 'FFH_P11_CONCURRENT_STOP_VS_UPDATE=ONE_WON'

start_sql() { echo "WITH r AS (INSERT INTO public.bill_set_asides(household_id,expense_id,cycle_due_date,cycle_anchor_date,cycle_recurrence,reserved_amount) SELECT household_id,id,due_anchor_date,due_anchor_date,recurrence,10 FROM public.expenses WHERE id = '$1' RETURNING 1) SELECT count(*) FROM r;"; }

# 3. Starting a tracker while the bill is deleted: the delete waits, then cascades; no orphan.
t0=$(date +%s%N)
race start-vs-delete "$owner" "$(start_sql "$bill_b")" "$member" "WITH r AS (DELETE FROM public.expenses WHERE id = '$bill_b' RETURNING 1) SELECT count(*) FROM r;"
elapsed_ms=$(( ($(date +%s%N) - t0) / 1000000 ))
[[ "$r1" == 1 && "$r2" == 1 ]] || fail "START_VS_DELETE ($r1/$r2)"
[[ "$elapsed_ms" -ge 3500 ]] || fail "START_VS_DELETE_DID_NOT_WAIT (${elapsed_ms}ms)"
[[ "$(db <<<"SELECT count(*) FROM public.bill_set_asides WHERE expense_id = '$bill_b';")" == 0 ]] || fail 'START_VS_DELETE_ORPHAN'
echo 'FFH_P11_CONCURRENT_START_VS_BILL_DELETE=SERIALIZED_NO_ORPHAN'

# 4. Starting a tracker while the bill becomes monthly: the change waits for the start (the check can't be bypassed).
t0=$(date +%s%N)
race start-vs-monthly "$owner" "$(start_sql "$bill_c")" "$member" "WITH r AS (UPDATE public.expenses SET recurrence = 'monthly' WHERE id = '$bill_c' RETURNING 1) SELECT count(*) FROM r;"
elapsed_ms=$(( ($(date +%s%N) - t0) / 1000000 ))
[[ "$r1" == 1 && "$r2" == 1 ]] || fail "START_VS_MONTHLY ($r1/$r2)"
[[ "$elapsed_ms" -ge 3500 ]] || fail "START_VS_MONTHLY_DID_NOT_WAIT (${elapsed_ms}ms)"
echo 'FFH_P11_CONCURRENT_START_VS_SCHEDULE_CHANGE=SERIALIZED'

db >/dev/null <<SQL
DELETE FROM public.households WHERE id = '$house';
DELETE FROM auth.sessions WHERE user_id IN ('$owner','$member');
DELETE FROM auth.users WHERE id IN ('$owner','$member');
SQL
final="$(db <<SQL
SELECT ((SELECT count(*) FROM auth.users WHERE id IN ('$owner','$member')) = 0
 AND (SELECT count(*) FROM public.households WHERE id = '$house') = 0
 AND (SELECT count(*) FROM public.expenses WHERE household_id = '$house') = 0
 AND (SELECT count(*) FROM public.bill_set_asides WHERE household_id = '$house') = 0)::int;
SQL
)" || fail 'FINAL_READ'
[[ "$final" == 1 ]] || fail 'RESIDUE'
echo 'FFH_P11_SET_ASIDE_CONCURRENCY=PASS ZERO_RESIDUE=PASS'
