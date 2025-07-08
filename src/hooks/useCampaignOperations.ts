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
  validateDNSForCampaign,
  validateHTTPForCampaign,
  pauseCampaign as pauseCampaignAPI,
  resumeCampaign as resumeCampaignAPI,
  stopCampaign as stopCampaignAPI,
  deleteCampaign as deleteCampaignAPI
} from '@/lib/api-client/client';
import { transformCampaignToViewModel } from '@/lib/utils/campaignTransforms';
import type { CampaignViewModel, CampaignValidationItem } from '@/lib/types';
import type { components } from '@/lib/api-client/types';

type Campaign = components['schemas']['Campaign'];
type CampaignType = NonNullable<Campaign['campaignType']>;
type GeneratedDomainBackend = components['schemas']['GeneratedDomain'];
import { useCampaignDetailsStore } from '@/lib/stores/campaignDetailsStore';

export const useCampaignOperations = (campaignId: string) => {
  const { toast } = useToast();
  
  // 🔧 CRITICAL FIX: Access store functions directly without subscriptions
  const campaign = useCampaignDetailsStore(state => state.campaign);
  const loading = useCampaignDetailsStore(state => state.loading);
  const error = useCampaignDetailsStore(state => state.error);

  // Extract domains from different response structures
  const extractDomainsFromResponse = useCallback((response: unknown): GeneratedDomainBackend[] => {
    console.log('🔍 [Domain Extraction] Parsing response:', { response, type: typeof response });
    
    if (Array.isArray(response)) {
      console.log('✅ [Domain Extraction] Direct array response:', response.length, 'domains');
      return response as GeneratedDomainBackend[];
    }
    
    if (response && typeof response === 'object') {
      const responseObj = response as Record<string, unknown>;
      
      // Check for standard API wrapper with success/data structure
      if (responseObj.success && responseObj.data && typeof responseObj.data === 'object') {
        const dataObj = responseObj.data as Record<string, unknown>;
        
        // Handle double-nested data structure: response.data.data
        if (Array.isArray(dataObj.data)) {
          console.log('✅ [Domain Extraction] Double-nested response.data.data:', dataObj.data.length, 'domains');
          return dataObj.data as GeneratedDomainBackend[];
        }
        
        // Handle single-nested: response.data (direct array)
        if (Array.isArray(dataObj)) {
          console.log('✅ [Domain Extraction] Single-nested response.data:', dataObj.length, 'domains');
          return dataObj as GeneratedDomainBackend[];
        }
      }
      
      // Fallback: Try various possible key names
      const possibleKeys = ['data', 'domains', 'generated_domains', 'results', 'items'];
      for (const key of possibleKeys) {
        const nested = responseObj[key];
        if (Array.isArray(nested)) {
          console.log('✅ [Domain Extraction] Found domains at key:', key, ':', nested.length, 'domains');
          return nested as GeneratedDomainBackend[];
        }
        
        // Handle nested object with data array
        if (nested && typeof nested === 'object') {
          const nestedObj = nested as Record<string, unknown>;
          if (Array.isArray(nestedObj.data)) {
            console.log('✅ [Domain Extraction] Found domains at', key + '.data:', nestedObj.data.length, 'domains');
            return nestedObj.data as GeneratedDomainBackend[];
          }
        }
      }
    }
    
    console.warn('⚠️ [Domain Extraction] No domains found in response structure');
    return [];
  }, []);

  // 🔧 CRITICAL FIX: Load domain data with direct store access and enhanced logging
  const loadDomainData = useCallback(async (campaignData: CampaignViewModel) => {
    console.log('🔍 [Domain Loading] Starting for campaign:', {
      id: campaignId,
      type: campaignData.campaignType,
      status: campaignData.status
    });

    try {
      const updates: {
        generatedDomains?: GeneratedDomainBackend[];
        dnsCampaignItems?: CampaignValidationItem[];
        httpCampaignItems?: CampaignValidationItem[];
      } = {};

      if (campaignData.campaignType === 'domain_generation') {
        console.log('📡 [Domain Loading] Fetching generated domains...');
        const domainsResponse = await getGeneratedDomainsForCampaign(campaignId, { limit: 1000, cursor: 0 });
        console.log('📡 [Domain Loading] Raw API response:', domainsResponse);
        
        const domains = extractDomainsFromResponse(domainsResponse);
        updates.generatedDomains = domains as GeneratedDomainBackend[];
        
        console.log('✅ [Domain Loading] Extracted domains:', {
          count: domains.length,
          sampleDomains: domains.slice(0, 3).map(d => d.domainName)
        });
      }

      if (campaignData.campaignType === 'dns_validation') {
        console.log('📡 [Domain Loading] Fetching DNS validation items...');
        const dnsResponse = await getDnsCampaignDomains(campaignId, { limit: 1000, cursor: '0' });
        const dnsItems = Array.isArray(dnsResponse?.data) ? dnsResponse.data : [];
        updates.dnsCampaignItems = dnsItems as CampaignValidationItem[];
        console.log('✅ [Domain Loading] DNS items loaded:', dnsItems.length);
      }

      if (campaignData.campaignType === 'http_keyword_validation') {
        console.log('📡 [Domain Loading] Fetching HTTP validation items...');
        const httpResponse = await getHttpCampaignItems(campaignId, { limit: 1000, cursor: '0' });
        const httpItems = Array.isArray(httpResponse?.data) ? httpResponse.data : [];
        updates.httpCampaignItems = httpItems as CampaignValidationItem[];
        console.log('✅ [Domain Loading] HTTP items loaded:', httpItems.length);
      }

      // 🔧 Direct store access to avoid dependency cycles
      console.log('💾 [Domain Loading] Updating store with:', {
        generatedDomainsCount: updates.generatedDomains?.length || 0,
        dnsItemsCount: updates.dnsCampaignItems?.length || 0,
        httpItemsCount: updates.httpCampaignItems?.length || 0
      });
      
      useCampaignDetailsStore.getState().updateFromAPI(updates);
      
      console.log('✅ [Domain Loading] Store updated successfully');
      
    } catch (error) {
      console.error(`❌ [Domain Loading] Error loading domain data:`, error);
    }
  }, [campaignId, extractDomainsFromResponse]);
  // 🔧 CRITICAL FIX: Create stable loadCampaignData function with proper dependencies
  const loadCampaignData = useCallback(async (showLoadingSpinner = true) => {
    if (!campaignId) {
      useCampaignDetailsStore.getState().setError('Campaign ID is required');
      return;
    }

    if (showLoadingSpinner) useCampaignDetailsStore.getState().setLoading(true);
    useCampaignDetailsStore.getState().setError(null);

    try {
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
        useCampaignDetailsStore.getState().setCampaign(viewModel);
        
        // Load domain data based on campaign type
        await loadDomainData(viewModel);
      } else {
        throw new Error('Campaign not found in response');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load campaign';
      useCampaignDetailsStore.getState().setError(errorMessage);
      toast({
        title: "Error Loading Campaign",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (showLoadingSpinner) useCampaignDetailsStore.getState().setLoading(false);
    }
  }, [campaignId, toast, loadDomainData]);


  // Start campaign phase
  const startPhase = useCallback(async (phaseToStart: CampaignType) => {
    if (!campaign || !campaignId) return;

    const actionKey = `phase-${phaseToStart}`;
    useCampaignDetailsStore.getState().setActionLoading(actionKey, true);

    try {
      console.log(`🚀 [Campaign Operations] Starting phase ${phaseToStart} for campaign ${campaignId}`, {
        campaignStatus: campaign.status,
        campaignType: campaign.campaignType,
        phaseToStart
      });
      
      let response;
      
      // 🔧 CRITICAL FIX: Use domain-centric approach for DNS validation on completed campaigns
      if (phaseToStart === 'dns_validation' && campaign.status === 'completed' && campaign.campaignType === 'domain_generation') {
        console.log(`📡 [Campaign Operations] Using domain-centric DNS validation endpoint for completed domain generation campaign`);
        response = await validateDNSForCampaign(campaignId);
      } else if (phaseToStart === 'http_keyword_validation' && campaign.status === 'completed' && campaign.campaignType === 'dns_validation') {
        console.log(`📡 [Campaign Operations] Using domain-centric HTTP validation endpoint for completed DNS validation campaign`);
        response = await validateHTTPForCampaign(campaignId);
      } else {
        console.log(`📡 [Campaign Operations] Using standard campaign start endpoint for new campaign`);
        response = await startCampaignPhase(campaignId);
      }
      
      if (response?.campaign_id || response?.message) {
        toast({
          title: `${phaseToStart.replace('_', ' ').toUpperCase()} Started`,
          description: response.message || 'Campaign phase started successfully',
        });
        
        // Refresh campaign data
        await loadCampaignData(false);
      } else {
        throw new Error('Invalid response from campaign API');
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
      useCampaignDetailsStore.getState().setActionLoading(actionKey, false);
    }
  }, [campaign, campaignId, toast, loadCampaignData]);

  // Pause campaign
  const pauseCampaign = useCallback(async () => {
    if (!campaignId) return;

    useCampaignDetailsStore.getState().setActionLoading('control-pause', true);

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
      useCampaignDetailsStore.getState().setActionLoading('control-pause', false);
    }
  }, [campaignId, toast, loadCampaignData]);

  // Resume campaign
  const resumeCampaign = useCallback(async () => {
    if (!campaignId) return;

    useCampaignDetailsStore.getState().setActionLoading('control-resume', true);

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
      useCampaignDetailsStore.getState().setActionLoading('control-resume', false);
    }
  }, [campaignId, toast, loadCampaignData]);

  // Stop/cancel campaign
  const stopCampaign = useCallback(async () => {
    if (!campaignId) return;

    useCampaignDetailsStore.getState().setActionLoading('control-stop', true);

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
      useCampaignDetailsStore.getState().setActionLoading('control-stop', false);
    }
  }, [campaignId, toast, loadCampaignData]);

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

  // Delete campaign
  const deleteCampaign = useCallback(async () => {
    if (!campaignId) return;

    useCampaignDetailsStore.getState().setActionLoading('control-delete', true);

    try {
      const response = await deleteCampaignAPI(campaignId);
      
      if (response && typeof response === 'object' && 'success' in response && response.success) {
        toast({
          title: "Campaign Deleted",
          description: (response as { message?: string }).message || 'Campaign deleted successfully'
        });
        // Note: Don't reload campaign data since campaign is deleted
        return true;
      } else {
        throw new Error('Failed to delete campaign');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete campaign';
      toast({
        title: "Error Deleting Campaign",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      useCampaignDetailsStore.getState().setActionLoading('control-delete', false);
    }
  }, [campaignId, toast]);

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
    deleteCampaign,
    downloadDomains,
  };
};

export default useCampaignOperations;