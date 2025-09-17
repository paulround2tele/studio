# UX Refactor Phase 2 Implementation

This document outlines the implementation of Phase 2 enhancements to the DomainFlow campaign management interface, building upon the Phase 1 foundation.

## Overview

Phase 2 introduces:

1. **Service Layer Abstraction** - Pure function services for metrics calculation and recommendations
2. **User Preference Persistence** - localStorage-backed preferences with cross-tab synchronization  
3. **Recommendations Engine** - Rule-based actionable insights for campaign optimization
4. **Enhanced UI Controls** - Toggle-based domain table visibility with toolbar actions
5. **Feature Flag Enhancements** - Additional flags for Phase 2 behavior control

## Architecture Changes

### Service Layer (`src/services/campaignMetrics/`)

**`classificationService.ts`**
- `classifyDomains()` - Pure function to classify domains by lead score thresholds
- `classificationToUiBuckets()` - Convert classification data to UI-compatible format
- `calculateWarningRate()` - Compute warning rate based on DNS/HTTP status failures

**`aggregateService.ts`**
- `calculateAggregateMetrics()` - Compute success rates, averages, and totals
- `calculateLeadScoreStats()` - Generate min/max/median statistics
- `calculateStatusDistribution()` - Analyze DNS/HTTP status breakdowns
- `calculateMedian()` - Utility for median calculation with edge case handling

**`recommendationService.ts`**
- `getRecommendations()` - Main entry point for recommendation generation
- `generateRecommendations()` - Rule-based recommendation logic
- `generateAllClearRecommendation()` - Fallback "all clear" state

### Hooks (`src/lib/hooks/`)

**`useUserPreference.ts`**
- localStorage persistence with SSR safety checks
- Cross-tab synchronization via StorageEvent
- Automatic JSON serialization/deserialization
- Error handling with graceful fallbacks

**`useCampaignMetrics.ts`**
- Composes service layer functions into a single hook
- Memoized computation for performance
- Returns aggregates, classification, warnings, and recommendations

### Components (`src/components/refactor/campaign/`)

**`RecommendationPanel.tsx`**
- Dismissible recommendation cards with severity-based styling
- Ephemeral dismissal state (no persistence requirement per Phase 2 spec)
- Icon-based severity indicators (info/warn/action)
- Responsive layout with accessible markup

### Types (`src/types/campaignMetrics.ts`)

**Core Interfaces:**
- `DomainMetricsInput` - Standardized domain data structure
- `AggregateMetrics` - Computed metrics output format
- `ClassificationBuckets` - Domain quality distribution
- `Recommendation` - Recommendation data structure with severity levels

## Feature Flags

### New Phase 2 Flags

**`NEXT_PUBLIC_SHOW_LEGACY_DOMAINS_TABLE`** (default: false)
- When `true`: Restores Phase 1 stacked behavior (Overview + always-visible domains table)
- When `false`: Phase 2 behavior (Overview + hidden domains table by default)

### Query Parameter Support

**`?showDomains=1`** - Force domains table visibility regardless of user preference

### Existing Flags (Preserved)
- `NEXT_PUBLIC_CAMPAIGN_WIZARD_V1` - Controls wizard vs. legacy form
- `NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2` - Controls new overview display

## User Preferences

### Persistence Keys

**`campaignOverviewV2.showDomainsTable`** (boolean)
- Controls visibility of the raw domains table
- Defaults to query parameter value or legacy flag setting
- Persists across browser sessions and tabs

**`campaignOverviewV2.bannerDismissed`** (boolean)  
- Tracks beta banner dismissal state
- Provides "Restore Beta Banner" action when dismissed
- Future-proofed for additional banner management

### Cross-Tab Synchronization

Preference changes are automatically synchronized across browser tabs using:
- `localStorage.setItem()` for persistence
- `StorageEvent` dispatch for immediate cross-tab updates
- Event listeners for receiving updates from other tabs

## UI Enhancements

### Campaign Detail Page (`/campaigns/[id]`)

**Phase 2 Toolbar:**
- "Show/Hide Raw Domains" toggle button with eye icons
- "Refresh" action button
- "Restore Beta Banner" action (when applicable)
- Compact horizontal layout with descriptive labels

**Conditional Rendering:**
- Overview V2 displays by default when feature flag enabled
- Domains table hidden by default (Phase 2 behavior)
- Legacy stacked behavior available via feature flag override

### Recommendation Panel

