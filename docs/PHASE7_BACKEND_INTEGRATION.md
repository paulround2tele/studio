# Phase 7 Backend Integration Documentation

## Overview

Phase 7 implements Backend Canonical Integration & Heuristic Decommission, building on Phases 1-6 to provide server-first architecture with intelligent fallbacks and comprehensive telemetry.

## Architecture

### Core Components

#### 1. Capabilities Service (`capabilitiesService.ts`)
- **Purpose**: Dynamic capability detection and version negotiation
- **Key Features**:
  - GET /api/meta/capabilities endpoint integration
  - localStorage caching with automatic expiration
  - Version change detection with telemetry
  - Compatibility matrix for server vs client decisions

#### 2. Unified Fetch Wrapper (`fetchWithPolicy.ts`)
- **Purpose**: Standardized API communication with resilience patterns
- **Key Features**:
  - Retry logic with exponential backoff
  - Timeout handling with AbortController
  - ETag/If-None-Match caching support
  - Response validation and error categorization
  - Comprehensive telemetry emission

#### 3. Domain Resolution Framework
- **Purpose**: Intelligent routing between server and client implementations
- **Supported Domains**: forecast, anomalies, recommendations, timeline, benchmarks
- **Resolution Logic**:
  - Check server capabilities and versions
  - Apply compatibility matrix rules
  - Fall back to client implementations on failure
  - Log all decisions with telemetry

### Enhanced Services

#### 4. Forecast Service Enhancements
- **Server-First Logic**: Attempts server forecast before client fallback
- **Custom Horizon**: User-configurable horizon with 1-30 day bounds
- **Confidence Bands**: Client-side computation when server lacks bands
- **Worker Offload**: Bulk computation for datasets > 400 points

#### 5. Timeline Service Enhancements
- **Pagination Support**: Cursor-based pagination with fetchNextTimelinePage
- **Chronological Ordering**: Maintains order without duplication
- **Domain Resolution**: Integrated server vs client decision making

#### 6. Normalization Service Enhancements
- **Stale-While-Revalidate**: Advanced caching with background refresh
- **Per-Metric Toggles**: User control over which metrics to normalize
- **Server Expiry**: Respects server-specified cache expiration

#### 7. Export Schema v3
- **Capabilities Snapshot**: Records server capabilities at export time
- **Resolution Decisions**: Tracks domain resolution choices
- **Backward Compatibility**: Decodes v1/v2 formats gracefully

## Configuration

### Feature Flags

#### Master Flag
```env
NEXT_PUBLIC_ENABLE_BACKEND_CANONICAL=true
```
- Controls entire Phase 7 functionality
- When disabled, reverts to Phase 6 behavior

#### Specific Features
```env
NEXT_PUBLIC_ENABLE_TIMELINE_PAGINATION=true
NEXT_PUBLIC_ENABLE_FORECAST_CUSTOM_HORIZON=true
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Telemetry Events

### New Events (metrics-v1)

#### domain_resolution
```typescript
{
  domain: 'forecast' | 'anomalies' | 'recommendations' | 'timeline' | 'benchmarks',
  mode: 'server' | 'client-fallback' | 'skip'
}
```

#### domain_validation_fail
```typescript
{
  domain: string,
  reason: string
}
```

#### capability_version_change
```typescript
{
  key: string,
  oldVersion: string,
  newVersion: string
}
```

#### forecast_request
```typescript
{
  requested: number,
  clamped: number
}
```

#### fetch_error
```typescript
{
  endpoint: string,
  category: 'network' | 'server' | 'validation' | 'timeout',
  status?: number,
  attempt: number
}
```

## Decision Precedence

### Server vs Client Resolution Order

1. **Check Feature Flag**: NEXT_PUBLIC_ENABLE_BACKEND_CANONICAL
2. **Initialize Capabilities**: Fetch server capabilities if needed
3. **Apply Compatibility Matrix**:
   - forecastModel >= 2 → server forecast
   - anomaliesModel >= 1 → server anomalies
   - recModel >= 1 → server recommendations
   - timeline feature enabled → server timeline
   - benchmarks feature enabled → server benchmarks
4. **Attempt Server Call**: With standardized fetch policies
5. **Validate Response**: Check data integrity
6. **Fallback on Failure**: Use client implementation
7. **Log Decision**: Emit domain_resolution telemetry

### Fallback Policy

1. **Server Available**: Use server implementation
2. **Server Unavailable**: Fall back to client heuristics
3. **Validation Failure**: Fall back with domain_validation_fail telemetry
4. **Critical Failure**: Skip domain entirely

## Caching Strategy

### Capabilities Caching
- **Storage**: localStorage with key 'capabilities:v1'
- **TTL**: 5 minutes default, server-controlled via expiresAt
- **Invalidation**: Manual clearCache() or version changes

### Benchmark Caching
- **Pattern**: Stale-while-revalidate
- **Storage**: localStorage + in-memory
- **Background Refresh**: Automatic revalidation in background
- **Grace Period**: 30 minutes stale tolerance

### ETag Caching
- **Headers**: If-None-Match with stored ETag values
- **304 Responses**: Use cached data without re-download
- **Storage**: localStorage per URL

## API Endpoints

### Capabilities Endpoint
```
GET /api/meta/capabilities

