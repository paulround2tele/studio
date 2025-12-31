"use client";

/**
 * Phase 3+4+5: Results Mode (Core Drilldown) + Audit & Transparency + Export
 * 
 * Makes post-completion results explorable and auditable:
 *   - View qualified leads (expanded by default)
 *   - Expand rejected domains (grouped by rejection_reason, collapsed by default)
 *   - Expand no-keywords domains (collapsed by default)
 *   - Audit equation display with balance verification
 *   - Mismatch warnings with auditNote from backend
 *   - Export to CSV/JSON (Phase 5)
 * 
 * All counts come from backend (rejection-summary, /domains).
 * No client-side inference or recomputation.
 * Uses generated TS types exclusively.
 */

import React, { useCallback, useMemo, useState } from 'react';
/* TailAdmin migration: Badge/Button/Skeleton/Alert/DropdownMenu replaced with inline Tailwind patterns */
import { cn } from '@/lib/utils';
import {
  useGetCampaignDomainsFilteredQuery,
  useGetCampaignDomainScoreBreakdownQuery,
  useGetCampaignRejectionSummaryQuery,
} from '@/store/api/campaignApi';
import { DomainRejectionReasonEnum } from '@/lib/api-client/models/domain-rejection-reason-enum';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { DomainScoreBreakdownResponse } from '@/lib/api-client/models/domain-score-breakdown-response';
import type { ScoreComponent } from '@/lib/api-client/models/score-component';
import type { RejectionSummaryResponseTotals } from '@/lib/api-client/models/rejection-summary-response-totals';
import { exportDomains } from '@/services/results/domainExportService';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Globe,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Calculator,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  CircleDashed,
  CircleSlash,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ResultsDrilldownProps {
  campaignId: string;
  className?: string;
}

// Rejection reason display config
interface RejectionReasonConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}

