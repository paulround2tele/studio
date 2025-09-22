# Extraction Analysis Backend Implementation Guide

## Overview

This document provides a comprehensive guide to the new modular extraction-analysis backend system implemented as part of the DomainFlow Studio refactor. The system separates feature extraction from analysis to improve scalability, maintainability, and observability.

## Architecture Components

### 1. Core Tables

#### domain_extraction_features
Primary table for storing extracted features and metadata:

```sql
CREATE TABLE domain_extraction_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES generated_domains(id),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id),
    domain_name TEXT,
    processing_state extraction_processing_state NOT NULL DEFAULT 'pending',
    
    -- HTTP Metrics
    http_status TEXT,
    http_status_code INT,
    fetch_time_ms INT,
    content_bytes INT,
    
    -- Feature Extraction Results  
    kw_unique_count INT,
    kw_total_occurrences INT,
    kw_weight_sum DOUBLE PRECISION,
    content_richness_score DOUBLE PRECISION,
    
    -- Microcrawl Features
    microcrawl_enabled BOOLEAN,
    microcrawl_gain_ratio DOUBLE PRECISION,
    
    -- Scoring Integration
    is_stale_score BOOLEAN DEFAULT FALSE,
    scoring_profile_snapshot_id UUID,
    feature_vector JSONB,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### domain_extracted_keywords  
Detailed keyword storage for advanced analysis:

```sql
CREATE TABLE domain_extracted_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES generated_domains(id),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id),
    
    keyword_id TEXT NOT NULL,
    keyword_text TEXT NOT NULL,
    frequency INT NOT NULL DEFAULT 0,
    weight DOUBLE PRECISION,
    source_type TEXT, -- 'title', 'h1', 'body', 'microcrawl'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(domain_id, keyword_id)
);
```

#### scoring_profile_snapshots
Versioned scoring configurations for stale detection:

```sql
CREATE TABLE scoring_profile_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES lead_generation_campaigns(id),
    profile_version INTEGER NOT NULL,
    scoring_configuration JSONB NOT NULL,
    feature_weights JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Processing States

The extraction pipeline uses the following states:

- **pending**: Domain queued for extraction
- **building**: Extraction in progress  
- **ready**: Extraction complete, ready for analysis
- **error**: Extraction failed
- **stale**: Score is outdated, needs re-scoring

### 3. Key Services

#### SnapshotService
Manages scoring profile snapshots and stale score detection:

```go
// Create new snapshot
snapshot, err := snapshotService.CreateSnapshot(ctx, campaignID, config)

// Mark domains stale
affected, err := snapshotService.MarkDomainsStale(ctx, campaignID, snapshotID)

// Get active snapshot
active, err := snapshotService.GetActiveSnapshot(ctx, campaignID)
```

#### StorageOptimizationService  
Handles keyword pruning and storage optimization:

```go
// Measure storage growth
stats, err := storageService.MeasureStorageGrowth(ctx, campaignID)

// Apply pruning policy
pruned, err := storageService.ApplyPruningPolicy(ctx, campaignID, policy)

// Compress archived campaign
compression, err := storageService.CompressArchivedCampaign(ctx, campaignID)
```

#### EventBroadcaster
Manages phase events and real-time updates:

```go
// Create and emit event
event := CreatePhaseEvent(campaignID, EventTypePhaseStart, PhaseExtraction, SubStepHTTPFetch, StatusRunning)
err := EmitPhaseEvent(ctx, event)

// Register SSE handler
broadcaster.AddHandler(sseHandler)
```

## Integration Points

### 1. Analysis Service Integration

The analysis service reads from the new tables via the `analysis_ready_features` view:

```sql
CREATE VIEW analysis_ready_features AS
SELECT 
    def.campaign_id,
    def.domain_id,
    gd.domain_name,
    def.kw_unique_count,
    def.kw_total_occurrences,
    def.content_richness_score,
    def.feature_vector
FROM domain_extraction_features def
JOIN generated_domains gd ON gd.id = def.domain_id
WHERE def.processing_state = 'ready'
  AND def.feature_vector IS NOT NULL;
```

