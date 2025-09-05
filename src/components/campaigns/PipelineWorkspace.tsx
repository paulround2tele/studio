"use client";
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { useAppDispatch } from '@/store/hooks';
import { setFullSequenceMode } from '@/store/ui/campaignUiSlice';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useStartPhaseStandaloneMutation } from '@/store/api/campaignApi';

interface PipelineWorkspaceProps { campaignId: string; }

const railColor = (p:any) => {
  if (p.execState === 'failed') return 'border-red-500 bg-red-50';
  if (p.execState === 'completed') return 'border-green-500 bg-green-50';
  if (p.execState === 'running') return 'border-blue-500 bg-blue-50';
  if (p.configState === 'valid') return 'border-gray-400 bg-gray-50';
  return 'border-gray-300';
};

export const PipelineWorkspace: React.FC<PipelineWorkspaceProps> = ({ campaignId }) => {
  const selectOverview = React.useMemo(()=>pipelineSelectors.overview(campaignId),[campaignId]);
  const ov = useAppSelector(selectOverview);
  const { phases, config, exec, mode, guidance, failures, nextAction } = ov;
  const selectStartCTA = React.useMemo(()=>pipelineSelectors.startCTAState(campaignId),[campaignId]);
  const startCTA = useAppSelector(selectStartCTA);
  const dispatch = useAppDispatch();
  const [startPhase, { isLoading: startLoading }] = useStartPhaseStandaloneMutation();

  const toggleMode = (val: boolean) => {
    dispatch(setFullSequenceMode({ campaignId, value: val }));
  };

  const handlePrimaryAction = async () => {
    if (!nextAction) return;
    if (nextAction.type === 'start') {
      await startPhase({ campaignId, phase: nextAction.phase as any });
    }
    // configure path will be handled in Phase 5 when inline forms introduced
  };
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-6" data-pipeline-workspace>
      {/* Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm tracking-wide">Pipeline Workspace</h3>
          <div className="flex items-center gap-2 text-xs px-2 py-0.5 rounded bg-gray-50 border">
            <span>Auto</span>
            <Switch checked={mode.autoAdvance} onCheckedChange={toggleMode} />
            <span className="font-medium">{mode.autoAdvance ? 'Full Sequence' : 'Step by Step'}</span>
          </div>
          <span className="text-xs text-gray-500">Configured {config.progress.configured}/{config.progress.total}</span>
          <span className="text-xs text-gray-500">Completed {exec.progress.completed}/{exec.progress.total}</span>
        </div>
        <div className="flex items-center gap-3">
          {nextAction && (
            <div className="text-xs">
              Next: <strong>{nextAction.type}</strong> <span className="capitalize">{nextAction.phase}</span>{nextAction.reason && <> – {nextAction.reason}</>}
            </div>
          )}
          <Button size="sm" disabled={startCTA.disabled || !nextAction || nextAction.type!=='start'} isLoading={startLoading} onClick={handlePrimaryAction}>
            {nextAction?.type === 'start' ? `Start ${nextAction.phase}` : 'Start'}
          </Button>
        </div>
      </div>
      {/* Phase Rail */}
      <div className="flex flex-wrap gap-4 items-stretch" data-phase-rail>
        {phases.map((p, idx) => (
          <div key={p.key} className="flex items-center gap-2">{/* node */}
            <div className={`flex flex-col items-center gap-1`}>
              <span className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-semibold ${railColor(p)}`}>{idx+1}</span>
              <span className="text-[10px] capitalize">{p.key}</span>
            </div>
            {idx < phases.length-1 && <span className="w-8 h-px bg-gradient-to-r from-gray-300 to-gray-200" />}
          </div>
        ))}
      </div>
      {/* Main Adaptive Panel Placeholder */}
      <div className="rounded border bg-white p-4 text-sm min-h-[160px]" data-adaptive-panel>
        <p className="text-gray-600 mb-2">Adaptive Phase Panel (Phase 5+ will render inline configuration & logs).</p>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {phases.map(p => (
            <li key={p.key} className="border rounded px-2 py-1 flex flex-col gap-1">
              <div className="flex justify-between"><span className="capitalize font-medium">{p.key}</span><span>{p.execState}</span></div>
              <div className="flex justify-between opacity-70"><span>cfg</span><span>{p.configState}</span></div>
            </li>
          ))}
        </ul>
        {startCTA.disabled && startCTA.reasons.length > 0 && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 space-y-1">
            <div className="font-medium">Cannot start full sequence:</div>
            <ul className="list-disc ml-4">
              {startCTA.reasons.map(r => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
        {failures.lastFailed && (
          <div className="mt-3 text-red-600">Last failed phase: <strong>{failures.lastFailed}</strong></div>
        )}
        {guidance.latest && (
          <div className="mt-3 text-amber-700">Guidance: {guidance.latest.message}</div>
        )}
      </div>
    </div>
  );
};

export default PipelineWorkspace;