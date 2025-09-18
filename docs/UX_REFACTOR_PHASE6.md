# Phase 6 Integration Guide: Predictive Forecasting, Cohort Benchmarking, ML Ranking & Normalization

## Overview

Phase 6 builds on Phases 1-5 by introducing predictive intelligence, comparative analytics, and server-driven canonical services. This phase adds forecasting capabilities, cohort analysis, benchmark normalization, and ML-powered recommendations while maintaining full backward compatibility.

## Quick Start

### 1. Enable Phase 6 Features

Add these environment variables to enable Phase 6 features:

```env
# Phase 6 Core Features
NEXT_PUBLIC_ENABLE_FORECASTS=true
NEXT_PUBLIC_ENABLE_COHORT_COMPARISON=false
NEXT_PUBLIC_ENABLE_NORMALIZATION=false
NEXT_PUBLIC_ENABLE_ML_RECOMMENDATIONS=false

# Phase 6 Forecast Configuration
NEXT_PUBLIC_ENABLE_FORECAST_BANDS=true
NEXT_PUBLIC_FORECAST_HORIZON_DAYS=7
```

### 2. Basic Forecast Integration

```tsx
import { useForecast } from '@/hooks/useForecast';
import { ForecastSparkline } from '@/components/refactor/campaign/ForecastSparkline';

function CampaignOverview({ campaignId, snapshots }) {
  const { forecast, loading, method } = useForecast(campaignId, snapshots);

  return (
    <div>
      <ForecastSparkline
        snapshots={snapshots}
        forecast={forecast}
        metricKey="avgLeadScore"
        forecastMethod={method}
      />
    </div>
  );
}
```

### 3. Cohort Comparison Setup

```tsx
import { useCohortComparison } from '@/hooks/useCohortComparison';
import { CohortComparisonPanel } from '@/components/refactor/campaign/CohortComparisonPanel';

function MultiCampaignAnalysis({ campaigns }) {
  const cohortCampaigns = campaigns.map(c => ({
    campaignId: c.id,
    campaignName: c.name,
    snapshots: c.snapshots
  }));

  return (
    <CohortComparisonPanel campaigns={cohortCampaigns} />
  );
}
```

### 4. Normalization Toggle

```tsx
import { useNormalizationToggle } from '@/hooks/useNormalizationToggle';
import { NormalizationToggle } from '@/components/refactor/campaign/NormalizationToggle';

function MetricsDisplay({ snapshots }) {
  const {
    showNormalized,
    toggleNormalization,
    getDisplaySnapshot,
    loading,
    benchmarkVersion
  } = useNormalizationToggle(snapshots);

  return (
    <div>
      <NormalizationToggle
        showNormalized={showNormalized}
        onToggle={toggleNormalization}
        loading={loading}
        benchmarkVersion={benchmarkVersion}
      />
      
      {snapshots.map(snapshot => {
        const displaySnapshot = getDisplaySnapshot(snapshot);
        return (
          <div key={snapshot.id}>
            Score: {displaySnapshot.aggregates.avgLeadScore}
          </div>
        );
      })}
    </div>
  );
}
```

## Feature Configuration

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_FORECASTS` | `true` | Enable forecast fetching/computation |
| `NEXT_PUBLIC_ENABLE_COHORT_COMPARISON` | `false` | Enable relative day alignment & cohort panel |
| `NEXT_PUBLIC_ENABLE_NORMALIZATION` | `false` | Apply benchmark-based normalization option |
| `NEXT_PUBLIC_ENABLE_ML_RECOMMENDATIONS` | `false` | Prefer server ML recommendations when available |
| `NEXT_PUBLIC_ENABLE_FORECAST_BANDS` | `true` | Show confidence intervals (sparkline shading) |
| `NEXT_PUBLIC_FORECAST_HORIZON_DAYS` | `7` | Default forecast horizon length |

### Performance Tuning

- **Forecast Computation**: Optimized for <25ms (200 points), <60ms (600 points)
- **Worker Offload**: Large datasets (>500 points) automatically use web worker
- **Benchmark Caching**: 6-hour cache with ETag support
- **Telemetry Sampling**: Configurable sampling rate via `NEXT_PUBLIC_METRICS_TELEMETRY_SAMPLING`

## Feature Details

### 1. Predictive Forecasting

#### Server-First Approach
```typescript
// Automatically tries server forecast, falls back to client computation
const { forecast, method } = useForecast(campaignId, snapshots);
// method: 'server' | 'client'
```

#### Client Fallback Methods
- **Simple Exponential Smoothing (SES)**: For general trend forecasting
- **Holt-Winters Additive**: For seasonal patterns (≥14 days data, 7-day season)

#### Confidence Intervals
- 95% confidence bands using residual standard deviation
- Visual representation in sparklines with shaded areas

### 2. Cohort Analysis

#### Time Alignment
```typescript
// Aligns campaigns by relative "day since launch"
const { cohortMatrix } = useCohortComparison(campaigns);
```

#### Features
- **Growth Curves**: Compare metrics across aligned timelines
- **Benchmarks**: P25, P50, P75 percentiles by cohort day
- **Interpolation**: Optional linear interpolation for missing days
- **Matrix Density**: Data quality assessment

### 3. Benchmark Normalization

#### Normalization Methods
- **Baseline**: `normalized = raw / benchmark_p50`
- **Z-Score**: `normalized = (raw - benchmark_mean) / benchmark_std`

#### Raw Value Preservation
```typescript
// Original values always preserved for export
const { showNormalized, getDisplaySnapshot } = useNormalizationToggle(snapshots);
```

### 4. ML Recommendations

#### Server Override
- ML recommendations take precedence (up to 70% of total)
- Local pipeline fills remaining slots
- Version mismatch detection with telemetry

#### Explainability
```typescript
interface MLRecommendation {
  explainability: {
    primary_factors: string[];
    confidence: number;
    model_reasoning: string;
  };
}
```

## API Integration

### Server Endpoints (Optional)

```bash
# Forecast endpoint
GET /api/campaigns/{id}/forecast?horizon=7
# Response: { horizon, generatedAt, method: "server", points: [...] }

