
"use client";

import PageHeader from '@/components/shared/PageHeader';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import type { CampaignResponse } from '@/lib/api-client/models';
import { extractErrorMessage } from '@/lib/utils/error-handling';

import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Button from '@/components/ta/ui/button/Button';
import { skipToken } from '@reduxjs/toolkit/query/react';

// TailAdmin inline SVG icons
const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 18.3333C14.6024 18.3333 18.3334 14.6023 18.3334 9.99992C18.3334 5.39755 14.6024 1.66659 10 1.66659C5.39765 1.66659 1.66669 5.39755 1.66669 9.99992C1.66669 14.6023 5.39765 18.3333 10 18.3333Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 6.66659V10.8333M10 13.3333H10.0083" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FilePenLineIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.6667 2.5H5.83333C5.39131 2.5 4.96738 2.67559 4.65482 2.98816C4.34226 3.30072 4.16667 3.72464 4.16667 4.16667V15.8333C4.16667 16.2754 4.34226 16.6993 4.65482 17.0118C4.96738 17.3244 5.39131 17.5 5.83333 17.5H14.1667C14.6087 17.5 15.0326 17.3244 15.3452 17.0118C15.6577 16.6993 15.8333 16.2754 15.8333 15.8333V6.66667L11.6667 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.6667 2.5V6.66667H15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function EditCampaignPageContent() {
  const params = useParams();
  const router = useRouter();

  const rawCampaignId = params?.id;
  const campaignId = Array.isArray(rawCampaignId) ? rawCampaignId[0] : rawCampaignId;

  const queryArg = campaignId ? campaignId : skipToken;
  const { data: enriched, isLoading: loading, error } = useGetCampaignEnrichedQuery(queryArg);

  if (!campaignId) {
    return (
      <div className="text-center py-10">
        <AlertCircleIcon className="mx-auto h-12 w-12 text-error-500" />
        <PageHeader
          title="Missing Campaign Identifier"
          description="We couldn't determine which campaign to edit."
          icon={FilePenLineIcon}
        />
        <Button onClick={() => router.push('/campaigns')} className="mt-6">
          Back to Campaigns
        </Button>
      </div>
    );
  }
  const campaignData: CampaignResponse | undefined = enriched?.campaign;

  if (loading) {
    return (
      <>
        <PageHeader title="Edit Campaign" icon={FilePenLineIcon} />
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-10 w-1/2 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" /> {/* Name */}
          <div className="h-20 w-full animate-pulse bg-gray-200 dark:bg-gray-700 rounded" /> {/* Description */}
          <div className="h-10 w-full animate-pulse bg-gray-200 dark:bg-gray-700 rounded" /> {/* Type */}
          <div className="h-40 w-full animate-pulse bg-gray-200 dark:bg-gray-700 rounded" /> {/* Gen Config or Initial Domains */}
          <div className="h-10 w-24 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" /> {/* Submit button */}
        </div>
      </>
    );
  }

  if (error || !campaignData) {
    const description = error ? extractErrorMessage(error) : 'Campaign data could not be loaded or found.';
    return (
       <div className="text-center py-10">
        <AlertCircleIcon className="mx-auto h-12 w-12 text-error-500" />
        <PageHeader 
          title="Error Loading Campaign" 
          description={description}
          icon={FilePenLineIcon} 
        />
        <Button onClick={() => router.push('/campaigns')} className="mt-6">Back to Campaigns</Button>
      </div>
    );
  }
  
  return (
    <>
      <PageHeader
        title="Edit Not Supported"
        description="Campaigns cannot be modified after creation in the phase-centric architecture."
        icon={AlertCircleIcon}
      />
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-10">
          <AlertCircleIcon className="mx-auto h-12 w-12 text-warning-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Campaign Editing Not Available</h2>
          <p className="text-gray-600 mb-6">
            In the phase-centric architecture, campaigns are immutable after creation.
            You can configure individual phases through the Phase Dashboard.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push(`/campaigns/${campaignData.id}`)}>
              Go to Campaign Details
            </Button>
            <Button variant="outline" onClick={() => router.push('/campaigns')}>
              Back to Campaigns
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function EditCampaignPage() {
  return (
    // Suspense can be used here if CampaignForm or EditCampaignPageContent has internal async ops not tied to the main data fetch
    <Suspense fallback={<div className="p-6 text-center">Loading campaign editor...<div className="h-80 w-full mt-4 animate-pulse bg-gray-200 dark:bg-gray-700 rounded" /></div>}>
      <EditCampaignPageContent />
    </Suspense>
  );
}
