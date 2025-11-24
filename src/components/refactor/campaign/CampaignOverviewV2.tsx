/**
 * Campaign Overview V2 Component (Phase 2 + Phase 3)
 * Value-first campaign overview with server metrics, deltas, movers, and real-time progress
 */

import React from 'react';
import { useGetCampaignEnrichedQuery, useGetCampaignDomainsQuery } from '@/store/api/campaignApi';
import type { DomainListItem } from '@/lib/api-client/models';
import type { ClassificationBucket } from '../types';
import type { Mover, Recommendation } from '@/types/campaignMetrics';
import type { EnhancedRecommendation } from '@/services/campaignMetrics/recommendationsV3Pipeline';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

import CampaignKpiCard from './CampaignKpiCard';
import ClassificationBuckets from './ClassificationBuckets';
import WarningSummary from './WarningSummary';
import ConfigSummary from './ConfigSummary';
import PipelineBarContainer from './PipelineBarContainer';
import RecommendationPanel from './RecommendationPanel';

// Phase 3 Components
import _DeltaBadge, { CompactDeltaBadge } from './DeltaBadge';
import MoversPanel from './MoversPanel';
import LiveProgressStatus from './LiveProgressStatus';

// Phase 3 Hooks and Context
import { MetricsProvider, useMetricsContext } from '@/hooks/useMetricsContext';
import type { 
  CampaignKpi, 
  CampaignDomain 
} from '../types';
import type { DomainMetricsInput, DeltaMetrics } from '@/types/campaignMetrics';
import type { EnrichedCampaignResponse } from '@/lib/api-client/models/enriched-campaign-response';
import type { CampaignDomainsListResponse } from '@/lib/api-client/models/campaign-domains-list-response';

interface CampaignOverviewV2Props {
  campaignId: string;
  className?: string;
}

type WarningSummaryItems = React.ComponentProps<typeof WarningSummary>['warnings'];
type ConfigSummaryItems = React.ComponentProps<typeof ConfigSummary>['config'];

interface CampaignMeta {
  createdAt?: string;
  updatedAt?: string;
  currentPhase?: string;
  owner?: string;
  pattern?: string;
  maxDomains?: number;
}

// Convert API domains to our lightweight interface
function normalizeStatus(value: unknown): 'ok' | 'pending' | 'error' | 'timeout' {
  switch (value) {
    case 'ok':
    case 'pending':
    case 'error':
    case 'timeout':
      return value;
    default:
      return 'pending';
  }
}

function convertDomains(apiDomains: DomainListItem[] | undefined | null): CampaignDomain[] {
  if (!apiDomains || !Array.isArray(apiDomains)) return [];
  return apiDomains.map((domainRecord) => {
    const record = domainRecord as Record<string, unknown>;
    const createdAt = (record.createdAt || record.created_at || new Date().toISOString()) as string;

    return {
      id: (record.id as string) || '',
      domain_name: (record.domain as string) || (record.domain_name as string) || '',
      dns_status: normalizeStatus(record.dnsStatus || record.dns_status),
      http_status: normalizeStatus(record.httpStatus || record.http_status),
      lead_score: (record.lead_score as number) || 0,
      created_at: createdAt,
      updated_at: (record.updatedAt as string) || (record.updated_at as string) || createdAt
    };
  });
}

// Convert to new service input format
function convertToMetricsInput(domains: CampaignDomain[]): DomainMetricsInput[] {
  return domains.map(domain => ({
    id: domain.id,
    domain_name: domain.domain_name,
    dns_status: domain.dns_status || 'pending',
    http_status: domain.http_status || 'pending',
    lead_score: domain.lead_score,
    created_at: domain.created_at,
    updated_at: domain.updated_at
  }));
}

