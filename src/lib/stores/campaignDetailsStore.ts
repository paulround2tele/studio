// Campaign Details Store - Centralized state management for campaign details page
// Follows stateless frontend architecture with Golang backend as single source of truth

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  CampaignViewModel,
  CampaignStatus,
  CampaignValidationItem,
  DomainActivityStatus
} from '@/lib/types';
import type { components } from '@/lib/api-client/types';
import { getDefaultPageSize } from '@/lib/types/pagination';

type GeneratedDomainBackend = components['schemas']['GeneratedDomain'];
type _Campaign = components['schemas']['Campaign']; // Unused

// WebSocket message types aligned with backend contract
export interface StreamingMessage {
type: string;
timestamp: string;
data: unknown;
  campaignId?: string;
  messageId?: string;
  sequenceNumber?: number;
  // DNS validation phase transition fields
  phase?: string;
  status?: string;
}

export interface DomainGenerationPayload {
campaignId: string;
domainId: string;
domain: string;
offset: number;
batchSize: number;
totalGenerated: number;
  generatedAt?: string;
  id?: string;
  offsetIndex?: number;
}

// Table filters and pagination state
export interface TableFilters {
searchTerm: string;
statusFilter: DomainActivityStatus | 'all';
sortBy: 'domainName' | 'generatedDate' | 'dnsStatus' | 'httpStatus';
sortOrder: 'asc' | 'desc';
}

export interface PaginationState {
currentPage: number;
pageSize: number;
totalCount: number;
}

// Streaming statistics for performance monitoring
export interface StreamingStats {
domainsPerSecond: number;
lastMessageTime: number;
connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
messagesReceived: number;
lastSequenceNumber: number;
averageLatency: number;
}

// Domain cache for memory-efficient management
export interface DomainCacheEntry {
domain: GeneratedDomainBackend | CampaignValidationItem;
lastAccessed: number;
isVisible: boolean;
}

// Campaign details store interface
export interface CampaignDetailsStore {
  // Campaign metadata (source of truth: backend),
campaign: CampaignViewModel | null;
campaignStatus: CampaignStatus | null;
loading: boolean;
error: string | null;
  
  // Domain data (source of truth: WebSocket + API),
domains: Map<string, DomainCacheEntry>;
generatedDomains: GeneratedDomainBackend[];
dnsCampaignItems: CampaignValidationItem[];
httpCampaignItems: CampaignValidationItem[];
totalDomainCount: number;
  
  // Real-time streaming state,
streamingStats: StreamingStats;
  
  // UI state (frontend-only),
filters: TableFilters;
pagination: PaginationState;
selectedDomains: Set<string>;
actionLoading: Record<string, boolean>;
  
  // Actions,
setCampaign: (campaign: CampaignViewModel | null) => void;
setLoading: (loading: boolean) => void;
setError: (error: string | null) => void;
updateFromWebSocket: (message: StreamingMessage) => void;
updateFromAPI: (data: { 
    generatedDomains?: GeneratedDomainBackend[];
    dnsCampaignItems?: CampaignValidationItem[];
    httpCampaignItems?: CampaignValidationItem[];
  }) => void;
updateFilters: (filters: Partial<TableFilters>) => void;
updatePagination: (pagination: Partial<PaginationState>) => void;
setActionLoading: (action: string, loading: boolean) => void;
addDomain: (domain: GeneratedDomainBackend) => void;
updateStreamingStats: (stats: Partial<StreamingStats>) => void;
selectDomain: (domainId: string, selected: boolean) => void;
clearSelectedDomains: () => void;
getDomainsBatch: (offset: number, limit: number) => DomainCacheEntry[];
pruneCache: () => void;
reset: () => void;
}

// Default states
const defaultFilters: TableFilters = {
searchTerm: '',
  statusFilter: 'all',
  sortBy: 'domainName',
  sortOrder: 'asc'
};

const defaultPagination: PaginationState = {
currentPage: 1,
  pageSize: getDefaultPageSize('detail'), // Use context-aware default for detail views
  totalCount: 0
};

const defaultStreamingStats: StreamingStats = {
domainsPerSecond: 0,
  lastMessageTime: 0,
  connectionStatus: 'disconnected',
  messagesReceived: 0,
  lastSequenceNumber: 0,
  averageLatency: 0
};

// Cache configuration
const CACHE_WINDOW_SIZE = 10000; // Maximum domains in memory
const CACHE_PRUNE_THRESHOLD = 12000; // When to trigger cache pruning
const CACHE_ACCESS_TIMEOUT = 300000; // 5 minutes

