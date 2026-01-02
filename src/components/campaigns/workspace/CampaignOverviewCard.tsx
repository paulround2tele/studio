"use client";
import React from 'react';
import Button from '@/components/ta/ui/button/Button';
import { StatusBadge } from './StatusBadge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { setFullSequenceMode } from '@/store/ui/campaignUiSlice';
import Switch from '@/components/ta/form/switch/Switch';
import { useStartPhaseStandaloneMutation, useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import type { EnrichedCampaignResponse, ScoringProfile } from '@/lib/api-client/models';
import { useListScoringProfilesQuery } from '@/store/api/scoringApi';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/utils/getApiErrorMessage';

interface CampaignOverviewCardProps {
  campaignId: string;
  className?: string;
}

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

export const CampaignOverviewCard: React.FC<CampaignOverviewCardProps> = ({ campaignId, className }) => {
  const selectOverview = React.useMemo(() => pipelineSelectors.overview(campaignId), [campaignId]);
  const ov = useAppSelector(selectOverview);
  const { config, exec, phases, mode, nextAction } = ov;
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [startPhase, { isLoading }] = useStartPhaseStandaloneMutation();
  // Enriched campaign & scoring profile data
  const { data: enriched } = useGetCampaignEnrichedQuery(campaignId, { skip: !campaignId });
  const enrichedTyped: EnrichedCampaignResponse | undefined = enriched;
  const enrichedRecord = toRecord(enrichedTyped);
  const { data: scoringProfiles } = useListScoringProfilesQuery(undefined, { skip: !campaignId });
  const scoringNode = ((): Record<string, unknown> | undefined => {
    const node = enrichedRecord?.['scoring'];
    return toRecord(node);
  })();
  // Determine scoring profile id using known possible fields with type guards
  const scoringProfileId: string | undefined = (() => {
    if (enrichedRecord) {
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
    if (enrichedRecord) {
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
    if (enrichedRecord) {
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
      try {
        await startPhase({ campaignId, phase: nextAction.phase }).unwrap();
      } catch (e: unknown) {
        toast({
          title: 'Phase Start Failed',
          description: getApiErrorMessage(e, 'Failed to start phase'),
          variant: 'destructive',
        });
      }
    }
  };

  const autoStateVariant = (state?: string) => {
    switch (state) {
      case 'blocked':
        return 'missing' as const;
      case 'running':
        return 'running' as const;
      case 'waiting_start':
        return 'idle' as const;
      case 'ready':
        return 'configured' as const;
      default:
        return 'paused' as const;
    }
  };

  const configuredRatio = `${config.progress.configured}/${config.progress.total}`;
  const completedRatio = `${exec.progress.completed}/${exec.progress.total}`;
  const globalExecState = (() => {
    if (exec.progress.completed === exec.progress.total && exec.progress.total > 0) return 'completed';
    if (phases.some(p => p.execState === 'failed')) return 'failed';
    if (phases.some(p => p.execState === 'paused')) return 'paused';
    if (phases.some(p => p.execState === 'running')) return 'running';
    if (phases.some(p => p.configState === 'valid')) return 'configured';
    return 'idle';
  })();

  return (
    <div className={`rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className || ''}`} data-overview-card data-testid="campaign-overview-card">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90" data-testid="campaign-overview-title">Campaign Overview</h3>
            <StatusBadge variant={globalExecState} compact data-testid="campaign-overview-status">{globalExecState}</StatusBadge>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Switch label={mode.autoAdvance ? 'Full Sequence' : 'Step by Step'} defaultChecked={mode.autoAdvance} onChange={v => dispatch(setFullSequenceMode({ campaignId, value: v }))} data-testid="campaign-mode-toggle" />
              {mode.autoAdvance && (
                <StatusBadge
                  variant={autoStateVariant(mode.state)}
                  compact
                  titleText={mode.hint}
                  data-testid="campaign-mode-state"
                >
                  {(mode.state || 'ready').replace(/_/g, ' ')}
                </StatusBadge>
              )}
            </div>
            {mode.autoAdvance && mode.hint && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 max-w-xs text-right leading-snug" data-testid="campaign-mode-hint">
                {mode.hint}
              </span>
            )}
            <Button size="sm" variant="primary" disabled={!nextAction || nextAction.type!=='start'} onClick={handlePrimaryCTA} data-testid="campaign-start-phase">
              {isLoading ? 'Loading...' : (nextAction?.type === 'start' ? `Start ${nextAction.phase}` : 'Start')}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1"><span className="text-gray-500 dark:text-gray-400">Configured</span><strong>{configuredRatio}</strong></span>
          <span className="flex items-center gap-1"><span className="text-gray-500 dark:text-gray-400">Completed</span><strong>{completedRatio}</strong></span>
          {nextAction && (
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400" data-testid="campaign-next-action">Next: <span className="capitalize font-medium">{nextAction.type} {nextAction.phase}</span></span>
          )}
          <span className="flex items-center gap-1"><span className="text-gray-500 dark:text-gray-400">Scoring Profile</span><strong>{profileName}</strong></span>
          {avgScore !== undefined && <span className="flex items-center gap-1"><span className="text-gray-500 dark:text-gray-400">Avg Score</span><strong>{typeof avgScore === 'number' ? avgScore.toFixed(1) : avgScore}</strong></span>}
          {lastRescoreAt && <span className="flex items-center gap-1"><span className="text-gray-500 dark:text-gray-400">Last Rescore</span><strong>{new Date(lastRescoreAt).toLocaleDateString()}</strong></span>}
        </p>
      </div>
      <div className="p-5 pt-0">
        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2 mt-4">
          <div className="h-2 bg-brand-500 transition-all" style={{ width: `${(exec.progress.completed/Math.max(1, exec.progress.total))*100}%` }} data-testid="campaign-progress-bar" />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>{config.progress.configured} configured</span>
          <span>{exec.progress.completed} completed</span>
        </div>
      </div>
    </div>
  );
};

export default CampaignOverviewCard;
