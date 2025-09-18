# UX Refactor Phase 3 Implementation

## Overview

Phase 3 builds on Phase 1 (#153) and Phase 2 (#154) to add server metrics integration, delta analytics, real-time progress, and enhanced recommendations. This phase introduces a robust fallback architecture that maintains Phase 2 behavior when server endpoints are unavailable.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side   │    │   UI Layer      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Phase 2 Services│    │ Metrics API     │    │ DeltaBadge      │
│ - Classification│◄───┤ - /metrics      │    │ MoversPanel     │
│ - Aggregation   │    │ - /previous     │    │ LiveProgress    │
│ - Recommendations│   │ - /progress     │    │ Enhanced KPIs   │
│                 │    │                 │    │                 │
│ Phase 3 Services│    │ Progress SSE    │    │ Context Provider│
│ - ServerAdapter │◄───┤ - EventSource   │    │ - Unified Access│
│ - DeltasService │    │ - Polling       │    │ - Performance   │
│ - MoversService │    │                 │    │ - Error Handling│
│ - ProgressStream│    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └──── Graceful Fallback ──┴──── Feature Flags ────┘
```

## Feature Flags

### Server Integration
- `NEXT_PUBLIC_USE_SERVER_METRICS=true` (default: false)
  - Enables server-side metrics fetching
  - Falls back to client computation on error

### Analytics Features  
- `NEXT_PUBLIC_ENABLE_DELTAS=true` (default: true)
  - Shows delta badges and calculations
  - Compares current vs previous snapshots

- `NEXT_PUBLIC_ENABLE_MOVERS_PANEL=true` (default: true)  
  - Displays top domain gainers and decliners
  - Supports synthetic data for initial display

### Real-Time Features
- `NEXT_PUBLIC_ENABLE_REALTIME_PROGRESS=true` (default: false)
  - Enables SSE/polling progress updates
  - Shows live connection status

## Services Architecture

### Server Adapter (`serverAdapter.ts`)
```typescript
// Transform server response to internal format
transformServerResponse(response: ServerMetricsResponse): AggregateSnapshot

// Validate server response structure  
validateServerResponse(response: any): boolean

// Create fallback when server unavailable
createDefaultSnapshot(): AggregateSnapshot
```

**Key Features:**
- Safe field extraction with defaults
- Response validation
- Single-session warning logging
- Extended metrics support

### Deltas Service (`deltasService.ts`)
```typescript
// Calculate deltas between snapshots
calculateDeltas(current: AggregateSnapshot, previous: AggregateSnapshot): DeltaMetrics[]

// Filter by significance thresholds
filterSignificantDeltas(deltas: DeltaMetrics[], minThreshold: number): DeltaMetrics[]

// Create baseline for initial comparison
createBaselineSnapshot(current: AggregateSnapshot): AggregateSnapshot
```

**Key Features:**
- Safe division with zero protection
- Inverted logic for warning metrics (lower = better)
- Configurable significance thresholds
- Synthetic baseline generation

### Movers Service (`moversService.ts`)
```typescript
// Extract top domain movers
extractMovers(current: DomainMetricsInput[], previous: DomainMetricsInput[]): Mover[]

// Group by direction
groupMoversByDirection(movers: Mover[]): { gainers: Mover[], decliners: Mover[] }

// Create demo data when no previous exists
createSyntheticMovers(domains: DomainMetricsInput[]): Mover[]
```

**Key Features:**
- Richness and gain metrics tracking
- Minimum baseline filtering
- Magnitude-based ranking
- Synthetic data generation

### Progress Stream (`progressStream.ts`)
```typescript
// SSE/polling abstraction class
class ProgressStream {
  start(): Promise<void>
  stop(): void
  destroy(): void
}

// Factory functions
createProgressStream(options, callbacks): ProgressStream
createMockProgressStream(options, callbacks): ProgressStream
```

**Key Features:**
- Automatic SSE → polling fallback
- Exponential backoff retry logic
- Terminal phase detection
- Mock implementation for development

## UI Components

### DeltaBadge
**Purpose:** Shows metric changes with directional indicators
**Features:**
- Accessible ARIA labels
- Color-coded directions (green/red/gray)
- Inverted logic for warning metrics
- Multiple size variants
- Formatted value display

### MoversPanel  
**Purpose:** Collapsible list of top domain gainers/decliners
**Features:**
- Grouped by direction (up/down)
- Metric type indicators (richness/gain)
- Collapsible interface
- Demo data badges
- Responsive layout

### LiveProgressStatus
**Purpose:** Real-time progress with connection status
**Features:**
- Animated connection indicators
- Progress statistics
- Estimated time remaining
- Connection error handling
- Last update timestamps

## Enhanced Recommendations

### Delta-Aware Rules
1. **Momentum Loss Detection**
   - Success rate drops > 15%
   - Lead score drops > 20%
   - Severity: warn/action

2. **Surge Detection**  
   - Multiple metrics improving > 10%
   - Recommendation: scale up campaign
   - Severity: info

3. **Stagnation Detection**
   - 5+ metrics flat for established campaigns
   - Recommendation: introduce variation
   - Severity: warn

4. **Warning Rate Spike**
   - Warning rate increases > 25%
   - Recommendation: investigate infrastructure
   - Severity: action

5. **Quality Improvement Trend**
   - Richness and potential both increasing
   - Positive reinforcement
   - Severity: info

## Hook Architecture

### useCampaignServerMetrics
```typescript
useCampaignServerMetrics(campaignId: string, domains: DomainMetricsInput[])
// Returns: server metrics with client fallback
```

### useCampaignDeltas
```typescript
useCampaignDeltas(current, previous, options)
// Returns: { deltas, significantDeltas, isEnabled, hasPreviousData }
```

### useCampaignMovers
```typescript  
useCampaignMovers(currentDomains, previousDomains, options)
// Returns: { movers, grouped, isEnabled, hasMovers }
```

### useCampaignProgress
```typescript
useCampaignProgress(options)
// Returns: { progress, isConnected, stats, controls }
```

### useMetricsContext (Optional)
```typescript
useMetricsContext(): MetricsContextValue
// Unified context for performance optimization
```

## Integration Points

### RTK Query Store Integration
```typescript
// src/store/index.ts
import { serverMetricsApi } from '@/hooks/useCampaignServerMetrics';

[serverMetricsApi.reducerPath]: serverMetricsApi.reducer,
.concat(serverMetricsApi.middleware)
```

### CampaignOverviewV2 Updates
- Wraps components in MetricsProvider  
- Delta badges overlay on KPI cards
- MoversPanel in left column
- LiveProgressStatus at top
- Enhanced recommendations panel
- Development debug panel

## Migration Strategy

### Backward Compatibility
- **Phase 2 behavior preserved** when all flags disabled
- **Graceful degradation** - no breaking changes
- **Progressive enhancement** - features layer on top

### Flag Combinations
```bash
# Phase 2 Mode (all Phase 3 disabled)
NEXT_PUBLIC_USE_SERVER_METRICS=false
NEXT_PUBLIC_ENABLE_DELTAS=false  
NEXT_PUBLIC_ENABLE_MOVERS_PANEL=false
NEXT_PUBLIC_ENABLE_REALTIME_PROGRESS=false

# Full Phase 3 Mode
NEXT_PUBLIC_USE_SERVER_METRICS=true
NEXT_PUBLIC_ENABLE_DELTAS=true
NEXT_PUBLIC_ENABLE_MOVERS_PANEL=true  
NEXT_PUBLIC_ENABLE_REALTIME_PROGRESS=true

# Analytics Only (no server/realtime)
NEXT_PUBLIC_ENABLE_DELTAS=true
NEXT_PUBLIC_ENABLE_MOVERS_PANEL=true
```

## Testing Strategy

### Unit Tests
- `deltasService.test.ts` - Safe math operations, edge cases
- `moversService.test.ts` - Ranking algorithms, noise filtering
- `serverAdapter.test.ts` - Response validation, fallback logic  
- `progressStream.test.ts` - SSE/polling fallback, reconnection

### Integration Tests
- `useCampaignServerMetrics.test.ts` - Server fallback behavior
- `CampaignOverviewV2.integration.test.tsx` - Flag combinations

### E2E Tests
- Server metrics fallback scenarios
- Real-time progress stream functionality
- Delta calculation accuracy
- Movers panel interaction

## Performance Considerations

### Memory Management
- ProgressStream cleanup on unmount
- EventSource connection disposal
- Snapshot caching with size limits

### Network Optimization  
- Single server metrics request
- Polling interval configuration
- Retry exponential backoff
- Connection reuse

### Rendering Optimization
- MetricsContext memoization
- Component-level memo wrapping
- Selective context subscriptions
- Delta calculation caching

## Error Handling

### Server Failures
- Automatic fallback to client computation
- Single-session warning logging
- Error state display in UI
- Retry mechanisms with backoff

### Connection Issues
- SSE → polling fallback
- Connection status indicators
- Manual restart controls
- Error message display

### Data Validation
- Server response validation
- Safe default values
- Type guards for metrics
- Boundary condition handling

## Future Enhancements (Phase 4 Preview)

### Planned Features
- **Multi-snapshot history** - Trend charts and analysis
- **Advanced ML recommendations** - Pattern recognition
- **Worker-based computation** - Offload large dataset processing  
- **Enhanced SSE reliability** - Auth tokens, jitter, reconnection
- **Recommendation scoring** - Weight-based priority system

### Scalability Improvements
- Snapshot pagination
- Incremental delta calculation
- Background sync workers
- Cache invalidation strategies

## Deprecation Notice

### Removed in Phase 3
No deprecated hooks were found matching the specified names:
- `useDomainClassification` (not found)
- `useCampaignAggregates` (not found)

All Phase 1 and Phase 2 hooks remain functional and are used as fallbacks.

### Future Deprecations
Phase 4 may deprecate:
- Direct service imports (in favor of unified context)
- Manual polling configurations (in favor of adaptive algorithms)
- Static thresholds (in favor of ML-based detection)