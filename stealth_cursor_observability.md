# Stealth Cursor Observability & SLOs

## SLOs
| Dimension | SLO | Notes |
|-----------|-----|-------|
| Success Rate | 99.9% of collection attempts use cursor without error | Error budget: 0.1% over 30d |
| Latency (p95) | <250ms (<=10K domains) / <2s (<=500K domains) | Measured from log start to domains collected metric insertion |
| Pages (p95) | <50 pages per collection | Excess pages indicate inefficient sort order or fragmentation |
| Error Count | 0 forced errors sustained | Any occurrence pages on-call |

## Key Metrics (Sources)
- QueryPerformanceMetric rows filtered by `query_type` in (`stealth_cursor_collection`,`stealth_cursor_error`)
- Derived histograms (pages, latency) built externally (log enrichment or ETL)

## Suggested Dashboard Panels
1. Cursor Success Rate (%): `success = collection / (collection + error)`
2. Forced Errors (line): 24h stacked by environment.
3. Page Count Distribution: heatmap of pages bucketed (1-5,6-10,...,>50).
4. Latency p50/p95 overlay.
5. Top N Campaigns by Pages (last 6h) to catch pathological patterns.
6. Error Budget Burn (rolling 30d) derived from error rate.

## Example PromQL (Pseudo)
```
stealth_cursor_attempts = sum(rate(query_performance_total{query_type=~"stealth_cursor_collection|stealth_cursor_error"}[5m]))
stealth_cursor_success = sum(rate(query_performance_total{query_type="stealth_cursor_collection"}[5m]))
stealth_cursor_success_rate = stealth_cursor_success / stealth_cursor_attempts
```

## Alert Threshold Justification
- Any forced error: Immediate, low volume expected; indicates panic or SQL issue.
- High pages p95: Sustained >80 suggests index regression or changed filter selectivity.

## Operational Runbook Quick Links
- See `STEALTH_PAGINATION_MIGRATION.md` for rollback & cleanup.
- Completion gating: `STEALTH_CURSOR_COMPLETION_CHECKLIST.md`.

---
Document auto-generated to support dashboard creation.
