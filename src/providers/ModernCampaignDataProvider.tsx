// Modern Campaign Data Provider - Phase 3 Redux Implementation
// Replaces legacy WebSocket-based provider with proper Redux/RTK Query architecture

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetCampaignsStandaloneQuery } from '@/store/api/campaignApi';

// Use the single source of truth
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';

interface ModernCampaignDataContextValue {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getCampaign: (campaignId: string) => Campaign | undefined;
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
  data: campaigns,
    isLoading: loading,
    error,
    refetch
  } = useGetCampaignsStandaloneQuery();

  // Use Redux state for any additional state management
  const { selectedCampaignId: _selectedCampaignId } = useAppSelector((state) => state.campaign);

  const getCampaign = (campaignId: string): Campaign | undefined => {
    return (campaigns || []).find(campaign => campaign.id === campaignId);
  };

  const value: ModernCampaignDataContextValue = {
  campaigns: campaigns || [],
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
