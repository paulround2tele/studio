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

// TailAdmin inline SVG icons
const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 6.66659V10.8333M10 13.3333H10.0083" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.5 16.6666L5.83333 9.99992L12.5 3.33325" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10.8333V15.8333C15 16.2754 14.8244 16.6993 14.5118 17.0118C14.1993 17.3244 13.7754 17.5 13.3333 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V6.66667C2.5 6.22464 2.67559 5.80072 2.98816 5.48816C3.30072 5.17559 3.72464 5 4.16667 5H9.16667M12.5 2.5H17.5M17.5 2.5V7.5M17.5 2.5L8.33333 11.6667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoaderIcon className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
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
