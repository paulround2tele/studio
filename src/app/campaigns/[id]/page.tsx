// Refactored Campaign Details Page - Enterprise-scale modular architecture
// Replaces the original 1869-line monolithic component with high-performance modular design

"use client";

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Briefcase, Loader2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import CampaignProgress from '@/components/campaigns/CampaignProgress';
import ContentSimilarityView from '@/components/campaigns/ContentSimilarityView';

// New modular components
import CampaignHeader from '@/components/campaigns/CampaignHeader';
import CampaignControls from '@/components/campaigns/CampaignControls';
import { CampaignMetrics } from '@/components/campaigns/CampaignStatistics';
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
import { unifiedCampaignService } from '@/lib/services/unifiedCampaignService';

// Types
import type { Campaign } from '@/lib/api-client/models';

type CampaignType = Campaign['campaignType'];

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
    
    // Allow WebSocket connections for domain generation and validation campaigns
    const allowedCampaignTypes = ['domain_generation', 'dns_validation', 'http_keyword_validation'];
    const campaignType = String(campaign.campaignType || '');
    if (!campaignType || !allowedCampaignTypes.includes(campaignType)) {
      console.log(`❌ [DEBUG] WebSocket DISCONNECTED - Campaign type not supported for streaming:`, campaignType);
      return {
shouldConnect: false,
        campaignId: campaign.id,
        campaignType: campaignType,
        status: campaign.status,
        progress: campaign.progress || 0
      };
    }

    // ENHANCED: More inclusive status checking for better real-time connectivity
    const statusLower = (campaign.status || '').toLowerCase();
    const isActiveStatus = [
      'pending', 'queued', 'inprogress', 'in_progress', 'running',
      'pausing', 'paused', 'resuming'
    ].includes(statusLower);
    
    // Connect for completed campaigns to receive validation updates
    const isCompletedCampaign = statusLower === 'completed';
    
    // Connect for any validation phases
    const currentPhaseLower = (campaign.currentPhase || '').toLowerCase();
    const isValidationPhase = [
      'dns_validation', 'http_validation', 'http_keyword_validation',
      'generation', 'analysis'
    ].includes(currentPhaseLower);
    
    // ENHANCED: Connect more aggressively to ensure real-time updates
    const shouldConnect = !!(campaign && (
      isActiveStatus ||
      isCompletedCampaign ||
      isValidationPhase ||
      // Always connect if we have domains being processed
      (campaign.totalItems && campaign.totalItems > 0) ||
      // Connect if progress is not 100% (campaign still active)
      (campaign.progressPercentage !== undefined && campaign.progressPercentage < 100)
    ));
      
    console.log(`🔌 [DEBUG] WebSocket connection decision:`, {
      isActiveStatus,
      isCompletedCampaign,
      isValidationPhase,
      currentPhase: campaign.currentPhase as any,
      shouldConnect
    });
      
    return {
      shouldConnect,
      campaignId: campaign?.id,
      campaignType: campaign?.campaignType,
      status: campaign?.status,
      progress: campaign?.progress || 0,
      currentPhase: campaign?.currentPhase as any
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
            
            console.log(`🟡 [WEBSOCKET_DEBUG] Processing message type: ${message.type} for campaign ${campaignId}`, message);
            
            switch (message.type) {
              case 'domain_generated':
              case 'domain.generated':
                console.log(`🔵 [DOMAIN_GENERATED_DEBUG] Received domain generated message:`, message.data);
                updateFromWebSocket({
type: 'domain_generated',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                  sequenceNumber: message.sequenceNumber || Date.now()
});
                break;
                
              case 'campaign_progress':
              case 'campaign.progress':
              case 'domain_generation_progress':
                console.log(`🟢 [CAMPAIGN_PROGRESS_DEBUG] Received campaign progress message:`, message.data);
                // CRITICAL FIX: Forward phase and status from message level to store
                updateFromWebSocket({
type: 'campaign_progress',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId,
                  // Forward phase and status from message level,
phase: (message as any).phase,
                  status: (message as any).status
});
                break;
                
              case 'validation_progress':
                // CRITICAL: Handle DNS/HTTP validation progress messages
                console.log(`🧬 [VALIDATION_PROGRESS_DEBUG] Validation progress message:`, message);
                updateFromWebSocket({
type: 'validation_progress',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId
});
                break;
                
              case 'campaign_status':
              case 'campaign.status':
              case 'campaign_completed':
              case 'campaign_failed':
              case 'campaign_phase_complete':
                console.log(`🟣 [CAMPAIGN_STATUS_DEBUG] Received campaign status message:`, message.data);
                updateFromWebSocket({
type: 'campaign_status',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId
});
                break;
                
              case 'dns.validation.result':
                console.log(`🔴 [DNS_VALIDATION_RESULT_DEBUG] Received DNS validation result:`, message.data);
                updateFromWebSocket({
type: 'dns_validation_result',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId
});
                break;
                
              case 'http.validation.result':
                console.log(`🟠 [HTTP_VALIDATION_RESULT_DEBUG] Received HTTP validation result:`, message.data);
                updateFromWebSocket({
type: 'http_validation_result',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId
});
                break;
                
              case 'phase_transition':
                console.log(`🔄 [PHASE_TRANSITION] Phase transition detected:`, message.data);
                // Handle phase transition with real-time cache invalidation
                handlePhaseTransition({
type: 'phase_transition',
                  timestamp: message.timestamp || new Date().toISOString(),
                  data: message.data
                });
                // Update local campaign state immediately
                updateFromWebSocket({
type: 'phase_transition',
                  data: message.data,
                  timestamp: message.timestamp || new Date().toISOString(),
                  campaignId: message.campaignId || campaignId
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

  // Error state (only for actual errors, not loading/transition states)
  if (error && !loading) {
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

  // Loading state OR campaign not available (could be transitioning)
  if (loading || !campaign) {
    const isTransitioning = !loading && !campaign; // Not loading but no campaign = likely transitioning
    
    return (
      <div className="space-y-6">
        <PageHeader
          title={isTransitioning ? "Campaign Transitioning..." : "Loading Campaign..."}
          icon={Briefcase}
        />
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <div className="h-32 bg-muted rounded-lg animate-pulse" />
              <div className="h-48 bg-muted rounded-lg animate-pulse" />
              <div className="h-64 bg-muted rounded-lg animate-pulse" />
              <p className="text-muted-foreground mt-4">
                {isTransitioning
                  ? "Please wait while the campaign transitions to the next phase..."
                  : "Setting up your campaign monitoring dashboard..."
                }
              </p>
            </div>
          </div>
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