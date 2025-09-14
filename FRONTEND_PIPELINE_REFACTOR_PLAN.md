# Frontend Pipeline Refactoring Plan

**Objective**: Modernize the frontend campaign pipeline by centralizing state management, eliminating redundant data fetching, improving real-time updates, and enforcing type safety. This will result in a more performant, maintainable, and reliable user experience.

**Guiding Principles**:
1.  **Single Source of Truth**: Data should flow from RTK Query caches, updated by API calls and real-time SSE events.
2.  **Centralized Logic**: A single orchestrator hook (`useCampaignPipeline`) should manage campaign state and operations.
3.  **Type Safety First**: Leverage generated OpenAPI types everywhere. No more `any` or manual JSON parsing.
4.  **Efficiency**: Eliminate redundant API calls and use optimistic updates for a snappy UI.

---

## ✅ Progress Checkpoints

- [x] **Phase 1**: Data Fetching & State Consolidation (Foundational orchestrator + export + mutations)
- [x] **Phase 2**: True Real-Time Integration & API Cleanup (Optimistic SSE progress + auth + mode mutation + multi-page domain optimistic updates)
- [~] **Phase 3**: Finalization & Deprecation (Tombstones in place; physical deletion deferred briefly)

---

## Phase 1: Consolidate Data Fetching & State (The Foundation)

*Goal: Eliminate redundant `fetch` calls and establish `useCampaignPipeline` as the new standard.*

### Step 1.1: Create the Central `useCampaignPipeline` Hook

This hook will be the new heart of the campaign UI. It won't fetch data itself but will orchestrate other hooks.

**Action**: Create `src/hooks/useCampaignPipeline.ts`.

```typescript
// src/hooks/useCampaignPipeline.ts
import { useMemo } from 'react';
import {
  useGetCampaignEnrichedQuery,
  useGetCampaignProgressStandaloneQuery,
  useExportCampaignDomainsMutation, // To be created
  useStartPhaseStandaloneMutation,
  useUpdateCampaignModeMutation, // To be created
} from '@/store/api/campaignApi';
import { useCampaignPhaseEvents } from './useCampaignPhaseEvents';
import { makeSelectNextUserAction } from '@/store/selectors/pipelineSelectors';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

/**
 * The primary orchestrator hook for the campaign pipeline UI.
 * Consolidates data, events, and actions into a single, unified interface.
 */
export const useCampaignPipeline = (campaignId: string) => {
  // 1. Subscribe to Core Data
  const { data: campaign, isLoading: isLoadingCampaign, error: campaignError } = useGetCampaignEnrichedQuery(campaignId, { skip: !campaignId });
  const { data: progress, isLoading: isLoadingProgress, error: progressError } = useGetCampaignProgressStandaloneQuery(campaignId, { skip: !campaignId, pollingInterval: 30000 }); // Poll as a fallback

  // 2. Subscribe to Real-Time Events
  useCampaignPhaseEvents(campaignId);

  // 3. Get Derived State
  const selectNextUserAction = useMemo(() => makeSelectNextUserAction(campaignId), [campaignId]);
  const nextAction = useSelector((state: RootState) => selectNextUserAction(state));

  // 4. Get Action Triggers (Mutations)
  const [startPhase, { isLoading: isStartingPhase }] = useStartPhaseStandaloneMutation();
  const [exportDomains, { isLoading: isExporting }] = useExportCampaignDomainsMutation();
  const [updateMode, { isLoading: isUpdatingMode }] = useUpdateCampaignModeMutation();


  // 5. Expose a Unified, Memoized Interface
  return useMemo(() => ({
    // Raw Data
    campaign,
    progress,

    // Derived State
    nextAction,
    isLoading: isLoadingCampaign || isLoadingProgress,
    error: campaignError || progressError,

    // Actions
    startPhase: (phase: string) => startPhase({ campaignId, phase }),
    toggleMode: () => updateMode({ campaignId, mode: campaign?.mode === 'auto' ? 'manual' : 'auto' }),
    downloadDomains: () => exportDomains(campaignId),

    // Action Status
    isStartingPhase,
    isExporting,
    isUpdatingMode,
  }), [
    campaign, progress, nextAction, isLoadingCampaign, isLoadingProgress, campaignError, progressError,
    startPhase, exportDomains, updateMode, isStartingPhase, isExporting, isUpdatingMode, campaignId
  ]);
};
```

