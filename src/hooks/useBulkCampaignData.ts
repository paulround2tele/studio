// Enterprise Bulk Campaign Data Provider
// 🚀 WEBSOCKET PUSH MODEL: Real-time campaign updates with polling fallback

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { campaignsApi } from '@/lib/api-client/client';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { UUID } from '@/lib/api-client/uuid-types';
import type { BulkEnrichedDataRequest } from '@/lib/api-client/models/bulk-enriched-data-request';
import type { GeneratedDomain } from '@/lib/api-client/models/generated-domain';
import type { LeadItem } from '@/lib/api-client/models/lead-item';
import { validateBulkEnrichedDataRequest } from '@/lib/utils/uuidValidation';
import { assertBulkEnrichedDataResponse, extractCampaignsMap, LocalEnrichedCampaignData } from '@/lib/utils/typeGuards';

/**
 * Validates bulk request campaign count against backend limits
 * @param campaignIds Array of campaign IDs to validate
 * @param requestType Type of bulk request ('enriched', 'logs', 'leads')
 * @throws Error if campaign count exceeds the limit for the request type
 */
interface Limits {
  readonly enriched: 1000;
  readonly logs: 50;
  readonly leads: 50;
}
const validateBulkRequest = (campaignIds: string[], requestType: keyof Limits) => {
  const limits: Limits = {
    'enriched': 1000,
    'logs': 50,
    'leads': 50
  } as const;
  
  const limit = limits[requestType];
  if (limit === undefined) {
    throw new Error(`Unknown bulk request type: ${String(requestType)}`);
  }
  
  if (campaignIds.length > limit) {
    throw new Error(`Maximum ${limit} campaigns allowed for ${requestType} requests`);
  }
};

export interface BulkCampaignDataOptions {
  campaignIds: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
  offset?: number;
}

export interface BulkCampaignDataResult {
  campaigns: Map<string, LocalEnrichedCampaignData>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getCampaign: (campaignId: string) => LocalEnrichedCampaignData | undefined;
}

/**
 * Enterprise-grade bulk campaign data provider
 * Eliminates N+1 API calls by fetching multiple campaigns in a single request
 */
