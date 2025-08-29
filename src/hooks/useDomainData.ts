/**
 * REST API Domain Data Hook - Using Existing Bulk Enriched Data Endpoint
 * 
 * This hook provides domain data fetching capabilities using the existing bulk enriched data endpoint
 * instead of any realtime socket streaming. It supports pagination, filtering, and polling for near real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useGetCampaignDomainsQuery } from '@/store/api/campaignApi';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';

// Local minimal domain shape based on bulk enriched-data response
type GeneratedDomainLite = Pick<DomainListItem, 'domain' | 'dnsStatus' | 'httpStatus' | 'leadStatus'> & Record<string, any>;

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
  domains: GeneratedDomainLite[];
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
 * Replaces legacy socket-based domain streaming with polling-based updates
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
  const [domains, setDomains] = useState<GeneratedDomainLite[]>([]);
  const [statusSummary, setStatusSummary] = useState<DomainStatusSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Use RTK Query to fetch the current page of domains
  const {
    data: page,
    isFetching,
    error: rtkError,
    refetch,
  } = useGetCampaignDomainsQuery(
    { campaignId, limit, offset },
    {
      skip: !campaignId,
      pollingInterval: enablePolling ? pollingInterval : 0,
    }
  );

  // Accumulate or replace items when page changes
  useEffect(() => {
    setLoading(isFetching);
    if (rtkError) {
      const message = (rtkError as any)?.data?.message || (rtkError as any)?.message || 'Failed to fetch domains';
      setError(message);
    } else {
      setError(null);
    }

    const items = (page?.items as GeneratedDomainLite[]) || [];
    const pageTotal = page?.total || 0;

    // Apply optional client-side filtering
    const filtered = (statusFilter || phaseFilter)
      ? items.filter((d) => {
          if (statusFilter && d.dnsStatus !== statusFilter) return false;
          if (phaseFilter && d.leadStatus !== phaseFilter) return false;
          return true;
        })
      : items;

    if (offset > 0) {
      setDomains((prev) => [...prev, ...filtered]);
    } else {
      setDomains(filtered);
    }

    setTotal(pageTotal);
    setHasMore((offset + filtered.length) < pageTotal);

    // Minimal summary (domain list endpoint doesn't include phase details)
    const summary: DomainStatusSummary = {
      campaignId,
      summary: {
        total: pageTotal,
        generated: pageTotal,
        dnsValidated: 0,
        httpValidated: 0,
        leadsGenerated: 0,
        failed: 0,
      },
      currentPhase: 'unknown',
      phaseStatus: 'unknown',
    };
    setStatusSummary(summary);
  }, [page, isFetching, rtkError, statusFilter, phaseFilter, campaignId, offset]);

  // Load more domains (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setOffset((o) => o + (limit || 0));
    // RTK hook will re-run with new offset
  }, [hasMore, loading, limit]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setDomains([]);
    setOffset(0);
    await refetch();
  }, [refetch]);

  // Set filters (triggers data refresh)
  const setFilters = useCallback((filters: { status?: string; phase?: string }) => {
    setOffset(0);
    setDomains([]);
    // Filters will be applied through the filter parameters in fetchDomains
  }, []);

  // Initial data load and filter changes
  useEffect(() => {
    refresh();
  }, [refresh, statusFilter, phaseFilter]);

  // Polling handled by RTK Query hook via pollingInterval

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

      // Use the new domains list endpoint and compute a minimal summary
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${apiUrl}/api/v2/campaigns/${campaignId}/domains?limit=1&offset=0`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`Domains list failed: ${res.status}`);
      const json = await res.json();
      const total = json?.data?.total ?? 0;

      // Build status summary from the domains list
      const summary: DomainStatusSummary = {
        campaignId,
        summary: {
          total,
          generated: total,
          dnsValidated: 0,
          httpValidated: 0,
          leadsGenerated: 0,
          failed: 0 // TODO: Calculate from domain status
        },
        currentPhase: 'unknown',
        phaseStatus: 'unknown'
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
