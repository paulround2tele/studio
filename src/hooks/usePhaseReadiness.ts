import { useMemo } from 'react';
import { useGetPhaseStatusStandaloneQuery } from '@/store/api/campaignApi';
import { useAppSelector } from '@/store/hooks';

type PhaseKey = 'discovery' | 'validation' | 'extraction' | 'analysis';

export interface PhaseReadiness {
  phase: PhaseKey;
  status: string | undefined;
  configured: boolean;
  dependenciesMet: boolean;
  canStart: boolean;
  blocked: boolean;
  missingFields?: string[];
}

export interface UsePhaseReadinessResult {
  phases: PhaseReadiness[];
  allConfigured: boolean;
  allReadyToChain: boolean; // every phase either completed or startable in order
  firstUnconfigured?: PhaseKey;
  blockedPhase?: string;
}

const ordered: PhaseKey[] = ['discovery', 'validation', 'extraction', 'analysis'];

export function usePhaseReadiness(campaignId: string): UsePhaseReadinessResult {
  // Query each phase status in parallel (RTK Query caches per (campaignId, phase))
  const discovery = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'discovery' }).data;
  const validation = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'validation' }).data;
  const extraction = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'extraction' }).data;
  const analysis = useGetPhaseStatusStandaloneQuery({ campaignId, phase: 'analysis' }).data;

  const blockedPhase = useAppSelector(s => s.campaignUI?.byId?.[campaignId]?.blockedPhase);

  return useMemo(() => {
    const map: Record<PhaseKey, typeof discovery | undefined> = {
      discovery, validation, extraction, analysis
    };

    const phases: PhaseReadiness[] = ordered.map((phase, idx) => {
      const status = map[phase]?.status;
      const configured = status === 'configured' || status === 'running' || status === 'completed' || status === 'paused' || status === 'failed';
  const prevKey = ordered[idx - 1] as PhaseKey | undefined;
  const prevComplete = idx === 0 || (prevKey ? map[prevKey]?.status === 'completed' : false);
      const dependenciesMet = prevComplete || phase === 'discovery';
      const canStart = dependenciesMet && (status === 'configured' || status === 'not_started' || status === 'paused');
      return {
        phase,
        status,
        configured,
        dependenciesMet,
        canStart,
        blocked: blockedPhase === phase,
      };
    });

    const firstUnconfigured = phases.find(p => !p.configured)?.phase;
    const allConfigured = phases.every(p => p.configured);
    // ready to chain if for each phase either completed or future phases still follow order with dependencies satisfied
    const allReadyToChain = phases.every(p => p.configured || p.canStart);

    return { phases, allConfigured, allReadyToChain, firstUnconfigured, blockedPhase };
  }, [discovery, validation, extraction, analysis, blockedPhase]);
}
