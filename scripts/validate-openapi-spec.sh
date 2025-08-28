#!/usr/bin/env bash
set -euo pipefail

# Determine which spec to validate.
# Priority:
#  1) SPEC env var (explicit)
#  2) Bundled modular spec (backend/openapi/dist/openapi.yaml) if present
#  3) Modular root (backend/openapi/openapi.root.yaml)

if [[ -n "${SPEC:-}" ]]; then
  SPEC="$SPEC"
elif [[ -f "backend/openapi/dist/openapi.yaml" ]]; then
  SPEC="backend/openapi/dist/openapi.yaml"
elif [[ -f "backend/openapi/openapi.root.yaml" ]]; then
  SPEC="backend/openapi/openapi.root.yaml"
else
  echo "Spec not found (expected dist/openapi.yaml or openapi.root.yaml)." >&2
  exit 1
fi

if [[ ! -f "$SPEC" ]]; then
  echo "Spec not found: $SPEC" >&2
  exit 1
fi

echo "Validating spec: $SPEC"

# Compute absolute path to the spec to avoid cwd issues in subshells
REPO_ROOT=$(pwd)
SPEC_ABS="$REPO_ROOT/$SPEC"

# Ensure logs directory exists
mkdir -p scripts/test-logs

KIN_LOG="scripts/test-logs/kin-openapi-validate.log"
REDOCLY_LOG="scripts/test-logs/redocly-lint.log"

# 1) Kin-openapi validation (hard gate)
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
cat >"$TMPDIR"/go.mod <<'EOF'
module tmp

go 1.21

require github.com/getkin/kin-openapi v0.132.0
EOF

cat >"$TMPDIR"/validate.go <<'EOF'
package main
import (
  "fmt"
  "os"
  "github.com/getkin/kin-openapi/openapi3"
)
func main(){
  if len(os.Args)<2 { fmt.Fprintln(os.Stderr, "usage: validate <spec>"); os.Exit(2) }
  loader := &openapi3.Loader{IsExternalRefsAllowed: true}
  doc, err := loader.LoadFromFile(os.Args[1])
  if err!=nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
  if err := doc.Validate(loader.Context); err!=nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
}
EOF

echo "Running kin-openapi validation..." | tee "$KIN_LOG"
(
  cd "$TMPDIR"
  echo "> go version" && go version
  echo "> go env GOPROXY GOFLAGS" && go env GOPROXY GOFLAGS
  # Ensure deps are downloaded and go.sum is writable/generated
  echo "> go mod download (with GOPROXY)"
  env -u GOFLAGS GOPROXY="https://proxy.golang.org,direct" go mod download -x
  echo "> go list to ensure sums present"
  env -u GOFLAGS GOPROXY="https://proxy.golang.org,direct" go list -mod=mod -m all >/dev/null
  echo "> run validator"
  env -u GOFLAGS go run -mod=mod ./validate.go "$SPEC_ABS"
) 2>&1 | tee -a "$KIN_LOG"

echo "✅ kin-openapi validation passed"

# 2) Redocly lint (style checks) – allow warnings, fail on errors only
if command -v npx >/dev/null 2>&1; then
  echo "Running Redocly v2 lint..."
  set +e
  if [[ -f "redocly.yaml" ]]; then
    npx --yes @redocly/cli@2.0.7 lint --config redocly.yaml "$SPEC_ABS" | tee "$REDOCLY_LOG"
  else
    npx --yes @redocly/cli@2.0.7 lint "$SPEC_ABS" | tee "$REDOCLY_LOG"
  fi
  REDOCLY_EXIT=${PIPESTATUS[0]}
  set -e
  if [[ "${REDOCLY_EXIT:-0}" -eq 1 ]]; then
    echo "❌ Redocly lint errors present" >&2
    exit 1
  fi
  echo "✅ Redocly lint completed (errors blocked, warnings tolerated)"
else
  echo "⚠️  Redocly not found; skipping style lint"
fi

echo "✅ OpenAPI spec validated and linted: $SPEC"
