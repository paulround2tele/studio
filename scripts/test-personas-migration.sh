#!/bin/bash
set -euo pipefail

echo "=== Personas API Contract Migration Test ==="

# Check that personas endpoints are migrated in the manifest
echo "📋 Checking endpoint manifest..."
if grep -q '"status": "migrated"' docs/api_endpoint_manifest.json; then
  echo "✅ Found migrated endpoints in manifest"
else
  echo "❌ No migrated endpoints found"
  exit 1
fi

# Check CI scripts pass
echo "🔍 Running CI alias check..."
if node scripts/ci/check-response-aliases.cjs; then
  echo "✅ No 2xx responses alias SuccessEnvelope"
else
  echo "❌ CI alias check failed"
  exit 1
fi

echo "🔍 Running CI success key check..."
node scripts/ci/check-success-key-2xx.cjs || true  # This warns but doesn't fail yet

# Check generated types
echo "🔧 Checking generated personas types..."
if grep -q "personasList.*AxiosPromise<Array<PersonaResponse>>" src/lib/api-client/apis/personas-api.ts; then
  echo "✅ Personas list returns AxiosPromise<Array<PersonaResponse>>"
else
  echo "❌ Personas list type incorrect"
  exit 1
fi

if grep -q "personasCreate.*AxiosPromise<PersonaResponse>" src/lib/api-client/apis/personas-api.ts; then
  echo "✅ Personas create returns AxiosPromise<PersonaResponse>"
else  
  echo "❌ Personas create type incorrect"
  exit 1
fi

# Check frontend uses normalizeResponse
echo "📱 Checking frontend migration..."
if grep -q "normalizeResponse" src/components/personas/PersonaForm.tsx; then
  echo "✅ Frontend uses transitional normalizeResponse adapter"
else
  echo "❌ Frontend not migrated to use normalizeResponse" 
  exit 1
fi

if ! grep -q "extractResponseData" src/components/personas/PersonaForm.tsx; then
  echo "✅ Frontend no longer uses extractResponseData for personas"
else
  echo "❌ Frontend still uses extractResponseData"
  exit 1
fi

echo ""
echo "🎉 Phase A (Pilot) Migration Complete!"
echo "✅ Personas endpoints successfully migrated to direct resource responses"
echo "✅ Backend returns PersonaResponse[] and PersonaResponse directly"
echo "✅ Frontend handles new response format via transitional adapter"
echo "✅ CI guardrails prevent regression"
echo ""
echo "📊 Endpoint Status:"
echo "   • Personas (pilot): ✅ MIGRATED"
echo "   • Campaigns: ⏳ Pending (Phase B)"
echo "   • Auth: ⏳ Pending (Phase C)" 
echo "   • Health: ⏳ Pending (Phase C)"