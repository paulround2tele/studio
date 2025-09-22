# DomainFlow Studio Refactor Gap Tracker

**Status:** WIP - Continuous Updates Required  
**Owner:** Engineering Team  
**Last Updated:** December 23, 2024  
**Document Purpose:** Single source of truth for refactor progress across UX Refactor and Extraction/Analysis backend

---

## Overview

This document tracks ALL missing, incomplete, or blocked implementation items from both:
1. [UX_REFACTOR_PLAN.md](./UX_REFACTOR_PLAN.md) - Campaign Pipeline & Insights Alignment
2. [EXTRACTION_ANALYSIS_REDESIGN_PLAN_Version2.md](../EXTRACTION_ANALYSIS_REDESIGN_PLAN_Version2.md) - Backend Analysis Redesign

Each requirement is marked with:
- **Status:** Not Started / In Progress / Complete / Blocked
- **Blocker:** API, Schema, Dependencies, etc.
- **Last Updated:** Date of status change
- **Comments:** Additional context

---

## I. UX REFACTOR PLAN - CAMPAIGN PIPELINE & INSIGHTS

### A. Backend API Endpoints (New)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Extend `POST /api/v2/campaigns` with `patternConfig` object | In Progress | Schema | Dec 23, 2024 | Current handler exists but doesn't process extended config |
| `GET /api/v2/campaigns/{id}/funnel` endpoint | In Progress | Implementation | Dec 23, 2024 | Schema defined, handler exists but returns empty data |
| `GET /api/v2/campaigns/{id}/metrics` endpoint | In Progress | Implementation | Dec 23, 2024 | Schema defined, handler exists but needs aggregation logic |
| `GET /api/v2/campaigns/{id}/classifications?limit=5` endpoint | Not Started | Implementation | Dec 23, 2024 | Schema partially defined, no handler |
| `GET /api/v2/campaigns/{id}/momentum` endpoint | Not Started | Implementation | Dec 23, 2024 | Schema defined, no handler implementation |
| `GET /api/v2/campaigns/{id}/insights/recommendations` endpoint | Not Started | Implementation | Dec 23, 2024 | No schema or handler |
| `POST /api/v2/campaigns/{id}/duplicate` endpoint | Not Started | Implementation | Dec 23, 2024 | No schema or handler |
| Enhanced SSE `GET /api/v2/sse/campaigns/{id}` with phaseUpdate events | In Progress | Implementation | Dec 23, 2024 | SSE service exists, needs phase event integration |

### B. Backend Data Processing & Performance

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Metrics aggregation service with 30s TTL caching | Not Started | Implementation | Dec 23, 2024 | Need to implement in-memory cache for metrics |
| Funnel counts single SELECT with conditional aggregates | Not Started | Database | Dec 23, 2024 | Need optimized query for domain status counts |
| Database indexes for funnel queries (domain_status, keyword_hit flags) | Not Started | Database | Dec 23, 2024 | Need performance analysis and index creation |
| Momentum computation with richness score deltas | Blocked | Extraction | Dec 23, 2024 | Depends on Extraction redesign richness snapshots |
| Query performance validation (<50ms for 10k domains) | Not Started | Testing | Dec 23, 2024 | Need EXPLAIN ANALYZE validation |
| Pattern config storage in `configuration` JSONB column | Not Started | Implementation | Dec 23, 2024 | Need to update campaign creation logic |

### C. Frontend Components - Campaign Wizard

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| `CampaignWizardShell.tsx` | In Progress | - | Dec 23, 2024 | Basic shell exists at `src/components/refactor/campaign/CampaignCreateWizard.tsx` |
| `WizardStepGoal.tsx` | In Progress | - | Dec 23, 2024 | Exists as GoalStep, needs validation |
| `WizardStepPattern.tsx` | In Progress | - | Dec 23, 2024 | Exists as PatternStep, needs extended pattern config |
| `WizardStepTargeting.tsx` | In Progress | - | Dec 23, 2024 | Exists as TargetingStep, needs personas integration |
| `WizardStepReview.tsx` | In Progress | - | Dec 23, 2024 | Exists as ReviewStep, needs complete config display |
| Pattern config validation and persistence | Not Started | Backend API | Dec 23, 2024 | Depends on extended POST /campaigns endpoint |
| Wizard routing and state preservation | In Progress | - | Dec 23, 2024 | Basic state management exists, needs completion |

