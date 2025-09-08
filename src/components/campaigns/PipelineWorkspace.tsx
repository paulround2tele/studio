"use client";
import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { useAppDispatch } from '@/store/hooks';
import { setFullSequenceMode, setSelectedPhase } from '@/store/ui/campaignUiSlice';
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
  const selectedPhase = useAppSelector(React.useMemo(()=>pipelineSelectors.selectedPhase(campaignId),[campaignId]));
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

  const handlePhaseClick = (phaseKey: string) => {
    dispatch(setSelectedPhase({ campaignId, phase: phaseKey }));
  };

  // Derive which phase panel should show: explicit selection first, else next configure target
  const panelPhase = selectedPhase || (nextAction?.type === 'configure' ? nextAction.phase : undefined);
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
          <button type="button" onClick={() => handlePhaseClick(p.key)} key={p.key} className="flex items-center gap-2 focus:outline-none group">
            <div className={`flex flex-col items-center gap-1`}>
              <span className={`h-8 w-8 rounded-full border flex items-center justify-center text-[11px] font-semibold transition-colors ${railColor(p)} ${panelPhase===p.key ? 'ring-2 ring-primary ring-offset-1' : ''}`}>{idx+1}</span>
              <span className={`text-[10px] capitalize ${panelPhase===p.key ? 'text-primary font-semibold' : ''}`}>{p.key}</span>
            </div>
            {idx < phases.length-1 && <span className="w-8 h-px bg-gradient-to-r from-gray-300 to-gray-200 group-hover:from-primary/40 group-hover:to-primary/40" />}
          </button>
        ))}
      </div>
      {/* Main Adaptive Panel Placeholder */}
      <div className="rounded border bg-white p-4 text-sm min-h-[160px]" data-adaptive-panel>
        {!panelPhase && (
          <div className="text-gray-600 mb-2">Adaptive Phase Panel – select a phase or follow the next action guidance. Inline forms will appear here.</div>
        )}
        {panelPhase && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm capitalize">{panelPhase} Configuration</h4>
              <Button variant="ghost" size="sm" onClick={()=>dispatch(setSelectedPhase({campaignId, phase: undefined}))}>Close</Button>
            </div>
            <div className="text-xs text-gray-500">Inline form placeholder for <span className="font-medium">{panelPhase}</span>. (To be replaced with real form components in this phase.)</div>
            <div className="border rounded p-3 text-xs bg-gray-50">Status: {phases.find(p=>p.key===panelPhase)?.configState}</div>
          </div>
        )}
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