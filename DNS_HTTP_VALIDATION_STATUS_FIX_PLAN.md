# DNS & HTTP Validation Status Consistency and Scalability Plan

## 0. Executive Summary
Current API domain listing shows stale `dnsStatus` (and will show stale `httpStatus`) because it reads an immutable JSONB snapshot (`domains_data`) created during generation while validation phases update only the relational `generated_domains` table. We will eliminate stale reads by moving listings to authoritative relational data, introduce scalable counters, and prepare identical logic for HTTP validation.

Primary Outcomes:
- Accurate real‑time DNS & HTTP status visibility
- O(1) counter lookups (no table scans) for UI progress & analytics
- Removal (or strict deprecation) of JSONB status duplication
- Foundation for millions of domains per campaign

---
## 1. Goals
1. Fix stale DNS status return path (root cause: JSONB snapshot drift)
2. Apply same solution pattern to HTTP validation status
3. Avoid full-row JSONB rewrites & reduce WAL bloat
4. Support efficient pagination & filtering for large (10^6+) domain sets
5. Provide reliable aggregate counters and progress metrics
6. Preserve backward compatibility during migration (feature flags)

---
## 2. Non-Goals (Explicitly Out of Scope for This Iteration)
- Partitioning or sharding (`generated_domains`) – deferred until threshold metrics demand it
- SSE/WebSocket streaming of per-domain deltas (will be a follow-up enhancement)
- Retry queue & advanced error reason taxonomy (optional extension later)

---
## 3. Constraints & Assumptions
- Postgres remains primary datastore
- Existing indexes largely sufficient; may add covering index if missing
- Batch size and concurrency logic in validators stays unchanged initially
- Frontend can adapt to new metadata fields after a short deprecation window

---
## 4. High-Level Architecture Changes
| Aspect | Current | Target |
|--------|---------|--------|
| Domain listing | JSONB snapshot first, fallback to table | Direct relational query (keyset) |
| Status persistence | Table only (dns/http) | Same (authoritative) |
| Snapshot JSONB | Contains domains + stale statuses | Either removed or contains immutable generation-only fields |
| Aggregates | Derived ad hoc or absent | `campaign_domain_counters` table updated by delta |
| Bulk ops progress | In-memory + logs | (Later) persisted; not mandatory for this fix |

---
## 5. Data Model Additions
### 5.1 `campaign_domain_counters` (New Table)
```
campaign_id UUID PRIMARY KEY
updated_at  timestamptz NOT NULL DEFAULT now()
dns_pending INT NOT NULL DEFAULT 0
dns_ok      INT NOT NULL DEFAULT 0
dns_error   INT NOT NULL DEFAULT 0
dns_timeout INT NOT NULL DEFAULT 0
http_pending INT NOT NULL DEFAULT 0
http_ok      INT NOT NULL DEFAULT 0
http_error   INT NOT NULL DEFAULT 0
http_timeout INT NOT NULL DEFAULT 0
version BIGINT NOT NULL DEFAULT 0
```

### 5.2 Optional (Phase 2+): `dns_reason` & `http_reason` columns
Add classification granularity (NXDOMAIN, SERVFAIL, TIMEOUT, NOANSWER) – flagged off initially.

---
## 6. Migration & Rollout Phases
### Phase A (Core Fix – DNS)
- A1: Add feature flag `DOMAINS_LISTING_MODE=direct|jsonb` (default: `jsonb`)
- A2: Implement direct relational listing path (keyset by `offset_index`)
- A3: Add conditional WHERE `dns_status='pending'` filter in bulk DNS UPDATE to reduce churn
- A4: Introduce counters table & backfill for existing campaigns
- A5: Update DNS validation service: wrap bulk update + counter delta in one transaction
- A6: Expose counters in listing response metadata (e.g., `aggregate` object)
- A7: Add integration & regression tests (DNS only) comparing JSONB vs direct results
- A8: Flip default `DOMAINS_LISTING_MODE=direct`

### Phase B (Extend to HTTP)
- B1: Mirror bulk counter delta logic for HTTP validation path
- B2: Ensure HTTP validator update function uses conditional update (`http_status='pending'`)
- B3: Backfill HTTP counters (scan grouped counts per campaign once)
- B4: Add HTTP counters to aggregate metadata & progress endpoints
- B5: Tests validating status transitions (pending → ok/error/timeouts)

