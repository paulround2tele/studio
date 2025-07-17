
"use client";

import CampaignFormV2, { type CampaignViewModel } from '@/components/campaigns/CampaignFormV2';
import PageHeader from '@/components/shared/PageHeader';
import type { components } from '@/lib/api-client/types';

type _Campaign = components['schemas']['Campaign'];
import { FilePenLine, AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCampaignOperations } from '@/hooks/useCampaignOperations';

function EditCampaignPageContent() {
  const params = useParams();
  const router = useRouter();

  const campaignId = params.id as string;
  
  // 🚀 MODERNIZED: Use centralized campaign operations hook
  const { campaign, loading, error, loadCampaignData } = useCampaignOperations(campaignId);

  useEffect(() => {
    if (!campaignId) {
      return;
    }
    
    // Load campaign data for editing
    loadCampaignData?.(true);
  }, [campaignId, loadCampaignData]);

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

  if (error || !campaign) {
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
        title={`Edit Campaign: ${campaign.name}`}
        description={`Modify the details for campaign "${campaign.name}".`}
        icon={FilePenLine}
      />
      <CampaignFormV2 campaignToEdit={campaign as CampaignViewModel} isEditing={true} />
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
