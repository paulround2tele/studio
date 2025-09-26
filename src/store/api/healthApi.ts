/**
 * Health API - Testing migrated health endpoints  
 * Uses new direct response format (no SuccessEnvelope)
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Direct import of new response types
import type { components } from '@/lib/api-client/types';

type HealthResponse = components['schemas']['HealthResponse'];
type PingResponse = components['schemas']['PingResponse'];

export const healthApi = createApi({
  reducerPath: 'healthApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v2',
  }),
  endpoints: (builder) => ({
    // Health check - returns HealthResponse directly (no envelope)
    healthCheck: builder.query<HealthResponse, void>({
      query: () => '/health',
      // No transformResponse needed - direct response format!
    }),
    
    // Ping - returns PingResponse directly (no envelope)  
    ping: builder.query<PingResponse, void>({
      query: () => '/ping',
      // No transformResponse needed - direct response format!
    }),
    
    // Ready check - returns HealthResponse directly
    readyCheck: builder.query<HealthResponse, void>({
      query: () => '/health/ready',
    }),
    
    // Live check - returns HealthResponse directly
    liveCheck: builder.query<HealthResponse, void>({
      query: () => '/health/live',
    }),
  }),
});

export const {
  useHealthCheckQuery,
  usePingQuery,
  useReadyCheckQuery,
  useLiveCheckQuery,
} = healthApi;