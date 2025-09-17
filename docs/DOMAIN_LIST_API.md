# Domain List API Sorting & Filtering Contract (Proposed)

Endpoint:
GET /api/campaigns/{id}/domains

Query Parameters:
- sort: one of `richness_score`, `microcrawl_gain`, `keywords_unique`, `warnings` (future optional)
  - Maps to columns/paths:
    - richness_score -> richness.score
    - microcrawl_gain -> microcrawl.gain_ratio
    - keywords_unique -> keywords.unique_count
    - warnings -> derived boolean (has_warnings) (optional future)
- dir: `asc` | `desc` (default: desc if invalid/omitted)
- filter: one of `has_warnings`, `no_warnings`
  - has_warnings: any of (stuffing_penalty > 0 OR repetition_index > 0.30 OR anchor_share > 0.40)
  - no_warnings: NOT has_warnings
  - omitted/unrecognized: no filter
- limit / offset or cursor params (existing pagination) remain compatible

Response Envelope Additions (example):
```json
{
  "data": {
    "campaignId": "...",
    "items": [ /* domain objects */ ],
    "total": 123,
    "sort": { "field": "richness_score", "direction": "desc" },
    "filters": { "warnings": "has_warnings" },
    "aggregates": { "warnings_count": 17, "total": 120 }
  },
  "success": true
}
```

Validation Logic:
- If `sort` not in allowlist -> default to `richness_score` desc.
- If `dir` not in {asc,desc} -> desc.
- If `filter` unrecognized -> ignore silently (return all).

Indexes / Performance Suggestions:
- Partial or composite index: `(campaign_id, richness_score DESC)`
- Additional: `(campaign_id, microcrawl_gain_ratio DESC)` if heavily used.
- Boolean computed/persisted column `has_warnings` with index `(campaign_id, has_warnings)` to accelerate filters.

Future Extensions:
- `warnings` sort = prioritize domains with warnings first (sort on has_warnings DESC, then richness_score DESC).
- Multi-filter syntax: `filter=has_warnings;min_richness=0.5` (not in initial scope).

Backward Compatibility:
- Clients not sending new params get current default ordering (richness desc) and no filters.

Security / Safety:
- Strict server-side allowlist mapping prevents SQL injection (never interpolate raw query params into ORDER BY).

Versioning:
- Add `X-Domains-Sort-Version: 1` response header to enable future revisions without breaking clients.
