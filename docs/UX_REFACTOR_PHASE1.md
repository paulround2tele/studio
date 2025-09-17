# UX Refactor Phase 1: Value-First Campaign UI

## Purpose

This document outlines Phase 1 of the value-first campaign UI refactor, introducing an outcome-centric approach to campaign management and creation. The refactor focuses on making value and potential visible first, rather than technical machinery.

## Key Changes

### 1. Multi-Step Campaign Creation Wizard

**Location**: `/campaigns/new` (default), `/campaigns/new/legacy` (fallback)

**Features**:
- **Goal** → **Pattern** → **Targeting** → **Review** flow
- Backward compatibility with existing creation API
- Legacy form accessible via `/campaigns/new/legacy` or `?legacy=1`
- Maintains all existing test IDs for automation compatibility

**Test IDs**:
- `campaign-wizard`: Root wizard container
- `wizard-step-{key}`: Individual step containers
- `wizard-launch`: Launch button
- `campaign-name-input`: Name input (backward compatibility)
- `campaign-description-input`: Description input (backward compatibility)

### 2. Campaign Overview V2

**Location**: `/campaigns/[id]` (above existing DomainsList when feature enabled)

**Features**:
- Pipeline progress visualization with phase segments
- Key Performance Indicators (KPIs): Total Domains, Lead Candidates, Mean Richness, Warning Rate
- Domain classification buckets (High Potential, Emerging, At Risk, Lead Candidate, Low Value, Other)
- Warning summary with severity indicators
- Campaign configuration summary
- Beta banner indicating new feature

**Test IDs**:
- `campaign-overview-v2`: Root overview container
- `pipeline-bar`: Pipeline progress component
- `kpi-{key}`: Individual KPI cards
- `bucket-{bucketKey}`: Classification bucket cards

## Feature Flags

### Environment Variables

```bash
# Campaign Overview V2 (default: false)
NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2=true

# Campaign Wizard V1 (default: true)  
NEXT_PUBLIC_CAMPAIGN_WIZARD_V1=true
```

### Dev Query Parameters

For local development and QA:

```
# Enable overview
?flags=campaign_overview_v2

# Disable wizard (fallback to legacy)
?flags=campaign_wizard_v1_off

# Multiple flags
?flags=campaign_overview_v2,campaign_wizard_v1_off
```

### Helper Functions

```typescript
import { isFlagEnabled, FEATURE_FLAGS } from '@/utils/featureFlags';

// Check if overview is enabled
const overviewEnabled = isFlagEnabled(FEATURE_FLAGS.CAMPAIGN_OVERVIEW_V2, false);

// Check if wizard is enabled  
const wizardEnabled = isFlagEnabled(FEATURE_FLAGS.CAMPAIGN_WIZARD_V1, true);
```

## Classification Logic

### Domain Classification Buckets

1. **Lead Candidate**: `leadStatus === 'match'` (highest priority)
2. **High Potential**: `richness >= 0.7 && gain >= 0.2`
3. **Low Value**: `richness <= 0.3 || gain <= 0.1`
4. **Emerging**: `richness >= 0.55` (good richness, developing gain)
5. **At Risk**: `richness >= 0.5` (moderate richness, needs attention)
6. **Other**: Default fallback bucket

### Warning Detection

Domains are flagged with warnings when:
- `repetitionIndex >= 0.30`
- `anchorShare >= 0.40`

### Thresholds

```typescript
// High-value thresholds
export const RICHNESS_HIGH = 0.7;
export const GAIN_HIGH = 0.2;

// Classification thresholds
export const RICHNESS_EMERGING_MIN = 0.55;
export const RICHNESS_AT_RISK_MIN = 0.5;
export const RICHNESS_LOW_VALUE_MAX = 0.3;
export const GAIN_LOW_VALUE_MAX = 0.1;

// Warning thresholds
export const REPETITION_INDEX_WARN = 0.30;
export const ANCHOR_SHARE_WARN = 0.40;
```

## Data Mapping

### API to Classification Features

The domain classification system maps API data as follows:

```typescript
// API Response (DomainListItem.features.richness)
richness: features?.richness?.score ?? 0
gain: features?.richness?.prominence_norm ?? 0  // Using prominence as gain proxy
repetitionIndex: features?.richness?.repetition_index ?? 0
anchorShare: features?.richness?.anchor_share ?? 0
leadStatus: domain.leadStatus
```

## Future Phases

### Phase 2 (Not Implemented)
- Enhanced pattern configuration in wizard
- Advanced targeting parameters
- Recommendation engine
- Delta calculations over time
- Momentum and mover analysis
- Backend aggregate endpoints

### Phase 3 (Future)
- Real-time updates via SSE
- Advanced analytics dashboard
- Predictive scoring
- Campaign optimization suggestions

## Backward Compatibility

- All existing APIs remain unchanged
- Legacy campaign creation form preserved at `/campaigns/new/legacy`
- Existing test automation continues to work via maintained test IDs
- Feature flags default to current behavior (overview off, wizard on)
- Users can access legacy functionality via query parameter fallback

## Safety Measures

- Feature flags allow immediate rollback if issues arise
- Beta banner clearly indicates new functionality
- Graceful degradation when domain features are missing
- Optional chaining throughout to handle incomplete API responses
- Legacy form always accessible as fallback

## Testing

### Unit Tests
- Classification logic boundary testing
- Aggregate calculation accuracy
- Feature flag behavior
- Hook stability and memoization

### Integration Tests
- Wizard step navigation
- Campaign creation flow
- Overview data rendering
- Feature flag toggling

### Test Files
- `src/lib/campaignMetrics/__tests__/classification.test.ts`
- `src/hooks/refactor/__tests__/useCampaignAggregates.test.ts`

## Performance Considerations

- Domain classification runs in O(n) time over domains (acceptable for Phase 1)
- Memoized hooks prevent unnecessary recalculations
- Domain fetching only occurs when overview feature is enabled
- Lazy loading of overview components when feature flag is off