"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Activity, Database, Globe, BarChart3 } from "lucide-react";
import { campaignsApi } from "@/lib/api-client/client";
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
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the bulk-capable phase-centric endpoint
      const response = await campaignsApi.getCampaignsStandalone();
      
      // Handle unified APIResponse structure safely
      const responseData = response.data;
      let campaignsData: CampaignData[] = [];
      
      if (responseData && typeof responseData === 'object') {
        // Check if response follows APIResponse<T> pattern with data field
        if ('data' in responseData && Array.isArray((responseData as any).data)) {
          campaignsData = (responseData as any).data;
        } else if (Array.isArray(responseData)) {
          // Direct array response without wrapper
          campaignsData = responseData as CampaignData[];
        } else if ('error' in responseData) {
          // Handle error response
          throw new Error((responseData as any).error || 'Failed to fetch campaigns');
        }
      }
      
      setCampaigns(campaignsData);
    } catch (err: any) {
      // Enhanced error handling for various response structures
      let errorMessage = 'Failed to fetch campaigns';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err.response?.data) {
        const errorData = err.response.data;
        errorMessage = errorData.error || errorData.message || errorMessage;
      }
      
      setError(errorMessage);
      toast({
        title: "Error fetching campaigns",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCampaigns} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
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
          <Button onClick={fetchCampaigns} variant="outline" size="sm">
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
          <CardContent className="text-center py-8">
            <div className="mb-4">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first campaign to get started with enterprise-scale domain processing.
            </p>
            <Button onClick={() => router.push('/campaigns/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.campaignId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <Badge variant={STATUS_VARIANTS[campaign.phaseStatus] || "outline"}>
                        {campaign.phaseStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        {PHASE_LABELS[campaign.currentPhase] || campaign.currentPhase}
                      </div>
                      {campaign.progress !== undefined && (
                        <div>{campaign.progress.toFixed(1)}% complete</div>
                      )}
                      <div>Updated {formatDate(campaign.updatedAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/campaigns/${campaign.campaignId}`)}
                    >
                      View Details
                    </Button>
                    {campaign.phaseStatus === 'in_progress' && (
                      <Button variant="outline" size="sm">
                        Pause
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bulk Data Summary */}
                {getBulkDataSummary(campaign) && (
                  <div className="flex items-center gap-4 text-sm bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Bulk Data:</span>
                    </div>
                    <span className="text-muted-foreground">
                      {getBulkDataSummary(campaign)}
                    </span>
                    {(campaign.domainsData || campaign.dnsResults || campaign.httpResults || campaign.analysisResults) && (
                      <Badge variant="outline" className="ml-auto">
                        <Globe className="h-3 w-3 mr-1" />
                        JSONB Available
                      </Badge>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                {campaign.progress !== undefined && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{campaign.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(campaign.progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
