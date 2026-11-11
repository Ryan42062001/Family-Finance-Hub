#!/usr/bin/env bash
# FFH-P01 two-household RLS matrix on a disposable GitHub Actions runner.
#
# Builds a brand-new local Supabase PostgreSQL in an isolated temp project,
# applies the 15 canonical migrations, runs the unchanged read-only
# preflight.sql and the unchanged BEGIN/ROLLBACK matrix.sql, checks the exact
# success markers, and always tears the database down.
#
# Synthetic data only. Never links to hosted Supabase and refuses to run if
# any hosted-database configuration is present in the environment.
set -euo pipefail

CLI="supabase@2.122.0"
PROJECT_ID="ffh_ci_rls"
CONTAINER="supabase_db_${PROJECT_ID}"
EXPECTED_MIGRATIONS=15
EXPECTED_ASSERTIONS=913

repo="$(git rev-parse --show-toplevel)"
cd "$repo"

fail() { echo "RLS_CI_BLOCKED: $*" >&2; exit 1; }

# Runs only on a disposable CI runner, never on a developer machine.
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" ]] ||
  fail "must run on a GitHub Actions Linux runner"

for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID \
            SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGSERVICE \
            PGPORT PGDATABASE PGUSER PGPASSWORD; do
  [[ -z "${!name:-}" ]] || fail "hosted database configuration present ($name)"
done

mapfile -t migrations < <(git ls-files -- 'supabase/migrations/*.sql' | sort)
[[ "${#migrations[@]}" -eq "$EXPECTED_MIGRATIONS" ]] ||
  fail "expected $EXPECTED_MIGRATIONS tracked migrations, found ${#migrations[@]}"

# Isolated project outside the repository, so no repository config or hosted
# link can be picked up by the CLI.
work="$(mktemp -d "${RUNNER_TEMP:-/tmp}/ffh-rls-XXXXXX")"
mkdir -p "$work/supabase/migrations"
cp "${migrations[@]}" "$work/supabase/migrations/"
# Auth stays enabled: its own migrations create auth.identities and other
# auth tables that matrix.sql reads. With Auth disabled only the base auth
# schema exists and the matrix fails before any assertion.
cat > "$work/supabase/config.toml" <<TOML
project_id = "${PROJECT_ID}"
[db]
port = 54332
shadow_port = 54333
major_version = 17
TOML

cli_log="$work/cli.log"
cleanup() {
  (cd "$work" && npx --yes "$CLI" stop --no-backup >/dev/null 2>&1) || true
}
trap cleanup EXIT

# The local CLI can print the well-known local development keys. They are not
# hosted secrets, but redact anything key-like before showing a failure log.
show_cli_log() {
  sed -E 's/((key|secret|password|token)[^:=]*[:=][[:space:]]*).*/\1[redacted]/I' "$cli_log" | tail -n 80 >&2
}
run_cli() {
  if ! (cd "$work" && npx --yes "$CLI" "$@") >"$cli_log" 2>&1; then
    echo "supabase $* failed; last CLI output:" >&2
    show_cli_log
    fail "supabase $*"
  fi
}

run_cli --version
# Full local stack on the disposable runner; applies the 15 migrations to a
# brand-new database (no seed file exists in the temp project).
run_cli start

[[ "$(docker ps --filter "name=^${CONTAINER}$" --format '{{.Names}}')" == "$CONTAINER" ]] ||
  fail "fresh database container not running"
echo "RLS_CI_DATABASE=READY MIGRATIONS_COPIED=$EXPECTED_MIGRATIONS"

psql_in_db() {
  docker exec -i "$CONTAINER" psql -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres
}
last_line() { grep -v '^[[:space:]]*$' | tail -n 1; }

preflight_out="$work/preflight.out"
psql_in_db < scripts/rls-local/preflight.sql > "$preflight_out" 2>&1 ||
  { cat "$preflight_out" >&2; fail "preflight.sql failed"; }
[[ "$(last_line < "$preflight_out")" == \
   "PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=15 ROLES=2 NO_FIXTURES=1" ]] ||
  { cat "$preflight_out" >&2; fail "preflight success marker missing"; }
echo "RLS_CI_PREFLIGHT=PASS"

matrix_out="$work/matrix.out"
if ! timeout 900 docker exec -i "$CONTAINER" \
     psql -X -q -t -A -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres \
     < scripts/rls-local/matrix.sql > "$matrix_out" 2>&1; then
  cat "$matrix_out" >&2
  fail "matrix.sql failed or timed out"
fi
cat "$matrix_out"
grep -qx "MATRIX_ASSERTIONS_PASS=${EXPECTED_ASSERTIONS}" "$matrix_out" ||
  fail "expected exactly MATRIX_ASSERTIONS_PASS=${EXPECTED_ASSERTIONS}"
[[ "$(grep -cx 'MATRIX_ROLLBACK_COMPLETE' "$matrix_out")" -eq 1 ]] ||
  fail "rollback marker missing or duplicated"
[[ "$(last_line < "$matrix_out")" == "MATRIX_ZERO_RESIDUE_PASS" ]] ||
  fail "zero-residue marker is not the final line"

echo "RLS_CI_MATRIX=PASS ASSERTIONS=${EXPECTED_ASSERTIONS} ROLLBACK=COMPLETE ZERO_RESIDUE=PASS"
