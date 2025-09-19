# UX Refactor Plan – Campaign Pipeline & Insights Alignment

Status: Ready for implementation (no placeholders)
Owner: Engineering (Frontend + Backend Collaboration)
Approved Prototype: `prototypes_index.html` (HTML provided in prior conversation; to be stored under `docs/prototypes/` for traceability if not already tracked)

## 1. Purpose
Implement the approved Campaign Experience (wizard + live pipeline + insight surfaces) exactly as defined in the prototype, replacing the existing fragmented campaign creation & monitoring UI. This refactor unifies creation, execution visibility, and performance diagnostics in a single consistent layout, eliminating redundant pages, ad‑hoc polling, and low‑signal status fragments.

## 2. Prototype Surface Inventory → System Mapping
| Prototype Surface | Description | Data Sources (Existing / New) | Core Frontend Components (to create) | Backend / Contract Actions |
|-------------------|-------------|--------------------------------|--------------------------------------|----------------------------|
| New Campaign Wizard (4 steps) | Goal → Pattern → Targeting & Personas → Review & Launch | Existing: `/api/v2/keyword-sets/*`, `/api/v2/personas/*`, `/api/v2/proxies/*` (optional). New: `POST /api/v2/campaigns` extended to accept pattern spec & projections payload. | `CampaignWizardShell`, `WizardStepGoal`, `WizardStepPattern`, `WizardStepTargeting`, `WizardStepReview` | Extend campaign creation endpoint schema to include pattern config (constant string, variable length, charset, TLDs, targetDomains, keywordSetIds, personaIds, crawlDepth). Validate & persist configuration snapshot JSONB. |
| Live Pipeline Bar | Five sequential phases: generation, dns, http, analysis, leads with progress/status markers | Existing: Phase status endpoints (`/api/v2/campaigns/{id}/phases/{phase}/status`) or consolidated status. New: SSE channel `campaigns:{id}:phases` streaming phase delta events `{phase, status, progressPct}`. | `PipelineBar`, child `PipelinePhaseCard` | Implement SSE broadcast on phase progress transitions via existing `/api/v2/sse/campaigns/{id}` endpoint; ensure phase model includes `status` enum (not_started, ready, configured, in_progress, paused, completed, failed) + `progressPercentage`. Remove legacy polling loop in `progressChannel.ts`. |
| KPI Grid | High Potential, Leads, Keyword Coverage %, Avg Richness, Warning Rate %, Median Gain | Existing analysis results via domain features; extend analysis aggregation endpoint `/api/v2/campaigns/{id}/metrics` returning atomic fields. | `KpiGrid`, `KpiCard` | Add backend aggregator service to compute metrics (richness mean, warning rate components, median microcrawl gain). Cache in memory keyed by campaign id with TTL (30s) to avoid heavy recompute. |
| Funnel Snapshot | Generated → DNS Valid → HTTP OK → Keyword Hits → Analyzed → High Potential → Leads | Existing per-phase counts from domain status aggregates in `CampaignDomainsListResponse.aggregates`. Provide consolidated counts in `/api/v2/campaigns/{id}/funnel`. | `FunnelSnapshot`, `FunnelStage` | New read-only endpoint collating counts via optimized SQL (single query with conditional aggregates from existing counters table). Add database indexes if missing (domain_status, keyword_hit flags). |
| Recommendation Engine | Contextual improvement suggestions | New: `/api/v2/campaigns/{id}/insights/recommendations` returning ranked list [{id, message, rationaleCode, severity}] | `RecommendationPanel`, `RecommendationItem` | Service derives heuristics from funnel ratios & warning metrics. Deterministic rules enumerated in code (no ML). Include rationale codes for audit. |
| Classification Buckets | highPotential, emerging, atRisk, leadCandidate, lowValue, other (top 5 sample each) | Existing analysis classification store via `DomainAnalysisFeatures.richness.score`. New: `/api/v2/campaigns/{id}/classifications?limit=5` returns counts + sample list. | `ClassificationBuckets`, `BucketCard` | Backend query computing counts plus top N per bucket sorted by richness desc from existing domain features. |
| Warning Distribution | stuffing, repetition, anchor + total warn rate & narrative | Same metrics endpoint as KPI grid using existing `DomainAnalysisFeatures.richness` penalty fields OR dedicated `/api/v2/campaigns/{id}/warnings` | `WarningDistribution`, `WarningBar`, `WarningPills` | Extend metrics aggregator to emit component counts (stuffing_penalty, repetition_index, anchor_share counts from existing domain features). Narrative generated client-side. |
| Momentum & Movers | Top Up, Top Down (richness delta), Richness Delta Histogram | New: `/api/v2/campaigns/{id}/momentum` returning moversUp[], moversDown[], histogram buckets | `MomentumPanel`, `MoverList`, `Histogram` | Create delta computation job: snapshots richness per domain at analysis start + each analysis cycle; compute deltas in memory or temp table using existing richness scores. |
| Config Summary | Display immutable core config + actions (Edit Pattern, Duplicate) | Existing campaign config snapshot from `CampaignResponse.configuration`; existing duplicate endpoint if present or add `POST /api/v2/campaigns/{id}/duplicate` | `ConfigSummaryPanel` | Ensure creation stores full normalized config (pattern, target, personas, keyword sets, crawl depth) in existing configuration JSONB. Edit pattern operation may be deferred (non-goal to implement live mutation if absent). |

