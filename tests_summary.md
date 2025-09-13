## Phase 5 Test & Hardening Summary

Date: 2025-09-13

### Scope
Added focused tests and benchmarks to harden HTTP validation, scoring, filtering, migrations, and transparency (SSE + structural signals).

### New / Updated Tests

1. parked_heuristic_test.go
   - Validates multi-signal vs weak single-signal parked detection with lowered threshold (0.30) and broader "coming soon" logic.
2. scoring_penalty_test.go & scoring_penalty_ordering_test.go
   - Ensures parked penalty factor reduces relevance and reorders domains appropriately (rounded score expectations verified).
3. composite_filter_pagination_test.go (postgres)
   - Verifies composite filters (minScore, NotParked, Keyword kw_unique>0, HasContact kw_contact>0) plus cursor trimming & HasNextPage.
4. microcrawl_test.go
   - Guards current stub semantics, cancellation resilience, and future guard (Skip if implemented) for microcrawl feature.
5. feature_vector_structural_test.go
   - Structural parsing metrics (H1, internal/external links, ratio) and multi-language heuristic detection; added large-page benchmark.
6. http_phase_stall_test.go
   - Regression ensuring Cancel transitions in-progress execution to Failed without panics (added nil logger guard in Cancel).
7. migration_053_smoke_test.go
   - Smoke proof for presence of `parked_penalty_factor` column (SELECT probe via sqlmock).
8. scoring_sse_test.go
   - Captures SSE events verifying `domain_scored` includes structural markers (h1_count, link_internal_ratio, primary_lang) inside components map and that progress events share correlationId.
9. phase5_scaffolding_test.go
   - Retained as legacy scaffold (skipped tests) to document originally planned coverage; superseded by concrete implementations above.

### Benchmarks

Structural parsing benchmarks (representative run):

| Benchmark | ns/op | allocs/op | B/op | Throughput |
|-----------|-------|-----------|------|------------|
| BenchmarkParseStructuralSignals | ~359,698 | 144 | 26,121 | small page |
| BenchmarkParseStructuralSignals_Large | ~4,015,388 | 3,573 | 498,133 | ~41.56 MB/s |

Observations:
- Large page scales roughly 11x time for ~100KB synthetic HTML (acceptable for low-frequency enrichment path).
- Allocation profile dominated by html parser; no custom heap hotspots introduced.

### Key Hardening Changes
- Extracted realParkedHeuristic; lowered threshold and expanded signal set for balanced recall.
- Introduced English bias rule to mitigate false FR classification in structural language detection.
- Added nil-safe logger guard in `Cancel` to prevent panic in minimal test harness contexts.
- Enriched SSE `domain_scored` events with structural transparency markers (placeholders for now) and correlation integrity checks.
- Added migration smoke test to surface schema drift early in CI.

### Remaining / Deferred
- Full integration migration up/down execution (covered by existing migration_verifier command, not duplicated here).
- Detailed numeric SSE component emission (placeholder strings retained for privacy/perf) — future enhancement.
- Microcrawl full behavior tests pending actual implementation.

### Coverage Mapping
- Parked Heuristic: Tests 1, 2 (penalty), SSE marker (structural transparency not parked-specific but related to scoring clarity).
- Scoring Penalty Application: Tests 2 & ordering variant.
- Composite Filtering & Pagination: Test 3.
- Phase Stall / Cancellation Robustness: Test 6.
- Migration Schema Presence: Test 7.
- SSE Structural Transparency: Test 8.
- Performance Regression Guard: Benchmarks in Test 5.

### Suggested Follow-Ups
1. Promote structural markers from placeholders to real feature vector extraction in scoring sample payload (behind a feature flag).
2. Add end-to-end rescore with modified scoring profile (weights + penalty factor) verifying delta impact.
3. Expand language detection to a probabilistic model (CLD3 / fastText) iff performance budget allows.
4. Implement microcrawl and convert existing guard tests into functional coverage.

---
Generated as part of Phase 5 completion artifacts.

### Phase 6 & 7 Additions
- ENABLE_SSE_FULL_COMPONENTS flag emitting full component numeric scores in domain_scored sample.
- ENABLE_TF_LITE experimental term-frequency component with weight `tf_lite_weight`.
- ScoreBreakdown method for per-domain transparency (non-persistent recomputation).
- TF-lite + ScoreBreakdown tests (score_breakdown_test.go).
- Full components SSE test (scoring_sse_full_components_test.go) and structural flag no-extra-query test.
- Scoring synthetic benchmark (scoring_bench_test.go) for baseline performance.
- Microcrawl benchmark (microcrawl_bench_test.go) for secondary fetch performance.

### Post-Phase-5 Enhancements (Implemented)

Implemented items from Suggested Follow-Ups (2025-09-13 continuation):
1. Structural markers now emit numeric values (h1_count, link_internal_ratio, primary_lang) when ENABLE_SSE_STRUCTURAL_DETAILS flag enabled.
2. Rescore delta test (`rescore_delta_test.go`) exercises two scoring runs with different weight vectors ensuring dynamic recalculation path.
3. Advanced language detection integrated (whatlanggo) behind ENABLE_ADVANCED_LANG_DETECT; blends confidence with ASCII heuristic.
4. Microcrawl implemented with budgeted secondary fetch (ENABLE_HTTP_MICROCRAWL); functional tests added replacing stub guards.

Documentation updated in `backend/SSE_EVENTS.md` to describe new flags and payload changes.
