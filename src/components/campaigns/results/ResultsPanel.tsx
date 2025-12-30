"use client";

/**
 * Phase 1: Results UI Skeleton (read-only)
 * 
 * Split layout:
 *   - Left: Domain list with keyboard navigation
 *   - Right: Score breakdown + rejection info panel
 * 
 * Consumes Phase 0 endpoints only:
 *   - GET /campaigns/{id}/domains
 *   - GET /campaigns/{id}/domains/{domain}/score-breakdown
 *   - GET /campaigns/{id}/rejection-summary
 * 
 * No inference, no client-side math.
 * Uses generated TS types exclusively.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useGetCampaignDomainsQuery,
  useGetCampaignDomainScoreBreakdownQuery,
  useGetCampaignRejectionSummaryQuery,
} from '@/store/api/campaignApi';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { DomainScoreBreakdownResponse } from '@/lib/api-client/models/domain-score-breakdown-response';
import type { RejectionSummaryResponse } from '@/lib/api-client/models/rejection-summary-response';
import type { ScoreComponent } from '@/lib/api-client/models/score-component';

// ============================================================================
// Types
// ============================================================================

interface ResultsPanelProps {
  campaignId: string;
  className?: string;
}

// ============================================================================
// Domain List Item
// ============================================================================

interface DomainListRowProps {
  domain: DomainListItem;
  isSelected: boolean;
  onSelect: (domain: DomainListItem) => void;
  tabIndex: number;
}

const DomainListRow: React.FC<DomainListRowProps> = ({
  domain,
  isSelected,
  onSelect,
  tabIndex,
}) => {
  const handleClick = useCallback(() => {
    onSelect(domain);
  }, [domain, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(domain);
      }
    },
    [domain, onSelect]
  );

  // Status badge color
  const getStatusColor = (status: string | undefined): string => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'error':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Rejection reason badge
  const getRejectionColor = (reason: string | undefined): string => {
    switch (reason) {
      case 'qualified':
        return 'bg-emerald-100 text-emerald-800';
      case 'low_score':
        return 'bg-orange-100 text-orange-800';
      case 'no_keywords':
        return 'bg-purple-100 text-purple-800';
      case 'parked':
        return 'bg-blue-100 text-blue-800';
      case 'dns_error':
      case 'http_error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors',
        'border-b border-gray-100 last:border-b-0',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
        isSelected
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : 'hover:bg-gray-50'
      )}
      data-testid={`domain-row-${domain.domain}`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm truncate" title={domain.domain}>
          {domain.domain ?? '—'}
        </p>
        <div className="flex gap-1 mt-1">
          {domain.dnsStatus && (
            <Badge variant="outline" className={cn('text-xs', getStatusColor(domain.dnsStatus))}>
              DNS: {domain.dnsStatus}
            </Badge>
          )}
          {domain.httpStatus && (
            <Badge variant="outline" className={cn('text-xs', getStatusColor(domain.httpStatus))}>
              HTTP: {domain.httpStatus}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 ml-2">
        {domain.domainScore !== undefined && (
          <span className="text-sm font-medium tabular-nums">
            {domain.domainScore}
          </span>
        )}
        {domain.rejectionReason && (
          <Badge variant="outline" className={cn('text-xs', getRejectionColor(domain.rejectionReason))}>
            {domain.rejectionReason}
          </Badge>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Score Component Display
// ============================================================================

interface ScoreComponentCardProps {
  name: string;
  component: ScoreComponent;
}

const ScoreComponentCard: React.FC<ScoreComponentCardProps> = ({ name, component }) => {
  const stateColor =
    component.state === 'ok'
      ? 'text-green-600'
      : component.state === 'unavailable'
      ? 'text-gray-400'
      : 'text-red-500';

  const valueDisplay =
    component.value !== undefined && component.value !== null
      ? (component.value * 100).toFixed(0)
      : '—';

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-medium tabular-nums', stateColor)}>
          {valueDisplay}
        </span>
        {component.state !== 'ok' && component.reason && (
          <span className="text-xs text-gray-400">({component.reason})</span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Score Breakdown Panel
// ============================================================================

interface ScoreBreakdownPanelProps {
  campaignId: string;
  selectedDomain: string | null;
}

const ScoreBreakdownPanel: React.FC<ScoreBreakdownPanelProps> = ({
  campaignId,
  selectedDomain,
}) => {
  const { data, isLoading, error } = useGetCampaignDomainScoreBreakdownQuery(
    { campaignId, domain: selectedDomain ?? '' },
    { skip: !selectedDomain }
  );

  if (!selectedDomain) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a domain to view its score breakdown
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Failed to load score breakdown</p>
        </CardContent>
      </Card>
    );
  }

  const breakdown: DomainScoreBreakdownResponse | undefined = data;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Score Breakdown</CardTitle>
          {breakdown?.state && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                breakdown.state === 'complete'
                  ? 'bg-green-100 text-green-800'
                  : breakdown.state === 'partial'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              )}
            >
              {breakdown.state}
            </Badge>
          )}
        </div>
        <p className="font-mono text-sm text-muted-foreground truncate">
          {breakdown?.domain}
        </p>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        {breakdown?.overallScore !== undefined && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <span className="text-2xl font-bold tabular-nums">
                {breakdown.overallScore}
              </span>
            </div>
          </div>
        )}

        {/* State reason if not complete */}
        {breakdown?.reason && (
          <p className="text-sm text-amber-600 mb-3">
            Note: {breakdown.reason.replace(/_/g, ' ')}
          </p>
        )}

        {/* Component Scores */}
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Components
          </h4>
          {breakdown?.components && (
            <>
              {breakdown.components.density && (
                <ScoreComponentCard name="density" component={breakdown.components.density} />
              )}
              {breakdown.components.coverage && (
                <ScoreComponentCard name="coverage" component={breakdown.components.coverage} />
              )}
              {breakdown.components.nonParked && (
                <ScoreComponentCard name="nonParked" component={breakdown.components.nonParked} />
              )}
              {breakdown.components.contentLength && (
                <ScoreComponentCard name="contentLength" component={breakdown.components.contentLength} />
              )}
            </>
          )}
        </div>

        {/* Evidence (if available) */}
        {breakdown?.evidence && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Evidence
            </h4>
            <div className="space-y-1 text-sm">
              {breakdown.evidence.keywordHits && breakdown.evidence.keywordHits.length > 0 && (
                <div className="flex justify-between">
                  <span>Keyword Hits</span>
                  <span className="tabular-nums">{breakdown.evidence.keywordHits.length}</span>
                </div>
              )}
              {breakdown.evidence.contentLengthBytes !== undefined && (
                <div className="flex justify-between">
                  <span>Content Length</span>
                  <span className="tabular-nums">{breakdown.evidence.contentLengthBytes} bytes</span>
                </div>
              )}
              {breakdown.evidence.parkedPenaltyApplied !== undefined && (
                <div className="flex justify-between">
                  <span>Parked Penalty</span>
                  <span className={breakdown.evidence.parkedPenaltyApplied ? 'text-red-600' : 'text-green-600'}>
                    {breakdown.evidence.parkedPenaltyApplied ? 'Applied' : 'No'}
                  </span>
                </div>
              )}
              {breakdown.evidence.parkedPenaltyFactor !== undefined && breakdown.evidence.parkedPenaltyFactor !== 1 && (
                <div className="flex justify-between">
                  <span>Penalty Factor</span>
                  <span className="tabular-nums">{breakdown.evidence.parkedPenaltyFactor}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Rejection Summary Panel
// ============================================================================

interface RejectionSummaryPanelProps {
  campaignId: string;
}

const RejectionSummaryPanel: React.FC<RejectionSummaryPanelProps> = ({ campaignId }) => {
  const { data, isLoading, error } = useGetCampaignRejectionSummaryQuery(campaignId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rejection Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rejection Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Failed to load rejection summary</p>
        </CardContent>
      </Card>
    );
  }

  const summary: RejectionSummaryResponse | undefined = data;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Rejection Summary</CardTitle>
          {summary?.balanced !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                summary.balanced
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              )}
            >
              {summary.balanced ? 'Balanced' : 'Imbalanced'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Totals */}
        {summary?.totals && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2 bg-gray-50 rounded text-center">
              <div className="text-lg font-bold tabular-nums">
                {summary.totals.analyzed ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Analyzed</div>
            </div>
            <div className="p-2 bg-emerald-50 rounded text-center">
              <div className="text-lg font-bold tabular-nums text-emerald-600">
                {summary.totals.qualified ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Qualified</div>
            </div>
            <div className="p-2 bg-red-50 rounded text-center">
              <div className="text-lg font-bold tabular-nums text-red-600">
                {summary.totals.rejected ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          </div>
        )}

        {/* Counts by reason */}
        {summary?.counts && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              By Reason
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Qualified</span>
                <span className="tabular-nums text-emerald-600">
                  {summary.counts.qualified}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Low Score</span>
                <span className="tabular-nums text-orange-600">
                  {summary.counts.lowScore}
                </span>
              </div>
              <div className="flex justify-between">
                <span>No Keywords</span>
                <span className="tabular-nums text-purple-600">
                  {summary.counts.noKeywords}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Parked</span>
                <span className="tabular-nums text-blue-600">
                  {summary.counts.parked}
                </span>
              </div>
              <div className="flex justify-between">
                <span>DNS Error</span>
                <span className="tabular-nums text-red-600">
                  {summary.counts.dnsError}
                </span>
              </div>
              <div className="flex justify-between">
                <span>HTTP Error</span>
                <span className="tabular-nums text-red-600">
                  {summary.counts.httpError}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Audit note if present */}
        {summary?.auditNote && (
          <p className="mt-3 text-xs text-amber-600">{summary.auditNote}</p>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Results Panel
// ============================================================================

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  campaignId,
  className,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch domains
  const { data: domainsResponse, isLoading: domainsLoading } = useGetCampaignDomainsQuery({
    campaignId,
    limit: 50,
    offset: 0,
  });

  const domains = useMemo<DomainListItem[]>(
    () => domainsResponse?.items ?? [],
    [domainsResponse?.items]
  );

  // Update selected domain when index changes
  useEffect(() => {
    if (domains.length > 0 && selectedIndex >= 0 && selectedIndex < domains.length) {
      const domain = domains[selectedIndex];
      setSelectedDomain(domain?.domain ?? null);
    }
  }, [domains, selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!domains.length) return;

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, domains.length - 1));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedIndex(domains.length - 1);
          break;
        case 'PageDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 10, domains.length - 1));
          break;
        case 'PageUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 10, 0));
          break;
      }
    },
    [domains.length]
  );

  // Handle domain selection
  const handleSelectDomain = useCallback(
    (domain: DomainListItem) => {
      const index = domains.findIndex((d) => d.domain === domain.domain);
      if (index >= 0) {
        setSelectedIndex(index);
        setSelectedDomain(domain.domain ?? null);
      }
    },
    [domains]
  );

  return (
    <div
      className={cn('flex gap-4 h-full', className)}
      data-testid="results-panel"
    >
      {/* Left: Domain List */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Domains</CardTitle>
              <span className="text-sm text-muted-foreground tabular-nums">
                {domains.length} loaded
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Use ↑↓ or j/k to navigate, Enter to select
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {domainsLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : domains.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No domains found
              </div>
            ) : (
              <div
                ref={listRef}
                role="listbox"
                aria-label="Domain list"
                aria-activedescendant={
                  selectedDomain ? `domain-row-${selectedDomain}` : undefined
                }
                tabIndex={0}
                onKeyDown={handleKeyDown}
                className="h-full overflow-y-auto focus:outline-none"
                data-testid="domain-list"
              >
                {domains.map((domain, index) => (
                  <DomainListRow
                    key={domain.id ?? domain.domain ?? index}
                    domain={domain}
                    isSelected={index === selectedIndex}
                    onSelect={handleSelectDomain}
                    tabIndex={-1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Score Breakdown + Rejection Summary */}
      <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
        <ScoreBreakdownPanel
          campaignId={campaignId}
          selectedDomain={selectedDomain}
        />
        <RejectionSummaryPanel campaignId={campaignId} />
      </div>
    </div>
  );
};

export default ResultsPanel;
