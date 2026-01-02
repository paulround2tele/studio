"use client";

import { Suspense } from 'react';
import CampaignCreateWizard from '@/components/refactor/campaign/CampaignCreateWizard';
import { PageLoading } from '@/components/ta/ui/loading';

const WizardWithSuspense = () => (
  <Suspense fallback={<PageLoading message="Loading campaign wizard..." />}>
    <CampaignCreateWizard />
  </Suspense>
);

export default function NewCampaignPage() {
  return <WizardWithSuspense />;
}
