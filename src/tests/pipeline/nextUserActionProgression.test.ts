import { configureStore } from '@reduxjs/toolkit';
import campaignUIReducer, { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import { pipelineSelectors, PIPELINE_PHASE_ORDER } from '@/store/selectors/pipelineSelectors';

// Minimal mock of RTK Query slice structure used by selectors
interface QueryEntry { endpointName: string; originalArgs: any; data?: any; }
interface MockApiState { queries: Record<string, QueryEntry>; }

const makePhaseStatus = (status?: string) => ({ status });

function makeStore(initialQueries: Record<string, QueryEntry>) {
  return configureStore({
    reducer: {
      campaignUI: campaignUIReducer,
      // @ts-ignore - provide only what selectors read
      campaignApi: (state: MockApiState = { queries: initialQueries }) => state,
    }
  });
}

describe('nextUserAction selector progression', () => {
  const campaignId = 'c1';
  const phaseKeys = PIPELINE_PHASE_ORDER;

  const queryKey = (phase: string) => `${campaignId}-${phase}`;

  const buildQueries = (statuses: Record<string,string|undefined>) => {
    const entries: Record<string, QueryEntry> = {};
    phaseKeys.forEach(p => {
      entries[queryKey(p)] = { endpointName: 'getPhaseStatusStandalone', originalArgs: { campaignId, phase: p }, data: makePhaseStatus(statuses[p]) };
    });
    return entries;
  };

  it('initially requires configuration for first missing phase and progresses after each configuration', () => {
    const store = makeStore(buildQueries({ discovery: undefined, validation: undefined, extraction: undefined, analysis: undefined }));
    const sel = pipelineSelectors.nextUserAction(campaignId);
    expect(sel(store.getState() as any)).toEqual({ type: 'configure', phase: 'discovery', reason: 'Configuration required' });

    // Because selectors are memoized per instance, mutate then force a dummy dispatch to invalidate cache root each step.
    const reselect = (statuses: Record<string,string|undefined>) => {
      const newStore = makeStore(buildQueries(statuses));
      return { state: newStore.getState() as any };
    };
    // discovery configured
    let snap = reselect({ discovery: 'configured', validation: undefined, extraction: undefined, analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'configure', phase: 'validation', reason: 'Configuration required' });
    // validation configured
    snap = reselect({ discovery: 'configured', validation: 'configured', extraction: undefined, analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'configure', phase: 'extraction', reason: 'Configuration required' });
    // extraction configured
    snap = reselect({ discovery: 'configured', validation: 'configured', extraction: 'configured', analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'configure', phase: 'analysis', reason: 'Configuration required' });
    // all configured
    snap = reselect({ discovery: 'configured', validation: 'configured', extraction: 'configured', analysis: 'configured' });
    expect(sel(snap.state)).toEqual({ type: 'start', phase: 'discovery' });
  });

  it('guidance queue unaffected by configuration progression', () => {
    const store = makeStore(buildQueries({ discovery: 'configured', validation: undefined, extraction: undefined, analysis: undefined }));
    store.dispatch(pushGuidanceMessage({ campaignId, msg: { id: 'g1', message: 'Test guidance', severity: 'info' } }));
    const overviewSel = pipelineSelectors.overview(campaignId);
    const ov = overviewSel(store.getState() as any);
    expect(ov.guidance.count).toBe(1);
  });
});
