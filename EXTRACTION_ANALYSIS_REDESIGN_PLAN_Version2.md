# Extraction → Analysis Redesign Plan (Enhanced)

Status: Draft (Pending Approval)  
Owner: (Assign)  
Last Updated: (Set on commit)  

---
### Implementation Progress Snapshot (Auto-Updated)

Completed (initial code scaffolding / partial production wiring):
- WP1 Migrations & Enums (000055 applied to production DB)
- WP2 Feature Struct Builder (stub + aggregation enhancements: richness, top3, signal distribution)
- WP3 Upsert Transaction Logic (atomic upsert + state transitions, reconciliation implemented)
- WP4 Keyword Detail Persistence (bulk insert scaffold + generation helper)
- WP6 Reconciliation Job (ctid-based stuck row reset logic)
- WP7 Dual-Read Analysis Adapter (variance + per-domain diff logging, metrics counters)
- WP10 Metrics (state gauge, dual-read diff counters, lint job skeleton)
- Partial: Stale score detection + rescore CLI stub (precedes WP8/9 full snapshot integration)

In Progress / Next:
- Microcrawl Adaptive Strategy (stub interface + gating heuristic; enrichment wiring TBD)
- Feature Vector Governance (registry + lint; add periodic scheduler & violation counter metric)
- Scoring Profile Snapshotting (to finalize WP8 before broad stale-score workflows)
- Documentation & ADR consolidation (WP13 move to stable docs path)

Deferred / Not Started:
- WP5 Full Microcrawl Integration (real fetch + incremental keyword merge)
- WP8 Snapshot persistence model (scoring_profile_snapshot_id lifecycle automation)
- WP9 Rich rescore CLI (batching, stale domains filter, reporting)
- WP11 Event Harmonization (phase-level events for extraction sub-steps)
- WP12 Storage Optimization (low-impact keyword pruning policies)

---

## 1. Executive Summary
We will refactor the current “extraction phase” into a structured, multi‑step internal pipeline that produces a **canonical, analysis‑ready feature record** per (campaign, domain). The subsequent **analysis phase** becomes a pure, deterministic scoring pass: *no HTML refetching, no parsing, minimal joins*. This dramatically lowers latency, improves reproducibility, and enables rapid re‑scoring when scoring profiles evolve—unlocking continuous iteration without recomputation of raw signals.

## 2. Core Goals
1. **Deterministic Input**: Exactly one authoritative, versioned feature row per domain (per campaign).
2. **Zero Re-Parsing in Analysis**: Analysis consumes prepared features only.
3. **Incremental & Idempotent**: Safe reprocessing of partial or failed domains.
4. **Extensible Schema**: Add experimental features without full migrations (JSONB tail + versioning).
5. **Fast Re-Scoring**: Re-evaluate 100k+ domains in seconds with updated scoring profiles.
6. **Observability by Sub-Step**: Precise metrics + error segmentation for every extraction sub-phase.
7. **Graceful Evolution**: Versioned feature semantics and scoring profile snapshots.
8. **Operational Resilience**: Recovery jobs for stuck states; minimal blast radius on failure.
9. **Storage Discipline**: Prevent unbounded bloat (caps, pruning, dedupe strategies).
10. **Future ML Enablement**: Structure prepares for embedding/vector scoring later.

## 3. High-Level Architecture

### 3.1 Internal Extraction Sub-Steps

| Sub-Step | Code Name            | Responsibility | Output (Ephemeral) | Persists? |
|----------|---------------------|----------------|---------------------|-----------|
| A        | http_fetch          | Fetch root (and headers), measure timing, classify HTTP status | raw HTML, timing metrics | No (HTML transient or cached) |
| B        | primary_parse       | Parse DOM, extract structural keyword signals, language | keyword primitives, structural hints | No |
| C        | enrichment_microcrawl (conditional) | Shallow breadth-first fetch of selected internal pages (budgeted) | additional keyword signals | No |
| D        | aggregate_features  | Compute aggregates, microcrawl gain metrics, classification heuristics | feature struct in memory | No |
| E        | finalize_features   | Upsert canonical row + keyword detail records (atomic) | feature row + keyword rows | Yes |
| F        | phase_finalization  | Emit gating events, update counters, mark processing_state | completion events | Yes (state flags) |

