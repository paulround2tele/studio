// Enterprise Bulk Campaign Data Provider
// Replaces all individual N+1 API calls with optimized bulk operations

import { useState, useEffect, useCallback, useMemo } from 'react';
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
const validateBulkRequest = (campaignIds: string[], requestType: string) => {
  const limits = {
    'enriched': 1000,
    'logs': 50,
    'leads': 50
  } as const;
  
  const limit = limits[requestType as keyof typeof limits];
  if (!limit) {
    throw new Error(`Unknown bulk request type: ${requestType}`);
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
  const { campaignIds, autoRefresh = false, refreshInterval = 30000, limit = 100, offset = 0 } = options;
  
  const [campaigns, setCampaigns] = useState<Map<string, LocalEnrichedCampaignData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(uuidValidationResult.error || 'Invalid campaign IDs provided');
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

      setCampaigns(campaignsMap);
      console.log(`[BulkCampaignData] ENTERPRISE: Successfully loaded ${campaignsMap.size} campaigns`);

    } catch (err) {
      console.error('[BulkCampaignData] ENTERPRISE: Bulk fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bulk campaign data');
    } finally {
      setLoading(false);
    }
  }, [campaignIds, limit, offset]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !campaignIds.length) return;

    const interval = setInterval(() => {
      fetchBulkData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchBulkData, campaignIds.length]);

  // Initial fetch
  useEffect(() => {
    fetchBulkData();
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
  }), [campaigns, loading, error, fetchBulkData, getCampaign]);
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
    refreshInterval: 15000
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
      console.error('[useDashboardCampaigns] Invalid campaign IDs found:', uuidValidationResult.error);
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