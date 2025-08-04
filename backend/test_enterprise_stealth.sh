#!/bin/bash

# Enterprise Stealth Validation Test Script
# Tests our 4-tier stealth architecture with real scenarios

API_BASE="http://localhost:8080/api/v2"
TEST_USER="test@example.com"
TEST_PASS="password123"

echo "🎯 Testing Enterprise Stealth System - Day 4 Validation"
echo "=================================================="

# Authenticate and get session cookie
echo "🔐 Authenticating with session cookies..."
COOKIE_JAR=$(mktemp)

AUTH_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_USER}\", \"password\": \"${TEST_PASS}\"}")

AUTH_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.data.token')
USER_ID=$(echo $AUTH_RESPONSE | jq -r '.data.user.id')

if [ "$AUTH_TOKEN" = "null" ]; then
  echo "❌ Authentication failed!"
  echo $AUTH_RESPONSE | jq .
  exit 1
fi

echo "✅ Authenticated successfully. Session cookie stored."
echo "👤 User ID: $USER_ID"
echo "🍪 Cookie jar: $COOKIE_JAR"

# Test 0: First, generate domains to validate
echo -e "\n🏗️ STEP 1: Generate Domains for Testing"
echo "Creating domains before we can validate them (proper workflow)..."

GENERATION_RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST "${API_BASE}/campaigns/bulk/domains/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"operations\": [
      {
        \"campaignId\": \"$USER_ID\",
        \"config\": {
          \"patternType\": \"prefix\",
          \"variableLength\": 3,
          \"characterSet\": \"abcdefghijklmnopqrstuvwxyz\",
          \"constantString\": \"test\",
          \"tlds\": [\".com\", \".net\"],
          \"numDomainsToGenerate\": 50,
          \"batchSize\": 25
        },
        \"maxDomains\": 50
      }
    ],
    \"batchSize\": 25,
    \"parallel\": true
  }")

echo $GENERATION_RESPONSE | jq .
GENERATION_SUCCESS=$(echo $GENERATION_RESPONSE | jq -r '.operations | to_entries | .[0].value.success // false')

if [ "$GENERATION_SUCCESS" != "true" ]; then
  echo "⚠️ Domain generation failed or pending. Proceeding with validation tests anyway..."
else
  echo "✅ Domains generated successfully!"
fi

# Give the system a moment to process domain generation
echo "⏱️ Waiting 3 seconds for domain generation to complete..."
sleep 3

# Test 1: Conservative Stealth Profile
echo -e "\n🛡️ TEST 1: Conservative Stealth Profile"
echo "Using preset configuration for low-risk environments..."

curl -X POST "${API_BASE}/campaigns/bulk/domains/validate-dns" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{
    \"operations\": [
      {
        \"campaignId\": \"$USER_ID\",
        \"personaIds\": [\"$USER_ID\"],
        \"maxDomains\": 10
      }
    ],
    \"batchSize\": 5,
    \"stealth\": {
      \"enabled\": true,
      \"randomizationLevel\": \"low\",
      \"temporalJitter\": true,
      \"patternAvoidance\": true,
      \"userAgentRotation\": true,
      \"proxyRotationForced\": false,
      \"detectionThreshold\": 0.8,
      \"requestSpacing\": 2000,
      \"advancedPolicy\": {
        \"profile\": \"conservative\",
        \"maxConcurrentRequests\": 3,
        \"requestBurstLimit\": 5,
        \"adaptiveThrottling\": true,
        \"geographicDistribution\": false,
        \"timeZoneSimulation\": false,
        \"humanBehaviorPatterns\": [\"gradual_ramp\", \"natural_pauses\"],
        \"cooldownPeriods\": [30, 60, 120]
      },
      \"behavioralMimicry\": {
        \"enabled\": true,
        \"browserBehavior\": true,
        \"searchPatterns\": false,
        \"typingDelays\": true,
        \"sessionDuration\": 300,
        \"idlePeriods\": [15, 30, 45]
      },
      \"proxyStrategy\": {
        \"strategy\": \"round_robin\",
        \"proxyRotationRate\": \"per_batch\",
        \"healthCheckInterval\": 300,
        \"failoverThreshold\": 0.7,
        \"geoTargeting\": false,
        \"proxyQualityFiltering\": true
      },
      \"detectionEvasion\": {
        \"enabled\": true,
        \"fingerprintRandomization\": false,
        \"tlsFingerprintRotation\": false,
        \"httpHeaderRandomization\": true,
        \"requestOrderRandomization\": false,
        \"timingAttackPrevention\": true,
        \"rateLimitEvasion\": true,
        \"honeypotDetection\": true
      }
    }
  }" | jq .

