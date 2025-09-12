# Post-DNS Pipeline Refactor & Scoring/Analysis Implementation Plan

Scope: Everything that happens AFTER successful DNS Validation through to (a) HTTP Extraction / Keyword Validation, (b) Scoring & Analysis, (c) Metrics + SSE, (d) Expanded Filtering & UX Support. This plan is execution‑ready: sequenced, dependency‑aware, with explicit DONE criteria & rollback notes.

---
## 0. Guiding Objectives
1. Deterministic, observable phase progression (no more “configured” stalls).
2. Single-pass, resource-efficient HTTP content acquisition with optional adaptive depth‑1 micro‑crawl.
3. Configurable keyword + scoring system (profiles) decoupled from campaigns but referenceable.
4. Persisted feature vectors + scores enabling re-score without refetch.
5. Robust metrics + events for pipeline health, throughput, quality, and drift.
6. Powerful domain list filtering (status, reasons, score, contacts, keyword hit, parked, sort).
7. Low operational risk: additive migrations, idempotent jobs, safe retries.

---
## 1. Current Blockers / Root Causes (Hypotheses & Validation Tasks)
| ID | Symptom | Likely Cause | Validation Action | Owner | Status |
|----|---------|-------------|-------------------|-------|--------|
| B1 | Extraction phase stays `configured` | Executor / worker not invoked (missing dispatcher or queue enqueue) | Trace StartPhase → service → goroutine spawn; add temporary debug logs |  |  |
| B2 | Start returns "already in progress" but no progress | Phase row status logic mis-set or optimistic concurrency mismatch | Inspect phase status transitions & locking; verify status change pre vs post spawn |  |  |
| B3 | HTTP phase silently gated when all DNS statuses are `error` | Hidden precondition requiring ≥1 OK domain | Confirm code path in `http_validation.go` / associated selector; replicate with one forced OK |  |  |
| B4 | Missing metrics for phase execution | Not yet instrumented | Add counters/histograms wrappers around execution entry points |  |  |

TODO (Blocker Validation):
- [ ] Insert targeted debug logs (temporary) around StartPhase for extraction
- [ ] Run pipeline with one domain manually marked dns_status=ok to test gating assumption
- [ ] Confirm whether an async worker loop consumes a queue/event (grep for `extraction` / `HTTPKeywordValidation`)
- [ ] Remove debug logs after fix & replace with structured permanent logs

---
## 2. Data Model Extensions (Additive Migrations)
Migration Set (ordered):
1. `0000XX_add_http_scoring_columns.sql`
   - Columns on `generated_domains`:
     - `http_status` (already exists if present) – verify.
     - `http_reason TEXT NULL` (if not present)
     - `relevance_score NUMERIC(6,3) NULL` (0–100 scaled via weights)
     - `domain_score NUMERIC(6,3) NULL` (aggregate final score)
     - `feature_vector JSONB NULL` (normalized extracted signals)
     - `is_parked BOOLEAN NULL` (tri-state semantics: NULL=unknown)
     - `parked_confidence NUMERIC(5,3) NULL`
     - `contacts JSONB NULL` (array of objects: {type, value, confidence})
     - `secondary_pages_examined SMALLINT DEFAULT 0 NOT NULL`
     - `microcrawl_exhausted BOOLEAN DEFAULT FALSE NOT NULL`
     - `content_lang TEXT NULL`
     - `last_http_fetched_at TIMESTAMPTZ NULL`
2. `keyword_profiles` table:
   - id (uuid), name (unique), description, keywords TEXT[] (lowercased), created_at, updated_at, version INT
3. `scoring_profiles` table:
   - id (uuid), name (unique), description, weights JSONB (validated), created_at, updated_at, version INT
4. Link tables / campaign references:
   - `campaign_scoring_profile (campaign_id fk, scoring_profile_id fk)` (1:1 logical, enforce unique)
   - `campaign_keyword_profile (campaign_id fk, keyword_profile_id fk)` (1:many optional; initial 1:1)
5. Phase metrics ledger (optional now / later): `phase_runs` capturing phase_id, campaign_id, started_at, completed_at, duration_ms, success BOOLEAN, error TEXT NULL.

