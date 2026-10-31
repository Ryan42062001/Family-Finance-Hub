#!/usr/bin/env bash
set -euo pipefail
# Dedicated public-repo, localhost-only RLS workflow. Never links or uses hosted
# Supabase, credentials, API keys, existing accounts or public project IDs.
cd "$(git rev-parse --show-toplevel)"
if [[ "${GITHUB_ACTIONS:-}" != "true" || "${RUNNER_OS:-}" != "Linux" ||
      "${GITHUB_REF:-}" != "refs/heads/phase/ffh-p01-release-readiness" ||
      "${GITHUB_REPOSITORY:-}" != "Ryan42062001/Family-Finance-Hub" ]]; then
  echo 'BLOCKED: approved ephemeral branch runner identity missing' >&2
  exit 1
fi
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" || -n "${SUPABASE_DB_PASSWORD:-}" ||
      -n "${SUPABASE_PROJECT_ID:-}" || -n "${DATABASE_URL:-}" ||
      -n "${PGHOST:-}" || -n "${PGSERVICE:-}" || -n "${SUPABASE_URL:-}" ]]; then
  echo 'BLOCKED: external Supabase/PostgreSQL connection configuration present' >&2
  exit 1
fi
if [[ -e supabase/.temp/project-ref || -e supabase/.temp/pooler-url ||
      -e supabase/config.toml ]]; then
  echo 'BLOCKED: existing link or local configuration found' >&2
  exit 1
fi
if [[ "$(find supabase/migrations -maxdepth 1 -type f -name '*.sql' | wc -l)" -ne 15 ]]; then
  echo 'BLOCKED: branch migration file count is not 15' >&2
  exit 1
fi
command -v docker >/dev/null || { echo 'BLOCKED: Docker missing'; exit 1; }
docker info >/dev/null 2>&1 || { echo 'BLOCKED: Docker daemon unavailable'; exit 1; }
command -v node >/dev/null || { echo 'BLOCKED: Node missing'; exit 1; }
command -v npm >/dev/null || { echo 'BLOCKED: npm missing'; exit 1; }
command -v python3 >/dev/null || { echo 'BLOCKED: Python missing'; exit 1; }
echo 'RUNNER_PREFLIGHT=PASS DOCKER=AVAILABLE MIGRATION_FILES=15 HOSTED_LINK=ABSENT'
# Local Supabase CLI only, pinned release, no credentials and no remote calls.
cat > supabase/config.toml <<'TOML'
project_id = "ffh_p01_rls_ephemeral"
[db]
port = 54322
shadow_port = 54320
major_version = 17
[api]
enabled = false
[auth]
enabled = false
TOML
# No secrets in stdout/stderr (the CLI normally prints generated local keys).
docker network create --internal --driver bridge \
  -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 \
  ffh-p01-rls-loopback >/dev/null
cleanup() {
  npx --yes supabase@2.122.0 stop --no-backup >/dev/null 2>&1 || true
  docker network rm ffh-p01-rls-loopback >/dev/null 2>&1 || true
  rm -f supabase/config.toml
}
trap cleanup EXIT
if ! npx --yes supabase@2.122.0 --version >/dev/null 2>&1; then
  echo 'BLOCKED: pinned Supabase CLI unavailable' >&2
  exit 1
fi
if ! npx --yes supabase@2.122.0 start \
  --exclude rest,auth,realtime,storage,functions,studio,mail,analytics,pooler \
  --network-id ffh-p01-rls-loopback >/tmp/ffh-local-cli-private.log 2>&1; then
  # Classify ONLY a known error family. Never print raw CLI logs: the CLI may
  # generate/emit local API keys and connection passwords.
  python3 - <<'PY'
from pathlib import Path
s=Path("/tmp/ffh-local-cli-private.log").read_text(errors="replace").lower()
families=[
 ("UNKNOWN_CLI_FLAG", ["unknown flag", "unknown shorthand flag", "flag provided but not defined"]),
 ("CONFIG_INVALID", ["failed to parse config", "invalid config", "invalid configuration"]),
 ("MIGRATION_SQL_ERROR", ["error applying migration", "failed to apply migration", "failed to execute sql", "migration failed"]),
 ("IMAGE_PULL_OR_REGISTRY", ["pull access denied", "toomanyrequests", "failed to pull", "manifest unknown", "no such image"]),
 ("NETWORK_UNREACHABLE", ["network is unreachable", "no route to host", "cannot connect to network", "failed to create endpoint"]),
 ("CONTAINER_OR_HEALTH", ["unhealthy", "container exited", "failed to start container", "health check"]),
 ("DOCKER_DAEMON", ["cannot connect to the docker daemon", "docker daemon"]),
 ("TIMEOUT", ["context deadline exceeded", "timed out", "timeout"]),
]
classification=next((label for label,patterns in families if any(x in s for x in patterns)),"UNCLASSIFIED_LOCAL_STARTUP")
print("LOCAL_STARTUP_CLASS="+classification)
PY
  echo 'BLOCKED: local Supabase startup/migration failed; no fixtures attempted' >&2
  exit 1
fi
mapfile -t dbs < <(docker ps --format '{{.Names}}' --filter 'name=supabase_db_ffh_p01_rls_ephemeral')
if [[ "${#dbs[@]}" != 1 || "${dbs[0]}" != "supabase_db_ffh_p01_rls_ephemeral" ]]; then
  echo 'BLOCKED: exactly one named local Supabase DB not verified' >&2
  exit 1
fi
db="${dbs[0]}"
# Confirm localhost-only Docker port before any fixture operation.
DB_CONTAINER="$db" python3 - <<'PY'
import json, os, subprocess, sys
name=os.environ["DB_CONTAINER"]
d=json.loads(subprocess.check_output(["docker","inspect",name],text=True))[0]
if not d.get("State",{}).get("Running"): sys.exit("BLOCKED: DB container not running")
bindings=d.get("NetworkSettings",{}).get("Ports",{}) or {}
dbport=bindings.get("5432/tcp")
if not dbport or any(p.get("HostIp") not in ("127.0.0.1","::1") for p in dbport):
    sys.exit("BLOCKED: DB port is not loopback-only")
networks=d["NetworkSettings"]["Networks"]
if set(networks)!={"ffh-p01-rls-loopback"}: sys.exit("BLOCKED: DB has nonisolated Docker network")
print("LOCAL_ISOLATION=PASS PORT=LOOPBACK DOCKER_NETWORK=INTERNAL")
PY
# Execute via Docker-local socket; no host DB URL, password or remote client.
dbpsql() {
  docker exec -i "$db" psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres
}
if ! dbpsql < scripts/rls-local/preflight.sql; then
  echo 'BLOCKED: migration/policy/role/claim preflight failed; no fixtures attempted' >&2
  exit 1
fi
echo 'PREFLIGHT_COMPLETE=PASS NO_FIXTURE_WRITES_YET=1'
if [[ ! -f scripts/rls-local/matrix.sql ]]; then
  echo 'BLOCKED: matrix not yet installed; fixture execution prohibited' >&2
  exit 1
fi
dbpsql < scripts/rls-local/matrix.sql
echo "RLS_LOCAL_EXECUTION=PASS"
