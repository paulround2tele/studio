"use client";

import { Suspense } from 'react';
import CampaignFormV2 from '@/components/campaigns/CampaignFormV2';
import { Loader2 } from 'lucide-react';

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

export default function LegacyCampaignPage() {
  return (
    <>
      {/* Legacy campaign creation form - moved from /campaigns/new */}
      <CampaignFormWithSuspense />
    </>
  );
}