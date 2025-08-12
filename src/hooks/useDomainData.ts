/**
 * REST API Domain Data Hook - Using Existing Bulk Enriched Data Endpoint
 * 
 * This hook provides domain data fetching capabilities using the existing bulk enriched data endpoint
 * instead of WebSocket streaming. It supports pagination, filtering, and polling for real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { campaignsApi } from '@/lib/api-client/client';
import type { 
  BulkEnrichedDataRequest,
  EnrichedCampaignData,
  GeneratedDomain,
  BulkEnrichedDataResponse
} from '@/lib/api-client/models';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

// Professional type imports using proper model references

interface DomainStatusSummary {
  campaignId: string;
  summary: {
    total: number;
    generated: number;
    dnsValidated: number;
    httpValidated: number;
    leadsGenerated: number;
    failed: number;
  };
  currentPhase: string;
  phaseStatus: string;
}

// Hook options
interface UseDomainDataOptions {
  limit?: number;
  statusFilter?: string;
  phaseFilter?: string;
  enablePolling?: boolean;
  pollingInterval?: number;
}

// Hook return type
interface DomainDataResult {
  domains: GeneratedDomain[];
  statusSummary: DomainStatusSummary | null;
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: { status?: string; phase?: string }) => void;
}

/**
 * Hook for fetching domain data via REST APIs with pagination and filtering
 * Replaces WebSocket domain streaming with polling-based updates
 */
export function useDomainData(
  campaignId: string,
  options: UseDomainDataOptions = {}
): DomainDataResult {
  const {
    limit = 100,
    statusFilter = '',
    phaseFilter = '',
    enablePolling = true,
    pollingInterval = 10000 // 10 seconds
  } = options;

  const { toast } = useToast();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [domains, setDomains] = useState<GeneratedDomain[]>([]);
  const [statusSummary, setStatusSummary] = useState<DomainStatusSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch domain data using bulk enriched data endpoint
  const fetchDomains = useCallback(async (currentOffset: number = 0, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      // Use existing bulk enriched data endpoint
      const request: BulkEnrichedDataRequest = {
        campaignIds: [campaignId],
        limit: limit,
        offset: currentOffset
      };

      const response = await campaignsApi.getBulkEnrichedCampaignData(request);
      const apiResponse = extractResponseData(response) as BulkEnrichedDataResponse;
      
      if (!apiResponse || !apiResponse.campaigns) {
        throw new Error('Invalid response format from bulk enriched data endpoint');
      }

      const campaignData = apiResponse.campaigns[campaignId];
      
      if (!campaignData) {
        throw new Error(`No data found for campaign ${campaignId}`);
      }

      const domains = campaignData.domains || [];
      
      // Apply client-side filtering if needed
      let filteredDomains = domains;
      if (statusFilter || phaseFilter) {
        filteredDomains = domains.filter((domain: GeneratedDomain) => {
          // Filter by DNS status if statusFilter is provided
          if (statusFilter && domain.dnsStatus !== statusFilter) return false;
          // Filter by lead status if phaseFilter is provided 
          if (phaseFilter && domain.leadStatus !== phaseFilter) return false;
          return true;
        });
      }

      if (append) {
        setDomains(prev => [...prev, ...filteredDomains]);
      } else {
        setDomains(filteredDomains);
      }

      setTotal(filteredDomains.length);
      setOffset(currentOffset + filteredDomains.length);
      setHasMore(currentOffset + filteredDomains.length < filteredDomains.length);

      // Build status summary from the data
      const summary: DomainStatusSummary = {
        campaignId,
        summary: {
          total: domains.length,
          generated: domains.length,
          dnsValidated: campaignData.dnsValidatedDomains?.length || 0,
          httpValidated: campaignData.httpKeywordResults?.length || 0,
          leadsGenerated: campaignData.leads?.length || 0,
          failed: 0 // TODO: Calculate from domain status
        },
        currentPhase: campaignData.campaign?.currentPhase || 'unknown',
        phaseStatus: campaignData.campaign?.phaseStatus || 'unknown'
      };
      
      setStatusSummary(summary);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch domains';
      setError(errorMessage);
      console.error('[useDomainData] Error fetching domains:', err);
      
      toast({
        title: "Domain Data Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId, limit, statusFilter, phaseFilter, toast]);

  // Load more domains (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchDomains(offset, true);
  }, [fetchDomains, hasMore, loading, offset]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setOffset(0);
    await fetchDomains(0, false);
  }, [fetchDomains]);

  // Set filters (triggers data refresh)
  const setFilters = useCallback((filters: { status?: string; phase?: string }) => {
    setOffset(0);
    setDomains([]);
    // Filters will be applied through the filter parameters in fetchDomains
    fetchDomains(0, false);
  }, [fetchDomains]);

  // Initial data load and filter changes
  useEffect(() => {
    refresh();
  }, [refresh, statusFilter, phaseFilter]);

  // Polling for real-time updates
  useEffect(() => {
    if (!enablePolling || !campaignId) return;

    pollingRef.current = setInterval(async () => {
      try {
        // Refresh first page if user is at the top to get latest status
        if (offset === 0) {
          await fetchDomains(0, false);
        }
      } catch (err) {
        console.error('[useDomainData] Polling error:', err);
      }
    }, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enablePolling, campaignId, pollingInterval, fetchDomains, offset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    domains,
    statusSummary,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    setFilters
  };
}

/**
 * Simplified hook for just domain status summary (lightweight polling)
 */
export function useDomainStatusSummary(
  campaignId: string,
  enablePolling: boolean = true,
  pollingInterval: number = 15000
): {
  statusSummary: DomainStatusSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [statusSummary, setStatusSummary] = useState<DomainStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatusSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use existing bulk enriched data endpoint for status summary
      const request: BulkEnrichedDataRequest = {
        campaignIds: [campaignId],
        limit: 1, // We only need summary, not actual domains
        offset: 0
      };

      const response = await campaignsApi.getBulkEnrichedCampaignData(request);
      const apiResponse = extractResponseData(response) as BulkEnrichedDataResponse;
      
      if (!apiResponse || !apiResponse.campaigns) {
        throw new Error('Invalid response format from bulk enriched data endpoint');
      }

      const campaignData = apiResponse.campaigns[campaignId];
      
      if (!campaignData) {
        throw new Error(`No data found for campaign ${campaignId}`);
      }

      // Build status summary from the enriched data
      const summary: DomainStatusSummary = {
        campaignId,
        summary: {
          total: campaignData.domains?.length || 0,
          generated: campaignData.domains?.length || 0,
          dnsValidated: campaignData.dnsValidatedDomains?.length || 0,
          httpValidated: campaignData.httpKeywordResults?.length || 0,
          leadsGenerated: campaignData.leads?.length || 0,
          failed: 0 // TODO: Calculate from domain status
        },
        currentPhase: campaignData.campaign?.currentPhase || 'unknown',
        phaseStatus: campaignData.campaign?.phaseStatus || 'unknown'
      };
      
      setStatusSummary(summary);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch domain status';
      setError(errorMessage);
      console.error('[useDomainStatusSummary] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Initial load
  useEffect(() => {
    fetchStatusSummary();
  }, [fetchStatusSummary]);

  // Polling
  useEffect(() => {
    if (!enablePolling || !campaignId) return;

    pollingRef.current = setInterval(fetchStatusSummary, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enablePolling, campaignId, pollingInterval, fetchStatusSummary]);

  return {
    statusSummary,
    loading,
    error,
    refresh: fetchStatusSummary
  };
}
