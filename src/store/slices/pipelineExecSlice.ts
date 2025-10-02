import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PipelinePhaseKey } from '@/store/selectors/pipelineSelectors';

export interface PhaseExecRuntime {
  phase: PipelinePhaseKey;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface PipelineExecState {
  byCampaign: Record<string, Record<PipelinePhaseKey, PhaseExecRuntime>>;
}

const initialState: PipelineExecState = { byCampaign: {} };

const ensurePhase = (state: PipelineExecState, campaignId: string, phase: PipelinePhaseKey): PhaseExecRuntime => {
  let cmap = state.byCampaign[campaignId];
  if (!cmap) {
    cmap = {} as Record<PipelinePhaseKey, PhaseExecRuntime>;
    state.byCampaign[campaignId] = cmap;
  }
  const existing = cmap[phase];
  if (existing) return existing;
  const created: PhaseExecRuntime = { phase, status: 'idle' };
  cmap[phase] = created;
  return created;
};

const slice = createSlice({
  name: 'pipelineExec',
  initialState,
  reducers: {
    phaseStarted(state, action: PayloadAction<{ campaignId: string; phase: PipelinePhaseKey; ts?: number }>) {
      const { campaignId, phase, ts } = action.payload;
      const rec = ensurePhase(state, campaignId, phase);
      rec.status = 'running';
      rec.startedAt = rec.startedAt || ts || Date.now();
      rec.error = undefined;
    },
    phaseCompleted(state, action: PayloadAction<{ campaignId: string; phase: PipelinePhaseKey; ts?: number }>) {
      const { campaignId, phase, ts } = action.payload;
      const rec = ensurePhase(state, campaignId, phase);
      rec.status = 'completed';
      rec.completedAt = ts || Date.now();
    },
    phaseFailed(state, action: PayloadAction<{ campaignId: string; phase: PipelinePhaseKey; error?: string; ts?: number }>) {
      const { campaignId, phase, error, ts } = action.payload;
      const rec = ensurePhase(state, campaignId, phase);
      rec.status = 'failed';
      rec.error = error;
      rec.completedAt = ts || Date.now();
    },
    resetPipelineExec(state, action: PayloadAction<{ campaignId: string }>) {
      delete state.byCampaign[action.payload.campaignId];
    }
  }
});

export const { phaseStarted, phaseCompleted, phaseFailed, resetPipelineExec } = slice.actions;
export default slice.reducer;