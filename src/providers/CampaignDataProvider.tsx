"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { campaignsApi } from '@/lib/api-client/client';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { GeneratedDomain } from '@/lib/api-client/models/generated-domain';
import type { LeadItem } from '@/lib/api-client/models/lead-item';
import { validateBulkEnrichedDataRequest } from '@/lib/utils/uuidValidation';
import { assertBulkEnrichedDataResponse, assertCampaignIdsResponse, LocalEnrichedCampaignData } from '@/lib/utils/typeGuards';

interface CampaignDataContextType {
  campaigns: Map<string, LocalEnrichedCampaignData>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getCampaign: (campaignId: string) => LocalEnrichedCampaignData | undefined;
}

const CampaignDataContext = createContext<CampaignDataContextType | undefined>(undefined);

export function CampaignDataProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState<Map<string, LocalEnrichedCampaignData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[CampaignDataProvider] SINGLE BULK FETCH: Loading all campaigns');

      // Step 1: Get campaign IDs
      const idsResponse = await campaignsApi.getCampaignsStandalone();
      const idsData = assertCampaignIdsResponse(extractResponseData(idsResponse));
      
      let campaignIds: string[] = [];
      if (idsData && Array.isArray(idsData)) {
        campaignIds = idsData.map(campaign => campaign.campaignId || campaign.id).filter(Boolean) as string[];
      }

      if (campaignIds.length === 0) {
        setCampaigns(new Map());
        return;
      }

      // Validate campaign IDs before making bulk request
      const uuidValidationResult = validateBulkEnrichedDataRequest(campaignIds);
      if (!uuidValidationResult.isValid) {
        console.error('[CampaignDataProvider] Invalid campaign IDs detected:', uuidValidationResult.error);
        // Filter out invalid UUIDs and continue with valid ones instead of failing completely
        const validCampaignIds = campaignIds.filter(id => {
          const singleValidation = validateBulkEnrichedDataRequest([id]);
          return singleValidation.isValid;
        });
        
        if (validCampaignIds.length === 0) {
          throw new Error('No valid campaign IDs found');
        }
        
        console.warn(`[CampaignDataProvider] Filtered out ${campaignIds.length - validCampaignIds.length} invalid campaign IDs`);
        campaignIds = validCampaignIds;
      }

      // Step 2: Get ALL enriched data in ONE bulk call
      const bulkRequest = {
        campaignIds,
        limit: 1000, // Get all campaigns
        offset: 0
      };

      const bulkResponse = await campaignsApi.getBulkEnrichedCampaignData(bulkRequest);
      const enrichedData = assertBulkEnrichedDataResponse(extractResponseData(bulkResponse));

      if (!enrichedData?.campaigns) {
        throw new Error('No campaigns data received from bulk API');
      }

      // Use type-safe campaigns map extraction
      const campaignsMap = new Map<string, LocalEnrichedCampaignData>();
      
      Object.entries(enrichedData.campaigns).forEach(([campaignId, campaignData]) => {
        if (campaignData && campaignId) {
          const enriched: LocalEnrichedCampaignData = {
            id: campaignId as any, // UUID type assertion
            name: campaignData.campaign?.name || '',
            currentPhase: campaignData.campaign?.currentPhase,
            phaseStatus: campaignData.campaign?.phaseStatus,
            overallProgress: 0, // Will be calculated from progress if available
            domains: campaignData.domains || [],
            leads: campaignData.leads || [],
            phases: [], // API doesn't provide phases array
            statistics: {}, // API doesn't provide statistics
            metadata: campaignData.campaign || {}
          };
          campaignsMap.set(campaignId, enriched);
        }
      });

      setCampaigns(campaignsMap);
      console.log(`[CampaignDataProvider] SINGLE BULK FETCH: Loaded ${campaignsMap.size} campaigns`);

    } catch (err) {
      console.error('[CampaignDataProvider] SINGLE BULK FETCH failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchAllCampaigns();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllCampaigns, 30000);
    return () => clearInterval(interval);
  }, [fetchAllCampaigns]);

  const getCampaign = useCallback((campaignId: string): LocalEnrichedCampaignData | undefined => {
    return campaigns.get(campaignId);
  }, [campaigns]);

  const contextValue = useMemo(() => ({
    campaigns,
    loading,
    error,
    refetch: fetchAllCampaigns,
    getCampaign
  }), [campaigns, loading, error, fetchAllCampaigns, getCampaign]);

  return (
    <CampaignDataContext.Provider value={contextValue}>
      {children}
    </CampaignDataContext.Provider>
  );
}

export function useCampaignData() {
  const context = useContext(CampaignDataContext);
  if (context === undefined) {
    throw new Error('useCampaignData must be used within a CampaignDataProvider');
  }
  return context;
}

export function useSingleCampaign(campaignId: string) {
  const { getCampaign, loading, error, refetch } = useCampaignData();
  
  return useMemo(() => ({
    campaign: campaignId ? getCampaign(campaignId) : undefined,
    loading,
    error,
    refetch
  }), [campaignId, getCampaign, loading, error, refetch]);
}

export function useCampaignsList() {
  const { campaigns, loading, error, refetch } = useCampaignData();
  
  return useMemo(() => ({
    campaigns: Array.from(campaigns.values()),
    loading,
    error,
    refetch
  }), [campaigns, loading, error, refetch]);
}