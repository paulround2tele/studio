# Domain Scoring: domain_score vs lead_score

> **Last updated:** 2025-12-26

## Overview

DomainFlow uses two distinct scoring metrics to evaluate domain quality and lead qualification. Understanding the difference helps operators interpret results correctly.

## domain_score (0-100)

**Purpose:** Content-based quality assessment derived from the Analysis & Scoring phase.

### Score Components and Weights

| Component | Weight | Description | Range |
|-----------|--------|-------------|-------|
| `density` | 2.5x | Keyword frequency in page content | 0-1 |
| `coverage` | 2.0x | Variety of unique keywords found | 0-1 |
| `non_parked` | 1.5x | Domain is live, not parked | 0 or 1 |
| `content_length` | 1.0x | Sufficient meaningful content | 0-1 |
| `title_keyword` | 1.5x | Target keyword appears in `<title>` | 0 or 1 |
| `freshness` | 0.5x | Recent content updates detected | 0-1 |

### Score Computation

```
final_score = (
  density * 2.5 +
  coverage * 2.0 +
  non_parked * 1.5 +
  content_length * 1.0 +
  title_keyword * 1.5 +
  freshness * 0.5
) / sum_of_weights * 100

Maximum possible: 100 (when all components = 1.0)
```

### What Makes a Domain a Lead?

1. **Score threshold**: `domain_score >= 40` (configurable)
2. **Structural signals**: DNS valid + HTTP reachable
3. **Keyword presence**: At least one target keyword found in content

Domains are rejected by analysis when:
- **Low score** (<40): Insufficient keyword density, weak content quality
- **Parked domain**: `is_parked = true`, applies 50% penalty
- **No keywords found**: HTTP reachable but no target keywords in content
- **Structural failure**: DNS/HTTP validation failed

### Where Surfaced

- **LeadResultsPanel** — Sortable "Score" column on lead results table
- **DomainDetailDrawer** — Opens on row click; shows breakdown bars for each component
- **AnalysisSummary** — Campaign-level summary showing conversions and rejections
- **API:** `GET /api/v2/campaigns/{id}/domains/{domain}/score-breakdown`

### Color Coding in UI

| Score Range | Color   | Interpretation |
|-------------|---------|----------------|
| ≥ 80        | Emerald | High-quality lead |
| 50–79       | Amber   | Moderate quality |
| < 50        | Gray    | Below threshold |

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
