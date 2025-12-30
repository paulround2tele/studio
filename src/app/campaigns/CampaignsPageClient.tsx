"use client";

import React from "react";
import { CampaignsTable, CampaignsPageHeader } from "@/components/campaigns/CampaignsTable";
import { useRTKCampaignsList } from "@/providers/RTKCampaignDataProvider";

export default function CampaignsPageClient() {
  const { refetch } = useRTKCampaignsList();

  return (
    <div className="space-y-6">
      <CampaignsPageHeader onRefresh={refetch} />
      <CampaignsTable />
    </div>
  );
}
