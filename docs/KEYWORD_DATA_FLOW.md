# Keyword Detection & Data Flow

This document captures the authoritative flow for HTTP keyword detection so future developers do not rely on stale assumptions from the early prototype.

## 1. Configuration Sources

| Source | Location | Notes |
|--------|----------|-------|
| Campaign phase config | `campaign_phases.configuration` (type `HTTPPhaseConfigRequest`) | Contains persona IDs, keyword set IDs, ad-hoc keywords, enrichment toggles, and micro-crawl limits. |
| Keyword sets & rules | `keyword_sets`, `keyword_rules` | Queried on-demand by the keyword scanner. Disabled sets are ignored. |
| Personas & proxies | `persona_store`, `proxy_store` | Resolved during phase execution to pick headers, identities, and proxy pools. |

> **Reminder:** The HTTP phase now refuses to run if no keywords are supplied. Older campaigns may have `configuration = NULL`; reconfigure them before restarting the phase.

## 2. Execution Pipeline

1. **Batch Planning** – The orchestrator requests generated domains whose `http_status = 'pending'`.
2. **Fetch & Validation** – `internal/httpvalidator` drives the Chrome-based fetcher, applying personas and proxies.
3. **Keyword Scanning** – For every successful (`status = ok`) fetch:
   - Keyword sets are loaded through `keywordscanner.Service.ScanBySetIDs`.
   - Inline/ad-hoc keywords are processed via `ScanAdHocKeywords`.
   - Pattern counts are accumulated and passed to `topKeywordsFromCounts` (limit 3).
4. **Micro-Crawl (optional)** – When enabled and the root page yielded < 2 unique keywords, the system crawls up to `microMaxPages` internal links within the byte budget, scanning the new bodies for additional keywords.
5. **Feature Vector Assembly** – Structural signals, keyword metrics, micro-crawl results, and parked heuristics are merged into an enrichment vector per domain.

## 3. Persistence

| Table | Columns | Description |
|-------|---------|-------------|
| `generated_domains` | `http_status`, `http_status_code`, `http_reason`, `last_validated_at` | Updated in bulk via `storeHTTPResults`. Status transitions from `pending` to `ok`/`error`/`timeout`. |
| `generated_domains` | `feature_vector` (JSONB), `http_keywords` (TEXT, legacy) | `persistFeatureVectors` writes JSONB containing `kw_top3`, `kw_unique`, `kw_hits_total`, structural counts, parked flags, and micro-crawl metadata. The `http_keywords` column remains for backwards compatibility but is not populated by the current pipeline. |
| `campaign_domain_counters` | `http_pending`, `http_ok`, `http_error`, `http_timeout` | Updated atomically inside the HTTP bulk transaction to keep funnels accurate. |

### Feature Vector Layout (partial)

```json
{
  "status_code": 200,
  "fetched_at": "2025-11-19T14:04:16Z",
  "kw_top3": ["telecom", "voip"],
  "kw_unique": 4,
  "kw_hits_total": 5,
  "microcrawl_used": true,
  "microcrawl_pages": 2,
  "parked_confidence": 0.08,
  "is_parked": false,
  "link_internal_count": 55,
  "warnings": {"diminishing_returns": false}
}
```

## 4. Frontend Consumption

- `LeadResultsPanel` receives `DomainListItem.features` from the campaign domains API. The OpenAPI generator maps `feature_vector` JSONB to `DomainAnalysisFeatures`.
- The "Keywords" pill displays `features.keywords.top3`. When empty, the UI renders "No keywords detected" even if the HTTP status is `ok`.
- Richness and warning banners use `features.richness` and `features.richness.stuffingPenalty`.

## 5. Verification Checklist

1. **Phase configuration**
   ```sql
   SELECT phase_type, configuration
   FROM campaign_phases
   WHERE campaign_id = '<campaign_id>' AND phase_type = 'http_keyword_validation';
   ```
   Ensure `configuration` JSON contains non-empty `"keywords"` or `"adHocKeywords"` arrays.

2. **Post-run keyword data**
   ```sql
   SELECT domain_name, http_status, feature_vector->'kw_top3' AS kw_top3
   FROM generated_domains
   WHERE campaign_id = '<campaign_id>' AND http_status = 'ok'
   ORDER BY domain_name
   LIMIT 20;
   ```
   Expect `kw_top3` arrays for domains where keywords were found.

3. **UI mismatch debugging**
   - Compare API response (`/api/v2/campaigns/{id}/domains`) with DB values.
   - If DB contains keywords but UI does not, inspect the SSE stream and Redux cache invalidation.

## 6. Troubleshooting Reference

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| All HTTP statuses `ok` but `kw_top3 = null` | Campaign configuration had no keywords or keyword store unreachable | Reconfigure phase with keyword sets or inspect keyword set enablement flags |
| `http_status` stuck on `pending` | HTTP phase never started or `storeHTTPResults` failed | Check `apiserver.log` for `failed to store HTTP results`, rerun phase |
| Micro-crawl never triggers | `ENABLE_HTTP_MICROCRAWL` disabled or `kw_unique >= 2` baseline | Enable flag and ensure persona/proxy combination fetches content <60KB to meet heuristics |
| UI shows stale "No keywords" after rerun | Frontend cache not invalidated | Trigger `useGetCampaignDomainsQuery` `refetch()` or reload page to fetch latest data |

Keeping this document current ensures engineers can quickly reconcile backend truth with frontend rendering whenever keyword coverage questions arise.