## 3. Frontend Implementation Plan
Directory structure (new under `src/components/campaign/`):
```
campaign/
  wizard/
    CampaignWizardShell.tsx
    WizardStepGoal.tsx
    WizardStepPattern.tsx
    WizardStepTargeting.tsx
    WizardStepReview.tsx
  pipeline/
    PipelineBar.tsx
    PipelinePhaseCard.tsx
  kpi/
    KpiGrid.tsx
    KpiCard.tsx
  funnel/
    FunnelSnapshot.tsx
    FunnelStage.tsx
  recommendations/
    RecommendationPanel.tsx
    RecommendationItem.tsx
  classification/
    ClassificationBuckets.tsx
    BucketCard.tsx
  warnings/
    WarningDistribution.tsx
    WarningBar.tsx
    WarningPills.tsx
  momentum/
    MomentumPanel.tsx
    MoverList.tsx
    Histogram.tsx
  config/
    ConfigSummaryPanel.tsx
  layout/
    CampaignExperiencePage.tsx
```
State & data layer:
- Use existing generated RTK Query API slice in `src/store/api/campaignApi.ts` (regenerate after spec update). Add endpoints: createCampaignWithPattern (extended), getCampaignFunnel, getCampaignMetrics, getCampaignRecommendations, getCampaignClassifications, getCampaignWarnings (if separate), getCampaignMomentum, duplicateCampaign.
- SSE Hook: `useCampaignPhaseStream(campaignId)` connecting to existing `/api/v2/sse/campaigns/{id}` endpoint. Normalizes events into local Zustand or RTK slice for phase statuses.
- Derived selectors compute overall pipeline completion (all phases done) and feed into KPI recalculation triggers.
Styling:
- Adopt CSS variables enumerated in prototype into global theme (map to existing Tailwind tokens in `tailwind.config.ts`). Place root variable injection in `src/styles/globals.css`.
Accessibility:
- All interactive elements (wizard navigation, phase cards) implement aria labels and focus ring consistent with prototype focus spec (outline via box-shadow). Progress bars expose `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax=100`.
Error & Loading Handling:
- Each data panel renders skeleton variant (same dimensions) for first load; SSE connection errors show unobtrusive inline badge with retry action using existing `ProgressChannel` fallback mechanisms.