export const useCampaignDetailsStore = create<CampaignDetailsStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state,
campaign: null,
    campaignStatus: null,
    loading: false,
    error: null,
    domains: new Map(),
    generatedDomains: [],
    dnsCampaignItems: [],
    httpCampaignItems: [],
    totalDomainCount: 0,
    streamingStats: defaultStreamingStats,
    filters: defaultFilters,
    pagination: defaultPagination,
    selectedDomains: new Set(),
    actionLoading: {},

    // Actions,
setCampaign: (campaign) => set({ campaign, campaignStatus: campaign?.status || null }),
    
    setLoading: (loading) => set({ loading }),
    
    setError: (error) => set({ error }),

    updateFromWebSocket: (message) => {
      const state = get();
      
      // Update streaming stats
      const now = Date.now();
      const newStats: Partial<StreamingStats> = {
lastMessageTime: now,
        messagesReceived: state.streamingStats.messagesReceived + 1,
        lastSequenceNumber: message.sequenceNumber || state.streamingStats.lastSequenceNumber
};

      // Calculate domains per second
      if (state.streamingStats.lastMessageTime > 0) {
        const timeDiff = (now - state.streamingStats.lastMessageTime) / 1000;
        if (timeDiff > 0) {
          newStats.domainsPerSecond = 1 / timeDiff;
        }
      }

      set({
streamingStats: { ...state.streamingStats, ...newStats }
      });

      // Handle domain generation events
      if (message.type === 'domain_generated' && message.data) {
        const payload = message.data as DomainGenerationPayload;
        if (payload.domain) {
          const newDomain: GeneratedDomainBackend = {
id: payload.domainId || `${payload.domain}-${Date.now()}`,
            generationCampaignId: payload.campaignId,
            domainName: payload.domain,
            offsetIndex: payload.offset,
            generatedAt: payload.generatedAt || new Date().toISOString(),
            createdAt: new Date().toISOString()
};
          
          get().addDomain(newDomain);
        }
      }

      // Handle campaign status updates - PRESERVE domain data during transitions
      if (message.type === 'campaign_status' && message.data) {
        const payload = message.data as { campaignId: string; status: string };
        const state = get();
        if (state.campaign && payload.campaignId === state.campaign.id) {
          // 🔥 CRITICAL: Preserve existing domain data during status transitions
          set({
campaign: {
              ...state.campaign,
              status: payload.status as CampaignStatus
            }
            // IMPORTANT: Do NOT clear generatedDomains, dnsCampaignItems, or httpCampaignItems
          });
        }
      }

      // Handle phase completion updates - PRESERVE domain data during phase transitions
      if (message.type === 'phase_complete' && message.data) {
        const payload = message.data as {
campaignId: string;
phase: string;
status: string;
          progress?: number;
        };
        const state = get();
        if (state.campaign && payload.campaignId === state.campaign.id) {
          console.log('🔄 [Phase Transition] Phase completion update:', {
oldPhase: state.campaign.currentPhase,
            newPhase: payload.phase,
            status: payload.status,
            preservingDomains: {
generatedDomains: state.generatedDomains.length,
              dnsCampaignItems: state.dnsCampaignItems.length,
              httpCampaignItems: state.httpCampaignItems.length
            }
          });
          
          set({
campaign: {
              ...state.campaign,
              currentPhase: payload.phase  as any,
phaseStatus: payload.status  as any,
progress: payload.progress || 100,
              progressPercentage: payload.progress || 100, // CRITICAL: Update both progress fields,
processedItems: state.totalDomainCount, // Use WebSocket domain count as processed items,
status: payload.status === 'completed' ? 'completed' : state.campaign.status
            }
            // 🔥 CRITICAL: Domain data (generatedDomains, dnsCampaignItems, httpCampaignItems)
            // is intentionally NOT modified here to preserve domains during phase transitions
          });
        }
      }

      // Handle phase progress updates - ENHANCED for better real-time UX
      if (message.type === 'campaign_progress' && message.data) {
        const payload = message.data as {
          campaignId: string;
          progress?: number;
          progressPercentage?: number;
          totalItems?: number;
          processedItems?: number;
          successfulItems?: number;
          failedItems?: number;
        };
        const state = get();
        if (state.campaign && payload.campaignId === state.campaign.id) {
          // ENHANCED: Use all available progress data from WebSocket
          const progress = payload.progressPercentage || payload.progress || 0;
          const processedItems = payload.processedItems || Math.floor((progress / 100) * (state.campaign.totalItems || 0));
          
          // CRITICAL FIX: Phase and status are at message level, not data level
          const messagePhase = (message as any).phase;
          const messageStatus = (message as any).status;
          
          console.log(`🔧 [STORE_UPDATE] Processing campaign_progress message:`, {
            progress,
            processedItems,
            totalItems: payload.totalItems || state.campaign.totalItems,
            messagePhase,
            messageStatus,
            currentCampaignPhase: state.campaign.currentPhase,
            currentCampaignStatus: state.campaign.status
          });
          
          const updatedCampaign = {
            ...state.campaign,
            // ENHANCED: Update all progress-related fields for comprehensive real-time updates
            progress: progress,
            progressPercentage: progress,
            processedItems: processedItems,
            successfulItems: payload.successfulItems || state.campaign.successfulItems || 0,
            failedItems: payload.failedItems || state.campaign.failedItems || 0,
            totalItems: payload.totalItems || state.campaign.totalItems,
            // Update phase and status
            currentPhase: messagePhase ? messagePhase as any : state.campaign.currentPhase as any,
            phaseStatus: messageStatus ? messageStatus as any : state.campaign.phaseStatus as any,
            // CRITICAL: Update status during phase transitions
            status: messageStatus === 'running' ? 'running' :
                   messageStatus === 'completed' ? 'completed' :
                   messageStatus === 'failed' ? 'failed' :
                   messageStatus || state.campaign.status,
            // Update timestamp for freshness tracking
            updatedAt: new Date().toISOString()
          };
          
          console.log(`✅ [STORE_UPDATE] Real-time campaign state updated:`, {
            oldProgress: state.campaign.progressPercentage,
            newProgress: updatedCampaign.progressPercentage,
            oldProcessed: state.campaign.processedItems,
            newProcessed: updatedCampaign.processedItems,
            domainsCount: state.generatedDomains.length
          });
          
          // 🔥 CRITICAL: Atomic update preserving domain data
          set({
            campaign: updatedCampaign,
            // ENHANCED: Also update totalDomainCount if we have new processed items
            totalDomainCount: Math.max(state.totalDomainCount, processedItems)
          });
        }
      }

      // Handle validation progress updates (DNS, HTTP, etc.)
      if (message.type === 'validation_progress' && message.data) {
        const payload = message.data as {
campaignId: string;
progress: number;
validationsProcessed: number;
totalValidations: number;
validationType: string;
phase: string;
        };
        const state = get();
        if (state.campaign && payload.campaignId === state.campaign.id) {
          set({
campaign: {
              ...state.campaign,
              progress: payload.progress,
              progressPercentage: payload.progress,
              processedItems: payload.validationsProcessed,
              totalItems: payload.totalValidations,
              currentPhase: payload.phase  as any,
phaseStatus: 'in_progress'  as any,
status: 'running' as CampaignStatus
            }
          });
        }
      }

      // Handle DNS validation results with error handling
      if (message.type === 'dns_validation_result' && message.data) {
        const payload = message.data as {
campaignId: string;
          results?: any[];
          errors?: any[];
          offsetUpdates?: any[];
          status?: string;
          error?: string;
        };
        const state = get();
        if (state.campaign && payload.campaignId === state.campaign.id) {
          // Check for validation errors
          if (payload.error || (payload.errors && payload.errors.length > 0)) {
            const errorMessage = payload.error ||
              `DNS validation failed: ${payload.errors?.map(e => e.message || e).join(', ')}`;
            console.error('🔴 [Store] DNS validation error:', errorMessage);
            set({ error: errorMessage });
          }
          
          // Check for offset limit errors
          if (payload.errors && Array.isArray(payload.errors)) {
            const offsetError = payload.errors.find(e =>
              e.code === 'OFFSET_LIMIT_EXCEEDED' ||
              e.message?.includes('offset limit') ||
              e.message?.includes('maximum offset')
            );
            
            if (offsetError) {
              console.error('🚫 [Store] Offset limit exceeded:', offsetError);
              set({
error: `Domain generation stopped: ${offsetError.message || 'Maximum offset limit reached for this pattern'}`
              });
            }
          }
          
          // Update campaign status if provided
          if (payload.status) {
            set({
campaign: {
                ...state.campaign,
                status: payload.status === 'failed' ? 'failed' :
                       payload.status === 'completed' ? 'completed' :
                       state.campaign.status
              }
            });
          }
        }
      }

      // Handle HTTP validation results with error handling
      if (message.type === 'http_validation_result' && message.data) {
        const payload = message.data as {
campaignId: string;
          results?: any[];
          errors?: any[];
          status?: string;
          error?: string;
        };
        const state = get();
        if (state.campaign && payload.campaignId === state.campaign.id) {
          // Check for validation errors
          if (payload.error || (payload.errors && payload.errors.length > 0)) {
            const errorMessage = payload.error ||
              `HTTP validation failed: ${payload.errors?.map(e => e.message || e).join(', ')}`;
            console.error('🔴 [Store] HTTP validation error:', errorMessage);
            set({ error: errorMessage });
          }
          
          // Update campaign status if provided
          if (payload.status) {
            set({
campaign: {
                ...state.campaign,
                status: payload.status === 'failed' ? 'failed' :
                       payload.status === 'completed' ? 'completed' :
                       state.campaign.status
              }
            });
          }
        }
      }
    },

    updateFromAPI: (data) => {
      const updates: Partial<CampaignDetailsStore> = {};
      
      if (data.generatedDomains) {
        updates.generatedDomains = data.generatedDomains;
        // Update domain cache
        const domains = new Map(get().domains);
        data.generatedDomains.forEach(domain => {
          if (domain.id) {
            domains.set(domain.id, {
              domain,
              lastAccessed: Date.now(),
              isVisible: false
});
          }
        });
        updates.domains = domains;
        updates.totalDomainCount = data.generatedDomains.length;
      }
      
      if (data.dnsCampaignItems) {
        updates.dnsCampaignItems = data.dnsCampaignItems;
      }
      
      if (data.httpCampaignItems) {
        updates.httpCampaignItems = data.httpCampaignItems;
      }
      
      set(updates);
    },

    updateFilters: (filters) => set((state) => ({
filters: { ...state.filters, ...filters },
      pagination: { ...state.pagination, currentPage: 1 }, // Reset to first page
    })),

    updatePagination: (pagination) => set((state) => ({
pagination: { ...state.pagination, ...pagination }
    })),

    setActionLoading: (action, loading) => set((state) => ({
actionLoading: { ...state.actionLoading, [action]: loading }
    })),

    addDomain: (domain) => {
      const state = get();
      const domains = new Map(state.domains);
      
      // Check for duplicates
      if (!domain.id || domains.has(domain.id)) {
        return;
      }
      
      domains.set(domain.id, {
        domain,
        lastAccessed: Date.now(),
        isVisible: false
});
      
      const newGeneratedDomains = [domain, ...state.generatedDomains];
      
      set({
        domains,
        generatedDomains: newGeneratedDomains,
        totalDomainCount: newGeneratedDomains.length
});
      
      // Prune cache if necessary
      if (domains.size > CACHE_PRUNE_THRESHOLD) {
        get().pruneCache();
      }
    },

    updateStreamingStats: (stats) => set((state) => ({
      streamingStats: {
        ...state.streamingStats,
        ...stats,
        // Always update the last message time when stats are updated
        lastMessageTime: stats.lastMessageTime || state.streamingStats.lastMessageTime || Date.now()
      }
    })),

    selectDomain: (domainId, selected) => set((state) => {
      const newSelected = new Set(state.selectedDomains);
      if (selected) {
        newSelected.add(domainId);
      } else {
        newSelected.delete(domainId);
      }
      return { selectedDomains: newSelected };
    }),

    clearSelectedDomains: () => set({ selectedDomains: new Set() }),

    getDomainsBatch: (offset, limit) => {
      const state = get();
      const allDomains = Array.from(state.domains.values());
      
      // Apply filters
      const filteredDomains = allDomains.filter(entry => {
        const domain = entry.domain as GeneratedDomainBackend;
        
        // Search filter
        if (state.filters.searchTerm && domain.domainName &&
            !domain.domainName.toLowerCase().includes(state.filters.searchTerm.toLowerCase())) {
          return false;
        }
        
        // Status filter (simplified for generated domains)
        if (state.filters.statusFilter !== 'all') {
          // This would need more complex logic based on domain validation status
          return true;
        }
        
        return true;
      });
      
      // Apply sorting
      filteredDomains.sort((a, b) => {
        const domainA = a.domain as GeneratedDomainBackend;
        const domainB = b.domain as GeneratedDomainBackend;
        
        let comparison = 0;
        switch (state.filters.sortBy) {
          case 'domainName':
            comparison = (domainA.domainName || '').localeCompare(domainB.domainName || '');
            break;
          case 'generatedDate':
            comparison = new Date(domainA.generatedAt || '').getTime() - 
                        new Date(domainB.generatedAt || '').getTime();
            break;
default:
            comparison = 0;
        }
        
        return state.filters.sortOrder === 'desc' ? -comparison : comparison;
      });
      
      // Update access times for visible domains
      const batch = filteredDomains.slice(offset, offset + limit);
      batch.forEach(entry => {
        entry.lastAccessed = Date.now();
        entry.isVisible = true;
      });
      
      return batch;
    },

    pruneCache: () => {
      const state = get();
      const domains = new Map(state.domains);
      const now = Date.now();
      
      // Remove old, non-visible entries
      const domainEntries = Array.from(domains.entries());
      const toRemove = domainEntries
        .filter(([_, entry]) => 
          !entry.isVisible && 
          (now - entry.lastAccessed) > CACHE_ACCESS_TIMEOUT
        )
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
        .slice(0, domains.size - CACHE_WINDOW_SIZE);
      
      toRemove.forEach(([id]) => domains.delete(id));
      
      set({ domains });
    },

    reset: () => set({
campaign: null,
      campaignStatus: null,
      loading: false,
      error: null,
      domains: new Map(),
      generatedDomains: [],
      dnsCampaignItems: [],
      httpCampaignItems: [],
      totalDomainCount: 0,
      streamingStats: defaultStreamingStats,
      filters: defaultFilters,
      pagination: defaultPagination,
      selectedDomains: new Set(),
      actionLoading: {}
})
}))
);