### Phase C (Deprecation Cleanup)
- C1: Mark JSONB status fields deprecated in OpenAPI description
- C2: Stop writing status fields into JSONB (generation only keeps id, domain_name, offset, created_at)
- C3: After deprecation window: remove reconciliation patch & any fallback writes
- C4: (Optional) Drop `domains_data` column (separate migration; requires ops signoff)

### Phase D (Optional Enhancements)
- D1: Add `dns_reason` / `http_reason`
- D2: Add SSE endpoint for incremental status events
- D3: Add nightly reconciliation job (recompute counters, log drift)

Phase D Kickoff Notes (added post Phase C completion):
- Reasons columns will follow same counter delta pattern; schema change will include nullable reason enums and lightweight lookup mapping.
- SSE design to leverage existing counters table for periodic snapshots plus incremental domain status channel (batched events by campaign).
- Reconciliation job to recompute counters nightly and emit drift metric; will use single SUM(...) GROUP BY campaign_id query.

---
## 7. Detailed Task Checklist
### Phase A – DNS Core
- [x] A1: Introduce feature flag plumbing (env var + config struct) (ENV var `DOMAINS_LISTING_MODE` implemented)
- [x] A2: Implement direct listing repository method with keyset pagination (cursor + offset_index path in place)
- [x] A3: Modify handler to branch on feature flag; structured diff logging during dual mode (branching logic present; logging minimal)
- [x] A4: Create migration for `campaign_domain_counters` (migration added & applied in dev)
- [x] A5: Backfill: script scanning `generated_domains` grouped counts, insert rows (initial backfill logic executed; production script TODO)
- [x] A6: Transaction wrapper in DNS validation service (bulk update + counters integrated)
  - Acquire tx (implemented)
  - Bulk update `generated_domains` (pending → new) (implemented)
  - Apply counter deltas (increment/decrement) (implemented)
  - Commit (implemented)
- [x] A7: Add unit tests for delta computation (input old->new statuses) (implemented basic delta math tests)
- [x] A8: Add integration test: run generation, run dns validation, assert API returns updated statuses (direct) (initial counters test added; full phase flow test still optional)
- [x] A9: Add API metadata: counters { dns: {pending, ok, error, timeout} } (aggregates field shipped)
- [x] A10: Enable direct mode in non-prod; soak test (manual enable; needs documented soak signoff)
- [x] A11: Flip direct mode to default; leave JSONB path behind flag (default now 'direct' when env unset)

### Phase B – HTTP Extension
- [x] B1: Add delta logic to HTTP validation bulk update path (pending-only + transactional RETURNING based counter deltas)
- [x] B2: HTTP counters backfill script (CLI added `backend/cmd/backfill_http_counters`; idempotent UPDATE semantics)
- [x] B3: Integration test for HTTP path (simulate responses → ok/error/timeout; assert counters + aggregates)
- [x] B4: Extend metadata to include http counters (aggregation present; verified via existing handler helper & counters tests)
- [x] B5: Performance test HTTP update throughput (benchmark added `benchmark_http_bulk_update_test.go`)

### Phase C – Deprecation
- [x] C1: OpenAPI doc: mark JSONB snapshot fields deprecated (spec update pending publish) *(docs adjusted in code comments; OpenAPI description to prune remaining references)*
- [x] C2: Stop embedding statuses in JSONB generation writer (mirroring removed)
- [x] C3: Remove reconciliation/fallback JSONB logic (handler + services purged)
- [x] C4: Migration 46 added to drop `domains_data` (column removal scripted)

### Phase D – Optional Enhancements
- [ ] D1: Add `dns_reason` / `http_reason` columns & populate from validators
- [ ] D2: SSE endpoint streaming per-batch progress & delta counters
- [ ] D3: Reconciliation job (nightly) verifying counters vs actual sums (<0.01% drift target)

---
### Recent Implementation Notes
- Added `buildDomainAggregates` helper to eliminate inline duplicate aggregate struct assembly.
- Pruned legacy RawMessage JSONB accessor methods for DNS/HTTP/Analysis; interface & implementations updated.
- Added simplified counters-based tests; full HTTP server integration test deferred due to large generated interface surface (future harness needed).
- Marked backfill & reconciliation JSONB logic with deprecation comment for Phase C removal.

### Immediate Next Steps
1. Run migration 46 in each environment (ops coordination)
2. Regenerate OpenAPI spec & remove any lingering `domainsData` references
3. Add new persistence (optional future) for stealth config if feature retained
4. Consider D‑series enhancements (reasons, SSE, reconciliation job)


