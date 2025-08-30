# API System Documentation

## Overview

This document provides comprehensive documentation of the Domain Flow Studio API system, including all endpoints, auto-generated client methods, and frontend integration patterns.

## Architecture

The API system is built on OpenAPI 3.1 specifications with auto-generated TypeScript clients, providing complete type safety and consistent error handling throughout the application stack.

### Core Technologies

- Strict OpenAPI 3.1 contracts with generated Chi server (oapi-codegen strict server)
- Type-safe generated TypeScript client (Axios-based)
- Unified `APIResponse<T>`/envelope structure with request/response validation
- Frontend integration via RTK Query and shared Axios configuration

### Unified Response Structure

```typescript
interface APIResponse<T> {
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

## API Endpoints and Client Methods

### 1. Authentication API
**Client**: `AuthenticationApi`

```typescript
import { authenticationApi } from '@/lib/api-client';

// User authentication
await authenticationApi.authLoginPost(credentials);
await authenticationApi.authLogoutPost();
await authenticationApi.authMeGet();
await authenticationApi.authPasswordPost(passwordRequest);
```

### 2. Campaigns API
**Client**: `CampaignsApi`

```typescript
const campaignsApi = new CampaignsApi();

// Campaign management
await campaignsApi.campaignsGet(limit, offset, status);
await campaignsApi.campaignsPost(campaignRequest);
await campaignsApi.campaignsCampaignIdGet(campaignId);
await campaignsApi.campaignsCampaignIdPut(campaignId, updateRequest);
await campaignsApi.campaignsCampaignIdDelete(campaignId);

// Bulk operations
await campaignsApi.campaignsBulkGet(bulkRequest);
```

### 3. Bulk Operations API
**Client**: `BulkOperationsApi`

```typescript
const bulkApi = new BulkOperationsApi();

// Domain validation
await bulkApi.validateBulkDomainsPost(validationRequest);

// Campaign operations
await bulkApi.bulkCampaignOperationsPost(operationsRequest);

// Analytics
await bulkApi.bulkAnalyticsPost(analyticsRequest);
```

### 4. Proxies API
**Client**: `ProxiesApi`

```typescript
const proxiesApi = new ProxiesApi();

// Proxy management
await proxiesApi.proxiesGet(limit, offset, protocol, isEnabled, isHealthy);
await proxiesApi.proxiesPost(createRequest);
await proxiesApi.proxiesProxyIdGet(proxyId);
await proxiesApi.proxiesProxyIdPut(proxyId, updateRequest);
await proxiesApi.proxiesProxyIdDelete(proxyId);

// Bulk operations
await proxiesApi.proxiesBulkTestPost(bulkTestRequest);
await proxiesApi.proxiesBulkUpdatePut(bulkUpdateRequest);
await proxiesApi.proxiesBulkDeleteDelete(bulkDeleteRequest);

// Health monitoring
await proxiesApi.proxiesHealthCheckPost();
await proxiesApi.proxiesStatusGet();
```

### 5. Database API
**Client**: `DatabaseApi`

```typescript
const databaseApi = new DatabaseApi();

// Database management
await databaseApi.databaseSchemaStatsGet();
await databaseApi.databaseTablesGet();
await databaseApi.resourcesBulkPost(resourceRequest);
```

### 6. Validation API
**Client**: `ValidationApi`

```typescript
const validationApi = new ValidationApi();

// Validation services
await validationApi.validateBulkDnsPost(dnsValidationRequest);
await validationApi.validateBulkHttpPost(httpValidationRequest);
```

### Additional APIs

The system includes these additional API categories:

- **Personas API**: User persona management
- **Keyword Extraction API**: Content analysis and keyword extraction
- **Keyword Sets API**: Keyword rule management
- **Health API**: System health monitoring
- **Analytics API**: Advanced analytics and reporting
- **Feature Flags API**: Feature toggle management
- **Management API**: System administration
- **Monitoring API**: Performance monitoring
- **Resources API**: Resource allocation
- **Server Settings API**: Configuration management
- **SSE API**: Server-sent events for real-time updates
- **WebSocket API**: WebSocket connection management
- **Proxy Pools API**: Proxy pool management

## Frontend Integration

### RTK Query Setup

```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v2',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      headers.set('X-Requested-With', 'XMLHttpRequest');
      return headers;
    }
  }),
  tagTypes: ['Campaign', 'Proxy', 'User'],
  endpoints: (builder) => ({
    getCampaigns: builder.query({
      query: (params) => campaignsApi.campaignsGet(params),
      providesTags: ['Campaign']
    }),
    createCampaign: builder.mutation({
      query: (campaign) => campaignsApi.campaignsPost(campaign),
      invalidatesTags: ['Campaign']
    })
  })
});
```

### Component Usage

```typescript
import { useGetCampaignsQuery, useCreateCampaignMutation } from './api';

