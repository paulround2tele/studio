#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8080/api/v2}"
EMAIL="${E2E_EMAIL:-test@example.com}"
PASSWORD="${E2E_PASSWORD:-password123}"
COOKIE_JAR="/tmp/pipeline_cookies.txt"
rm -f "$COOKIE_JAR"

log() { printf "[%s] %s\n" "$(date +%H:%M:%S)" "$*"; }

curl_json() {
  local method="$1"; shift
  local url="$1"; shift
  local data="${1:-}"
  if [[ -n "$data" ]]; then
    curl -sS -X "$method" -H 'Content-Type: application/json' -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$url" --data "$data"
  else
    curl -sS -X "$method" -H 'Content-Type: application/json' -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$url"
  fi
}

require_jq() {
  if ! command -v jq >/dev/null 2>&1; then
    log "jq not found; please install jq for parsing"
    exit 1
  fi
}

require_jq

log "Logging in as $EMAIL"
LOGIN_RES=$(curl_json POST "$BASE_URL/auth/login" "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}") || { log "Login request failed"; exit 1; }
if [[ $(jq -r '.success // empty' <<<"$LOGIN_RES") != "true" && $(jq -r '.data // empty' <<<"$LOGIN_RES") == "" ]]; then
  log "Login failed: $LOGIN_RES"; exit 1
fi
log "Login OK"

log "Ensuring personas (dns + http) exist"
create_persona() {
  local ptype="$1"
  local name="E2E-${ptype}-$(date +%s)-$RANDOM"
  local body="{\"name\":\"$name\",\"description\":\"e2e persona\",\"personaType\":\"$ptype\"}"
  local res=$(curl_json POST "$BASE_URL/personas" "$body")
  local id=$(jq -r '.data.id // .id // empty' <<<"$res")
  if [[ -z "$id" ]]; then
    log "Create $ptype persona failed, attempting reuse: $res"
    local list=$(curl_json GET "$BASE_URL/personas")
    id=$(jq -r --arg t "$ptype" '.data[]? | select(.personaType==$t) | .id' <<<"$list" | head -n1 || true)
  fi
  [[ -n "$id" ]] || { log "No persona available for type $ptype"; exit 1; }
  echo "$id"
}

DNS_PERSONA_ID=$(create_persona dns)
HTTP_PERSONA_ID=$(create_persona http)
log "DNS Persona: $DNS_PERSONA_ID"
log "HTTP Persona: $HTTP_PERSONA_ID"

log "Creating campaign"
CAMPAIGN_NAME="FullPipeline $(date +%s)"
CREATE_BODY=$(cat <<JSON
{
  "name": "$CAMPAIGN_NAME",
  "description": "Full pipeline test",
  
  "configuration": {
    "phases": {
      "discovery": {
        "patternType": "prefix",
        "constantString": "acme",
        "characterSet": "abcdefghijklmnopqrstuvwxyz0123456789",
        "variableLength": 5,
        "tlds": [".com"],
        "numDomainsToGenerate": 10,
  "batchSize": 100
      }
    }
  }
}
JSON
)

CREATE_RES=$(curl_json POST "$BASE_URL/campaigns" "$CREATE_BODY")
CAMPAIGN_ID=$(jq -r '.data.id // .id // empty' <<<"$CREATE_RES")
if [[ -z "$CAMPAIGN_ID" ]]; then
  log "Could not extract campaign id: $CREATE_RES"; exit 1
fi
log "Campaign ID: $CAMPAIGN_ID"

configure_phase() {
  local phase="$1"; shift
  local cfg_json="$1"
  local res=$(curl_json POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/$phase/configure" "{\"configuration\": $cfg_json}")
  local ok=$(jq -r '.success // empty' <<<"$res")
  if [[ "$ok" != "true" ]]; then
    log "Configure $phase failed: $res"; exit 1
  fi
}

start_phase() {
  local phase="$1"
  local res=$(curl_json POST "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/$phase/start" '{}')
  local ok=$(jq -r '.success // empty' <<<"$res")
  if [[ "$ok" != "true" ]]; then
    log "Start $phase failed: $res"; exit 1
  fi
}

wait_phase_complete() {
  local phase="$1"
  local attempts=0
  while (( attempts < 120 )); do
    sleep 2
    local st=$(curl_json GET "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/$phase/status") || true
    local status=$(jq -r '.data.status // .status // empty' <<<"$st")
    [[ -n "$status" ]] || { attempts=$((attempts+1)); continue; }
    log "Phase $phase status=$status"
    case "$status" in
      completed) return 0 ;;
      failed|error) log "Phase $phase failed: $st"; return 1 ;;
    esac
    attempts=$((attempts+1))
  done
  log "Timeout waiting for phase $phase to complete"
  return 1
}

run_phase() {
  local phase="$1"; shift
  local cfg="$1"
  log "Configuring phase $phase"
  configure_phase "$phase" "$cfg"
  log "Starting phase $phase"
  start_phase "$phase"
  wait_phase_complete "$phase"
  log "Phase $phase completed"
}

# Discovery (variableLength=5 widens pool; keep numDomainsToGenerate small for speed)
run_phase discovery '{"patternType":"prefix","constantString":"acme","characterSet":"abcdefghijklmnopqrstuvwxyz0123456789","variableLength":5,"tlds":[".com"],"numDomainsToGenerate":10,"batchSize":100,"offsetStart":0}'

log "Fetching generated domains (limit 10)"
DOMAINS=$(curl_json GET "$BASE_URL/campaigns/$CAMPAIGN_ID/domains?limit=10")
COUNT=$(jq -r '.data | length' <<<"$DOMAINS" 2>/dev/null || echo 0)
log "Domains returned: $COUNT"

# Validation
run_phase validation "{\"personaIds\":[\"$DNS_PERSONA_ID\"],\"batchSize\":25,\"timeout\":10,\"maxRetries\":1,\"validation_types\":[\"A\"]}"

# Extraction
run_phase extraction "{\"personaIds\":[\"$HTTP_PERSONA_ID\"],\"keywords\":[\"login\",\"portal\"]}"

# Analysis
run_phase analysis "{\"personaIds\":[\"$HTTP_PERSONA_ID\"],\"includeExternal\":false}"

log "All phases completed successfully for campaign $CAMPAIGN_ID"
SUMMARY=$(jq -n --arg campaign "$CAMPAIGN_ID" --arg domains "$COUNT" '{campaignId:$campaign, domainsReturned:($domains|tonumber)}')
echo "$SUMMARY"
