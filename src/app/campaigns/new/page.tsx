"use client";

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CampaignCreateWizard from '@/components/refactor/campaign/CampaignCreateWizard';

const WizardWithSuspense = () => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading campaign wizard...</span>
    </div>
  }>
    <CampaignCreateWizard />
  </Suspense>
);

export default function NewCampaignPage() {
  return <WizardWithSuspense />;
}
