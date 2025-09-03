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
import { DEFAULT_DOMAIN_PAGE_SIZE } from '@/lib/constants';

// Local minimal domain shape based on bulk enriched-data response
type GeneratedDomainLite = Pick<DomainListItem, 'domain' | 'dnsStatus' | 'httpStatus' | 'leadStatus'> & Record<string, unknown>;

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
    limit = DEFAULT_DOMAIN_PAGE_SIZE,
    statusFilter = '',
    phaseFilter = '',
    enablePolling = true,
    pollingInterval = 10000 // 10 seconds
  } = options;

  const { toast: _toast } = useToast();
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
      const err = rtkError as unknown;
      let message = 'Failed to fetch domains';
      if (typeof err === 'string') message = err;
      else if (err && typeof err === 'object') {
        const e = err as { data?: { message?: string }; message?: string };
        message = e.data?.message || e.message || message;
      }
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

    // Helpers for status evaluation
    const isFailedStatus = (s?: unknown) => {
      if (!s || typeof s !== 'string') return false;
      const v = s.toLowerCase();
      return v === 'error' || v === 'failed' || v === 'timeout' || v === 'invalid' || v === 'unresolved';
    };
    const isOkStatus = (s?: unknown) => {
      if (!s || typeof s !== 'string') return false;
      const v = s.toLowerCase();
      return v === 'ok' || v === 'valid' || v === 'resolved' || v === 'validated' || v === 'success' || v === 'succeeded';
    };
    const isLeadMatched = (s?: unknown) => {
      if (!s || typeof s !== 'string') return false;
      const v = s.toLowerCase();
      return v === 'match' || v === 'matched';
    };

    // Build an accumulated view for counting across loaded pages
    const accumulated = offset > 0 ? [...domains, ...filtered] : filtered;

    // Calculate counts from accumulated data (best effort with paginated data)
    const failedCount = accumulated.reduce((acc, d) => {
      return acc + (isFailedStatus(d.dnsStatus) || isFailedStatus(d.httpStatus) || isFailedStatus(d.leadStatus) ? 1 : 0);
    }, 0);
    const dnsValidatedCount = accumulated.reduce((acc, d) => acc + (isOkStatus(d.dnsStatus) ? 1 : 0), 0);
    const httpValidatedCount = accumulated.reduce((acc, d) => acc + (isOkStatus(d.httpStatus) ? 1 : 0), 0);
    const leadsGeneratedCount = accumulated.reduce((acc, d) => acc + (isLeadMatched(d.leadStatus) ? 1 : 0), 0);

    // Minimal summary (domain list endpoint doesn't include phase details)
    const summary: DomainStatusSummary = {
      campaignId,
      summary: {
        total: pageTotal,
        generated: pageTotal,
        dnsValidated: dnsValidatedCount,
        httpValidated: httpValidatedCount,
        leadsGenerated: leadsGeneratedCount,
        failed: failedCount,
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
  const setFilters = useCallback((_filters: { status?: string; phase?: string }) => {
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
      const timer = pollingRef.current;
      if (timer) {
        clearInterval(timer);
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
      // Fetch a page of domains to approximate counts
      const res = await fetch(`${apiUrl}/api/v2/campaigns/${campaignId}/domains?limit=100&offset=0`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`Domains list failed: ${res.status}`);
      const json = await res.json();
      const total = json?.data?.total ?? 0;
      const items: GeneratedDomainLite[] = (json?.data?.items as GeneratedDomainLite[]) || [];

      // Compute approximate counts from the first page
      const isFailedStatus = (s?: unknown) => {
        if (!s || typeof s !== 'string') return false;
        const v = s.toLowerCase();
        return v === 'error' || v === 'failed' || v === 'timeout' || v === 'invalid' || v === 'unresolved';
      };
      const isOkStatus = (s?: unknown) => {
        if (!s || typeof s !== 'string') return false;
        const v = s.toLowerCase();
        return v === 'ok' || v === 'valid' || v === 'resolved' || v === 'validated' || v === 'success' || v === 'succeeded';
      };
      const isLeadMatched = (s?: unknown) => {
        if (!s || typeof s !== 'string') return false;
        const v = s.toLowerCase();
        return v === 'match' || v === 'matched';
      };

      const failedCount = items.reduce((acc, d) => acc + (isFailedStatus(d.dnsStatus) || isFailedStatus(d.httpStatus) || isFailedStatus(d.leadStatus) ? 1 : 0), 0);
      const dnsValidatedCount = items.reduce((acc, d) => acc + (isOkStatus(d.dnsStatus) ? 1 : 0), 0);
      const httpValidatedCount = items.reduce((acc, d) => acc + (isOkStatus(d.httpStatus) ? 1 : 0), 0);
      const leadsGeneratedCount = items.reduce((acc, d) => acc + (isLeadMatched(d.leadStatus) ? 1 : 0), 0);

      // Build status summary from the domains list
      const summary: DomainStatusSummary = {
        campaignId,
        summary: {
          total,
          generated: total,
          dnsValidated: dnsValidatedCount,
          httpValidated: httpValidatedCount,
          leadsGenerated: leadsGeneratedCount,
          failed: failedCount
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