echo -e "\n🚀 TEST 2: Aggressive Stealth Profile"
echo "Testing high-performance stealth for enterprise environments..."

curl -X POST "${API_BASE}/campaigns/bulk/domains/validate-http" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{
    \"operations\": [
      {
        \"campaignId\": \"$USER_ID\",
        \"personaIds\": [\"$USER_ID\"],
        \"keywords\": [\"technology\", \"business\", \"innovation\"],
        \"maxDomains\": 10
      }
    ],
    \"batchSize\": 10,
    \"concurrent\": 3,
    \"stealth\": {
      \"enabled\": true,
      \"randomizationLevel\": \"high\",
      \"temporalJitter\": true,
      \"patternAvoidance\": true,
      \"userAgentRotation\": true,
      \"proxyRotationForced\": true,
      \"detectionThreshold\": 0.4,
      \"requestSpacing\": 1000,
      \"advancedPolicy\": {
        \"profile\": \"aggressive\",
        \"maxConcurrentRequests\": 8,
        \"requestBurstLimit\": 15,
        \"adaptiveThrottling\": true,
        \"geographicDistribution\": true,
        \"timeZoneSimulation\": true,
        \"humanBehaviorPatterns\": [\"gradual_ramp\", \"natural_pauses\", \"random_bursts\", \"power_user\"],
        \"cooldownPeriods\": [10, 20, 40]
      },
      \"behavioralMimicry\": {
        \"enabled\": true,
        \"browserBehavior\": true,
        \"searchPatterns\": true,
        \"socialMediaPatterns\": true,
        \"randomMouseMovement\": true,
        \"typingDelays\": true,
        \"scrollingBehavior\": true,
        \"sessionDuration\": 900,
        \"idlePeriods\": [5, 10, 15, 30]
      },
      \"proxyStrategy\": {
        \"strategy\": \"intelligent_failover\",
        \"proxyRotationRate\": \"per_request\",
        \"healthCheckInterval\": 60,
        \"failoverThreshold\": 0.3,
        \"geoTargeting\": true,
        \"proxyQualityFiltering\": true
      },
      \"detectionEvasion\": {
        \"enabled\": true,
        \"fingerprintRandomization\": true,
        \"tlsFingerprintRotation\": true,
        \"httpHeaderRandomization\": true,
        \"requestOrderRandomization\": true,
        \"payloadObfuscation\": true,
        \"timingAttackPrevention\": true,
        \"rateLimitEvasion\": true,
        \"honeypotDetection\": true,
        \"captchaBypass\": false,
        \"antiAnalysisFeatures\": [\"header_spoofing\", \"timing_variance\", \"payload_encryption\"]
      }
    }
  }" | jq .

echo -e "\n⚡ TEST 3: Performance Comparison"
echo "Testing validation without stealth for baseline..."

curl -X POST "${API_BASE}/campaigns/bulk/domains/validate-dns" \
  -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{
    \"operations\": [
      {
        \"campaignId\": \"$USER_ID\",
        \"personaIds\": [\"$USER_ID\"],
        \"maxDomains\": 10
      }
    ],
    \"batchSize\": 100
  }" | jq .

echo -e "\n✅ Enterprise Stealth Tests Complete!"
echo "Check backend-log.txt for detailed stealth metrics and performance data."

# Cleanup
rm -f "$COOKIE_JAR"
echo "🧹 Cleaned up temporary files."
