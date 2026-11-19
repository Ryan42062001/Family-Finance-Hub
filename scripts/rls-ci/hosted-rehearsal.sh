#!/usr/bin/env bash
# Rehearses the one-paste hosted apply file (scripts/hosted/build-apply.mjs) for the newest migration on the
# disposable GitHub runner's own throw-away PostgreSQL: pasted with CRLF it must end all PASS; with a wrong expected
# fingerprint it must fail with FFH_APPLY_FAIL and leave nothing applied. Never touches hosted Supabase.
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" ]] || { echo 'HOSTED_REHEARSAL_BLOCKED_SCOPE' >&2; exit 1; }
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGSERVICE; do
  [[ -z "${!name:-}" ]] || { echo "HOSTED_REHEARSAL_BLOCKED_ENV $name" >&2; exit 1; }
done
harness=scripts/rls-local/local-harness/run.sh
cleanup() {
  psql -h /tmp -p 55432 -U postgres -X -q -d template1 -c "drop database if exists ffh_hosted_rehearsal" >/dev/null 2>&1 || true
  "$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -n1)/pg_ctl" -D "${FFH_LOCAL_PG_DATA:-/var/tmp/ffh-local-pg}/data" stop -m fast >/dev/null 2>&1 || true
}
trap cleanup EXIT
bash "$harness" start
out="$(bash "$harness" hosted-rehearsal)"
echo "$out"
[[ "$(printf '%s\n' "$out" | tail -n1)" == "HOSTED_REHEARSAL_PASS" ]] || { echo 'HOSTED_REHEARSAL_FAIL' >&2; exit 1; }
echo "HOSTED_REHEARSAL_CI=PASS"
