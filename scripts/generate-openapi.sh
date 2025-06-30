#!/bin/bash
# Generate OpenAPI specification from running no-db server
set -e

OUT_FILE="${OPENAPI_OUT:-backend/docs/openapi.yaml}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
cd "$ROOT_DIR"

# Build server if needed
if [ ! -f backend/bin/apiserver ]; then
  (cd backend && make build)
fi

PORT=${OPENAPI_PORT:-8081}
PORT="$PORT" backend/bin/apiserver &
PID=$!

cleanup() {
  kill $PID 2>/dev/null || true
  wait $PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait briefly for server to start
sleep 2

curl -sSf "http://localhost:$PORT/api/openapi.yaml" -o "$OUT_FILE"

echo "OpenAPI spec written to $OUT_FILE"