## 4. Backend / Contract Changes
Endpoints (OpenAPI modifications):
1. Extend `POST /api/v2/campaigns` request body with `patternConfig` object: `{ type, constant, variableLength, charset, targetDomains, tlds[], keywordSetIds[], personaIds[], crawlDepth }` and `projectionEstimate` optional within existing `configuration` JSONB field.
2. `GET /api/v2/campaigns/{id}/status` include array of phases `[ { key, status, progressPercentage, startedAt?, completedAt? } ]` plus overallProgress computed from existing `PhaseExecution` entities.
3. New `GET /api/v2/campaigns/{id}/funnel` → `{ generated, dnsValid, httpValid, keywordHits, analyzed, highPotential, leads }` computed from existing domain status aggregates.
4. New `GET /api/v2/campaigns/{id}/metrics` → `{ highPotential, leads, keywordCoveragePct, avgRichness, warningRatePct, medianGain, stuffing, repetition, anchor, totalAnalyzed }` (single source for KPI + warnings) derived from existing `DomainAnalysisFeatures`.
5. New `GET /api/v2/campaigns/{id}/classifications?limit=5` → counts + `samples: { bucket, domains:[{domain, richness}] }[]` using existing richness score classification thresholds.
6. New `GET /api/v2/campaigns/{id}/momentum` → `{ moversUp:[{domain, delta}], moversDown:[{domain, delta}], histogram:[int,int,int,int,int] }` computed from richness score deltas.
7. New `GET /api/v2/campaigns/{id}/insights/recommendations` → array with `{ id, message, rationaleCode, severity }` based on funnel conversion rates and warning thresholds.
8. New `POST /api/v2/campaigns/{id}/duplicate` → clones campaign with identical config, new id, status draft.
9. Enhance existing SSE `GET /api/v2/sse/campaigns/{id}` → add `event: phaseUpdate` data lines with phase progress deltas.

Model Persistence:
- Store normalized pattern config & initial projection inside existing `CampaignResponse.configuration` JSONB column.
- Add table or enrichment process for domain richness snapshots (momentum) if not already available in existing domain features.
- Add composite indexes for momentum queries: `(campaign_id, updated_at)` on domain analysis results.

Performance:
- Metrics & funnel endpoints use single SELECT with conditional aggregates from existing domain status tables; ensure query plan under 50ms for 10k domains (validate with EXPLAIN ANALYZE).
- Momentum computation runs incremental: on domain analysis update, write to rolling window table capturing previous richness (maintain last two snapshots only) or compute on-the-fly from existing analysis timestamps.

OpenAPI Tasks:
- Update modular spec fragments in `backend/openapi/paths/campaigns/`; enforce explicit operationId naming: `CreateCampaignWithPattern`, `GetCampaignFunnel`, etc.
- Regenerate server + client types using existing `oapi-codegen.yaml`. Remove any `interface{}` response wrappers in new endpoints (use concrete structs or `json.RawMessage`).

SSE Implementation:
- Reuse existing SSE service in `backend/internal/services/`. Add broadcaster keyed by campaign id with subscription fanout. Emit events only on progress delta ≥1% or state transition using existing phase execution update flows.

## 5. Migration & Decommission
Remove / Delete:
- Legacy campaign creation form components (`src/app/campaigns/new/legacy` route and associated components) once wizard ships (guard behind feature flag `ENABLE_NEW_CAMPAIGN_WIZARD` for one release; then remove flag & old components in same sprint).
- Polling interval code in `src/services/campaignMetrics/progressChannel.ts` replaced by SSE hook (remove fallback polling after SSE stability validation).
- Redundant feature flags controlling partial extraction UI surfaces (`NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2`, `NEXT_PUBLIC_SHOW_LEGACY_DOMAINS_TABLE`) replaced by unified experience flag above (final removal after one release with metrics validation).
- Legacy status polling hooks in `src/lib/hooks/useCampaignState.ts` (mutation-heavy approach) replaced by SSE-driven state management.
- Obsolete markdown placeholder docs replaced by this comprehensive plan.

Feature Flag Strategy:
- Single flag `ENABLE_UNIFIED_CAMPAIGN_EXPERIENCE` controls entire refactored experience.
- Default disabled for initial rollout; gradual rollout to 10% → 50% → 100% over 3 releases.
- Existing Phase 1/2 flags (`CAMPAIGN_WIZARD_V1`, `CAMPAIGN_OVERVIEW_V2`) deprecated after unified experience reaches 100%.

Legacy Route Preservation:
- Maintain `/campaigns/new/legacy` route for 2 releases post-launch for emergency fallback.
- Maintain existing domains table view as fallback under advanced settings during transition.

## 6. Telemetry & Metrics Integration
Warning Rates:
- Track stuffing penalty rate (domains with `stuffing_penalty > 0` / total analyzed) via existing `DomainAnalysisFeatures.richness.stuffing_penalty`.
- Track repetition index distribution via existing `repetition_index` field.
- Track anchor share warnings via existing `anchor_share` field above threshold (>0.8).