// 🔧 CRITICAL FIX: Stable selector hooks to prevent object recreation
import { useMemo } from 'react';

export const useCampaignData = () => {
  const campaign = useCampaignDetailsStore(state => state.campaign);
  const loading = useCampaignDetailsStore(state => state.loading);
  const error = useCampaignDetailsStore(state => state.error);
  
  return useMemo(() => ({ campaign, loading, error }), [campaign, loading, error]);
};

export const useDomainData = () => {
  const generatedDomains = useCampaignDetailsStore(state => state.generatedDomains);
  const dnsCampaignItems = useCampaignDetailsStore(state => state.dnsCampaignItems);
  const httpCampaignItems = useCampaignDetailsStore(state => state.httpCampaignItems);
  const totalDomainCount = useCampaignDetailsStore(state => state.totalDomainCount);
  
  return useMemo(() => ({
    generatedDomains,
    dnsCampaignItems,
    httpCampaignItems,
    totalDomainCount
}), [generatedDomains, dnsCampaignItems, httpCampaignItems, totalDomainCount]);
};

export const useStreamingStats = () => useCampaignDetailsStore(
  (state) => state.streamingStats
);

export const useTableState = () => {
  const filters = useCampaignDetailsStore(state => state.filters);
  const pagination = useCampaignDetailsStore(state => state.pagination);
  const selectedDomains = useCampaignDetailsStore(state => state.selectedDomains);
  
  return useMemo(() => ({
    filters,
    pagination,
    selectedDomains
}), [filters, pagination, selectedDomains]);
};

