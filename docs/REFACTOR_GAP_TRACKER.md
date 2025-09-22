# Refactor Gap Tracker

**Status**: Active Tracking Document  
**Last Updated**: 2025-01-11  
**Purpose**: Single source of truth for all outstanding, in-progress, blocked, and completed tasks required by UX_REFACTOR_PLAN.md and EXTRACTION_ANALYSIS_REDESIGN_PLAN_Version2.md

---

## Update Template

Use this template for all future additions/updates:

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [REF-XXX] | Brief description | Not Started/In Progress/Blocked/Complete | YYYY-MM-DD | YYYY-MM-DD | Person/Tech/Dependency | Brief context |

**Status Values**: 
- **Not Started**: Work not yet begun
- **In Progress**: Actively being developed
- **Blocked**: Waiting on dependency/person/tech
- **Complete**: Fully implemented and merged

---

## Section 1: UX Refactor (Frontend, Flows, UI/UX, API Integration)

### Phase A: Foundation (Backend API Endpoints & Infrastructure)

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [UX-A01] | Extend POST /api/v2/campaigns with patternConfig object | Not Started | | | | Include type, constant, variableLength, charset, targetDomains, tlds[], keywordSetIds[], personaIds[], crawlDepth |
| [UX-A02] | Enhance GET /api/v2/campaigns/{id}/status with phases array | Not Started | | | | Add phases with key, status, progressPercentage, startedAt, completedAt |
| [UX-A03] | New GET /api/v2/campaigns/{id}/funnel endpoint | Not Started | | | | Return generated, dnsValid, httpValid, keywordHits, analyzed, highPotential, leads |
| [UX-A04] | New GET /api/v2/campaigns/{id}/metrics endpoint | Not Started | | | | Return highPotential, leads, keywordCoveragePct, avgRichness, warningRatePct, medianGain, stuffing, repetition, anchor, totalAnalyzed |
| [UX-A05] | New GET /api/v2/campaigns/{id}/classifications endpoint | Not Started | | | | Return counts + sample domains per classification bucket (limit=5) |
| [UX-A06] | New GET /api/v2/campaigns/{id}/momentum endpoint | Not Started | | | | Return moversUp, moversDown arrays and histogram data |
| [UX-A07] | New GET /api/v2/campaigns/{id}/insights/recommendations endpoint | Not Started | | | | Return array with id, message, rationaleCode, severity |
| [UX-A08] | New POST /api/v2/campaigns/{id}/duplicate endpoint | Not Started | | | | Clone campaign with identical config, new id, status draft |
| [UX-A09] | Enhance SSE GET /api/v2/sse/campaigns/{id} with phaseUpdate events | Not Started | | | | Add phase progress delta broadcasting |
| [UX-A10] | OpenAPI specification updates for all new endpoints | Not Started | | | | Update modular spec fragments, enforce explicit operationIds |
| [UX-A11] | Regenerate server + client types with oapi-codegen | Not Started | | | | Remove interface{} wrappers, use concrete structs |
| [UX-A12] | Database performance validation and indexing | Not Started | | | | Ensure <50ms for 10k domains, add composite indexes for momentum |

### Phase B: Core Components (Frontend Implementation)

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [UX-B01] | Create CampaignWizardShell component | Not Started | | | | Main wizard container with 4-step navigation |
| [UX-B02] | Create WizardStepGoal component | Not Started | | | | First step of campaign creation wizard |
| [UX-B03] | Create WizardStepPattern component | Not Started | | | | Pattern configuration step |
| [UX-B04] | Create WizardStepTargeting component | Not Started | | | | Targeting and personas configuration |
| [UX-B05] | Create WizardStepReview component | Not Started | | | | Review and launch step |
| [UX-B06] | Create PipelineBar component | Not Started | | | | Live pipeline with 5 sequential phases |
| [UX-B07] | Create PipelinePhaseCard component | Not Started | | | | Individual phase status cards |
| [UX-B08] | Create KpiGrid component | Not Started | | | | High-level metrics grid display |
| [UX-B09] | Create KpiCard component | Not Started | | | | Individual KPI metric cards |
| [UX-B10] | Implement useCampaignPhaseStream SSE hook | Not Started | | | | Real-time phase updates via SSE |
| [UX-B11] | Update RTK Query API slice for new endpoints | Not Started | | | | Add all new campaign endpoints to API slice |
| [UX-B12] | Basic error handling and loading states | Not Started | | | | Skeleton variants and error recovery |

