import type { UIPipelinePhase } from './pipelineSelectors';

/**
 * Determine next phase to auto-start under full sequence mode.
 * Rules:
 * 1. Auto-advance must be enabled.
 * 2. At least one phase must have started previously (prevents auto-start of very first phase; user initiates).
 * 3. No phase currently running.
 * 4. Return first configured + idle phase in declared order.
 */
export function computeAutoStartPhase(phases: UIPipelinePhase[], autoAdvance: boolean): string | undefined {
  if (!autoAdvance) return undefined;
  const anyStarted = phases.some(p => p.execState !== 'idle');
  if (!anyStarted) return undefined; // initial start must be manual
  const active = phases.find(p => p.execState === 'running');
  if (active) return undefined;
  const next = phases.find(p => p.configState === 'valid' && p.execState === 'idle');
  return next?.key;
}

export default computeAutoStartPhase;