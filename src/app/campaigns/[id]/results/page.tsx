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

import type { CampaignResponse } from '@/lib/api-client/models';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import PageHeader from '@/components/shared/PageHeader';
import { ResultsDrilldown } from '@/components/campaigns/results';

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

const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.6667 5.83325H3.33333C2.41286 5.83325 1.66667 6.57944 1.66667 7.49992V15.8333C1.66667 16.7537 2.41286 17.4999 3.33333 17.4999H16.6667C17.5871 17.4999 18.3333 16.7537 18.3333 15.8333V7.49992C18.3333 6.57944 17.5871 5.83325 16.6667 5.83325Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.3333 17.5V4.16667C13.3333 3.72464 13.1577 3.30072 12.8452 2.98816C12.5326 2.67559 12.1087 2.5 11.6667 2.5H8.33333C7.89131 2.5 7.46738 2.67559 7.15482 2.98816C6.84226 3.30072 6.66667 3.72464 6.66667 4.16667V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoaderIcon className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Loading campaign results...</p>
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
