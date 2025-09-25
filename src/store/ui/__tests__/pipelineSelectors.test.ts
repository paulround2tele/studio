import { configureStore } from '@reduxjs/toolkit';
import campaignUIReducer from '@/store/ui/campaignUiSlice';
import pipelineExecReducer, { phaseStarted, phaseCompleted } from '@/store/slices/pipelineExecSlice';
import { pipelineSelectors, PIPELINE_PHASE_ORDER } from '@/store/selectors/pipelineSelectors';

// Mock RTK Query slice with minimal shape used by selectors
interface QueryEntry { endpointName: string; originalArgs: any; data?: any }

const makeQueries = (campaignId: string, statuses: Record<string,string|undefined>) => {
	const queries: Record<string, QueryEntry> = {};
	PIPELINE_PHASE_ORDER.forEach(phase => {
		queries[`${campaignId}-${phase}`] = {
			endpointName: 'getPhaseStatusStandalone',
			originalArgs: { campaignId, phase },
			data: { status: statuses[phase] }
		};
	});
	return queries;
};

function makeStore(campaignId: string, statuses: Record<string,string|undefined>) {
	return configureStore({
		reducer: {
			campaignUI: campaignUIReducer,
			pipelineExec: pipelineExecReducer,
			// @ts-ignore
			campaignApi: (s = { queries: makeQueries(campaignId, statuses) }) => s,
		}
	});
}

describe('pipeline overview selector', () => {
	const campaignId = 'c-ov';
	it('returns stable empty exec runtime object when pipelineExec slice absent', () => {
		const store = configureStore({
			reducer: {
				campaignUI: campaignUIReducer,
				// omit pipelineExec intentionally
				// @ts-ignore
				campaignApi: (s = { queries: makeQueries(campaignId, { discovery: undefined, validation: undefined, extraction: undefined, analysis: undefined }) }) => s,
			}
		});
		const sel = pipelineSelectors.overview(campaignId);
		const first = sel(store.getState() as any);
		const second = sel(store.getState() as any);
		expect(second.exec.summary).toEqual(first.exec.summary);
	});

	it('enriches phases with duration after completion events', () => {
		const store = makeStore(campaignId, { discovery: 'configured', validation: 'configured', extraction: 'configured', analysis: 'configured' });
		const ovSel = pipelineSelectors.overview(campaignId);
		store.dispatch(phaseStarted({ campaignId, phase: 'discovery', ts: 1000 }));
		store.dispatch(phaseCompleted({ campaignId, phase: 'discovery', ts: 1500 }));
		const ov = ovSel(store.getState() as any);
		const enriched = ov.phasesEnriched.find((p:any) => p.key === 'discovery');
		expect(enriched?.durationMs).toBe(500);
	});
});

