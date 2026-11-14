#!/usr/bin/env bash
# FFH-P06: REAL parallel PostgreSQL sessions in run-matrix's disposable CI DB.
# Demonstrates the original two-invitation race with uniqueness briefly removed
# in this isolated test DB; then demonstrates the migration's unique invariant.
# NEVER invoke on an Owner laptop, hosted database or an existing non-CI project.
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" &&
   "${RUNNER_ENVIRONMENT:-}" == "github-hosted" ]] ||
  { echo 'FFH_P06_CONCURRENCY_BLOCKED_SCOPE' >&2; exit 1; }
container="${1:-}"
work="${2:-}"
[[ "$container" =~ ^supabase_db_ffh_ci_rls_[a-zA-Z0-9_]+$ && -d "$work" &&
   "$work" == "${RUNNER_TEMP:-/tmp}"/ffh-rls-* ]] ||
  { echo 'FFH_P06_CONCURRENCY_BLOCKED_INPUT' >&2; exit 1; }
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGSERVICE PGPORT PGDATABASE PGUSER PGPASSWORD DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "${!name:-}" ]] || { echo 'FFH_P06_CONCURRENCY_BLOCKED_ENV' >&2; exit 1; }
done
[[ "$(docker ps --filter "name=^$container$" --format '{{.Names}}')" == "$container" ]] ||
  { echo 'FFH_P06_CONCURRENCY_BLOCKED_CONTAINER' >&2; exit 1; }
db() {
  docker exec -i "$container" psql -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres
}
fail(){ echo "FFH_P06_CONCURRENCY_FAIL=$1" >&2; exit 1; }
# Non-secret synthetic IDs and tokens. None are ever printed to Actions logs.
owner_a='00000000-0000-4000-8000-000000000901'
owner_b='00000000-0000-4000-8000-000000000902'
joiner='00000000-0000-4000-8000-000000000903'
house_a='00000000-0000-4000-8000-000000000911'
house_b='00000000-0000-4000-8000-000000000912'
token_a='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
token_b='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
[[ "${#token_a}" == 43 && "${#token_b}" == 43 ]] || fail 'BAD_SYNTHETIC_TOKEN'
# Fail closed on non-empty database; even disposable CI may never overwrite
# unexpected users or households.
baseline="$(db <<'SQL'
SELECT ((SELECT count(*) FROM auth.users) = 0
 AND (SELECT count(*) FROM public.households) = 0
 AND (SELECT count(*) FROM public.household_members) = 0
 AND (SELECT count(*) FROM public.household_invitations) = 0
 AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.household_members'::regclass AND conname='household_members_one_household_per_user' AND contype='u'))::int;
SQL
)" || fail 'BASELINE_READ'
[[ "$baseline" == 1 ]] || fail 'BASELINE_NOT_EMPTY_OR_GUARD_MISSING'
# Existing household bootstrap is exercised under the real authenticated role.
# Created owners are distinct; joiner initially belongs to no household.
db >/dev/null <<SQL
INSERT INTO auth.users(id,instance_id,aud,role) VALUES
 ('$owner_a','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('$owner_b','00000000-0000-0000-0000-000000000000','authenticated','authenticated'),
 ('$joiner','00000000-0000-0000-0000-000000000000','authenticated','authenticated');
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$owner_a',true);
INSERT INTO public.households(id,name,created_by) VALUES('$house_a','ffh-ci-race-a','$owner_a');
INSERT INTO public.household_invitations(household_id,role,token_hash)
 VALUES('$house_a','member',encode(sha256(convert_to('$token_a','UTF8')),'hex'));
COMMIT;
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$owner_b',true);
INSERT INTO public.households(id,name,created_by) VALUES('$house_b','ffh-ci-race-b','$owner_b');
INSERT INTO public.household_invitations(household_id,role,token_hash)
 VALUES('$house_b','viewer',encode(sha256(convert_to('$token_b','UTF8')),'hex'));
COMMIT;
SQL
echo 'FFH_P06_CONCURRENCY=FIXTURE_AUTHENTICATED_CREATED'
# A CI-only delay holds BOTH sessions after the original membership SELECT,
# before either INSERT commits, ensuring a real overlapping race.
db >/dev/null <<SQL
CREATE FUNCTION private.ffh_ci_race_delay() RETURNS trigger LANGUAGE plpgsql
 SECURITY INVOKER SET search_path = '' AS \$trigger\$
BEGIN
 IF NEW.user_id = '$joiner'::uuid THEN
   RAISE NOTICE 'FFH_P06_RACE_INSERT_REACHED';
   PERFORM pg_sleep(4);
 END IF;
 RETURN NEW;
END;
\$trigger\$;
CREATE TRIGGER ffh_ci_race_delay BEFORE INSERT ON public.household_members
 FOR EACH ROW EXECUTE FUNCTION private.ffh_ci_race_delay();
SQL
# Authenticated RPC calls use distinct actual psql sessions/transactions.
accept() {
  local token="$1"
  db <<SQL
BEGIN;
SET LOCAL statement_timeout='20s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$joiner',true);
SELECT public.accept_household_invitation('$token');
COMMIT;
SQL
}
pair(){
  local prefix="$1" log_a="$work/${1}-a.log" log_b="$work/${1}-b.log"
  accept "$token_a" >"$log_a" 2>&1 & local p1=$!
  accept "$token_b" >"$log_b" 2>&1 & local p2=$!
  local a=0 b=0
  wait "$p1" || a=$?
  wait "$p2" || b=$?
  [[ "$(grep -c 'FFH_P06_RACE_INSERT_REACHED' "$log_a" || true)" == 1 &&
     "$(grep -c 'FFH_P06_RACE_INSERT_REACHED' "$log_b" || true)" == 1 ]] ||
    fail 'TWO_REAL_SESSIONS_DID_NOT_REACH_INSERT'
  if [[ "$prefix" == "baseline" ]]; then
    [[ "$a" == 0 && "$b" == 0 ]] || fail 'UNSAFE_BASELINE_NOT_REPRODUCED'
  else
    [[ "$a" == 0 && "$b" != 0 || "$a" != 0 && "$b" == 0 ]] ||
      fail 'UNIQUE_CONCURRENT_OUTCOME'
    if [[ "$a" != 0 ]]; then
      grep -q 'permission denied: you already belong to a household' "$log_a" ||
        fail 'SANITIZED_UNIQUE_ERROR_A'
    else
      grep -q 'permission denied: you already belong to a household' "$log_b" ||
        fail 'SANITIZED_UNIQUE_ERROR_B'
    fi
  fi
}
# RED TEAM: only on this disposable, initially empty GitHub CI database.
# Recreate old code's exact composite-PK-only schema to reproduce the defect.
db >/dev/null <<'SQL'
ALTER TABLE public.household_members
  DROP CONSTRAINT household_members_one_household_per_user;
