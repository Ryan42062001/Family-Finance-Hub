#!/usr/bin/env bash
# FFH-P01 two-household RLS matrix on a disposable GitHub Actions runner.
#
# Builds a brand-new local Supabase PostgreSQL in an isolated temp project,
# applies the 18 canonical migrations, runs the unchanged read-only
# preflight.sql and the unchanged BEGIN/ROLLBACK matrix.sql, checks the exact
# success markers, and always tears the database down.
#
# Synthetic data only. Never links to hosted Supabase and refuses to run if
# any hosted-database configuration is present in the environment.
set -euo pipefail

CLI="supabase@2.122.0"
EXPECTED_MIGRATIONS=18
EXPECTED_ASSERTIONS=961
# Unique per CI run and attempt, so it can never match a pre-existing project.
PROJECT_ID="ffh_ci_rls_$(printf '%s_%s' "${GITHUB_RUN_ID:-0}" "${GITHUB_RUN_ATTEMPT:-0}" | tr -c 'a-zA-Z0-9_' '_')"
CONTAINER="supabase_db_${PROJECT_ID}"

repo="$(git rev-parse --show-toplevel)"
cd "$repo"

fail() { echo "RLS_CI_BLOCKED: $*" >&2; exit 1; }

# Runs only on a disposable GitHub-hosted Linux runner, never on a developer
# machine or a self-hosted runner.
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" &&
   "${RUNNER_ENVIRONMENT:-}" == "github-hosted" ]] ||
  fail "must run on a GitHub-hosted Actions Linux runner"

for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID \
            SUPABASE_URL SUPABASE_DB_URL DATABASE_URL PGHOST PGSERVICE \
            PGPORT PGDATABASE PGUSER PGPASSWORD; do
  [[ -z "${!name:-}" ]] || fail "hosted database configuration present ($name)"
done

# Docker must be the runner's own local daemon (independent review finding 1):
# no remote endpoint, context or TLS override, the default context, and the
# local Unix socket as its endpoint.
for name in DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH; do
  [[ -z "${!name:-}" ]] || fail "Docker endpoint override present ($name)"
done
[[ "$(docker context show 2>/dev/null)" == "default" ]] ||
  fail "Docker context is not the local default"
[[ "$(docker context inspect default --format '{{.Endpoints.docker.Host}}' 2>/dev/null)" == "unix:///var/run/docker.sock" ]] ||
  fail "Docker endpoint is not the local Unix socket"
[[ -S /var/run/docker.sock ]] || fail "local Docker socket missing"

# Every container, volume and network the CLI creates carries the project id.
# Returns non-zero if ANY inventory command fails, so "could not inspect" is
# never mistaken for "nothing left" (independent re-review).
project_resources() {
  local names volumes networks
  names="$(docker ps -a --format '{{.Names}}')" || return 1
  volumes="$(docker volume ls --format '{{.Name}}')" || return 1
  networks="$(docker network ls --format '{{.Name}}')" || return 1
  printf '%s\n%s\n%s\n' "$names" "$volumes" "$networks" | grep -F -- "$PROJECT_ID" || true
}
existing="$(project_resources)" || fail "cannot inspect local Docker resources"
[[ -z "$existing" ]] || fail "Docker resources for $PROJECT_ID already exist"
echo "RLS_CI_DOCKER=LOCAL PROJECT=$PROJECT_ID"

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
# Always tear down, then verify that every resource of this run is gone
# (independent review finding 2). A test failure keeps its own exit status; a
# cleanup failure turns an otherwise passing run into a failure.
cleanup() {
  local status=$?
  (cd "$work" && npx --yes "$CLI" stop --no-backup >/dev/null 2>&1) || true
  local leftover
  if ! leftover="$(project_resources)"; then
    echo "RLS_CI_CLEANUP=FAIL could not inspect Docker resources; removal unverified" >&2
    [[ "$status" -ne 0 ]] || status=1
  elif [[ -n "$leftover" ]]; then
    echo "RLS_CI_CLEANUP=FAIL leftover Docker resources:" >&2
    echo "$leftover" >&2
    [[ "$status" -ne 0 ]] || status=1
  else
    echo "RLS_CI_CLEANUP=PASS"
  fi
  exit "$status"
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
# Full local stack on the disposable runner; applies the 18 migrations to a
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
   "PREFLIGHT_PASS LOCAL_ONLY=1 MIGRATIONS=18 ROLES=2 NO_FIXTURES=1" ]] ||
  { cat "$preflight_out" >&2; fail "preflight success marker missing"; }
echo "RLS_CI_PREFLIGHT=PASS"

# Read-only schema fingerprint (scripts/rls-local/parity.sql). The committed
# expected file is what the hosted Supabase project must also produce.
parity_out="$work/parity.out"
docker exec -i "$CONTAINER" psql -X -q -t -A -F '|' -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres \
  < scripts/rls-local/parity.sql > "$parity_out" 2>&1 ||
  { cat "$parity_out" >&2; fail "parity.sql failed"; }
echo "RLS_CI_PARITY_FINGERPRINT (section|items|md5):"
cat "$parity_out"
expected_parity="scripts/rls-local/parity.expected.txt"
if [[ -f "$expected_parity" ]]; then
  diff -u "$expected_parity" "$parity_out" ||
    fail "schema fingerprint differs from $expected_parity (update it in the same PR as the migration)"
  echo "RLS_CI_PARITY=MATCH"
  # Self-test: a single extra PUBLIC grant must change the table_grants
  # fingerprint (independent review finding 4). Runs inside a transaction that
  # is rolled back, so the database is unchanged.
  probe_out="$work/parity-probe.out"
  # The grant is issued by a separate role, so the check cannot depend on the
  # reader being the grantor (independent re-review).
  { echo "BEGIN;"
    echo "CREATE ROLE ffh_probe_grantor;"
    # Supabase's local postgres role is not a superuser; on PostgreSQL 16+ the
    # creator needs explicit membership before SET ROLE.
    echo "GRANT ffh_probe_grantor TO CURRENT_USER;"
    echo "GRANT SELECT ON public.accounts TO ffh_probe_grantor WITH GRANT OPTION;"
    echo "SET LOCAL ROLE ffh_probe_grantor;"
    echo "GRANT SELECT ON public.accounts TO PUBLIC;"
    echo "RESET ROLE;"
    cat scripts/rls-local/parity.sql
    echo "ROLLBACK;"
  } | docker exec -i "$CONTAINER" psql -X -q -t -A -F '|' -v ON_ERROR_STOP=1 -P pager=off -U postgres -d postgres \
    > "$probe_out" 2>&1 || { cat "$probe_out" >&2; fail "parity PUBLIC-grant self-test failed to run"; }
  if [[ "$(grep '^table_grants|' "$probe_out")" == "$(grep '^table_grants|' "$expected_parity")" ]]; then
    fail "parity fingerprint did not detect an extra PUBLIC grant"
  fi
  echo "RLS_CI_PARITY_SELFTEST=PASS (extra PUBLIC grant detected)"
else
  fail "missing $expected_parity; copy the fingerprint above into it"
fi

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
