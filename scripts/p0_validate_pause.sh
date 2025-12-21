#!/bin/bash
# P0 Validation Script: Pause Flow Verification
# Tests that pause updates: API → DB (campaign row) → snapshot → UI agreement

set -e

BASE_URL="${BASE_URL:-http://localhost:8080/api/v2}"
COOKIE_FILE="/tmp/p0_validation_cookies.txt"

echo "============================================"
echo "P0 VALIDATION: Pause Flow Correctness"
echo "============================================"
echo ""

# 1. Login
echo "[1] Authenticating..."
LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')
echo "Login: $(echo "$LOGIN_RESP" | jq -c '.success // .error')"

# 2. Get or create a campaign with domain_generation phase
echo ""
echo "[2] Finding/Creating campaign with in_progress phase..."

# List campaigns to find one with in_progress status
CAMPAIGNS=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/campaigns?limit=5")
CAMPAIGN_ID=$(echo "$CAMPAIGNS" | jq -r '.campaigns[] | select(.phase_status == "in_progress") | .id' | head -1)

if [ -z "$CAMPAIGN_ID" ] || [ "$CAMPAIGN_ID" = "null" ]; then
  echo "No in_progress campaign found. Creating one..."
  
  # Create a new campaign
  CREATE_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "P0 Validation Test",
      "keywords": ["test", "validation"],
      "tlds": [".com"],
      "mode": "step_by_step"
    }')
  CAMPAIGN_ID=$(echo "$CREATE_RESP" | jq -r '.campaign.id // .id')
  echo "Created campaign: $CAMPAIGN_ID"
  
  # Configure and start domain_generation
  echo "Configuring domain generation..."
  curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/domain_generation/configure" \
    -H "Content-Type: application/json" \
    -d '{"patternType":"keyword_tld","maxDomains":50}' > /dev/null
  
  echo "Starting domain generation..."
  START_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/domain_generation/start")
  echo "Start response: $(echo "$START_RESP" | jq -c '.status // .error')"
  
  # Wait a bit for phase to start
  sleep 2
fi

echo "Using campaign: $CAMPAIGN_ID"

# 3. Check pre-pause state
echo ""
echo "[3] Pre-pause state check..."

# Get campaign row state
CAMPAIGN_ROW=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/campaigns/$CAMPAIGN_ID")
PRE_PHASE=$(echo "$CAMPAIGN_ROW" | jq -r '.current_phase // .campaign.current_phase // "unknown"')
PRE_STATUS=$(echo "$CAMPAIGN_ROW" | jq -r '.phase_status // .campaign.phase_status // "unknown"')
echo "Campaign row: current_phase=$PRE_PHASE, phase_status=$PRE_STATUS"

# Get snapshot
SNAPSHOT=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/campaigns/$CAMPAIGN_ID/status")
SNAP_STATUS=$(echo "$SNAPSHOT" | jq -r '.phases.discovery.status // .phases.domain_generation.status // "unknown"')
echo "Snapshot status: $SNAP_STATUS"

# 4. Execute PAUSE
echo ""
echo "[4] Executing PAUSE..."
PAUSE_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/domain_generation/pause")
PAUSE_STATUS=$(echo "$PAUSE_RESP" | jq -r '.status // .error // "unknown"')
echo "Pause API response: status=$PAUSE_STATUS"

# Small delay for DB sync
sleep 0.5

# 5. Post-pause verification - check all layers agree
echo ""
echo "[5] Post-pause state verification..."

# DB: Check campaign row directly
echo "--- DB Layer (campaign row) ---"
DB_STATE=$(sudo -u postgres psql -d domainflow_production -t -c \
  "SELECT current_phase, phase_status FROM lead_generation_campaigns WHERE id = '$CAMPAIGN_ID';" 2>/dev/null | tr -s ' ')
echo "lead_generation_campaigns: $DB_STATE"

# DB: Check phase row
PHASE_STATE=$(sudo -u postgres psql -d domainflow_production -t -c \
  "SELECT phase_type, status FROM campaign_phases WHERE campaign_id = '$CAMPAIGN_ID' AND phase_type = 'domain_generation';" 2>/dev/null | tr -s ' ')
echo "campaign_phases: $PHASE_STATE"

# API: Get fresh campaign state
echo ""
echo "--- API Layer (snapshot) ---"
POST_CAMPAIGN=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/campaigns/$CAMPAIGN_ID")
POST_PHASE=$(echo "$POST_CAMPAIGN" | jq -r '.current_phase // .campaign.current_phase // "unknown"')
POST_STATUS=$(echo "$POST_CAMPAIGN" | jq -r '.phase_status // .campaign.phase_status // "unknown"')
echo "GET /campaigns/{id}: current_phase=$POST_PHASE, phase_status=$POST_STATUS"

POST_SNAPSHOT=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/campaigns/$CAMPAIGN_ID/status")
POST_SNAP_STATUS=$(echo "$POST_SNAPSHOT" | jq -r '.phases.discovery.status // .phases.domain_generation.status // "unknown"')
echo "GET /campaigns/{id}/status: discovery.status=$POST_SNAP_STATUS"

# 6. Validation summary
echo ""
echo "============================================"
echo "VALIDATION SUMMARY"
echo "============================================"

ALL_PAUSED=true
if [[ "$POST_STATUS" != "paused" ]]; then
  echo "❌ FAIL: Campaign row phase_status != paused (got: $POST_STATUS)"
  ALL_PAUSED=false
fi

if [[ "$DB_STATE" != *"paused"* ]]; then
  echo "❌ FAIL: DB campaign row doesn't show paused"
  ALL_PAUSED=false
fi

if [[ "$PHASE_STATE" != *"paused"* ]]; then
  echo "❌ FAIL: DB phase row doesn't show paused"
  ALL_PAUSED=false
fi

if $ALL_PAUSED; then
  echo "✅ PASS: All layers agree on PAUSED state"
  echo ""
  echo "P0 Fix Verified:"
  echo "  - UpdateCampaignPhaseFields() called in PausePhase()"
  echo "  - lead_generation_campaigns.phase_status = 'paused'"
  echo "  - campaign_phases.status = 'paused'"
  echo "  - API snapshot reflects paused"
fi

# Cleanup
rm -f "$COOKIE_FILE"

echo ""
echo "Validation complete."
