// Phase 3 Integration: Connect Redux to Backend State Machine
// This middleware bridges the Redux frontend with the backend state machine

import type { Middleware } from '@reduxjs/toolkit';
import { campaignApi } from '../api/campaignApi';
// Exec slice integration for explicit start API calls only (SSE handled in hook)
import { phaseStarted, phaseCompleted, phaseFailed } from '../slices/pipelineExecSlice';
import { 
  startPhaseTransition,
  completePhaseTransition,
  failPhaseTransition,
  setConnectionStatus
} from '../slices/campaignSlice';
import type { CampaignResponseCurrentPhaseEnum as CampaignCurrentPhaseEnum } from '@/lib/api-client/models';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';

// Middleware to handle campaign state synchronization
export const campaignStateSyncMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  // Handle successful phase transitions
  if (campaignApi.endpoints.startPhaseStandalone.matchFulfilled(action)) {
    const { meta } = action;
    const _campaignId = meta.arg.originalArgs.campaignId;
    // optimistic exec state start -> running handled earlier when initiating? we set here ensure started
    store.dispatch(phaseStarted({ campaignId: _campaignId, phase: meta.arg.originalArgs.phase as any }));
    // Refetch campaigns list to sync broader state
    store.dispatch(campaignApi.endpoints.getCampaignsStandalone.initiate() as any);
    store.dispatch(completePhaseTransition());
  }

  // Handle failed phase transitions
  if (campaignApi.endpoints.startPhaseStandalone.matchRejected(action)) {
    const error = action.error?.message || 'Phase transition failed';
    store.dispatch(failPhaseTransition(error));
  }

  // Handle campaign data updates (when campaigns list is refetched)
  if (campaignApi.endpoints.getCampaignsStandalone.matchFulfilled(action)) {
    // No-op; store reducers update via RTK Query cache selectors
  }

  return result;
};

// Helper function to initialize campaign state sync
export const initializeCampaignSync = (_campaignId: string) => (dispatch: any) => {
  // Set connection status
  dispatch(setConnectionStatus('connected'));
  
  // Fetch all campaigns (including the one we care about)
  dispatch(campaignApi.endpoints.getCampaignsStandalone.initiate() as any);
};
// Phase transition helper with proper Redux integration
export const performPhaseTransition = (campaignId: string, phase: string) => (dispatch: any) => {
  // Start transition in Redux
  dispatch(startPhaseTransition(phase));
  
  // Execute backend transition
  const apiPhase = normalizeToApiPhase(phase);
  return dispatch(campaignApi.endpoints.startPhaseStandalone.initiate({
    campaignId,
    phase: (apiPhase || phase) as CampaignCurrentPhaseEnum
  }) as any);
};
