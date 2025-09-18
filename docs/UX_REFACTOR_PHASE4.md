# Phase 4 Integration Guide

This guide explains how to integrate Phase 4 features into existing components and create new enhanced experiences.

## Overview

Phase 4 introduces several powerful new capabilities:

- **Historical Trend Persistence**: Store and display metrics over time
- **Sparkline KPIs**: Mini-charts showing trend data in KPI cards
- **Worker Offload**: Use Web Workers for heavy computations
- **Streaming Reliability**: Enhanced real-time progress with reconnection
- **Advanced Recommendation Scoring**: Weighted, grouped, and prioritized recommendations
- **Debug Diagnostics**: Development tools for metrics inspection
- **Performance Instrumentation**: Timing and performance tracking

## Quick Start

### 1. Enable Phase 4 Features

Add these environment variables to enable Phase 4 features:

```env
# Core Phase 4 Features
NEXT_PUBLIC_ENABLE_TRENDS=true
NEXT_PUBLIC_ENABLE_WORKER_METRICS=true
NEXT_PUBLIC_RECOMMENDATION_SCORING_V2=true
NEXT_PUBLIC_PROGRESS_HEARTBEAT_SECS=45

# Development Features
NEXT_PUBLIC_DEBUG_METRICS_PANEL=false
```

### 2. Basic Integration Example

```tsx
import { EnhancedMetricsProvider, useEnhancedMetricsContext } from '@/hooks/useEnhancedMetricsContext';
import { EnhancedKPICard } from '@/components/refactor/campaign/EnhancedKPICard';

function CampaignDashboard({ campaignId, domains }) {
  return (
    <EnhancedMetricsProvider campaignId={campaignId} domains={domains}>
      <CampaignContent />
    </EnhancedMetricsProvider>
  );
}

function CampaignContent() {
  const { aggregates, hasHistoricalData, recommendations } = useEnhancedMetricsContext();
  
  return (
    <div>
      {/* KPI Card with automatic sparklines */}
      <EnhancedKPICard
        title="Total Domains"
        value={aggregates?.totalDomains || 0}
        campaignId={campaignId}
        metricKey="totalDomains" // Links to historical data
      />
      
      {/* Enhanced recommendations with scoring */}
      {recommendations.map(rec => (
        <div key={rec.id}>
          <h3>{rec.title}</h3>
          <p>{rec.detail}</p>
          <span>Priority: {rec.compositePriority.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}
```

## Feature Integration

### Historical Trends & Sparklines

#### Automatic History Storage

The history store automatically captures snapshots when using `EnhancedMetricsProvider`:

```tsx
// Snapshots are automatically saved when new metrics arrive
const { snapshots, snapshotCount, hasHistoricalData } = useEnhancedMetricsContext();
```

#### Manual History Management

For custom implementations:

```tsx
import { addSnapshot, getSnapshots, clearHistory } from '@/services/campaignMetrics/historyStore';

// Save a snapshot
addSnapshot(campaignId, snapshot, false); // false = not pinned

// Get historical data
const snapshots = getSnapshots(campaignId);

// Pin important snapshots (protected from pruning)
pinSnapshot(campaignId, snapshotId);
```

#### Sparkline Integration

Sparklines automatically appear in `EnhancedKPICard` when:
- `NEXT_PUBLIC_ENABLE_TRENDS=true`
- Campaign has ≥3 historical snapshots
- Valid `metricKey` is provided

```tsx
<EnhancedKPICard
  title="Success Rate"
  value={92.5}
  campaignId="campaign-123"
  metricKey="successRate" // Maps to snapshot.aggregates.successRate
  threshold={90} // Shows threshold line
  invertTrend={false} // false = up is good, true = up is bad
/>
```

### Worker Offload

#### Automatic Activation

Workers automatically activate when:
- Domain count ≥ 4000 (configurable)
- Server metrics are not being used
- `NEXT_PUBLIC_ENABLE_WORKER_METRICS=true`

```tsx
const { workerMetrics } = useEnhancedMetricsContext();

// Check worker status
if (workerMetrics.isUsingWorker) {
  console.log(`Computed in ${workerMetrics.workerTimingMs}ms via worker`);
}
```

#### Manual Worker Usage

For custom implementations:

```tsx
import { useWorkerMetricsFallback } from '@/hooks/useWorkerMetricsFallback';

const {
  result,
  isLoading,
  isUsingWorker,
  timingMs,
  error
} = useWorkerMetricsFallback(domains, {
  threshold: 2000, // Custom threshold
  enabled: true
});
```