Constraints & Indices:
- GIN index on `feature_vector` (jsonb_path_ops) if future faceting required (defer until needed).
- Btree index on `(domain_score DESC NULLS LAST)` if high-volume sorting needed (add after scoring implemented).
- Btree `WHERE is_parked IS TRUE` if filtering becomes frequent (defer – measure first).

TODO (Data Model):
- [ ] Draft migration SQL files
- [ ] Run locally & regenerate model structs (oapi / sqlc if used)
- [ ] Add backward-compatible JSON tags in domain API schema
- [ ] Update OpenAPI spec with new fields & regenerate clients
- [ ] Smoke test serialization round-trip

---
## 0. Guiding Objectives (Reconciled With Existing Codebase)
1. Fix phase progression using existing `http_validation` & `analysis` services (no parallel replacement service) – eliminate "configured" stall.
2. Enhance current HTTP validation to optionally capture lightweight content signals (title, snippet, keyword hits) without breaking existing batch persistence.
3. Reuse existing `keyword_sets` / `keyword_rules` (skip introducing separate keyword profile table) – only add scoring profile construct.
4. Add per-domain feature & scoring columns (avoid duplicating large blobs in campaign JSONB) enabling fast filtering & rescore.
5. Extend current SSE / EventBus events (already emitting `http_batch_validated`) with scoring + phase failure/complete metrics.
6. Expand domain filtering with new score / parked / contact / keyword parameters.
7. Keep changes additive & backwards-compatible; minimize churn to existing handlers & models.
## 3. Phase Orchestration & State Machine Hardening
Target Phases Post-DNS:
1. `extraction` (HTTP fetch + keyword capture + parked detection + feature vector populate)
2. `analysis` (scoring + contact extraction + classification) – may partially overlap; can merge with extraction if latency-critical, but keep logical separation now.

State Machine Rules:
- Allowed transitions: `configured → running → completed|failed` (retry returns to `running` only if previously failed; never revert to configured)
| B1 | HTTP phase observed stuck (status configured) | Orchestrator not calling `httpValidationService.Execute` after configure | Trace handler → StartPhase logic → ensure Execute invoked; add log at start of Execute |  |  |
| B2 | "Already in progress" but zero progress | In-memory executions map entry created (maybe from previous run) blocks new start | Allow idempotent restart if status != in_progress; clear stale entries on failure/complete |  |  |
| B3 | HTTP requires DNS completed | `ensureDNSCompleted` returns error if phase not completed; DNS completion maybe not persisted earlier | Verify DNS phase completion row & ensure `CompletePhase` always called |  |  |
| B4 | Analysis also stalls | Same orchestration gap for `analysisService.Execute` | Mirror B1 tracing for analysis |  |  |
| B5 | Sparse metrics for phases | Only progress updates; no Prom counters/histograms | Add instrumentation wrappers |  |  |
- Start endpoint MUST: (a) idempotent if already running; (b) reject if completed unless explicit `force=true` (future).
- [ ] Add unit tests for phase transitions (table-driven)
- [ ] Explicit DB update with `WHERE status = 'configured'` returning row count; if 0 and current status = running return 409 already_in_progress
- [ ] On failure capture error text & emit SSE `phase_failed`
- [ ] Ensure CompletePhase sets `completed_at` timestamp (added if absent)
- [ ] Add structured log: `{phase, campaign, transition_from, transition_to, duration_ms}`

Risk Mitigation:
- Use transactional update for status change + enqueue event (if queue used); fallback to direct goroutine if in-process.

---
## 4. HTTP Validation / Extraction Phase (Deep Specification)
This phase reuses `internal/domain/services/http_validation.go` and augments it to provide enrichment data powering later scoring while preserving existing status/counter semantics.

### 4.1 Responsibilities
Core (always): single fetch, classify http_status (ok|error|timeout), map reason, emit progress.
Enrichment (flag `ENABLE_HTTP_ENRICHMENT`): capture snippet, keywords, structural & parked signals.
Optional (flag `ENABLE_HTTP_MICROCRAWL`): depth-1 adaptive micro-crawl for missing keywords.
Excluded: scoring & contact extraction (handled in analysis phase).

