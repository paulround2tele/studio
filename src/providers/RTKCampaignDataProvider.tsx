"use client";

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { campaignApi } from '@/store/api/campaignApi';

// Destructure hooks from the API
const { useGetCampaignsStandaloneQuery } = campaignApi;
// Envelope helpers no longer needed for campaign list; keep for other APIs if required

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
    data: campaignsList, 
    isLoading: isLoadingIds, 
    error: idsError,
    refetch: refetchIds
  } = useGetCampaignsStandaloneQuery();

  // Extract campaign IDs from response - respects backend APIResponse structure
  const campaignIds = useMemo(() => {
    const list = Array.isArray(campaignsList) ? campaignsList : [];
    return list.map(c => c.id).filter(Boolean) as string[];
  }, [campaignsList]);

  // Build a lightweight campaigns map from the list; domains/leads can be fetched per-campaign when needed
  const campaigns = useMemo(() => {
    const campaignsMap = new Map();
    (campaignsList || []).forEach((c: any) => {
      if (!c?.id) return;
      campaignsMap.set(c.id, {
        id: c.id,
        name: c.name || '',
        currentPhase: c.currentPhase,
        phaseStatus: c.phaseStatus,
        overallProgress: 0,
        domains: [],
        leads: [],
        metadata: c,
      });
    });
    return campaignsMap;
  }, [campaignsList]);

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
  const loading = isLoadingIds;
  const error = getErrorMessage(idsError);

  const refetch = () => {
    refetchIds();
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
