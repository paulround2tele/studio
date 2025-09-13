# Post-DNS Pipeline Deviation Report (Snapshot)

Generated: 2025-09-13 UTC
Purpose: Map original plan items to actual implementation; flag OVER-SCOPE (implemented ahead of plan), UNDER-SCOPE (missing), DRIFT (naming/behavior differences), and ACTIONS.

## 1. Summary Table
- OVER-SCOPE: Micro-crawl MVP (MC-01..04) fully implemented earlier than sequence, SSE enrichment event in place, scoring baseline & SSE events (domain_scored, rescore_completed) partially ahead.
- UNDER-SCOPE: Scoring profile CRUD & association (SP-*), rescore endpoint progress events, filtering API, histogram & advanced metrics, enriched domain_scored payload, docs/tests.
- DRIFT: Metric names differ from spec (`http_validation_fetch_outcomes_total` vs planned `http_fetch_result_total`; `http_validation_microcrawl_triggers_total` vs planned `microcrawl_trigger_total`). Feature vector keys omit some planned structural fields (h1_count, link ratios). Parked penalty logic exists but is simplistic (applies 0.5 multiplier when parked_confidence < 0.9).

## 2. Detailed Mapping

### Extraction & Enrichment
| Plan Item | Status | Notes |
|-----------|--------|-------|
| Root fetch integration | EXISTING | Uses `ValidateDomainsBulk` directly. |
| Content parser (links, structure) | PARTIAL | Title + snippet used; structural counts not populated. |
| Feature vector assembly | EXISTING | kw_* + parked + microcrawl fields present; missing h1_count, link ratios, lang. |
| Parked heuristic | EXISTING | Weighted phrase presence; threshold 0.75. |
| Adaptive micro-crawl | EXISTING | Trigger logic implemented; lacks telemetry details & reason labels. |
| Enrichment persistence | EXISTING | Bulk update function present. |
| Error taxonomy | MISSING | Reasons not normalized to planned set. |

### Micro-Crawl Metrics
| Plan Metric | Implementation | Gap |
|-------------|----------------|-----|
| microcrawl_trigger_total{reason} | `http_validation_microcrawl_triggers_total` (no labels) | Add reason label & rename or alias. |
| microcrawl_pages_examined_histogram | Missing | Implement histogram vector. |

### Scoring & Profiles
| Plan Item | Status | Notes |
|-----------|--------|-------|
| Scoring profile CRUD | MISSING | No endpoints/spec entries yet. |
| Association PATCH | MISSING | Not present. |
| Weight validation | PARTIAL | Validation helper exists; no endpoint wiring. |
| Scoring engine advanced normalization | PARTIAL | Baseline weights applied; some normalization heuristics implicit. |
| Parked penalty configurable | MISSING | Hardcoded 0.5 multiplier; not profile-driven. |
| Rescore endpoint + progress SSE | MISSING | Only `RescoreCampaign` method without progress events or HTTP handler. |
| Enriched domain_scored payload | MISSING | Payload includes only domain & score, no components. |

### Filtering
| Plan Item | Status | Notes |
|-----------|--------|-------|
| Query params (minScore, keyword, hasContact, notParked, sort) | MISSING | Need spec + handler/store query extension. |
| Indices (conditional) | MISSING | Defer until filtering implemented. |

### Metrics & SSE
| Planned | Current | Gap |
|---------|---------|-----|
| http_fetch_result_total{reason} | http_validation_fetch_outcomes_total{status} | Different name & label semantics (reason vs status). |
| parked_detection_total{label} | Absent | Need counter vec for parked outcomes. |
| score distribution histogram | Absent | Add histogram (`domain_relevance_score_bucket`). |
| phase_started/completed/failed events | Partially existing (not verified) | Confirm and extend. |
| rescore_completed summary | EXISTS | Add intermediate progress events. |

### Testing
| Plan Test | Status | Gap |
|-----------|--------|-----|
| Extraction happy path | MISSING | Add integration fixture. |
| Micro-crawl trigger | MISSING | Need deterministic HTML set. |
| Scoring profile association | MISSING | After CRUD implemented. |
| Rescore timing | MISSING | After endpoint exists. |
| Filter logic | MISSING | After filtering implemented. |
| Parked heuristic edge cases | MISSING | Add FP/FN sampling test. |

### Documentation
| Item | Status | Gap |
|------|--------|-----|
| SSE_EVENTS.md updates | MISSING | Add new events & payload schema. |
| Architecture pipeline diagram | MISSING | Update for feature_vector + scoring. |
| README scoring section | MISSING | Provide usage + flags. |
| Feature flags doc | MISSING | Enumerate and describe rollback. |

## 3. Risk & Impact
| Risk | Impact | Current Mitigation | Proposed Action |
|------|--------|--------------------|-----------------|
| Metric name drift | Dashboard confusion / rework | None | Introduce alias metrics or rename now before adoption. |
| Missing profile CRUD | Block scoring customization | None | Prioritize SP-01..03 next. |
| Lack of filtering | Limited UX value from scores | None | Implement FL-01..02 in same milestone as profiles. |
| Sparse tests | Regression risk | Some helpers tested | Add highest value integration tests early. |
| Hardcoded parked penalty | Inflexible tuning | Simple multiplier | Move penalty factor into profile weights. |

## 4. Prioritized Action Sequence (Next 6)
1. SP-01..03: OpenAPI + CRUD + association (unblock scoring customization).
2. SC-03: Rescore endpoint with progress SSE events.
3. OBS Enhancements: Add alias/renamed metrics + parked_detection + micro-crawl reason labels + score histogram.
4. FL-01..02: Filtering params + query builder.
5. SC-05: Enriched domain_scored payload (include components, parked flag, kw counts).
6. Tests Batch 1: T-05, T-06, T-07 (foundation integration set).

## 5. Concrete Metric Alignment Changes
Planned → Implemented / Proposed:
- http_fetch_result_total{reason} → Keep existing name, add alias counter with planned name referencing same increments to ease dashboards.
- microcrawl_trigger_total{reason} → Replace simple counter with CounterVec; keep old name temporarily (deprecated label in HELP).

## 6. Feature Vector Expansion Backlog
Add fields in-place (additive): h1_count, link_internal_ratio, primary_lang, diminishing_returns.

## 7. Acceptance Snapshots Needed
- ORC-01: Provide evidence log in `docs/snippets/ORC-01.txt` (currently template only).
- Metrics registry scrape snippet after new counters added.

## 8. Decision Points
- Rename metrics now vs add aliases? (Recommend alias to avoid churn.)
- Configurable parked penalty: implement via new weight `parked_penalty_weight` or boolean penalty toggle? (Recommend weight controlling subtraction factor.)

## 9. Open Questions (Carry Forward)
Unchanged from plan except: Should enriched domain_scored payload include full component breakdown or only normalized? (Recommendation: include components map + final score; keep to ≤10 keys.)

---
(End Report)
