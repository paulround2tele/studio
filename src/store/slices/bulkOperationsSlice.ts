import { createSlice, PayloadAction } from '@reduxjs/toolkit';
// Removed unused type import to satisfy ESLint

// Bulk operation types matching our separated backend handlers
export type BulkOperationType = 
  | 'domain_generation'
  | 'dns_validation' 
  | 'http_validation'
  | 'analytics'
  | 'resource_allocation';

export type BulkOperationState = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Interface for tracking bulk operations in progress
// Canonical minimal summary fields observed from backend responses.
// (Do NOT add ad-hoc properties here; extend only after backend spec update.)
export interface BulkOperationResultSummary {
  processedCount?: number;
  domainsProcessed?: number;
  totalProcessed?: number;
}

// Normalized result container (kept lean – no loose index signatures).
// Union of backend bulk operation responses (subset for dashboard summarization)
export type BulkOperationBackendResponse = Record<string, unknown>;

export interface BulkOperationResult {
  data?: BulkOperationResultSummary;
  summary?: BulkOperationResultSummary;
  raw?: BulkOperationBackendResponse; // retain original structured response for future enrichment
}

export interface TrackedBulkOperation {
  id: string;
  type: BulkOperationType;
  status: BulkOperationState;
  progress?: number;
  startTime: string;
  endTime?: string;
  result?: BulkOperationResult; // Structured result (no arbitrary keys)
  error?: string;
  metadata?: {
    config?: unknown;
    startedBy?: string;
  };
}

// State interface for bulk operations management
export interface BulkOperationsState {
  // Active bulk operations being tracked
  activeOperations: Record<string, TrackedBulkOperation>;
  
  // Recently completed operations (last 50)
  recentOperations: TrackedBulkOperation[];
  
  // UI state for bulk operations dashboard
  selectedOperationId: string | null;
  showOperationDetails: boolean;
  detailsMode: 'panel' | 'dialog';
  
  // Filters and sorting
  filterByType: BulkOperationType | 'all';
  filterByStatus: BulkOperationState | 'all';
  sortBy: 'startTime' | 'endTime' | 'type' | 'status';
  sortOrder: 'asc' | 'desc';
  
  // Bulk operation configuration state
  isConfiguring: boolean;
  configuringType: BulkOperationType | null;
  configurationDirty: boolean;
  
  // Resource allocation tracking
  resourceLimits: {
    maxConcurrentOperations: number;
    maxDomainsPerOperation: number;
    maxMemoryPerOperation: number;
  };
  currentResourceUsage: {
    concurrentOperations: number;
    totalDomainsProcessing: number;
    memoryUsageMB: number;
  };
  
  // Performance metrics
  metrics: {
    totalOperationsToday: number;
    totalDomainsProcessed: number;
    averageOperationTime: number;
    successRate: number;
  };
  
  // Real-time updates state
  lastUpdated: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  autoRefreshEnabled: boolean;
  refreshInterval: number; // seconds
}

const initialState: BulkOperationsState = {
  activeOperations: {},
  recentOperations: [],
  selectedOperationId: null,
  showOperationDetails: false,
  detailsMode: 'panel',
  filterByType: 'all',
  filterByStatus: 'all',
  sortBy: 'startTime',
  sortOrder: 'desc',
  isConfiguring: false,
  configuringType: null,
  configurationDirty: false,
  resourceLimits: {
    maxConcurrentOperations: 5,
    maxDomainsPerOperation: 10000,
    maxMemoryPerOperation: 512
  },
  currentResourceUsage: {
    concurrentOperations: 0,
    totalDomainsProcessing: 0,
    memoryUsageMB: 0
  },
  metrics: {
    totalOperationsToday: 0,
    totalDomainsProcessed: 0,
    averageOperationTime: 0,
    successRate: 0
  },
  lastUpdated: null,
  connectionStatus: 'disconnected',
  autoRefreshEnabled: true,
  refreshInterval: 30
};