### 3.2 Flow Characteristics
- **Batch-Oriented Writes**: Keyword detail inserts batched per N domains to reduce transaction overhead.
- **Upsert with State Transition**: `processing_state` transitions: `pending → building → ready` (or `error`).
- **Re-Entrant**: Failed or partial domains can be re-queued without double-counting.
- **Adaptive Microcrawl**: Triggered only if base richness thresholds justify cost.

## 4. Data Model

### 4.1 Core Tables

#### 4.1.1 `domain_extraction_features`
Canonical feature record per (campaign_id, domain_id).

| Column | Type | Notes |
|--------|------|-------|
| campaign_id | UUID | PK part |
| domain_id | UUID | PK part |
| domain_name | TEXT | Denormalized for convenience |
| processing_state | enum(pending, building, ready, error, stale) | Drives readiness; replaces ad-hoc booleans |
| ready_for_analysis | (generated) bool | Derived: processing_state='ready' |
| attempt_count | int | Retry visibility |
| last_error | text | Most recent terminal error (null if successful) |
| http_status | text | Normalized status category (success, redirect, error, timeout) |
| http_status_code | int | Raw code |
| fetch_time_ms | int | Root fetch latency |
| content_hash | text | For parked/duplicate detection |
| content_bytes | int | Response size |
| page_lang | text | Optional ISO code |
| kw_unique_count | int | Unique keywords |
| kw_total_occurrences | int | Total keyword hits |
| kw_weight_sum | double | Sum of effective weights |
| kw_top3 | JSONB | `[ {keyword_id, weight} ]` |
| kw_signal_distribution | JSONB | `{ title: n, h1: n, body: n, anchor: n, microcrawl: n }` |
| microcrawl_enabled | bool | Whether deeper crawl executed |
| microcrawl_pages | int | Pages visited beyond root |
| microcrawl_base_kw_count | int | Pre-microcrawl unique |
| microcrawl_added_kw_count | int | Incremental unique gained |
| microcrawl_gain_ratio | double | added / base (0 if not run) |
| diminishing_returns | bool | True if last page added < threshold new unique |
| is_parked | bool | Heuristic classification |
| parked_confidence | double | Confidence score |
| content_richness_score | double | Composite (density, structure, semantic variety) |
| page_archetype | enum | `unknown|landing|parked|blog|directory|market|app|portfolio` (extensible) |
| crawl_strategy | enum | `single_fetch|microcrawl|adaptive_skipped` |
| feature_vector | JSONB | Sparse extension bag (controlled keys) |
| extraction_version | int | Logic version of extraction aggregator |
| keyword_dictionary_version | int | Keyword dictionary / weighting version |
| scoring_profile_snapshot_id | UUID | Snapshot used during last scoring |
| analysis_version | int | Future scoring algorithm version |
| is_stale_score | bool | Set true when profile changes invalidate score |
| updated_at | timestamptz | Auto-updated |
| created_at | timestamptz | Creation timestamp |

**Indexes**
- PK (campaign_id, domain_id)
- Partial: `(campaign_id) WHERE processing_state='ready'`
- Optional: `(campaign_id, is_stale_score) WHERE is_stale_score=true`
- Optional future: `(campaign_id, page_archetype)` for segmented re-scoring

#### 4.1.2 `domain_extracted_keywords`
Per-domain keyword details (deduplicated per keyword_id).

| Column | Type | Notes |
|--------|------|-------|
| campaign_id | UUID | PK part |
| domain_id | UUID | PK part |
| keyword_id | UUID (or INT) | PK part |
| surface_form | text | Original form (normalized separately) |
| signal_type | enum | `title|h1|body|anchor|meta|microcrawl|derived` |
| occurrences | int | Count in that signal context |
| base_weight | double | Pre-adjustment weight (raw) |
| value_score | double | Optional: semantic / dictionary multiplier |
| effective_weight | double | Multiplicative result persisted |
| first_seen_position | int | Character or token index (optional) |
| source_subphase | enum | `primary|microcrawl` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Indexes**
- PK (campaign_id, domain_id, keyword_id)
- Secondary: (campaign_id, keyword_id)
- (Optional) Partial or covering index for ranking queries.

