import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Types for the monitoring system we just built
export interface ResourceMetrics {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
}

export interface PerformanceMetrics {
  timestamp: string;
  operation_type: string;
  duration_ms: number;
  throughput_per_second: number;
  error_rate: number;
  success_count: number;
  error_count: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  last_check: string;
  issues: string[];
  cpu_status: 'normal' | 'high' | 'critical';
  memory_status: 'normal' | 'high' | 'critical';
  disk_status: 'normal' | 'high' | 'critical';
}

export interface CleanupStatus {
  total_campaigns_tracked: number;
  campaigns_awaiting_cleanup: number;
  last_cleanup_run: string;
  cleanup_errors: string[];
}

export interface CampaignResourceMetrics {
  campaign_id: string;
  cpu_usage: number;
  memory_usage: number;
  duration_ms: number;
  status: string;
}

// RTK Query API for our monitoring endpoints
export const monitoringApi = createApi({
  reducerPath: 'monitoringApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v2/monitoring',
    credentials: 'include',
  }),
  tagTypes: ['MonitoringHealth', 'ResourceMetrics', 'PerformanceMetrics', 'CleanupStatus'],
  endpoints: (builder) => ({
    
    // Health endpoint - matches /api/v2/monitoring/health
    getSystemHealth: builder.query<SystemHealth, void>({
      query: () => '/health',
      providesTags: ['MonitoringHealth'],
    }),

    // Resource stats - matches /api/v2/monitoring/stats
    getResourceMetrics: builder.query<ResourceMetrics, void>({
      query: () => '/stats',
      providesTags: ['ResourceMetrics'],
    }),

    // Performance metrics - matches /api/v2/monitoring/performance
    getPerformanceMetrics: builder.query<PerformanceMetrics[], { hours?: number }>({
      query: ({ hours = 24 } = {}) => `/performance?hours=${hours}`,
      providesTags: ['PerformanceMetrics'],
    }),

    // Campaign-specific monitoring - matches /api/v2/monitoring/campaigns/:id
    getCampaignMetrics: builder.query<CampaignResourceMetrics, string>({
      query: (campaignId) => `/campaigns/${campaignId}`,
      providesTags: (_result, _error, campaignId) => [
        { type: 'ResourceMetrics', id: campaignId }
      ],
    }),

    // Cleanup status - matches /api/v2/monitoring/cleanup/status
    getCleanupStatus: builder.query<CleanupStatus, void>({
      query: () => '/cleanup/status',
      providesTags: ['CleanupStatus'],
    }),

    // Force cleanup - matches /api/v2/monitoring/cleanup/force/:id
    forceCleanupCampaign: builder.mutation<{ message: string }, string>({
      query: (campaignId) => ({
        url: `/cleanup/force/${campaignId}`,
        method: 'POST',
      }),
      invalidatesTags: ['CleanupStatus'],
    }),

  }),
});

// Export hooks for components
export const {
  useGetSystemHealthQuery,
  useGetResourceMetricsQuery,
  useGetPerformanceMetricsQuery,
  useGetCampaignMetricsQuery,
  useGetCleanupStatusQuery,
  useForceCleanupCampaignMutation,
} = monitoringApi;
