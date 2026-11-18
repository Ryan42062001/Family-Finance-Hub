#!/usr/bin/env bash
# FFH-P08 review N03: REAL parallel PostgreSQL sessions in run-matrix's disposable CI database.
# A sole owner deletes their account while someone accepts an invitation to that household.
#   RED TEAM  - the P06 accept body (invitation row locked first, household only implicitly by the membership
#               insert) deadlocks against delete_my_account (household first, then the invitation via cascade).
#   WITH FIX  - the P08 body locks the household first, so the two serialize: the join completes and the
#               deletion is then refused because the household is no longer the owner's alone (R3).
# A CI-only pg_sleep is injected after the invitation lock so the sessions are guaranteed to overlap.
# Synthetic fixtures only; zero residue required. NEVER invoke on an Owner laptop or hosted database.
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" &&
   "${RUNNER_ENVIRONMENT:-}" == "github-hosted" ]] ||
  { echo 'FFH_P08_LOCK_ORDER_BLOCKED_SCOPE' >&2; exit 1; }
container="${1:-}"
work="${2:-}"
[[ "$container" =~ ^supabase_db_ffh_ci_rls_[a-zA-Z0-9_]+$ && -d "$work" &&
   "$work" == "${RUNNER_TEMP:-/tmp}"/ffh-rls-* ]] ||
  { echo 'FFH_P08_LOCK_ORDER_BLOCKED_INPUT' >&2; exit 1; }
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGSERVICE PGPORT PGDATABASE PGUSER PGPASSWORD DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "${!name:-}" ]] || { echo 'FFH_P08_LOCK_ORDER_BLOCKED_ENV' >&2; exit 1; }
done
[[ "$(docker ps --filter "name=^$container$" --format '{{.Names}}')" == "$container" ]] ||
  { echo 'FFH_P08_LOCK_ORDER_BLOCKED_CONTAINER' >&2; exit 1; }
db() {
  docker exec -i "$container" psql -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres
}
fail(){ echo "FFH_P08_LOCK_ORDER_FAIL=$1" >&2; exit 1; }
before_fix='supabase/migrations/20261114020000_ffh_p06_invitation_security_remediation.sql'
with_fix='supabase/migrations/20261118100000_ffh_p08_account_security.sql'
[[ -f "$before_fix" && -f "$with_fix" ]] || fail 'MIGRATION_FILES_MISSING'

# The accept function from a migration file; with "delay", a 2 s pause right after the INVITATION row lock.
accept_from() {
  python3 - "$1" "${2:-}" <<'PY'
import sys
s = open(sys.argv[1]).read()
a = s.index('create or replace function public.accept_household_invitation(')
body = s[a:s.index('$$;', a) + 3]
lock = "where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')\n  for update;" if 'v_hash' not in body \
    else "where token_hash = v_hash\n  for update;"
assert body.count(lock) == 1, 'invitation lock not found'
if sys.argv[2] == 'delay':
    body = body.replace(lock, lock + "\n  perform pg_sleep(2);")
print(body)
PY
}

# Fixture: owner (sole member of house), joiner (no household), one pending invitation. Ids by round.
fixture() { # round
  local o="00000000-0000-4000-8000-0000000008${1}1" j="00000000-0000-4000-8000-0000000008${1}2" h="00000000-0000-4000-8000-0000000008${1}3"
  db >/dev/null <<SQL
INSERT INTO auth.users(id,instance_id,aud,role) VALUES
 ('$o','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('$j','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
INSERT INTO auth.sessions(id,user_id,aal) VALUES ('$o','$o','aal1'),('$j','$j','aal1');
BEGIN;
SELECT set_config('request.jwt.claim.sub','$o',true);
INSERT INTO public.households(id,name,created_by) VALUES('$h','ffh-ci-lock-order','$o');
INSERT INTO public.household_invitations(household_id,role,token_hash,created_by)
 VALUES('$h','member',encode(sha256(convert_to(repeat('$1',43),'UTF8')),'hex'),'$o');
COMMIT;
SQL
  owner="$o"; joiner="$j"; house="$h"; token="$(printf "%0.s$1" $(seq 1 43))"
}
accept() { # user token
  db <<SQL
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$1',true);
SELECT set_config('request.jwt.claims',json_build_object('sub','$1','session_id','$1','aal','aal1','role','authenticated')::text,true);
SELECT public.accept_household_invitation('$2');
COMMIT;
SQL
}
delete_account() { # user (a fresh password sign-in, as the throw-away re-authentication session would carry)
  db <<SQL
BEGIN;
SET LOCAL statement_timeout='30s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$1',true);
SELECT set_config('request.jwt.claims',json_build_object('sub','$1','session_id','$1','aal','aal1','role','authenticated',
  'amr',json_build_array(json_build_object('method','password','timestamp',extract(epoch from now())::bigint - 5)))::text,true);
SELECT public.delete_my_account('DELETE');
COMMIT;
SQL
}
race() { # name
  accept "$joiner" "$token" >"$work/lock-$1-accept.log" 2>&1 & local p1=$!
  sleep 0.5
  delete_account "$owner" >"$work/lock-$1-delete.log" 2>&1 & local p2=$!
  sa=0; sd=0
  wait "$p1" || sa=$?
  wait "$p2" || sd=$?
}

