
"use client";

import PageHeader from '@/components/shared/PageHeader';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import type { CampaignResponse } from '@/lib/api-client/models';
import { extractErrorMessage } from '@/lib/utils/error-handling';

import { FilePenLine, AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { skipToken } from '@reduxjs/toolkit/query/react';

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
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <PageHeader
          title="Missing Campaign Identifier"
          description="We couldn't determine which campaign to edit."
          icon={FilePenLine}
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
        <PageHeader title="Edit Campaign" icon={FilePenLine} />
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-10 w-1/2" /> {/* Name */}
          <Skeleton className="h-20 w-full" /> {/* Description */}
          <Skeleton className="h-10 w-full" /> {/* Type */}
          <Skeleton className="h-40 w-full" /> {/* Gen Config or Initial Domains */}
          <Skeleton className="h-10 w-24" /> {/* Submit button */}
        </div>
      </>
    );
  }

  if (error || !campaignData) {
    const description = error ? extractErrorMessage(error) : 'Campaign data could not be loaded or found.';
    return (
       <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <PageHeader 
          title="Error Loading Campaign" 
          description={description}
          icon={FilePenLine} 
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
        icon={AlertCircle}
      />
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-10">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
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
    <Suspense fallback={<div className="p-6 text-center">Loading campaign editor...<Skeleton className="h-80 w-full mt-4" /></div>}>
      <EditCampaignPageContent />
    </Suspense>
  );
}
