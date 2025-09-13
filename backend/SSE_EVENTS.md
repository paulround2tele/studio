## Structural Detail Emission (2025-09 Enhancement)

Two new feature flags expand scoring transparency and language/structural enrichment:

Flag: ENABLE_SSE_STRUCTURAL_DETAILS  
Flag: ENABLE_SSE_FULL_COMPONENTS  
- Emits numeric component contribution scores (density, coverage, non_parked, content_length, title_keyword, freshness, optional tf_lite) in addition to structural fields (if structural flag also enabled).

Flag: ENABLE_TF_LITE  
- Activates experimental tf-lite relevance component (per-KB frequency * log(1+unique)) and honors weight key `tf_lite_weight`.

Score Breakdown API Support (service method + public endpoint)  
- `ScoreBreakdown` method computes per-component values for a single domain using stored feature_vector and current profile weights.

Structural fields optionally surfaced via SSE sample (when enabled):

* components.h1_count (int)  
* components.link_internal_ratio (float 0..1)  
* components.primary_lang (ISO 639-1)

Flag: ENABLE_ADVANCED_LANG_DETECT

Microcrawl Implementation  
Optimization (2025-09 follow-up): Structural numeric fields are now captured during the main scoring iteration and reused for the SSE sample, eliminating prior per-domain SELECT queries (O(1) extra DB round-trips instead of O(sample)).
* microcrawl_pages (int)  
* microcrawl_keywords (int)  
* microcrawl_patterns ([]string)

Testing Additions

---

# SSE Events Reference

Event | Description | Data Fields
----- | ----------- | -----------
mode_changed | Campaign execution mode changed | campaign_id, mode, message, correlationId?
phase_started | Phase manually started | campaign_id, phase, message, correlationId?
phase_auto_started | Phase auto-chained start (full_sequence) | campaign_id, phase, message, correlationId?
phase_completed | Phase finished successfully | campaign_id, phase, results{status,progress_pct,...}, message, correlationId?
phase_failed | Phase failed | campaign_id, phase, error, message, correlationId?
campaign_progress | Periodic aggregated progress update | campaign_id, progress{...}, correlationId?
campaign_completed | All phases complete | campaign_id, duration_ms, overall_status, message, correlationId?
http_enrichment | Batch enrichment sample emitted | campaignId, count, sample[], microcrawl, microMaxPages, microByteBudget, correlationId
domain_scored | Sample of scored domains | campaignId, count, sample[], correlationId
rescore_completed | Rescore cycle finished | campaignId, timestamp, correlationId
error | Generic stream/server error | error, message, correlationId?
keep_alive | Heartbeat to keep connection alive | ts

---
## Domain Score Breakdown Endpoint (2025-09)

Path: `GET /api/v2/campaigns/{campaignId}/domains/{domain}/score-breakdown`

Purpose: On-demand transparency for a single domain's scoring composition. Recomputes component scores using stored `feature_vector` plus active scoring profile weights; does not persist or mutate DB state.

Response (`data` envelope field):

```
{
  "campaignId": "<uuid>",
  "domain": "example.com",
  "components": {
    "density": 0.42,
    "coverage": 0.60,
    "non_parked": 1.0,
    "content_length": 0.58,
    "title_keyword": 1.0,
    "freshness": 0.70,
    "tf_lite": 0.18
  },
  "final": 0.812,
  "weights": { "keyword_density_weight": 0.25, "unique_keyword_coverage_weight": 0.20, "non_parked_weight": 0.10 },
  "parkedPenaltyFactor": 0.5
}
```

Behavior Notes:
* `tf_lite` is `0` when `ENABLE_TF_LITE` is not enabled (key always present for stability).
* `final` includes the parked penalty factor when low-confidence parked (<0.9) logic applies.
* Intended for UI drill-down / debugging. Avoid bulk polling; future rate limits may be applied.
* Returns 404 if the domain or associated feature vector is absent.

---
## Notes
Correlation IDs: Provide traceability across rescore progress, completion, and streaming sample events.

Forward Compatibility: Additional components (e.g., semantic_similarity, backlink_quality) will follow same shape; clients should treat unknown component keys as optional.

Removed Events: (none in this iteration)
