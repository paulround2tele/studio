// DEPRECATED: Legacy StateManager - DO NOT USE
// This file exists only for migration purposes and will be removed
// Use Redux Toolkit store instead: /src/store/

/**
 * @deprecated This StateManager is being phased out in favor of Redux Toolkit
 * Use the Redux store at /src/store/ for all new development
 * 
 * Migration Guide:
 * - Campaign state → useAppSelector/useAppDispatch with campaignSlice  
 * - API calls → RTK Query campaignApi hooks
 * - Real-time updates → Server-Sent Events (planned)
 * 
 * DO NOT ADD NEW FEATURES TO THIS FILE
 * DO NOT IMPORT THIS FILE IN NEW CODE
 */

console.warn('StateManager is deprecated - use Redux store instead');

// Legacy compatibility exports that will force migration
export const stateManager = {
  applyOptimisticUpdate: () => {
    throw new Error('StateManager deprecated - use Redux store instead');
  },
  confirmOptimisticUpdate: () => {
    throw new Error('StateManager deprecated - use Redux store instead');
  },
  rollbackOptimisticUpdate: () => {
    throw new Error('StateManager deprecated - use Redux store instead');
  },
};

export const useStateManager = () => {
  throw new Error('useStateManager deprecated - use Redux hooks instead');
};
