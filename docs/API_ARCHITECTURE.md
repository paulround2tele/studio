# API Architecture Documentation

## Overview

DomainFlow Studio implements a sophisticated **Redux Toolkit Query (RTK Query)** architecture for comprehensive API state management. This document outlines the unified API patterns, response structures, and frontend integration strategies.

## Unified API Response Structure

### Backend APIResponse Wrapper

All backend endpoints return a standardized response format:

```typescript
interface APIResponse<T = any> {
  success: boolean;
  data: T;
  error?: ErrorInfo;
  requestId: string;
}

interface ErrorInfo {
  message: string;
  code?: string;
  details?: Record<string, any>;
}
```

**Response Examples:**

```json
// Successful response
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "campaign-123",
        "name": "Domain Campaign Alpha",
        "status": "active"
      }
    ]
  },
  "requestId": "req-456"
}

// Error response
{
  "success": false,
  "error": {
    "message": "Campaign not found",
    "code": "CAMPAIGN_NOT_FOUND",
    "details": { "campaignId": "invalid-id" }
  },
  "requestId": "req-789"
}
```

## RTK Query Architecture

### Store Structure

```typescript
// src/store/index.ts
export const store = configureStore({
  reducer: {
    // RTK Query API slices
    campaignApi: campaignApi.reducer,
    bulkOperationsApi: bulkOperationsApi.reducer,
    
    // Application state slices
    campaigns: campaignSlice.reducer,
    bulkOperations: bulkOperationsSlice.reducer,
    auth: authSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      campaignApi.middleware,
      bulkOperationsApi.middleware
    ),
});
```

### API Slice Configuration

```typescript
// src/store/api/baseApi.ts
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v2',
    prepareHeaders: (headers, { getState }) => {
      // Automatic authentication header injection
      const token = selectAuthToken(getState());
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Campaign', 'BulkOperation', 'Domain', 'Lead'],
  endpoints: () => ({}),
});
```

### Campaign API Implementation

```typescript
// src/store/api/campaignApi.ts
export const campaignApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Unified response handling with APIResponse wrapper
    getCampaignsStandalone: builder.query<Campaign[], void>({
      queryFn: async () => {
        try {
          const response = await fetch('/api/v2/campaigns/standalone');
          const apiResponse = await response.json() as APIResponse<Campaign[]>;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data };
          }
          
          return { 
            error: apiResponse.error || { message: 'Failed to fetch campaigns' }
          };
        } catch (error) {
          return { error: { message: 'Network error occurred' } };
        }
      },
      providesTags: ['Campaign'],
    }),

    startCampaign: builder.mutation<Campaign, { campaignId: string }>({
      queryFn: async ({ campaignId }) => {
        try {
          const response = await fetch(`/api/v2/campaigns/${campaignId}/start`, {
            method: 'POST',
          });
          const apiResponse = await response.json() as APIResponse<Campaign>;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data };
          }
          
          return { 
            error: apiResponse.error || { message: 'Failed to start campaign' }
          };
        } catch (error) {
          return { error: { message: 'Network error occurred' } };
        }
      },
      invalidatesTags: ['Campaign'],
    }),

    // Bulk enriched data with complex transformations
    getBulkEnrichedCampaignData: builder.query<EnrichedCampaignData, void>({
      queryFn: async () => {
        try {
          const response = await fetch('/api/v2/campaigns/bulk-enriched');
          const apiResponse = await response.json() as APIResponse<EnrichedCampaignData>;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data };
          }
          
          return { 
            error: apiResponse.error || { message: 'Failed to fetch enriched data' }
          };
        } catch (error) {
          return { error: { message: 'Network error occurred' } };
        }
      },
      providesTags: ['Campaign', 'Domain', 'Lead'],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),
  }),
});

export const {
  useGetCampaignsStandaloneQuery,
  useStartCampaignMutation,
  useGetBulkEnrichedCampaignDataQuery,
} = campaignApi;
```

### Bulk Operations API