Richness Deltas:
- Capture richness score changes between analysis cycles from existing `DomainAnalysisFeatures.richness.score`.
- Momentum movers computed from richness delta percentiles (top 10% up, bottom 10% down).

Classification Buckets:
- Use existing richness score thresholds: highPotential (>0.8), emerging (0.6-0.8), atRisk (0.4-0.6), leadCandidate (0.2-0.4), lowValue (<0.2).
- Count distribution from existing domain analysis results.

Data Model References:
- Campaign model fields: Use existing `CampaignState.currentState` for CurrentPhaseID mapping, `PhaseExecution` entities for phase progress tracking.
- Computed fields: `OverallProgress` derived from phase completion percentages, `CompletedPhases` count from completed `PhaseExecution` entities.
- JSONB result blobs: Existing `CampaignResponse.configuration` for campaign setup, `DomainAnalysisFeatures` for analysis results, `PhaseExecution.metrics` for phase-specific data.

## 7. Risk & Mitigation
Performance Risks:
- **Risk**: New aggregation endpoints slow down campaign detail page loads.
- **Mitigation**: Implement 30s TTL caching keyed by campaign ID; use existing domain status counters table for fast lookups; validate query performance with EXPLAIN ANALYZE before deployment.

Data Consistency Risks:
- **Risk**: SSE events may be lost during network interruptions.
- **Mitigation**: Existing `ProgressChannel` implements polling fallback; maintain this safety net; add heartbeat mechanism for connection health.

User Experience Risks:
- **Risk**: Users lose access to familiar legacy UI during transition.
- **Mitigation**: Gradual feature flag rollout with emergency fallback routes; maintain `/campaigns/new/legacy` for 2 releases; comprehensive UAT before each rollout phase.

Backend Load Risks:
- **Risk**: New momentum computation creates database performance bottleneck.
- **Mitigation**: Implement incremental computation using existing analysis timestamps; cap historical window to 48 hours; use read replicas for analytics queries.

## 8. Non‑Goals
Live Configuration Editing:
- Pattern editing after campaign launch is explicitly out of scope; campaigns remain immutable post-creation for data integrity.
- Edit pattern button in Config Summary links to duplicate workflow instead of in-place mutation.

Advanced Analytics:
- Machine learning recommendations beyond deterministic rule-based heuristics are deferred to future phases.
- Custom funnel stage definitions beyond the standard 7-stage pipeline are not supported.

Mobile Optimization:
- Responsive design focuses on desktop-first experience; mobile optimization deferred to dedicated mobile phase.

Historical Trend Analysis:
- Multi-campaign comparison and historical trending beyond current momentum view are out of scope.

## 9. Definition of Done

### Acceptance Criteria per Feature Slice:

**Campaign Wizard:**
- [ ] All 4 steps (Goal, Pattern, Targeting, Review) function with form validation
- [ ] Navigation between steps preserves state and validates required fields
- [ ] Review step displays complete configuration summary
- [ ] Launch creates campaign with extended configuration schema
- [ ] Legacy form remains accessible via `/campaigns/new/legacy` route

**Live Pipeline Bar:**
- [ ] Displays 5 phases (generation, dns, http, analysis, leads) with current status
- [ ] Updates in real-time via SSE connection with <2s latency
- [ ] Shows progress percentage for active phases
- [ ] Handles connection errors gracefully with polling fallback
- [ ] Accessible with proper ARIA labels for screen readers

**KPI Grid:**
- [ ] Displays 6 core metrics with proper formatting (numbers, percentages, currency)
- [ ] Updates automatically when underlying campaign data changes
- [ ] Shows trend indicators (up/down/stable) where applicable
- [ ] Renders skeleton states during initial load
- [ ] Handles zero/null data states gracefully

**Funnel Snapshot:**
- [ ] Shows 7-stage conversion funnel with counts and percentages
- [ ] Visual bars accurately represent proportional conversion rates
- [ ] Links to detailed views where applicable
- [ ] Updates in sync with pipeline progress
- [ ] Responsive layout maintains readability

