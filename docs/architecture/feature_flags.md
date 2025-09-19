# Feature Flags Documentation

## Overview

This document describes the feature flags used throughout the system for gradual rollouts and A/B testing. Feature flags enable safe deployment of new features and allow for instant rollback if issues arise.

## Consolidated Pipeline Configuration

The system has been consolidated to use a unified extraction/analysis pipeline. The legacy dual-read and variance flags have been removed in favor of a streamlined configuration approach.

### Current Feature Flags

### EXTRACTION_FEATURE_TABLE_ENABLED

**Purpose**: Controls whether new feature extraction logic writes to the `domain_extraction_features` table.

**Type**: Boolean  
**Default**: `false`  
**Environment Variable**: `EXTRACTION_FEATURE_TABLE_ENABLED`  
**Implementation Phase**: P1

**Description**: 
When enabled, the feature extraction service will write detailed extraction results to the new `domain_extraction_features` table in addition to the legacy `feature_vector` column. This enables dual-write mode for safe migration.

**Usage**:
```go
if featureflags.IsExtractionFeatureTableEnabled() {
    // Write to domain_extraction_features table
    err := extractionService.SaveFeatures(ctx, domainID, features)
}
// Continue with legacy feature_vector write
```

**Dependencies**: None  
**Rollback**: Set to `false` to disable writes to new table

---

### EXTRACTION_KEYWORD_DETAIL_ENABLED

**Purpose**: Controls whether enhanced keyword extraction writes detailed results to the `domain_extracted_keywords` table.

**Type**: Boolean  
**Default**: `false`  
**Environment Variable**: `EXTRACTION_KEYWORD_DETAIL_ENABLED`  
**Implementation Phase**: P2

**Description**: 
When enabled, the keyword extraction service will perform detailed semantic analysis and write comprehensive keyword data to the new `domain_extracted_keywords` table. This includes sentiment analysis, semantic clustering, and keyword density calculations.

**Usage**:
```go
if featureflags.IsExtractionKeywordDetailEnabled() {
    // Perform detailed keyword extraction
    keywords := keywordService.ExtractDetailedKeywords(ctx, content)
    err := keywordService.SaveKeywords(ctx, domainID, keywords)
}
```

**Dependencies**: Recommended to enable after `EXTRACTION_FEATURE_TABLE_ENABLED` is stable  
**Rollback**: Set to `false` to disable detailed keyword processing

---

### MICROCRAWL_ADAPTIVE_MODE

**Purpose**: Enables adaptive crawling strategies based on website characteristics and extraction results.

**Type**: Boolean  
**Default**: `false`  
**Environment Variable**: `MICROCRAWL_ADAPTIVE_MODE`  
**Implementation Phase**: P4

**Description**: 
When enabled, the crawling service will analyze website characteristics and adapt crawling depth, strategy, and resource allocation based on site complexity, content type, and previous extraction results.

**Usage**:
```go
if featureflags.IsMicrocrawlAdaptiveModeEnabled() {
    strategy := crawlService.AnalyzeSiteCharacteristics(ctx, domain)
    crawlConfig := crawlService.AdaptCrawlStrategy(strategy)
    results := crawlService.CrawlWithStrategy(ctx, domain, crawlConfig)
} else {
    results := crawlService.StandardCrawl(ctx, domain)
}
```

**Dependencies**: Requires stable feature extraction pipeline  
**Rollback**: Set to `false` to use standard crawling strategies

---

### ANALYSIS_RESCORING_ENABLED

**Purpose**: Enables advanced scoring algorithms that leverage detailed extraction data.

**Type**: Boolean  
**Default**: `false`  
**Environment Variable**: `ANALYSIS_RESCORING_ENABLED`  
**Implementation Phase**: P5

**Description**: 
When enabled, the analysis service will use advanced scoring algorithms that take advantage of the detailed feature and keyword data from the new extraction tables. This enables more sophisticated relevance scoring and feature-weighted analysis.

**Usage**:
```go
if featureflags.IsAnalysisRescoringEnabled() {
    score := scoringService.CalculateAdvancedScore(ctx, features, keywords)
} else {
    score := scoringService.CalculateBasicScore(ctx, featureVector)
}
```

**Dependencies**: Requires all previous flags to be enabled and stable  
**Rollback**: Set to `false` to use legacy scoring algorithms

