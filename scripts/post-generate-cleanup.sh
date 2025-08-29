#!/usr/bin/env bash
set -euo pipefail

# Post-generation cleanup to remove deprecated WebSocket artifacts and other stale files
# This keeps the generated client aligned with our SSE-only backend.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
CLIENT_DIR="$ROOT_DIR/src/lib/api-client"

echo "[post-generate-cleanup] Starting cleanup in $CLIENT_DIR"

# Remove legacy WebSocket API client if present
WS_API_FILE="$CLIENT_DIR/apis/websocket-api.ts"
if [ -f "$WS_API_FILE" ]; then
  rm -f "$WS_API_FILE"
  echo "[post-generate-cleanup] Removed $WS_API_FILE"
fi

# Remove any docs referencing WebSocket (if any)
if [ -d "$CLIENT_DIR/docs" ]; then
  find "$CLIENT_DIR/docs" -maxdepth 1 -type f -iname "*Websocket*" -print -delete || true
  find "$CLIENT_DIR/docs" -maxdepth 1 -type f -iname "*WebSocket*" -print -delete || true
fi

# Remove any v1.0 legacy model/docs accidentally lingering
if [ -d "$CLIENT_DIR/models" ]; then
  # Example legacy alias types we no longer use could be cleaned here if required
  :
fi

echo "[post-generate-cleanup] Cleanup complete."
