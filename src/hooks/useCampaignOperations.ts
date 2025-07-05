// Campaign Operations Hook - Encapsulates campaign control logic
// Part of the modular architecture with centralized state management

"use client";

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getCampaignById,
  getGeneratedDomainsForCampaign,
  getDnsCampaignDomains,
  getHttpCampaignItems,
  startCampaignPhase,
  pauseCampaign as pauseCampaignAPI,
  resumeCampaign as resumeCampaignAPI,
  stopCampaign as stopCampaignAPI
} from '@/lib/api-client/client';
import { transformCampaignToViewModel } from '@/lib/utils/campaignTransforms';
import type { CampaignType, Campaign, CampaignViewModel, GeneratedDomainBackend, CampaignValidationItem } from '@/lib/types';
import { useCampaignDetailsStore } from '@/lib/stores/campaignDetailsStore';

export const useCampaignOperations = (campaignId: string) => {
  const { toast } = useToast();
  
  // 🔧 FIX: Use stable store references to prevent infinite loops
  const setCampaign = useCampaignDetailsStore(state => state.setCampaign);
  const setLoading = useCampaignDetailsStore(state => state.setLoading);
  const setError = useCampaignDetailsStore(state => state.setError);
  const updateFromAPI = useCampaignDetailsStore(state => state.updateFromAPI);
  const setActionLoading = useCampaignDetailsStore(state => state.setActionLoading);
  const campaign = useCampaignDetailsStore(state => state.campaign);
  const loading = useCampaignDetailsStore(state => state.loading);
  const error = useCampaignDetailsStore(state => state.error);

  // Load campaign data from API
  const loadCampaignData = useCallback(async (showLoadingSpinner = true) => {
    if (!campaignId) {
      setError('Campaign ID is required');
      return;
    }

    if (showLoadingSpinner) setLoading(true);
    setError(null);

    try {
      console.log(`🔍 [Campaign Operations] Loading campaign data for ${campaignId}`);
      
      const rawResponse = await getCampaignById(campaignId);
      let campaignData: Campaign | null = null;

      // Handle different response structures from backend
      if (Array.isArray(rawResponse)) {
        campaignData = rawResponse.find(item =>
          item && typeof item === 'object' && 'id' in item && item.id === campaignId
        ) || rawResponse[0] || null;
      } else if (rawResponse && typeof rawResponse === 'object') {
        if ('campaign' in rawResponse) {
          campaignData = rawResponse.campaign as Campaign;
        } else if ('id' in rawResponse) {
          campaignData = rawResponse as Campaign;
        } else {
          // Check for nested campaign structure
          const possibleKeys = ['data', 'campaign', 'result', 'payload'];
          for (const key of possibleKeys) {
            const nested = (rawResponse as Record<string, unknown>)[key];
            if (nested && typeof nested === 'object' && 'id' in nested) {
              campaignData = nested as Campaign;
              break;
            }
          }
        }
      }

      if (campaignData) {
        const viewModel = transformCampaignToViewModel(campaignData);
        setCampaign(viewModel);
        
        // Load domain data based on campaign type
        await loadDomainData(viewModel);
        
        console.log(`✅ [Campaign Operations] Successfully loaded campaign ${campaignId}`);
      } else {
        throw new Error('Campaign not found in response');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load campaign';
      console.error(`❌ [Campaign Operations] Error loading campaign ${campaignId}:`, error);
      setError(errorMessage);
      toast({
        title: "Error Loading Campaign",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, [campaignId, setCampaign, setLoading, setError]);

  // Load domain data based on campaign type
  const loadDomainData = useCallback(async (campaignData: CampaignViewModel) => {
    try {
      const updates: {
        generatedDomains?: GeneratedDomainBackend[];
        dnsCampaignItems?: CampaignValidationItem[];
        httpCampaignItems?: CampaignValidationItem[];
      } = {};

      if (campaignData.campaignType === 'domain_generation') {
        const domainsResponse = await getGeneratedDomainsForCampaign(campaignId, { limit: 1000, cursor: 0 });
        const domains = extractDomainsFromResponse(domainsResponse);
        updates.generatedDomains = domains as GeneratedDomainBackend[];
      }

      if (campaignData.campaignType === 'dns_validation') {
        const dnsResponse = await getDnsCampaignDomains(campaignId, { limit: 1000, cursor: '0' });
        const dnsItems = Array.isArray(dnsResponse?.data) ? dnsResponse.data : [];
        updates.dnsCampaignItems = dnsItems as CampaignValidationItem[];
      }

      if (campaignData.campaignType === 'http_keyword_validation') {
        const httpResponse = await getHttpCampaignItems(campaignId, { limit: 1000, cursor: '0' });
        const httpItems = Array.isArray(httpResponse?.data) ? httpResponse.data : [];
        updates.httpCampaignItems = httpItems as CampaignValidationItem[];
      }

      updateFromAPI(updates);
      
    } catch (error) {
      console.error(`❌ [Campaign Operations] Error loading domain data:`, error);
    }
  }, [campaignId, updateFromAPI]);

  // Extract domains from different response structures
  const extractDomainsFromResponse = useCallback((response: unknown): GeneratedDomainBackend[] => {
    if (Array.isArray(response)) {
      return response as GeneratedDomainBackend[];
    }
    
    if (response && typeof response === 'object') {
      const possibleKeys = ['data', 'domains', 'generated_domains', 'results', 'items'];
      for (const key of possibleKeys) {
        const nested = (response as Record<string, unknown>)[key];
        if (Array.isArray(nested)) {
          return nested as GeneratedDomainBackend[];
        }
      }
    }
    
    return [];
  }, []);

  // Start campaign phase
  const startPhase = useCallback(async (phaseToStart: CampaignType) => {
    if (!campaign || !campaignId) return;

    const actionKey = `phase-${phaseToStart}`;
    setActionLoading(actionKey, true);

    try {
      console.log(`🚀 [Campaign Operations] Starting phase ${phaseToStart} for campaign ${campaignId}`);
      
      const response = await startCampaignPhase(campaignId);
      
      if (response?.campaign_id) {
        toast({
          title: `${phaseToStart.replace('_', ' ').toUpperCase()} Started`,
          description: response.message || 'Campaign phase started successfully',
        });
        
        // Refresh campaign data
        await loadCampaignData(false);
      } else {
        throw new Error('Invalid response from start campaign API');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start campaign phase';
      console.error(`❌ [Campaign Operations] Error starting phase:`, error);
      
      toast({
        title: "Error Starting Phase",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setActionLoading(actionKey, false);
    }
  }, [campaign, campaignId, setActionLoading, toast]);

  // Pause campaign
  const pauseCampaign = useCallback(async () => {
    if (!campaignId) return;

    setActionLoading('control-pause', true);

    try {
      const response = await pauseCampaignAPI(campaignId);
      
      if (response && typeof response === 'object' && 'campaign_id' in response) {
        toast({
          title: "Campaign Paused",
          description: (response as { message?: string }).message || 'Campaign paused successfully'
        });
        await loadCampaignData(false);
      } else {
        throw new Error('Failed to pause campaign');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause campaign';
      toast({
        title: "Error Pausing Campaign",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setActionLoading('control-pause', false);
    }
  }, [campaignId, setActionLoading, toast]);

  // Resume campaign
  const resumeCampaign = useCallback(async () => {
    if (!campaignId) return;

    setActionLoading('control-resume', true);

    try {
      const response = await resumeCampaignAPI(campaignId);
      
      if (response && typeof response === 'object' && 'campaign_id' in response) {
        toast({
          title: "Campaign Resumed",
          description: (response as { message?: string }).message || 'Campaign resumed successfully'
        });
        await loadCampaignData(false);
      } else {
        throw new Error('Failed to resume campaign');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume campaign';
      toast({
        title: "Error Resuming Campaign",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setActionLoading('control-resume', false);
    }
  }, [campaignId, setActionLoading, toast]);

  // Stop/cancel campaign
  const stopCampaign = useCallback(async () => {
    if (!campaignId) return;

    setActionLoading('control-stop', true);

    try {
      const response = await stopCampaignAPI(campaignId);
      
      if (response && typeof response === 'object' && 'campaign_id' in response) {
        toast({
          title: "Campaign Cancelled",
          description: (response as { message?: string }).message || 'Campaign cancelled successfully'
        });
        await loadCampaignData(false);
      } else {
        throw new Error('Failed to cancel campaign');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel campaign';
      toast({
        title: "Error Cancelling Campaign",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setActionLoading('control-stop', false);
    }
  }, [campaignId, setActionLoading, toast]);

  // Download domains utility
  const downloadDomains = useCallback((domains: string[], fileNamePrefix: string) => {
    if (!domains || domains.length === 0) {
      toast({
        title: "No Domains",
        description: "There are no domains to export.",
        variant: "destructive"
      });
      return;
    }

    const textContent = domains.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix}_${(campaign?.name || 'campaign').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Started",
      description: `${domains.length} domains are being downloaded.`
    });
  }, [campaign?.name, toast]);

  return {
    // State
    campaign,
    loading,
    error,
    
    // Actions
    loadCampaignData,
    startPhase,
    pauseCampaign: pauseCampaign,
    resumeCampaign,
    stopCampaign,
    downloadDomains,
  };
};

export default useCampaignOperations;