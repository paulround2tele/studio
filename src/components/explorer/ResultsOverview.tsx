/**
 * Phase 7.5: Results Overview Summary Component
 * 
 * Compact summary of domain results with key metrics.
 * Designed to sit above DomainsGrid showing aggregate stats.
 * 
 * ARCHITECTURE:
 * - Receives data from useDomainsExplorer hook (no own data fetching)
 * - Displays counts, selection, and filter status
 * - Provides quick-filter shortcuts
 * 
 * @see Phase 7.5 Integration & Deprecation
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Globe, 
  Filter,
  ListFilter,
  BarChart3,
  Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

interface StatusCounts {
  /** Total domains in the campaign */
  total: number;
  /** DNS valid domains */
  dnsValid: number;
  /** DNS invalid domains */
  dnsInvalid: number;
  /** HTTP reachable domains */
  httpReachable: number;
  /** HTTP unreachable domains */
  httpUnreachable: number;
  /** Leads extracted */
  leadsExtracted: number;
  /** Leads pending */
  leadsPending: number;
}

interface FilterState {
  /** Number of active filters */
  activeCount: number;
  /** Whether any filter is applied */
  hasFilters: boolean;
}

export interface ResultsOverviewProps {
  /** Status counts from domains data */
  counts: StatusCounts;
  /** Current filter state */
  filterState: FilterState;
  /** Number of currently selected domains */
  selectionCount: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Campaign phase for context */
  currentPhase?: string;
  /** Callback to clear all filters */
  onClearFilters?: () => void;
  /** Callback to quick-filter by DNS status */
  onFilterDnsValid?: () => void;
  /** Callback to quick-filter by HTTP status */
  onFilterHttpReachable?: () => void;
  /** Callback to quick-filter by lead status */
  onFilterLeadsExtracted?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// METRICS CARD
// ============================================================================

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  tooltip?: string;
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  total, 
  variant = 'default',
  onClick,
  tooltip
}: MetricCardProps) {
  const percentage = total && total > 0 ? Math.round((value / total) * 100) : null;
  
  const variantStyles = {
    default: 'bg-muted/50 text-muted-foreground',
    success: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    error: 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300',
  };

  const content = (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
        variantStyles[variant],
        onClick && "cursor-pointer hover:opacity-80"
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      data-testid={`results-overview-metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium truncate">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-semibold">{value.toLocaleString()}</span>
          {percentage !== null && (
            <span className="text-xs opacity-70">({percentage}%)</span>
          )}
        </div>
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResultsOverview({
  counts,
  filterState,
  selectionCount,
  isLoading = false,
  currentPhase,
  onClearFilters,
  onFilterDnsValid,
  onFilterHttpReachable,
  onFilterLeadsExtracted,
  className,
}: ResultsOverviewProps) {
  const { total, dnsValid, dnsInvalid, httpReachable, httpUnreachable, leadsExtracted, leadsPending } = counts;

  // Calculate funnel progression
  const dnsValidRate = total > 0 ? Math.round((dnsValid / total) * 100) : 0;
  const httpReachableRate = dnsValid > 0 ? Math.round((httpReachable / dnsValid) * 100) : 0;
  const leadsRate = httpReachable > 0 ? Math.round((leadsExtracted / httpReachable) * 100) : 0;

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "p-4 bg-card border rounded-lg",
          isLoading && "opacity-50",
          className
        )}
        data-testid="results-overview"
      >
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Results Overview</h3>
            {currentPhase && (
              <Badge variant="outline" className="text-xs">
                {currentPhase}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Selection indicator */}
            {selectionCount > 0 && (
              <Badge variant="secondary" data-testid="results-overview-selection">
                {selectionCount} selected
              </Badge>
            )}
            
            {/* Filter indicator */}
            {filterState.hasFilters && (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="gap-1" data-testid="results-overview-filters">
                  <Filter className="h-3 w-3" />
                  {filterState.activeCount} filter{filterState.activeCount !== 1 ? 's' : ''}
                </Badge>
                {onClearFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={onClearFilters}
                    data-testid="results-overview-clear-filters"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Total */}
          <MetricCard
            icon={<Globe className="h-4 w-4" />}
            label="Total"
            value={total}
            variant="default"
            tooltip="Total domains in campaign"
          />
          
          {/* DNS Valid */}
          <MetricCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="DNS Valid"
            value={dnsValid}
            total={total}
            variant="success"
            onClick={onFilterDnsValid}
            tooltip="Click to filter by DNS valid domains"
          />
          
          {/* DNS Invalid */}
          <MetricCard
            icon={<XCircle className="h-4 w-4" />}
            label="DNS Invalid"
            value={dnsInvalid}
            total={total}
            variant="error"
            tooltip="Domains that failed DNS validation"
          />
          
          {/* HTTP Reachable */}
          <MetricCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="HTTP OK"
            value={httpReachable}
            total={dnsValid}
            variant="success"
            onClick={onFilterHttpReachable}
            tooltip="Click to filter by HTTP reachable domains"
          />
          
          {/* HTTP Unreachable */}
          <MetricCard
            icon={<XCircle className="h-4 w-4" />}
            label="HTTP Failed"
            value={httpUnreachable}
            total={dnsValid}
            variant="error"
            tooltip="Domains that failed HTTP validation"
          />
          
          {/* Leads Extracted */}
          <MetricCard
            icon={<Target className="h-4 w-4" />}
            label="Leads"
            value={leadsExtracted}
            total={httpReachable}
            variant="success"
            onClick={onFilterLeadsExtracted}
            tooltip="Click to filter by domains with extracted leads"
          />
          
          {/* Leads Pending */}
          <MetricCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="Pending"
            value={leadsPending}
            total={httpReachable}
            variant="warning"
            tooltip="Domains awaiting lead extraction"
          />
        </div>

        {/* Funnel Progress Bar */}
        {total > 0 && (
          <div className="mt-4 space-y-2" data-testid="results-overview-funnel">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Funnel Progression</span>
              <span>{leadsExtracted} / {total} domains</span>
            </div>
            <div className="flex gap-1 h-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-emerald-500 rounded-l-full transition-all"
                    style={{ width: `${dnsValidRate}%`, minWidth: dnsValidRate > 0 ? '4px' : '0' }}
                  />
                </TooltipTrigger>
                <TooltipContent>DNS Valid: {dnsValidRate}%</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-blue-500 transition-all"
                    style={{ width: `${(httpReachableRate * dnsValidRate) / 100}%`, minWidth: httpReachable > 0 ? '4px' : '0' }}
                  />
                </TooltipTrigger>
                <TooltipContent>HTTP Reachable: {httpReachableRate}%</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-purple-500 rounded-r-full transition-all"
                    style={{ width: `${(leadsRate * httpReachableRate * dnsValidRate) / 10000}%`, minWidth: leadsExtracted > 0 ? '4px' : '0' }}
                  />
                </TooltipTrigger>
                <TooltipContent>Leads: {leadsRate}%</TooltipContent>
              </Tooltip>
              <div className="flex-1 bg-muted rounded-r-full" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-emerald-600">DNS {dnsValidRate}%</span>
              <span className="text-blue-600">HTTP {httpReachableRate}%</span>
              <span className="text-purple-600">Leads {leadsRate}%</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export interface ResultsOverviewCompactProps {
  /** Total domains */
  total: number;
  /** Number with leads */
  leadsExtracted: number;
  /** Selection count */
  selectionCount: number;
  /** Active filter count */
  filterCount: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact variant for use in headers/toolbars
 */
export function ResultsOverviewCompact({
  total,
  leadsExtracted,
  selectionCount,
  filterCount,
  className,
}: ResultsOverviewCompactProps) {
  return (
    <div 
      className={cn("flex items-center gap-3 text-sm", className)}
      data-testid="results-overview-compact"
    >
      <span className="text-muted-foreground">
        <Globe className="h-4 w-4 inline mr-1" />
        {total.toLocaleString()}
      </span>
      
      <span className="text-emerald-600 dark:text-emerald-400">
        <Target className="h-4 w-4 inline mr-1" />
        {leadsExtracted.toLocaleString()}
      </span>
      
      {selectionCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {selectionCount} selected
        </Badge>
      )}
      
      {filterCount > 0 && (
        <Badge variant="outline" className="text-xs">
          <ListFilter className="h-3 w-3 mr-1" />
          {filterCount}
        </Badge>
      )}
    </div>
  );
}

export default ResultsOverview;