### 4.2 Flow Integration
Insertion point: after `results := httpValidator.ValidateDomainsBulk(...)` inside `executeHTTPValidation` and before bulk persistence.
If enrichment enabled: build additional per-domain enrichment objects for ok statuses, then persist in a second batched UPDATE (post existing pending->final status update) to avoid altering counter logic.

### 4.3 Data Collected (Per OK Domain)
- Truncated body (not stored in DB; ephemeral for parsing only)
- Title (already captured) + flag `title_has_keyword`
- Keyword hits (set-wise + ad-hoc) using `keywordscanner.Service`
- Basic structure counts: h1_count, internal/external link ratio
- Content length (bytes)
- Parked heuristic confidence (0..1) + boolean is_parked (>=0.75)
- Optional micro-crawl pages examined + new keywords discovered
- Primary language (fast heuristic; optional)

### 4.4 Feature Vector JSONB (example)
```
{
   "kw_hits_total": 14,
   "kw_unique": 5,
   "keyword_set_hits": {"setA": 4, "setB": 2},
   "ad_hoc_hits": ["fiber","isp"],
   "title_has_keyword": true,
   "content_bytes": 43872,
   "h1_count": 1,
   "link_internal_ratio": 0.82,
   "microcrawl_used": true,
   "microcrawl_pages": 2,
   "parked_confidence": 0.12,
   "primary_lang": "en",
   "status_code": 200,
   "fetched_at": "2025-09-12T11:22:33Z"
}
```

### 4.5 Parked Detection (MVP)
Signals: title pattern, known parking phrases, registrar/affiliate markers, content repetition ratio.
Formula: weighted average of boolean signals; threshold 0.75 => parked.

### 4.6 Adaptive Micro-Crawl
Trigger if: (kw_unique < 2) AND (content_bytes < 60000) AND (parked_confidence < 0.5) AND status 2xx.
Steps:
1. Extract internal links (same host, path depth <=2, exclude media/query heavy).
2. Rank by heuristic (contains: about, contact, product, services, company).
3. Fetch sequentially up to M (default 3) within cumulative byte budget (150KB extra).
4. Merge new keywords; update microcrawl fields; early stop if kw_unique >= threshold (e.g., 4).

#### 4.6.1 Detailed Adaptive Crawl Logic (Expanded)
This implements the earlier strategy ensuring high-yield, low-noise enrichment:

Root Pass (always):
- Fetch root; extract text, structural tokens, initial keyword/intent hits.
- Collect internal link candidates with: href, anchor text, DOM context tag (nav/main/footer/section), and path.

Link Candidate Scoring (no fetch yet):
```
link_score = (anchor_keyword_hits * w1)
           + (path_semantic_match * w2)
           + (section_weight * w3)
           + (intent_token_match * w4)
           - (noise_penalty)
```
Where:
- anchor_keyword_hits: count of keyword/ad-hoc matches in normalized anchor text.
- path_semantic_match: boolean/score if path tokens intersect telecom intent lexicon (sip, trunk, voice, routing, carrier, api, products, services, pricing, numbers, did, interconnect, termination).
- section_weight: nav/main:1.0, section/article:0.8, aside:0.5, footer:0.3.
- intent_token_match: additional bump if anchor/path contains high-intent tokens (pricing, api, carrier, sip, trunk, voice, number, did, lcr, routing).
- noise_penalty: triggers on (login, auth, privacy, terms, cookie) or media/static asset patterns.

Filtering Criteria (pre-fetch):
- Same scheme & host.
- No query string or fragment (or allow only if length < 20 chars and not tracking params).
- Path extension not in blacklist (.pdf, .jpg, .png, .gif, .svg, .zip, .exe, .doc, .xls).
- Deduplicate by normalized path (strip trailing slashes, collapse multiple slashes).

