#!/bin/bash
# REQUIREMENT #5: Backfill / Recovery for Stuck Campaigns
#
# This script scans for campaigns where:
#   - A phase is marked 'completed' in campaign_phases
#   - The next phase in sequence is 'not_started'
#   - The campaign is NOT 'completed' or 'failed' overall
#
# It can either report or resume these stuck campaigns.
#
# Usage:
#   ./scripts/backfill_stuck_campaigns.sh [--dry-run|--resume] [--base-url URL]
#
# Options:
#   --dry-run     Only report stuck campaigns, don't resume (default)
#   --resume      Actually trigger resume for stuck campaigns
#   --base-url    API base URL (default: http://localhost:8080/api/v2)

set -euo pipefail

# Parse arguments
DRY_RUN=true
BASE_URL="${BASE_URL:-http://localhost:8080/api/v2}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --resume)
            DRY_RUN=false
            shift
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        --token)
            AUTH_TOKEN="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=========================================="
echo "Stuck Campaign Recovery Tool"
echo "=========================================="
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (report only)' || echo 'RESUME')"
echo "Base URL: $BASE_URL"
echo ""

# Phase sequence (order matters)
PHASE_SEQUENCE=(
    "domain_generation"
    "dns_validation"
    "http_keyword_validation"
    "extraction"
    "analysis"
    "enrichment"
)

# Function to get the next phase
get_next_phase() {
    local current_phase="$1"
    local found=false
    for phase in "${PHASE_SEQUENCE[@]}"; do
        if [ "$found" = true ]; then
            echo "$phase"
            return
        fi
        if [ "$phase" = "$current_phase" ]; then
            found=true
        fi
    done
    echo "" # No next phase (enrichment is last)
}

# SQL query to find stuck campaigns
# A campaign is stuck if:
#   1. It has a phase with status='completed'
#   2. The next phase in sequence has status='not_started'
#   3. The campaign overall status is 'in_progress' (not completed/failed)
SQL_QUERY=$(cat <<'EOF'
WITH phase_order AS (
    SELECT unnest(ARRAY['domain_generation', 'dns_validation', 'http_keyword_validation', 'extraction', 'analysis', 'enrichment']) AS phase_type,
           generate_series(1, 6) AS seq
),
campaign_phase_status AS (
    SELECT 
        cp.campaign_id,
        cp.phase_type,
        cp.status,
        po.seq
    FROM campaign_phases cp
    JOIN phase_order po ON cp.phase_type::text = po.phase_type
),
stuck_candidates AS (
    SELECT 
        cps.campaign_id,
        cps.phase_type AS completed_phase,
        cps.seq AS completed_seq,
        next_cps.phase_type AS next_phase,
        next_cps.status AS next_status
    FROM campaign_phase_status cps
    JOIN campaign_phase_status next_cps 
        ON cps.campaign_id = next_cps.campaign_id 
        AND next_cps.seq = cps.seq + 1
    WHERE cps.status = 'completed'
      AND next_cps.status = 'not_started'
)
SELECT 
    sc.campaign_id,
    lgc.name AS campaign_name,
    lgc.phase_status AS overall_status,
    sc.completed_phase,
    sc.next_phase
FROM stuck_candidates sc
JOIN lead_generation_campaigns lgc ON sc.campaign_id = lgc.id
WHERE lgc.phase_status NOT IN ('completed', 'failed')
  AND lgc.deleted_at IS NULL
ORDER BY lgc.updated_at DESC;
EOF
)

echo "Scanning for stuck campaigns..."
echo ""

# Run the query
STUCK_CAMPAIGNS=$(sudo -u postgres psql -d domainflow_production -t -A -F'|' -c "$SQL_QUERY" 2>/dev/null || true)

if [ -z "$STUCK_CAMPAIGNS" ]; then
    echo "✅ No stuck campaigns found. All pipelines are healthy."
    exit 0
fi

# Count and display stuck campaigns
STUCK_COUNT=$(echo "$STUCK_CAMPAIGNS" | wc -l)
echo "⚠️  Found $STUCK_COUNT stuck campaign(s):"
echo ""
echo "Campaign ID                          | Name                      | Status      | Completed Phase           | Next Phase"
echo "-------------------------------------+---------------------------+-------------+---------------------------+---------------------------"

echo "$STUCK_CAMPAIGNS" | while IFS='|' read -r campaign_id name overall_status completed_phase next_phase; do
    printf "%-36s | %-25s | %-11s | %-25s | %-25s\n" \
        "$campaign_id" \
        "${name:0:25}" \
        "$overall_status" \
        "$completed_phase" \
        "$next_phase"
done

echo ""

if [ "$DRY_RUN" = true ]; then
    echo "This is a DRY RUN. No changes were made."
    echo ""
    echo "To resume these campaigns, run:"
    echo "  $0 --resume"
    echo ""
    echo "Or manually resume via API:"
    echo "$STUCK_CAMPAIGNS" | while IFS='|' read -r campaign_id name overall_status completed_phase next_phase; do
        echo "  curl -X POST '$BASE_URL/campaigns/$campaign_id/phases/$next_phase/start'"
    done
else
    echo "Resuming stuck campaigns..."
    echo ""
    
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    
    echo "$STUCK_CAMPAIGNS" | while IFS='|' read -r campaign_id name overall_status completed_phase next_phase; do
        echo -n "Resuming $campaign_id ($name) -> $next_phase... "
        
        # Build auth header if token provided
        AUTH_HEADER=""
        if [ -n "$AUTH_TOKEN" ]; then
            AUTH_HEADER="-H 'Authorization: Bearer $AUTH_TOKEN'"
        fi
        
        # Try to start the next phase
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            $AUTH_HEADER \
            "$BASE_URL/campaigns/$campaign_id/phases/$next_phase/start" 2>/dev/null || echo "000")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | head -n-1)
        
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
            echo "✅ Started (HTTP $HTTP_CODE)"
            ((SUCCESS_COUNT++)) || true
        else
            echo "❌ Failed (HTTP $HTTP_CODE)"
            echo "   Response: $BODY"
            ((FAIL_COUNT++)) || true
        fi
    done
    
    echo ""
    echo "Summary: $SUCCESS_COUNT resumed, $FAIL_COUNT failed"
fi

echo ""
echo "=========================================="
echo "Recovery scan complete"
echo "=========================================="
