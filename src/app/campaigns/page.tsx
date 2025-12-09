"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Activity, Database, Globe, BarChart3, PauseCircle, Octagon, Loader2 } from "lucide-react";
import { useRTKCampaignsList } from "@/providers/RTKCampaignDataProvider";
import type { CampaignLite } from "@/providers/RTKCampaignDataProvider";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { usePausePhaseStandaloneMutation, useStopPhaseStandaloneMutation } from "@/store/api/campaignApi";
import type { CampaignPhaseEnum } from "@/lib/api-client/models/campaign-phase-enum";
import type { ApiPhase } from "@/lib/utils/phaseNames";

type CampaignStatus = CampaignLite['metadata']['status'];
type CampaignPhase = ApiPhase;

interface CampaignCardView {
  campaignId: string;
  name: string;
  currentPhase: CampaignPhase;
  status: CampaignStatus;
  totalDomains: number;
  processedDomains: number;
  successfulDomains: number;
  progressPercent: number;
}

const PHASE_LABELS: Record<CampaignPhase, string> = {
  discovery: "Discovery",
  validation: "Validation",
  extraction: "Extraction",
  analysis: "Analysis",
  enrichment: "Enrichment"
};

const STATUS_VARIANTS: Record<CampaignStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  running: "default",
  paused: "secondary",
  completed: "secondary",
  failed: "destructive",
  cancelled: "destructive"
};

const formatLabel = (value: string) => value.replace(/_/g, ' ').replace(/(^|\s)([a-z])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);

const getActionablePhase = (phase: CampaignCardView['currentPhase']): CampaignPhase | null => {
  if (!phase || phase === 'discovery') {
    return null;
  }
  return phase;
};

const getMutationErrorMessage = (error: unknown): string => {
  if (!error) {
    return 'Unable to complete the request. Please try again.';
  }
  const dataMessage = typeof (error as { data?: { message?: unknown } })?.data?.message === 'string'
    ? ((error as { data: { message: string } }).data.message.trim())
    : '';
  if (dataMessage) {
    return dataMessage;
  }
  const errorText = typeof (error as { error?: unknown })?.error === 'string'
    ? ((error as { error: string }).error.trim())
    : '';
  if (errorText) {
    return errorText;
  }
  if (typeof (error as { message?: unknown })?.message === 'string') {
    const direct = (error as { message: string }).message.trim();
    if (direct) {
      return direct;
    }
  }
  return 'Unable to complete the request. Please try again.';
};

