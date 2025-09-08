import { useMemo } from 'react';
import { useGetPhaseStatusStandaloneQuery } from '@/store/api/campaignApi';
import { useAppSelector } from '@/store/hooks';

export type PipelinePhaseKey = 'discovery' | 'validation' | 'extraction' | 'analysis';

export type PhaseConfigState = 'missing' | 'valid';
export type PhaseExecState = 'idle' | 'running' | 'completed' | 'failed';

export interface UIPipelinePhase {
  key: PipelinePhaseKey;
  configState: PhaseConfigState;
  execState: PhaseExecState;
  statusRaw?: string; // raw backend status for debugging
  durationMs?: number;
  attempts?: number;
  lastError?: string;
}

export interface UsePipelineStateResult {
  phases: UIPipelinePhase[];
  allConfigured: boolean;
  activeConfigIndex: number; // index of first missing config, -1 if all valid
  canStartFullSequence: boolean; // allConfigured and none running/completed yet (first phase idle)
}

const ordered: PipelinePhaseKey[] = ['discovery', 'validation', 'extraction', 'analysis'];

export function usePipelineState(campaignId: string): UsePipelineStateResult {
  const discovery = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'discovery' }).data;
  const validation = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'validation' }).data;
  const extraction = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'extraction' }).data;
  const analysis = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'analysis' }).data;

  return useMemo(() => {
    const map: Record<PipelinePhaseKey, any> = { discovery, validation, extraction, analysis };
    const phases: UIPipelinePhase[] = ordered.map(k => {
      const status = map[k]?.status as string | undefined;
      const configured = !!status && status !== 'not_started';
      let execState: PhaseExecState = 'idle';
      if (status === 'running') execState = 'running';
      else if (status === 'completed') execState = 'completed';
      else if (status === 'failed') execState = 'failed';
      return {
        key: k,
        configState: configured ? 'valid' : 'missing',
        execState,
        statusRaw: status,
      };
    });
    const activeConfigIndex = phases.findIndex(p => p.configState === 'missing');
    const allConfigured = activeConfigIndex === -1;
  const first = phases[0];
  const canStartFullSequence = allConfigured && !!first && first.execState === 'idle';
    return { phases, allConfigured, activeConfigIndex, canStartFullSequence };
  }, [discovery, validation, extraction, analysis]);
}

