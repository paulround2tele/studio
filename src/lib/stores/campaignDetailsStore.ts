// Campaign Details Store - Centralized state management for campaign details page
// Follows stateless frontend architecture with Golang backend as single source of truth

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  CampaignViewModel, 
  CampaignStatus, 
  GeneratedDomain, 
  CampaignValidationItem,
  DomainActivityStatus 
} from '@/lib/types';

// WebSocket message types aligned with backend contract
export interface StreamingMessage {
  type: string;
  timestamp: string;
  data: unknown;
  campaignId?: string;
  messageId?: string;
  sequenceNumber?: number;
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
  domain: GeneratedDomain | CampaignValidationItem;
  lastAccessed: number;
  isVisible: boolean;
}

// Campaign details store interface
export interface CampaignDetailsStore {
  // Campaign metadata (source of truth: backend)
  campaign: CampaignViewModel | null;
  campaignStatus: CampaignStatus | null;
  loading: boolean;
  error: string | null;
  
  // Domain data (source of truth: WebSocket + API)
  domains: Map<string, DomainCacheEntry>;
  generatedDomains: GeneratedDomain[];
  dnsCampaignItems: CampaignValidationItem[];
  httpCampaignItems: CampaignValidationItem[];
  totalDomainCount: number;
  
  // Real-time streaming state
  streamingStats: StreamingStats;
  
  // UI state (frontend-only)
  filters: TableFilters;
  pagination: PaginationState;
  selectedDomains: Set<string>;
  actionLoading: Record<string, boolean>;
  
  // Actions
  setCampaign: (campaign: CampaignViewModel | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateFromWebSocket: (message: StreamingMessage) => void;
  updateFromAPI: (data: { 
    generatedDomains?: GeneratedDomain[];
    dnsCampaignItems?: CampaignValidationItem[];
    httpCampaignItems?: CampaignValidationItem[];
  }) => void;
  updateFilters: (filters: Partial<TableFilters>) => void;
  updatePagination: (pagination: Partial<PaginationState>) => void;
  setActionLoading: (action: string, loading: boolean) => void;
  addDomain: (domain: GeneratedDomain) => void;
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
  sortOrder: 'asc',
};

const defaultPagination: PaginationState = {
  currentPage: 1,
  pageSize: 50,
  totalCount: 0,
};

const defaultStreamingStats: StreamingStats = {
  domainsPerSecond: 0,
  lastMessageTime: 0,
  connectionStatus: 'disconnected',
  messagesReceived: 0,
  lastSequenceNumber: 0,
  averageLatency: 0,
};

// Cache configuration
const CACHE_WINDOW_SIZE = 10000; // Maximum domains in memory
const CACHE_PRUNE_THRESHOLD = 12000; // When to trigger cache pruning
const CACHE_ACCESS_TIMEOUT = 300000; // 5 minutes

export const useCampaignDetailsStore = create<CampaignDetailsStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
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

    // Actions
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
        lastSequenceNumber: message.sequenceNumber || state.streamingStats.lastSequenceNumber,
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
          const newDomain: GeneratedDomain = {
            id: payload.domainId || `${payload.domain}-${Date.now()}`,
            generationCampaignId: payload.campaignId,
            domainName: payload.domain,
            offsetIndex: payload.offset,
            generatedAt: payload.generatedAt || new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          
          get().addDomain(newDomain);
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
          domains.set(domain.id, {
            domain,
            lastAccessed: Date.now(),
            isVisible: false,
          });
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
      if (domains.has(domain.id)) {
        return;
      }
      
      domains.set(domain.id, {
        domain,
        lastAccessed: Date.now(),
        isVisible: false,
      });
      
      const newGeneratedDomains = [domain, ...state.generatedDomains];
      
      set({
        domains,
        generatedDomains: newGeneratedDomains,
        totalDomainCount: newGeneratedDomains.length,
      });
      
      // Prune cache if necessary
      if (domains.size > CACHE_PRUNE_THRESHOLD) {
        get().pruneCache();
      }
    },

    updateStreamingStats: (stats) => set((state) => ({
      streamingStats: { ...state.streamingStats, ...stats }
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
        const domain = entry.domain as GeneratedDomain;
        
        // Search filter
        if (state.filters.searchTerm && 
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
        const domainA = a.domain as GeneratedDomain;
        const domainB = b.domain as GeneratedDomain;
        
        let comparison = 0;
        switch (state.filters.sortBy) {
          case 'domainName':
            comparison = domainA.domainName.localeCompare(domainB.domainName);
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
      actionLoading: {},
    }),
  }))
);

// Selector hooks for optimized subscriptions
export const useCampaignData = () => useCampaignDetailsStore(
  (state) => ({
    campaign: state.campaign,
    loading: state.loading,
    error: state.error,
  })
);

export const useDomainData = () => useCampaignDetailsStore(
  (state) => ({
    generatedDomains: state.generatedDomains,
    dnsCampaignItems: state.dnsCampaignItems,
    httpCampaignItems: state.httpCampaignItems,
    totalDomainCount: state.totalDomainCount,
  })
);

export const useStreamingStats = () => useCampaignDetailsStore(
  (state) => state.streamingStats
);

export const useTableState = () => useCampaignDetailsStore(
  (state) => ({
    filters: state.filters,
    pagination: state.pagination,
    selectedDomains: state.selectedDomains,
  })
);

export const useActionLoading = () => useCampaignDetailsStore(
  (state) => state.actionLoading
);