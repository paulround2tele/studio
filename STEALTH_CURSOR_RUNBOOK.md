# Stealth Cursor Runbook

Status: Cursor-only (legacy fallback removed)
Owners: Platform / Pipeline Team
SLOs:
- Success: 99.9% of domain collection attempts without error
- Latency p95: <250ms (<=10K domains), <2s (<=500K domains)
- Pages p95: <50

## 1. Architecture Summary
The stealth integration now uses ONLY cursor-based pagination via `CampaignStore.GetGeneratedDomainsWithCursor`. Legacy offset pagination has been removed. Failures surface immediately and emit a `QueryPerformanceMetric` row with `query_type="stealth_cursor_error"` and `query_plan="error_no_fallback"`.

Core flow:
1. `RandomizeDomainsForValidation` calls `collectDomainsWithCursor` (loop following `PageInfo.EndCursor`).
2. Accumulates domain names; optional filtering (`ValidationStatus=DNSStatusOK` for `http_keyword_validation`).
3. On success: emits `stealth_cursor_collection` metric (pages info in plan string) then shuffle strategies.
4. On error: returns error; caller should propagate / stop phase.

## 2. Key Files
- `backend/internal/domain/services/infra/stealth_real.go`
- `backend/internal/domain/services/infra/stealth_toggle.go`
- Observability docs: `stealth_cursor_observability.md`, `STEALTH_PAGINATION_MIGRATION.md`

## 3. Deployment / Rollout Procedure
Cursor-only is already deployed. If introducing significant changes (e.g., page size, shuffle tweaks):
1. Staging: Deploy change; run spot check script `scripts/stealth_cursor_spotcheck.sh`.
2. Verify: No `stealth_cursor_error` metrics and pages distribution stable.
3. Canary (Prod subset or single instance): Monitor 30–60 minutes.
4. Full Prod rollout.
5. Annotate dashboards with deployment timestamp.

## 4. Monitoring Checklist (Every Shift / After Deploy)
- Errors: `increase(query_performance_total{query_type="stealth_cursor_error"}[5m]) == 0`
- Success Rate: > 99.9% (derived)
- p95 Pages: < threshold (target <50)
- p95 Latency: within SLO tiers
- Outliers: Inspect campaigns with unusually high page counts (>80)

## 5. Troubleshooting Guide
| Symptom | Likely Cause | Action Steps |
|---------|-------------|--------------|
| Sudden spike in `stealth_cursor_error` | DB connectivity, malformed cursor generation, schema change | Check DB health; run EXPLAIN for base query; inspect latest deployment diff |
| Pages p95 jumps >80 | Missing / dropped index, changed ordering | Run EXPLAIN ANALYZE; confirm index usage; create or reindex as needed |
| Latency p95 regression | Increased page size, DB load, network | Correlate with DB metrics (IO, locks); consider reducing page size |
| Uneven domain distribution | Data skew in ordering column | Evaluate alternative ordering key or composite index |

## 6. Immediate Triage Steps for Errors
1. Grab sample error log lines (grep for `StealthReal: cursor ERROR`).
2. Query last 15m metrics rows:
   - (SQL) `SELECT query_type, execution_time_ms, query_plan, executed_at FROM query_performance_metrics WHERE query_type IN ('stealth_cursor_error') ORDER BY executed_at DESC LIMIT 50;`
3. Run manual cursor query (simulate first page) in psql to validate it returns rows.
4. If reproducible locally with same campaign: run `EXPLAIN (ANALYZE, BUFFERS)`.
5. Identify root cause category (connectivity vs logic vs schema) and page appropriate on-call (DBA if DB-level).

## 7. Rollback Strategy (Last Resort)
Fallback code has been removed; reintroduction requires a hotfix branch re-adding offset path – strongly discouraged.
Instead:
- If cursor query broken by schema change: hotfix schema or query predicate.
- If performance meltdown: temporarily throttle campaign generation or reduce page size constant.
- If persistent errors and no quick fix: feature flag `enableStealth` can be disabled (stealth becomes noop) while issue investigated.

## 8. Spot Check Procedure
Run: `scripts/stealth_cursor_spotcheck.sh <campaign_id> <pages>`
Verifies duplicate-free pages and continuity. If failures:
- Dump offending page JSON.
- Inspect ordering column; check for non-deterministic ordering if ties.

## 9. Index & Query Expectations
Expected index usage (example; finalize in index review task):
- Composite or single index on `(campaign_id, domain_name)` supporting ordered pagination.
Query plan should show Index Scan with ascending order on `domain_name` (or chosen cursor key). Sequential scan is a red flag for large campaigns.

## 10. Runbook Validation
- Last updated: (fill date on commit)
- Verified by: (engineer)
- Dry-run resilience: Simulate nil store in unit tests → error path functioning.

## 11. Future Deletions / Simplifications
- Remove `enableStealthForceCursor` flag (pending decision) and inline cursor enforcement.
- Consider exporting explicit Prometheus counters instead of relying on persisted DB metrics.

## 12. Contacts
- Primary: Platform Stealth Owner (update name/email)
- Secondary: DB Operations
- Slack Channel: #pipeline-stealth

---
This runbook lives alongside observability docs; keep them in sync on each deployment affecting cursor logic.