Adaptive Decision Matrix:
- If root preliminary relevance ≥ HIGH_THRESHOLD → skip micro-crawl.
- If root relevance < LOW_THRESHOLD AND max(link_score) < LINK_MIN_THRESHOLD → abandon (irrelevant).
- If root in [LOW_THRESHOLD, HIGH_THRESHOLD) AND (no contact/intent signals yet OR kw_unique < MIN_UNIQUE_THRESHOLD) → fetch top K scored links (K=2..4 bounded by budget).

Secondary Fetch Controls:
- Randomize order of selected links (stealth) but preserve scores for weighting.
- Jitter each secondary request 100–400ms.
- Abort sequence on 2 consecutive timeouts or cumulative byte > domain budget.
- Disallow redirects off-domain; if redirect occurs to different host → drop page.

Aggregation & Weighting:
- Root signals weight = 1.0; each secondary page weight = 0.75 (capped cumulative contribution).
- Track provenance: for each new keyword indicate source page (for optional debug SSE).
- If no net new unique keywords after secondary pages: set feature flag `diminishing_returns=true` in vector (telemetry for future adaptive K tuning).

Early Termination Conditions:
- Unique keyword coverage threshold met.
- Contact signals discovered with high confidence (email + phone pattern on same page).
- Budget/time soft limits exceeded (microcrawl_exhausted=true).

Caching / Dedup (future optimization):
- Maintain in-memory LRU (campaign scope) of fetched (domain,path) with timestamp.
- Skip re-fetch if fresh (< TTL e.g., 2h) unless forced.

Failure / Timeout Handling:
- On 2+ secondary timeouts: set `partial_coverage=true` and cease further fetching.
- Timeouts do not downgrade existing root relevance; they only block enrichment expansion.

Telemetry Additions:
- `microcrawl_trigger_total{reason=low_relevance|missing_intent|missing_contacts|aborted}`
- `microcrawl_pages_examined_histogram` (count per domain when triggered)
- Flag counts in feature vector for parked domains should remain unaffected (avoid micro-crawl when parked_confidence ≥ 0.75).

Safeguards Summary:
- Max requests/domain = 1 + K (K ≤ 3 default).
- Max aggregate bytes ≈ ROOT_LIMIT + MICRO_BUDGET (e.g., 350KB + 150KB).
- No recursion beyond depth 1.
- No duplicate fetch of same path within a single phase run.

Outcome: Balanced enrichment that only invests in borderline domains likely to benefit from additional context.

### 4.7 Performance & Limits
Root body cap: 350KB; per micro page cap: 60KB; total micro-crawl cap: 150KB.
Enrichment concurrency: separate worker pool size (default 6) so validation status throughput unaffected.

### 4.8 Persistence Strategy
1. Existing bulk UPDATE (status + counters) unchanged.
2. Second bulk UPDATE for enrichment columns (feature_vector, http_keywords, parked_confidence, is_parked, last_http_fetched_at).
3. Skip enrichment UPDATE if no ok domains or flag disabled.

### 4.9 Config Additions (Phase JSON)
```
{
   "enrichmentEnabled": true,
   "microCrawlEnabled": false,
   "microCrawlMaxPages": 3,
   "microCrawlByteBudget": 150000,
   "bodyByteLimit": 350000
}
```
Absent => defaults (enrichment disabled for backward compatibility).

### 4.10 Keyword Rule Handling
Fetch & compile keyword set rules once per batch (aggregate all set IDs). Use scanner's compiled structures. Count logic: for string rules use substring count (bounded), for regex use FindAll up to MAX_MATCHES_PER_RULE.

### 4.11 Error Taxonomy (Extension Only)
Additional internal classification (metrics label `detail_reason`): NON_HTML, BLOCKED (future), TLS_ERROR, PROXY_ERROR, CONNECTION_RESET, TIMEOUT.
Persist reason only as currently done (no schema change) to avoid breaking consumers.

### 4.12 Telemetry
Prom metrics:
- `http_enrichment_batches_total`
- `http_enrichment_batch_seconds` (histogram)
- `http_microcrawl_pages_total{result}` (result=completed|threshold_reached|budget_exhausted)
- `http_parked_detection_total{label}`
- `http_enrichment_dropped_total{cause}` (parse_error|no_body)

