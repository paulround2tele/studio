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

# Additional hardening: remove unwanted index signatures from models where spec has additionalProperties: false
# and fix any HTML entity encodings introduced by generator quirks.

echo "[post-generate-cleanup] Stripping unwanted index signatures..."

MODEL_DIR="$CLIENT_DIR/models"
if [ -d "$MODEL_DIR" ]; then
  # List of models we explicitly want to ensure have no root index signature
  STRIP_FILES=(
    auth-config.ts
    logging-config.ts
    worker-config.ts
    rate-limiter-config.ts
    proxy-manager-config-json.ts
    dnsvalidator-config-json.ts
    httpvalidator-config-json.ts
    server-config-response.ts
    server-config-update-request.ts
    auth-config-password-policy.ts
    bulk-database-stats-request.ts
    create-campaign-configuration.ts
    persona-update-request.ts
  )
  for f in "${STRIP_FILES[@]}"; do
    FILE_PATH="$MODEL_DIR/$f"
    if [ -f "$FILE_PATH" ]; then
      # Remove a line that is exactly an index signature with Record<string, unknown>
      if grep -q "\[key: string\]: Record<string, unknown>;" "$FILE_PATH"; then
        sed -i "/\[key: string\]: Record<string, unknown>;$/d" "$FILE_PATH"
        echo "[post-generate-cleanup] Removed index signature from $f"
      fi
    fi
  done

  # Fix HTML entity encodings (e.g., FlexibleArray extends Array&lt;Type&gt;)
  if [ -f "$MODEL_DIR/flexible-array.ts" ]; then
    if grep -q "Array&lt;" "$MODEL_DIR/flexible-array.ts"; then
      sed -i 's/Array&lt;/Array</g; s/&gt;/>/g' "$MODEL_DIR/flexible-array.ts"
      echo "[post-generate-cleanup] Fixed HTML entities in flexible-array.ts"
    fi
  fi
fi

echo "[post-generate-cleanup] Hardening complete."
