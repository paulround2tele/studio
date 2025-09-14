# Stealth Cursor Index & Performance Review

Purpose: Provide definitive guidance and validation steps ensuring the cursor-based domain collection query remains performant at large scale (millions of rows).

## 1. Target Query Shape
Pseudo-query (adapt to actual store implementation):
```sql
SELECT domain_name, dns_status, offset_index
FROM generated_domains
WHERE campaign_id = $1
  AND deleted_at IS NULL
  -- optional filter for http_keyword_validation
  AND ($2::text IS NULL OR dns_status = $2)
ORDER BY domain_name ASC
LIMIT $PAGE_SIZE
```
Cursor value = last `domain_name` (lexicographic ordering) from previous page. Next page adds:
```sql
  AND domain_name > $afterCursor
```

## 2. Required Indexes
Primary supporting index (covers ordering + campaign filter):
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_campaign_domain
ON generated_domains (campaign_id, domain_name);
```
If `dns_status` filtered frequently for phases (e.g., `http_keyword_validation`), consider composite variant (benchmark first):
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_domains_campaign_dns_domain
ON generated_domains (campaign_id, dns_status, domain_name);
```
Caveat: Additional index increases write cost; only add if selective filter yields measurable latency drop (>20%).

## 3. EXPLAIN (ANALYZE, BUFFERS) Template
First page (no cursor):
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT domain_name
FROM generated_domains
WHERE campaign_id = '00000000-0000-0000-0000-000000000000'
ORDER BY domain_name ASC
LIMIT 1000;
```
Subsequent page (with cursor):
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT domain_name
FROM generated_domains
WHERE campaign_id = '00000000-0000-0000-0000-000000000000'
  AND domain_name > 'prev_cursor_value'
ORDER BY domain_name ASC
LIMIT 1000;
```
Expected plan snippet:
```
Index Scan using idx_generated_domains_campaign_domain on generated_domains  (cost=... rows=... width=...)
  Index Cond: ((campaign_id = '...') AND (domain_name > 'prev_cursor_value')) -- for subsequent pages
```
Red flags:
- Seq Scan on generated_domains
- Bitmap Heap Scan with high heap fetches when index scan should suffice
- High shared/local block hit ratio anomalies (>10% reads from disk for warm cache)

## 4. Performance Targets
| Metric | Target | Notes |
|--------|--------|-------|
| Page latency (single query) | <50ms p95 | Warm cache assumption |
| Full collection (10K domains) | <250ms p95 | Includes loop & aggregation |
| Full collection (500K domains) | <2s p95 | Streaming cursor pages |
| Rows examined ~ rows returned | ~1x | No large filtering gap |

## 5. Benchmark Procedure
1. Seed synthetic campaign with N rows (e.g., 1M) distributed uniformly across domain_name space.
2. Warm cache: run first page query 3 times; discard first result.
3. Measure:
   - First page latency
   - 100 consecutive pages (simulate ~100K domains) average & p95
4. Repeat with dns_status filter to evaluate benefit of composite index.
5. Record findings in this file (append section `## Benchmark YYYY-MM-DD`).

## 6. Tuning Levers
- PAGE_SIZE constant (currently 1000) – trade latency vs loop iterations.
- Additional covering columns (include) if store implementation moves to index-only scans (Postgres 11+ already can use heap if needed; consider INCLUDE if projecting more columns eventually).
- Reindex if bloat > 20% (check `pg_stat_all_indexes` + `pgstattuple`).

## 7. Maintenance Checks (Quarterly)
Run:
```sql
SELECT relname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_all_indexes
WHERE relname IN ('idx_generated_domains_campaign_domain','idx_generated_domains_campaign_dns_domain');
```
Look for disproportionate `idx_tup_fetch` vs `idx_tup_read` suggesting heap lookups overhead; consider including needed columns or verifying visibility map.

## 8. Example Error Forensics
If `stealth_cursor_error` surfaces:
1. Execute failing query manually with same cursor value.
2. If error is `invalid input syntax` verify cursor string not corrupted (should be exact last domain_name).
3. If `duplicate key value violates unique constraint` appears, ensure upstream generation enforces uniqueness; add unique index if missing:
```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_generated_domains_campaign_domain
ON generated_domains (campaign_id, domain_name);
```

## 9. Open Decisions
- Whether to adopt composite `(campaign_id, dns_status, domain_name)` index after real workload profiling.
- Potential shift to a surrogate monotonic key (e.g., snowflake ID) if domain_name ordering distribution proves skewed.

## 10. Next Actions (To Update When Completed)
- [ ] Capture first benchmark results.
- [ ] Decide on composite index necessity.
- [ ] Add unique index confirmation section.

---
Append future benchmarks below.