#### 4.1.3 Optional Auxiliary (Future)
- `campaign_keyword_document_counts` (for TF/IDF style normalization)
- `domain_contact_candidates` (if later adding persona/role extraction)

### 4.2 Versioning Strategy
| Concept | Field | Trigger to Increment |
|---------|-------|----------------------|
| Extraction algorithm logic | extraction_version | Change in aggregation formula or feature semantics |
| Keyword dictionary | keyword_dictionary_version | Weight table updated, synonyms added |
| Scoring algorithm | analysis_version | New scoring pipeline rollout |
| Stale scoring detection | is_stale_score | Scoring profile change or feature version mismatch |

### 4.3 Feature Vector Governance
- Allowed keys registry (documentation file).
- Periodic job flags out-of-registry keys (prevents silent drift).
- Potential vectorization path: add `embedding vector` (pgvector) + `vector_schema_version`.

## 5. Event Model

| Event | Purpose | Emission Frequency |
|-------|---------|--------------------|
| domains_http_finalized | Existing gating; signals HTTP fetch completion set | Once per HTTP batch or phase |
| domain_features_batch_finalized (future) | Mid-phase introspection | Optional (rate limited) |
| extraction_phase_completed | All target domains processed (ready + error) | Once per phase |
| analysis_completed | All ready domains scored with current profile | On scoring completion |

**Design Principle**: Avoid per-domain SSE to prevent UI overload; rely on targeted, coarse-grained invalidation.

## 6. Analysis Phase Input Contract
Analysis queries only domains where `processing_state='ready' AND (is_stale_score=true OR scoring_profile_snapshot_id != current_snapshot)`.

Minimal projection:

```sql
SELECT domain_id, http_status, kw_unique_count, kw_weight_sum,
       microcrawl_gain_ratio, parked_confidence, content_richness_score,
       page_archetype, feature_vector
FROM domain_extraction_features
WHERE campaign_id = $1
  AND processing_state = 'ready';
```

Keyword join (only if profile demands granular weighting):

```sql
SELECT k.domain_id, k.keyword_id, k.effective_weight
FROM domain_extracted_keywords k
WHERE k.campaign_id = $1;
```

View abstraction (recommended):

```sql
CREATE VIEW analysis_ready_features AS
SELECT campaign_id, domain_id, kw_unique_count, kw_weight_sum,
       content_richness_score, microcrawl_gain_ratio, page_archetype,
       feature_vector, extraction_version, keyword_dictionary_version
FROM domain_extraction_features
WHERE processing_state='ready';
```

## 7. Scoring Path Simplification

Pseudocode:

```
features = loadFeatures(campaign_id)
profile  = loadActiveScoringProfile(campaign_id)
for f in features:
    base = baseScore(profile, f)
    kwComponent = 0
    if profile.useKeywordWeights:
        kwComponent = keywordContribution(f.domain_id)
    composite = base + kwComponent
    persistScore(f.domain_id, composite, profile.snapshot_id)
emit analysis_completed
```

No network I/O, O(1) per domain aside from optional keyword aggregation.

## 8. Migration / Implementation Phases