SQL
pair baseline
got="$(db <<SQL
SELECT ((SELECT count(*) FROM public.household_members WHERE user_id='$joiner')=2
 AND (SELECT count(*) FROM public.household_invitations
   WHERE accepted_by='$joiner')=2)::int;
SQL
)" || fail 'UNSAFE_BASELINE_READ'
[[ "$got" == 1 ]] || fail 'UNSAFE_BASELINE_NOT_TWO_MEMBERSHIPS'
echo 'FFH_P06_CONCURRENT_UNGUARDED=REPRODUCED_TWO_HOUSEHOLDS'
# Run the actual tracked migration against the deliberately unsafe fixture:
# its preflight must abort atomically without touching either membership.
if db >/dev/null 2>"$work/duplicate-migration-denied.log" \
  < supabase/migrations/20261114020000_ffh_p06_invitation_security_remediation.sql; then
  fail 'DUPLICATE_MIGRATION_UNEXPECTEDLY_SUCCEEDED'
fi
grep -q 'FFH_P06_MEMBERSHIP_COLLISION_MANUAL_REVIEW_REQUIRED' "$work/duplicate-migration-denied.log" ||
  fail 'DUPLICATE_MIGRATION_GUARD_NOT_EXECUTED'
# Safe historical-data migration behavior: a unique constraint must REFUSE
# existing duplicate account memberships, NOT silently delete or reassign.
if db >/dev/null 2>"$work/existing-data-denied.log" <<'SQL'
ALTER TABLE public.household_members
 ADD CONSTRAINT household_members_one_household_per_user UNIQUE(user_id);
