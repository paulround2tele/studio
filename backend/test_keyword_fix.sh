#!/bin/bash
# Test script to verify the keyword/feature_vector fix
set -e

BASE_URL="${BASE_URL:-http://localhost:8080/api/v2}"

# Login to get auth cookie
echo "=== Step 1: Login ==="
COOKIE_JAR=$(mktemp)
curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .

# Create a new campaign with small max_domains for quick testing
echo ""
echo "=== Step 2: Create test campaign ==="
CAMPAIGN_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "keyword-fix-test-'$(date +%s)'",
    "description": "Testing keyword persistence fix",
    "max_domains": 100
  }')
echo "$CAMPAIGN_RESPONSE" | jq .

CAMPAIGN_ID=$(echo "$CAMPAIGN_RESPONSE" | jq -r '.id')
if [ "$CAMPAIGN_ID" = "null" ] || [ -z "$CAMPAIGN_ID" ]; then
  echo "ERROR: Failed to create campaign"
  exit 1
fi
echo "Campaign ID: $CAMPAIGN_ID"

# Configure domain generation phase
echo ""
echo "=== Step 3: Configure domain generation ==="
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/domain_generation/configure" \
  -H "Content-Type: application/json" \
  -d '{
    "configuration": {
      "enabled": true,
      "generation_mode": "enumeration",
      "prefix_length": 2,
      "suffix_length": 0,
      "constant": "test",
      "constant_position": "suffix",
      "tlds": [".com"]
    }
  }' | jq .

# Configure DNS validation
echo ""
echo "=== Step 4: Configure DNS validation ==="
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/dns_validation/configure" \
  -H "Content-Type: application/json" \
  -d '{
    "configuration": {
      "enabled": true,
      "dns_timeout_seconds": 5,
      "dns_max_retries": 1
    }
  }' | jq .

# Configure HTTP keyword validation with keyword set
echo ""
echo "=== Step 5: Configure HTTP keyword validation ==="
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/http_keyword_validation/configure" \
  -H "Content-Type: application/json" \
  -d '{
    "configuration": {
      "enabled": true,
      "http_timeout_seconds": 10,
      "http_max_retries": 1,
      "http_concurrency": 5
    },
    "keywordSetIds": ["965cf06b-d784-4224-a2c1-5527b3994fa6"]
  }' | jq .

# Start the campaign
echo ""
echo "=== Step 6: Start campaign ==="
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/start" | jq .

echo ""
echo "=== Step 7: Monitor progress (30 seconds) ==="
for i in {1..6}; do
  sleep 5
  echo "Progress check $i:"
  curl -s -b "$COOKIE_JAR" "$BASE_URL/campaigns/$CAMPAIGN_ID" | jq '{
    status: .status,
    current_phase: .current_phase,
    domain_stats: .domain_stats
  }'
done

# Check the database for feature vectors
echo ""
echo "=== Step 8: Check database for feature vectors ==="
sudo -u postgres psql -d domainflow_production -c "
SELECT domain_name, http_status, http_keywords, 
       (feature_vector IS NOT NULL) as has_feature_vector,
       feature_vector->>'kw_top3' as kw_top3
FROM generated_domains 
WHERE campaign_id = '$CAMPAIGN_ID' 
  AND http_status = 'ok' 
LIMIT 10;
"

echo ""
echo "=== Step 9: Count keyword matches ==="
sudo -u postgres psql -d domainflow_production -c "
SELECT 
  COUNT(*) FILTER (WHERE http_status = 'ok') as http_ok,
  COUNT(*) FILTER (WHERE http_keywords IS NOT NULL AND http_keywords != '[]') as with_keywords,
  COUNT(*) FILTER (WHERE feature_vector IS NOT NULL) as with_feature_vector
FROM generated_domains 
WHERE campaign_id = '$CAMPAIGN_ID';
"

rm "$COOKIE_JAR"
echo ""
echo "=== Test complete ==="
echo "Campaign ID: $CAMPAIGN_ID"