| Phase | Deliverables | Flags / Controls | Risk Mitigation |
|-------|--------------|------------------|-----------------|
| P0 | Migrations (tables, enums, basic indexes) | `EXTRACTION_FEATURE_TABLE_ENABLED` | Shadow only, no production reads |
| P1 | Populate features with HTTP + primitive keyword aggregates | + reconciliation job | Compare counts vs legacy path |
| P2 | Store keyword detail table + effective weights | `EXTRACTION_KEYWORD_DETAIL_ENABLED` | Batch size tuning |
| P3 | Add microcrawl metrics + adaptive strategy | `MICROCRAWL_ADAPTIVE_MODE` | Cap pages/time |
| P4 | Flip analysis to dual-read (legacy + new) compare diff | `ANALYSIS_DUAL_READ` | Log score deltas |
| P5 | Primary read => new features only; mark legacy path deprecated | `ANALYSIS_READS_FEATURE_TABLE` | Rollback path retained |
| P6 | Introduce stale score detection & re-score CLI | `ANALYSIS_RESCORING_ENABLED` | Controlled test campaigns |
| P7 | Optional mid-batch events, optimize indexes | - | Performance stabilization |
| P8 | Remove legacy extraction artifacts | - | Archive before removal |

## 9. Idempotency & Resilience

Transaction outline (per domain):

```
BEGIN;
-- mark building (or insert new)
UPSERT domain_extraction_features (processing_state='building', attempt_count = attempt_count + 1);
-- insert/update keyword detail (delete + bulk insert or MERGE)
DELETE FROM domain_extracted_keywords ... (domain scope);
BULK INSERT keyword detail rows;
-- compute aggregates & finalize
UPDATE domain_extraction_features
  SET (kw_unique_count, kw_total_occurrences, kw_weight_sum, kw_top3,
       microcrawl_gain_ratio, feature_vector, processing_state='ready',
       last_error=NULL, updated_at=now())
WHERE ...;
COMMIT;
```

If failure: row remains `building` or gets `error` with `last_error` → reconciliation job picks up.

Reconciliation job:Wire extraction sub-steps to produce RawSignals and call BuildFeatures + UpsertFeatureRow.
Expand BuildFeatures to compute richness, archetype classification, signal distribution.
Implement batch insert for keyword details when EXTRACTION_KEYWORD_DETAIL_ENABLED is on.
Replace reconciliation placeholder with correct ctid subselect pattern (since LIMIT in UPDATE isn’t valid pre-Postgres 17 where needed).
Introduce dual-read scoring path using analysis_ready_features.
Add Prometheus metrics for extraction processing states and durations.
- Scan for `processing_state='building' AND updated_at < now()- interval '5 minutes'`
- Retry with exponential backoff cap.
- Promote `error` rows to `pending` after operator override if transient errors resolved.

## 10. Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Median extraction (single fetch) | <120ms | Includes fetch + parse + aggregation |
| p95 microcrawl addition | <800ms | Budget-limited |
| Analysis throughput (no keyword join) | >5k domains/s (single worker) | In-memory scoring |
| Analysis throughput (with keyword join) | >1k domains/s | Join carefully batched |
| Re-score 100k domains (no detail) | <30s | Warm cache |
| Storage growth (keywords) | < X MB / 10k domains (baseline measured) | Track post-P2 |

Metrics to instrument:
- Histogram: feature_build_duration_ms (by sub-step)
- Histogram: keyword_rows_per_domain
- Gauge: ready_domains / total_domains
- Counter: extraction_failures_total{reason=...}

## 11. Security & Integrity

| Concern | Control |
|---------|---------|
| Injection via surface_form | Sanitize & length cap |
| Data poisoning (large keyword spam) | Cap per-domain keyword rows; drop lowest weights beyond limit |
| Parked domain duplication | Use content_hash + is_parked to dedupe scoring |
| Stale scoring using outdated profile | is_stale_score flag and periodic re-score job |
| Unbounded feature_vector keys | Registry + linter + monitoring job |

