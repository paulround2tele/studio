# Post-DNS Pipeline Remediation & Completion Plan
Generated: 2025-09-13
Source Inputs: `POST_DNS_PIPELINE_FULL_AUDIT.md` (gap analysis), original `POST_DNS_PIPELINE_PLAN.md`.
Goal: Close all MISSING / PARTIAL / DRIFT gaps to production-ready state with observable, test-backed, feature-flagged rollout.

Legend: P0 (critical path) · P1 (core) · P2 (nice-to-have/optimize)  
Status placeholders: ☐ todo · ◐ in-progress · ✔ done

---
## Phase Overview
| Phase | Objective | Exit Criteria | Key Risks |
|-------|-----------|---------------|-----------|
| Phase 1 Metrics Foundation | Establish observability parity with plan | ✔ Core counters + histograms exposed; metric names/aliases stable | Metric churn; cardinality blow-up |
| Phase 2 Filtering Enablement | Unlock value of scores via domain list filtering | ✔ Store filters + indices + handler (typed params), feature flag, pageInfo schema | Query perf degradation |
| Phase 3 Scoring Enhancements | Enriched scoring outputs + configurable penalties | domain_scored enriched payload; parked penalty configurable | Score drift unnoticed |
| Phase 4 Feature Vector Completion | Add structural + language signals | h1_count, link_internal_ratio, primary_lang present & tested | Parser perf hit |
| Phase 5 Testing & Hardening | Cover critical logic & regression flows | All high-value tests green; coverage improved (qualitative) | Flaky integration tests |
| Phase 6 Documentation & Flags | Clear usage, ops playbooks, proper flag gating | README, SSE doc, flags ENABLE_HTTP_EXTRACTION + ENABLE_SCORING functional | Out-of-date docs at release |
| Phase 7 Rollout & Ops Readiness | Safe staged enablement & monitoring | Staging validation + post-deploy metrics review logged | Silent prod regression |
| Phase 8 Optimization & Nice-to-Haves | Deferred improvements (indices, load tests) | Indexed queries if needed; load test baseline | Premature optimization |

Sequence constraint: Each phase may begin once prior exit criteria met (Phase 2 requires at least score persistence + Phase 1 metrics to observe impact, etc.). Parallel allowed: limited doc drafting while Phase 2 in progress.

---
## Phase 1: Metrics Foundation (P0) ✔ DONE
Scope: Implement missing planned metrics + alias for drift; minimal instrumentation footprint first.
Tasks:
1. Introduce alias counters:
   - `http_fetch_result_total{status=ok|error|timeout}` referencing current increments (keep existing `http_validation_fetch_outcomes_total` for deprecation window).
2. Replace micro-crawl trigger counter with `microcrawl_trigger_total{reason}` (reasons: low_keyword_coverage, budget_exhausted, abandoned, threshold_met) + maintain old counter until removal.
3. Add histograms:
   - `http_enrichment_batch_seconds` (batch duration)
   - `http_microcrawl_pages_total{result}` (CounterVec) OR histogram pages_examined
   - `domain_relevance_score_bucket` (score distribution)
4. Add counters:
   - `parked_detection_total{label=parked|not_parked}`
   - `rescore_runs_total{profile}`
   - `http_enrichment_dropped_total{cause}` (parse_error|no_body)
5. Instrument extraction loop timings + micro-crawl result classification.
6. Add phase duration histogram `campaign_phase_duration_ms{phase}` (wrap phase start/complete timestamps).
7. Update SSE event emission to include metric correlation IDs (optional P1 if trivial).
8. Update `SSE_EVENTS.md` & comment metric HELP strings with planned deprecation.
Acceptance (met):
- All metric names emitted (metrics snapshot captured in tracker).
- No cardinality explosion (label sets bounded as planned).
- Old counters still increment for transition window.

---
## Phase 2: Filtering Enablement (P0) ✔ DONE
Scope: Hybrid endpoint preserving legacy offset listing while enabling advanced filtered, score-centric, cursor-based listing under a feature flag.
Delivered:
1. Store filter struct extended (minScore, keyword, hasContact, notParked, scoreNotNull, new sorts domain_score / last_http_fetched_at).
2. Query builder updated (keyset pagination, predicates & NULLS LAST ordering) with index-aligned conditions.
3. Index migrations applied: (campaign_id, domain_score DESC), (campaign_id, last_http_fetched_at DESC).
4. OpenAPI spec extended (minScore, notParked, hasContact, keyword, sort enum, first, after) + `PageInfo` schema (startCursor, endCursor, hasNextPage, sortBy, sortOrder, first).
5. Handler refactored to use typed params (no raw query hack), constructs cursor filter, falls back automatically to legacy offset path when no advanced params.
6. Feature flag `ENABLE_ADVANCED_FILTERS` guards advanced path for instant rollback.
7. Response now includes `pageInfo` only in advanced mode (legacy shape unchanged).
8. Build verified (go build ./...) with no new errors; placeholder file added to fix empty source edge case.

Outstanding (moved to Phase 5 & 6 tasks):
- Predicate & pagination unit + integration tests (cursor continuity, multi-filter combinations, legacy regression).
- Documentation examples (README) and tracker evidence (EXPLAIN output) to be captured during testing/hardening.

Acceptance (met for implementation scope):
- Advanced params switch to cursor path and return consistent `hasNextPage` + cursors.
- Legacy clients unaffected when feature flag off or no advanced params provided.
- All predicates parameterized; no dynamic SQL.