### Advanced Recommendation Scoring

#### Automatic Scoring

When `NEXT_PUBLIC_RECOMMENDATION_SCORING_V2=true`, recommendations are automatically:
- Scored with composite priority (severity × impact × recency)
- Grouped by canonical cause
- Filtered by priority threshold (>0.08)
- Sorted by importance

```tsx
const { recommendations, recommendationGroups } = useEnhancedMetricsContext();

recommendations.forEach(rec => {
  console.log(`${rec.title}: ${rec.compositePriority.toFixed(3)}`);
  if (rec.duplicateCount > 1) {
    console.log(`  (${rec.duplicateCount} similar issues merged)`);
  }
});
```

#### Manual Scoring

```tsx
import { scoreAndGroupRecommendations } from '@/services/campaignMetrics/recommendationScoreService';

const groups = scoreAndGroupRecommendations(recommendations, {
  aggregates,
  classification,
  deltas
});

// Get top recommendations
const topRecs = groups
  .filter(g => g.totalPriority > 0.1)
  .map(g => g.mergedRecommendation);
```

### Progress Stream Hardening

#### Enhanced Connection Handling

The new progress channel provides:
- Heartbeat monitoring (45s default)
- Exponential backoff reconnection
- Automatic SSE → polling fallback
- Connection state tracking

```tsx
import { createProgressChannel } from '@/services/campaignMetrics/progressChannel';

const channel = createProgressChannel({
  campaignId,
  onStateChange: (state) => console.log('Connection:', state),
  onProgress: (update) => console.log('Progress:', update),
  onError: (error) => console.error('Stream error:', error)
});

await channel.start();
```

### Debug Panel

#### Enabling Debug Mode

Debug panel can be enabled via:
- Environment: `NEXT_PUBLIC_DEBUG_METRICS_PANEL=true`
- Query param: `?debugMetrics=1`
- Programmatically in development

```tsx
import { MetricsDebugPanel } from '@/components/refactor/campaign/MetricsDebugPanel';

<MetricsDebugPanel
  snapshots={snapshots}
  connectionState="connected"
  lastDeltas={deltas}
  topMovers={movers}
/>
```

### Performance Instrumentation

#### Automatic Performance Tracking

Performance is automatically tracked when using enhanced context:

```tsx
const { performanceMetrics } = useEnhancedMetricsContext();

console.log('Compute time:', performanceMetrics.computeTimeMs);
console.log('Cache hit rate:', performanceMetrics.cacheHitRate);
```

#### Manual Performance Tracking

```tsx
import { mark, measure, timeFunction } from '@/services/campaignMetrics/metricsPerf';

// Manual marking
mark('computation_start');
// ... do work ...
const duration = measure('computation', 'computation_start');

// Function timing
const result = timeFunction('expensive_operation', () => {
  return computeMetrics(domains);
});
```

## Migration from Phase 3

### Context Provider Migration

Replace existing `MetricsProvider` with `EnhancedMetricsProvider`:

```tsx
// Before (Phase 3)
<MetricsProvider campaignId={id} domains={domains}>
  <CampaignOverview />
</MetricsProvider>

// After (Phase 4)
<EnhancedMetricsProvider campaignId={id} domains={domains}>
  <EnhancedCampaignOverview />
</EnhancedMetricsProvider>
```

### KPI Card Migration

Replace basic cards with enhanced versions:

```tsx
// Before
<Card>
  <CardHeader>
    <CardTitle>Total Domains</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl">{aggregates?.totalDomains}</div>
  </CardContent>
</Card>

// After
<EnhancedKPICard
  title="Total Domains"
  value={aggregates?.totalDomains || 0}
  campaignId={campaignId}
  metricKey="totalDomains"
/>
```

### Recommendation Migration

Enhanced recommendations are backward compatible:

```tsx
// Existing recommendation rendering works unchanged
{recommendations.map(rec => (
  <div key={rec.id}>
    <h3>{rec.title}</h3>
    <p>{rec.detail}</p>
    
    {/* New Phase 4 properties */}
    {rec.compositePriority && (
      <span>Priority: {rec.compositePriority.toFixed(3)}</span>
    )}
    {rec.duplicateCount > 1 && (
      <span>({rec.duplicateCount} similar)</span>
    )}
  </div>
))}
```

## Configuration

### Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_TRENDS` | `true` | Enable historical snapshots and sparklines |
| `NEXT_PUBLIC_ENABLE_WORKER_METRICS` | `true` | Use Web Workers for large datasets |
| `NEXT_PUBLIC_DEBUG_METRICS_PANEL` | `false` | Show debug panel |
| `NEXT_PUBLIC_RECOMMENDATION_SCORING_V2` | `true` | Use advanced recommendation scoring |
| `NEXT_PUBLIC_PROGRESS_HEARTBEAT_SECS` | `45` | Heartbeat timeout for progress streams |

### Performance Tuning

#### History Store Configuration

```tsx
import { setMaxSnapshots } from '@/services/campaignMetrics/historyStore';

// Adjust memory usage
setMaxSnapshots(campaignId, 25); // Reduce from default 50
```

#### Worker Threshold

```tsx
// Adjust when workers activate
const workerMetrics = useWorkerMetricsFallback(domains, {
  threshold: 2000 // Lower threshold = more worker usage
});
```

## Best Practices

### 1. Progressive Enhancement

Phase 4 features are designed as progressive enhancements:

```tsx
// Features gracefully degrade when disabled
const { hasHistoricalData, features } = useEnhancedMetricsContext();

return (
  <div>
    <KPICard value={total} />
    {hasHistoricalData && features.enableTrends && (
      <Sparkline values={historicalValues} />
    )}
  </div>
);
```

### 2. Performance Monitoring

Monitor worker and performance metrics:

```tsx
useEffect(() => {
  if (workerMetrics.timingMs > 5000) {
    console.warn('Worker computation took >5s:', workerMetrics.timingMs);
  }
}, [workerMetrics.timingMs]);
```

### 3. Error Handling

All Phase 4 features include error boundaries:

```tsx
const { error, workerMetrics } = useEnhancedMetricsContext();

if (error) {
  return <ErrorFallback error={error} />;
}

if (workerMetrics.workerError) {
  console.warn('Worker failed, using fallback:', workerMetrics.workerError);
}
```

### 4. Development vs Production

Use debug features appropriately:

```tsx
// Debug panel only in development
{process.env.NODE_ENV === 'development' && showDebug && (
  <MetricsDebugPanel {...debugProps} />
)}

// Performance tracking configurable
const enablePerf = process.env.NODE_ENV === 'development' || 
                  process.env.NEXT_PUBLIC_ENABLE_PERF_TRACKING === 'true';
```

## Testing

### Testing Enhanced Components

```tsx
import { render } from '@testing-library/react';
import { EnhancedMetricsProvider } from '@/hooks/useEnhancedMetricsContext';

function renderWithMetrics(component, { campaignId, domains } = {}) {
  return render(
    <EnhancedMetricsProvider 
      campaignId={campaignId || 'test'} 
      domains={domains || []}
    >
      {component}
    </EnhancedMetricsProvider>
  );
}

test('sparklines appear with historical data', () => {
  // Add snapshots to history first
  const { getByRole } = renderWithMetrics(<EnhancedKPICard />);
  // Test sparkline presence
});
```

### Mocking Workers

```tsx
// Mock worker in tests
jest.mock('@/hooks/useWorkerMetricsFallback', () => ({
  useWorkerMetricsFallback: () => ({
    result: mockResult,
    isUsingWorker: false,
    isLoading: false,
    error: null,
    timingMs: 150
  })
}));
```

## Migration Checklist

- [ ] Update environment variables
- [ ] Replace `MetricsProvider` with `EnhancedMetricsProvider`
- [ ] Migrate KPI cards to `EnhancedKPICard`
- [ ] Add sparkline support to dashboards
- [ ] Enable debug panel for development
- [ ] Test worker fallback behavior
- [ ] Update recommendation rendering for new scoring
- [ ] Add performance monitoring
- [ ] Test feature flag combinations
- [ ] Update tests for enhanced context

## Troubleshooting

### Common Issues

1. **Sparklines not appearing**: Check `NEXT_PUBLIC_ENABLE_TRENDS` and ensure ≥3 snapshots exist
2. **Worker not activating**: Verify domain count ≥ threshold and server metrics disabled
3. **Debug panel hidden**: Check feature flag or add `?debugMetrics=1` to URL
4. **Performance degradation**: Monitor worker timing and memory usage
5. **Recommendations empty**: Verify scoring threshold and classification data

### Debug Commands

```tsx
// Check feature flags
console.log(features);

// Check historical data
console.log(`${snapshotCount} snapshots, historical: ${hasHistoricalData}`);

// Check worker status
console.log(`Worker: ${workerMetrics.isUsingWorker}, timing: ${workerMetrics.timingMs}ms`);

// Export debug data
const debugData = exportPerformanceData();
```