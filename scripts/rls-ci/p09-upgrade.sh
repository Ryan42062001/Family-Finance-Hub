#!/usr/bin/env bash
# FFH-P09 audit P09-02: legacy-row preservation across the P09 migration, as a required CI step.
# Uses the local harness (scripts/rls-local/local-harness/run.sh upgrade) on the disposable GitHub runner's own
# PostgreSQL: a throw-away database gets every migration before P09, synthetic legacy rows (monthly_amount only),
# then the P09 migration; every amount must be unchanged, back-filled as monthly, with no invented due dates.
# The database is dropped afterwards (zero residue) and the server stopped. Never touches hosted Supabase.
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" ]] || { echo 'P09_UPGRADE_BLOCKED_SCOPE' >&2; exit 1; }
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGSERVICE; do
  [[ -z "${!name:-}" ]] || { echo "P09_UPGRADE_BLOCKED_ENV $name" >&2; exit 1; }
done
harness=scripts/rls-local/local-harness/run.sh
stop() { "$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -n1)/pg_ctl" -D "${FFH_LOCAL_PG_DATA:-/var/tmp/ffh-local-pg}/data" stop -m fast >/dev/null 2>&1 || true; }
cleanup() { psql -h /tmp -p 55432 -U postgres -X -q -d template1 -c "drop database if exists ffh_p09_upgrade" >/dev/null 2>&1 || true; stop; }
trap cleanup EXIT
bash "$harness" start
out="$(bash "$harness" upgrade)"
echo "$out"
[[ "$(printf '%s\n' "$out" | tail -n1)" == "P09_UPGRADE_PASS" ]] || { echo 'P09_UPGRADE_FAIL' >&2; exit 1; }
left="$(psql -h /tmp -p 55432 -U postgres -X -t -A -d template1 -c "select count(*) from pg_database where datname = 'ffh_p09_upgrade'")"
[[ "$left" == "0" ]] || { echo 'P09_UPGRADE_RESIDUE' >&2; exit 1; }
echo "P09_UPGRADE_CI=PASS ZERO_RESIDUE=PASS"
