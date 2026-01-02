"use client";

/**
 * Phase 3: Results Mode (Core Drilldown) Page
 * 
 * Route: /campaigns/[id]/results
 * 
 * This page displays the drilldown results panel:
 *   - Qualified leads (expanded by default)
 *   - Rejected domains grouped by rejection reason (collapsed)
 *   - No-keywords domains (collapsed)
 *   - Domain details panel on the right
 * 
 * All counts from backend. No client-side inference.
 */

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ta/ui/button/Button';
import { AlertCircleIcon, ArrowLeftIcon, BriefcaseIcon } from '@/icons';
import { PageLoading } from '@/components/ta/ui/loading';

import type { CampaignResponse } from '@/lib/api-client/models';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import PageHeader from '@/components/shared/PageHeader';
import { ResultsDrilldown } from '@/components/campaigns/results';

export default function CampaignResultsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  // Use enriched campaign endpoint to get campaign name
  const { data: enriched, isLoading: loading, error } = useGetCampaignEnrichedQuery(campaignId);
  const campaign: CampaignResponse | null = enriched?.campaign ?? null;

  const handleBack = () => {
    router.push(`/campaigns/${campaignId}`);
  };

  if (loading) {
    return <PageLoading message="Loading campaign results..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircleIcon className="w-12 h-12 text-error-500 mx-auto" />
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
          <BriefcaseIcon className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Campaign Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            The campaign with ID &quot;{campaignId}&quot; was not found.
          </p>
          <Button onClick={() => router.push('/campaigns')} variant="outline" startIcon={<ArrowLeftIcon className="w-4 h-4" />}>
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
      <PageHeader
        title={`Results: ${campaign.name || 'Untitled Campaign'}`}
        description="Explore qualified leads and rejected domains grouped by reason"
        showBackButton
        onBack={handleBack}
      />
      <div className="flex-1 mt-6 min-h-0">
        <ResultsDrilldown campaignId={campaignId} className="h-full" />
      </div>
    </div>
  );
}
