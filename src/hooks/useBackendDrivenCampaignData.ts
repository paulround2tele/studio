// Enterprise Backend-Driven Campaign Data Hook
// Uses bulk APIs to eliminate N+1 performance issues

import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSingleCampaignData } from '@/hooks/useBulkCampaignData';
import type { UUID } from '@/lib/api-client/uuid-types';
import {
  WebSocketMessageTypes,
  type WebSocketMessage,
  type PhaseTransitionData,
  processWebSocketMessage
} from '@/lib/websocket/message-handlers';
import type {
  CampaignViewModel,
  CampaignValidationItem,
  GeneratedDomain,
  CampaignSelectedType
} from '@/lib/types';
import { transformCampaignToViewModel } from '@/lib/utils/campaignTransforms';

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
 * ENTERPRISE FIX: Backend-driven hook using bulk APIs instead of individual calls
 * Eliminates N+1 performance issues by using optimized bulk data provider
 */
export function useBackendDrivenCampaignData(campaignId: string): BackendDrivenCampaignData {
  const { campaign: enrichedCampaign, loading, error, refetch } = useSingleCampaignData(campaignId);
  const { toast } = useToast();

  return useMemo((): BackendDrivenCampaignData => {
    if (!enrichedCampaign) {
      return {
        campaign: null,
        generatedDomains: [],
        dnsCampaignItems: [],
        httpCampaignItems: [],
        totalDomainCount: 0,
        loading,
        error,
        refetch
      };
    }

    // Create a minimal OpenAPI Campaign structure with proper typing
    const openApiCampaign = {
      id: enrichedCampaign.id,
      name: enrichedCampaign.name,
      campaignType: 'lead_generation', // Required field for lead generation campaigns
      currentPhase: enrichedCampaign.currentPhase as any,
      phaseStatus: enrichedCampaign.phaseStatus as any,
      overallProgress: enrichedCampaign.overallProgress,
      phases: enrichedCampaign.phases,
      // Provide sensible defaults for missing fields
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPhases: 4,
      completedPhases: 0
    };

    // Transform using the existing, well-tested transformation function
    const transformedCampaign = transformCampaignToViewModel(openApiCampaign as any);

    // Extract domains from enriched data
    const domains = enrichedCampaign.domains || [];
    const generatedDomains: GeneratedDomain[] = domains.map((domain: any, index: number) => ({
      campaignId: campaignId as UUID,
      domainName: domain.name || domain.domainName || domain,
      createdAt: domain.createdAt || new Date().toISOString(),
      dnsStatus: domain.dnsStatus as any,
      httpStatus: domain.httpStatus as any,
      status: domain.status || 'generated'
    }));

    // Extract validation items
    const dnsCampaignItems: CampaignValidationItem[] = domains
      .filter((domain: any) => domain.dnsStatus)
      .map((domain: any, index: number) => ({
        id: domain.id || `dns-${campaignId}-${index}`,
        campaignId: campaignId as UUID,
        domainName: domain.name || domain.domainName || domain,
        status: domain.dnsStatus || 'pending',
        createdAt: domain.createdAt || new Date().toISOString(),
        validatedAt: domain.validatedAt
      }));

    const httpCampaignItems: CampaignValidationItem[] = domains
      .filter((domain: any) => domain.httpStatus)
      .map((domain: any, index: number) => ({
        id: domain.id || `http-${campaignId}-${index}`,
        campaignId: campaignId as UUID,
        domainName: domain.name || domain.domainName || domain,
        status: domain.httpStatus || 'pending',
        createdAt: domain.createdAt || new Date().toISOString(),
        validatedAt: domain.validatedAt
      }));

    const result: BackendDrivenCampaignData = {
      campaign: transformedCampaign,
      generatedDomains,
      dnsCampaignItems,
      httpCampaignItems,
      totalDomainCount: domains.length,
      loading,
      error,
      refetch
    };
    
    return result;
  }, [enrichedCampaign, loading, error, refetch, campaignId]);
}

// Simplified WebSocket integration for real-time updates
export function useWebSocketIntegration(campaignId: string, handlers: {
  onPhaseTransition?: (message: WebSocketMessage) => void;
  onCampaignProgress?: (message: WebSocketMessage) => void;
}) {
  const { toast } = useToast();

  // WebSocket message routing for real-time updates - simplified
  const routeMessage = (message: WebSocketMessage) => {
    const messageType = message.type;
    
    switch (messageType) {
      case WebSocketMessageTypes.PHASE_TRANSITION:
        if (handlers.onPhaseTransition && (message.data as any)?.campaignId === campaignId) {
          handlers.onPhaseTransition(message);
        }
        break;
      
      case WebSocketMessageTypes.CAMPAIGN_PROGRESS:
        if (handlers.onCampaignProgress && (message.data as any)?.campaignId === campaignId) {
          handlers.onCampaignProgress(message);
        }
        break;
      
      default:
        console.log(`[WebSocket] Unhandled message type: ${messageType}`);
    }
  };

  return {
    routeMessage,
    isConnected: false // Simplified for bulk data approach
  };
}