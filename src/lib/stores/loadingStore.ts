// src/lib/stores/loadingStore.ts
// Configuration-driven loading state management for DomainFlow
// NO HARDCODING - All loading operations configurable

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * Loading operation configuration
 * Allows customization of loading behavior per operation
 */
interface LoadingOperationConfig {
  timeout: number;
  showSpinner: boolean;
  showProgress: boolean;
  blockUI: boolean;
  description?: string;
}

interface PartialLoadingOperationConfig {
  timeout?: number;
  showSpinner?: boolean;
  showProgress?: boolean;
  blockUI?: boolean;
  description?: string;
}

/**
 * Default configurations for different operation types
 * Environment-configurable timeouts and behaviors
 */
const DEFAULT_OPERATION_CONFIGS: Record<string, LoadingOperationConfig> = {
  'auth.login': {
    timeout: parseInt(process.env.NEXT_PUBLIC_AUTH_TIMEOUT || '30000'),
    showSpinner: true,
    showProgress: false,
    blockUI: true,
    description: 'Signing in...',
  },
  'auth.logout': {
    timeout: parseInt(process.env.NEXT_PUBLIC_AUTH_TIMEOUT || '10000'),
    showSpinner: true,
    showProgress: false,
    blockUI: true,
    description: 'Signing out...',
  },
  'auth.session_check': {
    timeout: parseInt(process.env.NEXT_PUBLIC_AUTH_TIMEOUT || '15000'),
    showSpinner: false,
    showProgress: false,
    blockUI: false,
    description: 'Checking session...',
  },
  'campaign.create': {
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
    showSpinner: true,
    showProgress: true,
    blockUI: true,
    description: 'Creating campaign...',
  },
  'campaign.start': {
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '20000'),
    showSpinner: true,
    showProgress: false,
    blockUI: true,
    description: 'Starting campaign...',
  },
  'campaign.pause': {
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '15000'),
    showSpinner: true,
    showProgress: false,
    blockUI: true,
    description: 'Pausing campaign...',
  },
  'websocket.connect': {
    timeout: parseInt(process.env.NEXT_PUBLIC_WS_CONNECTION_TIMEOUT || '30000'),
    showSpinner: false,
    showProgress: false,
    blockUI: false,
    description: 'Connecting...',
  },
  'api.request': {
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
    showSpinner: true,
    showProgress: false,
    blockUI: false,
    description: 'Loading...',
  },
  'ui.navigation': {
    timeout: parseInt(process.env.NEXT_PUBLIC_NAVIGATION_TIMEOUT || '5000'),
    showSpinner: false,
    showProgress: false,
    blockUI: false,
    description: 'Navigating...',
  },
};

/**
 * Loading operation identifiers - configurable per environment
 */
export const LOADING_OPERATIONS = {
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  SESSION_CHECK: 'auth.session_check',
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_START: 'campaign.start',
  CAMPAIGN_PAUSE: 'campaign.pause',
  CAMPAIGN_RESUME: 'campaign.resume',
  CAMPAIGN_CANCEL: 'campaign.cancel',
  CAMPAIGN_DELETE: 'campaign.delete',
  WEBSOCKET_CONNECT: 'websocket.connect',
  API_REQUEST: 'api.request',
  UI_NAVIGATION: 'ui.navigation',
  DATA_FETCH: 'data.fetch',
  DATA_SAVE: 'data.save',
  FILE_UPLOAD: 'file.upload',
  EXPORT: 'data.export',
  IMPORT: 'data.import',
} as const;

export type LoadingOperation = typeof LOADING_OPERATIONS[keyof typeof LOADING_OPERATIONS] | string;

/**
 * Loading state for a specific operation
 */
interface LoadingState {
  operation: LoadingOperation;
  isLoading: boolean;
  startTime: number;
  description: string;
  progress?: number;
  error?: string;
  status: 'loading' | 'succeeded' | 'failed' | 'timeout';
  config: LoadingOperationConfig;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Global loading store state
 */
interface LoadingStoreState {
  // Active loading operations
  operations: Record<string, LoadingState>;
  
  // Global loading indicators
  isAnyLoading: boolean;
  isUIBlocked: boolean;
  
  // Configuration
  enableDebugMode: boolean;
  maxConcurrentOperations: number;
  
  // Statistics
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
}

/**
 * Loading store actions
 */
interface LoadingStoreActions {
  // Start/stop operations
  startLoading: (operation: LoadingOperation, description?: string, config?: PartialLoadingOperationConfig) => void;
  stopLoading: (operation: LoadingOperation, status?: 'succeeded' | 'failed', error?: string) => void;
  
  // Progress updates
  updateProgress: (operation: LoadingOperation, progress: number) => void;
  updateDescription: (operation: LoadingOperation, description: string) => void;
  
