"use client";
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { setFullSequenceMode } from '@/store/ui/campaignUiSlice';
import { Switch } from '@/components/ui/switch';
import { useStartPhaseStandaloneMutation, useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import type { EnrichedCampaignResponse, ScoringProfile } from '@/lib/api-client/models';
import { useListScoringProfilesQuery } from '@/store/api/scoringApi';

interface CampaignOverviewCardProps {
  campaignId: string;
  className?: string;
}

export const CampaignOverviewCard: React.FC<CampaignOverviewCardProps> = ({ campaignId, className }) => {
  const selectOverview = React.useMemo(()=>pipelineSelectors.overview(campaignId),[campaignId]);
  const ov = useAppSelector(selectOverview);
  const { config, exec, phases, mode, nextAction } = ov;
  const dispatch = useAppDispatch();
  const [startPhase, { isLoading }] = useStartPhaseStandaloneMutation();
  // Enriched campaign & scoring profile data
  const { data: enriched } = useGetCampaignEnrichedQuery(campaignId, { skip: !campaignId });
  const enrichedTyped: EnrichedCampaignResponse | undefined = enriched;
  const { data: scoringProfiles } = useListScoringProfilesQuery(undefined, { skip: !campaignId });
  const scoringNode = ((): Record<string, unknown> | undefined => {
    if (enrichedTyped && typeof enrichedTyped === 'object') {
      const node = (enrichedTyped as Record<string, unknown>).scoring;
      if (node && typeof node === 'object') return node as Record<string, unknown>;
    }
    return undefined;
  })();
  // Determine scoring profile id using known possible fields with type guards
  const scoringProfileId: string | undefined = (() => {
    if (enrichedTyped && typeof enrichedTyped === 'object') {
      const enrichedRecord = enrichedTyped as Record<string, unknown>;
      const directId = enrichedRecord['scoringProfileId'];
      if (directId) return String(directId);
      const directName = enrichedRecord['scoringProfile'];
      if (directName) return String(directName);
    }
    if (scoringNode) {
      const profileId = scoringNode['profileId'];
      if (profileId) return String(profileId);
      const profile = scoringNode['profile'];
      if (profile) return String(profile);
    }
    return undefined;
  })();
  const profileObj: ScoringProfile | undefined = scoringProfiles?.items?.find?.((p: ScoringProfile) => p.id === scoringProfileId);
  const profileName = profileObj?.name || scoringProfileId || '—';
  const avgScore: number | undefined = (() => {
    if (enrichedTyped && typeof enrichedTyped === 'object') {
      const enrichedRecord = enrichedTyped as Record<string, unknown>;
      const avg = enrichedRecord['averageScore'];
      if (typeof avg === 'number') return avg;
      const mono = enrichedRecord['score'];
      if (typeof mono === 'number') return mono;
    }
    if (scoringNode) {
      const avg = scoringNode['averageScore'];
      if (typeof avg === 'number') return avg;
      const mono = scoringNode['score'];
      if (typeof mono === 'number') return mono;
    }
    return undefined;
  })();
  const lastRescoreAt: string | undefined = (() => {
    if (enrichedTyped && typeof enrichedTyped === 'object') {
      const enrichedRecord = enrichedTyped as Record<string, unknown>;
      const direct = enrichedRecord['lastRescoreAt'];
      if (typeof direct === 'string') return direct;
    }
    if (scoringNode) {
      const nested = scoringNode['lastRescoreAt'];
      if (typeof nested === 'string') return nested;
    }
    return undefined;
  })();

  const handlePrimaryCTA = async () => {
    if (!nextAction) return;
    if (nextAction.type === 'start') {
  await startPhase({ campaignId, phase: nextAction.phase });
    }
  };

  const configuredRatio = `${config.progress.configured}/${config.progress.total}`;
  const completedRatio = `${exec.progress.completed}/${exec.progress.total}`;
  const globalExecState = (() => {
    if (exec.progress.completed === exec.progress.total && exec.progress.total > 0) return 'completed';
    if (phases.some(p=>p.execState === 'failed')) return 'failed';
    if (phases.some(p=>p.execState === 'running')) return 'running';
    if (phases.some(p=>p.configState === 'valid')) return 'configured';
    return 'idle';
  })();

  return (
    <Card className={className} data-overview-card data-testid="campaign-overview-card">
      <CardHeader className="pb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold" data-testid="campaign-overview-title">Campaign Overview</CardTitle>
            <StatusBadge variant={globalExecState} compact data-testid="campaign-overview-status">{globalExecState}</StatusBadge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs px-2 py-0.5 rounded bg-muted border">
              <span>Auto</span>
              <Switch checked={mode.autoAdvance} onCheckedChange={v=>dispatch(setFullSequenceMode({campaignId, value: v}))} data-testid="campaign-mode-toggle" />
              <span className="font-medium" data-testid="campaign-mode-label">{mode.autoAdvance ? 'Full Sequence' : 'Step by Step'}</span>
            </div>
            <Button size="sm" disabled={!nextAction || nextAction.type!=='start'} isLoading={isLoading} onClick={handlePrimaryCTA} data-testid="campaign-start-phase">
              {nextAction?.type === 'start' ? `Start ${nextAction.phase}` : 'Start'}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1"><span className="text-muted-foreground">Configured</span><strong>{configuredRatio}</strong></span>
          <span className="flex items-center gap-1"><span className="text-muted-foreground">Completed</span><strong>{completedRatio}</strong></span>
          {nextAction && (
            <span className="flex items-center gap-1 text-muted-foreground" data-testid="campaign-next-action">Next: <span className="capitalize font-medium">{nextAction.type} {nextAction.phase}</span></span>
          )}
          <span className="flex items-center gap-1"><span className="text-muted-foreground">Scoring Profile</span><strong>{profileName}</strong></span>
          {avgScore !== undefined && <span className="flex items-center gap-1"><span className="text-muted-foreground">Avg Score</span><strong>{typeof avgScore === 'number' ? avgScore.toFixed(1) : avgScore}</strong></span>}
          {lastRescoreAt && <span className="flex items-center gap-1"><span className="text-muted-foreground">Last Rescore</span><strong>{new Date(lastRescoreAt).toLocaleDateString()}</strong></span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-2 w-full bg-muted/60 rounded overflow-hidden mb-2">
          <div className="h-2 bg-primary transition-all" style={{ width: `${(exec.progress.completed/Math.max(1, exec.progress.total))*100}%` }} data-testid="campaign-progress-bar" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{config.progress.configured} configured</span>
          <span>{exec.progress.completed} completed</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignOverviewCard;
