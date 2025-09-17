# UX Refactor Phase 1 Implementation

This document summarizes the Phase 1 UI Refactor implementation, covering the new campaign creation wizard and value-first campaign overview components.

## Overview

Phase 1 introduces two major UX improvements:

1. **Campaign Creation Wizard** - Guided multi-step campaign creation replacing the single-form approach
2. **Campaign Overview V2** - Value-first dashboard showing key metrics above the traditional domains table

Both features are controlled by environment-based feature flags with query parameter overrides and kill switch functionality.

## Feature Flags

### Environment Variables

- `NEXT_PUBLIC_CAMPAIGN_WIZARD_V1` - Controls wizard vs. legacy form (default: enabled)
- `NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2` - Controls new overview display (default: disabled)

### Kill Switch Behavior

```typescript
// Wizard enabled by default, disabled only when explicitly set to 'false'
NEXT_PUBLIC_CAMPAIGN_WIZARD_V1=false  // Shows legacy form
NEXT_PUBLIC_CAMPAIGN_WIZARD_V1=true   // Shows wizard (default)
// Undefined or any other value also shows wizard
```

### Query Parameter Overrides

Use `?ff=CAMPAIGN_WIZARD_V1,CAMPAIGN_OVERVIEW_V2` to enable flags temporarily for testing:

```
/campaigns/new?ff=CAMPAIGN_WIZARD_V1
/campaigns/123?ff=CAMPAIGN_OVERVIEW_V2  
/campaigns/456?ff=CAMPAIGN_WIZARD_V1,CAMPAIGN_OVERVIEW_V2
```

## Campaign Creation Wizard

### Route Structure

```
/campaigns/new              → Wizard (default) or Legacy form (kill switch)
/campaigns/new/legacy       → Legacy form (always available)
/campaigns/new?legacy=1     → Redirects to /campaigns/new/legacy
```

### Wizard Steps

1. **Goal** (`GoalStep.tsx`)
   - Campaign name (required)
   - Description (optional)
   - Basic validation: name must be non-empty

2. **Pattern** (`PatternStep.tsx`)  
   - Base pattern with {variation} placeholder (required)
   - Maximum domains limit (required, 1-10,000)
   - Specific variations list (optional)
   - Basic validation: pattern and max domains required

3. **Targeting** (`TargetingStep.tsx`)
   - Include keywords (optional)
   - Exclude keywords (optional)  
   - Exclude extensions (optional)
   - No validation - all fields optional

4. **Review & Launch** (`ReviewStep.tsx`)
   - Summary of all previous steps
   - Final submission to create campaign
   - Maps to existing `createCampaign` mutation

### Implementation Files

```
src/components/refactor/campaign/
├── CampaignCreateWizard.tsx          # Main wizard component
└── steps/
    ├── GoalStep.tsx                  # Step 1: Basic info
    ├── PatternStep.tsx               # Step 2: Domain pattern  
    ├── TargetingStep.tsx             # Step 3: Keywords/filters
    └── ReviewStep.tsx                # Step 4: Summary & submit
```

### API Integration

The wizard maps form data to the existing `SimpleCampaignFormTypes` interface and uses the `useCreateCampaignMutation` hook. Advanced domain generation configuration is deferred to the campaign dashboard.

```typescript
// Basic mapping - advanced fields added in Phase 2
const apiRequest = formToApiRequest({
  name: wizardState.goal.campaignName || '',
  description: wizardState.goal.description || ''
});
```

### Accessibility Features

- Step indicators with `aria-current="step"` for active step
- Semantic `<h2>` headings for each step  
- Descriptive button labels and form labels
- Keyboard navigation between completed steps

## Campaign Overview V2

### Integration Point

The overview appears above the existing domains table when `NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2` is enabled:

```typescript
// In /campaigns/[id]/page.tsx
{showOverviewV2 && (
  <CampaignOverviewV2 campaignId={campaignId} />
)}
```

### Component Architecture

```
src/components/refactor/
├── campaign/
│   ├── CampaignOverviewV2.tsx        # Main overview component
│   ├── CampaignKpiCard.tsx           # Individual KPI display
│   ├── ClassificationBuckets.tsx     # Domain classification chart
│   ├── WarningSummary.tsx            # System status alerts
│   ├── ConfigSummary.tsx             # Campaign configuration
│   └── PipelineBarContainer.tsx      # Pipeline progress wrapper
├── shared/
│   └── PipelineBar.tsx               # Reusable progress visualization
└── types.ts                          # TypeScript interfaces
```

### Data Visualization Components

#### CampaignKpiCard
- Displays key metrics with trend indicators
- Supports number, percentage, currency, duration formats
- Trend arrows (up/down/stable) with color coding

#### ClassificationBuckets  
- Domain quality distribution visualization
- Configurable buckets with counts and percentages
- Color-coded segments with summary bar

#### PipelineBar
- Horizontal progress bar for pipeline phases
- Segmented by status (pending/ok/error/timeout)
- Accessible with proper ARIA labels and keyboard support

#### WarningSummary
- System status with categorized alerts (error/warning/info/success)
- Grouped by type with badge counts
- "All systems operational" state when no issues

