
"use client";

import CampaignFormV2, { type CampaignViewModel } from '@/components/campaigns/CampaignFormV2';
import PageHeader from '@/components/shared/PageHeader';
import type { components } from '@/lib/api-client/types';

type Campaign = components['schemas']['Campaign'];
import { FilePenLine, AlertCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client/client';
import { useToast } from '@/hooks/use-toast';
import { useLoadingStore } from '@/lib/stores/loadingStore';

function EditCampaignPageContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const campaignId = params.id as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use centralized loading state
  const { startLoading, stopLoading, isOperationLoading } = useLoadingStore();
  const loadingOperationId = `edit_campaign_${campaignId}`;
  const loading = isOperationLoading(loadingOperationId);

  useEffect(() => {
    if (!campaignId) {
      setError("Campaign ID is missing from URL.");
      return;
    }
    
    async function fetchCampaign() {
      startLoading(loadingOperationId, "Loading campaign for editing");
      setError(null);
      try {
        const response = await apiClient.getCampaignDetails(campaignId);
        if (response.data.campaign) {
          setCampaign(response.data.campaign as Campaign);
        } else {
          setError("Campaign not found.");
          setCampaign(null);
          toast({ title: "Error Loading Campaign", description: "Campaign not found.", variant: "destructive" });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load campaign data.";
        setError(errorMessage);
        setCampaign(null);
        toast({ title: "Error Loading Campaign Data", description: errorMessage, variant: "destructive" });
      } finally {
        stopLoading(loadingOperationId);
      }
    }
    fetchCampaign();
  }, [campaignId, toast, startLoading, stopLoading, loadingOperationId]);

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
