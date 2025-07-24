// Backend-Driven Campaign Data Hook
// Uses pre-configured campaignsApi for direct API calls

import { useState, useEffect, useCallback } from 'react';
import { campaignsApi } from '@/lib/api-client/client';
import { useToast } from '@/hooks/use-toast';
import {
  WebSocketMessageTypes,
  type PhaseTransitionMessage,
  type EnhancedPhaseTransitionMessage,
  routeWebSocketMessage,
  type WebSocketHandlers
} from '@/lib/websocket/message-handlers';
import type {
  CampaignViewModel,
  CampaignValidationItem,
  GeneratedDomain
} from '@/lib/types';

export interface BackendDrivenCampaignData {
  campaign: CampaignViewModel | null;
  generatedDomains: GeneratedDomain[];
  dnsCampaignItems: CampaignValidationItem[];
  httpCampaignItems: CampaignValidationItem[];
  totalDomainCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Backend-driven hook that fetches campaign data directly from unifiedCampaignService
 * Eliminates frontend store dependencies for true backend-driven architecture
 */
export function useBackendDrivenCampaignData(campaignId: string): BackendDrivenCampaignData {
  const [data, setData] = useState<BackendDrivenCampaignData>({
    campaign: null,
    generatedDomains: [],
    dnsCampaignItems: [],
    httpCampaignItems: [],
    totalDomainCount: 0,
    loading: true,
    error: null,
    refetch: () => {}
  });
  
  const { toast } = useToast();

  const fetchCampaignData = useCallback(async () => {
    if (!campaignId) {
      setData(prev => ({ ...prev, error: 'Campaign ID is required', loading: false }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      console.log(`[BackendDriven] Fetching campaign data for ${campaignId}`);
      
      // Use pre-configured campaignsApi for backend-driven data fetching
      const progressResponse = await campaignsApi.getCampaignProgressStandalone(campaignId);
      
      // Handle unified APIResponse structure safely
      const responseData = progressResponse.data;
      let campaignData: any = null;
      
      if (responseData && typeof responseData === 'object') {
        // Check if response follows APIResponse<T> pattern with data field
        if ('data' in responseData) {
          campaignData = (responseData as any).data;
        } else {
          // Direct response without wrapper
          campaignData = responseData;
        }
      }
      
      if (!campaignData) {
        throw new Error(`No campaign data found for campaign ${campaignId}`);
      }

      console.log(`[BackendDriven] Raw campaign data:`, {
        hasDomains: !!campaignData?.domains,
        domainsCount: Array.isArray(campaignData?.domains) ? campaignData.domains.length : 0,
        campaignKeys: Object.keys(campaignData),
        phases: campaignData?.phases
      });

      // Transform API data to component-expected format
      const transformedData: BackendDrivenCampaignData = {
        campaign: campaignData as CampaignViewModel,
        generatedDomains: campaignData?.domains || [],
        dnsCampaignItems: campaignData?.dnsValidatedDomains?.map((domain: string, index: number) => ({
          id: `dns-${index}`,
          domainName: domain,
          generationCampaignId: campaignId,
          type: 'dns' as const,
          status: 'passed' as const,
          validationDate: new Date().toISOString(),
          campaignId
        })) || [],
        httpCampaignItems: campaignData?.httpKeywordResults?.map((result: any, index: number) => ({
          id: `http-${index}`,
          domainName: result?.domain || 'unknown',
          generationCampaignId: campaignId,
          type: 'http' as const,
          status: 'passed' as const,
          validationDate: new Date().toISOString(),
          campaignId
        })) || [],
        totalDomainCount: campaignData?.domains?.length || 0,
        loading: false,
        error: null,
        refetch: fetchCampaignData
      };

      console.log(`[BackendDriven] Transformed data:`, {
        campaignId: transformedData.campaign?.id,
        generatedDomainsCount: transformedData.generatedDomains.length,
        dnsItemsCount: transformedData.dnsCampaignItems.length,
        httpItemsCount: transformedData.httpCampaignItems.length
      });

      setData(transformedData);
      
    } catch (error) {
      console.error(`[BackendDriven] Error fetching campaign data:`, error);
      
      // Enhanced error handling for API responses
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error && 'response' in error) {
        const apiError = error as any;
        errorMessage = apiError.response?.data?.error ||
                      apiError.response?.data?.message ||
                      apiError.message ||
                      'API request failed';
      }
      
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [campaignId]);

  // WebSocket message handlers for automatic phase transitions
  const handlePhaseTransition = useCallback((message: PhaseTransitionMessage) => {
    if (message.data.campaignId === campaignId) {
      const phaseDisplayNames: Record<string, string> = {
        'generation': 'Domain Generation',
        'dns_validation': 'DNS Validation',
        'http_keyword_validation': 'HTTP Keyword Validation',
        'analysis': 'Analysis'
      };

      const fromPhase = phaseDisplayNames[message.data.previousPhase] || message.data.previousPhase;
      const toPhase = phaseDisplayNames[message.data.newPhase] || message.data.newPhase;

      toast({
        title: "🚀 Phase Transition",
        description: `Campaign automatically progressed from ${fromPhase} to ${toPhase}`,
        duration: 5000
      });

      // Refresh campaign data to show updated phase
      fetchCampaignData();
    }
  }, [campaignId, fetchCampaignData, toast]);

  const handleEnhancedPhaseTransition = useCallback((message: EnhancedPhaseTransitionMessage) => {
    if (message.data.campaignId === campaignId) {
      const phaseDisplayNames: Record<string, string> = {
        'generation': 'Domain Generation',
        'dns_validation': 'DNS Validation',
        'http_keyword_validation': 'HTTP Keyword Validation',
        'analysis': 'Analysis'
      };

      const fromPhase = message.data.previousPhase
        ? phaseDisplayNames[message.data.previousPhase] || message.data.previousPhase
        : 'Previous Phase';
      const toPhase = phaseDisplayNames[message.data.newPhase] || message.data.newPhase;

      // Show enhanced notification with more details
      toast({
        title: "✨ Automatic Phase Progression",
        description: `${fromPhase} completed successfully! Now starting ${toPhase} (${message.data.domainsCount} domains)`,
        duration: 6000
      });

      // Refresh campaign data to show updated phase
      fetchCampaignData();
    }
  }, [campaignId, fetchCampaignData, toast]);

  // WebSocket listeners
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const messageData = JSON.parse(event.data);
        
        if (messageData.type === WebSocketMessageTypes.PHASE_TRANSITION) {
          handlePhaseTransition(messageData as PhaseTransitionMessage);
        } else if (messageData.type === WebSocketMessageTypes.CAMPAIGN_PHASE_TRANSITION) {
          handleEnhancedPhaseTransition(messageData as EnhancedPhaseTransitionMessage);
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    // Listen for custom events that relay WebSocket messages
    const handleForceRefresh = (event: CustomEvent) => {
      if (event.detail?.campaignId === campaignId) {
        fetchCampaignData();
      }
    };

    // Add event listeners
    window.addEventListener('force_campaign_refresh', handleForceRefresh as EventListener);
    
    // Note: In a real implementation, you'd connect to the actual WebSocket here
    // For now, we rely on the existing WebSocket infrastructure and custom events
    
    return () => {
      window.removeEventListener('force_campaign_refresh', handleForceRefresh as EventListener);
    };
  }, [campaignId, handlePhaseTransition, handleEnhancedPhaseTransition, fetchCampaignData]);

  // Initial fetch
  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  // Add refetch function to returned data
  return {
    ...data,
    refetch: fetchCampaignData
  };
}