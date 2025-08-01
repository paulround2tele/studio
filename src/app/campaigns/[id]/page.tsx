// Backend-Driven Campaign Details Page
// Clean implementation without frontend stores - pure backend-driven architecture

"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
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
import PhaseDashboard from '@/components/campaigns/PhaseDashboard';

// Backend-driven data fetching (no stores)
import { useBackendDrivenCampaignData } from '@/hooks/useBackendDrivenCampaignData';
import useCampaignOperations from '@/hooks/useCampaignOperations';

// Types
import type { LeadGenerationCampaign } from '@/lib/api-client/models';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import { convertCampaignToLeadGeneration } from '@/lib/utils/typeGuards';

type CampaignPhase = LeadGenerationCampaign['currentPhase'];

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  // 🚀 BACKEND-DRIVEN: All data comes directly from API, no frontend store
  const {
    campaign,
    generatedDomains,
    dnsCampaignItems,
    httpCampaignItems,
    totalDomainCount,
    loading,
    error,
    refetch
  } = useBackendDrivenCampaignData(campaignId);

  // Explicit type annotation to ensure proper transformation
  const typedCampaign = campaign as import('@/lib/types').CampaignViewModel | null;

  // Simple state for UI-only concerns (no business data)
  const [filters, setFilters] = useState<any>({});

  // Campaign operations (still useful for actions)
  const campaignOperations = useCampaignOperations(campaignId);
  const {
    startPhase,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    downloadDomains
  } = campaignOperations;

  // Use auto-generated API client for phase operations
  const campaignsApi = new CampaignsApi();

  // Adapter function to match DomainStreamingTable's expected signature
  const handleDownloadDomains = (domains: string[], fileNamePrefix: string) => {
    // Call the hook's downloadDomains function with the prefix
    downloadDomains(fileNamePrefix);
  };


  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading campaign: {error}</span>
        </div>
        <Button onClick={refetch} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading || !typedCampaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading campaign...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Campaign Details"
        icon={Briefcase}
      />

      {/* Main Campaign Card - Unified Header & Key Metrics */}
      <CampaignHeader
        campaign={typedCampaign}
        onRefresh={refetch}
        totalDomains={totalDomainCount}
      />

      {/* Phase Management Dashboard */}
      <PhaseDashboard
        campaignId={campaignId}
        campaign={typedCampaign}
        totalDomains={totalDomainCount}
        onCampaignUpdate={refetch}
      />

      {/* Campaign Controls */}
      <CampaignControls
        campaign={convertCampaignToLeadGeneration(typedCampaign)}
        onStartPhase={async (phaseType: string) => { await campaignsApi.startPhaseStandalone(campaignId, phaseType); }}
        onPausePhase={async (phaseType: string) => {
          // Note: Pause/Resume/Cancel not available in standalone services - use startPhaseStandalone for control
          console.log('Pause not implemented for standalone services');
        }}
        onResumePhase={async (phaseType: string) => {
          console.log('Resume not implemented for standalone services');
        }}
        onCancelPhase={async (phaseType: string) => {
          console.log('Cancel not implemented for standalone services');
        }}
        actionLoading={{}}
      />

      {/* Domain Streaming Table - Backend-driven data */}
      <DomainStreamingTable
        campaign={typedCampaign}
        generatedDomains={generatedDomains as any}
        dnsCampaignItems={dnsCampaignItems}
        httpCampaignItems={httpCampaignItems}
        totalDomains={totalDomainCount}
        loading={loading}
        filters={filters}
        onFiltersChange={setFilters}
        onDownloadDomains={handleDownloadDomains}
        className="w-full"
      />

      {/* Content Similarity View - Original component for lead analysis */}
      {typedCampaign.currentPhase === 'http_keyword_validation' && typedCampaign.phaseStatus === 'completed' && (
        <ContentSimilarityView campaign={typedCampaign} />
      )}

      {/* Refresh Button for Manual Updates */}
      <div className="flex justify-center">
        <Button onClick={refetch} variant="outline" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Refreshing...
            </>
          ) : (
            'Refresh Data'
          )}
        </Button>
      </div>
    </div>
  );
}