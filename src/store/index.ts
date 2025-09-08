import { configureStore } from '@reduxjs/toolkit';
import { campaignApi } from './api/campaignApi';
import { bulkOperationsApi } from './api/bulkOperationsApi';
import campaignSlice from './slices/campaignSlice';
import bulkOperationsSlice from './slices/bulkOperationsSlice';
import campaignUiSlice from './ui/campaignUiSlice';
import pipelineExecReducer from './slices/pipelineExecSlice';
import { campaignStateSyncMiddleware } from './middleware/campaignStateSyncMiddleware';

export const store = configureStore({
  reducer: {
    campaign: campaignSlice,
    bulkOperations: bulkOperationsSlice,
  campaignUI: campaignUiSlice,
  pipelineExec: pipelineExecReducer,
    // Add the generated reducers as specific top-level slices
    [campaignApi.reducerPath]: campaignApi.reducer,
    [bulkOperationsApi.reducerPath]: bulkOperationsApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
      },
    })
  .concat(campaignApi.middleware)
  .concat(bulkOperationsApi.middleware)
  .concat(campaignStateSyncMiddleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
