"use client"; // This page uses hooks like useSearchParams which require client components

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CampaignFormV2 from '@/components/campaigns/CampaignFormV2';
import CampaignCreateWizard from '@/components/refactor/campaign/CampaignCreateWizard';
import { Loader2 } from 'lucide-react';
import { useCampaignWizard } from '@/lib/feature-flags-simple';

function CampaignFormWithSuspense() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading campaign form...</span>
      </div>
    }>
      <CampaignFormV2 />
    </Suspense>
  );
}

function WizardWithSuspense() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading campaign wizard...</span>
      </div>
    }>
      <CampaignCreateWizard />
    </Suspense>
  );
}

function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const usesWizard = useCampaignWizard();
  
  // Check for legacy query parameter redirect
  useEffect(() => {
    const legacyParam = searchParams.get('legacy');
    if (legacyParam === '1') {
      router.replace('/campaigns/new/legacy');
      return;
    }
  }, [searchParams, router]);

  // Feature flag logic: use wizard unless explicitly disabled
  if (usesWizard) {
    return <WizardWithSuspense />;
  } else {
    // Kill switch: render legacy form when NEXT_PUBLIC_CAMPAIGN_WIZARD_V1 === 'false'
    return <CampaignFormWithSuspense />;
  }
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    }>
      <NewCampaignContent />
    </Suspense>
  );
}
