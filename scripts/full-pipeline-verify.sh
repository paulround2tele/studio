#!/usr/bin/env bash
set -euo pipefail

# Extended full pipeline verification including new domain status/reason filtering.
# Requirements: curl, jq, timeout

BASE_URL="${BASE_URL:-http://127.0.0.1:8080/api/v2}"
EMAIL="${E2E_EMAIL:-test@example.com}"
PASSWORD="${E2E_PASSWORD:-password123}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/pipeline_verify_cookies.txt}"
rm -f "$COOKIE_JAR"

log() { printf "[%s] %s\n" "$(date +%H:%M:%S)" "$*"; }
req() { local m=$1; shift; local u=$1; shift; local d=${1:-}; if [[ -n $d ]]; then curl -sS -X "$m" -H 'Content-Type: application/json' -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$u" --data "$d"; else curl -sS -X "$m" -H 'Content-Type: application/json' -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$u"; fi; }
json_get() { jq -r "$1 // empty" 2>/dev/null; }

command -v jq >/dev/null || { echo "jq required" >&2; exit 1; }

log "Login $EMAIL"
LOGIN_RES=$(req POST "$BASE_URL/auth/login" "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
if [[ $(jq -r '.success // empty' <<<"$LOGIN_RES") != true && -z $(jq -r '.data // empty' <<<"$LOGIN_RES") ]]; then log "Login failed: $LOGIN_RES"; exit 1; fi

# --- Ensure Personas (create one DNS + one HTTP if absent) ---
log "Ensure personas"
LIST=$(req GET "$BASE_URL/personas") || LIST='{}'
DNS_ID=$(jq -r '.data[]? | select(.personaType=="dns") | .id' <<<"$LIST" | head -n1)
HTTP_ID=$(jq -r '.data[]? | select(.personaType=="http") | .id' <<<"$LIST" | head -n1)
if [[ -z $DNS_ID ]]; then
  log "Creating DNS persona (global_balanced_random config)"
  DNS_BODY='{"name":"Auto DNS Persona","personaType":"dns","isEnabled":true,"description":"auto created","configDetails":{"resolvers":["https://cloudflare-dns.com/dns-query","1.1.1.1:53","https://dns.google/dns-query","8.8.8.8:53"],"useSystemResolvers":false,"queryTimeoutSeconds":3,"maxDomainsPerRequest":100,"resolverStrategy":"random_rotation","resolversWeighted":{},"resolversPreferredOrder":[],"concurrentQueriesPerDomain":2,"queryDelayMinMs":10,"queryDelayMaxMs":80,"maxConcurrentGoroutines":20,"rateLimitDps":10,"rateLimitBurst":5}}'
  CRE=$(req POST "$BASE_URL/personas" "$DNS_BODY")
  DNS_ID=$(jq -r '.data.id // .id // empty' <<<"$CRE")
fi
if [[ -z $HTTP_ID ]]; then
  log "Creating HTTP persona (chrome_win10_latest subset)"
  HTTP_BODY='{"name":"Auto HTTP Persona","personaType":"http","isEnabled":true,"description":"auto created","configDetails":{"userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36","headers":{"Accept":"text/html","Accept-Language":"en-US,en;q=0.9"},"headerOrder":["Host","User-Agent","Accept"],"tlsClientHello":{"minVersion":"TLS12","maxVersion":"TLS13","cipherSuites":["TLS_AES_128_GCM_SHA256","TLS_AES_256_GCM_SHA384"],"curvePreferences":["X25519","CurveP256"]},"http2Settings":{"enabled":true},"cookieHandling":{"mode":"session"},"rateLimitDps":5,"rateLimitBurst":3}}'
  HCRE=$(req POST "$BASE_URL/personas" "$HTTP_BODY")
  HTTP_ID=$(jq -r '.data.id // .id // empty' <<<"$HCRE")
fi
[[ -n $DNS_ID && -n $HTTP_ID ]] || { log "Failed to ensure personas DNS_ID=$DNS_ID HTTP_ID=$HTTP_ID"; exit 1; }
log "Using DNS persona $DNS_ID and HTTP persona $HTTP_ID"

log "Create campaign"
CAMP_NAME="VerifyPipeline $(date +%s)"
CREATE_RES=$(req POST "$BASE_URL/campaigns" "{\"name\":\"$CAMP_NAME\"}")
CAMP_ID=$(jq -r '.data.id // .id // empty' <<<"$CREATE_RES")
[[ -n $CAMP_ID ]] || { log "Campaign creation failed: $CREATE_RES"; exit 1; }
log "Campaign $CAMP_ID"

# --- Discovery (Domain Generation) Phase Configuration ---
# Provide all required fields; handler validates variableLength>0, characterSet, tld(s), numDomainsToGenerate>0
UNIQ_SUFFIX=$(date +%s)
DISCOVERY_CFG=$(jq -n --arg cs "acme$UNIQ_SUFFIX" '{configuration:{patternType:"prefix",constantString:$cs,characterSet:"abcdefghijklmnopqrstuvwxyz0123456789",variableLength:1,tlds:[".com"],numDomainsToGenerate:10,batchSize:100,offsetStart:0}}')

log "Configure discovery phase"
CFG_RES=$(req POST "$BASE_URL/campaigns/$CAMP_ID/phases/discovery/configure" "$DISCOVERY_CFG")
if [[ $(jq -r '.success // empty' <<<"$CFG_RES") != true ]]; then
  log "Discovery configure failed: $CFG_RES"; exit 1;
fi
log "Start discovery phase"
START_RES=$(req POST "$BASE_URL/campaigns/$CAMP_ID/phases/discovery/start" '{}')
if [[ $(jq -r '.success // empty' <<<"$START_RES") != true ]]; then
  log "Discovery start failed: $START_RES"; exit 1;
fi

log "Poll discovery completion"
PHASE_DONE=false
for i in {1..90}; do
  sleep 1
  ST=$(req GET "$BASE_URL/campaigns/$CAMP_ID/phases/discovery/status")
  STATUS=$(jq -r '.data.status // .status // empty' <<<"$ST")
  [[ -z $STATUS ]] && continue
  log "discovery status=$STATUS"
  case $STATUS in
    completed) PHASE_DONE=true; break;;
    failed|error) log "Phase failed: $ST"; exit 1;;
  esac
