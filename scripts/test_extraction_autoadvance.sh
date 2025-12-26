#!/bin/bash
# Test script to reproduce the extraction auto-advance bug
# Creates a campaign that will have 0 domains to extract, triggering the fast path

set -e

BASE_URL="${BASE_URL:-http://localhost:8080/api/v2}"
COOKIE_FILE="/tmp/extraction_test_cookies.txt"

echo "============================================"
echo "Extraction Auto-Advance Bug Reproduction"
echo "============================================"

# 1. Login
echo "[1] Authenticating..."
LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')
echo "Login: $(echo "$LOGIN_RESP" | jq -c '.success')"

# 2. Create a new campaign with full_sequence mode
echo ""
echo "[2] Creating campaign in full_sequence mode..."
CREATE_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Extraction AutoAdvance Test",
    "keywords": ["zzzznoexist"],
    "tlds": [".invalid"],
    "mode": "full_sequence"
  }')
CAMPAIGN_ID=$(echo "$CREATE_RESP" | jq -r '.campaign.id // .id')
echo "Created campaign: $CAMPAIGN_ID"

if [ -z "$CAMPAIGN_ID" ] || [ "$CAMPAIGN_ID" = "null" ]; then
  echo "ERROR: Failed to create campaign"
  echo "$CREATE_RESP"
  exit 1
fi

# 3. Configure all phases
echo ""
echo "[3] Configuring phases..."

# Domain generation - use very small set to complete quickly  
curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/domain_generation/configure" \
  -H "Content-Type: application/json" \
  -d '{"patternType":"keyword_tld","maxDomains":5}' | jq -c '.message // .error'

# DNS validation - minimal config
curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/dns_validation/configure" \
  -H "Content-Type: application/json" \
  -d '{"resolvers":["8.8.8.8"],"timeout":2}' | jq -c '.message // .error'

# HTTP validation
curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/http_keyword_validation/configure" \
  -H "Content-Type: application/json" \
  -d '{"keywords":["test"],"timeout":2}' | jq -c '.message // .error'

# Extraction
curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/extraction/configure" \
  -H "Content-Type: application/json" \
  -d '{}' | jq -c '.message // .error'

# Analysis
curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/analysis/configure" \
  -H "Content-Type: application/json" \
  -d '{"personas":["default"],"analysisTypes":["content"]}' | jq -c '.message // .error'

# Enrichment
curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/enrichment/configure" \
  -H "Content-Type: application/json" \
  -d '{"enrichmentTypes":["basic"]}' | jq -c '.message // .error'

# 4. Start the campaign (full_sequence will auto-advance)
echo ""
echo "[4] Starting campaign (full_sequence mode)..."
START_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/domain_generation/start")
echo "Start response: $(echo "$START_RESP" | jq -c '.status // .error')"

# 5. Monitor progress - wait for extraction phase
echo ""
echo "[5] Monitoring campaign progress..."
for i in {1..60}; do
  CAMPAIGN=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/campaigns/$CAMPAIGN_ID")
  PHASE=$(echo "$CAMPAIGN" | jq -r '.current_phase // .campaign.current_phase // "unknown"')
  STATUS=$(echo "$CAMPAIGN" | jq -r '.phase_status // .campaign.phase_status // "unknown"')
  
  echo "[$i] Phase: $PHASE, Status: $STATUS"
  
  # Check if we've passed extraction to analysis
  if [ "$PHASE" = "analysis" ] || [ "$PHASE" = "enrichment" ]; then
    echo ""
    echo "SUCCESS: Campaign auto-advanced past extraction to $PHASE!"
    break
  fi
  
  # Check if stuck at extraction
  if [ "$PHASE" = "extraction" ] && [ "$STATUS" = "completed" ]; then
    echo ""
    echo "POTENTIAL BUG: Extraction completed but not advanced to analysis"
  fi
  
  # Check if something failed
  if [ "$STATUS" = "failed" ]; then
    echo ""
    echo "Campaign failed at phase: $PHASE"
    break
  fi
  
  sleep 2
done

# 6. Final state check
echo ""
echo "[6] Final state check..."
echo "--- Campaign phases table ---"
sudo -u postgres psql -d domainflow_production -c \
  "SELECT phase_type, status FROM campaign_phases WHERE campaign_id = '$CAMPAIGN_ID' ORDER BY phase_type;" 2>&1 | grep -v "^$"

echo ""
echo "--- Campaign row ---"
sudo -u postgres psql -d domainflow_production -c \
  "SELECT current_phase, phase_status FROM lead_generation_campaigns WHERE id = '$CAMPAIGN_ID';" 2>&1 | grep -v "^$"

# 7. Check logs for the debug output
echo ""
echo "[7] Checking logs for handlePhaseCompletion.finalStatus..."
grep -a "handlePhaseCompletion.finalStatus\|auto_advance_skipped" /home/studio/studio/backend/logs/apiserver.log | tail -20

echo ""
echo "Campaign ID: $CAMPAIGN_ID"
echo "Done!"
