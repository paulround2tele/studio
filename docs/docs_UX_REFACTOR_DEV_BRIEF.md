# UX Refactor Developer Brief (Read Before Touching Code)

Audience: New / incoming engineers joining mid‑stream on the Campaign Experience & Pipeline UX refactor.

Status: Authoritative companion to `docs/UX_REFACTOR_PLAN.md`. If this brief and the plan diverge, update this brief to match the plan—do NOT silently improvise.

---

## 1. Purpose of This Brief
You are inheriting an in‑flight refactor with multiple historical phase documents (UX_REFACTOR_PHASE1..6, unified pipeline plans, etc.). These historical markdowns describe *how we got here*, not what to build next. The single source of forward specification is:

`docs/UX_REFACTOR_PLAN.md` (aka “The Plan”)

This brief:
- Highlights canonical contracts & naming you must not alter casually.
- Lists pitfalls that have previously caused rework.
- Provides a crosswalk from legacy “Phase 1/2/3…” docs to current Plan phases (A–E).
- Gives you verification commands and acceptance heuristics before merging.

---

## 2. Canonical Artifacts (Read in Order)
1. `docs/UX_REFACTOR_PLAN.md`
2. `docs/unified_pipeline_refactor_plan.md` (structural pipeline groundwork; treat as historical design context)
3. `PIPELINE_UI_ENTERPRISE_UPGRADE_PLAN.md` (layout consolidation history)
4. Phase markdowns (`UX_REFACTOR_PHASE1..`) – reference only for *implemented* behaviors; do not resurrect old patterns.

Never implement something “because Phase 2 said so” if it’s superseded in the main Plan.

---

## 3. Phase Crosswalk (Historical → Current Plan)

| Historical Doc / Concept | What It Maps To Now | Notes |
|--------------------------|---------------------|-------|
| Phase 1 Wizard + Overview (mock metrics) | Plan Phase B (Wizard, KPI Grid foundation) | Replace mock aggregation with server endpoints. |
| Phase 2 Service Layer & Client Metrics | Plan Phase A (backend endpoints) + Phase B (consumption) | Client services become fallback only. |
| Phase 3 Deltas / Movers / ProgressStream | Plan Phase C (Momentum & Movers) + part of D (Rec Engine) | Ensure server `/momentum` implemented; remove synthetic movers once live. |
| Pipeline Workspace / Enterprise Upgrade steps | Underpin UI layout for CampaignExperiencePage | Reconcile naming & delete superseded components post Phase E. |
| “ProgressStream” SSE abstraction | Plan SSE Hook `useCampaignPhaseStream` | Normalize event schema & field names. |
| Old flags (`CAMPAIGN_WIZARD_V1`, `CAMPAIGN_OVERVIEW_V2`, `SHOW_LEGACY_DOMAINS_TABLE`) | Unified Flag `ENABLE_UNIFIED_CAMPAIGN_EXPERIENCE` | Decommission historical flags per Plan Phase E. |

---

## 4. DO / DO NOT

### DO
- Treat *server* endpoints (`/funnel`, `/metrics`, `/classifications`, `/momentum`, `/insights/recommendations`) as authoritative; remove duplicated client math after parity.
- Enforce consistent field naming: `progressPercentage` (not progressPct / progress_percentage).
- Keep classification thresholds & rationale codes centralized in a single backend module.
- Use SSE first, polling only as temporary fallback (remove fallback once stability proven).
- Add unit tests before deleting legacy code (prove parity) → then remove, do not comment out.

### DO NOT
- Reintroduce legacy polling loops once SSE validated.
- Fork the status model or create “just for UI” shadow enums.
- Add TODO / TBD placeholders; open an issue if scope changes.
- Mutate existing campaign pattern post‑creation (non‑goal).
- Depend on client-only derived metrics for production decisions once server endpoints land.

---

## 5. Canonical Domain Concepts & Thresholds

### Phase Status Enum (final)
```
not_started | ready | configured | in_progress | paused | completed | failed
```

