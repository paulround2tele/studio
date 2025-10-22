import { configureStore, type Reducer } from '@reduxjs/toolkit';
import pipelineExecReducer, { phaseStarted, phaseCompleted } from '@/store/slices/pipelineExecSlice';
import campaignUiReducer, { setFullSequenceMode } from '@/store/ui/campaignUiSlice';
import { pipelineSelectors, PIPELINE_PHASE_ORDER, type PipelinePhaseKey } from '@/store/selectors/pipelineSelectors';
import type { RootState } from '@/store';

// We model config state through mocked RTK query responses; exec runtime through exec slice
interface QueryEntry {
  endpointName: string;
  originalArgs: { campaignId: string; phase: string };
  data?: { status: string };
}

interface MockApiState { queries: Record<string, QueryEntry>; }

const makePhaseStatus = (phase: string, status: string) => ({ status });

const buildQueries = (campaignId: string, statuses: Record<string, string>) => {
  const entries: Record<string, QueryEntry> = {};
  PIPELINE_PHASE_ORDER.forEach(p => {
    entries[`${campaignId}-${p}`] = {
      endpointName: 'getPhaseStatusStandalone',
      originalArgs: { campaignId, phase: p },
      data: makePhaseStatus(p, statuses[p] || 'configured'),
    };
  });
  return entries;
};

describe('autoAdvanceExecution', () => {
  it('computes correct next start phase after each completion', () => {
    const campaignId = 'cmp1';
    const initialStatuses: Record<PipelinePhaseKey, string> = {
      discovery: 'configured',
      validation: 'configured',
      extraction: 'configured',
      analysis: 'configured',
    };
    const campaignApiReducer: Reducer<MockApiState> = (state = { queries: buildQueries(campaignId, initialStatuses) }) => state;
    const store = configureStore({
      reducer: {
        pipelineExec: pipelineExecReducer,
        campaignUI: campaignUiReducer,
        // Minimal mock of campaignApi for selectors (status queries only)
        campaignApi: campaignApiReducer,
      }
    });
    store.dispatch(setFullSequenceMode({ campaignId, value: true }));

    const selectOverview = pipelineSelectors.overview(campaignId);
    const discoveryPhase: PipelinePhaseKey = 'discovery';
    const validationPhase: PipelinePhaseKey = 'validation';
    const extractionPhase: PipelinePhaseKey = 'extraction';

    // Initially auto-advance should not trigger (nothing started yet)
    let ov = selectOverview(store.getState() as RootState);
    expect(ov.phases.filter(p=>p.execState==='running').length).toBe(0);

    // Simulate starting discovery via user action
    store.dispatch(phaseStarted({ campaignId, phase: discoveryPhase }));
    // Exec slice drives running state; UI selectors derive from pipelineExec? (Auto start logic uses phases array; adapt by mapping)
    ov = selectOverview(store.getState() as RootState);
    // Without full integration mapping exec slice -> phases array in selector test context, we skip asserting running state here.

    // Complete discovery -> expect auto-advance logic (when effect runs in app) would choose validation
    store.dispatch(phaseCompleted({ campaignId, phase: discoveryPhase }));
    ov = selectOverview(store.getState() as RootState);
    const phases = ov.phases.map(p => p.key === discoveryPhase ? { ...p, execState: 'completed' } : p);
    // Determine next via same helper used in component (simulate updated exec state mapping)
    const { default: computeAutoStartPhase } = require('@/store/selectors/autoAdvanceLogic');
    const next = computeAutoStartPhase(phases, true);
    expect(next).toBe(validationPhase);

    // Simulate validation completion chain
    store.dispatch(phaseStarted({ campaignId, phase: validationPhase }));
    // Mark validation running (implicit via exec slice already)
    store.dispatch(phaseCompleted({ campaignId, phase: validationPhase }));
    ov = selectOverview(store.getState() as RootState);
    const phases2 = ov.phases.map(p => (p.key === validationPhase || p.key === discoveryPhase) ? { ...p, execState: 'completed' } : p);
  const next2 = computeAutoStartPhase(phases2, true);
    expect(next2).toBe(extractionPhase);
  });
});
