"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Briefcase, Loader2, ArrowLeft } from 'lucide-react';

import type { CampaignResponse } from '@/lib/api-client/models';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';

// Professional components using real OpenAPI types
import PageHeader from '@/components/shared/PageHeader';
// UX Refactor - Unified Campaign Experience
import { CampaignExperiencePage } from '@/components/refactor/campaign/CampaignExperiencePage';
import CampaignSseOverlay from '@/components/debug/CampaignSseOverlay';

interface _CampaignPageParams {
  id: string;
}

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;
  
  // Use enriched campaign endpoint via RTK Query
  const { data: enriched, isLoading: loading, error } = useGetCampaignEnrichedQuery(campaignId);
  const campaign: CampaignResponse | null = enriched?.campaign ?? null;

  const handleBack = () => {
    router.push('/campaigns');
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

  return (
    <div className="container mx-auto px-4 py-8" role="main" aria-label="Campaign Dashboard">
      <PageHeader
        title={campaign.name || 'Untitled Campaign'}
        description="Unified campaign experience with real-time insights"
        showBackButton
        onBack={handleBack}
        aria-label={`Campaign dashboard for ${campaign.name || 'untitled campaign'}`}
      />
      <CampaignExperiencePage 
        className="mt-6" 
        aria-label="Campaign experience interface"
        role="region"
      />
      <CampaignSseOverlay campaignId={campaignId} />
    </div>
  );
}