**Recommendation Engine:**
- [ ] Generates contextual suggestions based on campaign performance
- [ ] Dismissible recommendations with ephemeral state
- [ ] Severity-based styling (info/warn/action)
- [ ] Shows "all clear" state when no issues detected
- [ ] Rationale codes available for audit/debugging

**Classification Buckets:**
- [ ] Displays domain distribution across 6 quality buckets
- [ ] Shows top 5 sample domains per bucket
- [ ] Color-coded visualization with clear legends
- [ ] Drill-down capability to full domain lists
- [ ] Real-time updates as analysis progresses

**Warning Distribution:**
- [ ] Aggregates stuffing, repetition, anchor warnings with counts
- [ ] Generates narrative summary of warning patterns
- [ ] Visual distribution via bars/pills with percentages
- [ ] Links to affected domain lists for investigation
- [ ] Updates as warning analysis completes

**Momentum & Movers:**
- [ ] Top 10 domains with highest positive richness delta
- [ ] Top 10 domains with highest negative richness delta
- [ ] Histogram showing richness delta distribution across 5 buckets
- [ ] Historical comparison (current vs previous analysis cycle)
- [ ] Export capability for further analysis

**Config Summary:**
- [ ] Immutable display of campaign configuration
- [ ] Pattern, targeting, persona, keyword set details
- [ ] Duplicate button creates new campaign with identical config
- [ ] Edit pattern button links to duplicate workflow
- [ ] Creation timestamp and initial projections

### Sequenced Merge Strategy:

**Phase A: Foundation (Week 1-2)**
- [ ] Backend API endpoints (funnel, metrics, classifications, momentum, recommendations)
- [ ] OpenAPI specification updates and client regeneration
- [ ] SSE enhancement for phase update events
- [ ] Database performance validation and indexing

**Phase B: Core Components (Week 3-4)**
- [ ] Campaign wizard implementation with routing
- [ ] Live pipeline bar with SSE integration
- [ ] KPI grid with metrics calculation
- [ ] Basic error handling and loading states

**Phase C: Advanced Insights (Week 5-6)**
- [ ] Funnel snapshot visualization
- [ ] Classification buckets with sample data
- [ ] Warning distribution analysis
- [ ] Momentum & movers computation

**Phase D: Intelligence Layer (Week 7-8)**
- [ ] Recommendation engine implementation
- [ ] Config summary with actions
- [ ] Campaign experience page layout integration
- [ ] Feature flag implementation

**Phase E: Migration & Polish (Week 9-10)**
- [ ] Legacy component decommission
- [ ] Performance optimization and caching
- [ ] Accessibility compliance validation
- [ ] Comprehensive testing and UAT

### Objective Verifiable Checks:

**Performance Benchmarks:**
- [ ] Campaign detail page loads in <3s for campaigns with 50k+ domains
- [ ] Metrics endpoints respond in <500ms with 30s cache hit
- [ ] SSE events delivered with <2s latency during active processing
- [ ] No memory leaks during 24hr continuous operation

**Quality Gates:**
- [ ] 90%+ test coverage for new components and services
- [ ] Zero ESLint/TypeScript errors in new code
- [ ] Lighthouse accessibility score >95 for new pages
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

**User Experience Validation:**
- [ ] 95%+ of UAT participants complete wizard flow without assistance
- [ ] Average time to create campaign reduces by 40% vs legacy form
- [ ] Zero critical usability issues identified in moderated testing
- [ ] Feature adoption >80% within 30 days of 100% rollout

**System Integration:**
- [ ] Backend API backward compatibility maintained for existing clients
- [ ] SSE service handles 100+ concurrent campaign streams without degradation
- [ ] Database query performance meets <50ms target for aggregation endpoints
- [ ] Feature flags enable smooth rollout without service interruption

**Monitoring & Observability:**
- [ ] Campaign creation success rate tracked and alerting configured
- [ ] SSE connection health metrics with threshold-based alerts
- [ ] API endpoint response time monitoring with P95/P99 tracking
- [ ] User journey funnel tracking from wizard start to campaign launch

This comprehensive plan provides concrete, implementation-ready specifications for transforming the approved HTML prototype into a production-ready unified campaign experience while maintaining system reliability and user experience quality throughout the transition.