---
## Phase 3: Scoring Enhancements (P1)
Scope: Improve scoring transparency & configurability.
Tasks:
1. Extend scoring profile schema: add `parked_penalty_factor` (0..1) default 0.5.
2. Enrich `domain_scored` SSE payload: include components map {density, coverage, non_parked, content_length, title_keyword, freshness}.
3. Add rescore progress SSE events every N (e.g., 500 domains) with counts & estimated remaining.
4. Add `rescore_runs_total{profile}` increment at start & success; failure label `result=failed`.
5. Add validation to ensure weights keys subset & penalty factor in range.
6. Add unit tests: parked penalty variation & component emission integrity.
Acceptance:
- SSE sample shows components.
- Penalty factor changes reflected in new scores with test verifying delta.

---
## Phase 4: Feature Vector Completion (P1)
Scope: Add missing structural & language signals.
Tasks:
1. Extend extraction parser to capture h1_count, internal vs external link counts; compute link_internal_ratio.
2. Integrate lightweight language detection heuristic (character trigram + fallback) -> primary_lang.
3. Add diminishing_returns & partial_coverage flags (micro-crawl outcomes) to feature vector.
4. Persist new keys additively; no migration (JSONB only).
5. Update scoring to optionally use structural metrics (future; keep feature parity now).
6. Update tests: one fixture with multiple H1s, link mix, non-English sample.
Acceptance:
- Feature vector includes new keys for >80% of enriched domains in fixture.
- Performance impact <10% added latency (measured locally with sample 1k domains—document measurement).

---
## Phase 5: Testing & Hardening (P0/P1)
Scope: Cover gaps ensuring regression safety before full rollout.
Tasks:
1. Parked heuristic edge cases test (false positives baseline).
2. Micro-crawl trigger test (forces low keyword coverage path).
3. Rescore end-to-end test (profile weight change).
4. Filtering composite tests (minScore + notParked + keyword).
5. Phase stall regression test (already partial—add explicit configured→running assertion).
6. Migration smoke test script (apply + rollback in temp DB).
7. Optional load test harness (P2) for micro-crawl saturation under concurrency.
Acceptance:
- All new tests pass in CI.
- Failure cases produce actionable log lines.

---
## Phase 6: Documentation & Flags (P1)
Scope: Surface operational behaviors & enable safe toggling.
Tasks:
1. Add missing flags: ENABLE_HTTP_EXTRACTION, ENABLE_SCORING (wrap existing code paths).
2. Update `README.md` with scoring overview & filtering examples.
3. Update `SSE_EVENTS.md` (add http_enrichment, domain_scored enriched schema, rescore_progress).
4. Architecture diagram snippet showing post-DNS flow with enrichment & scoring.
5. Feature flags table (purpose, default, rollback action).
6. Add CHANGELOG entries referencing metric alias deprecations.
Acceptance:
- Docs PR diff shows all additions.
- Flags OFF path validated (unit/integration) yields legacy minimal behavior.

---
## Phase 7: Rollout & Ops Readiness (P1)
Scope: Deploy safely & validate production readiness.
Tasks:
1. Staging dry run script: run extraction + scoring + filtering; capture metrics snapshot & SSE event sample.
2. Weight tuning playbook (how to adjust profile & rescore).
3. Post-deploy monitoring checklist (error rates, phase durations, fetch outcome ratios).
4. Flag enable sequence documented with hold points.
5. Record final metrics baseline (scores distribution percentiles) for drift tracking.
Acceptance:
- Runbook & baseline artifacts added to `docs/rollout/`.
- Stakeholder sign-off recorded in README or changelog.

---
## Phase 8: Optimization & Nice-to-Haves (P2)
Scope: Deferred improvement tasks.
Tasks:
1. Add indexing if query latency > target (profiling driven).
2. Introduce cache for keyword set rule compilation.
3. Add language-specific scoring adjustments (optional).
4. Load/perf test harness automation (k6 or Go bench) for 50k domain campaigns.
5. Remove deprecated metric names after one release cycle.
Acceptance:
- Perf report documenting improvement deltas vs baseline.

---
## Cross-Cutting Implementation Conventions
- Metrics registration guarded by sync.Once per metric group.
- Feature flags evaluated once per phase execution context and passed as booleans.
- SSE progress events rate-limited (≥500ms between sends) to reduce frontend storm.
- JSON payload additions backward-compatible (only additive fields).
- Tests use deterministic HTML fixtures stored under `tests/fixtures/http/`.

## Risk Mitigation Matrix
Risk | Phase | Mitigation
-----|-------|----------
Metric Cardinality | 1 | Predefined small label sets; unit test ensures allowed values.
Score Drift | 3 | Snapshot previous distribution; compare post-change.
Parser Perf Regression | 4 | Benchmark extraction on sample; threshold guard in CI.
Rollout Misconfig | 7 | Flag checklist + rollback doc.
Test Flakiness | 5 | Deterministic fixtures; retries limited to ≤1.

## Tracking & Governance
- Each phase produces an evidence artifact directory: `docs/evidence/phaseN/` with metrics snapshot, sample SSE, test summary.
- Update `POST_DNS_PIPELINE_EXECUTION_TRACKER.md` after each phase exit.
- Weekly review: confirm no new DRIFT; adjust backlog.

## Immediate Next Step
Begin Phase 5 selected test coverage: add filtering + cursor pagination tests; capture baseline EXPLAIN for performance note; then proceed to Phase 6 docs/flags consolidation.

(End Remediation Plan)
