# Domain Scoring: domain_score vs lead_score

> **Last updated:** 2025-12-26

## Overview

DomainFlow uses two distinct scoring metrics to evaluate domain quality and lead qualification. Understanding the difference helps operators interpret results correctly.

## domain_score (0-100)

**Purpose:** Content-based quality assessment derived from the Analysis & Scoring phase.

**Computed from:**
- `density` (2.5x weight) — Keyword frequency in page content
- `coverage` (2.0x weight) — Variety of unique keywords found  
- `non_parked` (1.5x weight) — Domain is live, not parked
- `content_length` (1.0x weight) — Sufficient meaningful content
- `title_keyword` (1.5x weight) — Target keyword appears in `<title>`
- `freshness` (0.5x weight) — Recent content updates detected

**Where surfaced:**
- **LeadResultsPanel** — Sortable "Score" column on lead results table
- **DomainDetailDrawer** — Opens on row click; shows breakdown bars for each component
- **API:** `GET /api/v2/campaigns/{id}/domains/{domain}/score-breakdown`

**Color coding in UI:**
| Score Range | Color   |
|-------------|---------|
| ≥ 80        | Emerald |
| 50–79       | Amber   |
| < 50        | Gray    |

## lead_score (0-100)

**Purpose:** Enrichment-phase confidence score for lead qualification.

**Computed from:**
- Structural signals (e.g., contact forms, pricing pages)
- Keyword alignment with campaign targeting
- Richness metrics (content depth, interactivity)
- Pattern matching against lead templates

**Where surfaced:**
- Used internally by Lead Enrichment phase to classify domains as `match`, `no_match`, or `pending`
- Stored in `campaign_domains.lead_score` column
- Exposed on `DomainListItem.leadScore` in API responses

**Relationship to domain_score:**
- A domain can have a high `domain_score` (good content) but low `lead_score` (doesn't match lead criteria)
- Conversely, a domain with mediocre content but strong structural signals may still qualify as a lead

## When Each Score is Computed

```
Discovery → Validation → Analysis & Scoring → Lead Enrichment
                              ↓                    ↓
                         domain_score          lead_score
```

1. **domain_score** is set during the Analysis & Scoring phase
2. **lead_score** is set during the Lead Enrichment phase
3. Both persist to the `campaign_domains` table for the campaign

## API Endpoints

### Get Score Breakdown for a Domain
```http
GET /api/v2/campaigns/{campaignId}/domains/{domain}/score-breakdown
```

Response:
```json
{
  "campaignId": "uuid",
  "domain": "example.com",
  "final": 82,
  "components": {
    "density": 0.85,
    "coverage": 0.72,
    "non_parked": 1.0,
    "content_length": 0.65,
    "title_keyword": 0.9,
    "freshness": 0.45
  },
  "weights": {
    "density": 2.5,
    "coverage": 2.0,
    "non_parked": 1.5,
    "content_length": 1.0,
    "title_keyword": 1.5,
    "freshness": 0.5
  },
  "parkedPenaltyFactor": 1.0
}
```

### List Domains with Scores
```http
GET /api/v2/campaigns/{campaignId}/domains?limit=50&lead_status=match
```

Each `DomainListItem` includes:
- `domainScore` — Analysis phase score (nullable)
- `leadScore` — Enrichment phase score (nullable)
- `leadStatus` — Classification result (`match`, `no_match`, `pending`)

## Database Schema

```sql
-- campaign_domains table
domain_score  DOUBLE PRECISION,  -- Analysis & Scoring result
lead_score    DOUBLE PRECISION,  -- Lead Enrichment result
lead_status   VARCHAR(32),       -- 'match', 'no_match', 'pending', 'error'
```

## Feature Flag

This UX (score column + drawer) is **enabled by default** with no feature flag gating.

The backend score breakdown endpoint (`GET /api/v2/campaigns/{id}/domains/{domain}/score-breakdown`) returns:
- Real component scores from the `feature_vector` JSONB column in `generated_domains`
- Graceful degradation (returns zero scores) when data is missing rather than a 500 error
- Parked penalty factor when applicable

The drawer falls back to mock breakdown data if the backend endpoint returns empty data, ensuring graceful degradation during development or partial deployments.