## 12. Open (Future) Extensions
1. **Semantic Embeddings**: Add `embedding vector` column (pgvector) for semantic similarity.
2. **TF-IDF Normalization**: Maintain document frequency aggregates.
3. **Anomaly Detection**: Flag domains whose feature distribution drifts from cohort.
4. **Contact Candidate Extraction**: Add sidecar pipeline populating `domain_contact_candidates`.
5. **Adaptive Microcrawl Policy Training**: Learn thresholds from historical gain/latency curves.

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Table bloat (keywords) | Storage pressure | Prune low-impact keywords; compress archived campaigns |
| Long transactions (large batch writes) | Lock contention | Chunk writes; smaller batches (≤500 domains) |
| Feature drift vs scoring profile | Incorrect ranking | Snapshot IDs + stale flag + re-score job |
| Microcrawl timeouts | Pipeline slowdown | Hard timeout + adaptive skip + metrics |
| Overly chatty events | UI perf issues | Batch events only; rate limit |
| Re-score storms | DB write burst | Queue + throttle + incremental delta scoring |
| Feature_vector uncontrolled growth | Query perf drop | Enforce allowed key list |
| Stuck 'building' rows | Incomplete readiness | Reconciliation + attempt_count guard |
| Keyword detail index bloat | Slower inserts | Monitor bloat; periodic REINDEX / partition |

## 14. Acceptance Criteria (MVP)
- Campaign run produces rows in `domain_extraction_features` with HTTP + keyword aggregates for ≥95% domains.
- Analysis (dual-read mode) produces <1% relative score deviation (excluding intentional weighting changes).
- Re-score after profile update touches only stale domains (no re-fetch).
- 10k domains scoring time <3s (no keyword join) and <10s (with join) in staging benchmark.
- Reconciliation reduces stale `building` rows to <0.1% within 10 minutes.
- Observability dashboard displays extraction latencies, failure reasons, backlog completion ratio.

## 15. Work Package Breakdown

| WP | Title | Summary | Depends |
|----|-------|---------|---------|
| 1 | Migrations & Enums | Create tables + states + indexes | - |
| 2 | Feature Struct Builder | In-memory aggregator (sub-steps B–D) | 1 |
| 3 | Upsert Transaction Logic | Atomic persistence with state transitions | 2 |
| 4 | Keyword Detail Persistence | Bulk insert + pruning strategy | 3 |
| 5 | Microcrawl Integration | Adaptive gating, metrics | 2 |
| 6 | Reconciliation Job | Heal stuck/error states | 3 |
| 7 | Dual-Read Analysis Adapter | Compare legacy vs new outputs | 3 |
| 8 | Scoring Profile Snapshotting | Snapshot + stale marking | 7 |
| 9 | Re-Score CLI / Admin Endpoint | Force or schedule re-scoring | 8 |
|10 | Metrics & Dashboards | Prometheus + Grafana panels | 1–5 |
|11 | Event Harmonization | Emit stable phase events | 3 |
|12 | Storage Optimization Pass | Measure + prune / compress | 4 |
|13 | Documentation & ADR | Extract doc to official docs/ path | All |

## 16. Rollback Strategy
- Legacy extraction data structures retained until 2 stable releases after full cutover.
- Feature flags disable new table writes (`EXTRACTION_FEATURE_TABLE_ENABLED=false`).
- Dual-read analysis fallback can revert to legacy scoring path (log warning).
- Backfill script can regenerate feature rows from cached raw HTML (if retained) or degrade gracefully.

## 17. Next Immediate Actions (Post-Approval)
1. Approve schema (adjust columns before migration).
2. Draft migration SQL (WP1) behind feature flag.
3. Implement feature builder abstraction with unit tests (WP2).
4. Implement transactional upsert + state transitions (WP3).
5. Add dual-read scaffolding + score diff logging early (WP7 pulled earlier is acceptable).
6. Define allowed feature_vector key registry (static JSON or code constant).
7. Prepare Prometheus metrics spec and dashboard skeleton.

## 18. Appendix

### 18.1 Example Migration Skeleton (Draft)

