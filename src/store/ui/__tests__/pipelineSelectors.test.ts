import { configureStore } from '@reduxjs/toolkit';
import campaignUIReducer, { setFullSequenceMode, pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import pipelineExecReducer, { phaseStarted, phaseCompleted } from '@/store/slices/pipelineExecSlice';
import { pipelineSelectors, PIPELINE_PHASE_ORDER } from '@/store/selectors/pipelineSelectors';

// Mock RTK Query slice with minimal shape used by selectors
interface QueryEntry { endpointName: string; originalArgs: unknown; data?: unknown }

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
			// @ts-expect-error - injects minimalist mocked query slice for selector tests
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
				// @ts-expect-error - provide minimal mocked campaign API slice for selector behavior
				campaignApi: (s = { queries: makeQueries(campaignId, { discovery: undefined, validation: undefined, enrichment: undefined, extraction: undefined, analysis: undefined }) }) => s,
			}
		});
		const sel = pipelineSelectors.overview(campaignId);
		const first = sel(store.getState() as unknown);
		const second = sel(store.getState() as unknown);
		expect(second.exec.summary).toEqual(first.exec.summary);
	});

	it('enriches phases with duration after completion events', () => {
		const store = makeStore(campaignId, { discovery: 'configured', validation: 'configured', enrichment: 'configured', extraction: 'configured', analysis: 'configured' });
		const ovSel = pipelineSelectors.overview(campaignId);
		store.dispatch(phaseStarted({ campaignId, phase: 'discovery', ts: 1000 }));
		store.dispatch(phaseCompleted({ campaignId, phase: 'discovery', ts: 1500 }));
		const ov = ovSel(store.getState() as unknown);
		const enriched = ov.phasesEnriched.find((p: unknown) => p.key === 'discovery');
		expect(enriched?.durationMs).toBe(500);
	});
});

describe('optional phase gating', () => {
	const campaignId = 'c-optional';
	const baseStatuses = {
		discovery: 'completed',
		validation: 'configured',
		enrichment: 'not_started',
		extraction: 'configured',
		analysis: 'not_started',
	};

	it('does not block start CTA when only optional phases missing', () => {
		const store = makeStore(campaignId, baseStatuses);
		const startSel = pipelineSelectors.startCTAState(campaignId);
		const nextSel = pipelineSelectors.nextUserAction(campaignId);
		const state = store.getState() as unknown;
		const start = startSel(state);
		expect(start.disabled).toBe(false);
		const next = nextSel(state);
		expect(next).toEqual({ type: 'start', phase: 'validation' });
	});

	it('still allows auto-mode to proceed when optional phases missing', () => {
		const store = makeStore(campaignId, baseStatuses);
		store.dispatch(setFullSequenceMode({ campaignId, value: true }));
		const startSel = pipelineSelectors.startCTAState(campaignId);
		const state = store.getState() as unknown;
		expect(startSel(state).disabled).toBe(false);
	});

	it('treats optional phases as runnable even without explicit config', () => {
		const store = makeStore(campaignId, {
			discovery: 'completed',
			validation: 'completed',
			enrichment: 'not_started',
			extraction: 'configured',
			analysis: 'not_started',
		});
		const nextRunnableSel = pipelineSelectors.nextRunnablePhase(campaignId);
		const state = store.getState() as unknown;
		const next = nextRunnableSel(state);
		expect(next?.key).toBe('enrichment');
	});
});

describe('auto advance UX metadata', () => {
	const campaignId = 'c-auto';

	it('describes waiting state before the first manual kick-off', () => {
		const store = makeStore(campaignId, {
			discovery: 'configured',
			validation: 'configured',
			enrichment: 'not_started',
			extraction: 'configured',
			analysis: 'not_started',
		});
		store.dispatch(setFullSequenceMode({ campaignId, value: true }));
		const overviewSel = pipelineSelectors.overview(campaignId);
		const overview = overviewSel(store.getState() as unknown);
		expect(overview.mode.state).toBe('waiting_start');
		expect(overview.mode.hint).toContain('Start Discovery');
	});

	it('marks auto mode blocked when required phases missing', () => {
		const store = makeStore(campaignId, {
			discovery: undefined,
			validation: 'configured',
			enrichment: 'not_started',
			extraction: 'configured',
			analysis: 'not_started',
		});
		store.dispatch(setFullSequenceMode({ campaignId, value: true }));
		const overviewSel = pipelineSelectors.overview(campaignId);
		const overview = overviewSel(store.getState() as unknown);
		expect(overview.mode.state).toBe('blocked');
		expect(overview.mode.hint).toContain('Discovery');
	});
});

describe('optional default guidance fallback', () => {
	const campaignId = 'c-guidance';

	it('surfaces informational guidance when only optional phases missing', () => {
		const store = makeStore(campaignId, {
			discovery: 'configured',
			validation: 'configured',
			enrichment: 'not_started',
			extraction: 'configured',
			analysis: 'not_started',
		});
		const guidanceSel = pipelineSelectors.latestGuidance(campaignId);
		const guidance = guidanceSel(store.getState() as unknown);
		expect(guidance?.id).toBe('optional-defaults');
		expect(guidance?.message).toMatch(/default settings/i);
		expect(guidance?.severity).toBe('info');
	});

	it('does not override explicit guidance queue entries', () => {
		const store = makeStore(campaignId, {
			discovery: 'configured',
			validation: 'configured',
			enrichment: 'not_started',
			extraction: 'configured',
			analysis: 'not_started',
		});
		store.dispatch(pushGuidanceMessage({ campaignId, msg: { id: 'custom', message: 'Manual guidance', severity: 'warn' } }));
		const guidanceSel = pipelineSelectors.latestGuidance(campaignId);
		const guidance = guidanceSel(store.getState() as unknown);
		expect(guidance?.id).toBe('custom');
		expect(guidance?.severity).toBe('warn');
	});
});

