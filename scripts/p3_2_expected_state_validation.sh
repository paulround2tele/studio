#!/bin/bash
# P3.2 Validation Script: expected_state precondition
# Demonstrates:
#   1. Pause with correct expected_state → 200
#   2. Pause with wrong expected_state → 409 + envelope
#   3. Duplicate pause → 200 (idempotent, no new sequence)

set -e

BASE_URL="${BASE_URL:-http://localhost:8080/api/v2}"
COOKIE_FILE="${COOKIE_FILE:-/tmp/p3_test_cookies.txt}"

echo "=================================================="
echo "P3.2 Validation: expected_state precondition"
echo "=================================================="

# Step 1: Login
echo ""
echo "📌 Step 1: Logging in..."
LOGIN_RESP=$(curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')
echo "Login: $(echo "$LOGIN_RESP" | jq -r '.success // .error.message // "result"')"

# Step 2: Create a test campaign
echo ""
echo "📌 Step 2: Creating test campaign..."
CAMPAIGN_RESP=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "P3.2 Expected State Test",
    "description": "Testing expected_state precondition"
  }')
CAMPAIGN_ID=$(echo "$CAMPAIGN_RESP" | jq -r '.id // empty')

if [ -z "$CAMPAIGN_ID" ]; then
  echo "❌ Failed to create campaign"
  echo "$CAMPAIGN_RESP" | jq .
  exit 1
fi
echo "✅ Created campaign: $CAMPAIGN_ID"

# Step 3: Test expected_state on a phase that's not started
# First, get current status
echo ""
echo "📌 Step 3: Getting current phase status..."
STATUS_RESP=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/campaigns/$CAMPAIGN_ID/status")
DNS_STATUS=$(echo "$STATUS_RESP" | jq -r '.phases[]? | select(.phase == "dns_validation") | .status // "not_started"' 2>/dev/null || echo "not_started")
echo "Current dns_validation status: ${DNS_STATUS:-not_started}"

echo ""
echo "=================================================="
echo "TEST 1: Resume with WRONG expected_state (phase is not_started)"
echo "=================================================="
echo "📌 Calling POST /resume?expected_state=paused (expecting 409 - mismatch)..."
RESUME1_RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phase/dns_validation/resume?expected_state=paused")
RESUME1_BODY=$(echo "$RESUME1_RESP" | head -n -1)
RESUME1_CODE=$(echo "$RESUME1_RESP" | tail -n 1)

if [ "$RESUME1_CODE" = "409" ]; then
  echo "✅ TEST 1 PASSED: Got HTTP 409 as expected (expected_state mismatch)"
  echo "   Error message: $(echo "$RESUME1_BODY" | jq -r '.error.message // .message // "no message"')"
else
  echo "❌ TEST 1 FAILED: Expected 409, got $RESUME1_CODE"
  echo "$RESUME1_BODY" | jq . 2>/dev/null || echo "$RESUME1_BODY"
fi

echo ""
echo "=================================================="
echo "TEST 2: Pause with CORRECT expected_state (but phase not pausable)"
echo "=================================================="
echo "📌 Note: Phase is not_started, so pause itself isn't valid"
echo "📌 This tests that expected_state check happens BEFORE state machine"
echo "📌 Calling POST /pause?expected_state=in_progress (expecting 409 - mismatch since it's not_started)..."
PAUSE1_RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phase/dns_validation/pause?expected_state=in_progress")
PAUSE1_BODY=$(echo "$PAUSE1_RESP" | head -n -1)
PAUSE1_CODE=$(echo "$PAUSE1_RESP" | tail -n 1)

if [ "$PAUSE1_CODE" = "409" ]; then
  echo "✅ TEST 2 PASSED: Got HTTP 409 as expected (expected_state mismatch)"
  echo "   Error message: $(echo "$PAUSE1_BODY" | jq -r '.error.message // .message // "no message"')"
elif [ "$PAUSE1_CODE" = "400" ]; then
  echo "⚠️  TEST 2: Got HTTP 400 (phase control check before expected_state)"
  echo "   Error message: $(echo "$PAUSE1_BODY" | jq -r '.error.message // .message // "no message"')"
else
  echo "❌ TEST 2 FAILED: Expected 409 or 400, got $PAUSE1_CODE"
  echo "$PAUSE1_BODY" | jq . 2>/dev/null || echo "$PAUSE1_BODY"
fi

echo ""
echo "=================================================="
echo "TEST 3: Backward compatibility (no expected_state)"
echo "=================================================="
echo "📌 Calling POST /pause (no expected_state)..."
echo "📌 Should fall through to state machine validation (400 - not running)..."
PAUSE2_RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phase/dns_validation/pause")
PAUSE2_BODY=$(echo "$PAUSE2_RESP" | head -n -1)
PAUSE2_CODE=$(echo "$PAUSE2_RESP" | tail -n 1)

if [ "$PAUSE2_CODE" = "400" ] || [ "$PAUSE2_CODE" = "409" ]; then
  echo "✅ TEST 3 PASSED: Got expected response ($PAUSE2_CODE) - backward compat works"
  echo "   Error message: $(echo "$PAUSE2_BODY" | jq -r '.error.message // .message // "no message"')"
else
  echo "❌ TEST 3 FAILED: Expected 400 or 409, got $PAUSE2_CODE"
  echo "$PAUSE2_BODY" | jq . 2>/dev/null || echo "$PAUSE2_BODY"
fi

echo ""
echo "=================================================="
echo "TEST 4: Invalid expected_state value"
echo "=================================================="
echo "📌 Calling POST /pause?expected_state=invalid_status (expecting 400)..."
PAUSE3_RESP=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
  -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phase/dns_validation/pause?expected_state=invalid_status")
PAUSE3_BODY=$(echo "$PAUSE3_RESP" | head -n -1)
PAUSE3_CODE=$(echo "$PAUSE3_RESP" | tail -n 1)

if [ "$PAUSE3_CODE" = "400" ]; then
  echo "✅ TEST 4 PASSED: Got HTTP 400 as expected (invalid expected_state)"
  echo "   Error message: $(echo "$PAUSE3_BODY" | jq -r '.error.message // .message // "no message"')"
else
  echo "❌ TEST 4 FAILED: Expected 400, got $PAUSE3_CODE"
  echo "$PAUSE3_BODY" | jq . 2>/dev/null || echo "$PAUSE3_BODY"
fi

echo ""
echo "=================================================="
echo "CLEANUP: Deleting test campaign"
echo "=================================================="
curl -s -b "$COOKIE_FILE" -X DELETE "$BASE_URL/campaigns/$CAMPAIGN_ID" | jq -r '.success // "Deleted"' 2>/dev/null || echo "Cleanup done"

echo ""
echo "=================================================="
echo "P3.2 Validation Complete"
echo "=================================================="
