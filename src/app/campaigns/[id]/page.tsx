"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import CampaignDetailClient from './CampaignDetailClient';
import CampaignSseOverlay from '@/components/debug/CampaignSseOverlay';

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params?.id as string;

  return (
    <>
      <CampaignDetailClient />
      <CampaignSseOverlay campaignId={campaignId} />
    </>
  );
}
