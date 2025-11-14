"use client";

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type { CampaignResponse as Campaign } from '@/lib/api-client/models';
import { ScrollArea } from '../ui/scroll-area';
import { StatusBadge, type DomainActivityStatus } from '@/components/shared/StatusBadge';
import type { DomainRow as DomainRowType, LifecycleState as _LifecycleState } from '@/types/domain';
import { LeadScoreDisplay } from '@/components/shared/LeadScoreDisplay';
import { Button } from '@/components/ui/button';
// Deprecated hook replaced with direct RTK Query usage
import { useGetCampaignDomainsQuery } from '@/store/api/campaignApi';
import { DEFAULT_DOMAIN_PAGE_SIZE } from '@/lib/constants';

interface DomainStreamingTableProps {
  campaign: Campaign;
  // Legacy props for backward compatibility - removed unused props
  generatedDomains?: Array<{ domainName?: string; dnsIp?: string; httpStatusCode?: string; httpTitle?: string; httpKeywords?: string; sourceKeyword?: string; generatedAt?: string }>;
  totalDomains?: number;
  loading?: boolean;
  filters?: Record<string, unknown>;
  onFiltersChange?: (filters: Record<string, unknown>) => void;
  onDownloadDomains?: (domains: string[], fileNamePrefix: string) => void;
  className?: string;
}

interface EnrichedDomain {
  domainName: string;
  dnsStatus: DomainActivityStatus;
  httpStatus: DomainActivityStatus;
  leadScanStatus: DomainActivityStatus;
  leadScore: number; // 0-100 range
  // Rich domain data from REST API
  dnsIp?: string;
  httpStatusCode?: string;
  httpTitle?: string;
  httpKeywords?: string;
  sourceKeyword?: string;
  sourcePattern?: string;
  tld?: string;
  generatedAt?: string;
}

const isDomainRow = (value: unknown): value is DomainRowType => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<DomainRowType>;
  const hasDomain = typeof candidate.domain === 'string' && candidate.domain.length > 0;
  const hasId = typeof candidate.id === 'string' && candidate.id.length > 0;
  return hasDomain || hasId;
};


// Convert backend status to frontend format - ROBUST STATUS CONVERSION
const convertStatus = (backendStatus?: string): DomainActivityStatus => {
  if (!backendStatus) return 'not_validated';
  const normalized = backendStatus.toLowerCase();
  
  switch (normalized) {
    case 'ok':
    case 'valid':
    case 'resolved':
    case 'validated':
    case 'succeeded':
      return 'validated';
    case 'error':
    case 'invalid':
    case 'unresolved':
    case 'failed':
    case 'timeout':
      return 'Failed';
    case 'pending':
    case 'processing':
    case 'queued':
      return 'Pending';
    case 'generating':
      return 'generating';
    case 'scanned':
      return 'scanned';
    case 'no_leads':
      return 'no_leads';
    case 'match':
      return 'validated'; // Lead found/keywords matched
    case 'no match':
    case 'no_match':
      return 'no_leads'; // No keywords found
    case 'n_a':
    case 'na':
    case '':
      return 'n_a';
    default:
      return 'not_validated';
  }
};

// Removed unused aggressive debug helpers and fallback getters to satisfy lint and rely solely on REST data


