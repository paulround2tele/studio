#!/usr/bin/env bash
set -euo pipefail

# Simple end-to-end smoke test for the /api/v2 server with cookie-based auth and SSE.
# Requirements: curl, jq, timeout

BASE_URL=${BASE_URL:-"http://localhost:8080/api/v2"}
USER_EMAIL=${USER_EMAIL:-"test@example.com"}
USER_PASSWORD=${USER_PASSWORD:-"password"}
COOKIE_JAR=${COOKIE_JAR:-"/tmp/domainflow_cookies.txt"}
XHR_HEADER=${XHR_HEADER:-"XMLHttpRequest"}

echo "[1/10] Health check..." >&2
curl -fsS "$BASE_URL/health" | jq -r '.status // .success // .ok' || true

echo "[2/10] Login..." >&2
curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg e "$USER_EMAIL" --arg p "$USER_PASSWORD" '{email:$e, password:$p}')" \
  "$BASE_URL/auth/login" | jq -r '.data.sessionId // .data.session // .success'

echo "[3/10] Me..." >&2
curl -fsS -b "$COOKIE_JAR" "$BASE_URL/auth/me" | jq '.'

echo "[4/10] Create campaign..." >&2
CREATE_PAYLOAD=$(jq -nc '{name:"SmokeTest"}')
CAMPAIGN_ID=$(curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "$CREATE_PAYLOAD" "$BASE_URL/campaigns" | jq -r '.data.id')
echo "Created campaign: $CAMPAIGN_ID" >&2

echo "[5/10] Configure discovery phase..." >&2
curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "{}" "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/discovery/configure" | jq '.'

echo "[6/10] Start discovery phase..." >&2
curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "{}" "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/discovery/start" | jq '.'

echo "[7/10] Poll discovery status..." >&2
curl -fsS -b "$COOKIE_JAR" "$BASE_URL/campaigns/$CAMPAIGN_ID/phases/discovery/status" | jq '.'

echo "[8/10] List discovered domains (first page)..." >&2
curl -fsS -b "$COOKIE_JAR" "$BASE_URL/campaigns/$CAMPAIGN_ID/domains?limit=10" | jq '.'

echo "[9/10] DB Bulk Stats (requires X-Requested-With)..." >&2
curl -fsS -b "$COOKIE_JAR" -H "X-Requested-With: $XHR_HEADER" "$BASE_URL/db/bulk/stats" | jq '.' || true

echo "[10/10] Peek SSE for a few seconds..." >&2
timeout 5s curl -fsS -N -b "$COOKIE_JAR" "$BASE_URL/sse/campaigns/$CAMPAIGN_ID/events" | sed -E 's/^/SSE: /' || true

echo "Done."