```typescript
// src/store/api/bulkOperationsApi.ts
export const bulkOperationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Enterprise-scale bulk operations
    bulkGenerateDomains: builder.mutation<BulkOperationResponse, BulkDomainGenerationRequest>({
      queryFn: async (request) => {
        try {
          const response = await fetch('/api/v2/bulk-operations/domains/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });
          const apiResponse = await response.json() as APIResponse<BulkOperationResponse>;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data };
          }
          
          return { 
            error: apiResponse.error || { message: 'Bulk domain generation failed' }
          };
        } catch (error) {
          return { error: { message: 'Network error occurred' } };
        }
      },
      invalidatesTags: ['BulkOperation', 'Domain'],
    }),

    listBulkOperations: builder.query<BulkOperation[], void>({
      queryFn: async () => {
        try {
          const response = await fetch('/api/v2/bulk-operations');
          const apiResponse = await response.json() as APIResponse<BulkOperation[]>;
          
          if (apiResponse.success && apiResponse.data) {
            return { data: apiResponse.data };
          }
          
          return { 
            error: apiResponse.error || { message: 'Failed to list bulk operations' }
          };
        } catch (error) {
          return { error: { message: 'Network error occurred' } };
        }
      },
      providesTags: ['BulkOperation'],
      pollingInterval: 5000, // Poll every 5 seconds for real-time updates
    }),
  }),
});

export const {
  useBulkGenerateDomainsMutation,
  useListBulkOperationsQuery,
} = bulkOperationsApi;
```

## Component Integration Patterns

### Campaign Data Provider

```typescript
// src/providers/RTKCampaignDataProvider.tsx
interface RTKCampaignDataContextType {
  campaigns: Campaign[];
  enrichedData: EnrichedCampaignData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const RTKCampaignDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Multiple RTK Query hooks with unified state management
  const { 
    data: campaigns = [], 
    isLoading: campaignsLoading, 
    error: campaignsError,
    refetch: refetchCampaigns 
  } = useGetCampaignsStandaloneQuery();

  const { 
    data: enrichedData, 
    isLoading: enrichedLoading, 
    error: enrichedError,
    refetch: refetchEnriched 
  } = useGetBulkEnrichedCampaignDataQuery();

  // Unified state aggregation
  const contextValue = useMemo(() => ({
    campaigns,
    enrichedData: enrichedData || null,
    loading: campaignsLoading || enrichedLoading,
    error: campaignsError?.message || enrichedError?.message || null,
    refetch: () => {
      refetchCampaigns();
      refetchEnriched();
    },
  }), [campaigns, enrichedData, campaignsLoading, enrichedLoading, campaignsError, enrichedError]);

  return (
    <RTKCampaignDataContext.Provider value={contextValue}>
      {children}
    </RTKCampaignDataContext.Provider>
  );
};
```

### Component Usage Patterns

```typescript
// Campaign list component with RTK Query integration
const CampaignsList: React.FC = () => {
  const { campaigns, loading, error, refetch } = useRTKCampaignsList();
  const [startCampaign] = useStartCampaignMutation();

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await startCampaign({ campaignId }).unwrap();
      // Automatic cache invalidation triggers UI updates
      toast.success('Campaign started successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start campaign');
    }
  };

  if (loading) return <CampaignSkeleton />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onStart={() => handleStartCampaign(campaign.id)}
        />
      ))}
    </div>
  );
};
```

### Bulk Operations Dashboard

```typescript
// Enterprise bulk operations with real-time tracking
const BulkOperationsDashboard: React.FC = () => {
  const dispatch = useDispatch();
  
  // RTK Query hooks for API operations
  const [bulkGenerateDomains] = useBulkGenerateDomainsMutation();
  const { data: operations = [], refetch } = useListBulkOperationsQuery();
  
  // Redux state for UI tracking
  const activeOperations = useSelector(selectActiveOperations);
  const canStartNew = useSelector(selectCanStartNewOperation);

  const handleBulkOperation = async (operationType: BulkOperationType, config: any) => {
    if (!canStartNew) {
      toast.error('Maximum concurrent operations reached');
      return;
    }

    const operationId = crypto.randomUUID();
    
    // Start tracking in Redux state
    dispatch(startTracking({
      id: operationId,
      type: operationType,
      status: 'pending',
      progress: 0,
    }));

    try {
      const result = await bulkGenerateDomains(config).unwrap();
      
      dispatch(updateOperationStatus({
        id: operationId,
        status: 'completed',
        result: result.data,
      }));
      
      toast.success(`${operationType} completed successfully`);
    } catch (error: any) {
      dispatch(updateOperationStatus({
        id: operationId,
        status: 'failed',
        error: error.message,
      }));
      
      toast.error(`${operationType} failed: ${error.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BulkOperationsPanel
        onExecute={handleBulkOperation}
        canStartNew={canStartNew}
      />
      <ActiveOperationsTracker operations={activeOperations} />
    </div>
  );
};
```

## Error Handling Strategy

### Unified Error Types

```typescript
interface RTKQueryError {
  message: string;
  status?: number;
  code?: string;
  data?: any;
}

