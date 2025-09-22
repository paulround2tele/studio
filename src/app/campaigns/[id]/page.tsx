"use client";

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Briefcase, Loader2, ArrowLeft, Eye, EyeOff, RefreshCw, MessageSquare } from 'lucide-react';

import type { CampaignResponse } from '@/lib/api-client/models';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';

// Professional components using real OpenAPI types
import PageHeader from '@/components/shared/PageHeader';
// Removed legacy CampaignHeader (superseded by OverviewCard within workspace)
import CampaignControls from '@/components/campaigns/CampaignControls';
import DomainsList from '@/components/campaigns/DomainsList';

// Phase 1 UI Refactor components
import CampaignOverviewV2 from '@/components/refactor/campaign/CampaignOverviewV2';
import { useCampaignOverviewV2, useShowLegacyDomainsTable, useUnifiedCampaignExperience } from '@/lib/feature-flags-simple';

// UX Refactor - Unified Campaign Experience
import { CampaignExperiencePage } from '@/components/refactor/campaign/CampaignExperiencePage';

// Phase 2 additions
import { useUserPreference } from '@/lib/hooks/useUserPreference';

interface _CampaignPageParams {
  id: string;
}

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = params?.id as string;
  
  // Feature flags
  const showOverviewV2 = useCampaignOverviewV2();
  const showLegacyDomainsTable = useShowLegacyDomainsTable();
  const useUnifiedExperience = useUnifiedCampaignExperience();
  
  // Phase 2: User preferences for UI state
  const [showDomainsTable, setShowDomainsTable] = useUserPreference(
    'campaignOverviewV2.showDomainsTable', 
    showLegacyDomainsTable || searchParams?.get('showDomains') === '1'
  );
  const [bannerDismissed, setBannerDismissed] = useUserPreference(
    'campaignOverviewV2.bannerDismissed',
    false
  );
  
  // Use enriched campaign endpoint via RTK Query
  const { data: enriched, isLoading: loading, error } = useGetCampaignEnrichedQuery(campaignId);
  const campaign: CampaignResponse | null = enriched?.campaign ?? null;
  const phaseExecutions = enriched?.phaseExecutions;
  const state = enriched?.state;

  const handleBack = () => {
    router.push('/campaigns');
  };

  const handleToggleDomainsTable = () => {
    setShowDomainsTable(!showDomainsTable);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleRestoreBanner = () => {
    setBannerDismissed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Error Loading Campaign
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            {typeof error === 'string' ? error : 'Failed to fetch campaign'}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Campaign Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            The campaign with ID &quot;{campaignId}&quot; was not found.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  // UX Refactor: Unified Campaign Experience (Phases A-E)
  if (useUnifiedExperience) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title={campaign.name || 'Untitled Campaign'}
          description="Unified campaign experience with real-time insights"
          showBackButton
          onBack={handleBack}
        />
        <CampaignExperiencePage className="mt-6" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Professional page header */}
      <PageHeader
        title={campaign.name || 'Untitled Campaign'}
        description={`Campaign details and management for ${campaign.name || 'campaign'}`}
        showBackButton
        onBack={handleBack}
      />

      {/* Phase 1 UI Refactor: Value-first overview above legacy domains table */}
      {showOverviewV2 && (
        <>
          <CampaignOverviewV2 campaignId={campaignId} />
          
          {/* Phase 2: Compact toolbar with actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleDomainsTable}
                className="flex items-center gap-2"
              >
                {showDomainsTable ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Raw Domains
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Raw Domains
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              
              {bannerDismissed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreBanner}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Restore Beta Banner
                </Button>
              )}
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Campaign Management Tools
            </div>
          </div>
        </>
      )}
      
      {/* Professional campaign controls (disaster recovery component) */}
      <CampaignControls campaign={campaign} state={state} phaseExecutions={phaseExecutions} />

      {/* Generated domains table - Phase 2: conditional visibility */}
      {(showDomainsTable || !showOverviewV2) && (
        <DomainsList campaignId={campaign.id} />
      )}

  {/* CampaignControls is the single source of truth for phase configuration & execution (CampaignPhaseManager removed) */}
    </div>
  );
}
