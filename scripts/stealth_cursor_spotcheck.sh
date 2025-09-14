#!/usr/bin/env bash
#!/usr/bin/env bash
# Spot check script for stealth cursor pagination integrity (updated for public /campaigns API)
# Usage: STEALTH_API_URL=http://localhost:8080 CAMPAIGN_ID=<uuid> ./scripts/stealth_cursor_spotcheck.sh
# Optional env:
#   LIMIT (default 1000) - page size (maps to `first` query param on cursor path)
#   PAGES (default 5)    - max pages to sample
#   AUTH_HEADER          - value for Authorization header (e.g. "Bearer xyz")
#   ENDPOINT_BASE        - base path (default /api/v2/campaigns)
# Requirements:
#   Backend must be started with ENABLE_ADVANCED_FILTERS=1 for cursor (first/after) params to be honored.
set -euo pipefail

API_URL=${STEALTH_API_URL:-http://localhost:3000}
CAMPAIGN_ID=${CAMPAIGN_ID:-}
LIMIT=${LIMIT:-1000}
PAGES=${PAGES:-5}
AUTH_HEADER=${AUTH_HEADER:-}
ENDPOINT_BASE=${ENDPOINT_BASE:-/api/v2/campaigns}

if [[ -z "${CAMPAIGN_ID}" ]]; then
  echo "CAMPAIGN_ID env var required" >&2
  exit 1
fi

echo "[spotcheck] Starting cursor page sampling campaign=${CAMPAIGN_ID} pages=${PAGES} limit=${LIMIT}" >&2

AFTER=""
PAGE=0
ALL_DOMAINS_FILE=$(mktemp)
trap 'rm -f "$ALL_DOMAINS_FILE"' EXIT

while [[ $PAGE -lt $PAGES ]]; do
  QUERY="?first=${LIMIT}"
  if [[ -n "$AFTER" ]]; then
    QUERY="${QUERY}&after=${AFTER}"
  fi
  # Hitting public campaigns domains endpoint (cursor path when ENABLE_ADVANCED_FILTERS=1)
  URL="${API_URL}${ENDPOINT_BASE}/${CAMPAIGN_ID}/domains${QUERY}"
  RESP=$(curl -sS -H "Accept: application/json" ${AUTH_HEADER:+-H "Authorization: ${AUTH_HEADER}"} "$URL") || { echo "request failed" >&2; exit 2; }
  # Remove any leading log noise before first '{'
  CLEAN=$(echo "$RESP" | sed 's/^[^{]*//')
  # Extract items array (domains appear under either domainName or domain key depending on shape)
  DOMAINS=$(echo "$CLEAN" | grep -o '"domain":"[^\"]*"' 2>/dev/null | cut -d'"' -f4 || true)
  if [[ -z "$DOMAINS" ]]; then
    DOMAINS=$(echo "$CLEAN" | grep -o '"domainName":"[^\"]*"' 2>/dev/null | cut -d'"' -f4 || true)
  fi
  if [[ -z "$DOMAINS" ]]; then
    echo "[spotcheck] empty response page=$PAGE aborting (URL=$URL)" >&2
    break
  fi
  echo "$DOMAINS" >> "$ALL_DOMAINS_FILE"

  # Attempt to capture cursor metadata if present in response
  AFTER=$(echo "$RESP" | grep -o '"endCursor":"[^"]*"' | head -n1 | cut -d'"' -f4)
  HAS_NEXT=$(echo "$RESP" | grep -o '"hasNextPage":false' || true)
  ((PAGE++))
  # Stop if server indicates no more pages or cursor missing (cannot advance)
  [[ -n "$HAS_NEXT" ]] && break
  [[ -z "$AFTER" ]] && break
  sleep 0.2
done

TOTAL=$(wc -l < "$ALL_DOMAINS_FILE")
UNIQUE=$(sort "$ALL_DOMAINS_FILE" | uniq | wc -l)
if [[ $TOTAL -ne $UNIQUE ]]; then
  echo "[spotcheck][FAIL] duplicate domains detected total=$TOTAL unique=$UNIQUE" >&2
  exit 3
fi

echo "[spotcheck][OK] pages_collected=$PAGE domains=$TOTAL no_duplicates" >&2
