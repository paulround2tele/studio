#!/usr/bin/env bash
set -euo pipefail

SPEC="backend/openapi/openapi.yaml"

if [[ ! -f "$SPEC" ]]; then
  echo "Spec not found: $SPEC" >&2
  exit 1
fi

# Basic validation with kin-openapi via oasdiff cli if available, fallback to redocly
if command -v npx >/dev/null 2>&1; then
  echo "Running Redocly lint..."
  npx --yes @redocly/cli@1.28.3 lint "$SPEC"
fi

# Kin-openapi validation via a tiny Go program (no repo pollution)
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
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

go run "$TMPDIR"/validate.go "$SPEC"

echo "✅ OpenAPI spec validated: $SPEC"
