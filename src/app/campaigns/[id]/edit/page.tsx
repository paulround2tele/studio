
"use client";

import CampaignFormV2 from '@/components/campaigns/CampaignFormV2';
import PageHeader from '@/components/shared/PageHeader';
import type { components } from '@/lib/api-client/types';
import { CampaignsApi } from '@/lib/api-client';

type CampaignDetailsResponse = components['schemas']['CampaignDetailsResponse'];
import { FilePenLine, AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function EditCampaignPageContent() {
  const params = useParams();
  const router = useRouter();

  const campaignId = params.id as string;
  
  // Backend-driven architecture: Fetch campaign data directly from API
  const [campaignData, setCampaignData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      return;
    }
    
    // Load campaign data for editing
    const loadCampaign = async () => {
      try {
        setLoading(true);
        setError(null);
        const campaignsApi = new CampaignsApi();
        const response = await campaignsApi.getCampaignProgressStandalone(campaignId);
        setCampaignData(response.data);
      } catch (err) {
        console.error('Failed to load campaign:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId]);

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

  if (error || !campaignData?.campaign) {
    return (
       <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <PageHeader title="Error Loading Campaign" description={error || "Campaign data could not be loaded or found."} icon={FilePenLine} />
        <Button onClick={() => router.push('/campaigns')} className="mt-6">Back to Campaigns</Button>
      </div>
    );
  }
  
  return (
    <>
      <PageHeader
        title={`Edit Campaign: ${campaignData.campaign.name}`}
        description={`Modify the details for campaign "${campaignData.campaign.name}".`}
        icon={FilePenLine}
      />
      <CampaignFormV2 />
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
