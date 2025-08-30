import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Campaign } from '@/lib/api-client';

// State interface for campaign management
export interface CampaignState {
  // Current campaign being viewed/edited
  currentCampaign: Campaign | null;
  
  // Phase transition state
  isTransitioning: boolean;
  transitioningPhase: string | null;
  transitionError: string | null;
  
  // Configuration state
  isConfiguring: boolean;
  configuringPhase: string | null;
  configurationDirty: boolean;
  
  // UI state
  selectedCampaignId: string | null;
  showPhaseConfiguration: boolean;
  configurationMode: 'panel' | 'dialog';
  
  // Phase management
  selectedPhase: string | null;
  phaseConfiguration: Record<string, any>;
  phaseStatus: 'idle' | 'configuring' | 'executing' | 'completed' | 'error';
  
  // Campaign status for phase dependencies
  campaignStatus: {
    hasGeneratedDomains: boolean;
    hasDNSValidation: boolean;
    hasHTTPValidation: boolean;
    completedPhases: string[];
  };
  
  // Real-time updates state
  lastUpdated: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

const initialState: CampaignState = {
  currentCampaign: null,
  isTransitioning: false,
  transitioningPhase: null,
  transitionError: null,
  isConfiguring: false,
  configuringPhase: null,
  configurationDirty: false,
  selectedCampaignId: null,
  showPhaseConfiguration: false,
  configurationMode: 'panel',
  selectedPhase: null,
  phaseConfiguration: {},
  phaseStatus: 'idle',
  campaignStatus: {
    hasGeneratedDomains: false,
    hasDNSValidation: false,
    hasHTTPValidation: false,
    completedPhases: []
  },
  lastUpdated: null,
  connectionStatus: 'disconnected',
};

const campaignSlice = createSlice({
  name: 'campaign',
  initialState,
  reducers: {
    // Campaign selection
    selectCampaign: (state, action: PayloadAction<string>) => {
      state.selectedCampaignId = action.payload;
    },
    
    clearSelection: (state) => {
      state.selectedCampaignId = null;
      state.currentCampaign = null;
    },
    
    // Current campaign data
    setCampaign: (state, action: PayloadAction<Campaign>) => {
      state.currentCampaign = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    
    updateCampaignField: (state, action: PayloadAction<{ field: keyof Campaign; value: any }>) => {
      if (state.currentCampaign) {
        (state.currentCampaign as any)[action.payload.field] = action.payload.value;
        state.lastUpdated = new Date().toISOString();
      }
    },
    
    // Phase transition state
    startPhaseTransition: (state, action: PayloadAction<string>) => {
      state.isTransitioning = true;
      state.transitioningPhase = action.payload;
      state.transitionError = null;
    },
    
    completePhaseTransition: (state) => {
      state.isTransitioning = false;
      state.transitioningPhase = null;
      state.transitionError = null;
    },
    
    failPhaseTransition: (state, action: PayloadAction<string>) => {
      state.isTransitioning = false;
      state.transitioningPhase = null;
      state.transitionError = action.payload;
    },
    
    // Configuration state
    startConfiguration: (state, action: PayloadAction<string>) => {
      state.isConfiguring = true;
      state.configuringPhase = action.payload;
      state.configurationDirty = false;
    },
    
    markConfigurationDirty: (state) => {
      state.configurationDirty = true;
    },
    
    completeConfiguration: (state) => {
      state.isConfiguring = false;
      state.configuringPhase = null;
      state.configurationDirty = false;
      state.showPhaseConfiguration = false;
    },
    
    cancelConfiguration: (state) => {
      state.isConfiguring = false;
      state.configuringPhase = null;
      state.configurationDirty = false;
      state.showPhaseConfiguration = false;
    },
    
    // UI state
    showConfiguration: (state, action: PayloadAction<{ mode: 'panel' | 'dialog' }>) => {
      state.showPhaseConfiguration = true;
      state.configurationMode = action.payload.mode;
    },
    
    hideConfiguration: (state) => {
      state.showPhaseConfiguration = false;
    },
    
    // Real-time connection state
    setConnectionStatus: (state, action: PayloadAction<'connected' | 'disconnected' | 'reconnecting'>) => {
      state.connectionStatus = action.payload;
    },
    
    // Phase management actions
    setSelectedPhase: (state, action: PayloadAction<string>) => {
      state.selectedPhase = action.payload;
      state.phaseStatus = 'configuring';
    },
    
    updatePhaseConfiguration: (state, action: PayloadAction<Record<string, any>>) => {
      state.phaseConfiguration = { ...state.phaseConfiguration, ...action.payload };
      state.configurationDirty = true;
    },
    
    setPhaseStatus: (state, action: PayloadAction<'idle' | 'configuring' | 'executing' | 'completed' | 'error'>) => {
      state.phaseStatus = action.payload;
    },
    
    updateCampaignStatus: (state, action: PayloadAction<Partial<CampaignState['campaignStatus']>>) => {
      state.campaignStatus = { ...state.campaignStatus, ...action.payload };
    },
    
    addCompletedPhase: (state, action: PayloadAction<string>) => {
      if (!state.campaignStatus.completedPhases.includes(action.payload)) {
        state.campaignStatus.completedPhases.push(action.payload);
      }
    },
    
    clearPhaseConfiguration: (state) => {
      state.selectedPhase = null;
      state.phaseConfiguration = {};
      state.phaseStatus = 'idle';
    },
    
  // Reset all state
  resetCampaignState: (_state) => {
      return initialState;
    },
  },
});

export const {
  selectCampaign,
  clearSelection,
  setCampaign,
  updateCampaignField,
  startPhaseTransition,
  completePhaseTransition,
  failPhaseTransition,
  startConfiguration,
  markConfigurationDirty,
  completeConfiguration,
  cancelConfiguration,
  showConfiguration,
  hideConfiguration,
  setConnectionStatus,
  setSelectedPhase,
  updatePhaseConfiguration,
  setPhaseStatus,
  updateCampaignStatus,
  addCompletedPhase,
  clearPhaseConfiguration,
  resetCampaignState,
} = campaignSlice.actions;

export default campaignSlice.reducer;
