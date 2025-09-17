"use client"; // This page uses hooks like useSearchParams which require client components

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CampaignFormV2 from '@/components/campaigns/CampaignFormV2';
import CampaignCreateWizard from '@/components/refactor/wizard/CampaignCreateWizard';
import { Loader2 } from 'lucide-react';
import { isFlagEnabled, FEATURE_FLAGS } from '@/utils/featureFlags';

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

function CampaignCreationContent() {
  const searchParams = useSearchParams();
  
  // Check for legacy query param
  const forceLegacy = searchParams.get('legacy') === '1';
  
  // Check feature flag (default true for wizard)
  const wizardEnabled = isFlagEnabled(FEATURE_FLAGS.CAMPAIGN_WIZARD_V1, true);

  // Use legacy form if explicitly requested or if wizard is disabled
  if (forceLegacy || !wizardEnabled) {
    return <CampaignFormWithSuspense />;
  }

  // Use new wizard by default
  return <CampaignCreateWizard />;
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    }>
      <CampaignCreationContent />
    </Suspense>
  );
}