done
if [[ $PHASE_DONE != true ]]; then
  log "Discovery phase did not complete in time"; exit 1;
fi

log "List domains post-discovery"
DOMAINS=$(req GET "$BASE_URL/campaigns/$CAMP_ID/domains?limit=50")
TOTAL=$(jq -r '.data.items | length' <<<"$DOMAINS" 2>/dev/null || echo 0)
[[ $TOTAL -gt 0 ]] || { log "No domains generated"; exit 1; }
log "Domains generated=$TOTAL"

# --- Validation (DNS) Phase ---
VAL_CFG=$(jq -n --arg pid "$DNS_ID" '{configuration:{personaIds:[$pid],batchSize:25,timeout:10,maxRetries:1,validation_types:["A"]}}')
log "Configure validation phase"
V_CFG_RES=$(req POST "$BASE_URL/campaigns/$CAMP_ID/phases/validation/configure" "$VAL_CFG")
if [[ $(jq -r '.success // empty' <<<"$V_CFG_RES") != true ]]; then log "Validation configure failed: $V_CFG_RES"; exit 1; fi
log "Start validation phase"
V_START=$(req POST "$BASE_URL/campaigns/$CAMP_ID/phases/validation/start" '{}')
if [[ $(jq -r '.success // empty' <<<"$V_START") != true ]]; then log "Validation start failed: $V_START"; exit 1; fi
log "Poll validation completion"
for i in {1..120}; do
  sleep 1
  ST=$(req GET "$BASE_URL/campaigns/$CAMP_ID/phases/validation/status")
  STATUS=$(jq -r '.data.status // .status // empty' <<<"$ST")
  [[ -z $STATUS ]] && continue
  log "validation status=$STATUS"
  case $STATUS in
    completed) break;;
    failed|error) log "Validation failed: $ST"; exit 1;;
  esac
done

# Recount domain DNS statuses
log "Count domains by dnsStatus"
DNS_OK=$(req GET "$BASE_URL/campaigns/$CAMP_ID/domains?dnsStatus=ok&limit=200")
COUNT_OK=$(jq -r '.data.items | length' <<<"$DNS_OK" 2>/dev/null || echo 0)
DNS_ERR=$(req GET "$BASE_URL/campaigns/$CAMP_ID/domains?dnsStatus=error&limit=200")
COUNT_ERR=$(jq -r '.data.items | length' <<<"$DNS_ERR" 2>/dev/null || echo 0)
DNS_PENDING=$(req GET "$BASE_URL/campaigns/$CAMP_ID/domains?dnsStatus=pending&limit=200")
COUNT_PENDING=$(jq -r '.data.items | length' <<<"$DNS_PENDING" 2>/dev/null || echo 0)
log "DNS Status counts: ok=$COUNT_OK error=$COUNT_ERR pending=$COUNT_PENDING"

SUMMARY=$(jq -n --arg campaign "$CAMP_ID" --arg total "$TOTAL" --arg dnsOk "$COUNT_OK" --arg dnsErr "$COUNT_ERR" --arg dnsPending "$COUNT_PENDING" --arg dnsPersona "$DNS_ID" --arg httpPersona "$HTTP_ID" '{campaignId:$campaign,totalDomains:($total|tonumber),dnsOk:($dnsOk|tonumber),dnsError:($dnsErr|tonumber),dnsPending:($dnsPending|tonumber),dnsPersona:$dnsPersona,httpPersona:$httpPersona}')
echo "$SUMMARY"

# If discovery failed due to offset exhaustion, retry once with different suffix
if grep -q 'offset' <<<"$ST" && grep -q 'exceeds total combinations' <<<"$ST"; then
  log "Retrying discovery with fresh constantString suffix"
  UNIQ_SUFFIX=$((UNIQ_SUFFIX+1))
  DISCOVERY_CFG=$(jq -n --arg cs "acme$UNIQ_SUFFIX" '{configuration:{patternType:"prefix",constantString:$cs,characterSet:"abcdefghijklmnopqrstuvwxyz0123456789",variableLength:1,tlds:[".com"],numDomainsToGenerate:10,batchSize:100,offsetStart:0}}')
  CFG_RES=$(req POST "$BASE_URL/campaigns/$CAMP_ID/phases/discovery/configure" "$DISCOVERY_CFG")
  START_RES=$(req POST "$BASE_URL/campaigns/$CAMP_ID/phases/discovery/start" '{}')
  for i in {1..90}; do sleep 1; ST=$(req GET "$BASE_URL/campaigns/$CAMP_ID/phases/discovery/status"); STATUS=$(jq -r '.data.status // .status // empty' <<<"$ST"); [[ -z $STATUS ]] && continue; log "discovery retry status=$STATUS"; case $STATUS in completed) break;; failed|error) log "Retry discovery failed: $ST"; exit 1;; esac; done
fi