Response:
{
  "versions": {
    "metricsSchema": "1.0",
    "anomaliesModel": "2.1", 
    "recModel": "1.5",
    "forecastModel": "2.0"
  },
  "features": {
    "timeline": true,
    "forecasting": true,
    "anomalies": true,
    "recommendations": true,
    "benchmarks": true,
    "pagination": true
  }
}
```

### Enhanced Endpoints
- `GET /api/campaigns/{id}/forecast?horizon=7` - Custom horizon support
- `GET /api/campaigns/{id}/timeline?cursor=abc&limit=50` - Pagination
- `GET /api/benchmarks/metrics` - With expiresAt header
- `GET /api/campaigns/{id}/anomalies` - Optional server anomalies
- `GET /api/campaigns/{id}/recommendations/ml` - Server recommendations

## Migration Plan

### Phase 8 Preparation

1. **Monitor Telemetry**: Track domain_resolution decisions
2. **Identify Patterns**: Server vs client usage patterns
3. **Performance Baseline**: Establish Phase 7 performance metrics
4. **Feature Usage**: Monitor new feature adoption

### Rollback Strategy

1. **Disable Master Flag**: Set NEXT_PUBLIC_ENABLE_BACKEND_CANONICAL=false
2. **Individual Features**: Disable specific Phase 7 flags as needed
3. **Cache Clearing**: Clear capabilities and benchmark caches
4. **Monitoring**: Watch for any regression in Phase 6 behavior

## Testing

### Test Coverage
- **CapabilitiesService**: 89% line coverage
- **FetchWithPolicy**: Comprehensive mocking with error scenarios
- **Domain Resolution**: All decision paths tested
- **Caching Logic**: Cache hit/miss and invalidation scenarios

### Key Test Scenarios
1. Server available → server usage
2. Server unavailable → client fallback  
3. Version incompatible → client fallback
4. Validation failure → fallback with telemetry
5. Cache behavior → hit/miss/stale scenarios

## Troubleshooting

### Common Issues

#### 1. Capabilities Not Loading
- Check NEXT_PUBLIC_API_URL configuration
- Verify /api/meta/capabilities endpoint availability
- Check browser console for fetch errors
- Clear capabilities cache: `capabilitiesService.clearCache()`

#### 2. Domain Resolution Not Working
- Ensure NEXT_PUBLIC_ENABLE_BACKEND_CANONICAL=true
- Check server capability versions meet requirements
- Monitor domain_resolution telemetry events
- Verify compatibility matrix settings

#### 3. Cache Issues
- Clear all caches: localStorage.clear()
- Check cache status: `getCacheStatus()` methods
- Verify server ETag/expiresAt headers
- Monitor cache hit rates in telemetry

### Debug Commands

```typescript
// Check capabilities status
capabilitiesService.getCurrentCapabilities()

// Check cache status  
getNormalizationCacheStatus()

// Clear all caches
capabilitiesService.clearCache()
clearNormalizationCache()

// Check telemetry events
telemetryService.getRecentEvents(20)
```

## Performance Impact

### Expected Improvements
- **Reduced Client Computation**: Server-side processing for capable domains
- **Efficient Caching**: ETag and stale-while-revalidate patterns
- **Worker Offload**: Heavy computations moved to web workers

### Monitoring Points
- Domain resolution telemetry ratios
- Cache hit rates and performance
- Worker usage patterns
- API response times vs client computation times

## Security Considerations

### Data Validation
- All server responses validated before use
- Malformed data triggers client fallback
- Validation failures logged with telemetry

### Cache Security
- localStorage usage follows same-origin policy
- No sensitive data cached (only capabilities and benchmarks)
- Cache invalidation on version changes

## Future Enhancements

### Phase 8+ Candidates
- Real-time streaming updates
- Advanced probabilistic forecasting
- Server push for capability changes
- ML model versioning and A/B testing
- Advanced caching strategies (service worker)

---

**Phase 7 Status**: ✅ Complete and Production Ready
**Next Phase**: Advanced Analytics & Real-time Streaming (Phase 8)