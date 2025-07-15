// Campaign Operations Hook - Encapsulates campaign control logic
// Part of the modular architecture with centralized state management

"use client";

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { campaignsApi } from '@/lib/api-client/client';
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

      // 🔧 CRITICAL FIX: Check currentPhase for validation transitions
      const isDNSValidationPhase = (campaignData as { currentPhase?: string }).currentPhase === 'dns_validation';
      const isHTTPValidationPhase = (campaignData as { currentPhase?: string }).currentPhase === 'http_keyword_validation' ||
                                    (campaignData as { currentPhase?: string }).currentPhase === 'http_keyword_validation' ||
                                    (campaignData as { currentPhase?: string }).currentPhase === 'http_keyword_validation';
      
      // 🔥 CRITICAL FIX: PHASE-AWARE DOMAIN LOADING
      // DNS validation and HTTP validation campaigns are essentially domain generation campaigns
      // that have been transitioned to validation phases. They ALWAYS need to show generated domains.
      const hasDomainGenerationHistory =
        campaignData.campaignType === 'domain_generation' ||
        campaignData.campaignType === 'dns_validation' ||
        campaignData.campaignType === 'http_keyword_validation' ||
        campaignData.domainGenerationParams !== undefined;
      
      if (hasDomainGenerationHistory) {
        console.log('📡 [Domain Loading] Loading generated domains (phase-aware)...', {
campaignType: campaignData.campaignType,
          currentPhase: (campaignData as { currentPhase?: string }).currentPhase  as any,
hasDomainGenParams: !!campaignData.domainGenerationParams,
          reason: campaignData.campaignType === 'domain_generation' ? 'direct_domain_generation' :
                  campaignData.campaignType === 'dns_validation' ? 'dns_validation_campaign' :
                  campaignData.campaignType === 'http_keyword_validation' ? 'http_validation_campaign' :
                  campaignData.domainGenerationParams ? 'has_domain_gen_params' : 'unknown'
        });
        
        const domainsResponse = await campaignsApi.getGeneratedDomains(campaignId, 1000, 0);
        console.log('📡 [Domain Loading] Raw API response:', domainsResponse);
        
        const domains = extractDomainsFromResponse(domainsResponse.data);
        updates.generatedDomains = domains as GeneratedDomainBackend[];
        
        console.log('✅ [Domain Loading] Generated domains loaded (phase-aware):', {
count: domains.length,
          sampleDomains: domains.slice(0, 3).map(d => d.domainName),
          currentPhase: isDNSValidationPhase ? 'DNS_VALIDATION' : isHTTPValidationPhase ? 'HTTP_VALIDATION' : 'DOMAIN_GENERATION'  as any,
campaignType: campaignData.campaignType
        });
      }

      if (campaignData.campaignType === 'dns_validation' || isDNSValidationPhase) {
        console.log('📡 [Domain Loading] Fetching DNS validation items...');
        const dnsResponse = await campaignsApi.getDNSValidationResults(campaignId, 1000);
        const dnsItems = Array.isArray(dnsResponse?.data) ? dnsResponse.data : [];
        updates.dnsCampaignItems = dnsItems as CampaignValidationItem[];
        console.log('✅ [Domain Loading] DNS items loaded:', dnsItems.length);
      }

      // CRITICAL FIX: For HTTP validation phase, ensure we load both generated domains AND HTTP results
      if (campaignData.campaignType === 'http_keyword_validation' || isHTTPValidationPhase) {
        console.log('📡 [Domain Loading] Fetching HTTP validation items...');
        const httpResponse = await campaignsApi.getHTTPKeywordResults(campaignId, 1000);
        const httpItems = Array.isArray(httpResponse?.data) ? httpResponse.data : [];
        updates.httpCampaignItems = httpItems as CampaignValidationItem[];
        console.log('✅ [Domain Loading] HTTP items loaded:', httpItems.length);

        // CRITICAL FIX: If this is an HTTP validation phase for a domain_generation campaign,
        // we need to also load the generated domains if we haven't already
        if (isHTTPValidationPhase && campaignData.campaignType === 'domain_generation' && !updates.generatedDomains) {
          console.log('📡 [Domain Loading] Loading generated domains for HTTP validation phase...');
          const domainsResponse = await campaignsApi.getGeneratedDomains(campaignId);
          const domains = extractDomainsFromResponse(domainsResponse.data);
          updates.generatedDomains = domains as GeneratedDomainBackend[];
          console.log('✅ [Domain Loading] Generated domains loaded for HTTP validation:', domains.length);
        }
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
      const rawResponse = await campaignsApi.getCampaignDetails(campaignId);
      let campaignData: Campaign | null = null;

      // Extract data from AxiosResponse
      const responseData = rawResponse.data;

      // Handle different response structures from backend
      if (Array.isArray(responseData)) {
        campaignData = responseData.find(item =>
          item && typeof item === 'object' && 'id' in item && item.id === campaignId
        ) || responseData[0] || null;
      } else if (responseData && typeof responseData === 'object') {
        if ('campaign' in responseData) {
          campaignData = responseData.campaign as Campaign;
        } else if ('id' in responseData) {
          campaignData = responseData as Campaign;
        } else {
          // Check for nested campaign structure
          const possibleKeys = ['data', 'campaign', 'result', 'payload'];
          for (const key of possibleKeys) {
            const nested = (responseData as Record<string, unknown>)[key];
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
      
      // Use enhanced API client for campaign operations
      console.log(`📡 [Campaign Operations] Starting campaign phase ${phaseToStart} for campaign ${campaignId}`);
      response = await campaignsApi.startCampaign(campaignId);
      
      // Handle response from enhanced client (AxiosResponse)
      const responseData = response && typeof response === 'object' && 'data' in response ? response.data : response;
      
      if (responseData && typeof responseData === 'object' &&
          ('campaign_id' in responseData || 'message' in responseData)) {
        toast({
title: `${phaseToStart.replace('_', ' ').toUpperCase()} Started`,
          description: (responseData as any)?.message || 'Campaign phase started successfully'
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
      const response = await campaignsApi.pauseCampaign(campaignId);
      
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
      const response = await campaignsApi.resumeCampaign(campaignId);
      
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
      const response = await campaignsApi.cancelCampaign(campaignId);
      
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
      const response = await campaignsApi.deleteCampaign(campaignId);
      
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
    downloadDomains
};
};

export default useCampaignOperations;