### 2. Feature Vector Governance

All feature vectors are validated against the allowed keys registry:

```go
var AllowedFeatureKeys = map[string]struct{}{
    "kw_unique":             {},
    "kw_hits_total":         {},
    "content_bytes":         {},
    "richness":              {},
    "microcrawl_gain_ratio": {},
    "parked_confidence":     {},
}

// Validation function
err := ValidateFeatureVector(featureVector)
```

### 3. Microcrawl Integration

Adaptive microcrawl is triggered based on content analysis:

```go
// Check if microcrawl should run
shouldCrawl := AdaptiveMicrocrawlGate(baseFeatures, params)

if shouldCrawl {
    // Execute microcrawl
    crawler := NewHTTPMicrocrawler()
    result, keywords, err := crawler.Crawl(ctx, domainURL, budgetPages)
}
```

## Monitoring and Metrics

### Key Metrics

**Extraction Pipeline:**
- `extraction_step_duration_seconds` - Latency per sub-step
- `extraction_domain_total_duration_seconds` - End-to-end timing
- `extraction_processing_states_total` - State distribution

**Storage Optimization:**
- `extraction_storage_growth_bytes` - Storage usage by campaign
- `extraction_keywords_pruned_total` - Pruning effectiveness
- `extraction_compression_ratio` - Archive compression results

**Governance:**
- `extraction_governance_violations_detected_total` - Violation counts
- `extraction_governance_lint_duration_seconds` - Governance overhead

### Dashboards

Create Grafana dashboards monitoring:

1. **Extraction Performance**
   - Processing latency by sub-step
   - Throughput (domains/second)
   - Error rates by phase

2. **Storage Health**
   - Storage growth trends
   - Pruning effectiveness
   - Compression ratios

3. **Governance Compliance**
   - Feature vector violations
   - Compliance trends
   - Policy effectiveness

## Operational Procedures

### 1. Re-scoring Campaigns

Use the enhanced CLI for batch re-scoring:

```bash
# Re-score with current snapshot
./bin/rescore_stale -campaign=<uuid> -stale-only=true -batch-size=100

# Force re-score all domains
./bin/rescore_stale -campaign=<uuid> -stale-only=false -batch-size=50

# Dry run to estimate impact
./bin/rescore_stale -campaign=<uuid> -dry-run=true
```

### 2. Storage Optimization

Monitor and optimize storage usage:

```bash
# Check storage recommendations
curl /api/v2/campaigns/<id>/storage/recommendations

# Trigger manual optimization
curl -X POST /api/v2/campaigns/<id>/storage/optimize
```

### 3. Governance Monitoring

The governance scheduler runs automatically, but can be triggered manually:

```bash
# Immediate governance check
curl -X POST /api/v2/admin/governance/check

# Check scheduler status  
curl /api/v2/admin/governance/status
```

## Configuration

### Environment Variables

**Microcrawl Configuration:**
- `MICROCRAWL_STOP_RICHNESS=0.72` - Richness threshold
- `MICROCRAWL_BUDGET_PAGES=3` - Maximum pages per domain
- `MICROCRAWL_TIMEOUT_SECONDS=10` - HTTP timeout

**Storage Optimization:**
- `STORAGE_PRUNING_ENABLED=true` - Enable automatic pruning
- `STORAGE_MAX_KEYWORDS_PER_DOMAIN=500` - Keyword limit
- `STORAGE_OPTIMIZATION_INTERVAL=24h` - Optimization frequency

**Governance:**
- `GOVERNANCE_SCHEDULE_INTERVAL=1h` - Check frequency
- `GOVERNANCE_VIOLATION_LIMIT=100` - Alert threshold

**Feature Flags:**
- `EXTRACTION_FEATURE_TABLE_ENABLED=true` - Enable new tables
- `RICHNESS_V2_ENABLED=true` - Use enhanced richness calculation
- `RICHNESS_V2_CANARY_DIFF=true` - Compare legacy vs new

## Performance Optimization

### Indexing Strategy

Critical indexes for performance:

```sql
-- Analysis reads
CREATE INDEX idx_analysis_ready_features_campaign_ready
    ON domain_extraction_features (campaign_id, processing_state)
    WHERE processing_state = 'ready' AND feature_vector IS NOT NULL;

-- Momentum queries  
CREATE INDEX idx_domain_extraction_features_momentum
    ON domain_extraction_features (campaign_id, updated_at DESC)
    WHERE processing_state = 'ready';

-- Stale score detection
CREATE INDEX idx_domain_extraction_features_stale
    ON domain_extraction_features (campaign_id, is_stale_score, updated_at)
    WHERE is_stale_score = TRUE;
```

### Query Optimization

**Batch Operations:**
- Use batch sizes of 100-500 for bulk operations
- Implement offset-based pagination for large datasets
- Use prepared statements for repeated queries

**Feature Aggregation:**
- Cache aggregated results with 30s TTL
- Use materialized views for complex aggregations
- Implement read replicas for analysis queries

## Troubleshooting

### Common Issues

**High Extraction Latency:**
1. Check microcrawl gate effectiveness
2. Monitor HTTP timeout configuration
3. Review keyword extraction complexity

**Storage Growth:**
1. Verify pruning policies are running
2. Check keyword density per domain  
3. Monitor compression effectiveness

**Stale Score Detection:**
1. Verify snapshot creation triggers
2. Check scoring profile versioning
3. Monitor re-scoring job performance

### Debugging Tools

**Metrics Queries:**
```promql
# Average extraction time
rate(extraction_step_duration_seconds_sum[5m]) / rate(extraction_step_duration_seconds_count[5m])

# Storage growth rate
increase(extraction_storage_growth_bytes[1h])

# Violation trends
increase(extraction_governance_violations_detected_total[1d])
```

**Database Queries:**
```sql
-- Check extraction state distribution
SELECT processing_state, COUNT(*) 
FROM domain_extraction_features 
WHERE campaign_id = ? 
GROUP BY processing_state;

-- Find domains with violations
SELECT domain_name, feature_vector
FROM domain_extraction_features 
WHERE feature_vector ? 'invalid_key';

-- Storage usage by campaign
SELECT campaign_id, 
       COUNT(*) as domains,
       AVG(array_length(string_to_array(feature_vector::text, ','), 1)) as avg_features
FROM domain_extraction_features 
GROUP BY campaign_id;
```

## Migration Guide

### From Legacy System

1. **Dual-Read Phase:**
   - Enable `EXTRACTION_FEATURE_TABLE_ENABLED=true`
   - Monitor dual-read metrics for consistency
   - Validate results match legacy system

2. **Gradual Cutover:**
   - Route new campaigns to new system
   - Migrate existing campaigns in batches
   - Maintain legacy fallback capability

3. **Cleanup:**
   - Remove legacy extraction code
   - Archive old feature_vector columns  
   - Update documentation and runbooks

## Future Enhancements

### Planned Improvements

1. **Advanced Microcrawl:**
   - ML-based content relevance scoring
   - Dynamic budget allocation
   - Link graph analysis

2. **Enhanced Storage:**
   - Columnar storage for keywords
   - Automatic partitioning by campaign age
   - Intelligent archival policies

3. **Real-time Analysis:**
   - Streaming feature extraction
   - Incremental scoring updates
   - Real-time recommendation engine

### Extension Points

The architecture supports future enhancements through:

- Plugin-based extraction steps
- Configurable feature vector schemas  
- Custom pruning policies
- External event integrations

## Support and Resources

**Documentation:**
- [Architecture Decision Records](./extraction-analysis-adrs.md)
- [OpenAPI Specification](../backend/openapi/dist/openapi.yaml)
- [Database Schema](../backend/database/schema.sql)

**Monitoring:**
- Grafana Dashboard: Extraction Performance
- PagerDuty: Critical Alerts
- Prometheus: Raw Metrics

**Team Contacts:**
- Backend Team: extraction-backend@domainflow.com
- Infrastructure: infra@domainflow.com  
- Monitoring: sre@domainflow.com