const bulkOperationsSlice = createSlice({
  name: 'bulkOperations',
  initialState,
  reducers: {
    // ================ OPERATION TRACKING ================
    // Start tracking a new bulk operation
    startTracking: (state, action: PayloadAction<{
      id: string;
      type: BulkOperationType;
      metadata?: { config?: unknown; startedBy?: string };
    }>) => {
      const { id, type, metadata } = action.payload;
      state.activeOperations[id] = {
        id,
        type,
        status: 'pending',
        startTime: new Date().toISOString(),
        metadata,
      };
      state.currentResourceUsage.concurrentOperations += 1;
    },

    // Update operation status and progress
    updateOperationStatus: (state, action: PayloadAction<{
      id: string;
      status: BulkOperationState;
      progress?: number;
      result?: BulkOperationBackendResponse;
      error?: string;
    }>) => {
      const { id, status, progress, result, error } = action.payload;
      const operation = state.activeOperations[id];
      
      if (operation) {
        operation.status = status;
        operation.progress = progress;
        if (result) {
          // Attempt lightweight normalization without unsafe casts
          const processedCount = typeof (result as Record<string, unknown>).processed === 'number'
            ? (result as Record<string, unknown>).processed as number
            : undefined;
          const domainsProcessed = typeof (result as Record<string, unknown>).domains === 'number'
            ? (result as Record<string, unknown>).domains as number
            : undefined;
          const totalProcessed = typeof (result as Record<string, unknown>).total === 'number'
            ? (result as Record<string, unknown>).total as number
            : undefined;
          operation.result = {
            raw: result,
            data: {
              processedCount,
              domainsProcessed,
              totalProcessed,
            },
            summary: undefined,
          };
        }
        operation.error = error;
        
        // Set end time for completed operations
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          operation.endTime = new Date().toISOString();
          
          // Move to recent operations and remove from active
          state.recentOperations.unshift(operation);
          if (state.recentOperations.length > 50) {
            state.recentOperations = state.recentOperations.slice(0, 50);
          }
          
          delete state.activeOperations[id];
          state.currentResourceUsage.concurrentOperations -= 1;
          
          // Update metrics
          if (status === 'completed') {
            // Try to extract processed count from result data
            const normalized = operation.result;
            const processedCountFields: Array<number | undefined> = [
              normalized?.data?.processedCount,
              normalized?.data?.totalProcessed,
              normalized?.data?.domainsProcessed,
              normalized?.summary?.processedCount,
              normalized?.summary?.totalProcessed,
              normalized?.summary?.domainsProcessed
            ];
            const processedCount = processedCountFields.find(v => typeof v === 'number') ?? 0;
            
            state.metrics.totalDomainsProcessed += processedCount;
            state.metrics.successRate = (state.metrics.successRate + 1) / 2; // Simple running average
          }
        }
      }
    },

    // Cancel an operation
    cancelOperation: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const operation = state.activeOperations[id];
      
      if (operation && operation.status !== 'completed' && operation.status !== 'failed') {
        operation.status = 'cancelled';
        operation.endTime = new Date().toISOString();
      }
    },

    // ================ UI STATE MANAGEMENT ================
    // Select operation for details view
    selectOperation: (state, action: PayloadAction<string | null>) => {
      state.selectedOperationId = action.payload;
    },

    // Toggle operation details panel/dialog
    toggleOperationDetails: (state, action: PayloadAction<boolean>) => {
      state.showOperationDetails = action.payload;
    },

    // Set details view mode
    setDetailsMode: (state, action: PayloadAction<'panel' | 'dialog'>) => {
      state.detailsMode = action.payload;
    },

    // Set filters
    setTypeFilter: (state, action: PayloadAction<BulkOperationType | 'all'>) => {
      state.filterByType = action.payload;
    },

    setStatusFilter: (state, action: PayloadAction<BulkOperationState | 'all'>) => {
      state.filterByStatus = action.payload;
    },

    // Set sorting
    setSorting: (state, action: PayloadAction<{
      sortBy: 'startTime' | 'endTime' | 'type' | 'status';
      sortOrder: 'asc' | 'desc';
    }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },

    // ================ CONFIGURATION STATE ================
    // Start configuring a bulk operation
    startConfiguring: (state, action: PayloadAction<BulkOperationType>) => {
      state.isConfiguring = true;
      state.configuringType = action.payload;
      state.configurationDirty = false;
    },

    // Mark configuration as dirty
    markConfigurationDirty: (state) => {
      state.configurationDirty = true;
    },

    // Finish configuration
    finishConfiguring: (state) => {
      state.isConfiguring = false;
      state.configuringType = null;
      state.configurationDirty = false;
    },

    // ================ RESOURCE MANAGEMENT ================
    // Update resource usage
    updateResourceUsage: (state, action: PayloadAction<{
      concurrentOperations?: number;
      totalDomainsProcessing?: number;
      memoryUsageMB?: number;
    }>) => {
      const { concurrentOperations, totalDomainsProcessing, memoryUsageMB } = action.payload;
      
      if (concurrentOperations !== undefined) {
        state.currentResourceUsage.concurrentOperations = concurrentOperations;
      }
      if (totalDomainsProcessing !== undefined) {
        state.currentResourceUsage.totalDomainsProcessing = totalDomainsProcessing;
      }
      if (memoryUsageMB !== undefined) {
        state.currentResourceUsage.memoryUsageMB = memoryUsageMB;
      }
    },

    // Update resource limits
    updateResourceLimits: (state, action: PayloadAction<Partial<BulkOperationsState['resourceLimits']>>) => {
      state.resourceLimits = { ...state.resourceLimits, ...action.payload };
    },

    // ================ METRICS AND STATUS ================
    // Update performance metrics
    updateMetrics: (state, action: PayloadAction<Partial<BulkOperationsState['metrics']>>) => {
      state.metrics = { ...state.metrics, ...action.payload };
    },

    // Update connection status
    updateConnectionStatus: (state, action: PayloadAction<'connected' | 'disconnected' | 'reconnecting'>) => {
      state.connectionStatus = action.payload;
      if (action.payload === 'connected') {
        state.lastUpdated = new Date().toISOString();
      }
    },

    // Toggle auto-refresh
    toggleAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefreshEnabled = action.payload;
    },

    // Set refresh interval
    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },

    // ================ BULK OPERATIONS ================
    // Clear completed operations
    clearCompletedOperations: (state) => {
      state.recentOperations = state.recentOperations.filter(
        op => op.status === 'running' || op.status === 'pending'
      );
    },

    // Clear all operation history
    clearAllHistory: (state) => {
      state.recentOperations = [];
      state.selectedOperationId = null;
    },

    // Reset metrics
    resetMetrics: (state) => {
      state.metrics = {
        totalOperationsToday: 0,
        totalDomainsProcessed: 0,
        averageOperationTime: 0,
        successRate: 0
      };
    }
  }
});

