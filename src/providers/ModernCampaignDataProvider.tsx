// Modern Campaign Data Provider - Phase 3 Redux Implementation
// Replaces legacy WebSocket-based provider with proper Redux/RTK Query architecture

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetCampaignsStandaloneQuery } from '@/store/api/campaignApi';
import { transformCampaignToViewModel } from '@/lib/utils/campaignTransforms';
import type { CampaignViewModel } from '@/lib/api-client/types-bridge';

interface ModernCampaignDataContextValue {
  campaigns: CampaignViewModel[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getCampaign: (campaignId: string) => CampaignViewModel | undefined;
}

const ModernCampaignDataContext = createContext<ModernCampaignDataContextValue | null>(null);

interface ModernCampaignDataProviderProps {
  children: ReactNode;
}

export const ModernCampaignDataProvider: React.FC<ModernCampaignDataProviderProps> = ({
  children
}) => {
  // Use RTK Query for data fetching
  const {
    data: apiResponse,
    isLoading: loading,
    error,
    refetch
  } = useGetCampaignsStandaloneQuery();

  // Extract campaigns from API response wrapper
  const apiCampaigns = apiResponse?.data || [];
  
  // Transform API data to view models (with type casting for legacy compatibility)
  const campaigns: CampaignViewModel[] = Array.isArray(apiCampaigns) 
    ? apiCampaigns.map(campaign => transformCampaignToViewModel(campaign as any))
    : [];

  // Use Redux state for any additional state management
  const { selectedCampaignId } = useAppSelector((state) => state.campaign);

  const getCampaign = (campaignId: string): CampaignViewModel | undefined => {
    return campaigns.find(campaign => campaign.id === campaignId);
  };

  const value: ModernCampaignDataContextValue = {
    campaigns,
    loading,
    error: error ? 'Failed to load campaigns' : null,
    refetch,
    getCampaign,
  };

  return (
    <ModernCampaignDataContext.Provider value={value}>
      {children}
    </ModernCampaignDataContext.Provider>
  );
};

export const useModernCampaignData = (): ModernCampaignDataContextValue => {
  const context = useContext(ModernCampaignDataContext);
  if (!context) {
    throw new Error('useModernCampaignData must be used within a ModernCampaignDataProvider');
  }
  return context;
};

// Legacy compatibility hook
export const useCampaignData = useModernCampaignData;
