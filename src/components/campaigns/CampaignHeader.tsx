// Thin wrapper for backward compatibility. Prefer importing CampaignOverviewCard directly.
"use client";
import React from 'react';
import { CampaignOverviewCard } from './workspace/CampaignOverviewCard';

export interface CampaignHeaderProps { campaignId: string; className?: string; }

export const CampaignHeader: React.FC<CampaignHeaderProps> = ({ campaignId, className }) => {
  return <CampaignOverviewCard campaignId={campaignId} className={className} />;
};

export default CampaignHeader;