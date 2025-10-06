"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Activity, Database, Globe, BarChart3 } from "lucide-react";
import { useRTKCampaignsList } from "@/providers/RTKCampaignDataProvider";
import type { CampaignLite } from "@/providers/RTKCampaignDataProvider";
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface CampaignCardView {
  campaignId: string;
  name: string;
  currentPhase: string;
  phaseStatus: string;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
  progress: number;
  domains: number;
  leads: number;
  dnsValidatedDomains: number;
  httpValidatedDomains: number;
  leadsFound: number;
  domainsData: DomainListItem[];
  leadsData: unknown[]; // Replace with concrete Lead model when available
  dnsResults?: unknown; // Placeholder for future typed DNS result aggregation
  httpResults?: unknown; // Placeholder
  analysisResults?: unknown; // Placeholder
}

const PHASE_LABELS: Record<string, string> = {
  setup: "Setup",
  generation: "Domain Generation",
  discovery: "Domain Generation",
  dns_validation: "DNS Validation",
  http_keyword_validation: "HTTP Validation",
  analysis: "Analysis"
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_started: "outline",
  in_progress: "default",
  paused: "secondary",
  completed: "secondary",
  failed: "destructive"
};

export default function CampaignsPage() {
  const { toast: _toast } = useToast();
  const router = useRouter();
  const { campaigns: enrichedCampaigns, loading, error, refetch } = useRTKCampaignsList();
  const campaigns: CampaignCardView[] = useMemo(() => {
    return enrichedCampaigns.map((campaign: CampaignLite): CampaignCardView => {
      const domains = (campaign.domains || []) as DomainListItem[];
      const leads = (campaign.leads || []) as unknown[];
      const dnsValidatedCount = domains.filter((domain) => domain && typeof domain === 'object' && (domain as DomainListItem).dnsStatus === 'ok').length;
      const httpValidatedCount = domains.filter((domain) => domain && typeof domain === 'object' && (domain as DomainListItem).httpStatus === 'ok').length;
      const leadsFoundCount = domains.filter((domain) => domain && typeof domain === 'object' && (domain as DomainListItem).leadStatus === 'match').length;
      return {
        campaignId: campaign.id,
        name: campaign.name,
        currentPhase: campaign.currentPhase || 'discovery',
        phaseStatus: 'not_started',
        totalItems: domains.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: campaign.overallProgress || 0,
        domains: domains.length,
        leads: leads.length,
        dnsValidatedDomains: dnsValidatedCount,
        httpValidatedDomains: httpValidatedCount,
        leadsFound: leadsFoundCount,
        domainsData: domains,
        leadsData: leads,
        dnsResults: undefined,
        httpResults: undefined,
        analysisResults: undefined
      };
    });
  }, [enrichedCampaigns]);
  const fetchCampaigns = refetch;

  const getBulkDataSummary = (campaign: CampaignCardView) => {
    const items: string[] = [];
    if (campaign.domains) items.push(`${campaign.domains.toLocaleString()} domains`);
    if (campaign.dnsValidatedDomains) items.push(`${campaign.dnsValidatedDomains.toLocaleString()} DNS validated`);
    if (campaign.leads) items.push(`${campaign.leads.toLocaleString()} leads`);
    return items.join(' • ');
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="campaign-list-page-loading">
        <div className="flex items-center justify-between mb-6" data-testid="campaign-list-header-loading">
          <h1 className="text-3xl font-bold" data-testid="campaign-list-title">Campaigns</h1>
          <Button disabled data-testid="campaign-list-refresh-loading">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-4" data-testid="campaign-list-skeletons">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse" data-testid="campaign-list-skeleton">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="campaign-list-page-error">
        <div className="flex items-center justify-between mb-6" data-testid="campaign-list-header-error">
          <h1 className="text-3xl font-bold" data-testid="campaign-list-title">Campaigns</h1>
          <Button onClick={fetchCampaigns} data-testid="campaign-list-refresh-error">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card data-testid="campaign-list-error-card">
          <CardContent className="p-6">
            <div className="text-center" data-testid="campaign-list-error-content">
              <p className="text-red-600 mb-4" data-testid="campaign-list-error-message">{typeof error === 'string' ? error : 'Failed to load campaigns'}</p>
              <Button onClick={fetchCampaigns} data-testid="campaign-list-error-retry">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="campaign-list-page">
      <div className="flex items-center justify-between mb-6" data-testid="campaign-list-header">
        <div data-testid="campaign-list-heading">
          <h1 className="text-3xl font-bold" data-testid="campaign-list-title">Campaigns</h1>
          <p className="text-muted-foreground" data-testid="campaign-list-subtitle">Enterprise-scale domain generation and validation campaigns</p>
        </div>
        <div className="flex gap-2" data-testid="campaign-list-actions">
          <Button onClick={fetchCampaigns} variant="outline" data-testid="campaign-list-refresh">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
            <Button onClick={() => router.push('/campaigns/new')} data-testid="campaign-list-new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card data-testid="campaign-list-empty">
          <CardContent className="p-6 text-center" data-testid="campaign-list-empty-content">
            <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" data-testid="campaign-list-empty-icon" />
            <h3 className="text-lg font-semibold mb-2" data-testid="campaign-list-empty-title">No Campaigns Found</h3>
            <p className="text-muted-foreground mb-4" data-testid="campaign-list-empty-description">Get started by creating your first campaign</p>
            <Button onClick={() => router.push('/campaigns/new')} data-testid="campaign-list-empty-create">
              <Plus className="mr-2 h-4 w-4" />
              Create First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" data-testid="campaign-list-grid">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.campaignId}
              className="hover:shadow-md transition-shadow"
              data-testid="campaign-card"
              data-campaign-id={campaign.campaignId}
            >
              <CardHeader data-testid="campaign-card-header">
                <div className="flex items-center justify-between" data-testid="campaign-card-header-row">
                  <CardTitle className="flex items-center gap-2" data-testid="campaign-card-title">
                    <Activity className="h-5 w-5" />
                    {campaign.name}
                  </CardTitle>
                  <div className="flex items-center gap-2" data-testid="campaign-card-badges">
                    <Badge variant={"outline"} data-testid="campaign-card-phase">
                      {campaign.currentPhase}
                    </Badge>
                    <Badge variant="outline" data-testid="campaign-card-status">
                      {campaign.phaseStatus?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent data-testid="campaign-card-content">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" data-testid="campaign-card-stats">
                  <div className="flex items-center gap-2" data-testid="campaign-card-stat-domains">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">{campaign.domains || 0} domains</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="campaign-card-stat-dns-validated">
                    <Database className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">{campaign.dnsValidatedDomains || 0} validated</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="campaign-card-stat-progress">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">{campaign.progress || 0}% complete</span>
                  </div>
                </div>

                <div className="flex items-center justify-between" data-testid="campaign-card-footer">
                  <div className="text-sm text-muted-foreground" data-testid="campaign-card-summary">
                    {getBulkDataSummary(campaign) || 'No data available'}
                  </div>
                  <div className="flex gap-2" data-testid="campaign-card-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/campaigns/${campaign.campaignId}`)}
                      data-testid="campaign-card-view"
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/campaigns/${campaign.campaignId}/edit`)}
                      data-testid="campaign-card-edit"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
