import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { cn } from '@/lib/utils';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { CampaignDomainsListResponseAggregatesLead } from '@/lib/api-client/models/campaign-domains-list-response-aggregates-lead';

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

function formatRelativeTime(value?: string | null): string {
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
  error?: string | null;
}

export function LeadResultsPanel({
  domains = [],
  aggregates,
  isLoading = false,
  error
}: LeadResultsPanelProps) {
  const domainList = React.useMemo(() => (Array.isArray(domains) ? domains : []), [domains]);
  const counts = React.useMemo(() => deriveCounts(domainList, aggregates), [domainList, aggregates]);
  const totalTracked = React.useMemo(() => STATUS_ORDER.reduce((sum, key) => sum + counts[key], 0), [counts]);

  const leadMatches = React.useMemo(
    () =>
      domainList
        .filter((domain) => normalizeLeadStatus(domain.leadStatus) === 'match')
        .sort((a, b) => getRichnessScore(b) - getRichnessScore(a)),
    [domainList]
  );

  const validatedFallback = React.useMemo(
    () =>
      domainList
        .filter((domain) => {
          const status = normalizeLeadStatus(domain.leadStatus);
          if (status === 'match') return false;
          const httpOk = (domain.httpStatus ?? '').toLowerCase() === 'ok';
          const dnsOk = (domain.dnsStatus ?? '').toLowerCase() === 'ok';
          return httpOk || dnsOk;
        })
        .sort((a, b) => getRichnessScore(b) - getRichnessScore(a)),
    [domainList]
  );

  const rows = React.useMemo(() => {
    const source = leadMatches.length > 0 ? leadMatches : validatedFallback;
    return source.slice(0, TABLE_ROW_LIMIT);
  }, [leadMatches, validatedFallback]);

  const showingFallback = leadMatches.length === 0 && validatedFallback.length > 0;
  const hasAnyRows = rows.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lead Results</h3>
          <p className="text-sm text-gray-500">Latest domains surfaced by lead enrichment.</p>
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
          Lead enrichment has not confirmed matches yet. These domains are the most validated candidates to review next.
        </div>
      )}

      {!isLoading && !hasAnyRows && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700/60 dark:bg-gray-900/30 dark:text-gray-300">
          {totalTracked > 0
            ? 'Lead enrichment is still processing. Check back in a moment for confirmed results.'
            : 'Lead results will appear once the campaign finishes analysis and enrichment.'}
        </div>
      )}

      {hasAnyRows && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th scope="col" className="py-2 pr-3 text-left font-medium">Domain</th>
                <th scope="col" className="py-2 pr-3 text-left font-medium">Keywords</th>
                <th scope="col" className="py-2 pr-3 text-left font-medium">Validation</th>
                <th scope="col" className="py-2 pr-3 text-left font-medium">Lead Status</th>
                <th scope="col" className="py-2 text-left font-medium">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((domain) => {
                const statusKey = normalizeLeadStatus(domain.leadStatus);
                const keywords = getKeywordPreview(domain);
                const richness = getRichnessScore(domain);
                const dnsStatus = formatStatus(domain.dnsStatus);
                const httpStatus = formatStatus(domain.httpStatus);
                const lastSeen = domain.createdAt;
                const rowKey = domain.id || domain.domain || `${domain.offset ?? 'row'}`;

                return (
                  <tr key={rowKey} className="bg-white/60 transition hover:bg-gray-50 dark:bg-gray-900/20 dark:hover:bg-gray-900/40">
                    <td className="py-3 pr-3 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {domain.domain ?? 'Unknown domain'}
                        </span>
                        {richness > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Richness score: {richness.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3 align-top">
                      {keywords ? (
                        <span className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300" title={keywords}>
                          {keywords}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">No keywords detected</span>
                      )}
                    </td>
                    <td className="py-3 pr-3 align-top text-sm text-gray-600 dark:text-gray-300">
                      <div className="space-y-1">
                        <span>DNS: {dnsStatus}</span>
                        <span>HTTP: {httpStatus}</span>
                      </div>
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
                    <td className="py-3 align-top text-sm text-gray-600 dark:text-gray-300">
                      {formatRelativeTime(lastSeen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasAnyRows && leadMatches.length > TABLE_ROW_LIMIT && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Showing top {TABLE_ROW_LIMIT} of {leadMatches.length.toLocaleString()} confirmed leads.
        </div>
      )}

      {hasAnyRows && leadMatches.length === 0 && validatedFallback.length > TABLE_ROW_LIMIT && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Showing top {TABLE_ROW_LIMIT} validated domains while leads are pending.
        </div>
      )}
    </div>
  );
}

export default LeadResultsPanel;
