# Analysis Read Switch Implementation

This document describes the analysis read switch feature that enables the analysis phase to source data from new feature tables instead of legacy `feature_vector` columns.

## Overview

The analysis read switch is a coverage-aware feature toggle that allows seamless migration from legacy feature vectors to new structured feature tables while maintaining system reliability through automatic fallback.

## Key Components

### 1. Feature Flags

- **`ANALYSIS_READS_FEATURE_TABLE`**: Primary enable/disable flag (default: false)
- **`ANALYSIS_FEATURE_TABLE_MIN_COVERAGE`**: Coverage threshold for fallback (default: 0.9)

### 2. Coverage Calculation

The system calculates coverage as:
```
coverage_ratio = ready_feature_rows / expected_domain_count
```

Where:
- `ready_feature_rows`: Count of rows in `analysis_ready_features` table
- `expected_domain_count`: Count of domains in `generated_domains` table
- Small sample guard: Campaigns with <5 domains automatically pass coverage

### 3. Decision Logic

```go
if !flagEnabled {
    return useLegacy("flag_disabled")
}

if hasError {
    return useLegacy("error") 
}

if expectedCount < 5 {
    return useNew("small_sample_override")
}

if coverage >= threshold {
    return useNew("coverage_sufficient")
}

return useLevel("below_coverage")
```

## Metrics

### Prometheus Metrics

- `analysis_feature_table_coverage_ratio{campaign_id}` - Current coverage ratio per campaign
- `analysis_feature_table_fallbacks_total{reason}` - Fallback events by reason (below_coverage, error)
- `analysis_feature_table_primary_reads_total` - Successful new path usage

### Structured Logging

- **Info**: Path selection when using new tables
- **Warn**: Fallback due to insufficient coverage  
- **Error**: Fallback due to database/system errors

### SSE Events

When flag is enabled, emits `analysis_read_switch` events:
```json
{
  "event": "analysis_read_switch",
  "campaignId": "uuid",
  "coverage": 0.85,
  "threshold": 0.9,
  "adopted": false,
  "reason": "below_coverage",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Integration Points

### Analysis Service Flow

1. **Pre-execution**: Initialize read switch metrics
2. **Coverage Check**: Calculate coverage ratio and make decision
3. **Path Selection**: Use new or legacy feature loading
4. **Logging**: Emit structured logs and metrics
5. **SSE Events**: Notify monitoring systems

### Database Queries

**Legacy Path** (existing):
```sql
SELECT domain_name, feature_vector, ... 
FROM generated_domains 
WHERE campaign_id = $1 AND feature_vector IS NOT NULL
```

**New Path**:
```sql
SELECT def.domain_id, gd.domain_name, def.kw_unique_count, ...
FROM analysis_ready_features def
JOIN generated_domains gd ON gd.id = def.domain_id 
WHERE def.campaign_id = $1
```

## Testing

### Unit Tests

- Decision logic permutations (`TestReadPathDecision`)
- Coverage calculation edge cases 
- Feature flag configuration validation
- Service integration testing

### Integration Tests

- Database coverage calculation
- Metrics emission verification
- SSE event generation
- Error handling and fallback

## Deployment Strategy

### Phase 1: Deploy with Flag Disabled
- Deploy code with `ANALYSIS_READS_FEATURE_TABLE=false`
- Monitor metrics registration and baseline functionality
- Validate no regression in existing analysis flow

### Phase 2: Enable on Test Campaigns  
- Set `ANALYSIS_READS_FEATURE_TABLE=true` for specific test campaigns
- Monitor coverage ratios and fallback events
- Verify new path produces equivalent results

### Phase 3: Gradual Rollout
- Increase coverage threshold gradually (`0.9` → `0.8` → `0.7`)
- Monitor system behavior and performance
- Adjust based on production feedback

### Phase 4: Full Migration
- Set `ANALYSIS_FEATURE_TABLE_MIN_COVERAGE=0.0` for permissive mode
- Monitor for 100% new path adoption
- Prepare for legacy path removal in future release

## Troubleshooting

### Low Coverage Issues
- Check feature extraction completion rates
- Verify `analysis_ready_features` table population
- Review extraction pipeline health

### Performance Concerns
- Monitor `analysis_feature_fetch_duration_seconds`
- Compare query performance between paths
- Optimize new table indexes if needed

### Fallback Frequency
- Review `analysis_feature_table_fallbacks_total` metrics
- Investigate specific `reason` labels
- Adjust coverage threshold if appropriate

## Rollback Plan

1. Set `ANALYSIS_READS_FEATURE_TABLE=false`
2. Restart analysis services to clear cached decisions
3. Verify return to legacy path operation
4. Monitor for functionality restoration

The legacy path remains fully functional and unchanged throughout the implementation.