```sql
CREATE TYPE processing_state AS ENUM ('pending','building','ready','error','stale');

CREATE TABLE domain_extraction_features (
  campaign_id UUID NOT NULL,
  domain_id   UUID NOT NULL,
  domain_name TEXT,
  processing_state processing_state NOT NULL DEFAULT 'pending',
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  http_status TEXT,
  http_status_code INT,
  fetch_time_ms INT,
  content_hash TEXT,
  content_bytes INT,
  page_lang TEXT,
  kw_unique_count INT,
  kw_total_occurrences INT,
  kw_weight_sum DOUBLE PRECISION,
  kw_top3 JSONB,
  kw_signal_distribution JSONB,
  microcrawl_enabled BOOLEAN,
  microcrawl_pages INT,
  microcrawl_base_kw_count INT,
  microcrawl_added_kw_count INT,
  microcrawl_gain_ratio DOUBLE PRECISION,
  diminishing_returns BOOLEAN,
  is_parked BOOLEAN,
  parked_confidence DOUBLE PRECISION,
  content_richness_score DOUBLE PRECISION,
  page_archetype TEXT,
  crawl_strategy TEXT,
  feature_vector JSONB,
  extraction_version INT NOT NULL DEFAULT 1,
  keyword_dictionary_version INT NOT NULL DEFAULT 1,
  scoring_profile_snapshot_id UUID,
  analysis_version INT,
  is_stale_score BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (campaign_id, domain_id)
);

CREATE INDEX idx_features_ready_campaign
  ON domain_extraction_features (campaign_id)
  WHERE processing_state='ready';

CREATE TABLE domain_extracted_keywords (
  campaign_id UUID NOT NULL,
  domain_id UUID NOT NULL,
  keyword_id UUID NOT NULL,
  surface_form TEXT,
  signal_type TEXT,
  occurrences INT,
  base_weight DOUBLE PRECISION,
  value_score DOUBLE PRECISION,
  effective_weight DOUBLE PRECISION,
  first_seen_position INT,
  source_subphase TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (campaign_id, domain_id, keyword_id)
);
```

### 18.2 Sample Feature Builder (Conceptual Pseudocode)

```go
type RawSignals struct {
  HTML            []byte
  HTTPStatusCode  int
  LatencyMs       int
  ParsedKeywords  []KeywordHit
  MicrocrawlStats *MicrocrawlResult
}

type FeatureAggregate struct {
  KwUniqueCount int
  KwTotalCount  int
  Top3          []WeightedKeyword
  SignalDistribution map[string]int
  MicrocrawlGainRatio float64
  ContentRichnessScore float64
  PageArchetype string
  IsParked bool
  ParkedConfidence float64
  FeatureVector map[string]any
}

func BuildFeatures(signals RawSignals, dict KeywordDictionary, params FeatureParams) FeatureAggregate {
   // pure, side-effect free
}
```

### 18.3 Re-Score Flow Sketch

```bash
# Re-score only stale domains
rescore --campaign $CID --profile $PROFILE_ID --only-stale --batch-size 500
```

### 18.4 Monitoring Dashboard Minimum Panels
- Extraction Latency (p50/p95) by Sub-Step
- Domains by processing_state (stacked)
- Keyword Rows per Domain (distribution)
- Re-score Throughput (domains/s)
- Error Rate (by last_error classification)
- Stale vs Ready Domain Ratio

---

## 19. Approval Checklist
- [ ] Schema accepted (columns frozen for P0)
- [ ] Feature flags named & documented
- [ ] Migration window agreed
- [ ] Capacity estimate recorded (baseline storage / 1k domains)
- [ ] Risk table acknowledged
- [ ] Rollback path validated

---

**End of Plan**  
(When approved, move this file into repo under a stable documentation path and link from architecture index.)

---

## Appendix A: Richness V2 & Microcrawl Configuration / Telemetry