// Error boundary for RTK Query errors
export const RTKQueryErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">API Error</h3>
          <p className="text-red-600 mt-2">{error.message}</p>
          <button 
            onClick={resetError}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry Request
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Performance Optimization

### Caching Strategy

```typescript
// Intelligent cache configuration
const campaignApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCampaigns: builder.query<Campaign[], void>({
      // Cache for 5 minutes
      keepUnusedDataFor: 300,
      // Provide granular cache tags
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Campaign' as const, id })),
              { type: 'Campaign', id: 'LIST' },
            ]
          : [{ type: 'Campaign', id: 'LIST' }],
    }),
    
    updateCampaign: builder.mutation<Campaign, UpdateCampaignRequest>({
      // Optimistic updates
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          campaignApi.util.updateQueryData('getCampaigns', undefined, (draft) => {
            const campaign = draft.find(c => c.id === id);
            if (campaign) {
              Object.assign(campaign, patch);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      // Targeted cache invalidation
      invalidatesTags: (result, error, { id }) => [
        { type: 'Campaign', id },
        { type: 'Campaign', id: 'LIST' },
      ],
    }),
  }),
});
```

### Request Deduplication

RTK Query automatically deduplicates identical requests, preventing unnecessary network calls when multiple components request the same data simultaneously.

### Background Refetching

```typescript
// Automatic background refetching
const { data, error, isLoading, isFetching } = useGetCampaignsQuery(undefined, {
  // Refetch when window regains focus
  refetchOnFocus: true,
  // Refetch when network reconnects
  refetchOnReconnect: true,
  // Poll every 30 seconds in background
  pollingInterval: 30000,
});
```

## Migration Guide

### From Legacy Patterns to RTK Query

**Before (Direct API calls):**
```typescript
// Legacy pattern - direct API calls
const fetchCampaigns = async () => {
  try {
    setLoading(true);
    const response = await fetch('/api/campaigns');
    const data = await response.json();
    setCampaigns(data);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**After (RTK Query):**
```typescript
// Modern RTK Query pattern
const { data: campaigns, isLoading, error } = useGetCampaignsQuery();
```

**Migration Steps:**
1. Replace direct API calls with RTK Query hooks
2. Remove manual loading/error state management
3. Leverage automatic caching and background refetching
4. Implement optimistic updates for mutations
5. Use proper cache invalidation strategies

## Best Practices

### 1. Tag-Based Cache Management
- Use descriptive tag types: `['Campaign', 'Domain', 'Lead', 'BulkOperation']`
- Implement granular tagging with entity IDs
- Invalidate specific entities, not entire lists when possible

### 2. Error Handling
- Always handle both network errors and API errors
- Implement consistent error message display
- Use error boundaries for catastrophic failures
- Provide retry mechanisms for failed requests

### 3. Loading States
- Distinguish between `isLoading` (initial load) and `isFetching` (background updates)
- Show appropriate loading indicators for different states
- Implement skeleton screens for better UX

### 4. Real-time Integration
- Combine RTK Query with WebSocket updates
- Use cache invalidation to trigger refetches on WebSocket events
- Implement proper connection state management

### 5. Performance
- Use `keepUnusedDataFor` appropriately (shorter for dynamic data, longer for static)
- Implement request deduplication through RTK Query's built-in mechanisms
- Leverage background refetching for fresh data without loading states

## Troubleshooting

### Common Issues

**1. Cache Not Updating**
- Verify `providesTags` and `invalidatesTags` are correctly configured
- Check that mutation is properly invalidating related queries
- Ensure cache keys match between queries and invalidations

**2. Stale Data**
- Adjust `keepUnusedDataFor` settings
- Implement proper background refetching
- Use manual `refetch()` when necessary

**3. Memory Leaks**
- Ensure proper component unmounting
- Use RTK Query's automatic subscription management
- Avoid manual cache manipulation unless necessary

**4. Network Errors**
- Implement proper error boundaries
- Handle both RTK Query errors and network failures
- Provide meaningful error messages to users

This architecture provides a robust, scalable foundation for API state management in DomainFlow Studio, ensuring consistent data handling, optimal performance, and excellent developer experience.
