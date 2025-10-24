import { configureStore } from '@reduxjs/toolkit';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { campaignApi } from '@/store/api/campaignApi';

// Mock api configuration to bypass real Configuration constructor
jest.mock('@/lib/api/config', () => ({ apiConfiguration: {} }));

// We'll fabricate minimal RTK Query state shape for phase status queries to validate selector behavior.
// getPhaseStatusStandalone uses args { campaignId, phase }

type PhaseArgs = { campaignId: string; phase: string };
interface QuerySubstate { endpointName: string; originalArgs: PhaseArgs; data?: unknown }

function buildPhaseQuery(campaignId: string, phase: string, status: string | undefined): QuerySubstate {
  return { endpointName: 'getPhaseStatusStandalone', originalArgs: { campaignId, phase }, data: { status } };
}

// Real selectors call campaignApi.endpoints.getPhaseStatusStandalone.select(args)
// Instead of spinning full API slice we patch campaignApi.endpoints.getPhaseStatusStandalone.select to pull from our injected reducer state.

const PHASES = ['discovery','validation','extraction','analysis'] as const;

describe('pipelineSelectors makeSelectPipelinePhases (refactored)', () => {
  const campaignId = 'cmp-1';

  function makeStore(phaseStatuses: Record<string, string | undefined>) {
    // Build a faux RTK query slice state with keys we control
    const queries: Record<string, QuerySubstate> = {};
    for (const phase of PHASES) {
      const status = phaseStatuses[phase];
      queries[`getPhaseStatusStandalone-${campaignId}-${phase}`] = buildPhaseQuery(campaignId, phase, status);
    }
    const sliceState = { queries };

    // Reducer just returns fixed state (read-only for this test)
    const campaignApiReducer = (state = sliceState, _action: unknown) => state;

    // Patch endpoint select to read from our stored queries by reconstructing key
    (campaignApi.endpoints as unknown).getPhaseStatusStandalone = {
      select: ({ campaignId, phase }: PhaseArgs) => (root: unknown) => {
        return root.campaignApi.queries[`getPhaseStatusStandalone-${campaignId}-${phase}`];
      }
    };

    return configureStore({
      reducer: { campaignApi: campaignApiReducer }
    });
  }

  it('maps backend statuses to UIPipelinePhase exec/config states', () => {
    const store = makeStore({
      discovery: 'completed',
      validation: 'running',
      extraction: 'not_started',
      analysis: undefined,
    });
    const select = pipelineSelectors.phases(campaignId);
    const phases = select(store.getState() as unknown);
    const map: Record<string, unknown> = Object.fromEntries(phases.map(p => [p.key, p]));
    expect(map.discovery.execState).toBe('completed');
    expect(map.validation.execState).toBe('running');
    expect(map.extraction.execState).toBe('idle');
    expect(map.analysis.execState).toBe('idle');
    expect(map.extraction.configState).toBe('missing');
    expect(map.discovery.configState).toBe('valid');
  });

  it('derives allConfigured correctly', () => {
    const store = makeStore({ discovery: 'completed', validation: 'completed', extraction: 'completed', analysis: 'completed' });
    const allConfiguredSel = pipelineSelectors.allConfigured(campaignId);
    expect(allConfiguredSel(store.getState() as unknown)).toBe(true);
  });
});
