# Extraction → Analysis Redesign Plan

## Overview

This document outlines the comprehensive redesign of the Extraction and Analysis phases to improve modularity, performance, and maintainability. The redesign introduces dedicated tables for extracted features and keywords, along with feature flags for gradual rollout.

## Motivation

The current architecture combines extraction and analysis logic tightly, making it difficult to:
- Optimize extraction independently of analysis
- Implement feature-specific scoring algorithms
- Cache and reuse extracted data across campaigns
- Provide detailed debugging and observability

## Architecture Changes

### New Database Schema

#### 1. Domain Extraction Features Table
```sql
CREATE TABLE domain_extraction_features (
    id BIGSERIAL PRIMARY KEY,
    domain_id BIGINT NOT NULL REFERENCES generated_domains(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    processing_state processing_state NOT NULL DEFAULT 'pending',
    
    -- Feature extraction results
    title TEXT,
    meta_description TEXT,
    headings JSONB,
    content_length INTEGER,
    language_code VARCHAR(10),
    structured_data JSONB,
    social_signals JSONB,
    technical_metrics JSONB,
    
    -- Processing metadata
    extraction_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    extracted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Domain Extracted Keywords Table
```sql
CREATE TABLE domain_extracted_keywords (
    id BIGSERIAL PRIMARY KEY,
    domain_id BIGINT NOT NULL REFERENCES generated_domains(id) ON DELETE CASCADE,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    processing_state processing_state NOT NULL DEFAULT 'pending',
    
    -- Keyword extraction results
    primary_keywords TEXT[],
    secondary_keywords TEXT[],
    keyword_density JSONB,
    semantic_clusters JSONB,
    sentiment_score DECIMAL(5,3),
    relevance_scores JSONB,
    
    -- Processing metadata
    extraction_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    extracted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. Processing State Enum
```sql
CREATE TYPE processing_state AS ENUM (
    'pending',
    'processing', 
    'completed',
    'failed',
    'skipped'
);
```

### Indexes for Performance

```sql
-- Index for fast lookups by domain and processing state
CREATE INDEX idx_domain_extraction_features_ready 
    ON domain_extraction_features (domain_id) 
    WHERE processing_state = 'completed';

CREATE INDEX idx_domain_extracted_keywords_ready 
    ON domain_extracted_keywords (domain_id) 
    WHERE processing_state = 'completed';

-- Indexes for campaign-level aggregations
CREATE INDEX idx_domain_extraction_features_campaign_state 
    ON domain_extraction_features (campaign_id, processing_state);

CREATE INDEX idx_domain_extracted_keywords_campaign_state 
    ON domain_extracted_keywords (campaign_id, processing_state);
```

## Feature Flags

The redesign introduces four primary feature flags for gradual rollout:

### 1. EXTRACTION_FEATURE_TABLE_ENABLED
- **Purpose**: Controls whether new feature extraction writes to domain_extraction_features table
- **Default**: `false`
- **Phase**: P1 - Feature extraction implementation

### 2. EXTRACTION_KEYWORD_DETAIL_ENABLED
- **Purpose**: Controls whether detailed keyword extraction writes to domain_extracted_keywords table
- **Default**: `false`
- **Phase**: P2 - Keyword extraction enhancement

### 3. ANALYSIS_READS_FEATURE_TABLE
- **Purpose**: Controls whether analysis phase reads from new extraction tables vs legacy feature_vector
- **Default**: `false`
- **Phase**: P3 - Analysis reading migration

### 4. MICROCRAWL_ADAPTIVE_MODE
- **Purpose**: Enables adaptive crawling based on extraction results and site characteristics
- **Default**: `false`
- **Phase**: P4 - Adaptive crawling implementation

### 5. ANALYSIS_RESCORING_ENABLED (Future)
- **Purpose**: Enables new scoring algorithms based on detailed extraction data
- **Default**: `false`
- **Phase**: P5 - Advanced scoring implementation

## Implementation Phases

### Phase P0: Foundation (Current)
**Status**: Implementation in progress
**Scope**: Infrastructure and documentation
- [x] Create comprehensive architecture plan
- [x] Add database migration for new tables and enum
- [x] Document feature flags
- [x] Add placeholder Go constants for feature flags
- [ ] Verify migration and build process

### Phase P1: Feature Extraction Table Integration
**Status**: Planned
**Scope**: Write path for domain features
- [ ] Implement FeatureExtractionService writing to domain_extraction_features
- [ ] Add feature flag EXTRACTION_FEATURE_TABLE_ENABLED
- [ ] Dual-write mode: both legacy feature_vector and new table
- [ ] Add extraction processing state tracking
- [ ] Add retry and error handling logic

### Phase P2: Keyword Extraction Enhancement
**Status**: Planned  
**Scope**: Enhanced keyword processing
- [ ] Implement DetailedKeywordExtractionService
- [ ] Add feature flag EXTRACTION_KEYWORD_DETAIL_ENABLED
- [ ] Write to domain_extracted_keywords table
- [ ] Implement semantic clustering and sentiment analysis
- [ ] Add keyword density calculations

### Phase P3: Analysis Read Migration
**Status**: Planned
**Scope**: Analysis phase reads from new tables
- [ ] Modify AnalysisService to support both read paths
- [ ] Add feature flag ANALYSIS_READS_FEATURE_TABLE
- [ ] Implement data mapping between table schemas
- [ ] Add fallback logic for incomplete extractions
- [ ] Performance testing and optimization

### Phase P4: Adaptive Crawling
**Status**: Planned
**Scope**: Smart crawling based on site characteristics
- [ ] Implement MicrocrawlAdaptiveService
- [ ] Add feature flag MICROCRAWL_ADAPTIVE_MODE
- [ ] Site complexity analysis
- [ ] Dynamic crawl depth adjustment
- [ ] Content-type specific extraction strategies

### Phase P5: Advanced Scoring Integration
**Status**: Planned
**Scope**: New scoring algorithms
- [ ] Implement DetailedScoringService
- [ ] Add feature flag ANALYSIS_RESCORING_ENABLED
- [ ] Feature-weighted scoring algorithms
- [ ] Keyword relevance scoring
- [ ] Technical metrics scoring

### Phase P6: Performance Optimization
**Status**: Planned
**Scope**: Batch processing and caching
- [ ] Implement batch extraction processing
- [ ] Add result caching layer
- [ ] Optimize database queries
- [ ] Add extraction result compression

### Phase P7: Legacy Migration
**Status**: Planned
**Scope**: Migrate off legacy feature_vector
- [ ] Migrate existing feature_vector data to new tables
- [ ] Remove dual-write logic
- [ ] Deprecate feature_vector column
- [ ] Update all read paths to new tables only

### Phase P8: Cleanup and Documentation
**Status**: Planned
**Scope**: Final cleanup
- [ ] Remove legacy extraction code
- [ ] Update API documentation
- [ ] Performance benchmarking
- [ ] Migration guides for deployments

## Migration Strategy

### Data Migration
1. **Phase P1-P3**: Dual-write mode ensures no data loss
2. **Phase P7**: Bulk migration of existing feature_vector data
3. **Rollback**: Feature flags allow instant rollback to legacy behavior

### Performance Considerations
1. **Indexes**: Strategic indexes for common query patterns
2. **Partitioning**: Consider partitioning by campaign_id for large datasets
3. **Archival**: Implement data retention policies for old extractions

### Monitoring and Observability
1. **Metrics**: Track extraction success rates, processing times
2. **Alerts**: Monitor processing_state distribution and error rates
3. **Dashboards**: Campaign-level extraction health monitoring

## Rollback Plan

Each phase can be rolled back via feature flags:
1. **Immediate rollback**: Disable feature flags
2. **Data rollback**: Disable writes to new tables, read from legacy sources
3. **Schema rollback**: Drop new tables and enum (if needed)

## Testing Strategy

### Unit Tests
- Feature extraction service tests
- Keyword extraction algorithm tests
- Scoring algorithm tests
- Feature flag behavior tests

### Integration Tests
- End-to-end extraction pipeline tests
- Database migration tests
- Performance regression tests
- Fallback behavior tests

### Performance Tests
- Extraction throughput benchmarks
- Database query performance tests
- Memory usage profiling
- Concurrent processing tests

## Success Metrics

### Technical Metrics
- Extraction processing time reduction: 30%
- Analysis accuracy improvement: 15%
- Database query performance improvement: 25%
- Feature flag rollout success rate: 99%

### Business Metrics
- Campaign setup time reduction
- Analysis result quality scores
- System reliability metrics
- Developer productivity metrics

## Risk Mitigation

### Data Integrity
- Foreign key constraints ensure referential integrity
- Dual-write mode prevents data loss during migration
- Comprehensive rollback procedures

### Performance
- Gradual feature flag rollout prevents performance regressions
- Strategic indexing optimizes common query patterns
- Query performance monitoring and alerting

### Operational
- Detailed documentation for operations team
- Monitoring dashboards for extraction health
- Automated alerting for processing failures

---

## Appendix

### Database Schema Dependencies
```
campaigns (id) ← domain_extraction_features (campaign_id)
campaigns (id) ← domain_extracted_keywords (campaign_id)
generated_domains (id) ← domain_extraction_features (domain_id)
generated_domains (id) ← domain_extracted_keywords (domain_id)
```

### Feature Flag Dependencies
```
P1: EXTRACTION_FEATURE_TABLE_ENABLED
P2: EXTRACTION_KEYWORD_DETAIL_ENABLED → EXTRACTION_FEATURE_TABLE_ENABLED
P3: ANALYSIS_READS_FEATURE_TABLE → P1, P2
P4: MICROCRAWL_ADAPTIVE_MODE → P3
P5: ANALYSIS_RESCORING_ENABLED → P4
```

### Configuration Examples
```go
// Development configuration
ExtractionFeatureTableEnabled:  true,
ExtractionKeywordDetailEnabled: false,
AnalysisReadsFeatureTable:     false,
MicrocrawlAdaptiveMode:        false,

// Production rollout (Phase P1)
ExtractionFeatureTableEnabled:  true,
ExtractionKeywordDetailEnabled: false,
AnalysisReadsFeatureTable:     false,
MicrocrawlAdaptiveMode:        false,
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-16  
**Next Review**: After Phase P0 completion