function buildWarningSummary(domains: CampaignDomain[]): WarningSummaryItems {
  if (domains.length === 0) return [];

  const warnings: WarningSummaryItems = [];
  const dnsFailures = domains.filter(domain => domain.dns_status === 'error').length;
  const httpFailures = domains.filter(domain => domain.http_status === 'error').length;

  if (dnsFailures > 0) {
    warnings.push({
      id: 'dns-errors',
      type: 'warning',
      title: 'DNS Resolution Issues',
      message: `${dnsFailures} domain${dnsFailures === 1 ? '' : 's'} failing DNS checks`,
      count: dnsFailures
    });
  }

  if (httpFailures > 0) {
    warnings.push({
      id: 'http-errors',
      type: 'warning',
      title: 'HTTP Validation Failures',
      message: `${httpFailures} domain${httpFailures === 1 ? '' : 's'} returned HTTP errors`,
      count: httpFailures
    });
  }

  return warnings;
}

function buildConfigSummary(meta: CampaignMeta, domains: CampaignDomain[]): ConfigSummaryItems {
  const config: ConfigSummaryItems = [];

  const createdValue = meta.createdAt || meta.updatedAt || domains[0]?.created_at || '1970-01-01T00:00:00Z';
  config.push({
    label: 'Created',
    value: createdValue,
    type: 'date'
  });

  const maxDomains = meta.maxDomains ?? domains.length ?? 0;
  config.push({
    label: 'Max Domains',
    value: maxDomains,
    type: 'number'
  });

  config.push({
    label: 'Pattern',
    value: meta.pattern || 'Keyword Match',
    type: 'badge'
  });

  if (meta.currentPhase) {
    config.push({
      label: 'Phase',
      value: meta.currentPhase,
      type: 'badge'
    });
  }

  if (meta.owner) {
    config.push({
      label: 'Owner',
      value: meta.owner,
      type: 'text'
    });
  }

  return config;
}

/**
 * Inner component that consumes metrics context
 */
