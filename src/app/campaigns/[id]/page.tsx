// Refactored Campaign Details Page - Enterprise-scale modular architecture
// Replaces the original 1869-line monolithic component with high-performance modular design

"use client";

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Briefcase } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import CampaignProgress from '@/components/campaigns/CampaignProgress';
import ContentSimilarityView from '@/components/campaigns/ContentSimilarityView';

// New modular components
import CampaignHeader from '@/components/campaigns/CampaignHeader';
import CampaignControls from '@/components/campaigns/CampaignControls';
import CampaignMetrics from '@/components/campaigns/CampaignMetrics';
import DomainStreamingTable from '@/components/campaigns/DomainStreamingTable';

// Centralized state management and operations
import {
  useCampaignData,
  useDomainData,
  useStreamingStats,
  useTableState,
  useActionLoading,
  useCampaignDetailsActions,
  useCampaignDetailsStore
} from '@/lib/stores/campaignDetailsStore';
import { websocketService } from '@/lib/services/websocketService.simple';
import useCampaignOperations from '@/hooks/useCampaignOperations';

// Types
import type { components } from '@/lib/api-client/types';

type CampaignType = components['schemas']['Campaign']['campaignType'];

export default function RefactoredCampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;
  const campaignTypeFromQuery = searchParams.get('type') as CampaignType | null;

  // 🔧 CRITICAL FIX: All hooks must be called before any conditional logic
  // Initialization tracking
  const hasInitializedRef = useRef(false);

  // Centralized state management - no more scattered useState calls
  const { campaign, loading, error } = useCampaignData();
  const { generatedDomains, dnsCampaignItems, httpCampaignItems, totalDomainCount } = useDomainData();
  const streamingStats = useStreamingStats();
  const { filters, pagination } = useTableState();
  const actionLoading = useActionLoading();

  // 🔧 CRITICAL FIX: Access store functions directly without subscriptions
  const updateFromWebSocket = useCampaignDetailsStore(state => state.updateFromWebSocket);
  const updateStreamingStats = useCampaignDetailsStore(state => state.updateStreamingStats);
  
  // Keep other actions from the hook for compatibility
  const {
    updateFilters,
    updatePagination,
    reset
  } = useCampaignDetailsActions();

  // 🔧 CRITICAL FIX: Get campaign operations but avoid using unstable functions in effects
  const campaignOperations = useCampaignOperations(campaignId);
  const {
    startPhase,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    downloadDomains
  } = campaignOperations;

  // WebSocket cleanup reference
  const cleanupRef = useRef<(() => void) | null>(null);

  // 🔧 CRITICAL FIX: Create stable loadCampaignData reference
  const loadCampaignData = useCallback((force?: boolean) => {
    if (campaignOperations.loadCampaignData) {
      campaignOperations.loadCampaignData(force);
    }
  }, [campaignOperations]);

  // 🔧 CRITICAL FIX: Initialize campaign data with stable dependencies
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    // Reset store state for new campaign
    reset();

    // Load initial campaign data - this will fetch campaign info including type
    loadCampaignData(true);
  }, [campaignId, reset, loadCampaignData]);

  // 🔧 CRITICAL FIX: WebSocket connection for post-completion activities (DNS validation)
  const webSocketConditions = useMemo(() => {
    console.log(`🔍 [DEBUG] WebSocket conditions check:`, {
      campaign: campaign?.id,
      campaignType: campaign?.campaignType,
      status: campaign?.status,
      progress: campaign?.progress
    });
    
    if (!campaign) {
      console.log(`⏳ [DEBUG] WebSocket WAITING - Campaign data not loaded yet`);
      return {
        shouldConnect: false,
        campaignId: undefined,
        campaignType: undefined,
        status: undefined,
        progress: 0
      };
    }
    
    if (campaign.campaignType !== 'domain_generation') {
      console.log(`❌ [DEBUG] WebSocket DISCONNECTED - Campaign type is not domain_generation:`, campaign.campaignType);
      return {
        shouldConnect: false,
        campaignId: campaign.id,
        campaignType: campaign.campaignType,
        status: campaign.status,
        progress: campaign.progress || 0
      };
    }

    // Active statuses that definitely need WebSocket connection
    const isActiveStatus = ['pending', 'queued', 'running'].includes(campaign.status || '');
    
    // For domain generation campaigns, also connect for "completed" status to receive DNS validation updates
    const isCompletedDomainGeneration = campaign.status === 'completed';
    
    // CRITICAL: Also connect when DNS validation is active (currentPhase = dns_validation)
    const isDNSValidationActive = campaign.currentPhase === 'dns_validation' ||
                                  campaign.currentPhase === 'DNSValidation';
    
    // Connect if active OR if it's a completed domain generation campaign (for DNS validation)
    // OR if DNS validation phase is active
    const shouldConnect = !!(campaign && (isActiveStatus || isCompletedDomainGeneration || isDNSValidationActive));
      
    console.log(`🔌 [DEBUG] WebSocket connection decision:`, {
      isActiveStatus,
      isCompletedDomainGeneration,
      isDNSValidationActive,
      currentPhase: campaign.currentPhase,
      shouldConnect
    });
      
    return {
      shouldConnect,
      campaignId: campaign?.id,
      campaignType: campaign?.campaignType,
      status: campaign?.status,
      progress: campaign?.progress || 0,
      currentPhase: campaign?.currentPhase
    };
  }, [campaign]);

  // WebSocket integration for real-time domain streaming
  useEffect(() => {
    if (!webSocketConditions.shouldConnect) {
      // Cleanup existing WebSocket connection
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return;
    }

    if (cleanupRef.current) {
      return;
    }

    // Connect to WebSocket stream using new service
    const connectAndSubscribe = () => {
      try {
        const cleanup = websocketService.connect(`campaign-${campaignId}`, {
          onMessage: (message: any) => {
            // Route messages based on type
            console.log(`🔍 [WEBSOCKET_DEBUG] Message received:`, {
              type: message.type,
              campaignId: message.campaignId,
              data: message.data,
              phase: message.data?.phase,
              status: message.data?.status,
              progress: message.data?.progressPercentage || message.data?.progress,
              timestamp: message.timestamp,
              fullMessage: message
            });
            
            // CRITICAL: Log specifically for DNS validation
            if (message.type === 'campaign_progress' && message.data?.phase === 'dns_validation') {
              console.log(`🎯 [DNS_VALIDATION_WEBSOCKET] DNS validation progress message detected!`, message);
            }
            
            if (message.data?.status === 'completed' && message.data?.phase === 'dns_validation') {
              console.log(`✅ [DNS_VALIDATION_COMPLETE] DNS validation completed message detected!`, message);
            }
            
            switch (message.type) {
              case 'domain_generated':
              case 'domain.generated':
                updateFromWebSocket({
                  type: 'domain_generated',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                  sequenceNumber: message.sequenceNumber || Date.now(),
                });
                break;
                
              case 'campaign_progress':
              case 'campaign.progress':
              case 'domain_generation_progress':
                // CRITICAL FIX: Forward phase and status from message level to store
                updateFromWebSocket({
                  type: 'campaign_progress',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                  // Forward phase and status from message level
                  phase: (message as any).phase,
                  status: (message as any).status,
                });
                break;
                
              case 'validation_progress':
                // CRITICAL: Handle DNS/HTTP validation progress messages
                console.log(`🧬 [VALIDATION_PROGRESS] Validation progress message:`, message);
                updateFromWebSocket({
                  type: 'validation_progress',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                });
                break;
                
              case 'campaign_status':
              case 'campaign.status':
              case 'campaign_completed':
              case 'campaign_failed':
              case 'campaign_phase_complete':
                updateFromWebSocket({
                  type: 'campaign_status',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                });
                break;
                
              case 'dns_validation_result':
              case 'dns.validation.result':
                updateFromWebSocket({
                  type: 'dns_validation_result',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                });
                break;
                
              case 'http_validation_result':
              case 'http.validation.result':
                updateFromWebSocket({
                  type: 'http_validation_result',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                });
                break;
                
              default:
                console.log(`📝 [WebSocket] Unhandled message type: ${message.type}`);
            }
          },
          
          onOpen: () => {
            updateStreamingStats({ connectionStatus: 'connected' as any });
          },
          
          onClose: () => {
            updateStreamingStats({ connectionStatus: 'disconnected' as any });
          },
          
          onError: (error: any) => {
            console.error('❌ [WebSocket] Connection error:', error);
            updateStreamingStats({ connectionStatus: 'disconnected' as any });
          }
        });
        
        cleanupRef.current = cleanup;

      } catch (error) {
        console.error('❌ [WebSocket] Failed to connect:', error);
      }
    };

    connectAndSubscribe();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [webSocketConditions, campaignId, updateFromWebSocket, updateStreamingStats]); // Stable dependencies

  // Now handle conditional logic after all hooks
  if (!campaignId) {
    console.error('❌ [Refactored Page] No campaign ID provided');
    return (
      <div className="space-y-6">
        <PageHeader title="Campaign Error" icon={Briefcase} />
        <div className="text-center py-10">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Campaign ID</h2>
          <p className="text-muted-foreground mb-4">Campaign ID is missing from the URL.</p>
          <Button onClick={() => router.push('/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  // 🔧 ENHANCED: If campaign type is missing, try to load campaign data first to get the type
  if (!campaignTypeFromQuery) {
    console.warn('⚠️ [Refactored Page] No campaign type provided in URL, will attempt to load from API');
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campaign Error" icon={Briefcase} />
        <div className="text-center py-10">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to Load Campaign</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => loadCampaignData(true)}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push('/campaigns')}>
              Back to Campaigns
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state with improved messaging for new campaigns
  if (loading && !campaign) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading Campaign..." icon={Briefcase} />
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded-lg animate-pulse" />
              <div className="h-48 bg-muted rounded-lg animate-pulse" />
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
              <p className="text-muted-foreground mt-4">
                Setting up your campaign monitoring dashboard...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Campaign not found
  if (!campaign) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campaign Not Found" icon={Briefcase} />
        <div className="text-center py-10">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Campaign Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested campaign could not be loaded or does not exist.
          </p>
          <Button onClick={() => router.push('/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-none p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Campaign Header - Basic info and refresh */}
        <CampaignHeader
          campaign={campaign}
          loading={loading}
          onRefresh={() => loadCampaignData(true)}
        />

        {/* Campaign Progress - Original progress component */}
        <CampaignProgress campaign={campaign} />

        {/* Campaign Metrics - Real-time statistics */}
        <CampaignMetrics
          campaign={campaign}
          totalDomains={totalDomainCount}
          streamingStats={streamingStats}
          className="w-full"
        />

        {/* Campaign Controls - Start/pause/resume/stop */}
        <CampaignControls
          campaign={campaign}
          actionLoading={actionLoading}
          onStartPhase={startPhase}
          onPauseCampaign={pauseCampaign}
          onResumeCampaign={resumeCampaign}
          onStopCampaign={stopCampaign}
        />

        {/* Domain Streaming Table - High-performance virtual table */}
        <DomainStreamingTable
          campaign={campaign}
          generatedDomains={generatedDomains}
          dnsCampaignItems={dnsCampaignItems}
          httpCampaignItems={httpCampaignItems}
          totalDomains={totalDomainCount}
          loading={loading}
          filters={filters}
          pagination={pagination}
          onFiltersChange={updateFilters}
          onPaginationChange={updatePagination}
          onDownloadDomains={downloadDomains}
          className="w-full"
        />

        {/* Content Similarity View - Original component for lead analysis */}
        {campaign.campaignType === 'http_keyword_validation' && campaign.status === 'completed' && (
          <ContentSimilarityView campaign={campaign} />
        )}
      </div>
    </div>
  );
}