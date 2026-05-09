#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.dev"
COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"
RESET_DB=true

usage() {
  cat <<USAGE
Usage: scripts/seed-dev.sh [--keep-db]

Reset the local Docker dev database, start MariaDB, then run:
  seed-users
  seed-users-with-budget

Options:
  --keep-db   Do not reset the MariaDB volume before seeding.
  -h, --help  Show this help text.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-db|--no-reset)
      RESET_DB=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

run_seed_service() {
  local service="$1"

  compose --profile seed run --rm --entrypoint bash "$service" -lc '
    set -e
    export NUGET_PACKAGES=/tmp/nuget-packages
    export SEED_ARTIFACTS=/tmp/steenbudget-seed-artifacts
    mkdir -p "$NUGET_PACKAGES"
    rm -rf "$SEED_ARTIFACTS"

    dotnet restore /src/Backend.Tools/Backend.Tools.csproj --packages "$NUGET_PACKAGES" --artifacts-path "$SEED_ARTIFACTS" --disable-parallel
    dotnet build   /src/Backend.Tools/Backend.Tools.csproj -c Debug --no-restore --packages "$NUGET_PACKAGES" --artifacts-path "$SEED_ARTIFACTS"

    SEED_TOOL_DLL="$(find "$SEED_ARTIFACTS/bin/Backend.Tools" -type f -name Backend.Tools.dll | sort | tail -n 1)"
    dotnet "$SEED_TOOL_DLL" "${SEED_TOOL_COMMAND:?SEED_TOOL_COMMAND is required}"
  '
}

if [[ "$RESET_DB" == true ]]; then
  echo "Resetting local dev database volume..."
  compose down -v
fi

echo "Starting local dev database..."
compose up -d db

echo "Seeding fixed local users..."
run_seed_service seed-users

echo "Seeding local users with budget timelines..."
run_seed_service seed-users-with-budget

echo "Local dev seed complete."