### Phase C: Advanced Insights Components

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [UX-C01] | Create FunnelSnapshot component | Not Started | | | | 7-stage conversion funnel visualization |
| [UX-C02] | Create FunnelStage component | Not Started | | | | Individual funnel stage representation |
| [UX-C03] | Create ClassificationBuckets component | Not Started | | | | Domain distribution across quality buckets |
| [UX-C04] | Create BucketCard component | Not Started | | | | Individual classification bucket cards |
| [UX-C05] | Create WarningDistribution component | Not Started | | | | Warning analysis and distribution display |
| [UX-C06] | Create WarningBar component | Not Started | | | | Visual warning distribution bars |
| [UX-C07] | Create WarningPills component | Not Started | | | | Warning type indicator pills |
| [UX-C08] | Create MomentumPanel component | Not Started | | | | Top movers and momentum analysis |
| [UX-C09] | Create MoverList component | Not Started | | | | List of top up/down domains |
| [UX-C10] | Create Histogram component | Not Started | | | | Richness delta histogram visualization |

### Phase D: Intelligence Layer

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [UX-D01] | Create RecommendationPanel component | Not Started | | | | Contextual improvement suggestions |
| [UX-D02] | Create RecommendationItem component | Not Started | | | | Individual recommendation display |
| [UX-D03] | Create ConfigSummaryPanel component | Not Started | | | | Campaign configuration summary and actions |
| [UX-D04] | Create CampaignExperiencePage layout | Not Started | | | | Main campaign experience page integration |
| [UX-D05] | Implement recommendation engine backend logic | Not Started | | | | Deterministic rules based on funnel ratios and warnings |
| [UX-D06] | Feature flag implementation (ENABLE_UNIFIED_CAMPAIGN_EXPERIENCE) | Not Started | | | | Single flag controlling entire refactored experience |

### Phase E: Migration & Polish

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [UX-E01] | Legacy component decommission | Not Started | | | | Remove legacy campaign creation form components |
| [UX-E02] | Remove polling interval code in progressChannel.ts | Not Started | | | | Replace with SSE-driven updates |
| [UX-E03] | Remove redundant feature flags | Not Started | | | | Clean up NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2, etc. |
| [UX-E04] | Remove legacy status polling hooks | Not Started | | | | Replace useCampaignState.ts with SSE approach |
| [UX-E05] | Performance optimization and caching | Not Started | | | | 30s TTL caching for metrics endpoints |
| [UX-E06] | Accessibility compliance validation | Not Started | | | | ARIA labels, focus management, screen reader support |
| [UX-E07] | Comprehensive testing and UAT | Not Started | | | | End-to-end testing of complete flow |

---

## Section 2: Extraction/Analysis Backend (Aggregation, Metrics, Data Pipelines, Backend Endpoints)

### Work Package 1: Migrations & Enums

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-01] | Create processing_state enum | Complete | | | | Applied in migration 000055 |
| [EXT-02] | Create domain_extraction_features table | Complete | | | | Core table for canonical feature records |
| [EXT-03] | Create domain_extracted_keywords table | Complete | | | | Detailed keyword storage per domain |
| [EXT-04] | Add basic indexes for performance | Complete | | | | Primary keys and ready state partial index |

### Work Package 2: Feature Struct Builder

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-05] | Implement in-memory feature aggregator | Complete | | | | Sub-steps B-D for richness, top3, signal distribution |
| [EXT-06] | Add HTTP fetch metrics collection | Complete | | | | Timing, status codes, content analysis |
| [EXT-07] | Implement keyword signal aggregation | Complete | | | | Primary parse and keyword extraction |
| [EXT-08] | Add content richness scoring | Complete | | | | Composite scoring algorithm |

### Work Package 3: Upsert Transaction Logic

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-09] | Implement atomic persistence with state transitions | Complete | | | | Upsert logic with processing_state management |
| [EXT-10] | Add reconciliation for failed states | Complete | | | | Atomic upsert + state transitions implemented |

### Work Package 4: Keyword Detail Persistence

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-11] | Implement bulk keyword insert strategy | Complete | | | | Batch processing for keyword details |
| [EXT-12] | Add keyword pruning policies | Complete | | | | Bulk insert scaffold + generation helper |