export const useActionLoading = () => useCampaignDetailsStore(
  (state) => state.actionLoading
);

// 🔧 CRITICAL FIX: Stable store action references that don't recreate on every access
export const useCampaignDetailsActions = () => {
  const setCampaign = useCampaignDetailsStore(state => state.setCampaign);
  const setLoading = useCampaignDetailsStore(state => state.setLoading);
  const setError = useCampaignDetailsStore(state => state.setError);
  const updateFromAPI = useCampaignDetailsStore(state => state.updateFromAPI);
  const updateFilters = useCampaignDetailsStore(state => state.updateFilters);
  const updatePagination = useCampaignDetailsStore(state => state.updatePagination);
  const setActionLoading = useCampaignDetailsStore(state => state.setActionLoading);
  const updateFromWebSocket = useCampaignDetailsStore(state => state.updateFromWebSocket);
  const updateStreamingStats = useCampaignDetailsStore(state => state.updateStreamingStats);
  const reset = useCampaignDetailsStore(state => state.reset);

  return useMemo(() => ({
    setCampaign,
    setLoading,
    setError,
    updateFromAPI,
    updateFilters,
    updatePagination,
    setActionLoading,
    updateFromWebSocket,
    updateStreamingStats,
    reset
}), [setCampaign, setLoading, setError, updateFromAPI, updateFilters, updatePagination, setActionLoading, updateFromWebSocket, updateStreamingStats, reset]);
};