// Domain row component with robust rendering
const DomainRow = React.memo<{ domain: EnrichedDomain }>(function DomainRow({ domain }) {
  // Validate domain name before rendering
  const safedomainName = domain.domainName || 'Unknown Domain';
  
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div className="space-y-1">
          <a
            href={`https://${safedomainName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
          >
            {safedomainName}
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          {domain.dnsIp && (
            <div className="text-xs text-muted-foreground">
              IP: {domain.dnsIp}
            </div>
          )}
          {domain.sourceKeyword && (
            <div className="text-xs text-muted-foreground">
              Source: {domain.sourceKeyword}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={domain.dnsStatus} />
      </TableCell>
      <TableCell className="text-center">
        <div className="space-y-1">
          <StatusBadge status={domain.httpStatus} />
          {domain.httpStatusCode && (
            <div className="text-xs text-muted-foreground">
              {domain.httpStatusCode}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <StatusBadge status={domain.leadScanStatus} />
          {domain.httpTitle && (
            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={domain.httpTitle}>
              {domain.httpTitle}
            </div>
          )}
          {domain.httpKeywords && (
            <div className="text-xs text-blue-600 truncate max-w-[200px]" title={domain.httpKeywords}>
              Keywords: {domain.httpKeywords}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <LeadScoreDisplay score={domain.leadScore} />
      </TableCell>
    </TableRow>
  );
});
DomainRow.displayName = 'DomainRow';

/**
 * ARCHITECTURAL NOTE: DomainStreamingTable vs LatestActivityTable - POST-REFACTOR
 *
 * DomainStreamingTable (REST API + SSE):
 * - Single campaign focus with prop-based data from REST APIs
 * - Uses generatedDomains from bulk enriched data endpoints
 * - No socket dependencies - realtime via SSE where applicable; primarily REST driven
 * - Performance optimized with React.memo
 * - Domain data fetched via polling or on-demand API calls
 *
 * LatestActivityTable (SSE + REST):
 * - Multi-campaign dashboard with SSE for campaign progress only
 * - Complex getRichCampaignDataBatch integration
 * - SSE used only for campaign progress, not domain data
 * - Campaign phase-aware logic with REST API domain data fetching
 *
 * Both components now share identical:
 * - Status conversion logic (convertStatus function)
 * - StatusBadge rendering with score support
 * - Domain extraction patterns (defensive programming)
 * - React.memo performance optimization
 * - REST API domain data consumption patterns
 */
export default function DomainStreamingTable({
  campaign
}: DomainStreamingTableProps) {
  // REFACTORED: Use REST API hook; realtime handled via SSE elsewhere
  const campaignId = campaign.id || '';
  const [offset, setOffset] = React.useState(0);
  const limit = DEFAULT_DOMAIN_PAGE_SIZE;
  const {
    data: page,
    isFetching: loading,
    error: rtkError,
    refetch,
  } = useGetCampaignDomainsQuery({ campaignId, limit, offset }, { skip: !campaignId, pollingInterval: 10000 });

  const apiDomains = useMemo(() => {
    if (!Array.isArray(page?.items)) {
      return [] as DomainRowType[];
    }
    return page.items.filter(isDomainRow);
  }, [page]);
  const total = page?.total || 0;
  const hasMore = (offset + apiDomains.length) < total; // simplistic; single page accumulation
  const error = rtkError ? (typeof rtkError === 'object' && 'error' in rtkError ? rtkError.error as string : undefined) || 'Failed to load domains' : null;
  const loadMore = React.useCallback(() => {
    if (!hasMore || loading) return;
    setOffset(o => o + limit);
  }, [hasMore, loading, limit]);
  const refresh = React.useCallback(() => {
    setOffset(0);
    refetch();
  }, [refetch]);
  // Minimal synthetic status summary (retain structure expected by UI) - future: replace with backend summary endpoint
  const statusSummary = useMemo(() => {
    return {
      campaignId,
      summary: {
        total,
        generated: total,
        dnsValidated: apiDomains.filter((d) => ['ok','valid','resolved','validated','succeeded'].includes(String(d.dnsStatus || '').toLowerCase())).length,
        httpValidated: apiDomains.filter((d) => ['ok','valid','resolved','validated','succeeded'].includes(String(d.httpStatus || '').toLowerCase())).length,
        leadsGenerated: apiDomains.filter((d) => ['match','matched'].includes(String(d.leadStatus || '').toLowerCase())).length,
        failed: apiDomains.filter((d) => ['error','invalid','unresolved','failed','timeout'].includes(String(d.dnsStatus || '').toLowerCase()) || ['error','invalid','unresolved','failed','timeout'].includes(String(d.httpStatus || '').toLowerCase())).length,
      },
      currentPhase: 'unknown',
      phaseStatus: 'unknown'
    };
  }, [apiDomains, campaignId, total]);

  // Transform API domain data to enriched format
  const enrichedDomains: EnrichedDomain[] = useMemo(() => {
    if (!apiDomains || apiDomains.length === 0) {
      return [];
    }

    return apiDomains.map((domain) => {
      const extendedDomain = domain as DomainRowType & Record<string, unknown>;
      const dnsStatus = convertStatus(domain.dnsStatus) || 'not_validated';
      const httpStatus = convertStatus(domain.httpStatus) || 'not_validated';
      const leadStatus = convertStatus(domain.leadStatus) || 'not_validated';
      const leadScoreRaw = extendedDomain.leadScore;
      const leadScore = typeof leadScoreRaw === 'number'
        ? leadScoreRaw
        : typeof leadScoreRaw === 'string'
          ? parseFloat(leadScoreRaw) || 0
          : 0;

      return {
        domainName: typeof domain.domain === 'string'
          ? domain.domain
          : String(domain.domain ?? ''),
        dnsStatus,
        httpStatus,
        leadScanStatus: leadStatus,
        leadScore,
        dnsIp: typeof extendedDomain['dnsIp'] === 'string' ? (extendedDomain['dnsIp'] as string) : undefined,
        httpStatusCode: extendedDomain['httpStatusCode'] !== undefined ? String(extendedDomain['httpStatusCode']) : undefined,
        httpTitle: typeof extendedDomain['httpTitle'] === 'string' ? (extendedDomain['httpTitle'] as string) : undefined,
        httpKeywords: typeof extendedDomain['httpKeywords'] === 'string' ? (extendedDomain['httpKeywords'] as string) : undefined,
        sourceKeyword: typeof extendedDomain['sourceKeyword'] === 'string' ? (extendedDomain['sourceKeyword'] as string) : undefined,
        sourcePattern: typeof extendedDomain['sourcePattern'] === 'string' ? (extendedDomain['sourcePattern'] as string) : undefined,
        tld: typeof extendedDomain['tld'] === 'string' ? (extendedDomain['tld'] as string) : undefined,
        generatedAt: typeof extendedDomain['createdAt'] === 'string' ? (extendedDomain['createdAt'] as string) : undefined,
      };
    });
  }, [apiDomains]);

  if (loading && enrichedDomains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading domain data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error loading domain data: {error}</p>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (enrichedDomains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="mb-4">No domains found for this campaign</p>
        {statusSummary && (
          <div className="text-sm space-y-1">
            <p>Phase: {statusSummary.currentPhase}</p>
            <p>Status: {statusSummary.phaseStatus}</p>
          </div>
        )}
        <Button onClick={refresh} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Domain List</h3>
          {statusSummary && (
            <div className="text-sm text-muted-foreground">
              {statusSummary.summary.total} total domains
            </div>
          )}
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Domain & Details</TableHead>
              <TableHead className="text-center">DNS Status</TableHead>
              <TableHead className="text-center">HTTP Status</TableHead>
              <TableHead>Content & Keywords</TableHead>
              <TableHead className="text-center">Lead Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrichedDomains.map(domain => (
              <DomainRow key={domain.domainName} domain={domain} />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {enrichedDomains.length} of {total} domains
        </div>
        
        {hasMore && (
          <Button onClick={loadMore} variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        )}
      </div>

      {statusSummary && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Campaign Status</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Phase:</span> {statusSummary.currentPhase}
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span> {statusSummary.phaseStatus}
            </div>
            <div>
              <span className="text-muted-foreground">DNS Validated:</span> {statusSummary.summary.dnsValidated}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}