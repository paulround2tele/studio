#!/usr/bin/env bash
set -euo pipefail
# Simple guardrail script. Extend as needed.
FAIL=0
printf '== Type Inventory Enforcement ==\n'
if grep -R "as any" src | grep -vE 'legacy|__tests__' >/dev/null 2>&1; then
  echo "Forbidden 'as any' cast detected"; FAIL=1
fi
if grep -R "unknown as" src | grep -vE 'legacy|__tests__' >/dev/null 2>&1; then
  echo "Suspicious 'unknown as' double cast detected"; FAIL=1
fi
# Detect local interfaces shadowing generated models (heuristic)
if grep -R "interface CampaignResponse" src >/dev/null 2>&1; then
  echo "Shadow interface for CampaignResponse found"; FAIL=1
fi
if [ $FAIL -ne 0 ]; then
  echo "Type inventory check FAILED"; exit 1; fi
echo "All checks passed"
