import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CampaignUIState {
  // Frontend-only toggles for campaign views
  // Keyed by campaignId
  byId: Record<string, {
    fullSequenceMode?: boolean;
  preflightOpen?: boolean; // legacy preflight (will be removed later)
  guidance?: { message: string; phase?: string; severity: 'info' | 'warn' }; // single guidance (legacy)
  guidanceMessages?: { id: string; message: string; phase?: string; severity: 'info' | 'warn' }[]; // new queue
  lastFailedPhase?: string;
    // Add more UI-only fields as needed
  }>;
}

const initialState: CampaignUIState = {
  byId: {},
};

const campaignUiSlice = createSlice({
  name: 'campaignUI',
  initialState,
  reducers: {
    setFullSequenceMode(state, action: PayloadAction<{ campaignId: string; value: boolean }>) {
      const { campaignId, value } = action.payload;
      state.byId[campaignId] = state.byId[campaignId] || {};
      state.byId[campaignId].fullSequenceMode = value;
    },
    setPreflightOpen(state, action: PayloadAction<{ campaignId: string; open: boolean }>) {
      const { campaignId, open } = action.payload;
      state.byId[campaignId] = state.byId[campaignId] || {};
      state.byId[campaignId].preflightOpen = open;
    },
    setGuidance(state, action: PayloadAction<{ campaignId: string; guidance?: { message: string; phase?: string; severity: 'info' | 'warn' } }>) {
      const { campaignId, guidance } = action.payload;
      state.byId[campaignId] = state.byId[campaignId] || {};
      state.byId[campaignId].guidance = guidance;
    },
    clearGuidance(state, action: PayloadAction<{ campaignId: string }>) {
      const { campaignId } = action.payload;
      if (state.byId[campaignId]) state.byId[campaignId].guidance = undefined;
    },
    pushGuidanceMessage(state, action: PayloadAction<{ campaignId: string; msg: { id: string; message: string; phase?: string; severity: 'info' | 'warn' } }>) {
      const { campaignId, msg } = action.payload;
      state.byId[campaignId] = state.byId[campaignId] || {};
      const arr = state.byId[campaignId].guidanceMessages || (state.byId[campaignId].guidanceMessages = []);
      arr.unshift(msg);
      if (arr.length > 5) arr.pop();
    },
    dismissGuidanceMessage(state, action: PayloadAction<{ campaignId: string; id: string }>) {
      const { campaignId, id } = action.payload;
      const arr = state.byId[campaignId]?.guidanceMessages;
      if (arr) {
        state.byId[campaignId]!.guidanceMessages = arr.filter(m => m.id !== id);
      }
    },
    setLastFailedPhase(state, action: PayloadAction<{ campaignId: string; phase?: string }>) {
      const { campaignId, phase } = action.payload;
      state.byId[campaignId] = state.byId[campaignId] || {};
      state.byId[campaignId].lastFailedPhase = phase;
    },
    hydrateCampaignUI(state, action: PayloadAction<{ campaignId: string; data: Partial<CampaignUIState['byId'][string]> }>) {
      const { campaignId, data } = action.payload;
      state.byId[campaignId] = { ...(state.byId[campaignId] || {}), ...data };
    },
    resetCampaignUI(state, action: PayloadAction<{ campaignId: string }>) {
      const { campaignId } = action.payload;
      delete state.byId[campaignId];
    },
  },
});

export const { setFullSequenceMode, setPreflightOpen, setGuidance, clearGuidance, setLastFailedPhase, hydrateCampaignUI, resetCampaignUI, pushGuidanceMessage, dismissGuidanceMessage } = campaignUiSlice.actions;
export default campaignUiSlice.reducer;