### Step 1.2: Implement Proper Domain Export

**Action**: Add the `exportCampaignDomains` mutation to `src/store/api/campaignApi.ts`.

```typescript
// src/store/api/campaignApi.ts

// ... inside endpoints: (builder) => ({
    // ... existing endpoints

    exportCampaignDomains: builder.mutation<string, string>({
      queryFn: async (campaignId, { getState }) => {
        try {
          const api = new CampaignsApi(apiConfiguration);
          let allDomains: DomainListItem[] = [];
          let offset = 0;
          const limit = 1000; // Fetch in chunks of 1000
          let hasMore = true;

          while (hasMore) {
            const response = await api.campaignsDomainsList(campaignId, limit, offset);
            const data = extractResponseData<CampaignDomainsListResponse>(response);
            const items = data?.items || [];
            if (items.length > 0) {
              allDomains.push(...items);
              offset += items.length;
            }
            hasMore = allDomains.length < (data?.total || 0);
          }

          const domainsText = allDomains.map(d => d.domain).filter(Boolean).join('\n');
          return { data: domainsText };
        } catch (error: any) {
          return { error: error?.response?.data || error?.message };
        }
      },
    }),

// ...
```

### Step 1.3: Deprecate Legacy Hooks

**Action**: Mark old hooks for deprecation to prevent new usages.

1.  **`src/hooks/useDomainData.ts`**:
    *   Add `/** @deprecated Use useGetCampaignDomainsQuery directly for lists and useCampaignPipeline for progress. */` to the top of the file.
2.  **`src/hooks/useDomainStatusSummary.ts`**:
    *   Add `/** @deprecated Replaced by useCampaignPipeline, which provides authoritative progress data. */` to the top of the file.
3.  **`src/hooks/useCampaignOperations.ts`**:
    *   Add `/** @deprecated All operations are now exposed via the useCampaignPipeline hook. */` to the top of the file.

### Checkpoint: Phase 1 Complete
- [x] `useCampaignPipeline.ts` created and integrated.
- [x] `exportCampaignDomains` mutation added to `campaignApi.ts`.
- [x] Legacy hooks marked with `@deprecated` (now tombstoned in Phase 3 prep).
- [x] Manual replacement performed in domain table (legacy `useDomainData` removed from UI path).

---

## Phase 2: True Real-Time Integration & API Cleanup

*Goal: Make the UI instantly responsive to backend events and eliminate all remaining raw `fetch` calls.*

### Step 2.1: Enhance SSE for Optimistic Updates

**Action**: Modify `src/hooks/useCampaignPhaseEvents.ts` to dispatch optimistic updates.

```typescript
// src/hooks/useCampaignPhaseEvents.ts
// ... imports
import type { CampaignProgressResponse, DomainListItem } from '@/lib/api-client';

// ... inside useSSE callback
    (evt) => {
      if (!campaignId) return;
      // ...
      switch (type) {
        case 'campaign_progress': {
          const progressData = evt.data as CampaignProgressResponse;
          // Optimistically update the progress cache
          dispatch(
            campaignApi.util.updateQueryData('getCampaignProgressStandalone', campaignId, (draft) => {
              Object.assign(draft, progressData);
            })
          );
          // Also invalidate the enriched campaign query which contains some progress data
          dispatch(campaignApi.util.invalidateTags([{ type: 'Campaign', id: campaignId }]));
          break;
        }
        case 'domain_validated': {
          const domainData = evt.data as DomainListItem;
          // Optimistically update the specific domain in the domains list cache
          dispatch(
            campaignApi.util.updateQueryData('getCampaignDomains', { campaignId, limit: 100, offset: 0 }, (draft) => { // Note: This targets a specific page. More robust logic may be needed.
              const domainIndex = draft.items?.findIndex(d => d.id === domainData.id);
              if (draft.items && domainIndex !== -1) {
                draft.items[domainIndex] = { ...draft.items[domainIndex], ...domainData };
              }
            })
          );
          break;
        }
        // ... other cases
      }
    // ...
```

### Step 2.2: Create `authApi` and Refactor Auth Components

**Action**: Create `src/store/api/authApi.ts` and update the store.

```typescript
// src/store/api/authApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
// ... imports for auth requests/responses

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      // ... queryFn using AuthApi
    }),
    logout: builder.mutation<void, void>({
      // ... queryFn using AuthApi
    }),
    // ... other auth endpoints
  }),
});

export const { useLoginMutation, useLogoutMutation } = authApi;
```

