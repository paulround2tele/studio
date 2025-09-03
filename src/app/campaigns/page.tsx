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

interface CampaignData {
  campaignId: string;
  name: string;
  currentPhase: string;
  phaseStatus: string;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
  progress?: number;
  domains?: number;
  leads?: number;
  dnsValidatedDomains?: number;
  domainsData?: any;
  dnsResults?: any;
  httpResults?: any;
  analysisResults?: any;
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
  
  // RTK CONSOLIDATION: Use new RTK provider instead of legacy hook
  const { campaigns: enrichedCampaigns, loading, error, refetch } = useRTKCampaignsList();

  // Transform enriched campaigns to legacy format for compatibility
  const campaigns = useMemo(() => {
    return enrichedCampaigns.map((campaign: CampaignLite) => {
      // Now properly handle GeneratedDomain[] array instead of string[]
      const domains = (campaign.domains || []) as DomainListItem[];
      const leads = (campaign.leads || []) as unknown[];
      
      // Calculate DNS validation stats from rich domain objects
      const dnsValidatedCount = domains.filter((domain) =>
        domain && typeof domain === 'object' && (domain as DomainListItem).dnsStatus === 'ok'
      ).length;
      
      // Calculate HTTP validation stats
      const httpValidatedCount = domains.filter((domain) =>
        domain && typeof domain === 'object' && (domain as DomainListItem).httpStatus === 'ok'
      ).length;
      
      // Calculate lead generation stats
      const leadsFoundCount = domains.filter((domain) =>
        domain && typeof domain === 'object' && (domain as DomainListItem).leadStatus === 'match'
      ).length;

      return {
        campaignId: campaign.id,
        name: campaign.name,
  // Prefer API phase names; fall back to discovery to avoid engine/API mismatch
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

  const getBulkDataSummary = (campaign: CampaignData) => {
    const items = [];
    
    if (campaign.domains) {
      items.push(`${campaign.domains.toLocaleString()} domains`);
    }
    
    if (campaign.dnsValidatedDomains) {
      items.push(`${campaign.dnsValidatedDomains.toLocaleString()} DNS validated`);
    }
    
    if (campaign.leads) {
      items.push(`${campaign.leads.toLocaleString()} leads`);
    }
    
    return items.join(' • ');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Button disabled>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Button onClick={fetchCampaigns}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchCampaigns}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Enterprise-scale domain generation and validation campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCampaigns} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/campaigns/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Campaigns Found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first campaign
            </p>
            <Button onClick={() => router.push('/campaigns/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: CampaignData) => (
            <Card key={campaign.campaignId} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    {campaign.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[campaign.phaseStatus] || "outline"}>
                      {PHASE_LABELS[campaign.currentPhase] || campaign.currentPhase}
                    </Badge>
                    <Badge variant="outline">
                      {campaign.phaseStatus?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      {campaign.domains || 0} domains
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      {campaign.dnsValidatedDomains || 0} validated
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">
                      {campaign.progress || 0}% complete
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {getBulkDataSummary(campaign) || 'No data available'}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/campaigns/${campaign.campaignId}`)}
                    >
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/campaigns/${campaign.campaignId}/edit`)}
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
