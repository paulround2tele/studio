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
  useCampaignDetailsStore,
  useCampaignData,
  useDomainData,
  useStreamingStats,
  useTableState,
  useActionLoading,
  useCampaignDetailsActions,
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

  // 🔧 CRITICAL FIX: Early return for missing campaign ID
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

  // Initialization tracking
  const hasInitializedRef = useRef(false);

  // Centralized state management - no more scattered useState calls
  const { campaign, loading, error } = useCampaignData();
  const { generatedDomains, dnsCampaignItems, httpCampaignItems, totalDomainCount } = useDomainData();
  const streamingStats = useStreamingStats();
  const { filters, pagination } = useTableState();
  const actionLoading = useActionLoading();

  // 🔧 CRITICAL FIX: Use stable store actions to prevent infinite loops
  const {
    updateFilters,
    updatePagination,
    updateFromWebSocket,
    updateStreamingStats,
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

  // WebSocket stream manager reference
  const streamManagerRef = useRef(getWebSocketStreamManager());
  const cleanupRef = useRef<(() => void) | null>(null);

  // 🔧 CRITICAL FIX: Create stable loadCampaignData reference
  const loadCampaignData = useCallback((force?: boolean) => {
    if (campaignOperations.loadCampaignData) {
      campaignOperations.loadCampaignData(force);
    }
  }, [campaignOperations.loadCampaignData]);

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

  // 🔧 CRITICAL FIX: Memoize WebSocket conditions to prevent unnecessary effect runs
  // 🚨 ROOT CAUSE FIX: Remove 'completed' status to stop WebSocket polling after campaign completion
  const webSocketConditions = useMemo(() => {
    return {
      shouldConnect: !!(campaign &&
        campaign.campaignType === 'domain_generation' &&
        ['pending', 'queued', 'running'].includes(campaign.status || '')),
      campaignId: campaign?.id,
      campaignType: campaign?.campaignType,
      status: campaign?.status
    };
  }, [campaign?.id, campaign?.campaignType, campaign?.status]);

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

    // Connect to WebSocket stream
    const streamManager = streamManagerRef.current;
    
    const connectAndSubscribe = async () => {
      try {
        await streamManager.connect(campaignId);
        
        const unsubscribe = streamManager.subscribeToEvents({
          onDomainGenerated: (payload) => {
            updateFromWebSocket({
              type: 'domain_generated',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
              sequenceNumber: Date.now(),
            });
          },
          
          onCampaignProgress: (payload) => {
            updateFromWebSocket({
              type: 'campaign_progress',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onCampaignStatus: (payload) => {
            updateFromWebSocket({
              type: 'campaign_status',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onConnectionStatus: (status) => {
            updateStreamingStats({ connectionStatus: status });
          },
          
          onDNSValidation: (payload) => {
            updateFromWebSocket({
              type: 'dns_validation_result',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onHTTPValidation: (payload) => {
            updateFromWebSocket({
              type: 'http_validation_result',
              data: payload,
              timestamp: new Date().toISOString(),
              campaignId: payload.campaignId,
            });
          },
          
          onError: (error) => {
            if (!error.recoverable) {
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
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [webSocketConditions, campaignId, updateFromWebSocket, updateStreamingStats]); // Stable dependencies

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