# RED TEAM: the P06 body deadlocks with deletion (proves the test can see it).
accept_from "$before_fix" delay | db >/dev/null
fixture 1
race before
cat "$work"/lock-before-*.log | grep -q 'deadlock detected' || { cat "$work"/lock-before-*.log >&2; fail 'DEADLOCK_NOT_REPRODUCED'; }
[[ "$sa" == 0 && "$sd" != 0 || "$sa" != 0 && "$sd" == 0 ]] || fail 'DEADLOCK_OUTCOME_UNEXPECTED'
echo 'FFH_P08_LOCK_ORDER_BEFORE_FIX=DEADLOCK_REPRODUCED'

# The tracked fix (same injected delay): no deadlock; the join completes first and the deletion is refused.
accept_from "$with_fix" delay | db >/dev/null
fixture 2
race after
! cat "$work"/lock-after-*.log | grep -q 'deadlock detected' || fail 'DEADLOCK_WITH_FIX'
[[ "$sa" == 0 && "$sd" != 0 ]] || { cat "$work"/lock-after-*.log >&2; fail 'SERIALIZED_OUTCOME_UNEXPECTED'; }
grep -q 'remove the other people from your household first' "$work/lock-after-delete.log" || fail 'DELETE_NOT_REFUSED_FOR_SHARED_HOUSEHOLD'
got="$(db <<SQL
SELECT ((SELECT count(*) FROM public.household_members WHERE household_id='$house')=2
 AND (SELECT count(*) FROM auth.users WHERE id='$owner')=1)::int;
SQL
)" || fail 'RESULT_READ'
[[ "$got" == 1 ]] || fail 'RESULT_WRONG'
echo 'FFH_P08_LOCK_ORDER_WITH_FIX=SERIALIZED_NO_DEADLOCK'

# Restore the exact tracked body (no delay) and remove every fixture.
accept_from "$with_fix" | db >/dev/null
db >/dev/null <<SQL
DELETE FROM public.households WHERE id IN ('00000000-0000-4000-8000-000000000813','00000000-0000-4000-8000-000000000823');
DELETE FROM auth.users WHERE id IN ('00000000-0000-4000-8000-000000000811','00000000-0000-4000-8000-000000000812',
  '00000000-0000-4000-8000-000000000821','00000000-0000-4000-8000-000000000822');
SQL
final="$(db <<SQL
SELECT ((SELECT count(*) FROM auth.users WHERE id::text LIKE '00000000-0000-4000-8000-0000000008%') = 0
 AND (SELECT count(*) FROM public.households WHERE name = 'ffh-ci-lock-order') = 0
 AND position('pg_sleep' in (SELECT prosrc FROM pg_proc WHERE oid = 'public.accept_household_invitation(text)'::regprocedure)) = 0
 AND position('private.session_ok()' in (SELECT prosrc FROM pg_proc WHERE oid = 'public.accept_household_invitation(text)'::regprocedure)) > 0)::int;
SQL
)" || fail 'FINAL_READ'
[[ "$final" == 1 ]] || fail 'RESIDUE'
echo 'FFH_P08_LOCK_ORDER=PASS ZERO_RESIDUE=PASS'
