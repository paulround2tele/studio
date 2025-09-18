# Feature Flags Documentation

## Overview

This document describes the feature flags used throughout the system for gradual rollouts and A/B testing. Feature flags enable safe deployment of new features and allow for instant rollback if issues arise.

## Extraction → Analysis Redesign Feature Flags

The following feature flags control the phased rollout of the new Extraction → Analysis architecture:

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

### ANALYSIS_READS_FEATURE_TABLE

**Purpose**: Controls whether the analysis phase reads feature data from the new extraction tables instead of the legacy `feature_vector` column.

**Type**: Boolean  
**Default**: `false`  
**Environment Variable**: `ANALYSIS_READS_FEATURE_TABLE`  
**Implementation Phase**: P3

**Description**: 
When enabled AND coverage criteria are satisfied, the analysis service will read feature data from the new `analysis_ready_features` table instead of the legacy `feature_vector` column. The system automatically falls back to legacy data if coverage is below the configured threshold.

**Coverage Logic**:
- Calculates ratio = `ready_feature_rows / expected_domain_count` for the campaign
- Uses small sample guard: campaigns with <5 domains automatically pass coverage check
- Controlled by `ANALYSIS_FEATURE_TABLE_MIN_COVERAGE` (default: 0.9 = 90%)

**Usage**:
```go
// Coverage check and path selection happens automatically in analysis execution
// The decision is logged and emitted via SSE events for monitoring

// Metrics available:
// - analysis_feature_table_coverage_ratio{campaign_id}
// - analysis_feature_table_fallbacks_total{reason}  
// - analysis_feature_table_primary_reads_total
```

**Fallback Scenarios**:
- Flag disabled → Always use legacy path
- Coverage below threshold → Fall back with warning log
- Database error → Fall back with error log
- Small sample override → Use new path regardless of ratio

**Dependencies**: Requires `EXTRACTION_FEATURE_TABLE_ENABLED` and stable feature extraction  
**Rollback**: Set to `false` to read from legacy sources only

**Related Configuration**:
- `ANALYSIS_FEATURE_TABLE_MIN_COVERAGE`: Minimum coverage ratio (0.0-1.0, default: 0.9)

---

### ANALYSIS_FEATURE_TABLE_MIN_COVERAGE

**Purpose**: Sets the minimum coverage ratio required for using new feature tables.

**Type**: Float64  
**Default**: `0.9` (90%)  
**Environment Variable**: `ANALYSIS_FEATURE_TABLE_MIN_COVERAGE`  
**Range**: 0.0 - 1.0 (values outside range are clamped)

**Description**:
Controls the threshold for coverage-based fallback when `ANALYSIS_READS_FEATURE_TABLE` is enabled. If the ratio of ready features to expected domains falls below this threshold, the system automatically falls back to legacy feature vectors.

**Examples**:
- `0.9` → Require 90% coverage (default)
- `0.8` → Require 80% coverage  
- `1.0` → Require 100% coverage (strict)
- `0.0` → Accept any coverage (permissive)

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

**Dependencies**: Requires `ANALYSIS_READS_FEATURE_TABLE` to access detailed extraction data  
**Rollback**: Set to `false` to use standard crawling strategies

---

### ANALYSIS_RESCORING_ENABLED (Future)

**Purpose**: Enables advanced scoring algorithms that leverage detailed extraction data.

**Type**: Boolean  
**Default**: `false`  
**Environment Variable**: `ANALYSIS_RESCORING_ENABLED`  
**Implementation Phase**: P5 (Planned)

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