SSE:
`http_enrichment` (aggregate per batch, sample of up to 25 domains with kw counts & parked flag).

### 4.13 Failure Handling
Non-fatal enrichment failure (parse, micro-crawl) logs warn; primary HTTP status result still committed. Only catastrophic error in status bulk update can fail the phase.

### 4.14 Backward Compatibility
Flag off path identical to current behavior (no new queries, no column writes). Feature vector NULL implies legacy record.

### 4.15 TODO (Extraction / Enrichment)
- [ ] Extend validator to optionally return truncated body
- [ ] Batch keyword rule fetch + compile helper
- [ ] Feature vector builder & normalization helpers
- [ ] Parked heuristic function
- [ ] Micro-crawl link extractor + controller
- [ ] Enrichment persistence batch UPDATE
- [ ] Config parsing (phase JSON) + defaults
- [ ] Metrics counters & histograms
- [ ] SSE enrichment event emission
- [ ] Integration tests (micro-crawl trigger, parked detection)
- [ ] Backward compatibility test (flag off)
## 6. Scoring Profiles (Keyword Sets Reused)
We already have CRUD + SSE events for keyword sets (`keyword_set_created` etc.). Only add scoring profile + association.

Endpoints:
- POST /scoring-profiles
- GET /scoring-profiles/:id
- LIST /scoring-profiles
- PATCH /campaigns/{id}/scoring-profile

Validation:
- Weights JSON keys subset of allowed feature weight names
- Each weight 0..1

TODO (Scoring Profiles):
- [ ] OpenAPI spec additions
- [ ] Store + service + handler
- [ ] Authz (campaign ownership)
- [ ] E2E: create profile → associate → run analysis → scores present
## 5. Scoring & Analysis Phase
### Profiles
- [ ] Scoring profile CRUD
- [ ] Campaign scoring association endpoint
- Parked signals
### Filtering / API
- [ ] New query params (minScore, keyword, hasContact, notParked, sort)
- [ ] Sorting by score
- [ ] Tests for composite filters
```json
{
  "keyword_density_weight": 0.35,
  "unique_keyword_coverage_weight": 0.25,
  "non_parked_weight": 0.10,
  "content_length_quality_weight": 0.10,
  "title_keyword_weight": 0.05,
  "contact_presence_weight": 0.10,
  "freshness_weight": 0.05
}
```
Computation Steps:
1. Normalize each feature → 0..1 component scores
2. Multiply by weights & sum → `relevance_score`
3. Apply penalty if low confidence parked → reduce by factor (configurable)
4. Derive `domain_score` (alias initially relevance_score)
5. Persist relevance_score + domain_score
6. Emit SSE `domain_scored` (batch or aggregated) & metrics histogram update

Rescore Endpoint:
- Accept campaign_id & scoring_profile_id (optional override) → recompute in batches using existing feature_vector (no refetch) → update rows + emit summary event.

TODO (Scoring):
- [ ] Define weight schema validation (min/max, sum not required)
- [ ] Implement feature normalization helpers
- [ ] Implement scoring engine
- [ ] Add CLI / admin endpoint to trigger rescore
- [ ] SSE event for rescore summary
- [ ] Unit tests (happy path, parked penalty, missing feature fallback)

---
## 6. Keyword & Scoring Profiles (CRUD + Association)
Endpoints (initial):
- POST /keyword-profiles
- GET /keyword-profiles/:id
- LIST /keyword-profiles
- POST /scoring-profiles
- GET /scoring-profiles/:id
- LIST /scoring-profiles
- PUT (optional later) for version bump
- PATCH association: /campaigns/{id}/keyword-profile, /campaigns/{id}/scoring-profile

Validation:
- Keywords deduplicated & lowercased
- Weights keys recognized by schema; unknown keys rejected

TODO (Profiles):
- [ ] OpenAPI spec additions
- [ ] Handlers + store methods
- [ ] Basic authz (same as campaign owner semantics)
- [ ] E2E test: create → associate → run extraction → scoring uses correct profile

