/**
 * Server Metrics Hook (Phase 3)
 * RTK Query integration with graceful fallback to client services
 */

import { useMemo } from 'react';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { AggregateSnapshot, DomainMetricsInput } from '@/types/campaignMetrics';
import { 
  transformServerResponse, 
  validateServerResponse, 
  createDefaultSnapshot, 
  logServerWarning,
  ServerMetricsResponse 
} from '@/services/campaignMetrics/serverAdapter';
import { useCampaignMetrics } from '@/lib/hooks/useCampaignMetrics';

// Feature flag check
const USE_SERVER_METRICS = process.env.NEXT_PUBLIC_USE_SERVER_METRICS === 'true';

/**
 * RTK Query API for server metrics endpoints
 */
export const serverMetricsApi = createApi({
  reducerPath: 'serverMetricsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
  }),
  tagTypes: ['ServerMetrics'],
  endpoints: (builder) => ({
    // Current campaign metrics from server
    getCampaignMetrics: builder.query<AggregateSnapshot, string>({
      query: (campaignId) => `/campaigns/${campaignId}/metrics`,
      transformResponse: (response: ServerMetricsResponse) => {
        if (!validateServerResponse(response)) {
          throw new Error('Invalid server metrics response');
        }
        return transformServerResponse(response);
      },
      providesTags: (result, error, campaignId) => [
        { type: 'ServerMetrics', id: campaignId }
      ],
    }),
    
    // Previous campaign metrics for delta calculation
    getPreviousCampaignMetrics: builder.query<AggregateSnapshot, string>({
      query: (campaignId) => `/campaigns/${campaignId}/metrics/previous`,
      transformResponse: (response: ServerMetricsResponse) => {
        if (!validateServerResponse(response)) {
          throw new Error('Invalid server metrics response');
        }
        return transformServerResponse(response);
      },
      providesTags: (result, error, campaignId) => [
        { type: 'ServerMetrics', id: `${campaignId}-previous` }
      ],
    }),
  }),
});

export const { 
  useGetCampaignMetricsQuery,
  useGetPreviousCampaignMetricsQuery 
} = serverMetricsApi;

/**
 * Hook for campaign server metrics with fallback to client computation
 */
export function useCampaignServerMetrics(
  campaignId: string,
  domains: DomainMetricsInput[]
) {
  // Try server first if feature flag is enabled
  const {
    data: serverSnapshot,
    error: serverError,
    isLoading: serverLoading,
    isFetching: serverFetching
  } = useGetCampaignMetricsQuery(campaignId, {
    skip: !USE_SERVER_METRICS
  });

  // Fallback to client computation
  const clientMetrics = useCampaignMetrics(domains);

  // Determine which data source to use
  const shouldUseServer = USE_SERVER_METRICS && serverSnapshot && !serverError;
  
  // Log fallback usage (only once per session)
  useMemo(() => {
    if (USE_SERVER_METRICS && serverError) {
      logServerWarning('Server metrics failed, using client fallback', { 
        campaignId, 
        error: serverError 
      });
    } else if (!USE_SERVER_METRICS) {
      logServerWarning('Server metrics disabled, using client computation', { 
        campaignId 
      });
    }
  }, [USE_SERVER_METRICS, serverError, campaignId]);

  return useMemo(() => {
    if (shouldUseServer && serverSnapshot) {
      // Use server-provided snapshot
      return {
        currentSnapshot: serverSnapshot,
        aggregates: serverSnapshot.aggregates,
        classification: serverSnapshot.classifiedCounts,
        uiBuckets: convertClassificationToUiBuckets(serverSnapshot.classifiedCounts),
        recommendations: [], // TODO: Add server-side recommendations
        isServerData: true,
        isLoading: serverLoading,
        isFetching: serverFetching,
        error: null
      };
    } else {
      // Use client-computed metrics
      const snapshot: AggregateSnapshot = {
        id: `client-${Date.now()}`,
        timestamp: new Date().toISOString(),
        aggregates: clientMetrics.aggregates,
        classifiedCounts: convertUiBucketsToClassification(clientMetrics.uiBuckets)
      };

      return {
        currentSnapshot: snapshot,
        aggregates: clientMetrics.aggregates,
        classification: clientMetrics.classification,
        uiBuckets: clientMetrics.uiBuckets,
        recommendations: clientMetrics.recommendations,
        isServerData: false,
        isLoading: serverLoading,
        isFetching: serverFetching,
        error: serverError
      };
    }
  }, [
    shouldUseServer,
    serverSnapshot,
    serverLoading,
    serverFetching,
    serverError,
    clientMetrics
  ]);
}

/**
 * Hook for previous campaign metrics (for delta calculation)
 */
export function usePreviousCampaignMetrics(campaignId: string) {
  const {
    data: previousSnapshot,
    error,
    isLoading
  } = useGetPreviousCampaignMetricsQuery(campaignId, {
    skip: !USE_SERVER_METRICS
  });

  return useMemo(() => ({
    previousSnapshot,
    isLoading,
    error,
    hasData: !!previousSnapshot
  }), [previousSnapshot, isLoading, error]);
}

/**
 * Convert server classification counts to UI buckets format
 */
function convertClassificationToUiBuckets(classifiedCounts: Record<string, number>) {
  const total = Object.values(classifiedCounts).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) {
    return [];
  }

  return Object.entries(classifiedCounts).map(([label, count]) => ({
    label,
    count,
    percentage: Math.round((count / total) * 100),
    color: getColorForClassification(label)
  }));
}

/**
 * Convert UI buckets back to classification counts format
 */
function convertUiBucketsToClassification(uiBuckets: any[]): Record<string, number> {
  const classification: Record<string, number> = {};
  
  uiBuckets.forEach(bucket => {
    classification[bucket.label] = bucket.count;
  });
  
  return classification;
}

/**
 * Get appropriate color for classification label
 */
function getColorForClassification(label: string): string {
  const lowerLabel = label.toLowerCase();
  
  if (lowerLabel.includes('high') || lowerLabel.includes('excellent')) {
    return '#10b981'; // green
  } else if (lowerLabel.includes('medium') || lowerLabel.includes('good')) {
    return '#f59e0b'; // yellow
  } else if (lowerLabel.includes('low') || lowerLabel.includes('poor')) {
    return '#ef4444'; // red
  }
  
  return '#6b7280'; // gray default
}