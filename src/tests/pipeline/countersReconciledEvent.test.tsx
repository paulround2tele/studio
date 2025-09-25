import React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { campaignApi } from '@/store/api/campaignApi';
import { useCampaignPhaseEvents } from '@/lib/hooks/useCampaignPhaseEvents';

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
// Mock api/config BEFORE campaignApi side effects try to construct real Configuration
jest.mock('@/lib/api/config', () => ({ apiConfiguration: {}, createApiConfiguration: () => ({}) }));
// Mock generic SSE hook to manually emit events
jest.mock('@/hooks/useSSE', () => ({
  useSSE: (_url: string | null, onEvent: (evt: any) => void) => {
    (global as any).__emit = onEvent; // expose emitter for test
    return { isConnected: true };
  }
}));

describe('useCampaignPhaseEvents counters_reconciled', () => {
  const campaignId = 'cmp-cr';

  function makeStore() {
    const pipelineExecReducer = (s = { byCampaign: { [campaignId]: {} }}) => s;
    const uiReducer = (s = { byId: { [campaignId]: {} }}) => s;
    // Spy invalidateTags
    const spyInvalidate = jest.fn();
    (campaignApi.util as any).invalidateTags = (tags: any) => { spyInvalidate(tags); return { type: '__TEST__/INVALIDATE', payload: tags }; };
    const store = configureStore({ reducer: { pipelineExec: pipelineExecReducer, campaignUI: uiReducer, campaignApi: (s = {}) => s } });
    return { store, spyInvalidate };
  }

  it('invalidates relevant tags when counters_reconciled event received', () => {
    const { store, spyInvalidate } = makeStore();
    renderHook(() => useCampaignPhaseEvents(campaignId), { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });
    const emit = (global as any).__emit as (e: any) => void;
    emit({ event: 'counters_reconciled', data: { campaign_id: campaignId, adjusted: true } });
    expect(spyInvalidate).toHaveBeenCalled();
    // Flatten calls to verify tags include domains & progress
    const allCalls = spyInvalidate.mock.calls.flat();
    const serialized = JSON.stringify(allCalls);
    expect(serialized).toMatch('CampaignProgress');
    expect(serialized).toMatch('CampaignDomains');
  });
});