**Visual Design:**
- Color-coded severity levels (blue/yellow/orange for info/warn/action)
- Lucide React icons for visual consistency
- Dismissible cards with smooth transitions
- "All clear" state when no recommendations apply

**Recommendation Rules:**
1. **Low High-Quality Domains** - Triggers when <3 high-quality domains in >100 total
2. **High Warning Rate** - Activates when DNS/HTTP failure rate >25%  
3. **No Leads Generated** - Suggests expansion when lead scores are zero
4. **Low DNS Success Rate** - Warns when DNS resolution <70%
5. **Low HTTP Success Rate** - Warns when HTTP response <60%
6. **Good Performance** - Positive feedback when metrics are excellent

## Testing Strategy

### Service Layer Tests
- **Classification Service**: 100% coverage with edge cases for lead score boundaries
- **Aggregate Service**: Comprehensive testing including NaN handling and empty arrays
- **Recommendation Service**: Full rule coverage with threshold boundary testing

### Hook Tests  
- **useUserPreference**: localStorage persistence, error handling, SSR safety, cross-tab sync
- **useCampaignMetrics**: Service composition and memoization behavior

### Component Tests
- **RecommendationPanel**: Rendering, dismissal, styling, accessibility, empty states

### Integration Coverage
- Campaign page conditional rendering
- Preference persistence across page reloads
- Feature flag interaction testing

## Migration & Compatibility

### Backward Compatibility
- **Existing hooks preserved** - Phase 1 hooks remain functional with deprecation markers
- **API compatibility** - No changes to existing API contracts or data structures
- **Progressive enhancement** - Phase 2 features are additive, not destructive

### Phase 1 → Phase 2 Migration Path
1. Enable `NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2=true` to activate overview
2. Set `NEXT_PUBLIC_SHOW_LEGACY_DOMAINS_TABLE=false` for Phase 2 behavior  
3. Existing users maintain their workflow with new enhancements
4. New users get Phase 2 experience by default

### Phase 3 Preparation
- Service layer provides foundation for server-side integration
- Deprecated hooks marked with JSDoc `@deprecated` annotations
- Recommendation framework ready for ML/advanced algorithms
- Preference system extensible for additional UI state

## Performance Considerations

### Memoization Strategy
- `useCampaignMetrics` memoizes service computations
- Recommendations calculated only when input data changes
- Classification and aggregates cached per render cycle

### Bundle Size Impact
- Service layer adds ~15KB of pure functions (tree-shakeable)
- Recommendation engine logic is conditionally loaded
- No external dependencies introduced

### Runtime Efficiency
- Pure functions enable predictable performance characteristics
- Service layer functions are synchronous (no async overhead)
- localStorage operations wrapped in try/catch for resilience

## Security & Privacy

### Data Handling
- All metrics computation occurs client-side
- No sensitive campaign data transmitted to external services
- Preference storage limited to localStorage (no server persistence)

### SSR Safety
- All localStorage operations guarded with `typeof window` checks
- Graceful degradation when storage APIs unavailable
- No hydration mismatches from client-only features

## Rollback Strategy

### Immediate Rollback
Set `NEXT_PUBLIC_SHOW_LEGACY_DOMAINS_TABLE=true` to restore Phase 1 behavior

### Granular Control
- Individual components can be disabled via feature flags
- Service layer can be bypassed by reverting to Phase 1 hooks
- Recommendations panel can be hidden without affecting other features

### Data Recovery
- User preferences stored in localStorage persist through rollbacks
- No server-side data migration required
- Campaign data remains unchanged throughout rollback process

## Monitoring & Observability

### Client-Side Telemetry Points
- Recommendation dismissal rates by severity level
- Domain table toggle usage patterns
- User preference adoption metrics
- Service layer performance characteristics

### Error Handling
- Service layer functions include comprehensive error boundaries
- localStorage operations log warnings for debugging
- Component error states provide user-friendly fallbacks

## Future Enhancements (Phase 3+)

### Server Integration
- Service layer functions ready for server-side metric endpoints
- Recommendation engine prepared for ML model integration
- Preference system extensible to user profiles

### Advanced Features
- Real-time updates via WebSocket integration
- Advanced filtering and saved filter sets
- Delta visualization and trend analysis
- Enhanced recommendation algorithms with feedback loops

---

*This Phase 2 implementation maintains full backward compatibility while introducing powerful new capabilities for campaign optimization and user experience enhancement.*