### Classification Buckets (richness score)
| Bucket | Range (inclusive lower, exclusive upper except last) |
|--------|------------------------------------------------------|
| highPotential | > 0.80 |
| emerging | 0.60 – 0.80 |
| atRisk | 0.40 – <0.60 |
| leadCandidate | 0.20 – <0.40 |
| lowValue | 0.00 – <0.20 |
| other | Everything uncategorized / unresolved |

### Recommendations (rationaleCode registry)
| Code | Trigger Condition (example) | Severity |
|------|-----------------------------|----------|
| R_DNS_LOW | dnsValid/generated < 0.70 after ≥20% generation complete | warn |
| R_HTTP_LOW | httpValid/dnsValid < 0.60 | warn |
| R_FEW_HIGH_POTENTIAL | highPotential < 3 when analyzed ≥100 | action |
| R_WARNING_RATE_HIGH | (stuffing+repetition+anchor)/analyzed > 0.25 | action |
| R_NO_LEADS | leads == 0 and analyzed ≥ 150 | info |
| R_MOMENTUM_LOSS | richness median delta < -0.15 past cycle | warn |
| R_MOMENTUM_SURGE | richness median delta > 0.10 & highPotential rising | info |
| R_ALL_CLEAR | No other rules fired & warning rate < 0.05 | info |

All rationale codes must appear in endpoint response; never invent new ones in UI.

---

## 6. Backend Endpoint Contract Snapshot (Abbreviated)

| Endpoint | Purpose | Cache |
|----------|---------|-------|
| POST /api/v2/campaigns | Create (includes patternConfig) | n/a |
| GET /api/v2/campaigns/{id}/status | Phases array + overallProgress | no cache (real-time) |
| GET /api/v2/campaigns/{id}/funnel | 7 funnel counts | 30s TTL |
| GET /api/v2/campaigns/{id}/metrics | KPI + warning components | 30s TTL |
| GET /api/v2/campaigns/{id}/classifications?limit=5 | Bucket counts + samples | 30s TTL |
| GET /api/v2/campaigns/{id}/momentum | moversUp / moversDown / histogram | 60s TTL or on-demand |
| GET /api/v2/campaigns/{id}/insights/recommendations | Recommendation list | 15s TTL |
| POST /api/v2/campaigns/{id}/duplicate | Duplicate campaign | n/a |
| GET /api/v2/sse/campaigns/{id} | phaseUpdate events | streaming |

SSE `phaseUpdate` event data shape:
```
{
  "phase": "dns",
  "status": "in_progress",
  "progressPercentage": 37,
  "startedAt": "...",
  "completedAt": null
}
```

Throttle: emit only on (a) status transition OR (b) +≥1% progress.

---

## 7. Momentum Data Model
- Maintain at most 2 stored richness snapshots per domain per campaign (previous & current cycle).
- Compute movers as top/bottom decile by richness delta (min baseline > N=5 observations).
- Histogram: 5 buckets representing delta ranges (e.g., ≤-0.20, -0.20– -0.05, -0.05–+0.05, +0.05–+0.20, ≥+0.20).
- Enforce index `(campaign_id, updated_at)` for snapshot queries.

---

## 8. Caching & Invalidation
- Each cached aggregate keyed by `campaign_id`.
- Invalidate funnel & metrics caches upon domain status update or analysis completion event.
- Momentum invalidation triggered only after analysis phase batch completes (avoid churn).
- Do NOT implement rolling per-domain invalidations for aggregates (degrades determinism).

---

## 9. Telemetry (Must Exist Before Flag Rollout to 100%)
Prometheus (server):
```
campaign_phase_update_total{phase,status}
campaign_metrics_compute_latency_ms (histogram)
recommendation_generated_total{rationaleCode}
momentum_snapshot_write_total
```
Client events (analytics wrapper):
```
ui.wizard.launch.success / ui.wizard.launch.failure
ui.phase_stream.error (retry_count)
ui.metrics.refresh (manual triggers)
ui.recommendation.view (once per recommendation cycle)
```

---

