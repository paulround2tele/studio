"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, Briefcase, Loader2, ArrowLeft } from 'lucide-react';

// PROFESSIONAL: Direct OpenAPI client imports - no amateur wrappers
import { CampaignsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type { CampaignResponse } from '@/lib/api-client/models';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

// Professional components using real OpenAPI types
import PageHeader from '@/components/shared/PageHeader';
import CampaignProgress from '@/components/campaigns/CampaignProgress';
import CampaignHeader from '@/components/campaigns/CampaignHeader';
import CampaignControls from '@/components/campaigns/CampaignControls';

interface CampaignPageParams {
  id: string;
}

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params?.id as string;

  // Professional state management - no amateur RTK Query wrapper crimes
  const [campaign, setCampaign] = useState<CampaignResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const fetchCampaign = async () => {
      try {
        setLoading(true);
  const api = new CampaignsApi(apiConfiguration);
    // Fetch a single campaign by id and unwrap the SuccessEnvelope
    const response = await api.campaignsGet(campaignId);
    const data = extractResponseData<CampaignResponse>(response);
    if (data) setCampaign(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
      } finally {
        setLoading(false);
      }
    };

  fetchCampaign();
  }, []);

  const handleBack = () => {
    router.push('/campaigns');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Error Loading Campaign
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            {error}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Campaign Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            The campaign with ID "{campaignId}" was not found.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Professional page header */}
      <PageHeader
        title={campaign.name || 'Untitled Campaign'}
        description={`Campaign details and management for ${campaign.name || 'campaign'}`}
        showBackButton
        onBack={handleBack}
      />

      {/* Professional campaign header with real OpenAPI types */}
      <CampaignHeader campaign={campaign} />
      
      {/* Professional campaign progress using real enum values */}
      <CampaignProgress campaign={campaign} />
      
      {/* Professional campaign controls (disaster recovery component) */}
      <CampaignControls campaign={campaign} />
    </div>
  );
}