function CampaignOverviewV2Inner({ 
  className,
  domains,
  campaignMeta
}: { 
  className?: string;
  domains: CampaignDomain[];
  campaignMeta: CampaignMeta;
}) {
  const metrics = useMetricsContext();
  
  const warnings = React.useMemo(() => buildWarningSummary(domains), [domains]);
  const config = React.useMemo(() => buildConfigSummary(campaignMeta, domains), [campaignMeta, domains]);
  
  // Type assertion for aggregates
  const aggregates = (metrics.aggregates || {}) as Record<string, number>;
  const deltas = metrics.deltas || [];
  
  // Generate KPIs from Phase 3 aggregates with delta badges
  const kpisWithDeltas: (CampaignKpi & { delta?: DeltaMetrics })[] = [
    {
      label: 'Total Domains',
      value: aggregates.totalDomains ?? 0,
      format: 'number',
      trend: { direction: 'up', percentage: 12 },
      delta: deltas.find(d => d.key === 'totalDomains')
    },
    {
      label: 'Success Rate',
      value: aggregates.successRate ?? 0,
      format: 'percentage', 
      trend: { direction: 'up', percentage: 5 },
      delta: deltas.find(d => d.key === 'successRate')
    },
    {
      label: 'Avg Lead Score',
      value: aggregates.avgLeadScore ?? 0,
      format: 'number',
      trend: { direction: 'stable', percentage: 0 },
      delta: metrics.deltas.find(d => d.key === 'avgLeadScore')
    },
    {
      label: 'Runtime',
      value: 127,
      format: 'duration',
      trend: { direction: 'down', percentage: 8 }
    }
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Phase 3: Live Progress Status */}
      {metrics.features.enableRealtimeProgress && (
        <LiveProgressStatus
          progress={metrics.progress}
          isConnected={metrics.isConnected}
          isEnabled={metrics.features.enableRealtimeProgress}
          isCompleted={false}
          error={metrics.error}
          stats={metrics.progressStats}
          showStats={true}
        />
      )}

      {/* KPI Cards Row with Delta Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisWithDeltas.map((kpi, index) => (
          <div key={`${kpi.label}-${index}`} className="relative">
            <CampaignKpiCard kpi={kpi} />
            {/* Phase 3: Delta Badge Overlay */}
            {metrics.features.enableDeltas && kpi.delta && (
              <div className="absolute top-2 right-2">
                <CompactDeltaBadge delta={kpi.delta} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <PipelineBarContainer domains={domains} />
          <ClassificationBuckets buckets={(metrics.uiBuckets as unknown) as ClassificationBucket[]} />
          
          {/* Phase 3: Movers Panel */}
          {metrics.features.enableMoversPanel && metrics.hasMovers && (
            <MoversPanel 
              movers={(metrics.movers as unknown) as Mover[]}
              title="Top Domain Movers"
              isSynthetic={!metrics.hasPreviousData}
              maxDisplay={5}
            />
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <WarningSummary warnings={warnings} />
          <ConfigSummary config={config} />
        </div>
      </div>

      {/* Enhanced Recommendations Panel with Delta Awareness */}
      <RecommendationPanel recommendations={(metrics.recommendations as unknown) as (Recommendation | EnhancedRecommendation)[]} />

      {/* Phase 3: Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
          <h4 className="font-semibold mb-2">Phase 3 Debug Info:</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <strong>Features:</strong>
              <ul className="ml-2">
                <li>Server Metrics: {metrics.features.useServerMetrics ? '✓' : '✗'}</li>
                <li>Deltas: {metrics.features.enableDeltas ? '✓' : '✗'}</li>
                <li>Movers: {metrics.features.enableMoversPanel ? '✓' : '✗'}</li>
                <li>Real-time: {metrics.features.enableRealtimeProgress ? '✓' : '✗'}</li>
              </ul>
            </div>
            <div>
              <strong>Data Sources:</strong>
              <ul className="ml-2">
                <li>Server Data: {metrics.isServerData ? '✓' : '✗'}</li>
                <li>Previous Data: {metrics.hasPreviousData ? '✓' : '✗'}</li>
                <li>Significant Deltas: {metrics.significantDeltas.length}</li>
                <li>Movers: {metrics.movers.length}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Campaign Overview V2 Component with Metrics Provider
 */
export function CampaignOverviewV2({ campaignId, className }: CampaignOverviewV2Props) {
  const { data: enriched, isLoading: enrichedLoading, error: enrichedError } = useGetCampaignEnrichedQuery(campaignId);
  // Domains list (paged) - we request a large first page for overview metrics (could paginate later)
  const { data: domainsList, isLoading: domainsLoading, error: domainsError } = useGetCampaignDomainsQuery(
    { campaignId, limit: 500, offset: 0 },
    { skip: !campaignId }
  );

  const isLoading = enrichedLoading || domainsLoading;
  const error = enrichedError || domainsError;
  
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading overview...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Failed to load campaign overview</span>
        </div>
      </div>
    );
  }

  // Prefer domains from dedicated list endpoint; fall back to enriched domains if present
  const _enrichedObj = enriched as EnrichedCampaignResponse | undefined;
  const listObj = domainsList as CampaignDomainsListResponse | undefined;
  const rawDomains = listObj?.items || [];
  const domains = convertDomains(rawDomains);
  const metricsInput: DomainMetricsInput[] = convertToMetricsInput(domains);
  const campaignDetails = (_enrichedObj?.campaign ?? {}) as any;
  const campaignMeta: CampaignMeta = {
    createdAt: campaignDetails.created_at || campaignDetails.createdAt,
    updatedAt: campaignDetails.updated_at || campaignDetails.updatedAt,
    currentPhase: campaignDetails.current_phase || campaignDetails.phase,
    owner: campaignDetails.owner?.email || campaignDetails.owner_email || campaignDetails.owner,
    pattern: campaignDetails.pattern || campaignDetails.domain_pattern || campaignDetails.domainPattern,
    maxDomains: campaignDetails.max_domains || campaignDetails.target_count || campaignDetails.maxDomains
  };
  
  return (
    <MetricsProvider
      campaignId={campaignId}
      domains={metricsInput}
      previousDomains={[]}
    >
      <CampaignOverviewV2Inner 
        className={className} 
        domains={domains} 
        campaignMeta={campaignMeta}
      />
    </MetricsProvider>
  );
}

export default CampaignOverviewV2;