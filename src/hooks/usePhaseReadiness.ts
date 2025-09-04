// Deprecated: retained temporarily during Phase 1–6 of pipeline refactor.
// Redirect consumers to new usePipelineState hook shape.
import { usePipelineState } from './usePipelineState';

export function usePhaseReadiness(campaignId: string) {
  const { phases, allConfigured, activeConfigIndex, canStartFullSequence } = usePipelineState(campaignId);
  return {
    phases: phases.map(p => ({
      phase: p.key,
      status: p.statusRaw,
      configured: p.configState === 'valid',
      dependenciesMet: true, // simplified under strict model
      canStart: p.configState === 'valid' && p.execState === 'idle',
      blocked: false,
    })),
    allConfigured,
    allReadyToChain: allConfigured,
  firstUnconfigured: activeConfigIndex === -1 || !phases[activeConfigIndex] ? undefined : phases[activeConfigIndex]!.key,
    blockedPhase: undefined,
    canStartFullSequence,
  } as any; // temporary compatibility cast
}