export function useBulkCampaignData(options: BulkCampaignDataOptions): BulkCampaignDataResult {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { campaignIds, autoRefresh = false, refreshInterval = 30000, limit = 100, offset = 0 } = options;
  
  const [campaigns, setCampaigns] = useState<Map<string, LocalEnrichedCampaignData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time campaign progress handler
  const handleCampaignProgress = useCallback((message: { type: string; data?: unknown }) => {
    console.log('[BulkCampaignData] 🚀 Real-time campaign progress:', message);
    
    if (message.type === 'campaign_progress' && message.data) {
      const progressData = message.data as {
        campaignId?: string;
        progress?: number;
        phase?: string;
        status?: string;
      };
      
      if (progressData.campaignId) {
        setCampaigns(prev => {
          const updated = new Map(prev);
          const existing = updated.get(progressData.campaignId!);
          
          if (existing) {
            // Update campaign with real-time progress
            const updatedCampaign: LocalEnrichedCampaignData = {
              ...existing,
              currentPhase: progressData.phase || existing.currentPhase,
              phaseStatus: progressData.status || existing.phaseStatus,
              overallProgress: progressData.progress ?? existing.overallProgress
            };
            
            updated.set(progressData.campaignId!, updatedCampaign);
            console.log(`[BulkCampaignData] 🚀 Updated campaign ${progressData.campaignId} progress: ${progressData.progress}%`);
          }
          
          return updated;
        });
      }
    }
  }, []);

  // Real-time phase transition handler
  const handlePhaseTransition = useCallback((message: { type: string; data?: unknown }) => {
    console.log('[BulkCampaignData] 🚀 Real-time phase transition:', message);
    
    if (message.type === 'phase_transition' && message.data) {
      const transitionData = message.data as {
        campaignId?: string;
        fromPhase?: string;
        toPhase?: string;
        status?: string;
      };
      
      if (transitionData.campaignId) {
        setCampaigns(prev => {
          const updated = new Map(prev);
          const existing = updated.get(transitionData.campaignId!);
          
          if (existing) {
            // Update campaign with phase transition
            const updatedCampaign: LocalEnrichedCampaignData = {
              ...existing,
              currentPhase: transitionData.toPhase || existing.currentPhase,
              phaseStatus: transitionData.status || existing.phaseStatus
            };
            
            updated.set(transitionData.campaignId!, updatedCampaign);
            console.log(`[BulkCampaignData] 🚀 Campaign ${transitionData.campaignId} transitioned: ${transitionData.fromPhase} → ${transitionData.toPhase}`);
          }
          
          return updated;
        });
      }
    }
  }, []);

  const fetchBulkData = useCallback(async () => {
    if (!campaignIds.length) {
      setCampaigns(new Map());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[BulkCampaignData] ENTERPRISE: Fetching ${campaignIds.length} campaigns via bulk API`);

      // Validate UUID format and count against backend limits
      const uuidValidationResult = validateBulkEnrichedDataRequest(campaignIds);
      if (!uuidValidationResult.isValid) {
        setError(uuidValidationResult.error || `Invalid campaignIds provided`);
		console.error('[useDashboardCampaigns] Invalid campaignIds found:', uuidValidationResult.error);
        return;
      }

      // Validate campaign count against backend limits (legacy validation for additional safety)
      validateBulkRequest(campaignIds, 'enriched');

      const bulkRequest: BulkEnrichedDataRequest = {
        campaignIds,
        limit,
        offset
      };

      const bulkResponse = await campaignsApi.getBulkEnrichedCampaignData(bulkRequest);
      const enrichedData = assertBulkEnrichedDataResponse(extractResponseData(bulkResponse));

      if (!enrichedData?.campaigns) {
        throw new Error('No campaigns data received from bulk API');
      }

      // Use type-safe campaigns map extraction
      const campaignsMap = extractCampaignsMap(enrichedData);

      setCampaigns(prev => new Map([...prev, ...campaignsMap]));
      console.log(`[BulkCampaignData] ENTERPRISE: Successfully loaded ${campaignsMap.size} campaigns`);

    } catch (err) {
      console.error('[BulkCampaignData] ENTERPRISE: Bulk fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bulk campaign data');
    } finally {
      setLoading(false);
    }
  }, [campaignIds, limit, offset]);

  // Auto-refresh functionality (reduced frequency with WebSocket push model)
  useEffect(() => {
    if (!campaignIds.length || !autoRefresh) return;
    
    // Set up new interval for periodic refresh (throttled)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const intervalId = setInterval(fetchBulkData, refreshInterval);
    intervalRef.current = intervalId;

    console.log(`[BulkCampaignData] 🔄 Auto-refresh interval set to ${refreshInterval}ms`);
    return () => {
      console.log('[BulkCampaignData] 🔄 Clearing auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [campaignIds, autoRefresh, refreshInterval, fetchBulkData]);

  // Initial fetch and WebSocket setup
  useEffect(() => {
    fetchBulkData();
    
    return () => {};
  }, [fetchBulkData]);

  
    // Memoized getter function
    const getCampaign = useCallback((campaignId: string): LocalEnrichedCampaignData | undefined => {
      return campaigns.get(campaignId);
    }, [campaigns]);
  
    return useMemo(() => ({
      campaigns,
      loading,
      error,
      refetch: fetchBulkData,
      getCampaign
    }), [campaigns, loading, error, fetchBulkData]);
  }
/**
 * Convenience hook for single campaign data (still uses bulk API internally)
 */
export function useSingleCampaignData(campaignId: string) {
  // Validate single campaign ID before making bulk request
  const validatedCampaignIds = useMemo(() => {
    if (!campaignId) return [];
    
    const uuidValidationResult = validateBulkEnrichedDataRequest([campaignId]);
    if (!uuidValidationResult.isValid) {
      console.error('[useSingleCampaignData] Invalid campaign ID:', campaignId, uuidValidationResult.error);
      return []; // Return empty array to prevent API call with invalid ID
    }
    
    return [campaignId];
  }, [campaignId]);

  const bulkResult = useBulkCampaignData({
    campaignIds: validatedCampaignIds,
    autoRefresh: true,
    refreshInterval: 60000 // 🚀 WEBSOCKET PUSH MODEL: Reduced from 15s to 60s as WebSocket provides real-time updates
  });

  return useMemo(() => ({
    campaign: campaignId ? bulkResult.getCampaign(campaignId) : undefined,
    loading: bulkResult.loading,
    error: bulkResult.error,
    refetch: bulkResult.refetch
  }), [campaignId, bulkResult]);
}

/**
 * Hook for dashboard-style bulk loading with pagination
 */
export function useDashboardCampaigns(campaignIds: string[], pageSize: number = 50) {
  // Validate campaign IDs before slicing for pagination
  const validatedCampaignIds = useMemo(() => {
    if (!campaignIds.length) return [];
    
    const slicedIds = campaignIds.slice(0, pageSize);
    const uuidValidationResult = validateBulkEnrichedDataRequest(slicedIds);
    if (!uuidValidationResult.isValid) {
      console.error('[useDashboardCampaigns] Invalid campaignIds found:', uuidValidationResult.error);
      // Filter out invalid UUIDs and continue with valid ones
      return slicedIds.filter(id => {
        const singleValidation = validateBulkEnrichedDataRequest([id]);
        return singleValidation.isValid;
      });
    }
    
    return slicedIds;
  }, [campaignIds, pageSize]);

  return useBulkCampaignData({
    campaignIds: validatedCampaignIds,
    autoRefresh: true,
    refreshInterval: 20000,
    limit: pageSize
  });
}