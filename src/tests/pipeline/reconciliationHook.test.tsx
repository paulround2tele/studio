import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePhaseReconciliation } from '@/lib/hooks/usePhaseReconciliation';
import { campaignApi } from '@/store/api/campaignApi';

jest.mock('@/lib/api/config', () => ({ apiConfiguration: {} }));

// We'll fake a store with minimal pipelineExec runtime and campaignApi util.invalidateTags spy.

describe('usePhaseReconciliation', () => {
  jest.useFakeTimers();
  const campaignId = 'cmp-rec';

  // Provide global fetch stub to silence warnings from any accidental fetch usage
  if (!(global as unknown).fetch) {
    (global as unknown).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  }

  function makeStore(runtime: unknown) {
    const pipelineExecReducer = (state = { byCampaign: { [campaignId]: runtime } }) => state;
    const uiReducer = (state = { byId: { [campaignId]: {} } }) => state;
    const spyInvalidate = jest.fn();
  (campaignApi.util as unknown).invalidateTags = (tags: unknown) => { spyInvalidate(tags); return { type: '__TEST__/INVALIDATE', payload: tags }; };
    const store = configureStore({ reducer: { pipelineExec: pipelineExecReducer, campaignUI: uiReducer, campaignApi: (s = {}) => s } });
    return { store, spyInvalidate };
  }

  it('invalidates running phase past staleness threshold', () => {
    const startedAt = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const runtime = { discovery: { status: 'running', startedAt } };
    const { store, spyInvalidate } = makeStore(runtime);
    renderHook(() => usePhaseReconciliation({ campaignId, intervalMs: 1000, staleThresholdMs: 1000 }), { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> });
    // Fast-forward time slightly beyond first interval (60s) to trigger check
    act(() => { jest.advanceTimersByTime(1500); });
    expect(spyInvalidate).toHaveBeenCalled();
  });
});