export function CampaignDashboard() {
  const { 
    data: campaigns, 
    error, 
    isLoading 
  } = useGetCampaignsQuery({ 
    limit: 20, 
    offset: 0 
  });

  const [createCampaign] = useCreateCampaignMutation();

  const handleCreateCampaign = async (campaignData) => {
    try {
      const result = await createCampaign(campaignData).unwrap();
      console.log('Campaign created:', result);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <button onClick={() => handleCreateCampaign(newCampaignData)}>
        Create Campaign
      </button>
      {campaigns?.data?.map(campaign => 
        <CampaignCard key={campaign.id} campaign={campaign} />
      )}
    </div>
  );
}
```

## API Client Configuration

### Base Configuration

```typescript
import { Configuration } from '@/lib/api-client';

const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return isDevelopment 
      ? `${protocol}//${hostname}:8080/api/v2`
      : `${protocol}//${hostname}/api/v2`;
  }

  return '/api/v2';
};

export const apiConfiguration = new Configuration({
  basePath: getApiBaseUrl(),
  baseOptions: {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
});
```

### Pre-configured API Instances

```typescript
import {
  AuthenticationApi,
  CampaignsApi,
  BulkOperationsApi,
  ProxiesApi,
  DatabaseApi,
  ValidationApi
} from '@/lib/api-client';

// Export configured instances
export const authenticationApi = new AuthenticationApi(apiConfiguration);
export const campaignsApi = new CampaignsApi(apiConfiguration);
export const bulkOperationsApi = new BulkOperationsApi(apiConfiguration);
export const proxiesApi = new ProxiesApi(apiConfiguration);
export const databaseApi = new DatabaseApi(apiConfiguration);
export const validationApi = new ValidationApi(apiConfiguration);
```

## Real-Time Features

### Server-Sent Events (SSE)

```typescript
// Global event stream
const eventSource = new EventSource('/api/v2/sse/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  dispatch(updateSystemState(data));
};

// Campaign-specific events
const campaignEvents = new EventSource(`/api/v2/sse/campaigns/${campaignId}/events`);

campaignEvents.onmessage = (event) => {
  const progressData = JSON.parse(event.data);
  dispatch(updateCampaignProgress({ campaignId, ...progressData }));
};
```

> Note: WebSockets have been removed. Real-time updates are provided exclusively via SSE as shown above.

## Error Handling

### Centralized Error Handling

```typescript
import { isRejectedWithValue } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';

export const errorHandlingMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const error = action.payload as APIResponse<any>;
    
    if (error.error) {
      console.error('API Error:', {
        message: error.error.message,
        code: error.error.code,
        requestId: error.requestId,
        details: error.error.details
      });
      
      // Handle specific error codes
      if (error.error.code === 'UNAUTHORIZED') {
        window.location.href = '/login';
      }
    }
  }

  return next(action);
};
```

## Documentation Structure

### API Documentation

- OpenAPI 3.1 specification: `backend/openapi/dist/openapi.yaml`
- Generated client docs: `src/lib/api-client/docs/`
- Optional HTML docs can be generated locally with your preferred OpenAPI viewer (e.g., Redocly, Swagger UI container) pointing at the spec above.

### Documentation Files

Key documentation files include:

- `src/lib/api-client/README.md`: Client library overview
- `src/lib/api-client/docs/`: Individual API documentation
- `docs/API_ARCHITECTURE.md`: High-level architecture overview
- This file: Complete system documentation

## Performance Considerations

### Caching Strategy

RTK Query provides automatic caching with configurable cache times:

```typescript
getCampaigns: builder.query({
  query: (params) => campaignsApi.campaignsGet(params),
  keepUnusedDataFor: 60, // Cache for 60 seconds
  providesTags: (result) => 
    result?.data?.map(({ id }) => ({ type: 'Campaign', id })) ?? []
})
```

### Bulk Operations

For large-scale operations, use the dedicated bulk endpoints:

- `BulkOperationsApi` for domain validation and campaign management
- Pagination parameters for large result sets
- Resource allocation endpoints for memory management

## Security

### Authentication

- Session-based authentication with secure cookies
- CSRF protection via `X-Requested-With` header
- Automatic session refresh for long-running operations

### Data Protection

- All API communications over HTTPS in production
- Request ID tracking for audit trails
- Input validation on all endpoints

## Monitoring and Observability

### Health Checks

```typescript
// System health monitoring
const healthStatus = await healthApi.healthGet();
const dbStatus = await databaseApi.databaseHealthGet();
```

### Analytics

```typescript
// Performance analytics
const analyticsData = await analyticsApi.analyticsSystemGet();
const campaignMetrics = await bulkOperationsApi.bulkAnalyticsPost({
  metrics: ['performance', 'success_rate', 'error_rate']
});
```

This documentation provides a complete overview of the API system architecture, client usage patterns, and integration strategies for the Domain Flow Studio application.
