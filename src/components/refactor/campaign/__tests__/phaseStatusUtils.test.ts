import { mergeCampaignPhases, deriveOverallProgress } from '../phaseStatusUtils';
import { DEFAULT_PHASES } from '../../../../hooks/useCampaignPhaseStream';
import type { CampaignPhasesStatusResponse } from '../../../../lib/api-client/models/campaign-phases-status-response';
import type { PipelinePhase } from '../PipelineBar';

function cloneDefaultPhases(): PipelinePhase[] {
  return DEFAULT_PHASES.map((phase: PipelinePhase) => ({ ...phase }));
}

describe('mergeCampaignPhases', () => {
  it('returns base phases when no data provided', () => {
    const result = mergeCampaignPhases({});
    expect(result).toEqual(DEFAULT_PHASES);
  });

  it('applies status snapshot to phases', () => {
    const snapshot: CampaignPhasesStatusResponse = {
      campaignId: 'abc',
      overallProgressPercentage: 40,
      phases: [
        {
          phase: 'generation',
          status: 'completed',
          progressPercentage: 100,
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:05:00Z'
        },
        {
          phase: 'dns',
          status: 'in_progress',
          progressPercentage: 50
        }
      ]
    };

    const result = mergeCampaignPhases({ statusSnapshot: snapshot });
    const generation = result.find((phase) => phase.key === 'generation');
    const dns = result.find((phase) => phase.key === 'dns');

    expect(generation).toMatchObject({
      status: 'completed',
      progressPercentage: 100,
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:05:00Z'
    });
    expect(dns).toMatchObject({
      status: 'in_progress',
      progressPercentage: 50
    });
  });

  it('uses funnel data as fallback when snapshot missing', () => {
    const funnelData = {
      generated: 100,
      dnsValid: 60,
      httpValid: 40,
      keywordHits: 0,
      analyzed: 30,
      highPotential: 10,
      leads: 5
    };

    const result = mergeCampaignPhases({ funnelData });
    const generation = result.find((phase) => phase.key === 'generation');
    const dns = result.find((phase) => phase.key === 'dns');

    expect(generation).toMatchObject({
      status: 'completed',
      progressPercentage: 100
    });
    expect(dns).toMatchObject({
      status: 'in_progress',
      progressPercentage: 60
    });
  });

  it('overlays SSE phases when they contain meaningful updates', () => {
    const ssePhases: PipelinePhase[] = cloneDefaultPhases().map((phase) =>
      phase.key === 'analysis'
        ? { ...phase, status: 'in_progress', progressPercentage: 25 }
        : phase
    );

    const result = mergeCampaignPhases({
      ssePhases,
      sseLastUpdate: Date.now()
    });

    const analysis = result.find((phase) => phase.key === 'analysis');
    expect(analysis).toMatchObject({
      status: 'in_progress',
      progressPercentage: 25
    });
  });

  it('ignores SSE phases when lacking last update timestamp', () => {
    const ssePhases: PipelinePhase[] = cloneDefaultPhases().map((phase) =>
      phase.key === 'leads'
        ? { ...phase, status: 'completed', progressPercentage: 100 }
        : phase
    );

    const result = mergeCampaignPhases({ ssePhases });
    const leads = result.find((phase) => phase.key === 'leads');

    expect(leads).toMatchObject({
      status: 'not_started',
      progressPercentage: 0
    });
  });
});

describe('deriveOverallProgress', () => {
  it('computes average progress across phases', () => {
    const phases: PipelinePhase[] = cloneDefaultPhases().map((phase) =>
      phase.key === 'generation'
        ? { ...phase, status: 'completed', progressPercentage: 100 }
        : phase
    );

    const progress = deriveOverallProgress(phases);
    expect(progress).toBeCloseTo(20, 5);
  });

  it('returns zero when phases list empty', () => {
    expect(deriveOverallProgress([])).toBe(0);
  });
});