// Export actions
export const {
  startTracking,
  updateOperationStatus,
  cancelOperation,
  selectOperation,
  toggleOperationDetails,
  setDetailsMode,
  setTypeFilter,
  setStatusFilter,
  setSorting,
  startConfiguring,
  markConfigurationDirty,
  finishConfiguring,
  updateResourceUsage,
  updateResourceLimits,
  updateMetrics,
  updateConnectionStatus,
  toggleAutoRefresh,
  setRefreshInterval,
  clearCompletedOperations,
  clearAllHistory,
  resetMetrics
} = bulkOperationsSlice.actions;

// Selectors
export const selectActiveOperations = (state: { bulkOperations: BulkOperationsState }) => 
  state.bulkOperations.activeOperations;

export const selectRecentOperations = (state: { bulkOperations: BulkOperationsState }) => 
  state.bulkOperations.recentOperations;

export const selectSelectedOperation = (state: { bulkOperations: BulkOperationsState }) => {
  const { selectedOperationId, activeOperations, recentOperations } = state.bulkOperations;
  if (!selectedOperationId) return null;
  
  return activeOperations[selectedOperationId] || 
         recentOperations.find(op => op.id === selectedOperationId) || 
         null;
};

export const selectFilteredOperations = (state: { bulkOperations: BulkOperationsState }) => {
  const { recentOperations, filterByType, filterByStatus, sortBy, sortOrder } = state.bulkOperations;
  
  let filtered = [...recentOperations];
  
  // Apply filters
  if (filterByType !== 'all') {
    filtered = filtered.filter(op => op.type === filterByType);
  }
  
  if (filterByStatus !== 'all') {
    filtered = filtered.filter(op => op.status === filterByStatus);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'startTime':
        comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        break;
      case 'endTime':
        const aEnd = a.endTime || a.startTime;
        const bEnd = b.endTime || b.startTime;
        comparison = new Date(aEnd).getTime() - new Date(bEnd).getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return filtered;
};

export const selectResourceUsagePercentage = (state: { bulkOperations: BulkOperationsState }) => {
  const { resourceLimits, currentResourceUsage } = state.bulkOperations;
  
  return {
    concurrentOperations: (currentResourceUsage.concurrentOperations / resourceLimits.maxConcurrentOperations) * 100,
    memoryUsage: (currentResourceUsage.memoryUsageMB / resourceLimits.maxMemoryPerOperation) * 100,
  };
};

export const selectCanStartNewOperation = (state: { bulkOperations: BulkOperationsState }) => {
  const { resourceLimits, currentResourceUsage } = state.bulkOperations;
  
  return currentResourceUsage.concurrentOperations < resourceLimits.maxConcurrentOperations;
};

// Export reducer
export default bulkOperationsSlice.reducer;
