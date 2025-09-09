"use client";
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { setFullSequenceMode } from '@/store/ui/campaignUiSlice';
import { Switch } from '@/components/ui/switch';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';

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

  const handlePrimaryCTA = async () => {
    if (!nextAction) return;
    if (nextAction.type === 'start') {
      await startPhase({ campaignId, phase: nextAction.phase as any });
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
    <Card className={className} data-overview-card>
      <CardHeader className="pb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">Campaign Overview</CardTitle>
            <StatusBadge variant={globalExecState as any} compact>{globalExecState}</StatusBadge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs px-2 py-0.5 rounded bg-muted border">
              <span>Auto</span>
              <Switch checked={mode.autoAdvance} onCheckedChange={v=>dispatch(setFullSequenceMode({campaignId, value: v}))} />
              <span className="font-medium">{mode.autoAdvance ? 'Full Sequence' : 'Step by Step'}</span>
            </div>
            <Button size="sm" disabled={!nextAction || nextAction.type!=='start'} isLoading={isLoading} onClick={handlePrimaryCTA}>
              {nextAction?.type === 'start' ? `Start ${nextAction.phase}` : 'Start'}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1"><span className="text-muted-foreground">Configured</span><strong>{configuredRatio}</strong></span>
          <span className="flex items-center gap-1"><span className="text-muted-foreground">Completed</span><strong>{completedRatio}</strong></span>
          {nextAction && (
            <span className="flex items-center gap-1 text-muted-foreground">Next: <span className="capitalize font-medium">{nextAction.type} {nextAction.phase}</span></span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-2 w-full bg-muted/60 rounded overflow-hidden mb-2">
          <div className="h-2 bg-primary transition-all" style={{ width: `${(exec.progress.completed/Math.max(1, exec.progress.total))*100}%` }} />
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