#### ConfigSummary
- Campaign configuration display
- Supports various data types (text/number/date/badge/list)
- Icon-based categorization with smart defaults

### Mock Data (Phase 1)

Phase 1 uses generated mock data for visualization. Phase 2 will integrate with server-side aggregation endpoints:

```typescript
// TODO: Phase 2 - Replace with actual server aggregates
function generateMockData(domains: any[]) {
  // KPIs, classification buckets, warnings, config
}
```

## Data Types

### Core Interfaces

```typescript
// Lightweight domain interface for refactor components
interface CampaignDomain {
  id: string;
  domain_name: string;
  dns_status: DomainStatus;
  http_status: DomainStatus;
  lead_score: number;
  created_at: string;
  updated_at: string;
}

// Discriminated union for phase status
type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

// Phase execution tracking
interface CampaignPhaseExecution {
  phase: string;
  status: PhaseStatus;
  progress_percentage?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}
```

### Wizard State Management

```typescript
interface CampaignWizardState {
  currentStep: number;
  goal: Partial<WizardGoalStep>;
  pattern: Partial<WizardPatternStep>;
  targeting: Partial<WizardTargetingStep>;
  isValid: boolean;
}
```

## Testing

### Test Coverage

- **Classification Logic** (`classification.test.ts`) - Domain classification algorithms
- **Aggregates** (`aggregates.test.ts`) - Data transformation utilities
- **PipelineBar** (`PipelineBar.test.tsx`) - Progress visualization component  
- **CampaignOverviewV2** (`CampaignOverviewV2.test.tsx`) - Main overview component
- **CampaignCreateWizard** (`CampaignCreateWizard.test.tsx`) - Multi-step wizard

### Test Characteristics

- Deterministic with small synthetic domain arrays
- Accessibility testing with `@testing-library/jest-dom`
- User interaction testing with `@testing-library/user-event`
- RTK Query mocking for API integration tests
- Component rendering and state management coverage

## Styling

### Design System

- **Tailwind CSS only** - No custom CSS or external styling libraries
- **Consistent spacing** - Uses existing design tokens (space-4, space-6, etc.)
- **Dark mode aware** - Proper dark/light color variants throughout
- **Semantic colors** - Status-based color coding (green=success, red=error, etc.)

### Color Palette

```typescript
const STATUS_COLORS = {
  pending: '#f59e0b',  // amber-500
  ok: '#10b981',       // emerald-500  
  error: '#ef4444',    // red-500
  timeout: '#6b7280'   // gray-500
};
```

## Migration Path

### Phase 1 → Phase 2 Roadmap

Phase 2 improvements planned:

- **Server-side aggregation** - Replace mock data with real aggregation endpoints
- **Persistent preferences** - Save user's beta banner dismissal, layout preferences
- **Delta visualization** - Show changes over time with trend analysis
- **Recommendations engine** - Actionable insights based on campaign performance
- **Advanced filtering** - Dynamic domain filtering with saved filter sets

### Backward Compatibility

- **Non-destructive** - Legacy form preserved at `/campaigns/new/legacy`
- **API compatibility** - Uses existing `createCampaign` mutation unchanged
- **Graceful degradation** - Feature flags allow instant rollback if needed
- **Progressive enhancement** - New features additive to existing functionality

## Implementation Notes

### Performance Considerations

- **Lazy loading** - Wizard steps and overview components loaded on demand
- **Memoization** - Expensive calculations cached with React.useMemo
- **Tree shaking** - Export barrel maintains optimized bundle sizes
- **Minimal re-renders** - State updates isolated to affected components

### Error Handling

- **Toast notifications** - User-friendly error messages via existing toast system
- **Loading states** - Proper loading indicators during async operations  
- **Fallback content** - Graceful handling of missing or malformed data
- **Network resilience** - Retry logic and offline state management

### Accessibility Compliance

- **WCAG 2.1 AA** - Meets accessibility guidelines for enterprise use
- **Keyboard navigation** - Full functionality without mouse
- **Screen reader support** - Proper semantic markup and ARIA attributes
- **Color contrast** - Sufficient contrast ratios in both light and dark modes
- **Focus management** - Logical tab order and visible focus indicators

## Configuration Examples

### Enable Wizard in Development

```bash
# .env.local
NEXT_PUBLIC_CAMPAIGN_WIZARD_V1=true
```

### Enable Overview in Production  

```bash
# Production environment
NEXT_PUBLIC_CAMPAIGN_OVERVIEW_V2=true
```

### Testing with Query Parameters

```bash
# Test wizard temporarily
curl "http://localhost:3000/campaigns/new?ff=CAMPAIGN_WIZARD_V1"

# Test overview temporarily  
curl "http://localhost:3000/campaigns/123?ff=CAMPAIGN_OVERVIEW_V2"

# Test both features
curl "http://localhost:3000/campaigns/new?ff=CAMPAIGN_WIZARD_V1,CAMPAIGN_OVERVIEW_V2"
```

This implementation provides a solid foundation for the Phase 1 UX improvements while maintaining compatibility with existing systems and providing clear migration paths for future enhancements.