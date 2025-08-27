// Phase 3 Integration: Connect Redux to Backend State Machine
// This middleware bridges the Redux frontend with the backend state machine

import type { Middleware } from '@reduxjs/toolkit';
import { campaignApi } from '../api/campaignApi';
import { 
  setCampaign,
  startPhaseTransition,
  completePhaseTransition,
  failPhaseTransition,
  setConnectionStatus
} from '../slices/campaignSlice';
import type { RootState, AppDispatch } from '../index';
import type { CampaignCurrentPhaseEnum } from '@/lib/api-client/models';

// Middleware to handle campaign state synchronization
export const campaignStateSyncMiddleware: Middleware<{}, RootState, AppDispatch> = (store) => (next) => (action) => {
  const result = next(action);

  // Handle successful phase transitions
  if (campaignApi.endpoints.startPhaseStandalone.matchFulfilled(action)) {
    const { meta } = action;
    const campaignId = meta.arg.originalArgs.campaignId;
    
    // Auto-refetch campaign data to get updated state
    store.dispatch(campaignApi.endpoints.getCampaignsStandalone.initiate() as any);
    
    // Complete the transition in Redux
    store.dispatch(completePhaseTransition());
  }

  // Handle failed phase transitions
  if (campaignApi.endpoints.startPhaseStandalone.matchRejected(action)) {
    const error = action.error?.message || 'Phase transition failed';
    store.dispatch(failPhaseTransition(error));
  }

  // Handle campaign data updates (when campaigns list is refetched)
  if (campaignApi.endpoints.getCampaignsStandalone.matchFulfilled(action)) {
    // Campaigns list was updated - this middleware doesn't need to do anything specific
    // as the components will automatically receive the updated data
  }

  return result;
};

// Helper function to initialize campaign state sync
export const initializeCampaignSync = (campaignId: string) => (dispatch: AppDispatch) => {
  // Set connection status
  dispatch(setConnectionStatus('connected'));
  
  // Fetch all campaigns (including the one we care about)
  dispatch(campaignApi.endpoints.getCampaignsStandalone.initiate() as any);
};

// Phase transition helper with proper Redux integration
export const performPhaseTransition = (campaignId: string, phase: string) => (dispatch: AppDispatch) => {
  // Start transition in Redux
  dispatch(startPhaseTransition(phase));
  
  // Execute backend transition
  return dispatch(campaignApi.endpoints.startPhaseStandalone.initiate({
    campaignId,
    phase: phase as CampaignCurrentPhaseEnum
  }) as any);
};
