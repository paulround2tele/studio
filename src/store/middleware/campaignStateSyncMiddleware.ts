// Phase 3 Integration: Connect Redux to Backend State Machine
// This middleware bridges the Redux frontend with the backend state machine

import type { Middleware } from '@reduxjs/toolkit';
import { campaignApi } from '../api/campaignApi';
import { phaseStarted } from '../slices/pipelineExecSlice';
import { startPhaseTransition, completePhaseTransition, failPhaseTransition, setConnectionStatus } from '../slices/campaignSlice';
import { normalizeToApiPhase } from '@/lib/utils/phaseNames';
import type { AppDispatch } from '../index';

// Middleware to handle campaign state synchronization
export const campaignStateSyncMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action); // proceed action first to keep ordering predictable

  // Handle successful phase transitions
  if (campaignApi.endpoints.startPhaseStandalone.matchFulfilled(action)) {
  const { meta } = action as typeof action & { meta: { arg: { originalArgs: { campaignId: string; phase: string } } } };
    const campaignId = meta.arg.originalArgs.campaignId;
  const rawPhase = meta.arg.originalArgs.phase;
  const allowed: ReadonlyArray<string> = ['discovery','validation','enrichment','extraction','analysis'];
  const phase = (allowed.includes(rawPhase) ? rawPhase : normalizeToApiPhase(rawPhase) || 'discovery') as 'discovery' | 'validation' | 'enrichment' | 'extraction' | 'analysis';
  store.dispatch(phaseStarted({ campaignId, phase }));
    // Refetch campaigns list to sync broader state (no cast to any; dispatch returns a subscription handle)
  (store.dispatch as AppDispatch)(campaignApi.endpoints.getCampaignsStandalone.initiate());
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
export const initializeCampaignSync = (_campaignId: string) => (dispatch: AppDispatch) => {
  dispatch(setConnectionStatus('connected'));
  dispatch(campaignApi.endpoints.getCampaignsStandalone.initiate());
};
// Phase transition helper with proper Redux integration
export const performPhaseTransition = (campaignId: string, phase: string) => (dispatch: AppDispatch) => {
  dispatch(startPhaseTransition(phase));
  const apiPhase = normalizeToApiPhase(phase);
  return (dispatch as AppDispatch)(
    campaignApi.endpoints.startPhaseStandalone.initiate({
      campaignId,
  phase: apiPhase || phase,
    })
  );
};