  // State queries
  isOperationLoading: (operation: LoadingOperation) => boolean;
  getOperationState: (operation: LoadingOperation) => LoadingState | null;
  getActiveOperations: () => LoadingState[];
  
  // Configuration
  updateOperationConfig: (operation: LoadingOperation, config: PartialLoadingOperationConfig) => void;
  setDebugMode: (enabled: boolean) => void;
  
  // Cleanup
  clearCompleted: () => void;
  clearAll: () => void;
  
  // Statistics
  getStatistics: () => { total: number; successful: number; failed: number; successRate: number };
}

type LoadingStore = LoadingStoreState & LoadingStoreActions;

/**
 * Create the loading store with Zustand
 */
export const useLoadingStore = create<LoadingStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    operations: {},
    isAnyLoading: false,
    isUIBlocked: false,
    enableDebugMode: process.env.NODE_ENV === 'development',
    maxConcurrentOperations: parseInt(process.env.NEXT_PUBLIC_MAX_CONCURRENT_OPERATIONS || '10'),
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,

    // Actions
    startLoading: (operation: LoadingOperation, description?: string, config?: PartialLoadingOperationConfig) => {
      const state = get();
      
      // Check if operation is already loading
      if (state.operations[operation]?.isLoading) {
        if (state.enableDebugMode) {
          logger.warn('LOADING_STORE', `Operation ${operation} is already loading`);
        }
        return;
      }

      // Check concurrent operation limit
      const activeCount = Object.values(state.operations).filter(op => op.isLoading).length;
      if (activeCount >= state.maxConcurrentOperations) {
        logger.warn('LOADING_STORE', `Maximum concurrent operations reached (${state.maxConcurrentOperations})`);
        return;
      }

      // Get operation configuration
      const defaultConfig = DEFAULT_OPERATION_CONFIGS[operation] || DEFAULT_OPERATION_CONFIGS['api.request'] || {
        timeout: 30000,
        showSpinner: true,
        showProgress: false,
        blockUI: false,
        description: 'Loading...',
      };
      const operationConfig: LoadingOperationConfig = {
        timeout: config?.timeout ?? defaultConfig.timeout,
        showSpinner: config?.showSpinner ?? defaultConfig.showSpinner,
        showProgress: config?.showProgress ?? defaultConfig.showProgress,
        blockUI: config?.blockUI ?? defaultConfig.blockUI,
        description: config?.description ?? defaultConfig.description,
      };
      
      // Create loading state
      const loadingState: LoadingState = {
        operation,
        isLoading: true,
        startTime: Date.now(),
        description: description || operationConfig.description || 'Loading...',
        status: 'loading',
        config: operationConfig,
      };

      // Set timeout if configured
      if (operationConfig.timeout && operationConfig.timeout > 0) {
        loadingState.timeoutId = setTimeout(() => {
          get().stopLoading(operation, 'failed', 'Operation timed out');
        }, operationConfig.timeout);
      }

      if (state.enableDebugMode) {
        logger.debug('LOADING_STORE', `Started loading: ${operation}`, {
          description: loadingState.description,
          timeout: operationConfig.timeout,
        });
      }

      // Update state
      set((state) => {
        const newOperations = { ...state.operations, [operation]: loadingState };
        const isAnyLoading = Object.values(newOperations).some(op => op.isLoading);
        const isUIBlocked = Object.values(newOperations).some(op => op.isLoading && op.config.blockUI);

        return {
          operations: newOperations,
          isAnyLoading,
          isUIBlocked,
          totalOperations: state.totalOperations + 1,
        };
      });
    },

    stopLoading: (operation: LoadingOperation, status: 'succeeded' | 'failed' = 'succeeded', error?: string) => {
      const state = get();
      const loadingState = state.operations[operation];

      if (!loadingState || !loadingState.isLoading) {
        if (state.enableDebugMode) {
          logger.warn('LOADING_STORE', `Attempted to stop non-loading operation: ${operation}`);
        }
        return;
      }

      // Clear timeout
      if (loadingState.timeoutId) {
        clearTimeout(loadingState.timeoutId);
      }

      const duration = Date.now() - loadingState.startTime;

      if (state.enableDebugMode) {
        logger.debug('LOADING_STORE', `Stopped loading: ${operation}`, {
          duration,
          status,
          error,
        });
      }

      // Update state
      set((state) => {
        const updatedState = {
          ...loadingState,
          isLoading: false,
          status,
          error,
        };

        const newOperations = { ...state.operations, [operation]: updatedState };
        const isAnyLoading = Object.values(newOperations).some(op => op.isLoading);
        const isUIBlocked = Object.values(newOperations).some(op => op.isLoading && op.config.blockUI);

        return {
          operations: newOperations,
          isAnyLoading,
          isUIBlocked,
          successfulOperations: status === 'succeeded' ? state.successfulOperations + 1 : state.successfulOperations,
          failedOperations: status === 'failed' ? state.failedOperations + 1 : state.failedOperations,
        };
      });
    },