---
## 7. Metrics & Observability
Prometheus Metrics:
- Phase durations: `campaign_phase_duration_ms{phase}` (histogram)
- Domains processed per phase: `campaign_phase_domains_total{phase,status}`
- HTTP fetch outcome: `http_fetch_result_total{reason}`
- Bytes fetched histogram: `http_fetch_bytes{depth}`
- Micro-crawl decisions: `microcrawl_trigger_total{reason}` (e.g., low_keyword_coverage)
- Scoring distribution: `domain_relevance_score_bucket` (histogram)
- Parked detection outcomes: `parked_detection_total{label}`
- Rescore operations: `rescore_runs_total{profile}`

SSE Events (incremental additions):
- `phase_started`, `phase_completed`, `phase_failed`
- `domain_http_fetched` (optional aggregated every N=25)
- `domain_scored`
- `rescore_completed`

Logging:
- Structured logs enriched with `campaign`, `phase`, `domain`, `attempt`.

TODO (Metrics/Observability):
- [ ] Add metrics registry wiring (if not present) for new counters
- [ ] Instrument extraction loops
- [ ] Instrument scoring engine
- [ ] Emit new SSE events (schema version bump in docs)
- [ ] Update `SSE_EVENTS.md`

---
## 8. Filtering & API Enhancements
Add Query Parameters to Domain List:
- `minScore` (domain_score >=)
- `keyword` (keyword hit stored? implement via precomputed keyword list in feature_vector)
- `hasContact=true` (contacts not null / length > 0)
- `notParked=true` (is_parked IS DISTINCT FROM TRUE)
- `sort=score_desc|score_asc|last_http_fetched_at_desc`

Implementation:
- Extend SQL builder with optional WHERE clauses + ORDER BY (indices after perf test)

TODO (Filtering):
- [ ] OpenAPI param additions
- [ ] Store query adjustments (compose conditions) + unit tests
- [ ] Frontend client regen (if applicable)

---
## 9. Testing Strategy
Test Layers:
1. Unit: phase state transitions; scoring normalization; parked heuristic classification; keyword extraction edge cases (empty content, huge content truncated)
2. Integration: end-to-end extraction + scoring with in-memory HTTP fixtures (serve controlled HTML)
3. Migration smoke: run migrations on clean DB & rollback dry-run
4. Load (later): simulate N domains to validate concurrency + metrics correctness

TODO (Testing):
- [ ] Add lightweight HTML fixture server in tests
- [ ] Write extraction test with adaptive micro-crawl triggered
- [ ] Write scoring profile swap & rescore integration test
- [ ] Add regression test for “configured” stall (simulate StartPhase twice)

---
## 10. Performance & Concurrency Controls
Defaults:
- HTTP concurrency: 5–10 (configurable)
- Per-domain total byte budget: 500KB (root + micro-crawl pages)
- Per-request timeout: 6s
- Backoff / jitter: ±750ms between fetches per worker

TODO (Performance):
- [ ] Implement worker pool with bounded concurrency
- [ ] Config struct w/ sane defaults & env overrides
- [ ] Metrics to observe saturation

---
## 11. Rollout Plan
1. Ship migrations (no code using new columns yet) – safe.
2. Deploy phase orchestration fixes (observable via logs & metrics).
3. Release HTTP extraction (feature gated by env flag `ENABLE_HTTP_EXTRACTION` initially).
4. Observe metrics (low volume campaign) – ensure no stalls.
5. Enable scoring phase (flag `ENABLE_SCORING`).
6. Turn on filtering features & UI exposure.
7. Remove feature flags after stability period.

Rollback: Each step reversible by disabling feature flag / ignoring columns; no destructive migrations.

---
## 12. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Extraction infinite loop / stall | Resource waste | Hard depth + page count + byte caps |
| Over-fetch causing detection | Block / blacklist | Jitter, low concurrency, single pass + optional bounded micro-crawl |
| Scoring drift (weight changes) | Inconsistent UX | Versioned scoring profiles + rescore endpoint |
| Large feature_vector growth | Storage bloat | Store only derived metrics, not raw HTML |
| Phase race conditions | Inconsistent statuses | Transactional status updates & tests |
| Parked false positives | Lost good domains | Confidence-based penalty not hard filter |

