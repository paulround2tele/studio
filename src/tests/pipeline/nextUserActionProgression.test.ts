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

  it('guides configuration until a phase is runnable, then promotes execution before later configuration', () => {
    const store = makeStore(buildQueries({ discovery: undefined, validation: undefined, extraction: undefined, analysis: undefined }));
    const sel = pipelineSelectors.nextUserAction(campaignId);
    expect(sel(store.getState() as any)).toEqual({ type: 'configure', phase: 'discovery', reason: 'Configuration required' });

    const reselect = (statuses: Record<string,string|undefined>) => {
      const newStore = makeStore(buildQueries(statuses));
      return { state: newStore.getState() as any };
    };

    // discovery configured -> we can immediately start it even though later phases lack config
    let snap = reselect({ discovery: 'configured', validation: undefined, extraction: undefined, analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'start', phase: 'discovery' });

    // discovery running keeps the call in watch mode
    snap = reselect({ discovery: 'running', validation: undefined, extraction: undefined, analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'watch', phase: 'discovery' });

    // once discovery completed we gate on next missing configuration
    snap = reselect({ discovery: 'completed', validation: undefined, extraction: undefined, analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'configure', phase: 'validation', reason: 'Configuration required' });

    // validation configured unlocks starting it despite later phases missing config
    snap = reselect({ discovery: 'completed', validation: 'configured', extraction: undefined, analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'start', phase: 'validation' });

    // validation completed now asks to configure extraction
    snap = reselect({ discovery: 'completed', validation: 'completed', extraction: undefined, analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'configure', phase: 'extraction', reason: 'Configuration required' });

    snap = reselect({ discovery: 'completed', validation: 'completed', extraction: 'configured', analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'start', phase: 'extraction' });

    snap = reselect({ discovery: 'completed', validation: 'completed', extraction: 'completed', analysis: undefined });
    expect(sel(snap.state)).toEqual({ type: 'configure', phase: 'analysis', reason: 'Configuration required' });

    snap = reselect({ discovery: 'completed', validation: 'completed', extraction: 'completed', analysis: 'configured' });
    expect(sel(snap.state)).toEqual({ type: 'start', phase: 'analysis' });
  });

  it('guidance queue unaffected by configuration progression', () => {
    const store = makeStore(buildQueries({ discovery: 'configured', validation: undefined, extraction: undefined, analysis: undefined }));
    store.dispatch(pushGuidanceMessage({ campaignId, msg: { id: 'g1', message: 'Test guidance', severity: 'info' } }));
    const overviewSel = pipelineSelectors.overview(campaignId);
    const ov = overviewSel(store.getState() as any);
    expect(ov.guidance.count).toBe(1);
  });
});
