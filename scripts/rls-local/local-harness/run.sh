#!/usr/bin/env bash
# Fast local database checks for Builders (seconds instead of a 4-minute CI round). LOCAL ONLY:
# a throw-away PostgreSQL on 127.0.0.1-only Unix socket /tmp, port 55432, with a stub of Supabase's auth schema.
# It never connects to hosted Supabase. CI (`rls-matrix`, real Supabase stack) stays the source of truth;
# the race tests and the real-provider suite are CI-only by design.
#
#   scripts/rls-local/local-harness/run.sh start      # create/start the local server (needs apt package postgresql)
#   scripts/rls-local/local-harness/run.sh reset      # fresh `postgres` database: auth stub + every tracked migration
#   scripts/rls-local/local-harness/run.sh matrix     # preflight.sql + matrix.sql (reset first)
#   scripts/rls-local/local-harness/run.sh coverage   # coverage.sql (reset first)
#   scripts/rls-local/local-harness/run.sh upgrade    # FFH-P09: legacy rows before/after the P09 migration (own database)
#   scripts/rls-local/local-harness/run.sh all        # start + matrix + coverage + upgrade
# Untracked new migrations are not applied: `git add` them first.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; repo="$(git -C "$here" rev-parse --show-toplevel)"; cd "$repo"
PORT=55432; DATA="${FFH_LOCAL_PG_DATA:-/var/tmp/ffh-local-pg}"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1)"
[[ -n "$BIN" ]] || { echo "LOCAL_HARNESS: install PostgreSQL first (apt-get install -y postgresql)" >&2; exit 1; }
for name in PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGSERVICE DATABASE_URL SUPABASE_DB_URL; do
  [[ -z "${!name:-}" ]] || { echo "LOCAL_HARNESS: refusing, $name is set" >&2; exit 1; }
done
asdb() { if [[ "$(id -u)" == 0 ]]; then su postgres -c "$*"; else bash -c "$*"; fi; }
export PGOPTIONS="-c client_min_messages=warning"
psql_local() { psql -h /tmp -p "$PORT" -U postgres -X -q "$@"; }

start() {
  if ! psql_local -d template1 -tAc 'select 1' >/dev/null 2>&1; then
    mkdir -p "$DATA"; [[ "$(id -u)" == 0 ]] && chown postgres "$DATA"
    [[ -f "$DATA/data/PG_VERSION" ]] || asdb "$BIN/initdb -D $DATA/data -A trust -U postgres >/dev/null"
    asdb "$BIN/pg_ctl -D $DATA/data -o '-p $PORT -k /tmp -c listen_addresses=' -l $DATA/log start >/dev/null"
    sleep 2
  fi
  echo "LOCAL_HARNESS=READY port=$PORT"
}
reset() {
  psql_local -d template1 -tAc "do \$\$ begin if not exists (select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin; end if; end \$\$;" >/dev/null
  psql_local -d template1 -c "drop database if exists postgres" -c "create database postgres" >/dev/null
  local P=(psql_local -d postgres -v ON_ERROR_STOP=1)
  "${P[@]}" -f "$here/auth-stub.sql" >/dev/null
  mapfile -t migrations < <(git ls-files 'supabase/migrations/*.sql' | sort)
  for f in "${migrations[@]}"; do "${P[@]}" -f "$f" >/dev/null || { echo "LOCAL_HARNESS: migration failed: $f" >&2; exit 1; }; done
  "${P[@]}" -c "create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key);" >/dev/null
  for f in "${migrations[@]}"; do "${P[@]}" -c "insert into supabase_migrations.schema_migrations values ('$(basename "$f" | cut -d_ -f1)')" >/dev/null; done
  echo "LOCAL_HARNESS=RESET migrations=${#migrations[@]}"
}
matrix() {
  reset
  psql_local -d postgres -t -A -v ON_ERROR_STOP=1 < scripts/rls-local/preflight.sql | tail -n1
  timeout 600 psql -h /tmp -p "$PORT" -U postgres -X -q -d postgres -t -A -v ON_ERROR_STOP=1 < scripts/rls-local/matrix.sql 2>&1 | grep -E 'MATRIX_|ERROR'
}
coverage() {
  reset
  psql_local -d postgres -t -A < scripts/rls-local/coverage.sql 2>&1 | grep -E 'COVERAGE_(CLEAN|PASS|VIOLATION|FAIL)|ERROR'
}
# FFH-P09: apply every migration before P09 to a throw-away database, write legacy rows, apply P09, compare.
upgrade() {
  local db=ffh_p09_upgrade P09=supabase/migrations/20261118120000_ffh_p09_bills_due_dates.sql
  psql_local -d template1 -c "drop database if exists $db" -c "create database $db" >/dev/null
  local P=(psql_local -d "$db" -v ON_ERROR_STOP=1)
  "${P[@]}" -f "$here/auth-stub.sql" >/dev/null
  mapfile -t migrations < <(git ls-files 'supabase/migrations/*.sql' | sort)
  for f in "${migrations[@]}"; do [[ "$f" < "$P09" ]] || continue; "${P[@]}" -f "$f" >/dev/null; done
  "${P[@]}" -f scripts/rls-local/p09-upgrade-before.sql >/dev/null
  "${P[@]}" -f "$P09" >/dev/null
  "${P[@]}" -t -A -f scripts/rls-local/p09-upgrade-after.sql
  psql_local -d template1 -c "drop database $db" >/dev/null
}
case "${1:-all}" in
  start) start ;; reset) reset ;; matrix) matrix ;; coverage) coverage ;; upgrade) upgrade ;;
  all) start; matrix; coverage; upgrade ;;
  *) echo "usage: $0 start|reset|matrix|coverage|upgrade|all" >&2; exit 2 ;;
esac
