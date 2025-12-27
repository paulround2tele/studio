import React from 'react';
import { Loader2, AlertCircle, ChevronUp, ChevronDown, ChevronRight, Info, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { CampaignDomainsListResponseAggregatesLead } from '@/lib/api-client/models/campaign-domains-list-response-aggregates-lead';
import { DomainDetailDrawer } from './DomainDetailDrawer';
import { ExpandableDomainList } from './ExpandableDomainList';

const STATUS_ORDER = ['match', 'pending', 'noMatch', 'error', 'timeout'] as const;
type LeadStatusKey = typeof STATUS_ORDER[number];

type LeadCounts = Record<LeadStatusKey, number>;

const STATUS_LABELS: Record<LeadStatusKey, string> = {
  match: 'Matches',
  pending: 'Pending',
  noMatch: 'No Match',
  error: 'Errors',
  timeout: 'Timeouts'
};

const STATUS_STYLES: Record<LeadStatusKey, string> = {
  match: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  noMatch: 'bg-slate-50 text-slate-600 border-slate-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
  timeout: 'bg-orange-50 text-orange-700 border-orange-200'
};

const TABLE_ROW_LIMIT = 8;
const TABLE_ROW_INCREMENT = 6;

const defaultCounts: LeadCounts = {
  match: 0,
  pending: 0,
  noMatch: 0,
  error: 0,
  timeout: 0
};

function normalizeLeadStatus(status?: string | null): LeadStatusKey {
  const normalized = (status ?? '')
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

  switch (normalized) {
    case 'match':
    case 'matches':
      return 'match';
    case 'no_match':
    case 'no_matches':
    case 'none':
      return 'noMatch';
    case 'error':
      return 'error';
    case 'timeout':
      return 'timeout';
    case 'pending':
    default:
      return 'pending';
  }
}

function deriveCounts(domains: DomainListItem[], aggregates?: CampaignDomainsListResponseAggregatesLead): LeadCounts {
  const aggregated = domains.reduce((acc, domain) => {
    const key = normalizeLeadStatus(domain.leadStatus);
    acc[key] += 1;
    return acc;
  }, { ...defaultCounts });

  if (!aggregates) {
    return aggregated;
  }

  return {
    match: aggregates.match ?? aggregated.match,
    pending: aggregates.pending ?? aggregated.pending,
    noMatch: aggregates.noMatch ?? aggregated.noMatch,
    error: aggregates.error ?? aggregated.error,
    timeout: aggregates.timeout ?? aggregated.timeout
  };
}

function _formatRelativeTime(value?: string | null): string {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }
  return formatDistanceToNow(parsed, { addSuffix: true });
}

function getKeywordPreview(domain: DomainListItem): string | null {
  const keywords = domain.features?.keywords?.top3;
  if (!keywords || keywords.length === 0) return null;
  return keywords
    .filter((keyword): keyword is string => typeof keyword === 'string' && keyword.length > 0)
    .slice(0, 3)
    .join(', ');
}

function getRichnessScore(domain: DomainListItem): number {
  return domain.features?.richness?.score ?? 0;
}

