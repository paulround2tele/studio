import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CampaignUIState {
  // Frontend-only toggles for campaign views
  // Keyed by campaignId
  byId: Record<string, {
    fullSequenceMode?: boolean;
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

export const { setFullSequenceMode, hydrateCampaignUI, resetCampaignUI } = campaignUiSlice.actions;
export default campaignUiSlice.reducer;