    updateProgress: (operation: LoadingOperation, progress: number) => {
      const state = get();
      const loadingState = state.operations[operation];

      if (!loadingState || !loadingState.isLoading) {
        return;
      }

      set((state) => ({
        operations: {
          ...state.operations,
          [operation]: {
            ...loadingState,
            progress: Math.max(0, Math.min(100, progress)),
          },
        },
      }));
    },

    updateDescription: (operation: LoadingOperation, description: string) => {
      const state = get();
      const loadingState = state.operations[operation];

      if (!loadingState || !loadingState.isLoading) {
        return;
      }

      set((state) => ({
        operations: {
          ...state.operations,
          [operation]: {
            ...loadingState,
            description,
          },
        },
      }));
    },

    isOperationLoading: (operation: LoadingOperation): boolean => {
      const state = get();
      return state.operations[operation]?.isLoading || false;
    },

    getOperationState: (operation: LoadingOperation): LoadingState | null => {
      const state = get();
      return state.operations[operation] || null;
    },

    getActiveOperations: (): LoadingState[] => {
      const state = get();
      return Object.values(state.operations).filter(op => op.isLoading);
    },

    updateOperationConfig: (operation: LoadingOperation, config: PartialLoadingOperationConfig) => {
      const currentConfig = DEFAULT_OPERATION_CONFIGS[operation] || DEFAULT_OPERATION_CONFIGS['api.request'] || {
        timeout: 30000,
        showSpinner: true,
        showProgress: false,
        blockUI: false,
        description: 'Loading...',
      };
      const updatedConfig: LoadingOperationConfig = {
        timeout: config.timeout ?? currentConfig.timeout,
        showSpinner: config.showSpinner ?? currentConfig.showSpinner,
        showProgress: config.showProgress ?? currentConfig.showProgress,
        blockUI: config.blockUI ?? currentConfig.blockUI,
        description: config.description ?? currentConfig.description,
      };
      DEFAULT_OPERATION_CONFIGS[operation] = updatedConfig;
    },

    setDebugMode: (enabled: boolean) => {
      set({ enableDebugMode: enabled });
    },

    clearCompleted: () => {
      set((state) => {
        const activeOperations = Object.fromEntries(
          Object.entries(state.operations).filter(([_, op]) => op.isLoading)
        );

        return {
          operations: activeOperations,
        };
      });
    },

    clearAll: () => {
      const state = get();
      
      // Clear all timeouts
      Object.values(state.operations).forEach(op => {
        if (op.timeoutId) {
          clearTimeout(op.timeoutId);
        }
      });

      set({
        operations: {},
        isAnyLoading: false,
        isUIBlocked: false,
      });
    },

    getStatistics: () => {
      const state = get();
      const successRate = state.totalOperations > 0 
        ? (state.successfulOperations / state.totalOperations) * 100 
        : 0;

      return {
        total: state.totalOperations,
        successful: state.successfulOperations,
        failed: state.failedOperations,
        successRate: Math.round(successRate * 100) / 100,
      };
    },
  }))
);

// Subscribe to loading state changes for debugging
if (process.env.NODE_ENV === 'development') {
  useLoadingStore.subscribe(
    (state) => state.operations,
    (operations, previousOperations) => {
      const newOperations = Object.keys(operations).filter(
        key => !previousOperations[key] || (previousOperations[key] && operations[key] && previousOperations[key].status !== operations[key].status)
      );

      if (newOperations.length > 0) {
        logger.debug('LOADING_STORE', 'Operations changed', {
          activeCount: Object.values(operations).filter(op => op.isLoading).length,
          newOperations: newOperations.map(key => {
            const operation = operations[key];
            return operation ? {
              operation: key,
              status: operation.status,
              isLoading: operation.isLoading,
            } : null;
          }).filter(Boolean),
        });
      }
    }
  );
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useLoadingStore.getState().clearAll();
  });
}

// Export commonly used selectors
export const selectIsAnyLoading = (state: LoadingStore) => state.isAnyLoading;
export const selectIsUIBlocked = (state: LoadingStore) => state.isUIBlocked;
export const selectActiveOperations = (state: LoadingStore) => state.getActiveOperations();
export const selectOperationLoading = (operation: LoadingOperation) => (state: LoadingStore) => 
  state.isOperationLoading(operation);

// Export types
export type { LoadingOperationConfig, LoadingState, LoadingStore };
