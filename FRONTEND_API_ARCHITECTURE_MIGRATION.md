# Frontend API Architecture Migration Plan

## PROBLEM ANALYSIS: Mixed Architectural Patterns

Your frontend currently has **FOUR DIFFERENT** API calling patterns:

1. **AMATEUR**: Direct singleton API instances (`campaignsApi.methodName()`)
2. **CONFUSED**: RTK Query wrapping generated APIs with inconsistent response types
3. **PROFESSIONAL**: Unified API client with proper response envelopes (`apiClient` from unified-client.ts)
4. **INCONSISTENT**: Manual response unwrapping with different error handling

## MIGRATION STRATEGY: Unified Professional Architecture

### Phase 1: Update RTK Query to Use Unified Response Types

**CURRENT RTK QUERY PATTERN (Wrong)**:
```typescript
// src/store/api/campaignApi.ts - AMATEUR PATTERN
getCampaignsStandalone: builder.query<APIResponse, void>({
  queryFn: async () => {
    try {
      const response = await campaignsApiClient.getCampaignsStandalone();
      const apiResponse = response.data as APIResponse; // WRONG CASTING
      if (apiResponse.success) {
        return { data: apiResponse };
      } else {
        return { error: { status: 500, data: apiResponse.error?.message || 'Failed to get campaigns' } };
      }
    } catch (error: any) {
      return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
    }
  },
  providesTags: ['Campaign'],
})
```

**FIXED RTK QUERY PATTERN (Professional)**:
```typescript
// Use the professional unified client instead
import { apiClient, isSuccessResponse } from '@/lib/api-client/unified-client';
import { CampaignsApi } from '@/lib/api-client';

// Create a hybrid approach: Use generated APIs through unified client
const campaignsApiClient = new CampaignsApi(apiClient.getAxiosInstance());

getCampaignsStandalone: builder.query<CampaignData[], void>({
  queryFn: async () => {
    try {
      // Use the generated API with proper response handling
      const response = await campaignsApiClient.getCampaignsStandalone();
      const apiResponse = response.data;
      
      if (isSuccessResponse(apiResponse)) {
        return { data: apiResponse.data }; // Return actual campaign data, not wrapped response
      } else {
        return { error: { status: 500, data: apiResponse.error?.message || 'Failed to get campaigns' } };
      }
    } catch (error: any) {
      return { error: { status: error.response?.status || 500, data: error.response?.data || error.message } };
    }
  },
  providesTags: ['Campaign'],
})
```

### Phase 2: Component Migration Patterns

**CURRENT COMPONENT PATTERN (Amateur)**:
```typescript
// Components using singleton APIs directly - WRONG
import { campaignsApi } from '@/lib/api-client/client';

const response = await campaignsApi.createLeadGenerationCampaign(apiRequest);
const newCampaignData = extractResponseData<LeadGenerationCampaignResponse>(response);
```

**FIXED COMPONENT PATTERN (Professional)**:
```typescript
// Use RTK Query hooks with proper types
import { useCreateCampaignMutation } from '@/store/api/campaignApi';

const [createCampaign, { isLoading, error }] = useCreateCampaignMutation();

const handleSubmit = async (data) => {
  try {
    const result = await createCampaign(apiRequest).unwrap();
    // result is now properly typed campaign data, not wrapped response
    router.push(`/campaigns/${result.id}`);
  } catch (error) {
    // RTK Query provides standardized error handling
    console.error('Campaign creation failed:', error);
  }
};
```

### Phase 3: Response Type Standardization

**PROBLEM**: Multiple response wrapper types
- `ApiAPIResponse` (generated)
- `APIResponse` (unified)
- Raw `AxiosResponse`
- Manual unwrapping

**SOLUTION**: Single source of truth
```typescript
// All APIs should return this format from RTK Query
interface StandardResponse<T> {
  data: T;
  success: boolean;
  error?: ErrorInfo;
  requestId: string;
}

// RTK Query mutations return the actual data, not the wrapper
const [createCampaign] = useCreateCampaignMutation<CampaignData, CreateCampaignRequest>();
```

### Phase 4: Error Handling Unification

**CURRENT**: Each component handles errors differently
**FIXED**: Standardized error handling through RTK Query

```typescript
// RTK Query provides consistent error format
const { data, error, isLoading } = useGetCampaignsQuery();

if (error) {
  if ('status' in error) {
    // HTTP error
    console.error('API Error:', error.status, error.data);
  } else {
    // Network error
    console.error('Network Error:', error.message);
  }
}
```

## COMPONENT MIGRATION CHECKLIST

### Critical Components to Fix

1. **CampaignFormV2.tsx** - Currently using singleton `campaignsApi`
2. **PhaseDashboard.tsx** - Mixed RTK Query and direct API calls
3. **CampaignControls.tsx** - Direct API instantiation (worst pattern)
4. **Phase Configuration Modals** - Singleton API usage
5. **Dashboard Components** - Mixed patterns

### Migration Priority

**HIGH PRIORITY** (Core Campaign Functionality):
- [ ] `CampaignFormV2.tsx` - Campaign creation
- [ ] `PhaseDashboard.tsx` - Phase management
- [ ] `CampaignControls.tsx` - Campaign operations
- [ ] All phase configuration modals

**MEDIUM PRIORITY** (Dashboard & Monitoring):
- [ ] `LatestActivityTable.tsx`
- [ ] `CampaignProgressMonitor.tsx`
- [ ] `BulkOperationsDashboard.tsx`

**LOW PRIORITY** (Legacy & Examples):
- [ ] Example components (already correct)
- [ ] Legacy dashboard components

## IMPLEMENTATION PLAN

### Step 1: Fix RTK Query Response Handling
- Update all RTK Query endpoints to return actual data, not wrapped responses
- Standardize error handling patterns
- Use proper TypeScript types from generated client

### Step 2: Create Campaign API Hook Wrappers
- Wrap common campaign operations in reusable hooks
- Provide consistent loading states and error handling
- Maintain backward compatibility during transition

### Step 3: Migrate High-Priority Components
- Replace direct API calls with RTK Query hooks
- Remove manual response unwrapping
- Standardize error handling and loading states

### Step 4: Update Type Definitions
- Ensure all components use proper TypeScript types
- Remove manual type casting and `any` types
- Leverage auto-generated types from OpenAPI

### Step 5: Testing & Validation
- Verify all API calls work with unified response format
- Test error handling scenarios
- Validate loading states and user feedback

## SUCCESS CRITERIA

After migration, your frontend will have:

1. **Consistent API Patterns**: All components use RTK Query hooks
2. **Proper Type Safety**: No manual casting, leverage generated types
3. **Unified Error Handling**: Standardized error display and recovery
4. **Performance**: Automatic caching and request deduplication
5. **Maintainability**: Single source of truth for API interactions

## ARCHITECTURAL BENEFITS

- **No More Manual Response Unwrapping**: RTK Query handles it
- **Automatic Loading States**: Built into RTK Query hooks
- **Request Deduplication**: Automatic optimization
- **Cache Management**: Intelligent invalidation and updates
- **Type Safety**: Full TypeScript integration with generated types
- **Error Boundaries**: Consistent error handling patterns

This migration transforms your frontend from an **amateur mixed-pattern disaster** into a **professional, maintainable architecture**.
