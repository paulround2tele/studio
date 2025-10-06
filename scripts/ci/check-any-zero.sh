#!/usr/bin/env bash
set -euo pipefail

echo "[check-any-zero] Auditing for lingering 'any' usages..." >&2

# Generate fresh audit (stdout ignored, JSON file produced)
npm run audit:any >/dev/null 2>&1 || { echo "Audit script failed" >&2; exit 1; }

TOTAL=$(jq '.total' docs/allAnyUsages.json)
if [[ "$TOTAL" == "0" ]]; then
  echo "[check-any-zero] PASS: 0 any usages" >&2
  exit 0
fi

echo "[check-any-zero] FAIL: Found $TOTAL any usages" >&2
echo "First 20 occurrences:" >&2
jq '.usages[:20] | .[] | "\(.file):\(.line) \(.pattern)"' -r docs/allAnyUsages.json >&2
exit 1