function formatStatus(status?: string | null): string {
  if (!status) return 'Pending';
  const normalized = status.toLowerCase().replace(/[_-]+/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

interface LeadResultsPanelProps {
  domains?: DomainListItem[] | null;
  aggregates?: CampaignDomainsListResponseAggregatesLead;
  isLoading?: boolean;
  isUpdating?: boolean;
  error?: string | null;
  totalAvailable?: number;
  loadedCount?: number;
  canLoadMore?: boolean;
  onLoadMore?: () => void;
  /** Campaign ID required for score breakdown drawer */
  campaignId?: string;
}

type SortField = 'domainScore' | 'richness' | 'createdAt' | null;
type SortDir = 'asc' | 'desc';

export function LeadResultsPanel({
  domains = [],
  aggregates,
  isLoading = false,
  isUpdating = false,
  error,
  totalAvailable,
  loadedCount,
  canLoadMore = false,
  onLoadMore,
  campaignId,
}: LeadResultsPanelProps) {
  const domainList = React.useMemo(() => (Array.isArray(domains) ? domains : []), [domains]);
  const counts = React.useMemo(() => deriveCounts(domainList, aggregates), [domainList, aggregates]);
  const totalTracked = React.useMemo(() => STATUS_ORDER.reduce((sum, key) => sum + counts[key], 0), [counts]);
  const [rowLimit, setRowLimit] = React.useState(TABLE_ROW_LIMIT);
  const [sortField, setSortField] = React.useState<SortField>('domainScore');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');
  const [selectedDomain, setSelectedDomain] = React.useState<DomainListItem | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Note: activeFilter state is prepared for future quick-filter feature
  const [_activeFilter, _setActiveFilter] = React.useState<'all' | 'matches' | 'rejected' | 'no_keywords'>('all');

  const leadMatches = React.useMemo(
    () =>
      domainList.filter((domain) => normalizeLeadStatus(domain.leadStatus) === 'match'),
    [domainList]
  );

  // Rejected by scoring: has score but not a match (and not pending)
  const rejectedDomains = React.useMemo(
    () =>
      domainList.filter((domain) => {
        const status = normalizeLeadStatus(domain.leadStatus);
        return status === 'noMatch' && domain.domainScore !== undefined && domain.domainScore !== null;
      }),
    [domainList]
  );

  // No keywords found: HTTP OK but no keyword data
  const noKeywordDomains = React.useMemo(
    () =>
      domainList.filter((domain) => {
        const httpOk = (domain.httpStatus ?? '').toLowerCase() === 'ok';
        const hasKeywords = domain.features?.keywords?.top3?.some(k => k && k.length > 0);
        return httpOk && !hasKeywords;
      }),
    [domainList]
  );

  const validatedFallback = React.useMemo(
    () =>
      domainList.filter((domain) => {
        const status = normalizeLeadStatus(domain.leadStatus);
        if (status === 'match') return false;
        const httpOk = (domain.httpStatus ?? '').toLowerCase() === 'ok';
        const dnsOk = (domain.dnsStatus ?? '').toLowerCase() === 'ok';
        return httpOk || dnsOk;
      }),
    [domainList]
  );

  const prioritizedKey = leadMatches.length > 0 ? 'match' : 'validated';
  const prioritizedSource = leadMatches.length > 0 ? leadMatches : validatedFallback;

  // Apply sorting to prioritized source
  const sortedSource = React.useMemo(() => {
    if (!sortField) return prioritizedSource;

    return [...prioritizedSource].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case 'domainScore':
          aVal = a.domainScore ?? 0;
          bVal = b.domainScore ?? 0;
          break;
        case 'richness':
          aVal = getRichnessScore(a);
          bVal = getRichnessScore(b);
          break;
        case 'createdAt':
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      const diff = aVal - bVal;
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [prioritizedSource, sortField, sortDir]);

  React.useEffect(() => {
    setRowLimit(TABLE_ROW_LIMIT);
  }, [prioritizedKey, domainList.length]);

  const rows = React.useMemo(() => sortedSource.slice(0, rowLimit), [sortedSource, rowLimit]);

  const handleSort = React.useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }, [sortField]);

  const handleRowClick = React.useCallback((domain: DomainListItem) => {
    setSelectedDomain(domain);
    setDrawerOpen(true);
  }, []);

  const showingFallback = leadMatches.length === 0 && validatedFallback.length > 0;
  const hasAnyRows = rows.length > 0;
  const canShowMoreRows = prioritizedSource.length > rowLimit;
  const canCollapseRows = rowLimit > TABLE_ROW_LIMIT;
  const appliedLoadedCount = loadedCount ?? domainList.length;
  const totalKnown = typeof totalAvailable === 'number' && totalAvailable > 0 ? totalAvailable : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lead Results</h3>
          <p className="text-sm text-gray-500">Prioritized by enrichment confidence, richness, and keyword coverage.</p>
        </div>
        {isLoading && (
          <span className="inline-flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Updating...
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATUS_ORDER.map((key) => (
          <div
            key={key}
            className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {STATUS_LABELS[key]}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {counts[key].toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {showingFallback && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/10 dark:text-amber-200">
          Lead enrichment has not confirmed matches yet. Showing the most validated and keyword-aligned candidates so you can review next actions.
        </div>
      )}

      {!isLoading && !hasAnyRows && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700/60 dark:bg-gray-900/30 dark:text-gray-300">
          {totalTracked > 0
            ? 'Lead enrichment is still processing. Check back soon for confirmed matches or load additional rows below.'
            : 'Lead results will appear once analysis and enrichment complete. Configure targeting to unlock faster results.'}
        </div>
      )}

      {hasAnyRows && (
        <>
          {/* Prominent UX hint for discoverability */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Click any lead row</strong> to inspect score breakdown, keyword analysis, and qualification details.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th scope="col" className="py-2 pr-3 text-left font-medium">Domain</th>
                  <th 
                    scope="col" 
                    className="py-2 pr-3 text-left font-medium cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => handleSort('domainScore')}
                    role="columnheader"
                    aria-sort={sortField === 'domainScore' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-1">
                      Score
                      {sortField === 'domainScore' && (
                        sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                  <th scope="col" className="py-2 pr-3 text-left font-medium">Keywords</th>
                  <th scope="col" className="py-2 pr-3 text-left font-medium">Lead Status</th>
                  <th scope="col" className="py-2 pr-3 text-left font-medium">Validation</th>
                  <th scope="col" className="py-2 text-center font-medium w-16">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((domain) => {
                  const statusKey = normalizeLeadStatus(domain.leadStatus);
                  const keywords = getKeywordPreview(domain);
                  const domainScore = domain.domainScore;
                  const dnsStatus = formatStatus(domain.dnsStatus);
                  const httpStatus = formatStatus(domain.httpStatus);
                  const rowKey = domain.id || domain.domain || `${domain.offset ?? 'row'}`;

                  // Score color coding
                  const scoreColor = domainScore !== undefined && domainScore !== null
                    ? domainScore >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : domainScore >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500 dark:text-gray-400'
                    : 'text-gray-400 dark:text-gray-500';

                  return (
                    <tr 
                      key={rowKey} 
                      className="bg-white/60 transition hover:bg-blue-50 dark:bg-gray-900/20 dark:hover:bg-blue-900/20 cursor-pointer"
                      onClick={() => handleRowClick(domain)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRowClick(domain);
                        }
                      }}
                      aria-label={`View details for ${domain.domain ?? 'domain'}`}
                    >
                      <td className="py-3 pr-3 align-top">
                        <span className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">
                          {domain.domain ?? 'Unknown domain'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(domain);
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono text-sm font-semibold transition-colors',
                            'hover:bg-blue-100 dark:hover:bg-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                            scoreColor
                          )}
                          title="Click to view score breakdown"
                          aria-label={`View score breakdown for ${domain.domain ?? 'domain'}: ${domainScore !== undefined && domainScore !== null ? Math.round(domainScore) : 'Not scored'}`}
                        >
                          {domainScore !== undefined && domainScore !== null
                            ? Math.round(domainScore)
                            : '—'}
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </button>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        {keywords ? (
                          <span className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300" title={keywords}>
                            {keywords}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                            STATUS_STYLES[statusKey]
                          )}
                        >
                          {STATUS_LABELS[statusKey]}
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-top text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col gap-0.5">
                          <span>DNS: {dnsStatus}</span>
                          <span>HTTP: {httpStatus}</span>
                        </div>
                      </td>
                      <td className="py-3 align-top text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(domain);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-colors"
                          aria-label={`Inspect score details for ${domain.domain ?? 'domain'}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing {rows.length} of {sortedSource.length} {prioritizedKey === 'match' ? 'confirmed leads' : 'validated candidates'} ranked by {sortField === 'domainScore' ? 'score' : sortField ?? 'default'}.
              {totalKnown && totalKnown > sortedSource.length && (
                <span className="ml-1">Loaded {appliedLoadedCount.toLocaleString()} of {totalKnown.toLocaleString()} campaign domains.</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canShowMoreRows && (
                <button
                  type="button"
                  onClick={() => setRowLimit((prev) => Math.min(prev + TABLE_ROW_INCREMENT, sortedSource.length))}
                  className="inline-flex items-center rounded border border-blue-200 px-2 py-1 font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-900/30"
                >
                  Show more rows
                </button>
              )}
              {canCollapseRows && (
                <button
                  type="button"
                  onClick={() => setRowLimit(TABLE_ROW_LIMIT)}
                  className="inline-flex items-center rounded border border-gray-200 px-2 py-1 font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:border-gray-600/60 dark:text-gray-200 dark:hover:bg-gray-900/40"
                >
                  Collapse
                </button>
              )}
              {canLoadMore && onLoadMore && (
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isUpdating}
                  className="inline-flex items-center rounded border border-emerald-200 px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                >
                  {isUpdating ? 'Loading more…' : 'Load additional leads'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Expandable lists for rejected and no-keyword domains */}
      {(rejectedDomains.length > 0 || noKeywordDomains.length > 0) && (
        <div className="space-y-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Results</h4>
          </div>
          
          {rejectedDomains.length > 0 && (
            <ExpandableDomainList
              title="Rejected by Scoring"
              count={rejectedDomains.length}
              domains={rejectedDomains}
              category="rejected"
              onRowClick={handleRowClick}
            />
          )}

          {noKeywordDomains.length > 0 && (
            <ExpandableDomainList
              title="No Keywords Found"
              count={noKeywordDomains.length}
              domains={noKeywordDomains}
              category="no_keywords"
              onRowClick={handleRowClick}
            />
          )}
        </div>
      )}

      {/* Domain Detail Drawer */}
      <DomainDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        campaignId={campaignId ?? ''}
        domain={selectedDomain}
      />
    </div>
  );
}

export default LeadResultsPanel;
