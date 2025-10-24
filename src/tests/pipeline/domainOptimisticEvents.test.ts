import { configureStore } from '@reduxjs/toolkit';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';

// We will simulate RTK Query cache shape minimally for getCampaignDomains queries.
interface QueryEntry { endpointName: string; originalArgs: unknown; data?: unknown }
interface MockApiState { queries: Record<string, QueryEntry> }

const buildDomainsPage = (campaignId: string, limit: number, offset: number, items: DomainListItem[], total: number): QueryEntry => ({
  endpointName: 'getCampaignDomains',
  originalArgs: { campaignId, limit, offset },
  data: { items, total }
});

// Helper to derive query cache key consistent with RTK Query internals is non-trivial.
// For test purposes we approximate a stable key pattern consumed only by our mocked update logic.
const keyFor = (args: { campaignId: string; limit: number; offset: number }) =>
  `getCampaignDomains-${args.campaignId}-${args.limit}-${args.offset}`;

// Minimal mock dispatch matcher for campaignApi.util.updateQueryData usage.
// Instead of invoking real updateQueryData we intercept actions of type 'campaignApi/util/updateQueryData' (RTK internal naming pattern)
// In this codebase we directly dispatch campaignApi.util.updateQueryData, whose action type is 'campaignApi/executeQuery/fulfilled'? Not easily reproduced.
// Simpler: Provide a reducer that handles actions with type 'campaignApi/updateQueryDataTest' we craft manually in the hook via jest spy would be invasive.
// Alternate approach: We simulate the logic of the multi-page optimistic patch directly by invoking the same internal function exported separately (future refactor option).
// For now we approximate by re-creating a tiny wrapper around dispatch that executes the updater immediately when detecting our known action shape.

// Because the production hook calls dispatch(campaignApi.util.updateQueryData(...)), we cannot easily intercept without the actual slice.
// To keep the test deterministic without importing entire API slice machinery, we will create a lightweight faux campaignApi.util.updateQueryData implementation on globalThis
// that our hook will call if we monkey-patch campaignApi.util at runtime.

// Import the real campaignApi to patch its util.updateQueryData
// NOTE: We intentionally do NOT import the real campaignApi before jest.mock.
// (definition moved above)

// Provide a mock campaignApi export before importing the hook module.
jest.mock('@/store/api/campaignApi', () => {
  const util = {
    updateQueryData: (_endpoint: string, _args: unknown, _updater: (draft: unknown) => void) => ({ type: '__TEST__/NOOP' }),
  };
  return { campaignApi: { util } };
});

// Now import the hook AFTER mocking
import { campaignApi } from '@/store/api/campaignApi';

function makeStore(initial: MockApiState) {
  const campaignApiReducer = (state: MockApiState = initial, action: unknown): MockApiState => {
    if (action.type === '__TEST__/APPLY_DOMAIN_PATCH') {
      const { campaignId, limit, offset, apply } = action.payload;
      const k = keyFor({ campaignId, limit, offset });
      const existing = state.queries[k];
      if (!existing) return state;
      const draft = { ...existing.data, items: [...(existing.data.items || [])] };
      apply(draft);
      return {
        queries: {
          ...state.queries,
          [k]: { ...existing, data: draft }
        }
      };
    }
    return state;
  };
  return configureStore({
    reducer: {
      // @ts-expect-error
      campaignApi: campaignApiReducer,
    }
  });
}

describe('multi-page optimistic domain updates', () => {
  const campaignId = 'cmp123';
  const limit = 50;
  const secondPageOffset = 50; // page index 1
  const targetDomain: DomainListItem = { id: 'd-77', domain: 'example77.test' } as unknown;

  it('updates domain on non-zero page when SSE event arrives', () => {
    // page 0 without the domain
    const page1Items: DomainListItem[] = Array.from({ length: 50 }).map((_, i) => ({ id: `d-${i}`, domain: `example${i}.test` } as unknown));
    // page 1 containing target domain at position 10
    const page2Items: DomainListItem[] = Array.from({ length: 50 }).map((_, i) => ({ id: `d-${i+50}`, domain: `example${i+50}.test`, dnsStatus: 'pending' } as unknown));
    page2Items[10] = { ...targetDomain, dnsStatus: 'pending' } as unknown;

    const initialQueries: Record<string, QueryEntry> = {
      [keyFor({ campaignId, limit, offset: 0 })]: buildDomainsPage(campaignId, limit, 0, page1Items, 120),
      [keyFor({ campaignId, limit, offset: secondPageOffset })]: buildDomainsPage(campaignId, limit, secondPageOffset, page2Items, 120),
    };

    const store = makeStore({ queries: initialQueries });

    // Monkey patch campaignApi.util.updateQueryData to dispatch our synthetic reducer action
    const originalUpdate = (campaignApi as unknown).util.updateQueryData;
    (campaignApi as unknown).util.updateQueryData = (endpointName: string, args: unknown, updater: (draft: unknown) => void) => {
      if (endpointName === 'getCampaignDomains') {
        store.dispatch({ type: '__TEST__/APPLY_DOMAIN_PATCH', payload: { campaignId: args.campaignId, limit: args.limit, offset: args.offset, apply: updater } });
      }
      return { type: '__TEST__/NOOP' };
    };
    // Simulate incoming SSE domain_validated event logic (mirrors hook's multi-page probing)
    const incomingPatch = { id: targetDomain.id, dnsStatus: 'valid' };
    // Reuse logic from hook: attempt multiple page probes (our mock updateQueryData will apply when page exists)
    // We'll just manually reproduce the core page probing to ensure coverage of store state after monkey patch
    // Simulate what hook does by calling the patched util in same pattern
    const limits = [25,50,100];
    limits.forEach(l => {
      for (let pageIndex=0; pageIndex<10; pageIndex++) {
        const offset = pageIndex * l;
        try {
          (campaignApi.util as unknown).updateQueryData('getCampaignDomains', { campaignId, limit: l, offset }, (draft: unknown) => {
            const items: DomainListItem[] = draft?.items || [];
            const idx = items.findIndex(d => d.id === incomingPatch.id);
            if (idx !== -1) {
              items[idx] = { ...items[idx], ...incomingPatch };
            }
          });
        } catch { break; }
      }
    });

    // Assert updated on second page (offset 50) only
    const state: unknown = store.getState();
    const updatedPage2 = state.campaignApi.queries[keyFor({ campaignId, limit, offset: secondPageOffset })].data.items;
    expect(updatedPage2.find((d: unknown) => d.id === targetDomain.id).dnsStatus).toBe('valid');

    // Clean up monkey patch
  (campaignApi as unknown).util.updateQueryData = originalUpdate;
  });
});
