"use client";

/**
 * Campaign Execution Page
 * 
 * Phase 2: Execution Mode route for live campaign progress tracking.
 * Provides a focused view of campaign execution with detailed phase status.
 */

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ta/ui/button/Button';

import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import PageHeader from '@/components/shared/PageHeader';
import { ExecutionPanel } from '@/components/campaigns/execution';
import type { CampaignResponse } from '@/lib/api-client/models';
import Link from 'next/link';

import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon } from '@/icons';
import { PageLoading } from '@/components/ta/ui/loading';

export default function CampaignExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  // Fetch campaign to get name for header
  const { data: enriched, isLoading: loading, error } = useGetCampaignEnrichedQuery(campaignId);
  const campaign: CampaignResponse | null = enriched?.campaign ?? null;

  const handleBack = () => {
    router.push(`/campaigns/${campaignId}`);
  };

  if (loading) {
    return <PageLoading message="Loading campaign..." />;
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
          <AlertCircleIcon className="w-12 h-12 text-gray-400 mx-auto" />
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
    <div className="container mx-auto px-4 py-8" role="main" aria-label="Campaign Execution">
      <PageHeader
        title={`Execution: ${campaign.name || 'Untitled Campaign'}`}
        description="Live campaign execution tracking with per-phase status and timing"
        showBackButton
        onBack={handleBack}
        aria-label={`Execution view for ${campaign.name || 'untitled campaign'}`}
      />

      {/* Quick navigation links */}
      <div className="flex gap-4 mt-4 mb-6">
        <Link href={`/campaigns/${campaignId}`}>
          <Button variant="outline" size="sm" startIcon={<ExternalLinkIcon className="w-4 h-4" />}>
            Campaign Dashboard
          </Button>
        </Link>
        <Link href={`/campaigns/${campaignId}/results`}>
          <Button variant="outline" size="sm" startIcon={<ExternalLinkIcon className="w-4 h-4" />}>
            View Results
          </Button>
        </Link>
      </div>

      {/* Main Execution Panel */}
      <ExecutionPanel campaignId={campaignId} className="max-w-3xl" />
    </div>
  );
}
