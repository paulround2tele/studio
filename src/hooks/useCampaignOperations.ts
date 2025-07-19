// Campaign Operations Hook - Encapsulates campaign control logic
// Part of the modular architecture with centralized state management

"use client";

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { transformCampaignToViewModel } from '@/lib/utils/campaignTransforms';
import type { CampaignViewModel, CampaignValidationItem, DomainActivityStatus } from '@/lib/types';
import type { components } from '@/lib/api-client/types';
import {
  getRichCampaignData,
  startCampaign as startCampaignService,
  pauseCampaign as pauseCampaignService,
  resumeCampaign as resumeCampaignService,
  cancelCampaign as cancelCampaignService,
  deleteCampaign as deleteCampaignService
} from '@/lib/services/unifiedCampaignService';

type Campaign = components['schemas']['Campaign'];
type CampaignType = NonNullable<Campaign['campaignType']>;
type GeneratedDomainBackend = components['schemas']['GeneratedDomain'];
import { useCampaignDetailsStore } from '@/lib/stores/campaignDetailsStore';

// Helper function to safely access array properties from Record<string, unknown>
const safeGetArray = (obj: Record<string, unknown> | null | undefined, key: string): unknown[] => {
  if (!obj || !(key in obj)) return [];
  const value = obj[key];
  return Array.isArray(value) ? value : [];
};

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
      // BULK-ONLY STRATEGY: Load all data via enhanced bulk service once
      console.log('📡 [Domain Loading] BULK-ONLY: Loading all campaign data via enhanced bulk service');
      const richData = await getRichCampaignData(campaignId);
      
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
        console.log('📡 [Domain Loading] BULK-ONLY: Processing generated domains from bulk data');
        
        const domains = safeGetArray(richData, 'domains');
        if (domains.length > 0) {
          updates.generatedDomains = domains.map((domainName: unknown, index: number) => ({
            id: `domain-${index}`,
            domainName: String(domainName),
            generationCampaignId: campaignId,
            createdAt: new Date().toISOString()
          } as GeneratedDomainBackend));
        } else {
          updates.generatedDomains = [];
        }
        
        console.log('✅ [Domain Loading] BULK-ONLY: Generated domains loaded:', {
          count: updates.generatedDomains?.length || 0,
          sampleDomains: updates.generatedDomains?.slice(0, 3).map(d => d.domainName) || [],
          currentPhase: isDNSValidationPhase ? 'DNS_VALIDATION' : isHTTPValidationPhase ? 'HTTP_VALIDATION' : 'DOMAIN_GENERATION' as any,
          campaignType: campaignData.campaignType
        });
      }

      if (campaignData.campaignType === 'dns_validation' || isDNSValidationPhase) {
        console.log('📡 [Domain Loading] BULK-ONLY: Using enhanced bulk service for DNS validation');
        
        // Use bulk service data instead of individual API call
        const dnsValidatedDomains = safeGetArray(richData, 'dnsValidatedDomains');
        if (dnsValidatedDomains.length > 0) {
          updates.dnsCampaignItems = dnsValidatedDomains.map((domainName: unknown, index: number) => ({
            id: `dns-${index}`,
            domainName: String(domainName),
            generationCampaignId: campaignId,
            type: 'dns' as const,
            status: 'passed' as DomainActivityStatus,
            validationDate: new Date().toISOString(),
            campaignId
          }));
        } else {
          updates.dnsCampaignItems = [];
        }
        
        console.log('✅ [Domain Loading] BULK-ONLY: DNS items loaded:', updates.dnsCampaignItems?.length || 0);
      }

      // CRITICAL FIX: For HTTP validation phase, use bulk service data
      if (campaignData.campaignType === 'http_keyword_validation' || isHTTPValidationPhase) {
        console.log('📡 [Domain Loading] BULK-ONLY: Processing HTTP validation items from bulk data');
        
        const httpKeywordResults = safeGetArray(richData, 'httpKeywordResults');
        if (httpKeywordResults.length > 0) {
          updates.httpCampaignItems = httpKeywordResults.map((result: unknown, index: number) => ({
            id: (result as any)?.id || `http-${index}`,
            domainName: (result as any)?.domain || 'unknown',
            generationCampaignId: campaignId,
            type: 'http' as const,
            status: 'passed' as DomainActivityStatus,
            validationDate: new Date().toISOString(),
            campaignId
          }));
        } else {
          updates.httpCampaignItems = [];
        }
        
        console.log('✅ [Domain Loading] BULK-ONLY: HTTP items loaded:', updates.httpCampaignItems?.length || 0);

        // If we need generated domains for HTTP validation and haven't loaded them yet
        if (isHTTPValidationPhase && campaignData.campaignType === 'domain_generation' && !updates.generatedDomains) {
          console.log('📡 [Domain Loading] BULK-ONLY: Loading generated domains for HTTP validation from bulk data');
          
          if (richData?.domains && Array.isArray(richData.domains)) {
            updates.generatedDomains = (richData.domains as string[]).map((domainName: string, index: number) => ({
              id: `domain-${index}`,
              domainName,
              generationCampaignId: campaignId,
              createdAt: new Date().toISOString()
            } as GeneratedDomainBackend));
          } else {
            updates.generatedDomains = [];
          }
          
          console.log('✅ [Domain Loading] BULK-ONLY: Generated domains loaded for HTTP validation:', updates.generatedDomains?.length || 0);
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
      console.log(`🔍 [Campaign Loading] BULK-ONLY: Starting load for campaign ID: ${campaignId}`);
      
      // BULK-ONLY STRATEGY: Use getRichCampaignData instead of individual getCampaignDetails
      const richData = await getRichCampaignData(campaignId);
      let campaignData: Campaign | null = null;

      if (richData) {
        // Convert RichCampaignData back to Campaign format for compatibility
        campaignData = {
          ...richData,
          // Convert arrays back to counts if needed for legacy compatibility
          domains: safeGetArray(richData, 'domains').length,
          dnsValidatedDomains: safeGetArray(richData, 'dnsValidatedDomains').length,
          leads: safeGetArray(richData, 'leads').length
        } as any;
        
        console.log(`📡 [Campaign Loading] BULK-ONLY: Campaign data loaded:`, {
          id: campaignData?.id,
          name: campaignData?.name,
          campaignType: campaignData?.campaignType,
          status: campaignData?.status,
          domainsCount: safeGetArray(richData, 'domains').length,
          dnsValidatedCount: safeGetArray(richData, 'dnsValidatedDomains').length,
          leadsCount: safeGetArray(richData, 'leads').length
        });
      } else {
        console.warn(`⚠️ [Campaign Loading] BULK-ONLY: No campaign data available for ${campaignId}`);
      }

      if (campaignData) {
        console.log(`🎯 [Campaign Loading] Campaign data extracted:`, {
          id: campaignData.id,
          name: campaignData.name,
          type: campaignData.campaignType,
          status: campaignData.status,
          hasValidId: !!campaignData.id && campaignData.id !== '00000000-0000-0000-0000-000000000000'
        });
        
        // Debug: Log the campaign data structure we extracted
        console.log(`🔍 [Campaign Loading] Extracted campaign data structure:`, {
          hasId: !!campaignData.id,
          id: campaignData.id,
          dataKeys: Object.keys(campaignData),
          firstFewChars: JSON.stringify(campaignData).substring(0, 200)
        });
        
        const viewModel = transformCampaignToViewModel(campaignData);
        console.log(`✅ [Campaign Loading] Successfully transformed to view model:`, {
          id: viewModel.id,
          progress: viewModel.progressPercentage,
          totalItems: viewModel.totalItems,
          processedItems: viewModel.processedItems
        });
        
        useCampaignDetailsStore.getState().setCampaign(viewModel);
        
        // Load domain data based on campaign type
        await loadDomainData(viewModel);
      } else {
        console.error(`❌ [Campaign Loading] BULK-ONLY: No valid campaign data found via bulk service`);
        throw new Error(`Campaign not found via bulk service for ID: ${campaignId}`);
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
      
      // Use unified campaign service for operations
      console.log(`📡 [Campaign Operations] Starting campaign phase ${phaseToStart} for campaign ${campaignId}`);
      const result = await startCampaignService(campaignId);
      
      if (result.success) {
        toast({
          title: `${phaseToStart.replace('_', ' ').toUpperCase()} Started`,
          description: result.message || 'Campaign phase started successfully'
        });
        
        // Refresh campaign data
        await loadCampaignData(false);
      } else {
        throw new Error(result.error || 'Failed to start campaign phase');
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
      const result = await pauseCampaignService(campaignId);
      
      if (result.success) {
        toast({
title: "Campaign Paused",
          description: result.message || 'Campaign paused successfully'
        });
        await loadCampaignData(false);
      } else {
        throw new Error(result.error || 'Failed to pause campaign');
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
      const result = await resumeCampaignService(campaignId);
      
      if (result.success) {
        toast({
title: "Campaign Resumed",
          description: result.message || 'Campaign resumed successfully'
        });
        await loadCampaignData(false);
      } else {
        throw new Error(result.error || 'Failed to resume campaign');
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
      const result = await cancelCampaignService(campaignId);
      
      if (result.success) {
        toast({
title: "Campaign Cancelled",
          description: result.message || 'Campaign cancelled successfully'
        });
        await loadCampaignData(false);
      } else {
        throw new Error(result.error || 'Failed to cancel campaign');
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
      const result = await deleteCampaignService(campaignId);
      
      if (result.success) {
        toast({
title: "Campaign Deleted",
          description: result.message || 'Campaign deleted successfully'
        });
        // Note: Don't reload campaign data since campaign is deleted
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete campaign');
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