### A.1 Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| RICHNESS_V2_ENABLED | false | Enable Richness V2 computation (adds component breakdown + penalties) |
| RICHNESS_V2_CANARY_DIFF | false | Compute both legacy & V2 richness; emit diff histogram + optional counters |
| RICHNESS_WEIGHT_JSON | (V:0.30,P:0.25,D:0.15,S:0.15,L:0.15,bonus_max:0.25) | Override core richness component weights + enrichment bonus max |
| RICHNESS_SIGNAL_WEIGHT_JSON | title:10,h1:7,meta:5,anchor:4,body:2,microcrawl:1 | Override prominence signal weighting map |
| RICHNESS_DIVERSITY_TARGET | 12 | Controls diminishing returns curve for diversity (effective unique keywords) |
| MICROCRAWL_STOP_RICHNESS | 0.72 | Richness ceiling; above this skip microcrawl |
| MICROCRAWL_STOP_UNIQUE | 20 | Unique keyword ceiling; above this skip microcrawl |
| MICROCRAWL_MIN_REL_GAIN | 0.10 | Minimum relative diversity gain (fraction of target) required to run microcrawl |
| MICROCRAWL_LAMBDA | 0.25 | Discovery rate parameter for expected added uniques model |
| MICROCRAWL_BUDGET_PAGES | 3 | Page budget assumption for gain estimation |
| MICROCRAWL_COMPOSITE_CEIL | 0.62 | Ceiling on composite (0.6*richness + 0.4*diversity_norm) beyond which skip microcrawl |

### A.2 Feature Vector Additions (Richness V2)
| Key | Description |
|-----|-------------|
| richness | Final normalized richness score (0..1) |
| richness_weights_version | Version marker (2) |
| richness_weight_profile | Emitted weight set (V,P,D,S,L,bonus_max) after overrides |
| diversity_effective_unique | Count of effective unique keywords (multi-signal or >=2 occurrences) |
| diversity_target | Active diversity target after env override |
| prominence_norm | Normalized prominence component |
| density_norm | Normalized density (bounded hits / KB) |
| signal_entropy_norm | Structural signal entropy normalized by log2(categories) |
| length_quality_norm | Length component with diminishing penalty after thresholds |
| enrichment_norm | Enrichment gain component (microcrawl) |
| stuffing_penalty | Penalty from dominant keyword share >30% |
| repetition_index | Max keyword share (basis for repetition penalty) |
| anchor_share | Fraction of hits originating from anchors |
| applied_bonus | Applied enrichment multiplier portion |
| applied_deductions_total | Sum of deductions (stuffing + repetition + anchor) |
| richness_legacy_canary | (Canary only) Legacy richness for diff inspection |

### A.3 Prometheus Metrics
| Metric | Type | Labels | Notes |
|--------|------|--------|-------|
| extraction_richness_component | histogram | component | Components + final distribution (detect collapse / drift) |
| extraction_richness_penalty_trigger_total | counter | penalty | Incremented when a penalty (>0) applied |
| extraction_richness_canary_abs_diff | histogram | type=abs | Absolute diff legacy vs V2 when canary enabled |
| analysis_dual_read_diffs_total | counter | type=richness_v2_canary_delta_gt_015 | Reuses existing counter family for large diffs (>0.15) |

### A.4 Canary Diff Logging (Planned Sampling)
Add sampled structured log when absolute diff > threshold (default 0.15) with fields:
```
{"event":"richness_canary_diff","domain_id":...,"legacy":...,"v2":...,"abs_diff":...,"weights":{...}}
```
Sampling strategy: base rate 5% of diff events OR guaranteed first N per deployment window. (Implementation pending.)

### A.5 Adaptive Microcrawl Gating Model
Decision accepted when:
1. richness < MICROCRAWL_STOP_RICHNESS
2. unique < MICROCRAWL_STOP_UNIQUE
3. Expected relative diversity gain >= MICROCRAWL_MIN_REL_GAIN where:
  expected_added = diversity_gap * (1 - exp(-lambda * budget_pages))
4. Composite = 0.6*richness + 0.4*diversity_norm < MICROCRAWL_COMPOSITE_CEIL

### A.6 Tuning Guidance
| Scenario | Adjust |
|----------|--------|
| Components clustering narrow (entropy low) | Increase diversity_target or adjust weights JSON to boost V impact |
| Over-triggered microcrawl | Lower MICROCRAWL_MIN_REL_GAIN or decrease MICROCRAWL_LAMBDA |
| Under-triggered microcrawl | Raise MICROCRAWL_STOP_RICHNESS or STOP_UNIQUE ceilings |
| Excess anchor penalties | Investigate source; if valid pattern, raise anchor penalty threshold in code (future env) |

---
