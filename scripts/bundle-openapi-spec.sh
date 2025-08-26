#!/usr/bin/env bash
set -euo pipefail

ROOT_SPEC="backend/openapi/openapi.root.yaml"
OUT_DIR="backend/openapi/dist"
OUT_FILE="$OUT_DIR/openapi.yaml"

if [[ ! -f "$ROOT_SPEC" ]]; then
  echo "Root modular spec not found: $ROOT_SPEC" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Bundling $ROOT_SPEC -> $OUT_FILE"
if command -v npx >/dev/null 2>&1; then
  npx --yes @redocly/cli@2.0.7 bundle "$ROOT_SPEC" -o "$OUT_FILE" --ext yaml
else
  echo "npx not found; please install Node.js/npm to run bundling" >&2
  exit 2
fi

echo "✅ Bundle created: $OUT_FILE"
