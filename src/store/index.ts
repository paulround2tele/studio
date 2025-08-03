import { configureStore } from '@reduxjs/toolkit';
import { campaignApi } from './api/campaignApi';
import campaignSlice from './slices/campaignSlice';
import { campaignStateSyncMiddleware } from './middleware/campaignStateSyncMiddleware';

export const store = configureStore({
  reducer: {
    campaign: campaignSlice,
    // Add the generated reducer as a specific top-level slice
    [campaignApi.reducerPath]: campaignApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
      },
    })
    .concat(campaignApi.middleware),
    // Note: campaignStateSyncMiddleware temporarily disabled due to circular dependency
    // TODO: Fix middleware integration in Phase 3 cleanup
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
