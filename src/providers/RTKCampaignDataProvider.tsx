"use client";

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { campaignApi } from '@/store/api/campaignApi';
import type { CampaignResponse } from '@/lib/api-client/models';
import { normalizeToApiPhase, type ApiPhase } from '@/lib/utils/phaseNames';

// Destructure hooks from the API
const { useGetCampaignsStandaloneQuery } = campaignApi;
// Envelope helpers no longer needed for campaign list; keep for other APIs if required

// Modern campaign data context using RTK Query
export type CampaignLite = {
  id: string;
  name: string;
  currentPhase: ApiPhase;
  overallProgress: number;
  domains: unknown[];
  leads: unknown[];
  metadata: CampaignResponse;
};

interface RTKCampaignDataContextType {
  campaigns: Map<string, CampaignLite>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getCampaign: (campaignId: string) => CampaignLite | undefined;
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
  // Derive campaigns map directly; list of ids not needed currently

  // Build a lightweight campaigns map from the list; domains/leads can be fetched per-campaign when needed
  const campaigns = useMemo(() => {
    const campaignsMap = new Map<string, CampaignLite>();
    (campaignsList || []).forEach((c: CampaignResponse) => {
      if (!c?.id) return;
      const normalizedPhase = typeof c.currentPhase === 'string'
        ? normalizeToApiPhase(c.currentPhase)
        : null;
      campaignsMap.set(c.id, {
        id: c.id,
        name: c.name || '',
        currentPhase: normalizedPhase ?? 'discovery',
        overallProgress: typeof c.progress?.percentComplete === 'number' ? c.progress.percentComplete : 0,
        domains: [],
        leads: [],
        metadata: c,
      });
    });
    return campaignsMap;
  }, [campaignsList]);

  // Handle RTK Query errors properly
  const getErrorMessage = (error: unknown): string | null => {
      if (error == null) return null;
      // If it's already a string
      if (typeof error === 'string') return error;
      // If it's an Error instance
      if (error instanceof Error) return error.message;
      // Only use 'in' for non-null objects
      if (typeof error === 'object') {
        const errorRecord = error as Record<string, unknown>;
        if ('status' in errorRecord && 'data' in errorRecord) {
          const rawData = errorRecord.data;
          if (typeof rawData === 'object' && rawData !== null) {
            const responseData = rawData as Record<string, unknown>;
            const message = typeof responseData.message === 'string' ? responseData.message : null;
            const nestedError = (() => {
              const nested = responseData.error;
              if (typeof nested === 'object' && nested !== null && 'message' in nested && typeof (nested as { message?: unknown }).message === 'string') {
                return (nested as { message: string }).message;
              }
              return null;
            })();
            if (message) return message;
            if (nestedError) return nestedError;
          }
          return `Request failed with status ${String(errorRecord.status)}`;
        }
        if ('message' in errorRecord && typeof (errorRecord as { message?: unknown }).message === 'string') {
          return (errorRecord as { message: string }).message;
        }
        try {
          return JSON.stringify(errorRecord);
  } catch (_e) {
          // JSON stringify failed; return generic message
          return 'Unknown error';
        }
      }
      return 'Network Error';
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