### D. Frontend Components - Live Pipeline

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| `PipelineBar.tsx` | Not Started | Implementation | Dec 23, 2024 | No component in planned location |
| `PipelinePhaseCard.tsx` | Not Started | Implementation | Dec 23, 2024 | No component in planned location |
| SSE Hook `useCampaignPhaseStream(campaignId)` | In Progress | SSE Events | Dec 23, 2024 | `useCampaignSSE` exists but needs phase stream integration |
| Live progress updates with <2s latency | Blocked | SSE Backend | Dec 23, 2024 | Depends on enhanced SSE phaseUpdate events |
| Phase status enum mapping (not_started, ready, configured, in_progress, paused, completed, failed) | Not Started | Implementation | Dec 23, 2024 | Need to standardize phase status enums |

### E. Frontend Components - KPI Grid & Metrics

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| `KpiGrid.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `KpiCard.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| RTK Query integration for `getCampaignMetrics` | Not Started | Backend API | Dec 23, 2024 | Depends on metrics endpoint implementation |
| Skeleton loading states | Not Started | Implementation | Dec 23, 2024 | Need loading state components |
| Metric recalculation triggers | Not Started | Implementation | Dec 23, 2024 | Need derived selectors |

### F. Frontend Components - Funnel & Insights

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| `FunnelSnapshot.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `FunnelStage.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `RecommendationPanel.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `RecommendationItem.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `ClassificationBuckets.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `BucketCard.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |

### G. Frontend Components - Advanced Features

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| `WarningDistribution.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `WarningBar.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `WarningPills.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `MomentumPanel.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `MoverList.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `Histogram.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `ConfigSummaryPanel.tsx` | Not Started | Implementation | Dec 23, 2024 | No component exists |
| `CampaignExperiencePage.tsx` layout integration | Not Started | Implementation | Dec 23, 2024 | No unified layout exists |

### H. Feature Flags & Migration

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| `ENABLE_UNIFIED_CAMPAIGN_EXPERIENCE` flag implementation | Not Started | Implementation | Dec 23, 2024 | No feature flag system for this |
| Legacy component decommission plan | Not Started | Planning | Dec 23, 2024 | Need inventory of components to remove |
| `/campaigns/new/legacy` route preservation | Not Started | Implementation | Dec 23, 2024 | Need fallback route setup |
| Gradual rollout strategy (10% → 50% → 100%) | Not Started | Infrastructure | Dec 23, 2024 | Need rollout infrastructure |

