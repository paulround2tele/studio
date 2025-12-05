import computeAutoStartPhase from '../autoAdvanceLogic';
import type { UIPipelinePhase } from '../pipelineSelectors';

const phase = (key: UIPipelinePhase['key'], configState: UIPipelinePhase['configState'], execState: UIPipelinePhase['execState']): UIPipelinePhase => ({
  key,
  configState,
  execState,
});

describe('computeAutoStartPhase', () => {
  it('skips when auto-advance disabled', () => {
    const phases: UIPipelinePhase[] = [
      phase('discovery', 'valid', 'completed'),
      phase('validation', 'valid', 'idle'),
    ];
    expect(computeAutoStartPhase(phases, false)).toBeUndefined();
  });

  it('returns first runnable phase', () => {
    const phases: UIPipelinePhase[] = [
      phase('discovery', 'valid', 'completed'),
      phase('validation', 'valid', 'idle'),
    ];
    expect(computeAutoStartPhase(phases, true)).toBe('validation');
  });

  it('treats optional phases as configured when selecting next run', () => {
    const phases: UIPipelinePhase[] = [
      phase('discovery', 'valid', 'completed'),
      phase('validation', 'valid', 'completed'),
      phase('enrichment', 'missing', 'idle'),
      phase('extraction', 'valid', 'idle'),
    ];
    expect(computeAutoStartPhase(phases, true)).toBe('enrichment');
  });
});