SQL
then fail 'EXISTING_COLLISION_SILENTLY_ACCEPTED'; fi
grep -q 'could not create unique index' "$work/existing-data-denied.log" ||
  fail 'EXISTING_COLLISION_NOT_UNIQUE_FAILURE'
echo 'FFH_P06_EXISTING_DATA_MIGRATION=FAIL_CLOSED'
# Erase only the explicit CI-owned joiner fixture rows, then restore the exact
# schema constraint before repeating. This is NOT a hosted or owner-host action.
db >/dev/null <<SQL
BEGIN;
DELETE FROM public.household_members WHERE user_id='$joiner';
UPDATE public.household_invitations SET accepted_at=NULL,accepted_by=NULL
 WHERE token_hash IN
  (encode(sha256(convert_to('$token_a','UTF8')),'hex'),
   encode(sha256(convert_to('$token_b','UTF8')),'hex'));
ALTER TABLE public.household_members
 ADD CONSTRAINT household_members_one_household_per_user UNIQUE(user_id);
COMMIT;
SQL
pair guarded
got="$(db <<SQL
SELECT ((SELECT count(*) FROM public.household_members WHERE user_id='$joiner')=1
 AND (SELECT count(*) FROM public.household_invitations WHERE accepted_by='$joiner')=1
 AND (SELECT count(*) FROM public.household_invitations
  WHERE accepted_at IS NULL)=1)::int;
SQL
)" || fail 'GUARDED_RESULT_READ'
[[ "$got" == 1 ]] || fail 'GUARD_DID_NOT_ENFORCE_ONE_HOUSEHOLD'
echo 'FFH_P06_CONCURRENT_GUARDED=ONE_WINNER_ONE_DENIED'
# Legacy future-dated pending invitations require Owner review. The exact
# migration must refuse rather than silently validate, cancel or alter them.
db >/dev/null <<SQL
INSERT INTO public.household_invitations(household_id,role,token_hash,created_by,created_at,expires_at)
 VALUES('$house_a','viewer',encode(sha256(convert_to('ccccccccccccccccccccccccccccccccccccccccccc','UTF8')),'hex'),
 '$owner_a',now()+interval '30 days',now()+interval '37 days');
SQL
if db >/dev/null 2>"$work/future-migration-denied.log" \
  < supabase/migrations/20261114020000_ffh_p06_invitation_security_remediation.sql; then
  fail 'FUTURE_MIGRATION_UNEXPECTEDLY_SUCCEEDED'
fi
grep -q 'FFH_P06_FUTURE_DATED_INVITATIONS_MANUAL_REVIEW_REQUIRED' "$work/future-migration-denied.log" ||
  fail 'FUTURE_MIGRATION_GUARD_NOT_EXECUTED'
db >/dev/null <<SQL
DELETE FROM public.household_invitations WHERE token_hash =
 encode(sha256(convert_to('ccccccccccccccccccccccccccccccccccccccccccc','UTF8')),'hex');
SQL
echo 'FFH_P06_LEGACY_FUTURE_INVITE=FAIL_CLOSED'
# PostgreSQL trigger/constraint cleanup is only within the disposable DB.
db >/dev/null <<SQL
DROP TRIGGER ffh_ci_race_delay ON public.household_members;
DROP FUNCTION private.ffh_ci_race_delay();
DELETE FROM public.households WHERE id IN ('$house_a','$house_b');
DELETE FROM auth.users WHERE id IN ('$owner_a','$owner_b','$joiner');
SQL
final="$(db <<'SQL'
SELECT ((SELECT count(*) FROM auth.users)=0
 AND (SELECT count(*) FROM public.households)=0
 AND (SELECT count(*) FROM public.household_members)=0
 AND (SELECT count(*) FROM public.household_invitations)=0
 AND (SELECT count(*) FROM public.profiles)=0
 AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname='household_members_one_household_per_user'))::int;
SQL
)" || fail 'POST_RACE_READ'
[[ "$final" == 1 ]] || fail 'POST_RACE_RESIDUE'
echo 'FFH_P06_CONCURRENCY=PASS ZERO_RESIDUE=PASS'
