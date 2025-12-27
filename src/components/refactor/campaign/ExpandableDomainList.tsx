/**
 * ExpandableDomainList Component (P0)
 * 
 * Displays collapsed/expandable lists for:
 * - Domains rejected by scoring
 * - Domains with no keywords found
 * 
 * Features:
 * - Default collapsed
 * - Rows clickable (open drawer)
 * - Server-side pagination support
 * - Virtualization for large result sets
 */

'use client';

import React from 'react';
import { ChevronDown, ChevronRight, Search, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';

export type DomainListCategory = 'rejected' | 'no_keywords' | 'matches';

interface ExpandableDomainListProps {
  title: string;
  count: number;
  category: DomainListCategory;
  domains: DomainListItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRowClick: (domain: DomainListItem) => void;
  /** Icon to display next to title */
  icon?: React.ComponentType<{ className?: string }>;
  /** Description shown when expanded */
  description?: string;
  className?: string;
}

const CATEGORY_STYLES: Record<DomainListCategory, { badge: string; row: string }> = {
  rejected: {
    badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    row: 'hover:bg-rose-50 dark:hover:bg-rose-900/20',
  },
  no_keywords: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    row: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
  },
  matches: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    row: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  },
};

const CATEGORY_ICONS: Record<DomainListCategory, React.ComponentType<{ className?: string }>> = {
  rejected: XCircle,
  no_keywords: Search,
  matches: ChevronRight,
};

const PAGE_SIZE = 10;

export function ExpandableDomainList({
  title,
  count,
  category,
  domains,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onRowClick,
  icon,
  description,
  className,
}: ExpandableDomainListProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [displayLimit, setDisplayLimit] = React.useState(PAGE_SIZE);
  
  const styles = CATEGORY_STYLES[category];
  const Icon = icon ?? CATEGORY_ICONS[category];
  
  const visibleDomains = React.useMemo(
    () => domains.slice(0, displayLimit),
    [domains, displayLimit]
  );
  
  const canShowMore = domains.length > displayLimit || hasMore;
  const canCollapse = displayLimit > PAGE_SIZE;
  
  const handleShowMore = React.useCallback(() => {
    if (domains.length > displayLimit) {
      setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, domains.length));
    } else if (hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [domains.length, displayLimit, hasMore, onLoadMore]);
  
  const handleCollapse = React.useCallback(() => {
    setDisplayLimit(PAGE_SIZE);
  }, []);
  
  // Don't render if no items
  if (count === 0) {
    return null;
  }
  
  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-3 text-left transition-colors',
          'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
        )}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title} (${count} domains)`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <Icon className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {title}
          </span>
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border',
            styles.badge
          )}>
            {count.toLocaleString()}
          </span>
        </div>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        )}
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t">
          {description && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 border-b">
              {description}
            </p>
          )}
          
          {/* Domain table */}
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th scope="col" className="py-2 px-3 text-left font-medium">Domain</th>
                  <th scope="col" className="py-2 px-3 text-left font-medium">Score</th>
                  <th scope="col" className="py-2 px-3 text-left font-medium">Status</th>
                  <th scope="col" className="py-2 px-3 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleDomains.map((domain) => {
                  const score = domain.domainScore;
                  const scoreColor = score !== undefined && score !== null
                    ? score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-gray-500'
                    : 'text-gray-400';
                  
                  // Derive rejection reason
                  const reason = category === 'rejected'
                    ? (score !== undefined && score < 40 ? 'Low score' : 'Did not qualify')
                    : category === 'no_keywords'
                      ? 'No keywords in content'
                      : 'Qualified';
                  
                  return (
                    <tr
                      key={domain.id ?? domain.domain}
                      className={cn(
                        'cursor-pointer transition-colors',
                        styles.row
                      )}
                      onClick={() => onRowClick(domain)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(domain);
                        }
                      }}
                    >
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">
                        {domain.domain ?? 'Unknown'}
                      </td>
                      <td className={cn('py-2 px-3 font-mono font-semibold', scoreColor)}>
                        {score !== undefined && score !== null ? Math.round(score) : '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                        {domain.leadStatus ?? 'Unknown'}
                      </td>
                      <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">
                        {reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination controls */}
          <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50/50 dark:bg-gray-800/30 text-xs">
            <span className="text-gray-500">
              Showing {visibleDomains.length} of {count.toLocaleString()}
            </span>
            <div className="flex gap-2">
              {canShowMore && (
                <button
                  type="button"
                  onClick={handleShowMore}
                  disabled={isLoading}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : 'Show more'}
                </button>
              )}
              {canCollapse && (
                <button
                  type="button"
                  onClick={handleCollapse}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Collapse
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpandableDomainList;
