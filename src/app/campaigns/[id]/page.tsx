// Refactored Campaign Details Page - Enterprise-scale modular architecture
// Replaces the original 1869-line monolithic component with high-performance modular design

"use client";

import React, { useEffect, useRef, useCallback } from 'react';
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
  useCampaignDetailsStore,
  useCampaignData,
  useDomainData,
  useStreamingStats,
  useTableState,
  useActionLoading,
  type StreamingMessage,
  type TableFilters,
  type PaginationState,
  type StreamingStats
} from '@/lib/stores/campaignDetailsStore';
import { getWebSocketStreamManager } from '@/lib/websocket/WebSocketStreamManager';
import useCampaignOperations from '@/hooks/useCampaignOperations';

// Types
import type { CampaignType } from '@/lib/types';

export default function RefactoredCampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;
  const campaignTypeFromQuery = searchParams.get('type') as CampaignType | null;

  // 🔍 DIAGNOSTIC: Render counting for infinite loop detection
  const renderCountRef = useRef(0);
  const dataLoadCallCountRef = useRef(0);
  const resetCallCountRef = useRef(0);
  
  renderCountRef.current += 1;
  
  console.log('🔄 [CAMPAIGN_DETAILS_DEBUG] RefactoredCampaignDetailsPage render:', {
    renderCount: renderCountRef.current,
    campaignId,
    campaignTypeFromQuery,
    timestamp: new Date().toISOString(),
    renderTrigger: renderCountRef.current > 5 ? '⚠️ POTENTIAL_INFINITE_LOOP' : 'normal'
  });

  if (renderCountRef.current > 10) {
    console.error('🚨 [CAMPAIGN_DETAILS_DEBUG] INFINITE LOOP DETECTED - RefactoredCampaignDetailsPage rendered more than 10 times!', {
      renderCount: renderCountRef.current,
      dataLoadCalls: dataLoadCallCountRef.current,
      resetCalls: resetCallCountRef.current,
      campaignId,
      campaignTypeFromQuery
    });
  }

  // Centralized state management - no more scattered useState calls
  const { campaign, loading, error } = useCampaignData();
  const { generatedDomains, dnsCampaignItems, httpCampaignItems, totalDomainCount } = useDomainData();
  const streamingStats = useStreamingStats();
  const { filters, pagination } = useTableState();
  const actionLoading = useActionLoading();

  // 🔧 CRITICAL FIX: Use useCallback to create stable references for Zustand store functions
  const updateFilters = useCallback((filters: Partial<TableFilters>) => {
    useCampaignDetailsStore.getState().updateFilters(filters);
  }, []);
  
  const updatePagination = useCallback((pagination: Partial<PaginationState>) => {
    useCampaignDetailsStore.getState().updatePagination(pagination);
  }, []);
  
  const updateFromWebSocket = useCallback((message: StreamingMessage) => {
    useCampaignDetailsStore.getState().updateFromWebSocket(message);
  }, []);
  
  const updateStreamingStats = useCallback((stats: Partial<StreamingStats>) => {
    useCampaignDetailsStore.getState().updateStreamingStats(stats);
  }, []);
  
  const reset = useCallback(() => {
    useCampaignDetailsStore.getState().reset();
  }, []);

  // 🔍 DIAGNOSTIC: Track function creation patterns
  const campaignOperations = useCampaignOperations(campaignId);
  const {
    loadCampaignData,
    startPhase,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    downloadDomains
  } = campaignOperations;

  // Track if loadCampaignData function is being recreated
  const loadCampaignDataRef = useRef(loadCampaignData);
  if (loadCampaignDataRef.current !== loadCampaignData) {
    console.log('🔍 [CAMPAIGN_DETAILS_DEBUG] loadCampaignData function recreated:', {
      renderCount: renderCountRef.current,
      previousFunction: loadCampaignDataRef.current.toString().slice(0, 100),
      newFunction: loadCampaignData.toString().slice(0, 100),
      timestamp: new Date().toISOString()
    });
    loadCampaignDataRef.current = loadCampaignData;
  }

  // Track if reset function is being recreated
  const resetRef = useRef(reset);
  if (resetRef.current !== reset) {
    console.log('🔍 [CAMPAIGN_DETAILS_DEBUG] reset function recreated:', {
      renderCount: renderCountRef.current,
      timestamp: new Date().toISOString()
    });
    resetRef.current = reset;
  }

  // WebSocket stream manager reference
  const streamManagerRef = useRef(getWebSocketStreamManager());
  const cleanupRef = useRef<(() => void) | null>(null);

  // Initialize campaign data - single effect replaces 25+ useEffect hooks
  useEffect(() => {
    console.log('🔍 [CAMPAIGN_DETAILS_DEBUG] useEffect triggered:', {
      renderCount: renderCountRef.current,
      campaignId,
      campaignTypeFromQuery,
      deps: {
        campaignId,
        campaignTypeFromQuery,
        loadCampaignDataRef: loadCampaignDataRef.current === loadCampaignData ? 'same' : 'different',
        resetRef: resetRef.current === reset ? 'same' : 'different'
      },
      timestamp: new Date().toISOString()
    });

    if (!campaignId) {
      console.error('❌ [Refactored Page] No campaign ID provided');
      return;
    }

    if (!campaignTypeFromQuery) {
      console.error('❌ [Refactored Page] No campaign type provided in URL');
      return;
    }

    dataLoadCallCountRef.current += 1;
    resetCallCountRef.current += 1;

    console.log('🚀 [CAMPAIGN_DETAILS_DEBUG] Executing useEffect logic:', {
      renderCount: renderCountRef.current,
      dataLoadCallCount: dataLoadCallCountRef.current,
      resetCallCount: resetCallCountRef.current,
      campaignId,
      campaignTypeFromQuery,
      timestamp: new Date().toISOString()
    });

    if (dataLoadCallCountRef.current > 5) {
      console.error('🚨 [CAMPAIGN_DETAILS_DEBUG] USEEFFECT LOOP DETECTED - useEffect called more than 5 times!', {
        renderCount: renderCountRef.current,
        dataLoadCallCount: dataLoadCallCountRef.current,
        resetCallCount: resetCallCountRef.current,
        functionRecreationAnalysis: {
          loadCampaignDataRecreated: loadCampaignDataRef.current !== loadCampaignData,
          resetRecreated: resetRef.current !== reset
        }
      });
    }

    // Reset store state for new campaign
    reset();

    // Load initial campaign data
    loadCampaignData(true);

    return () => {
      // Cleanup on unmount
      console.log('🧹 [CAMPAIGN_DETAILS_DEBUG] Cleaning up useEffect');
    };
  }, [campaignId, campaignTypeFromQuery, loadCampaignData, reset]);

  // WebSocket integration for real-time domain streaming
  useEffect(() => {
    if (!campaign || 
        campaign.campaignType !== 'domain_generation' || 
        !['pending', 'running', 'completed'].includes(campaign.status || '')) {
      
      // Cleanup existing WebSocket connection
      if (cleanupRef.current) {
        console.log('🔌 [WebSocket] Disconnecting - conditions not met');
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return;
    }

    if (cleanupRef.current) {
      console.log('🔗 [WebSocket] Already connected');
      return;
    }

    console.log('✅ [WebSocket] Connecting for real-time domain streaming:', {
      campaignId,
      campaignType: campaign.campaignType,
      status: campaign.status
    });

    // Connect to WebSocket stream
    const streamManager = streamManagerRef.current;
    
    const connectAndSubscribe = async () => {
      try {
        await streamManager.connect(campaignId);
        
        const unsubscribe = streamManager.subscribeToEvents({
          onDomainGenerated: (payload) => {
            console.log('📥 [WebSocket] Domain generated:', payload.domain);
            updateFromWebSocket({
              type: 'domain_generated',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
              sequenceNumber: Date.now(), // Simple sequence for ordering
            });
          },
          
          onCampaignProgress: (payload) => {
            console.log('📊 [WebSocket] Campaign progress:', payload.progressPercentage);
            updateFromWebSocket({
              type: 'campaign_progress',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onCampaignStatus: (payload) => {
            console.log('🔄 [WebSocket] Campaign status change:', payload.status);
            updateFromWebSocket({
              type: 'campaign_status',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onConnectionStatus: (status) => {
            console.log('🔗 [WebSocket] Connection status:', status);
            updateStreamingStats({ connectionStatus: status });
          },
          
          onDNSValidation: (payload) => {
            console.log('🔍 [WebSocket] DNS validation result:', payload.domain);
            updateFromWebSocket({
              type: 'dns_validation_result',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onHTTPValidation: (payload) => {
            console.log('🌐 [WebSocket] HTTP validation result:', payload.domain);
            updateFromWebSocket({
              type: 'http_validation_result',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onError: (error) => {
            console.error('❌ [WebSocket] Stream error:', error);
            if (!error.recoverable) {
              // Disconnect on non-recoverable errors
              cleanupRef.current?.();
              cleanupRef.current = null;
            }
          }
        });

        // Enable high-frequency mode for real-time updates
        streamManager.enableHighFrequencyMode();
        
        cleanupRef.current = () => {
          unsubscribe();
          streamManager.disconnect();
        };

      } catch (error) {
        console.error('❌ [WebSocket] Failed to connect:', error);
      }
    };

    connectAndSubscribe();

    return () => {
      if (cleanupRef.current) {
        console.log('🧹 [WebSocket] Cleaning up stream connection');
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [campaign?.id, campaign?.campaignType, campaign?.status, campaignId, updateFromWebSocket, updateStreamingStats]);

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

  // Loading state
  if (loading && !campaign) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading Campaign..." icon={Briefcase} />
        <div className="space-y-6">
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
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
    <div className="space-y-6">
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
      />

      {/* Content Similarity View - Original component for lead analysis */}
      {campaign.campaignType === 'http_keyword_validation' && campaign.status === 'completed' && (
        <ContentSimilarityView campaign={campaign} />
      )}
    </div>
  );
}