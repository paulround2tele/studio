import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CampaignUIState {
  // Frontend-only toggles for campaign views
  // Keyed by campaignId
  byId: Record<string, {
    fullSequenceMode?: boolean;
  blockedPhase?: string;
  preflightOpen?: boolean;
  guidance?: { message: string; phase?: string; severity: 'info' | 'warn' };
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
    setBlockedPhase(state, action: PayloadAction<{ campaignId: string; phase?: string }>) {
      const { campaignId, phase } = action.payload;
      state.byId[campaignId] = state.byId[campaignId] || {};
      state.byId[campaignId].blockedPhase = phase;
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

export const { setFullSequenceMode, setBlockedPhase, setPreflightOpen, setGuidance, hydrateCampaignUI, resetCampaignUI } = campaignUiSlice.actions;
export default campaignUiSlice.reducer;
