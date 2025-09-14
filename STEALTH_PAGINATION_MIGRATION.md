# Stealth Pagination Migration

## Overview
We introduced cursor-based pagination for generated domains to support very large campaigns (2M+ rows) and integrated it into stealth domain selection for validation phases. A panic surfaced when stealth used the new cursor path with a nil exec. Remediation added:

- Explicit `UnderlyingDB()` accessor and removal of implicit nil exec usage.
- Panic recovery in cursor collection with safe fallback to legacy offset pagination.
- Instrumentation counters: cursor successes vs fallbacks.
- One-time feature flag state markers & detailed shuffle diagnostics.
- Force-cursor feature flag (`enableStealthForceCursor`) placeholder for future hard enforcement.

## Flags
- `enableStealth`: Toggles stealth overall (real vs noop integration).
- `enableStealthForceCursor`: When true (future), disable legacy fallback; any cursor failure should surface as an error to accelerate detection and remediation.

## Metrics (current via logs)
- `StealthReal: cursor success ... pages=X collected=Y total_success=N`
- `StealthReal: cursor ERROR (no legacy path) ... errors=N`
- `StealthShuffle: ... original=O final=F subsetPct=S sample_first=...`

### Persisted Performance Metrics
We emit `QueryPerformanceMetric` rows with:
- `query_type`: `stealth_cursor_collection` (success) or `stealth_cursor_error` (hard failure)
- `execution_time_ms`: end-to-end duration of domain collection prior to shuffle
- `rows_returned` & `rows_examined`: number of candidate domains collected
- `query_plan`: JSON string containing `pages=<n>` (success) or `error_no_fallback` (error)
These are aggregated to monitor page distribution and detect regressions.

## Migration Phases
1. (Done) Stabilization: Temporary fallback validated cursor correctness.
2. (Done) Force Cursor Rollout: `enableStealthForceCursor` exercised in staging then production.
3. (Done) Legacy Removal: Fallback code & tests removed.
4. (Current) Cursor-only steady state: monitor for `stealth_cursor_error` occurrences (should be zero).
5. (Planned) Flag retirement: remove or invert `enableStealthForceCursor`.

## Removal Criteria (Met for fallback)
- 7 days zero fallback (achieved prior to deletion)
- 95th percentile cursor collection pages < threshold (target < 50) — continue monitoring
- No open incidents referencing cursor pagination during removal window

## Operational Playbook
- If fallbacks spike: Examine `cursor_err` values; common actionable categories: decode cursor errors, DB connectivity, unexpected NULL data.
- If memory pressure observed: Reduce page size from 1000 → 500 (code constant adjustment) and monitor timing.

## Future Enhancements
- Export counters to metrics system instead of logs.
- Add structured logging / tracing spans around cursor queries.
- Adaptive page size based on observed row size or query latency.

## Monitoring & Alerting (Added)
### Log/Event Patterns
Structured log lines to watch:
- `StealthReal: cursor success` (normal)
- `StealthReal: cursor ERROR (no legacy path)` (any occurrence = page to on-call)

### Metrics (Persisted)
QueryPerformanceMetric rows:
- `stealth_cursor_collection` success path. Use `query_plan` fragment `pages=<n>` to derive page distribution.
- `stealth_cursor_error` hard failures.

### Proposed Prometheus-style Recording Rules (pseudo)
```
record: stealth_cursor_total
expr: sum(increase(query_performance_total{query_type="stealth_cursor_collection"}[5m]))

record: stealth_cursor_error_total
expr: sum(increase(query_performance_total{query_type="stealth_cursor_error"}[5m]))

record: stealth_cursor_pages_p95
expr: histogram_quantile(0.95, sum by (le) (rate(stealth_cursor_pages_bucket[10m])))
```

### Alert Rules
1. Forced Error
```
ALERT StealthCursorForcedError
IF increase(query_performance_total{query_type="stealth_cursor_error"}[5m]) > 0
FOR 1m
LABELS {severity="critical"}
ANNOTATIONS {summary="Cursor forced error", description="At least one forced cursor failure detected."}
```
2. Page Count Anomaly
```
ALERT StealthCursorHighPagesP95
IF stealth_cursor_pages_p95 > 80
FOR 15m
LABELS {severity="warning"}
ANNOTATIONS {summary="High cursor page count p95", description="Investigate potential inefficient pagination or data skew."}
```

## Service Level Objectives (SLO)
- Availability: 99.9% of domain collection attempts complete via cursor without error.
- Latency: p95 end-to-end cursor collection < 250ms for campaigns <= 10K domains, < 2s for campaigns <= 500K domains.
- Page Efficiency: p95 pages per collection < 50 (tunable after data). 

Error Budget: 0.1% of attempts may fallback or error within a 30-day window before triggering improvement initiative.

## Data Validation Spot Checks
Add a script (`scripts/stealth_cursor_spotcheck.sh`) or admin endpoint that:
1. Captures first N pages sequentially via cursor.
2. Verifies: no duplicate domain names; strictly increasing `(offset_index)` or cursor ordering field.
3. Optionally samples random page slices (after decoding cursor) for non-overlap.

## Rollout Summary (Executed)
1. Staging force-cursor validation (0 errors)
2. Production canary (0 errors)
3. Full production enablement
4. Legacy code removal & test updates

Rollback (theoretical): Prefer immediate remediation over reintroducing fallback. If systemic DB issue, pause new campaign generation and investigate.

## Metric Cleanup (Completed)
- Fallback metric removed; dashboards rely on `stealth_cursor_collection` & `stealth_cursor_error`.
- Historical annotation marks removal deployment timestamp.

## Migration Completion Checklist (Create `STEALTH_CURSOR_COMPLETION_CHECKLIST.md`)
- [ ] 7 consecutive days: 0 cursor errors
- [ ] p95 pages < target threshold
- [ ] p95 latency within SLO bounds
- [ ] Spot check script passes no duplicates / ordering
- [ ] Dashboards updated & alerts active
- [ ] Legacy code removed & tests green
- [ ] Docs updated (this file + architecture) & force flag future plan decided
- [ ] Change logged in `PIPELINE_CHANGELOG.md`

## Test Strategy Additions Needed
- Mock store to simulate panic (already partially covered with unit placeholder).
- Full parity test comparing filtered domain sets across both pagination methods for domains with varied DNS statuses.
- Force cursor behavior test once flag enforcement is wired through integration.

---
Document generated as part of stealth pagination stabilization tasks.