### I. Accessibility & Performance

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| ARIA labels for wizard navigation and phase cards | Not Started | Implementation | Dec 23, 2024 | Need accessibility audit |
| Progress bars with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100` | Not Started | Implementation | Dec 23, 2024 | Need accessible progress components |
| CSS variables mapping to Tailwind tokens | Not Started | Implementation | Dec 23, 2024 | Need theme variable injection |
| Lighthouse accessibility score >95% | Not Started | Testing | Dec 23, 2024 | Need accessibility testing |
| Campaign detail page loads in <3s for 50k+ domains | Not Started | Testing | Dec 23, 2024 | Need performance benchmarking |

---

## II. EXTRACTION ANALYSIS REDESIGN PLAN

### A. Database Schema & Migrations (WP1)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Migration 000055 `domain_extraction_features` table | Complete | - | Dec 23, 2024 | Migration exists and applied |
| Migration 000055 `domain_extracted_keywords` table | Complete | - | Dec 23, 2024 | Migration exists and applied |
| `extraction_processing_state_enum` enum | Complete | - | Dec 23, 2024 | Enum created in migration |
| Performance indexes on `(campaign_id) WHERE processing_state='ready'` | Complete | - | Dec 23, 2024 | Indexes included in migration |
| Optional indexes for `(campaign_id, is_stale_score)` | Not Started | Performance | Dec 23, 2024 | Need performance testing to determine necessity |

### B. Feature Struct Builder (WP2)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| In-memory feature aggregator (sub-steps B-D) | In Progress | - | Dec 23, 2024 | Stub implementation exists, needs full aggregation logic |
| Richness V2 computation with component breakdown | In Progress | - | Dec 23, 2024 | Basic structure exists, needs penalties implementation |
| Top3 keywords extraction | Not Started | Implementation | Dec 23, 2024 | Need keyword ranking logic |
| Signal distribution computation | Not Started | Implementation | Dec 23, 2024 | Need signal type classification |
| Microcrawl gain metrics | Blocked | WP5 | Dec 23, 2024 | Depends on microcrawl integration |

### C. Upsert Transaction Logic (WP3)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Atomic persistence with state transitions | Complete | - | Dec 23, 2024 | Basic upsert logic implemented |
| `processing_state` transitions (pending → building → ready) | Complete | - | Dec 23, 2024 | State machine implemented |
| Error handling with `last_error` field | Complete | - | Dec 23, 2024 | Error capture implemented |
| Reconciliation with existing state | Complete | - | Dec 23, 2024 | Reconciliation logic exists |

### D. Keyword Detail Persistence (WP4)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Bulk insert scaffold for keyword details | Complete | - | Dec 23, 2024 | Bulk insert framework exists |
| Keyword deduplication per keyword_id | In Progress | - | Dec 23, 2024 | Basic deduplication, needs refinement |
| Generation helper utilities | Complete | - | Dec 23, 2024 | Helper functions implemented |
| Pruning strategy for low-impact keywords | Not Started | Implementation | Dec 23, 2024 | Need keyword importance scoring |

### E. Microcrawl Integration (WP5)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Adaptive gating heuristic | In Progress | - | Dec 23, 2024 | Stub interface exists, needs gating logic |
| Real fetch + incremental keyword merge | Not Started | Implementation | Dec 23, 2024 | Need HTTP fetching integration |
| Budget-limited page crawling | Not Started | Implementation | Dec 23, 2024 | Need crawling budget controls |
| Enrichment wiring | Not Started | Implementation | Dec 23, 2024 | Need integration with feature builder |
| Diminishing returns detection | Not Started | Implementation | Dec 23, 2024 | Need keyword gain threshold logic |

### F. Reconciliation Job (WP6)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| ctid-based stuck row reset logic | Complete | - | Dec 23, 2024 | Reconciliation job implemented |
| Exponential backoff for retries | In Progress | - | Dec 23, 2024 | Basic retry logic, needs backoff |
| Error state promotion to pending | Complete | - | Dec 23, 2024 | State recovery implemented |
| Stuck `building` state detection | Complete | - | Dec 23, 2024 | Timeout detection exists |

### G. Dual-Read Analysis Adapter (WP7)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Compare legacy vs new outputs | Complete | - | Dec 23, 2024 | Dual-read framework exists |
| Variance logging | Complete | - | Dec 23, 2024 | Per-domain diff logging implemented |
| Metrics counters for differences | Complete | - | Dec 23, 2024 | Prometheus counters exist |
| Score deviation analysis | In Progress | - | Dec 23, 2024 | Basic comparison, needs detailed analysis |

### H. Scoring Profile Snapshotting (WP8)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Snapshot persistence model | Not Started | Implementation | Dec 23, 2024 | Need snapshot storage design |
| `scoring_profile_snapshot_id` lifecycle automation | Not Started | Implementation | Dec 23, 2024 | Need lifecycle management |
| Stale score marking | In Progress | - | Dec 23, 2024 | Basic stale detection, needs automation |
| Profile versioning | Not Started | Implementation | Dec 23, 2024 | Need version tracking system |

### I. Re-Score CLI / Admin Endpoint (WP9)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Force re-scoring CLI command | In Progress | WP8 | Dec 23, 2024 | CLI stub exists, needs snapshot integration |
| Batching for large domain sets | Not Started | Implementation | Dec 23, 2024 | Need batch processing framework |
| Stale domains filter | Not Started | WP8 | Dec 23, 2024 | Depends on snapshot system |
| Progress reporting | Not Started | Implementation | Dec 23, 2024 | Need progress tracking |

### J. Metrics & Dashboards (WP10)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Prometheus metrics for extraction states | Complete | - | Dec 23, 2024 | Basic metrics implemented |
| Dual-read diff counters | Complete | - | Dec 23, 2024 | Diff metrics exist |
| Lint job skeleton | Complete | - | Dec 23, 2024 | Basic linting framework |
| Grafana dashboard panels | Not Started | Infrastructure | Dec 23, 2024 | Need dashboard configuration |
| Processing latency histograms | Not Started | Implementation | Dec 23, 2024 | Need latency tracking |

### K. Event Harmonization (WP11)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Phase-level events for extraction sub-steps | Not Started | Implementation | Dec 23, 2024 | Need event schema design |
| SSE integration for extraction progress | Not Started | Implementation | Dec 23, 2024 | Need SSE event emission |
| Event rate limiting | Not Started | Implementation | Dec 23, 2024 | Need rate control mechanisms |

### L. Storage Optimization (WP12)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Low-impact keyword pruning policies | Not Started | Implementation | Dec 23, 2024 | Need keyword importance metrics |
| Feature vector governance | In Progress | - | Dec 23, 2024 | Registry exists, needs enforcement |
| Allowed keys registry enforcement | In Progress | - | Dec 23, 2024 | Basic registry, needs validation |
| Periodic scheduler for pruning | Not Started | Implementation | Dec 23, 2024 | Need scheduled job system |

### M. Documentation & ADR (WP13)

| Requirement | Status | Blocker | Last Updated | Comments |
|-------------|--------|---------|--------------|----------|
| Move plan to stable docs path | Not Started | Process | Dec 23, 2024 | Need to relocate and stabilize plan |
| Architecture Decision Records | Not Started | Documentation | Dec 23, 2024 | Need to document key decisions |
| API documentation updates | Not Started | Implementation | Dec 23, 2024 | Need to update OpenAPI specs |

---

## III. CRITICAL BLOCKERS & DEPENDENCIES

### Cross-Project Blockers

| Blocker | Affects | Impact | Resolution Required |
|---------|---------|--------|-------------------|
| Extraction richness snapshots missing | UX Momentum features | High | Complete WP8 scoring snapshots |
| SSE phase event schema undefined | UX Live Pipeline | High | Define and implement phase event schema |
| Pattern config persistence not implemented | UX Wizard completion | High | Extend campaign creation endpoint |
| Metrics aggregation service missing | UX KPI Grid | High | Implement caching aggregation service |
| Feature vector governance incomplete | Extraction stability | Medium | Complete registry enforcement |

### Performance Blockers

| Item | Target | Current Gap | Action Required |
|------|--------|-------------|-----------------|
| Query performance (<50ms for 10k domains) | 50ms | Unknown | Run EXPLAIN ANALYZE benchmarks |
| SSE latency (<2s) | 2s | Unknown | Test SSE event delivery times |
| Campaign page load (<3s for 50k domains) | 3s | Unknown | Load testing with large datasets |
| Re-score throughput (>5k domains/s) | 5k/s | Unknown | Benchmark scoring performance |

---

## IV. NEXT IMMEDIATE ACTIONS

### Week 1 Priorities (Backend Foundation)
1. **Complete handler implementations** for funnel, metrics, momentum endpoints
2. **Implement metrics aggregation service** with 30s TTL caching
3. **Define SSE phase event schema** and integrate with existing SSE service
4. **Extend campaign creation** to handle pattern config persistence
5. **Benchmark database queries** for performance validation

### Week 2 Priorities (Frontend Core)
1. **Create missing pipeline components** (PipelineBar, PipelinePhaseCard)
2. **Implement KPI Grid components** with RTK Query integration
3. **Complete wizard pattern step** with extended configuration
4. **Add SSE phase stream integration** to useCampaignSSE hook
5. **Set up component testing** for new wizard components

### Week 3 Priorities (Advanced Features)
1. **Implement funnel and classification components**
2. **Create momentum and recommendation panels**
3. **Add warning distribution components**
4. **Complete WP8 scoring snapshot system**
5. **Implement feature flag infrastructure**

---

## V. UPDATE SCHEDULE

This document will be updated:
- **Weekly:** Every Monday with status changes and new blockers
- **After major completions:** When work packages or major features complete
- **Before releases:** To ensure accurate status for deployment planning

**Last Comprehensive Review:** December 23, 2024  
**Next Scheduled Update:** December 30, 2024

---

*This tracker is a living document and should be updated continuously as work progresses. All team members should reference this for current status and blockers.*