---

## Consolidated Pipeline Configuration

The unified pipeline uses environment-based configuration instead of feature flags for operational parameters:

| Environment Variable | Default | Purpose |
|---------------------|---------|---------|
| `ANALYSIS_FEATURE_TABLE_MIN_COVERAGE` | 0.9 | Minimum feature coverage ratio for analysis |
| `PIPELINE_RECONCILE_ENABLED` | true | Enable/disable reconciliation process |
| `PIPELINE_RECONCILE_INTERVAL` | 10m | Interval between reconciliation passes |
| `PIPELINE_STUCK_RUNNING_MAX_AGE` | 30m | Max age for running tasks before reset |
| `PIPELINE_STUCK_PENDING_MAX_AGE` | 20m | Max age for pending tasks before reset |
| `PIPELINE_MISSING_FEATURE_GRACE` | 5m | Grace period for feature materialization |
| `PIPELINE_MAX_RETRIES` | 3 | Maximum retry attempts per task |
| `PIPELINE_STALE_SCORE_DETECTION_ENABLED` | true | Enable stale score detection |
| `PIPELINE_STALE_SCORE_MAX_AGE` | 1h | Max age for analysis scores |

### Removed Legacy Flags

The following flags were removed during pipeline consolidation:
- `ANALYSIS_DUAL_READ` - Dual-read comparison mode (replaced by unified pipeline)
- `ANALYSIS_READS_FEATURE_TABLE` - Read path switching (unified pipeline always uses new approach)
- `DUAL_READ_VARIANCE_THRESHOLD` - Variance detection (no longer needed after consolidation)

---

## Legacy Feature Flags

The system also includes existing feature flags for other functionality:

### Existing Flags (from handlers_feature_flags.go)
- `enableRealTimeUpdates`: Controls real-time SSE updates
- `enableOfflineMode`: Enables offline functionality  
- `enableAnalytics`: Controls analytics collection
- `enableDebugMode`: Enables debug logging and diagnostics
- `enableStealth`: Controls stealth crawling capabilities
- `enableStealthForceCursor`: Forces cursor-based pagination in stealth mode

## Feature Flag Management

### Environment Variables
All feature flags are controlled via environment variables. Set the environment variable to `true` to enable a feature, or `false` (or omit) to disable.

Example `.env` configuration:
```bash
# Extraction → Analysis Redesign Flags
EXTRACTION_FEATURE_TABLE_ENABLED=false
EXTRACTION_KEYWORD_DETAIL_ENABLED=false
ANALYSIS_READS_FEATURE_TABLE=false
MICROCRAWL_ADAPTIVE_MODE=false
ANALYSIS_RESCORING_ENABLED=false

# Legacy Flags
ENABLE_REAL_TIME_UPDATES=true
ENABLE_OFFLINE_MODE=false
ENABLE_ANALYTICS=true
ENABLE_DEBUG_MODE=false
ENABLE_STEALTH=true
ENABLE_STEALTH_FORCE_CURSOR=false
```

### Runtime Management
Feature flags can be updated at runtime through the feature flags API endpoint:
- `GET /api/feature-flags` - Retrieve current flag states
- `POST /api/feature-flags` - Update flag states

### Monitoring and Observability
- All feature flag state changes are logged
- Feature flag usage is tracked in application metrics
- Rollback procedures are documented for each flag

## Rollout Strategy

### Phase-based Rollout
1. **Phase P0**: Documentation and infrastructure (no flags active)
2. **Phase P1**: Enable `EXTRACTION_FEATURE_TABLE_ENABLED` in development
3. **Phase P2**: Enable `EXTRACTION_KEYWORD_DETAIL_ENABLED` after P1 is stable
4. **Phase P3**: Enable `ANALYSIS_READS_FEATURE_TABLE` for gradual read migration
5. **Phase P4**: Enable `MICROCRAWL_ADAPTIVE_MODE` for adaptive crawling
6. **Phase P5**: Enable `ANALYSIS_RESCORING_ENABLED` for advanced scoring

### Safety Measures
- All flags default to `false` (disabled)
- Each flag can be independently rolled back
- Comprehensive fallback logic for all new features
- Monitoring and alerting for flag-controlled features

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-16  
**Next Review**: After each phase implementation