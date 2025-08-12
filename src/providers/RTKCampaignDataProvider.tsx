"use client";

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useGetCampaignsStandaloneQuery, useGetBulkEnrichedCampaignDataQuery } from '@/store/api/campaignApi';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { BulkEnrichedDataResponse } from '@/lib/api-client/professional-types';

// Modern campaign data context using RTK Query
interface RTKCampaignDataContextType {
  campaigns: Map<string, any>; // Will use proper types from API response
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getCampaign: (campaignId: string) => any | undefined;
}

const RTKCampaignDataContext = createContext<RTKCampaignDataContextType | undefined>(undefined);

interface RTKCampaignDataProviderProps {
  children: ReactNode;
}

export function RTKCampaignDataProvider({ children }: RTKCampaignDataProviderProps) {
  // Step 1: Get list of campaign IDs
  const { 
    data: campaignListResponse, 
    isLoading: isLoadingIds, 
    error: idsError,
    refetch: refetchIds
  } = useGetCampaignsStandaloneQuery();

  // Extract campaign IDs from response - respects backend APIResponse structure
  const campaignIds = useMemo(() => {
    if (!campaignListResponse?.data) return [];
    
    // Backend returns: { success: true, data: CampaignData[], requestId: "..." }
    const campaigns = campaignListResponse.data;
    if (Array.isArray(campaigns)) {
      return campaigns
        .map(campaign => campaign.campaignId || campaign.id)
        .filter(Boolean) as string[];
    }
    return [];
  }, [campaignListResponse]);

  // Step 2: Get bulk enriched data for all campaigns
  const {
    data: bulkResponse,
    isLoading: isLoadingBulk,
    error: bulkError,
    refetch: refetchBulk
  } = useGetBulkEnrichedCampaignDataQuery(
    {
      campaignIds,
      limit: 1000,
      offset: 0
    },
    {
      skip: campaignIds.length === 0 // Skip if no campaign IDs
    }
  );

  // Process the bulk response into a campaigns map
  const campaigns = useMemo(() => {
    const campaignsMap = new Map();
    
    if (bulkResponse?.campaigns) {
      Object.entries(bulkResponse.campaigns).forEach(([campaignId, campaignData]) => {
        if (campaignData && campaignId) {
          campaignsMap.set(campaignId, {
            id: campaignId,
            name: campaignData.campaign?.name || '',
            currentPhase: campaignData.campaign?.currentPhase,
            phaseStatus: campaignData.campaign?.phaseStatus,
            overallProgress: 0, // Default progress - will be calculated from domains
            domains: campaignData.domains || [],
            leads: campaignData.leads || [],
            metadata: campaignData.campaign || {}
          });
        }
      });
    }
    
    return campaignsMap;
  }, [bulkResponse]);

  // Handle RTK Query errors properly
  const getErrorMessage = (error: any): string | null => {
    if (!error) return null;
    if ('status' in error && 'data' in error) {
      return error.data?.message || `Request failed with status ${error.status}`;
    }
    if ('message' in error) {
      return error.message;
    }
    return 'An error occurred';
  };

  // Combine loading states and errors
  const loading = isLoadingIds || isLoadingBulk;
  const error = getErrorMessage(idsError) || getErrorMessage(bulkError);

  const refetch = () => {
    refetchIds();
    refetchBulk();
  };

  const getCampaign = (campaignId: string) => {
    return campaigns.get(campaignId);
  };

  const contextValue: RTKCampaignDataContextType = {
    campaigns,
    loading,
    error,
    refetch,
    getCampaign
  };

  return (
    <RTKCampaignDataContext.Provider value={contextValue}>
      {children}
    </RTKCampaignDataContext.Provider>
  );
}

// Hook to use the RTK campaign data context
export function useRTKCampaignData() {
  const context = useContext(RTKCampaignDataContext);
  if (context === undefined) {
    throw new Error('useRTKCampaignData must be used within a RTKCampaignDataProvider');
  }
  return context;
}

// Hook for campaigns list - matches legacy interface
export function useRTKCampaignsList() {
  const { campaigns, loading, error, refetch } = useRTKCampaignData();
  
  const campaignsArray = useMemo(() => {
    return Array.from(campaigns.values());
  }, [campaigns]);

  return {
    campaigns: campaignsArray,
    loading,
    error,
    refetch
  };
}