export default function CampaignsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { campaigns: enrichedCampaigns, loading, error, refetch } = useRTKCampaignsList();
  const [pausePhase, { isLoading: isPausing }] = usePausePhaseStandaloneMutation();
  const [stopPhase, { isLoading: isStopping }] = useStopPhaseStandaloneMutation();
  const [activeAction, setActiveAction] = useState<{ type: 'pause' | 'stop'; campaignId: string } | null>(null);
  const campaigns: CampaignCardView[] = useMemo(() => {
    return enrichedCampaigns.map((campaign: CampaignLite): CampaignCardView => {
      const progress = campaign.metadata.progress ?? {};
      const totalDomains = progress.totalDomains ?? 0;
      const processedDomains = progress.processedDomains ?? 0;
      const successfulDomains = progress.successfulDomains ?? 0;
      const percentComplete = progress.percentComplete ?? 0;
      return {
        campaignId: campaign.id,
        name: campaign.name,
        currentPhase: campaign.currentPhase ?? 'discovery',
        status: campaign.metadata.status,
        totalDomains,
        processedDomains,
        successfulDomains,
        progressPercent: percentComplete
      };
    });
  }, [enrichedCampaigns]);
  const fetchCampaigns = refetch;
  const isMutating = isPausing || isStopping;

  const handlePauseCampaign = async (campaign: CampaignCardView) => {
    const phase = getActionablePhase(campaign.currentPhase);
    if (!phase) {
      toast({
        title: 'Pause unavailable',
        description: 'Discovery runs offline and cannot be paused.',
        variant: 'destructive'
      });
      return;
    }
    setActiveAction({ type: 'pause', campaignId: campaign.campaignId });
    try {
      await pausePhase({ campaignId: campaign.campaignId, phase: phase as CampaignPhaseEnum }).unwrap();
      toast({
        title: `${campaign.name} pause requested`,
        description: `${formatLabel(PHASE_LABELS[phase] ?? phase)} phase will pause shortly.`
      });
      fetchCampaigns();
    } catch (err) {
      toast({
        title: 'Unable to pause campaign',
        description: getMutationErrorMessage(err),
        variant: 'destructive'
      });
    } finally {
      setActiveAction(null);
    }
  };

  const handleStopCampaign = async (campaign: CampaignCardView) => {
    const phase = getActionablePhase(campaign.currentPhase);
    if (!phase) {
      toast({
        title: 'Stop unavailable',
        description: 'Discovery runs offline and cannot be stopped.',
        variant: 'destructive'
      });
      return;
    }
    setActiveAction({ type: 'stop', campaignId: campaign.campaignId });
    try {
      await stopPhase({ campaignId: campaign.campaignId, phase: phase as CampaignPhaseEnum }).unwrap();
      toast({
        title: `${campaign.name} stop requested`,
        description: `${formatLabel(PHASE_LABELS[phase] ?? phase)} phase will wind down safely.`
      });
      fetchCampaigns();
    } catch (err) {
      toast({
        title: 'Unable to stop campaign',
        description: getMutationErrorMessage(err),
        variant: 'destructive'
      });
    } finally {
      setActiveAction(null);
    }
  };

  const getBulkDataSummary = (campaign: CampaignCardView) => {
    const items: string[] = [];
    if (campaign.totalDomains > 0) items.push(`${campaign.totalDomains.toLocaleString()} domains`);
    if (campaign.processedDomains > 0) items.push(`${campaign.processedDomains.toLocaleString()} processed`);
    if (campaign.successfulDomains > 0) items.push(`${campaign.successfulDomains.toLocaleString()} successful`);
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
                      {formatLabel(PHASE_LABELS[campaign.currentPhase as CampaignPhase] ?? campaign.currentPhase)}
                    </Badge>
                    <Badge variant={STATUS_VARIANTS[campaign.status]} data-testid="campaign-card-status">
                      {formatLabel(campaign.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent data-testid="campaign-card-content">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" data-testid="campaign-card-stats">
                  <div className="flex items-center gap-2" data-testid="campaign-card-stat-domains">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">{campaign.totalDomains.toLocaleString()} domains</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="campaign-card-stat-dns-validated">
                    <Database className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">{campaign.successfulDomains.toLocaleString()} successful</span>
                  </div>
                  <div className="flex items-center gap-2" data-testid="campaign-card-stat-progress">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">{Math.round(campaign.progressPercent)}% complete</span>
                  </div>
                </div>

                  <div className="flex items-center justify-between" data-testid="campaign-card-footer">
                  <div className="text-sm text-muted-foreground" data-testid="campaign-card-summary">
                    {getBulkDataSummary(campaign) || 'No data available'}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end" data-testid="campaign-card-actions">
                    {(() => {
                      const actionablePhase = getActionablePhase(campaign.currentPhase);
                      const isTerminal = campaign.status === 'completed' || campaign.status === 'cancelled';
                      const canPause = actionablePhase !== null && campaign.status === 'running';
                      const canStop = actionablePhase !== null && !isTerminal;
                      const isPauseInFlight = Boolean(isPausing && activeAction?.type === 'pause' && activeAction.campaignId === campaign.campaignId);
                      const isStopInFlight = Boolean(isStopping && activeAction?.type === 'stop' && activeAction.campaignId === campaign.campaignId);
                      return (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!canPause || isMutating}
                            onClick={() => handlePauseCampaign(campaign)}
                            title={!canPause ? 'Pause is only available for running validation, extraction, or analysis phases.' : undefined}
                            data-testid="campaign-card-pause"
                          >
                            {isPauseInFlight ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PauseCircle className="mr-1 h-3.5 w-3.5" />
                            )}
                            Pause Campaign
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={!canStop || isMutating}
                            onClick={() => handleStopCampaign(campaign)}
                            title={!canStop ? 'Stop is available once a phase beyond discovery is active.' : undefined}
                            data-testid="campaign-card-stop"
                          >
                            {isStopInFlight ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Octagon className="mr-1 h-3.5 w-3.5" />
                            )}
                            Stop Campaign
                          </Button>
                        </>
                      );
                    })()}
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