## 10. Decommission Timeline (Enforce)
| When | Action |
|------|--------|
| After Phase D merge | Deprecate legacy flags, introduce ENABLE_UNIFIED_CAMPAIGN_EXPERIENCE (off by default) |
| Rollout 10% | Monitor SSE reliability & metrics latency dashboards |
| Rollout 50% | Remove polling fallback except in controlled test environment |
| 100% rollout | Delete legacy wizard route artifacts & old overview components |
| 1 release after 100% | Purge deprecated client aggregation code (keep server fallback only if needed) |

---

## 11. Quality Gates (Pre‑Merge for Each Feature Slice)
Checklist (engineer self‑certify in PR):
- All new/changed endpoints present in OpenAPI diff.
- Client types regenerated (no `any` or `unknown` leak).
- Lighthouse accessibility score ≥95 on CampaignExperiencePage (run locally headless).
- Jest & integration tests cover: success path, error path, empty state.
- SSE reconnect tested (simulate network offline 5s).
- No console warnings (React / network) in manual smoke.
- Grep for deprecated symbols (document list in PR template):
  - `grep -R "useDomainData" src` should return 0
  - `grep -R "progressPct" src` should return 0
- Performance smoke: metrics endpoint p95 <500ms on seeded test dataset (attach one EXPLAIN screenshot or plan summary).

---

## 12. PR Template Snippet (Add to Each Refactor PR)
```
Refactor Slice: (Phase B / KPI Grid)  
Endpoints Added/Modified:  
Caches: (duration, keys)  
Telemetry Touchpoints:  
Decommission Actions in This PR:  
Backward Compatibility Notes:  
Verification Artifacts: (OpenAPI diff link, Lighthouse score, EXPLAIN summary)  
Risk & Mitigation Summary:  
```

---

## 13. Common Pitfalls & How to Avoid Them
| Pitfall | Consequence | Prevention |
|---------|-------------|------------|
| Mixing client & server metric sources | Divergent values confusing users | Feature flag gate: switch all KPIs atomically to server `/metrics` |
| Adding new status labels ad hoc | UI condition bloat | Extend enum centrally; update Plan & brief simultaneously |
| Over-eager polling as SSE fallback | Bandwidth + CPU churn | Keep fallback interval ≥30s and remove once SSE stable |
| Forgetting rationaleCode in recommendation | Auditing gap | Backend middleware asserts non-empty rationaleCode |
| Not batching SQL aggregate queries | Performance regressions | Use single SELECT with conditional aggregates (review EXPLAIN) |
| Keeping legacy flags around “just in case” | Confused rollout state | Enforce removal PR with checklist sign-off |

---

## 14. Verification Commands (Local)
```
# OpenAPI changed? (git diff should show only expected paths)
git diff HEAD~ -- backend/openapi

# Type safety
npm run typecheck

# Coverage (ensure thresholds in package.json)
npm run test:coverage

# Grep for leftover naming
grep -R "progressPct" src || echo "OK"
grep -R "blockedPhase" src || echo "OK"

# Count SSE listeners (should be 1 canonical hook)
grep -R "EventSource" src | wc -l
```

---

## 15. Escalation / Change Control
Any requested deviation (new funnel stage, added metric, altered threshold) requires:
1. Update `docs/UX_REFACTOR_PLAN.md` (PR).
2. Update this brief if the deviation affects canonical lists.
3. Tag both frontend & backend reviewers.
4. Add “Spec Update” label.

No code changes before spec PR merges.

---

## 16. Final Mental Model
You are not “adding features” piecemeal; you are converging on a *unified, insight-first campaign cockpit* whose credibility depends on:
- One source per metric
- Consistent realtime phase semantics
- Predictable recommendation logic
- Clean decommission of legacy pathways

Hold the line on scope & naming. Small, disciplined merges > large speculative rewrites.

---

## 17. Quick Start (If You Just Landed)
1. Read Plan sections 2–6 (surfaces, frontend plan, backend endpoints, migration).
2. Run existing tests & a sample campaign locally.
3. Pick the earliest unchecked slice in Plan Phase sequencing that has *no* open PR.
4. Open spec compliance checklist PR using template.
5. Implement → attach artifacts → request review.

Welcome aboard.

---
(End of Developer Brief)