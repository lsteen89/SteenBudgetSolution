#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.e2e"
COMPOSE_FILE="$ROOT_DIR/docker-compose.e2e.yml"
BACKEND_URL="${BACKEND_URL:-http://localhost:5001}"
FRONTEND_DIR="$ROOT_DIR/Frontend"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

load_dotenv() {
  local line key value

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *"="* ]] && continue

    key="${line%%=*}"
    value="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"

    export "$key=$value"
  done < "$ENV_FILE"
}

wait_for_container_health() {
  local container_id="$1"
  local attempts=60

  for ((i = 1; i <= attempts; i++)); do
    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$container_id")"

    if [[ "$status" == "healthy" ]]; then
      return 0
    fi

    sleep 2
  done

  echo "E2E database did not become healthy in time." >&2
  return 1
}

wait_for_backend() {
  local attempts=60

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$BACKEND_URL/api/healthz" >/dev/null; then
      return 0
    fi

    sleep 2
  done

  echo "Backend did not become ready at $BACKEND_URL." >&2
  return 1
}

ensure_backend_port_is_free() {
  local backend_port

  backend_port="$(node -e 'const url = new URL(process.argv[1]); console.log(url.port || (url.protocol === "https:" ? "443" : "80"));' "$BACKEND_URL")"

  if lsof -nP -iTCP:"$backend_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $backend_port is already in use. Stop the existing backend before running this script." >&2
    lsof -nP -iTCP:"$backend_port" -sTCP:LISTEN >&2 || true
    exit 1
  fi
}

process_tree() {
  local pid="$1"
  local child_pid

  for child_pid in $(pgrep -P "$pid" 2>/dev/null || true); do
    process_tree "$child_pid"
  done

  echo "$pid"
}

terminate_process_tree() {
  local pid="$1"
  local pids
  local attempt

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi

  pids="$(process_tree "$pid" | tr '\n' ' ')"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  kill $pids >/dev/null 2>&1 || true

  for ((attempt = 1; attempt <= 20; attempt++)); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi

    sleep 0.25
  done

  kill -KILL $pids >/dev/null 2>&1 || true
}

playwright_args=("$@")
if [[ ${#playwright_args[@]} -eq 0 ]]; then
  playwright_args=("test" "--project=smoke")
elif [[ "${playwright_args[0]}" == "smoke" ]]; then
  playwright_args=("test" "--project=smoke" "${playwright_args[@]:1}")
elif [[ "${playwright_args[0]}" == "full" ]]; then
  playwright_args=("test" "${playwright_args[@]:1}")
elif [[ "${playwright_args[0]}" == "all" ]]; then
  playwright_args=("test" "${playwright_args[@]:1}")
fi

load_dotenv
ensure_backend_port_is_free

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d db-e2e
db_container_id="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q db-e2e)"
wait_for_container_health "$db_container_id"

backend_log="$ROOT_DIR/.playwright-backend.log"
rm -f "$backend_log"

pushd "$ROOT_DIR/Backend" >/dev/null
DOTNET_USE_POLLING_FILE_WATCHER=true dotnet run --urls "$BACKEND_URL" >"$backend_log" 2>&1 &
backend_pid=$!
popd >/dev/null

cleanup() {
  local exit_code=$?

  trap - EXIT INT TERM
  terminate_process_tree "$backend_pid"
  wait "$backend_pid" >/dev/null 2>&1 || true

  return "$exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

wait_for_backend

cd "$FRONTEND_DIR"
PLAYWRIGHT_HTML_OPEN="${PLAYWRIGHT_HTML_OPEN:-never}" npx playwright "${playwright_args[@]}"