# Benchmarks endpoint  
GET /api/benchmarks/metrics
# Response: { version, metrics: { warningRate: { baseline, p50, p90 }, ... } }

# ML Recommendations endpoint
GET /api/campaigns/{id}/recommendations/ml
# Response: { modelVersion, recommendations: [...] }

# Canonical Anomalies endpoint (optional)
GET /api/campaigns/{id}/anomalies
# Response: { anomalies: [...] }
```

### Graceful Degradation
All endpoints degrade gracefully:
- 404/501 responses trigger client fallback
- Network errors logged with telemetry
- Feature flags control fallback behavior

## Export & Data Versioning

### Version 2 Export Format
```typescript
// Includes Phase 6 data
exportSnapshotsJSON(snapshots, campaignId, filename, {
  includeForecast: true,
  includeNormalized: true,
  includeCohorts: true,
  forecastData: { points, method, horizon, generatedAt },
  normalizationData: { benchmarkVersion, normalizedSnapshots, method },
  cohortData: { matrix, campaignNames }
});
```

### Backward Compatibility
```typescript
// Automatically upgrades v1.0 to v2.0 format
const bundle = decodeShareBundleV2(encodedData);
```

## Telemetry Events

Phase 6 adds these telemetry events:

- `forecast_compute`: Forecast timing and method
- `cohort_compare`: Cohort analysis metrics  
- `normalization_applied`: Benchmark usage
- `ml_version_mismatch`: Model version changes

## Troubleshooting

### Common Issues

1. **Forecasts not appearing**: Check minimum 8 snapshots requirement
2. **Cohort panel hidden**: Verify ≥2 campaigns with snapshot data
3. **Normalization not working**: Check benchmark endpoint availability
4. **ML recommendations missing**: Verify server endpoint and model version

### Debug Commands

```tsx
// Check forecast readiness
const readiness = getForecastReadiness(snapshots);
console.log(readiness); // { ready: boolean, reason: string }

// Check cohort readiness  
const cohortReadiness = getCohortReadiness(campaigns);
console.log(cohortReadiness); // { ready: boolean, requiredCampaigns: number }

// Check normalization status
const normReady = getNormalizationReadiness(snapshots);
console.log(normReady); // { ready: boolean, benchmarksRequired: boolean }
```

### Performance Monitoring

```tsx
// Monitor forecast performance
const { timingMs, method } = useForecast(campaignId, snapshots);
console.log(`Forecast: ${method} in ${timingMs}ms`);

// Monitor cohort matrix density
const { matrixDensity } = useCohortComparison(campaigns);
console.log(`Cohort density: ${matrixDensity.toFixed(1)}%`);
```

## Migration from Phase 5

### Backward Compatibility
- All Phase 6 flags default to OFF (except FORECASTS=true)
- Disabling all Phase 6 flags = Phase 5 behavior exactly
- No breaking changes to existing APIs or components

### Incremental Adoption
1. Start with forecasts only: `NEXT_PUBLIC_ENABLE_FORECASTS=true`
2. Add normalization: `NEXT_PUBLIC_ENABLE_NORMALIZATION=true`  
3. Enable cohorts: `NEXT_PUBLIC_ENABLE_COHORT_COMPARISON=true`
4. Integrate ML: `NEXT_PUBLIC_ENABLE_ML_RECOMMENDATIONS=true`

### Data Migration
- No database changes required
- Export/import automatically handles version differences
- Historical data remains unchanged

## Best Practices

### Performance
- Use worker computation for large datasets (enabled automatically)
- Monitor telemetry for performance bottlenecks
- Cache normalization benchmarks appropriately

### User Experience  
- Show forecast method (server/client) for transparency
- Provide confidence intervals for forecast accuracy
- Use normalization toggle to compare raw vs scaled metrics
- Display cohort matrix density for data quality assessment

### Error Handling
- Always provide fallback experiences
- Log server failures with context
- Surface feature availability to users
- Graceful degradation for missing server endpoints