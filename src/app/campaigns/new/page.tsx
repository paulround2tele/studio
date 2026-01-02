"use client";

import { Suspense } from 'react';
import CampaignCreateWizard from '@/components/refactor/campaign/CampaignCreateWizard';

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const WizardWithSuspense = () => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-[400px]">
      <LoaderIcon className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading campaign wizard...</span>
    </div>
  }>
    <CampaignCreateWizard />
  </Suspense>
);

export default function NewCampaignPage() {
  return <WizardWithSuspense />;
}