### Work Package 5: Microcrawl Integration

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-13] | Create adaptive gating interface | In Progress | | | | Stub interface + gating heuristic implemented |
| [EXT-14] | Implement full microcrawl fetch logic | Not Started | | | | Real fetch + incremental keyword merge |
| [EXT-15] | Add microcrawl metrics collection | In Progress | | | | Enrichment wiring pending |

### Work Package 6: Reconciliation Job

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-16] | Implement stuck state healing | Complete | | | | ctid-based stuck row reset logic |
| [EXT-17] | Add error state recovery | Complete | | | | Handle transient failures and retries |

### Work Package 7: Dual-Read Analysis Adapter

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-18] | Create legacy vs new comparison logic | Complete | | | | Variance + per-domain diff logging |
| [EXT-19] | Add metrics counters for differences | Complete | | | | Track scoring deviations |

### Work Package 8: Scoring Profile Snapshotting

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-20] | Implement scoring profile snapshots | In Progress | | | | Snapshot + stale marking logic |
| [EXT-21] | Add stale score detection | In Progress | | | | Precedes full snapshot integration |
| [EXT-22] | Create snapshot persistence model | Not Started | | | | scoring_profile_snapshot_id lifecycle automation |

### Work Package 9: Re-Score CLI / Admin Endpoint

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-23] | Create basic rescore CLI stub | In Progress | | | | Basic CLI structure implemented |
| [EXT-24] | Implement rich rescore CLI with batching | Not Started | | | | Batching, stale domains filter, reporting |
| [EXT-25] | Add force/schedule re-scoring capability | Not Started | | | | Admin interface for re-scoring operations |

### Work Package 10: Metrics & Dashboards

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-26] | Implement Prometheus metrics | Complete | | | | State gauge, dual-read diff counters |
| [EXT-27] | Create Grafana dashboard panels | Complete | | | | Lint job skeleton created |
| [EXT-28] | Add extraction latency monitoring | Not Started | | | | Per sub-step timing histograms |

### Work Package 11: Event Harmonization

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-29] | Implement stable phase events | Not Started | | | | Phase-level events for extraction sub-steps |
| [EXT-30] | Add SSE event broadcasting | Not Started | | | | Integration with campaign phase updates |

### Work Package 12: Storage Optimization

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-31] | Measure storage growth patterns | Not Started | | | | Baseline storage metrics per 1k domains |
| [EXT-32] | Implement keyword pruning policies | Not Started | | | | Low-impact keyword pruning strategies |
| [EXT-33] | Add compression for archived campaigns | Not Started | | | | Long-term storage optimization |

### Work Package 13: Documentation & ADR

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-34] | Move plan to stable docs/ path | In Progress | | | | Consolidation in progress |
| [EXT-35] | Create architecture decision records | Not Started | | | | Formal ADR documentation |
| [EXT-36] | Update API documentation | Not Started | | | | Comprehensive API docs for new endpoints |

### Additional Backend Infrastructure

| Item | Description | Status | Date Started | Date Completed | Blocked By | Notes |
|------|-------------|---------|--------------|----------------|------------|-------|
| [EXT-37] | Feature Vector Governance implementation | In Progress | | | | Registry + lint system being developed |
| [EXT-38] | Add periodic scheduler for governance | Not Started | | | | Violation counter metric automation |
| [EXT-39] | Implement analysis_ready_features view | Not Started | | | | SQL view abstraction for clean analysis reads |
| [EXT-40] | Add composite indexes for momentum queries | Not Started | | | | (campaign_id, updated_at) performance optimization |

---

## Summary Statistics

**UX Refactor Section**: 
- Total Items: 42
- Not Started: 42
- In Progress: 0  
- Blocked: 0
- Complete: 0

**Extraction/Analysis Backend Section**:
- Total Items: 36  
- Not Started: 19
- In Progress: 6
- Blocked: 0
- Complete: 11

**Overall Progress**: 11/78 items complete (14.1%)

---

## Notes for Future Updates

1. **Update Frequency**: This document should be updated in every relevant PR
2. **Status Changes**: Always update date fields when changing status
3. **Dependencies**: Note blocking dependencies in "Blocked By" column
4. **Completion Criteria**: Include commit references or PR numbers for completed items when helpful
5. **Scope Changes**: Add new items as requirements evolve, maintain numbering sequence
6. **Cross-References**: Link to related issues, PRs, or documentation when providing additional context

---

**Next Update**: [To be filled by next contributor]