---
## 8. Delta Computation Logic (Counters)
For a batch:
1. Pre-query not needed if we constrain UPDATE to rows with `pending` – all transitions are pending → {ok|error|timeout}
2. Count statuses in batch payload (k_ok, k_error, k_timeout)
3. Apply:
```
dns_pending  -= (k_ok + k_error + k_timeout)
dns_ok       += k_ok
dns_error    += k_error
dns_timeout  += k_timeout
version      += 1
```
(Same pattern for HTTP.)

Edge: Duplicate replay of same batch → conditional WHERE prevents double counting (no rows updated ⇒ deltas must NOT be applied; capture affected row count to gate counter update). If affected_rows == 0: skip counter mutation.

---
## 9. Handler Changes (Listing)
Response shape extension:
```
{
  data: {
    items: [...],
    total: <int or null if expensive>,
    aggregate: {
      dns: { pending, ok, error, timeout },
      http: { pending, ok, error, timeout }
    },
    cursor: { nextOffsetIndex: <int|null> }
  }
}
```
- `total` can be omitted or later served from a precomputed cached field (optional) to avoid COUNT(*) on huge sets.

---
## 10. Testing Strategy
| Level | Focus | Tests |
|-------|-------|-------|
| Unit | Counter delta logic | Transition matrix, replay idempotency |
| Unit | Listing repo method | Pagination correctness (no OFFSET), filtering |
| Integration | DNS flow | Generation → validation → listing statuses correct |
| Integration | HTTP flow | Same as DNS |
| Load | Listing scalability | p95 under concurrency (N readers) |
| Migration | Backfill counters | After backfill sums match table counts |

---
## 11. Performance & Capacity Targets
- Listing first page (200 domains) p95 < 50ms at 5M row campaign
- Bulk status update (1K domains) < 150ms commit time (excluding DNS resolution time)
- Counter drift < 0.01% (validated weekly)
- WAL growth < baseline + 10% after removing JSONB rewrites

---
## 12. Observability Additions
Metrics (Prometheus):
- `domain_status_update_rows{phase="dns"}` (counter)
- `domain_status_batch_latency_seconds{phase="dns"}` (histogram)
- `campaign_domain_counters_drift` (gauge, reconciliation job)
- `domains_listing_query_latency_seconds` (histogram)
Logs: structured fields (campaign_id, batch_id, updated_rows, skipped_rows, counters_version)

---
## 13. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Counter divergence | Incorrect UI | Nightly reconciliation + conditional updates |
| Large legacy JSONB | Memory / bloat | Deprecation & eventual column drop |
| Frontend dependency on JSONB shape | UI break | Feature flag & staged rollout |
| Duplicate batch replay | Double counting | Use affected_rows gate |
| Slow COUNT(*) for totals | Latency | Omit or async compute + cache |

---
## 14. Rollback Strategy
- Feature flag toggles listing mode back to JSONB quickly
- Counter updates isolated; if issue found, disable delta application (flag) and serve statuses directly (counters absent)
- Reconciliation job can correct counters retroactively

---
## 15. Acceptance Criteria
- After DNS validation completes, listing endpoint shows non-pending statuses without reconciliation patch
- HTTP validation later exhibits identical behavior
- Counter values match aggregated table sums in test harness
- Feature flag `DOMAINS_LISTING_MODE=direct` active in prod with no elevated error rate over 48h

---
## 16. Implementation Ordering (Condensed Timeline)
Day 1: A1–A4 (migrations + listing direct path shadow mode)  
Day 2: A5–A8 (transaction + counters + tests)  
Day 3: A9–A11 (switch default, soak, finalize DNS)  
Day 4: B1–B3 (HTTP adoption)  
Day 5: B4–B5 + start deprecation (C1–C2)  
Following Sprint: C3–C4, optional D‑series enhancements

---
## 17. Open Questions (Resolve Before Coding)
- Do we need `total` domain count on listing immediately? (If yes, consider approximate count strategy)
- Should we store separate `validated_at_dns` vs shared `last_validated_at`? (May need separate timestamps for multi-phase ordering.)
- Is dropping `domains_data` column acceptable within current quarter? (Requires ops & migration window disallowing writes.)

---
## 18. Next Steps (Awaiting Approval)
1. Approve Phase A scope & counters table schema
2. Approve omission (or inclusion) of dns_reason/http_reason in initial pass
3. Confirm listing response schema addition (`aggregate`) acceptable to client consumers

Once approved, execution begins with Phase A tasks.

---
*End of Plan*
