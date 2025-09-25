import { configureStore } from '@reduxjs/toolkit';
import campaignUIReducer, { setLastFailedPhase, setFullSequenceMode } from '@/store/ui/campaignUiSlice';
import pipelineExecReducer, { phaseStarted, phaseFailed, phaseCompleted } from '@/store/slices/pipelineExecSlice';
import { pipelineSelectors, PIPELINE_PHASE_ORDER } from '@/store/selectors/pipelineSelectors';

// Mirror minimal RTK Query slice structure
interface QueryEntry { endpointName: string; originalArgs: any; data?: any; }
interface MockApiState { queries: Record<string, QueryEntry>; }

const buildQueries = (campaignId: string, statuses: Record<string,string|undefined>) => {
  const entries: Record<string, QueryEntry> = {};
  PIPELINE_PHASE_ORDER.forEach(p => {
    entries[`${campaignId}-${p}`] = { endpointName: 'getPhaseStatusStandalone', originalArgs: { campaignId, phase: p }, data: { status: statuses[p] } };
  });
  return entries;
};

// Custom action for test-only campaignApi mock state mutation
const setPhaseStatus = (campaignId: string, phase: string, status: string) => ({ type: 'test/campaignApi/setStatus', payload: { campaignId, phase, status } });

describe('failure -> retry UI selector flow', () => {
  const campaignId = 'failChain';

  function makeStore(statuses: Record<string,string|undefined>) {
    // test reducer for campaignApi slice supporting status mutation
    const campaignApiReducer = (state: MockApiState = { queries: buildQueries(campaignId, statuses) }, action: any): MockApiState => {
      if (action.type === 'test/campaignApi/setStatus') {
        const { campaignId: cid, phase, status } = action.payload;
        const key = `${cid}-${phase}`;
        const existing = state.queries[key];
        return {
          queries: {
            ...state.queries,
            [key]: { endpointName: 'getPhaseStatusStandalone', originalArgs: { campaignId: cid, phase }, data: { status } }
          }
        };
      }
      return state;
    };
    return configureStore({
      reducer: {
        campaignUI: campaignUIReducer,
        pipelineExec: pipelineExecReducer,
        // @ts-ignore
        campaignApi: campaignApiReducer,
      }
    });
  }

  it('marks lastFailedPhase and exposes retryEligiblePhases after a failure', () => {
    const store = makeStore({ discovery: 'configured', validation: 'configured', extraction: 'configured', analysis: 'configured' });
    store.dispatch(setFullSequenceMode({ campaignId, value: true }));
    // start discovery
    store.dispatch(phaseStarted({ campaignId, phase: 'discovery' as any }));
  // fail discovery (exec slice) and reflect backend status in campaignApi mock
  store.dispatch(phaseFailed({ campaignId, phase: 'discovery' as any, error: 'boom' }));
  store.dispatch(setPhaseStatus(campaignId, 'discovery', 'failed'));
    store.dispatch(setLastFailedPhase({ campaignId, phase: 'discovery' }));

    const failedSel = pipelineSelectors.failedPhases(campaignId);
    const retrySel = pipelineSelectors.retryEligiblePhases(campaignId);
    const lastFailedSel = pipelineSelectors.lastFailedPhase(campaignId);
    const overviewSel = pipelineSelectors.overview(campaignId);

    const state = store.getState() as any;
    expect(lastFailedSel(state)).toBe('discovery');
    expect(failedSel(state).map(p=>p.key)).toEqual(['discovery']);
  expect(retrySel(state).map(p=>p.key)).toEqual(['discovery']);
    const ov = overviewSel(state);
    expect(ov.failures.lastFailed).toBe('discovery');
  });

  it('after retry success failure-related selectors clear and nextUserAction advances', () => {
    const store = makeStore({ discovery: 'configured', validation: 'configured', extraction: 'configured', analysis: 'configured' });
    // initial failure
    store.dispatch(phaseStarted({ campaignId, phase: 'discovery' as any }));
    store.dispatch(phaseFailed({ campaignId, phase: 'discovery' as any, error: 'boom' }));
    store.dispatch(setLastFailedPhase({ campaignId, phase: 'discovery' }));
  // manual retry (start again then complete) and sync campaignApi statuses
  store.dispatch(phaseStarted({ campaignId, phase: 'discovery' as any }));
  store.dispatch(phaseCompleted({ campaignId, phase: 'discovery' as any }));
  store.dispatch(setPhaseStatus(campaignId, 'discovery', 'completed'));
    // clear failure marker explicitly (would happen via effect in real app)
    store.dispatch(setLastFailedPhase({ campaignId, phase: undefined }));

    const retrySel = pipelineSelectors.retryEligiblePhases(campaignId);
    const lastFailedSel = pipelineSelectors.lastFailedPhase(campaignId);
    const nextActionSel = pipelineSelectors.nextUserAction(campaignId);

    const state = store.getState() as any;
  expect(retrySel(state).map(p=>p.key)).toEqual([]);
    expect(lastFailedSel(state)).toBeUndefined();
    const next = nextActionSel(state);
    // With discovery completed, validation is next runnable phase
  expect(next).toEqual({ type: 'start', phase: 'validation' });
  });
});