const REJECTION_REASON_CONFIG: Record<DomainRejectionReasonEnum, RejectionReasonConfig> = {
  [DomainRejectionReasonEnum.qualified]: {
    label: 'Qualified Leads',
    description: 'Domains that passed validation and scoring thresholds',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: CheckCircle2,
  },
  [DomainRejectionReasonEnum.low_score]: {
    label: 'Low Score',
    description: 'Domains with keywords but score below threshold',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    icon: AlertTriangle,
  },
  [DomainRejectionReasonEnum.no_keywords]: {
    label: 'No Keywords',
    description: 'HTTP OK but no keyword matches found',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    icon: Search,
  },
  [DomainRejectionReasonEnum.parked]: {
    label: 'Parked',
    description: 'Detected as parked/placeholder pages',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: Globe,
  },
  [DomainRejectionReasonEnum.dns_error]: {
    label: 'DNS Error',
    description: 'DNS validation errors (NXDOMAIN, SERVFAIL, etc.)',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
  [DomainRejectionReasonEnum.dns_timeout]: {
    label: 'DNS Timeout',
    description: 'DNS validation timed out',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: Clock,
  },
  [DomainRejectionReasonEnum.http_error]: {
    label: 'HTTP Error',
    description: 'HTTP validation errors (connection, TLS, non-2xx)',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
  [DomainRejectionReasonEnum.http_timeout]: {
    label: 'HTTP Timeout',
    description: 'HTTP validation timed out',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: Clock,
  },
  [DomainRejectionReasonEnum.pending]: {
    label: 'Pending',
    description: 'Not yet processed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    icon: Clock,
  },
};

// ============================================================================
// Degradation State Configuration (Phase 6)
// ============================================================================

/**
 * Breakdown state display configuration.
 * Maps backend state values to user-friendly labels and styling.
 */
type BreakdownState = 'complete' | 'partial' | 'degraded';

interface BreakdownStateConfig {
  label: string;
  description: string;
  icon: React.ElementType;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const BREAKDOWN_STATE_CONFIG: Record<BreakdownState, BreakdownStateConfig> = {
  complete: {
    label: 'Complete',
    description: 'All score components are available and verified.',
    icon: CheckCircle2,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  partial: {
    label: 'Partial Data',
    description: 'Some score components are unavailable. Displayed values may not reflect final scoring.',
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  degraded: {
    label: 'Degraded',
    description: 'Score breakdown is significantly incomplete. Treat displayed values as preliminary.',
    icon: CircleSlash,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

/**
 * Breakdown reason explanations.
 * Maps backend reason codes to user-friendly explanations.
 */
type BreakdownReason = 'feature_vector_missing' | 'profile_not_found' | 'analysis_pending' | 'domain_not_found' | 'internal_error';

const BREAKDOWN_REASON_EXPLANATIONS: Record<BreakdownReason, string> = {
  feature_vector_missing: 'The feature extraction process has not completed for this domain. Scoring data will appear once analysis finishes.',
  profile_not_found: 'No scoring profile is configured for this campaign. Contact your administrator to set up scoring weights.',
  analysis_pending: 'Domain analysis is still in progress. Check back shortly for complete results.',
  domain_not_found: 'This domain was not found in the campaign data. It may have been removed or never processed.',
  internal_error: 'An unexpected error occurred while retrieving score data. This has been logged for investigation.',
};

/**
 * Component state explanations (reserved for tooltip expansion).
 */
type _ComponentReason = 'field_missing' | 'computation_failed' | 'data_pending';

const _COMPONENT_REASON_EXPLANATIONS: Record<_ComponentReason, string> = {
  field_missing: 'Required data for this component was not extracted from the domain.',
  computation_failed: 'An error occurred while calculating this score component.',
  data_pending: 'This component is still being computed.',
};

// ============================================================================
// Degradation Banner Component
// ============================================================================

interface DegradationBannerProps {
  state: BreakdownState;
  reason?: BreakdownReason;
}

/**
 * Compact inline banner for degraded/partial states.
 * Shows state with reason in single-line format for density.
 */
const DegradationBanner: React.FC<DegradationBannerProps> = ({ state, reason }) => {
  if (state === 'complete') {
    return null;
  }

  const config = BREAKDOWN_STATE_CONFIG[state];
  const Icon = config.icon;
  const reasonExplanation = reason ? BREAKDOWN_REASON_EXPLANATIONS[reason] : null;

  return (
    <div className={cn(
      'rounded border px-2 py-1.5 mb-2 flex items-center gap-2',
      config.bgColor,
      config.borderColor
    )}>
      <Icon className={cn('h-4 w-4 flex-shrink-0', config.textColor)} />
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className={cn('font-medium text-xs', config.textColor)}>
          {config.label}
        </span>
        <span className={cn('text-xs', config.textColor, 'opacity-80 hidden sm:inline')}>
          — {reasonExplanation ?? config.description}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Component Status Summary
// ============================================================================

interface ComponentStatusSummaryProps {
  components: DomainScoreBreakdownResponse['components'];
}

/**
 * Summary of component availability.
 * Shows count of unavailable/error components when data is incomplete.
 */
const ComponentStatusSummary: React.FC<ComponentStatusSummaryProps> = ({ components }) => {
  const componentEntries = Object.entries(components) as Array<[string, ScoreComponent]>;
  
  const unavailableCount = componentEntries.filter(([, c]) => c.state === 'unavailable').length;
  const errorCount = componentEntries.filter(([, c]) => c.state === 'error').length;
  const okCount = componentEntries.filter(([, c]) => c.state === 'ok').length;
  const totalCount = componentEntries.length;

  if (unavailableCount === 0 && errorCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-[11px] mb-2 px-1.5 py-1 bg-slate-50 rounded border border-slate-200">
      <span className="text-emerald-600 font-medium">{okCount}✓</span>
      {unavailableCount > 0 && (
        <span className="text-gray-400">{unavailableCount}—</span>
      )}
      {errorCount > 0 && (
        <span className="text-red-500">{errorCount}✗</span>
      )}
      <span className="text-slate-400 ml-auto">/{totalCount}</span>
    </div>
  );
};

// ============================================================================
// Audit Equation Component
// ============================================================================

interface AuditEquationProps {
  totals: RejectionSummaryResponseTotals;
  balanced: boolean;
}

/**
 * Displays the audit equation from backend:
 * analyzed = qualified + rejected (where rejected = low_score + no_keywords + parked + errors)
 * 
 * The equation verification comes from the backend `balanced` flag.
 * We do NOT compute or verify on the client - just display.
 */
const AuditEquation: React.FC<AuditEquationProps> = ({ totals, balanced }) => {
  const { analyzed, qualified, rejected, pending, errors } = totals;
  
  return (
    <div className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Calculator className="h-3 w-3 text-slate-400" />
          <span className="px-1.5 py-0.5 bg-white border rounded font-bold tabular-nums">{analyzed}</span>
          <span className="text-slate-400">=</span>
          <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded tabular-nums text-emerald-700">{qualified}</span>
          <span className="text-slate-400">+</span>
          <span className="px-1.5 py-0.5 bg-red-50 border border-red-200 rounded tabular-nums text-red-700">{rejected}</span>
          {pending > 0 && (
            <>
              <span className="text-slate-400">+</span>
              <span className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded tabular-nums text-gray-500">{pending}</span>
            </>
          )}
        </div>
        {/* TailAdmin migration: Badge -> inline span */}
        {balanced ? (
          <span className="inline-flex items-center rounded border bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-5 px-1.5 ml-auto">
            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
            OK
          </span>
        ) : (
          <span className="inline-flex items-center rounded border bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-5 px-1.5 ml-auto">
            <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
            Mismatch
          </span>
        )}
      </div>
      {errors > 0 && (
        <p className="text-[10px] text-slate-500 mt-1">
          incl. {errors} error{errors !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// Audit Status Banner
// ============================================================================

interface AuditStatusBannerProps {
  balanced: boolean;
  auditNote?: string | null;
}

/**
 * Shows prominent warning banner when audit equation doesn't balance.
 * auditNote comes directly from backend - no client interpretation.
 */
const AuditStatusBanner: React.FC<AuditStatusBannerProps> = ({ balanced, auditNote }) => {
  if (balanced) {
    return null;
  }

  /* TailAdmin migration: Alert -> inline Tailwind pattern */
  return (
    <div className="relative w-full rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900" role="alert">
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h5 className="font-medium leading-none tracking-tight text-amber-800 mb-1">
            Audit Equation Mismatch
          </h5>
          <p className="text-sm text-amber-700">
            {auditNote ?? 'The domain counts do not balance. This may indicate data inconsistency requiring investigation.'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Domain Row Component (Phase 6 Enhanced)
// ============================================================================

interface DomainRowProps {
  domain: DomainListItem;
  isSelected: boolean;
  onSelect: (domain: DomainListItem) => void;
  compact?: boolean;
}

/**
 * Enhanced domain row with error reason display.
 * Shows DNS/HTTP error reasons when present for transparency.
 */
const DomainRow: React.FC<DomainRowProps> = ({
  domain,
  isSelected,
  onSelect,
  compact = false,
}) => {
  const handleClick = useCallback(() => {
    onSelect(domain);
  }, [domain, onSelect]);

  // Check for error states from backend
  const hasError = domain.dnsReason || domain.httpReason;
  const errorText = domain.dnsReason 
    ? `DNS: ${domain.dnsReason}` 
    : domain.httpReason 
    ? `HTTP: ${domain.httpReason}` 
    : null;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={handleClick}
      className={cn(
        'px-2 cursor-pointer transition-colors',
        compact ? 'py-1' : 'py-1.5',
        'border-b border-gray-100 last:border-b-0',
        isSelected
          ? 'bg-blue-50 border-l-2 border-l-blue-500'
          : 'hover:bg-gray-50'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="font-mono text-xs truncate flex-1" title={domain.domain}>
          {domain.domain ?? '—'}
        </p>
        {domain.domainScore !== undefined ? (
          <span className="text-xs font-medium tabular-nums text-gray-600">
            {domain.domainScore}
          </span>
        ) : hasError ? (
          <XCircle className="h-3.5 w-3.5 text-red-400" />
        ) : null}
      </div>
      {hasError && errorText && (
        <p className="text-[10px] text-red-500 truncate" title={errorText}>
          {errorText}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// Collapsible Domain Section
// ============================================================================

interface DomainSectionProps {
  campaignId: string;
  rejectionReason: DomainRejectionReasonEnum;
  count: number;
  defaultOpen?: boolean;
  selectedDomain: string | null;
  onSelectDomain: (domain: DomainListItem) => void;
}

const DomainSection: React.FC<DomainSectionProps> = ({
  campaignId,
  rejectionReason,
  count,
  defaultOpen = false,
  selectedDomain,
  onSelectDomain,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = REJECTION_REASON_CONFIG[rejectionReason];
  const Icon = config.icon;

  // Only fetch domains when section is expanded
  const { data, isLoading, isFetching } = useGetCampaignDomainsFilteredQuery(
    {
      campaignId,
      limit: 50,
      offset: 0,
      rejectionReason: [rejectionReason],
    },
    { skip: !isOpen || count === 0 }
  );

  const domains = useMemo(() => data?.items ?? [], [data?.items]);

  // Export handlers - uses backend data only
  const handleExportCSV = useCallback(() => {
    if (domains.length === 0) return;
    exportDomains(domains, campaignId, rejectionReason, { format: 'csv' });
  }, [domains, campaignId, rejectionReason]);

  const handleExportJSON = useCallback(() => {
    if (domains.length === 0) return;
    exportDomains(domains, campaignId, rejectionReason, { format: 'json' });
  }, [domains, campaignId, rejectionReason]);

  // Don't render if count is 0
  if (count === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors',
          'hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500',
          config.bgColor
        )}
      >
        <div className="flex items-center gap-1.5">
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          )}
          <Icon className={cn('h-3.5 w-3.5', config.color)} />
          <span className={cn('font-medium text-xs', config.color)}>
            {config.label}
          </span>
        </div>
        {/* TailAdmin migration: Badge -> inline span */}
        <span className="inline-flex items-center rounded border border-gray-200 bg-gray-100 text-gray-700 tabular-nums text-[10px] h-4 px-1.5">
          {count}
        </span>
      </button>
      {isOpen && (
        <div className="border rounded overflow-hidden bg-white ml-4">
          {/* Per-section explanation + Export */}
          <div className="px-2 py-1 bg-slate-50 border-b flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-500 truncate">{config.description}</span>
            {domains.length > 0 && !isLoading && !isFetching && (
              /* TailAdmin migration: DropdownMenu -> inline buttons */
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center h-5 px-1.5 text-[10px] text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Export CSV"
                >
                  <FileSpreadsheet className="h-2.5 w-2.5 mr-0.5" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="inline-flex items-center h-5 px-1.5 text-[10px] text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Export JSON"
                >
                  <FileJson className="h-2.5 w-2.5 mr-0.5" />
                  JSON
                </button>
              </div>
            )}
          </div>
          {isLoading || isFetching ? (
            <div className="p-2 space-y-1">
              {/* TailAdmin migration: Skeleton -> animate-pulse div */}
              <div className="h-5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ) : domains.length === 0 ? (
            <div className="p-2 text-center text-xs text-muted-foreground">
              No domains
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {domains.map((domain, index) => (
                <DomainRow
                  key={domain.id ?? domain.domain ?? index}
                  domain={domain}
                  isSelected={domain.domain === selectedDomain}
                  onSelect={onSelectDomain}
                  compact
                />
              ))}
              {data?.total !== undefined && data.total > domains.length && (
                <div className="px-2 py-1 text-[10px] text-center text-muted-foreground bg-gray-50">
                  {domains.length}/{data.total}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Score Component Card (Phase 6 Enhanced)
// ============================================================================

interface ScoreComponentCardProps {
  name: string;
  component: ScoreComponent;
}

/**
 * Compact score component display with state visibility.
 */
const ScoreComponentCard: React.FC<ScoreComponentCardProps> = ({ name, component }) => {
  const isOk = component.state === 'ok';
  const isUnavailable = component.state === 'unavailable';

  const stateConfig = isOk
    ? { color: 'text-emerald-600', bg: '', icon: CheckCircle2 }
    : isUnavailable
    ? { color: 'text-gray-400', bg: 'bg-gray-50', icon: CircleDashed }
    : { color: 'text-red-500', bg: 'bg-red-50', icon: XCircle };

  const StateIcon = stateConfig.icon;

  const valueDisplay =
    component.value !== undefined && component.value !== null
      ? (component.value * 100).toFixed(0)
      : '—';

  return (
    <div className={cn(
      'py-1 px-1.5 flex items-center justify-between rounded text-xs',
      stateConfig.bg
    )}>
      <div className="flex items-center gap-1">
        <StateIcon className={cn('h-3 w-3', stateConfig.color)} />
        <span className="capitalize text-gray-700">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
      </div>
      <span className={cn('font-medium tabular-nums', stateConfig.color)}>
        {valueDisplay}
      </span>
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
      <div className="h-full border rounded bg-slate-50 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Select a domain</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full border rounded p-2 space-y-2">
        {/* TailAdmin migration: Skeleton -> animate-pulse div */}
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full border rounded p-2">
        <p className="text-xs text-red-500">Failed to load</p>
      </div>
    );
  }

  const breakdown: DomainScoreBreakdownResponse | undefined = data;
  const breakdownState = breakdown?.state ?? 'complete';
  const breakdownReason = breakdown?.reason as BreakdownReason | undefined;
  const stateConfig = BREAKDOWN_STATE_CONFIG[breakdownState];
  const StateIcon = stateConfig.icon;

  return (
    <div className="h-full border rounded overflow-auto">
      {/* Compact Header */}
      <div className="px-2 py-1.5 border-b bg-slate-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-gray-700 truncate">Details</span>
          <code className="text-[10px] text-muted-foreground truncate">{breakdown?.domain}</code>
        </div>
        {/* TailAdmin migration: Badge -> inline span */}
        {breakdown?.state && (
          <span
            className={cn(
              'inline-flex items-center rounded border text-[10px] h-4 px-1 gap-0.5 flex-shrink-0',
              stateConfig.bgColor,
              stateConfig.textColor,
              stateConfig.borderColor
            )}
          >
            <StateIcon className="h-2.5 w-2.5" />
            {stateConfig.label}
          </span>
        )}
      </div>

      <div className="p-2 space-y-2">
        {/* Degradation Banner */}
        <DegradationBanner state={breakdownState} reason={breakdownReason} />

        {/* Overall Score - compact */}
        {breakdown?.overallScore !== undefined ? (
          <div className={cn(
            'px-2 py-1.5 rounded border flex items-center justify-between',
            breakdownState === 'complete' 
              ? 'bg-gray-50 border-gray-200' 
              : breakdownState === 'partial'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-red-50 border-red-200'
          )}>
            <span className="text-xs font-medium">Score</span>
            <span className={cn(
              'text-lg font-bold tabular-nums',
              breakdownState !== 'complete' && 'opacity-75'
            )}>
              {breakdown.overallScore}
            </span>
          </div>
        ) : (
          <div className="px-2 py-1.5 rounded border border-gray-200 bg-gray-50 flex items-center gap-2">
            <CircleDashed className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-muted-foreground">No score</span>
          </div>
        )}

        {/* Component Status Summary */}
        {breakdown?.components && (
          <ComponentStatusSummary components={breakdown.components} />
        )}

        {/* Component Scores - inline grid */}
        {breakdown?.components && (
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Components
            </h4>
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
          </div>
        )}

        {/* Evidence - compact inline */}
        {breakdown?.evidence && (
          <div className="pt-2 mt-2 border-t space-y-0.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Evidence
            </h4>
            <div className="text-xs space-y-0.5">
              {breakdown.evidence.keywordHits && breakdown.evidence.keywordHits.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Keywords</span>
                  <span className="tabular-nums font-medium">{breakdown.evidence.keywordHits.length}</span>
                </div>
              )}
              {breakdown.evidence.contentLengthBytes !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Content</span>
                  <span className="tabular-nums">{(breakdown.evidence.contentLengthBytes / 1024).toFixed(1)}KB</span>
                </div>
              )}
              {breakdown.evidence.parkedPenaltyApplied !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Parked</span>
                  <span className={breakdown.evidence.parkedPenaltyApplied ? 'text-red-600' : 'text-green-600'}>
                    {breakdown.evidence.parkedPenaltyApplied ? '⚠' : '✓'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Main Results Drilldown Component
// ============================================================================

export const ResultsDrilldown: React.FC<ResultsDrilldownProps> = ({
  campaignId,
  className,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Fetch rejection summary for counts
  const {
    data: rejectionSummary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useGetCampaignRejectionSummaryQuery(campaignId);

  // Handle domain selection
  const handleSelectDomain = useCallback((domain: DomainListItem) => {
    setSelectedDomain(domain.domain ?? null);
  }, []);

  // Extract counts from rejection summary
  const counts = useMemo(() => {
    const c = rejectionSummary?.counts;
    return {
      qualified: c?.qualified ?? 0,
      lowScore: c?.lowScore ?? 0,
      noKeywords: c?.noKeywords ?? 0,
      parked: c?.parked ?? 0,
      dnsError: c?.dnsError ?? 0,
      dnsTimeout: c?.dnsTimeout ?? 0,
      httpError: c?.httpError ?? 0,
      httpTimeout: c?.httpTimeout ?? 0,
    };
  }, [rejectionSummary?.counts]);

  const totals = useMemo((): RejectionSummaryResponseTotals => {
    const t = rejectionSummary?.totals;
    return {
      analyzed: t?.analyzed ?? 0,
      qualified: t?.qualified ?? 0,
      rejected: t?.rejected ?? 0,
      errors: t?.errors ?? 0,
      pending: t?.pending ?? 0,
    };
  }, [rejectionSummary?.totals]);

  // Balanced flag from backend - DO NOT compute client-side
  const balanced = rejectionSummary?.balanced ?? true;
  const auditNote = rejectionSummary?.auditNote;

  if (summaryLoading) {
    return (
      <div className={cn('flex gap-2 h-full', className)}>
        <div className="w-1/2 border rounded p-2 space-y-2">
          {/* TailAdmin migration: Skeleton -> animate-pulse div */}
          <div className="h-8 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-8 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="w-1/2">
          <div className="h-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className={cn('flex gap-2 h-full', className)}>
        <div className="w-full border rounded p-2">
          <p className="text-xs text-red-500">Failed to load results</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-2 h-full', className)}
      data-testid="results-drilldown"
    >
      {/* Audit Status Banner - Prominent warning if unbalanced */}
      <AuditStatusBanner balanced={balanced} auditNote={auditNote} />

      <div className="flex gap-2 flex-1 min-h-0">
        {/* Left: Domain Sections */}
        <div className="w-1/2 flex flex-col overflow-hidden border rounded">
          {/* Compact header with audit equation inline */}
          <div className="px-2 py-1.5 border-b bg-slate-50 flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-700">Results</span>
              {/* TailAdmin migration: Badge -> inline span */}
              {balanced ? (
                <span className="inline-flex items-center rounded border bg-emerald-50 text-emerald-700 border-emerald-200 h-4 text-[10px] px-1">
                  <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                  OK
                </span>
              ) : (
                <span className="inline-flex items-center rounded border bg-amber-50 text-amber-700 border-amber-200 h-4 text-[10px] px-1">
                  <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                  Mismatch
                </span>
              )}
            </div>
            <AuditEquation totals={totals} balanced={balanced} />
          </div>
          
          {/* Domain sections */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Qualified Leads - Expanded by default */}
            <DomainSection
              campaignId={campaignId}
              rejectionReason={DomainRejectionReasonEnum.qualified}
              count={counts.qualified}
              defaultOpen={true}
              selectedDomain={selectedDomain}
              onSelectDomain={handleSelectDomain}
            />

            {/* Rejected Sections - Collapsed by default */}
            <div className="pt-1.5 mt-1.5 border-t">
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 px-1">
                Rejected
              </h4>

              {/* No Keywords */}
              <DomainSection
                campaignId={campaignId}
                rejectionReason={DomainRejectionReasonEnum.no_keywords}
                count={counts.noKeywords}
                defaultOpen={false}
                selectedDomain={selectedDomain}
                onSelectDomain={handleSelectDomain}
              />

              {/* Low Score */}
              <DomainSection
                campaignId={campaignId}
                rejectionReason={DomainRejectionReasonEnum.low_score}
                count={counts.lowScore}
                defaultOpen={false}
                selectedDomain={selectedDomain}
                onSelectDomain={handleSelectDomain}
              />

              {/* Parked */}
              <DomainSection
                campaignId={campaignId}
                rejectionReason={DomainRejectionReasonEnum.parked}
                count={counts.parked}
                defaultOpen={false}
                selectedDomain={selectedDomain}
                onSelectDomain={handleSelectDomain}
              />

              {/* DNS Errors */}
              <DomainSection
                campaignId={campaignId}
                rejectionReason={DomainRejectionReasonEnum.dns_error}
                count={counts.dnsError}
                defaultOpen={false}
                selectedDomain={selectedDomain}
                onSelectDomain={handleSelectDomain}
              />

              {/* DNS Timeout */}
              <DomainSection
                campaignId={campaignId}
                rejectionReason={DomainRejectionReasonEnum.dns_timeout}
                count={counts.dnsTimeout}
                defaultOpen={false}
                selectedDomain={selectedDomain}
                onSelectDomain={handleSelectDomain}
              />

              {/* HTTP Errors */}
              <DomainSection
                campaignId={campaignId}
                rejectionReason={DomainRejectionReasonEnum.http_error}
                count={counts.httpError}
                defaultOpen={false}
                selectedDomain={selectedDomain}
                onSelectDomain={handleSelectDomain}
              />

              {/* HTTP Timeout */}
              <DomainSection
                campaignId={campaignId}
                rejectionReason={DomainRejectionReasonEnum.http_timeout}
                count={counts.httpTimeout}
                defaultOpen={false}
                selectedDomain={selectedDomain}
                onSelectDomain={handleSelectDomain}
              />
            </div>
          </div>
        </div>

        {/* Right: Domain Details */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <ScoreBreakdownPanel
            campaignId={campaignId}
            selectedDomain={selectedDomain}
          />
        </div>
      </div>
    </div>
  );
};

export default ResultsDrilldown;
