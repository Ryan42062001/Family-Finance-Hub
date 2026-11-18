#!/usr/bin/env bash
# FFH-P08 real-provider tests: real local Supabase Auth tokens against the P08 migration in run-matrix's disposable
# CI stack (proposal §11.6; spike facts in docs/workflow/FFH-P08_SPIKE_RESULTS.md). Prints fixed check names only. Local well-known development keys are read from `supabase status` and never printed.
# NEVER invoke on an Owner laptop, hosted project or non-CI stack.
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" == "true" && "${RUNNER_OS:-}" == "Linux" &&
   "${RUNNER_ENVIRONMENT:-}" == "github-hosted" ]] || { echo 'P08_PROVIDER_BLOCKED_SCOPE' >&2; exit 1; }
container="${1:-}"; work="${2:-}"; cli="${3:-}"; project="${4:-}"
[[ "$container" =~ ^supabase_db_ffh_ci_rls_[a-zA-Z0-9_]+$ && -d "$work" && "$work" == "${RUNNER_TEMP:-/tmp}"/ffh-rls-* &&
   "$project" =~ ^ffh_ci_rls_[a-zA-Z0-9_]+$ && "$cli" == supabase@* ]] || { echo 'P08_PROVIDER_BLOCKED_INPUT' >&2; exit 1; }
repo="$(git rev-parse --show-toplevel)"
status_env="$(cd "$work" && npx --yes "$cli" status -o env 2>/dev/null)" || { echo 'P08_PROVIDER_BLOCKED_STATUS' >&2; exit 1; }
val() { printf '%s\n' "$status_env" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" | head -n1; }
export FFH_SPIKE_API_URL="$(val API_URL)"
export FFH_SPIKE_ANON_KEY="$(val ANON_KEY)"
export FFH_SPIKE_SERVICE_KEY="$(val SERVICE_ROLE_KEY)"
export FFH_SPIKE_DB_CONTAINER="$container"
node "$repo/scripts/rls-ci/p08-auth-provider.mjs" main

# Second pass: recreate ONLY this run's Auth container with the current-password requirement switched on (R9),
# keeping its image, command, environment, network and labels, so `supabase stop` still removes it.
auth="supabase_auth_${project}"
[[ "$(docker ps --filter "name=^${auth}$" --format '{{.Names}}')" == "$auth" ]] || { echo 'P08_PROVIDER_FAIL auth_container_missing' >&2; exit 1; }
image="$(docker inspect -f '{{.Config.Image}}' "$auth")"
network="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$auth" | awk '{print $1}')"
envfile="$work/auth.env"; : > "$envfile"; chmod 600 "$envfile"
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$auth" | grep -v '^$' > "$envfile"
echo 'GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD=true' >> "$envfile"
mapfile -t labels < <(docker inspect -f '{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{println}}{{end}}' "$auth" | grep -v '^$')
mapfile -t cmd < <(docker inspect -f '{{range .Config.Cmd}}{{println .}}{{end}}' "$auth" | grep -v '^$')
label_args=(); for l in "${labels[@]}"; do label_args+=(--label "$l"); done
docker rm -f "$auth" >/dev/null
docker run -d --name "$auth" --network "$network" --network-alias "$auth" --env-file "$envfile" "${label_args[@]}" "$image" "${cmd[@]}" >/dev/null
rm -f "$envfile"
for _ in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$FFH_SPIKE_API_URL/auth/v1/health" -H "apikey: $FFH_SPIKE_ANON_KEY" || true)"
  [[ "$code" == "200" ]] && break; sleep 1
done
[[ "$code" == "200" ]] || { echo "P08_PROVIDER_FAIL auth_restart" >&2; exit 1; }
node "$repo/scripts/rls-ci/p08-auth-provider.mjs" current-password
