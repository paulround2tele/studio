#!/usr/bin/env bash
set -euo pipefail

# Script to check OpenAPI spec vs backend implementation alignment
# Helps identify endpoints where specs define SuccessEnvelope but handlers return direct payloads

echo "🔍 Checking OpenAPI Spec vs Backend Implementation Alignment"
echo "============================================================"

# Check if required files exist
SPEC_FILE="backend/openapi/dist/openapi.yaml"
HANDLERS_DIR="backend/internal/api"

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "❌ OpenAPI spec not found: $SPEC_FILE"
  exit 1
fi

if [[ ! -d "$HANDLERS_DIR" ]]; then
  echo "❌ Backend handlers directory not found: $HANDLERS_DIR"
  exit 1
fi

echo "📊 Summary of 2xx Response Types in OpenAPI Spec:"
echo "================================================"

# Count SuccessEnvelope references in 2xx responses
SUCCESS_ENVELOPE_COUNT=$(grep -A 5 -B 5 "'2[0-9][0-9]':" "$SPEC_FILE" 2>/dev/null | grep -c "SuccessEnvelope" || echo "0")
echo "SuccessEnvelope in 2xx responses: $SUCCESS_ENVELOPE_COUNT"

# Count direct schema references in 2xx responses  
DIRECT_SCHEMA_COUNT=$(grep -A 10 -B 2 "'2[0-9][0-9]':" "$SPEC_FILE" 2>/dev/null | grep -c '\$ref.*schemas.*Response' || echo "0")
echo "Direct schema references in 2xx responses: $DIRECT_SCHEMA_COUNT"

echo ""
echo "🎯 Phase Migration Status (based on contract tests):"
echo "==================================================="

# Check which phase contract tests exist and pass
PHASES=("A" "B" "C" "D" "F")
for phase in "${PHASES[@]}"; do
  if [[ -f "backend/tests/contract_phase_$(echo $phase | tr '[:upper:]' '[:lower:]')_test.go" ]] || [[ -f "backend/tests/contract_phase_${phase,,}_*_test.go" ]]; then
    echo "✅ Phase $phase: Contract tests exist"
  else  
    echo "❌ Phase $phase: No contract tests found"
  fi
done

echo ""
echo "🚨 Potential Spec/Implementation Mismatches:"
echo "============================================"

# Look for backend handlers that return direct responses
echo "Backend handlers likely returning direct payloads:"
find "$HANDLERS_DIR" -name "*.go" -type f | while read -r file; do
  # Look for response patterns that suggest direct returns
  if grep -q "JSONResponse.*Response" "$file" 2>/dev/null; then
    basename_file=$(basename "$file")
    echo "  - $basename_file: Contains direct response patterns"
  fi
done

echo ""
echo "📋 Recommendations:"
echo "=================="
echo "1. Run backend contract tests to verify which endpoints return direct payloads"
echo "2. For confirmed direct payload endpoints, update OpenAPI specs to remove SuccessEnvelope"
echo "3. Regenerate TypeScript clients after spec updates"
echo "4. Remove extractResponseData usage for corrected endpoints"
echo ""
echo "💡 To run contract tests:"
echo "cd backend && go test -v ./tests -run TestPhase"
echo ""
echo "💡 To run Phase F contract test specifically:"
echo "cd backend && go test -v ./tests -run TestPhaseF"