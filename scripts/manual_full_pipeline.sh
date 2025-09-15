#!/usr/bin/env bash
set -euo pipefail

# Manual full pipeline helper
# Requirements: running Postgres with credentials matching env below, backend built, frontend dev server

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend"
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export DB_HOST=${DB_HOST:-localhost}
export DB_PORT=${DB_PORT:-5432}
export DB_NAME=${DB_NAME:-domainflow_dev}
export DB_USER=${DB_USER:-domainflow}
export DB_PASSWORD=${DB_PASSWORD:-devpassword}
export DB_SSLMODE=${DB_SSLMODE:-disable}
export SERVER_PORT=${SERVER_PORT:-8080}

info(){ echo -e "[info] $*"; }
err(){ echo -e "[error] $*" >&2; }

usage(){ cat <<EOF
Manual Full Pipeline Script
Steps:
 1. Ensure Postgres is running and schema applied (database/schema.sql)
 2. Start backend (go run ./cmd/apiserver) in another terminal OR let this script start it
 3. Run this script to:
    - (optional) start backend
    - login (or use default session)
    - create campaign
    - configure discovery phase
    - start discovery
    - poll domains until at least N generated

Environment variables:
  START_BACKEND=1        # if set, script will start backend in background
  DESIRED_DOMAINS=500    # stop after this many domains observed

EOF
}

DESIRED_DOMAINS=${DESIRED_DOMAINS:-100}
START_BACKEND=${START_BACKEND:-0}

cd "$BACKEND_DIR"

if [[ "$START_BACKEND" == "1" ]]; then
  info "Starting backend apiserver..."
  go run ./cmd/apiserver > apiserver.full_pipeline.log 2>&1 &
  API_PID=$!
  trap '[[ -n "${API_PID:-}" ]] && kill $API_PID || true' EXIT
  sleep 2
fi

BASE="http://localhost:${SERVER_PORT}/api/v2"

# Health check
for i in {1..15}; do
  if curl -sf "$BASE/health" > /dev/null; then
    info "Backend healthy"
    break
  fi
  sleep 1
  [[ $i == 15 ]] && { err "Backend health never became ready"; exit 1; }
done

# Create campaign
CAMP_NAME="pipeline-$(date +%s)"
info "Creating campaign $CAMP_NAME"
CAMP_JSON=$(curl -s -X POST "$BASE/campaigns" -H 'Content-Type: application/json' -d '{"name":"'$CAMP_NAME'"}')
CAMP_ID=$(echo "$CAMP_JSON" | jq -r '.data.id')
[[ "$CAMP_ID" == "null" || -z "$CAMP_ID" ]] && { err "Failed to create campaign: $CAMP_JSON"; exit 1; }
info "Campaign ID: $CAMP_ID"

# Configure discovery phase (domain generation)
info "Configuring discovery phase"
CFG_BODY='{"configuration":{"patternType":"prefix","variableLength":3,"characterSet":"abc123","constantString":"x","tld":"com","numDomainsToGenerate":1000,"batchSize":500}}'
CONF_RES=$(curl -s -X POST "$BASE/campaigns/$CAMP_ID/phase/discovery/configure" -H 'Content-Type: application/json' -d "$CFG_BODY")
if ! echo "$CONF_RES" | jq -e '.success == true' > /dev/null; then
  err "Failed to configure discovery: $CONF_RES"; exit 1; fi

# Start discovery phase
info "Starting discovery phase"
START_RES=$(curl -s -X POST "$BASE/campaigns/$CAMP_ID/phase/discovery/start")
if ! echo "$START_RES" | jq -e '.success == true' > /dev/null; then
  err "Failed to start discovery: $START_RES"; exit 1; fi

# Poll domains
info "Polling domains until >= $DESIRED_DOMAINS found"
COUNT=0
for i in {1..120}; do
  DOM_JSON=$(curl -s "$BASE/campaigns/$CAMP_ID/domains?limit=500")
  COUNT=$(echo "$DOM_JSON" | jq -r '.data.total // 0')
  echo -ne "\rDomains: $COUNT"
  if [[ $COUNT -ge $DESIRED_DOMAINS ]]; then
    echo
    info "Desired domain count reached"
    break
  fi
  sleep 2
  if [[ $i == 120 ]]; then
    echo
    err "Timeout waiting for domains (last count $COUNT)"
    exit 1
  fi
done

info "Full pipeline basic domain generation succeeded for campaign $CAMP_ID"
