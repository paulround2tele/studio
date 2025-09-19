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
When enabled, the analysis service will read feature and keyword data from the new `domain_extraction_features` and `domain_extracted_keywords` tables. The system will fall back to legacy `feature_vector` data if new table data is not available.

**Usage**:
```go
var features *FeatureData
if featureflags.IsAnalysisReadsFeatureTableEnabled() {
    features, err = analysisService.LoadFeaturesFromNewTables(ctx, domainID)
    if err != nil || features == nil {
        // Fallback to legacy
        features, err = analysisService.LoadFeaturesFromLegacy(ctx, domainID)
    }
} else {
    features, err = analysisService.LoadFeaturesFromLegacy(ctx, domainID)
}
```

**Dependencies**: Requires `EXTRACTION_FEATURE_TABLE_ENABLED` and optionally `EXTRACTION_KEYWORD_DETAIL_ENABLED`  
**Rollback**: Set to `false` to read from legacy sources only

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

### DUAL_READ_VARIANCE_THRESHOLD

**Purpose**: Controls the variance threshold for dual-read comparison metrics between legacy and new feature vectors.

**Type**: Float (0.0 to 1.0)  
**Default**: `0.25` (25% variance threshold)  
**Environment Variable**: `DUAL_READ_VARIANCE_THRESHOLD`  
**Implementation Phase**: Current

**Description**: 
When dual-read mode is enabled (`ANALYSIS_DUAL_READ=true`), this threshold determines when variance between legacy `feature_vector` scores and new `analysis_ready_features` scores is considered "high". Domains with variance ratios at or above this threshold trigger additional logging, metrics, and observability events.

**Usage**:
```go
threshold := featureflags.GetDualReadVarianceThreshold()
varianceRatio := math.Abs(legacyScore-newScore) / math.Max(legacyScore, 1e-9)
if varianceRatio >= threshold {
    // High variance detected - emit metrics and logs
    metrics.highVarianceCounter.Inc()
    logger.Info("high variance domain detected", fields...)
}
```

**Metrics Generated**:
- `analysis_dualread_campaigns_total`: Counter of campaigns rescored with dual read enabled
- `analysis_dualread_domains_compared_total`: Total domains compared between legacy and new paths  
- `analysis_dualread_high_variance_domains_total`: Domains with variance above threshold
- `analysis_dualread_domain_variance`: Histogram of variance ratios per domain

**SSE Events**: Emits `dualread_variance_summary` events with campaign-level variance statistics

**Dependencies**: Used with `ANALYSIS_DUAL_READ=true` environment flag  
**Rollback**: Adjust threshold value or disable dual-read mode entirely

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