---
## 13. Documentation Updates
- `SSE_EVENTS.md`: add new events
- `architecture.md`: update pipeline diagram
- `README.md`: brief section on scoring & profiles
- `API docs`: OpenAPI spec regenerated with new resources & fields

TODO (Docs):
- [ ] Update SSE doc
- [ ] Add architecture diagram segment (ASCII or link)
- [ ] Document scoring formula & normalization

---
## 14. Execution Sequence (High-Level Checklist)
Order of Implementation:
1. [ ] Blocker validation & fix (B1–B3)
2. [ ] Phase orchestration hardening tests
3. [ ] Data model migrations (columns + profiles tables)
4. [ ] OpenAPI updates (columns + profile endpoints)
5. [ ] Profile CRUD (keyword, scoring)
6. [ ] HTTP extraction engine (root fetch)
7. [ ] Parked heuristic + feature_vector population
8. [ ] Adaptive micro-crawl controller
9. [ ] Metrics instrumentation (extraction)
10. [ ] Scoring engine + analysis phase implementation
11. [ ] Rescore endpoint + SSE events
12. [ ] Domain list filtering extensions
13. [ ] Comprehensive tests (unit + integration)
14. [ ] Docs & diagrams
15. [ ] Feature flag rollout & staging validation
16. [ ] Production enablement & post-deploy monitoring

---
## 15. Detailed TODO Matrix (Trackable)
(Leave UNCHECKED until merged & verified)

### Blockers
- [ ] B1 fixed & verified
- [ ] B2 fixed & verified
- [ ] B3 confirmed (either removed or documented)

### Migrations
- [ ] Columns migration applied
- [ ] Profiles tables migration applied
- [ ] phase_runs table (optional) decided & implemented / deferred

### Orchestration
- [ ] Status transition tests
- [ ] Idempotent StartPhase logic
- [ ] Failure path & SSE

### Extraction
- [ ] Fetcher core
- [ ] Content parser
- [ ] Keyword hit extractor
- [ ] Parked heuristic
- [ ] Micro-crawl
- [ ] Persistence batch
- [ ] Error taxonomy

### Scoring / Analysis
- [ ] Normalization helpers
- [ ] Engine weights validation
- [ ] Score persistence
- [ ] Rescore endpoint
- [ ] SSE events

### Profiles
- [ ] Keyword profile CRUD
- [ ] Scoring profile CRUD
- [ ] Campaign association endpoints

### Filtering / API
- [ ] New query params implemented
- [ ] Sorting by score
- [ ] Tests for composite filters

### Metrics & Observability
- [ ] Prometheus counters/histograms wired
- [ ] SSE events documented & emitted
- [ ] Logs enriched

### Tests
- [ ] Extraction integration test
- [ ] Scoring edge cases
- [ ] Rescore test
- [ ] Phase stall regression test

### Docs
- [ ] SSE_EVENTS.md updated
- [ ] architecture.md updated
- [ ] README scoring section

### Rollout
- [ ] Feature flags added
- [ ] Staging validation script updated
- [ ] Post-deploy metrics reviewed

---
## 16. Open Questions (Track & Resolve Early)
- Do we need per-campaign override of micro-crawl limits? (Default global; escalate later.)
- Contact extraction scope (emails only vs. phone + forms) initial MVP? (Likely emails + phone regex.)
- Should scoring incorporate external enrichment later (WHOIS age)? (Design extensibility in feature_vector.)

---
## 17. Success Criteria
- Extraction phase reliably transitions `configured → running → completed` on real campaigns.
- 95%+ of eligible domains processed without manual intervention (remaining are error-classified with reason).
- Scoring & filtering enable narrowing to top X% high-value domains with meaningful variance in scores.
- Rescore endpoint completes within acceptable time (TBD: < 2m for 50k domains) without refetch.
- Metrics dashboards reflect throughput, error rates, and score distribution.

---
## 18. Next Immediate Action
Begin with Blocker Validation Task (Section 1) to unblock execution before layering new functionality.

---
(End of Plan)