**Action**: Update `src/store/index.ts` to include the new API slice.

**Action**: Refactor login/logout pages to use `useLoginMutation` and `useLogoutMutation`.

### Step 2.3: Add Campaign Mode Mutation

**Action**: Add `updateCampaignMode` to `campaignApi.ts` and refactor the toggle component.

```typescript
// src/store/api/campaignApi.ts
// ... inside endpoints: (builder) => ({
    updateCampaignMode: builder.mutation<CampaignResponse, { campaignId: string; mode: 'auto' | 'manual' }>({
      queryFn: async ({ campaignId, mode }) => {
        // ... call campaignsApi.campaignsUpdateMode(campaignId, { mode })
      },
      invalidatesTags: (result, error, { campaignId }) => [{ type: 'Campaign', id: campaignId }],
    }),
// ...
```

**Action**: Refactor `CampaignModeToggle.tsx` to use the `useUpdateCampaignModeMutation` hook, which is exposed via `useCampaignPipeline`.

### Checkpoint: Phase 2 Complete
- [x] `useCampaignPhaseEvents` performs optimistic updates for progress and domains (multi-page speculative patching added).
- [x] `authApi.ts` created & store integration complete (component refactor ongoing where applicable).
- [x] `updateCampaignMode` mutation exists, integrated, and toggle refactored.
- [ ] Manual SSE validation scenario (phase start/end) still recommended for QA.

---

## Phase 3: Finalization & Deprecation

*Goal: Clean up the codebase, remove all deprecated files, and ensure the new architecture is used consistently.*

### Step 3.1: Full-Scale Refactoring

**Action**: Globally search for any remaining usages of `useDomainData`, `useDomainStatusSummary`, and `useCampaignOperations`. Replace them all with `useCampaignPipeline` or direct RTK Query hooks.

### Step 3.2: Refactor Domain List Component

**Action**: The component responsible for rendering the domain list should now use the `useGetCampaignDomainsQuery` hook directly for its data and pagination logic. The `useCampaignPipeline` hook should *not* be concerned with domain list pagination.

### Step 3.3: Delete Deprecated Files (Tombstone Strategy Applied)

**Action**: Direct deletion was temporarily blocked in tooling; instead the following files were converted to throwing tombstone shims to surface any straggling imports:
- `src/hooks/useDomainData.ts` (now exports throwing shims only)
- `src/hooks/useCampaignOperations.ts` (now exports throwing shim)

`useDomainStatusSummary.ts` logic previously co-located inside the domain data file; no separate file remains. Physical deletion of tombstones is deferred one short release cycle once confirmed unused across branches.

### Step 3.4: Documentation & Final Review

**Action**:
- Add comprehensive JSDoc comments to `useCampaignPipeline.ts` explaining how to use it and what it provides.
- Review the application for any console errors or unexpected behavior.
- Ensure the UI feels faster and more responsive.

### Checkpoint: Phase 3 (Current Status)
- [x] All legacy hook usages in active codepaths replaced.
- [x] Deprecated files neutralized (tombstoned throwing shims).
- [x] `useCampaignPipeline` documented in source.
- [ ] Physical deletion of tombstone files (pending tool reliability or manual git removal).
- [ ] Manual end-to-end SSE validation pass.

### Post-Refactor Optional Enhancements
1. Replace speculative page probing in `useCampaignPhaseEvents` with introspection of cached queries (custom cache index or tag metadata) for efficiency.
2. Add integration tests simulating SSE domain events to assert multi-page optimistic patch works as intended.
3. Introduce a small utility to merge domain partial updates with type narrowing & status transition validation.
4. Lift repeated status classification helpers into a shared `domainStatus.ts` util (if still needed elsewhere).
5. After one release, delete tombstone shim files and enforce via lint rule forbidding their import.

### Added Test Coverage (Recent)
An integration-style unit test (`src/tests/pipeline/domainOptimisticEvents.test.ts`) was added to validate multi-page optimistic domain updates. It:
- Seeds two cached domain pages (offset 0 and 50).
- Simulates a `domain_validated` style cache patch across probed pages.
- Verifies only the target page item is updated.
This confirms the speculative multi-page patching logic functions for non-zero offsets.

This plan provides a clear, phased approach to refactoring the frontend. By completing it, we will significantly improve the quality and performance of the application.
