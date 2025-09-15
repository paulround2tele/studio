"use client";

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { campaignApi } from '@/store/api/campaignApi';
import type { CampaignResponse } from '@/lib/api-client/models';

// Destructure hooks from the API
const { useGetCampaignsStandaloneQuery } = campaignApi;
// Envelope helpers no longer needed for campaign list; keep for other APIs if required

// Modern campaign data context using RTK Query
export type CampaignLite = {
  id: string;
  name: string;
  currentPhase?: string;
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
    data: campaignsListRaw, 
    isLoading: isLoadingIds, 
    error: idsError,
    refetch: refetchIds
  } = useGetCampaignsStandaloneQuery();

  // DEBUG: Diagnose shape & contents (will remove after fix confirmed)
  // eslint-disable-next-line no-console
  console.log('[DEBUG] campaignsListRaw value', campaignsListRaw);

  // Defensive normalization: accept already-parsed array, wrapped envelope, or unexpected object.
  const campaignsList = useMemo(() => {
    if (!campaignsListRaw) return [] as any[];
    if (Array.isArray(campaignsListRaw)) return campaignsListRaw as any[];
    // Some RTK query usage might pass through an envelope-like object accidentally; attempt to unwrap common keys
    const anyRaw: any = campaignsListRaw;
    if (Array.isArray(anyRaw.data)) return anyRaw.data;
    if (Array.isArray(anyRaw.items)) return anyRaw.items;
    // As last resort, collect values that look like campaigns (have id & name)
    const vals = Object.values(anyRaw).filter(v => v && typeof v === 'object' && 'id' in (v as any) && 'name' in (v as any));
    if (vals.length) return vals as any[];
    return [] as any[];
  }, [campaignsListRaw]);

  // Extract campaign IDs from response - respects backend APIResponse structure
  // Derive campaigns map directly; list of ids not needed currently

  // Build a lightweight campaigns map from the list; domains/leads can be fetched per-campaign when needed
  const campaigns = useMemo(() => {
    const campaignsMap = new Map<string, CampaignLite>();
  (campaignsList || []).forEach((c: CampaignResponse) => {
      if (!c?.id) return;
      campaignsMap.set(c.id, {
        id: c.id,
        name: c.name || '',
        currentPhase: c.currentPhase,
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
        const anyErr = error as Record<string, unknown>;
        if ('status' in anyErr && 'data' in anyErr) {
          const data = anyErr.data as Record<string, unknown> | undefined;
          const dataMsg = (data && (String((data as any).message) || String((data as any).error?.message))) || null;
          return dataMsg || `Request failed with status ${anyErr.status}`;
        }
        if ('message' in anyErr && typeof (anyErr as { message?: unknown }).message === 'string') {
          return (anyErr as { message: string }).message;
        }
        try {
          return JSON.stringify(anyErr);
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
