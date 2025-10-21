/**
 * Campaign Experience Page Layout (Phase D)
 * Main campaign experience page integration with all refactor components
 */

import React from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

import { KpiGrid } from './KpiGrid';
import { PipelineBar } from './PipelineBar';
import { FunnelSnapshot } from './FunnelSnapshot';
import { RecommendationPanel } from './RecommendationPanel';
import type { CampaignRecommendation } from '@/lib/api-client/models/campaign-recommendation';
import type { Recommendation } from '@/types/campaignMetrics';
import { ConfigSummary } from './ConfigSummary';
import { ConfigSummaryPanel } from './ConfigSummaryPanel';
import { MomentumPanel } from './MomentumPanel';
import { ClassificationBuckets } from './ClassificationBuckets';
import { WarningDistribution } from './WarningDistribution';
import { WarningBar } from './WarningBar';
import { WarningPills } from './WarningPills';
import { MoverList } from './MoverList';
import { Histogram } from './Histogram';
import { mergeCampaignPhases } from './phaseStatusUtils';

import { useCampaignPhaseStream } from '@/hooks/useCampaignPhaseStream';
import { 
  useGetCampaignMetricsQuery,
  useGetCampaignFunnelQuery,
  useGetCampaignRecommendationsQuery,
  useGetCampaignEnrichedQuery,
  useGetCampaignClassificationsQuery,
  useGetCampaignMomentumQuery,
  useGetCampaignStatusQuery
} from '@/store/api/campaignApi';

import type { CampaignKpi } from '../types';
import type { WarningData } from './WarningDistribution';
import type { WarningBarData } from './WarningBar';
import type { WarningPillData } from './WarningPills';

interface CampaignExperiencePageProps {
  className?: string;
  role?: string;
}

export function CampaignExperiencePage({ className, role = "region" }: CampaignExperiencePageProps) {
  const params = useParams();
  const campaignId = params?.id as string;

  // Fetch campaign data with caching optimizations
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useGetCampaignMetricsQuery(campaignId);
  const { data: funnelData, isLoading: funnelLoading, error: funnelError } = useGetCampaignFunnelQuery(campaignId);
  const { data: recommendationsData, isLoading: recsLoading } = useGetCampaignRecommendationsQuery(campaignId);
  const { data: enrichedData } = useGetCampaignEnrichedQuery(campaignId);
  const { data: classificationsData } = useGetCampaignClassificationsQuery({ campaignId });
  const { data: momentumData } = useGetCampaignMomentumQuery(campaignId);

  // Real-time phase updates
  const { phases, isConnected, error: sseError, lastUpdate } = useCampaignPhaseStream(campaignId, {
    enabled: true,
    onPhaseUpdate: (event) => {
      console.log('Phase update:', event);
    },
    onError: (error) => {
      console.error('SSE error:', error);
    }
  });

  const { data: statusSnapshot } = useGetCampaignStatusQuery(campaignId);

  const pipelinePhases = React.useMemo(() => mergeCampaignPhases({
    statusSnapshot,
    funnelData,
    ssePhases: phases,
    sseLastUpdate: lastUpdate
  }), [statusSnapshot, funnelData, phases, lastUpdate]);

  // Transform metrics data to KPI format
  const kpis: CampaignKpi[] = React.useMemo(() => {
    if (!metricsData) return [];

    return [
      {
        label: 'High Potential',
        value: metricsData.highPotential || 0,
        format: 'number'
      },
      {
        label: 'Leads Generated',
        value: metricsData.leads || 0,
        format: 'number'
      },
      {
        label: 'Keyword Coverage',
        value: metricsData.keywordCoveragePct || 0,
        format: 'percentage'
      },
      {
        label: 'Avg Richness',
        value: metricsData.avgRichness || 0,
        format: 'number'
      },
      {
        label: 'Warning Rate',
        value: metricsData.warningRatePct || 0,
        format: 'percentage'
      },
      {
        label: 'Total Analyzed',
        value: metricsData.totalAnalyzed || 0,
        format: 'number'
      }
    ];
  }, [metricsData]);

  // Transform metrics data to warning format
  const warningData: WarningData[] = React.useMemo(() => {
    if (!metricsData) return [];
    
    const warnings: WarningData[] = [];
    const totalDomains = metricsData.totalAnalyzed || 1;
    
    if (metricsData.stuffing && metricsData.stuffing > 0) {
      warnings.push({
        type: 'stuffing',
        count: metricsData.stuffing,
        rate: (metricsData.stuffing / totalDomains) * 100,
        severity: metricsData.stuffing > totalDomains * 0.2 ? 'critical' : 
                 metricsData.stuffing > totalDomains * 0.1 ? 'high' : 
                 metricsData.stuffing > totalDomains * 0.05 ? 'medium' : 'low'
      });
    }
    
    if (metricsData.repetition && metricsData.repetition > 0) {
      warnings.push({
        type: 'repetition',
        count: metricsData.repetition,
        rate: (metricsData.repetition / totalDomains) * 100,
        severity: metricsData.repetition > totalDomains * 0.15 ? 'critical' : 
                 metricsData.repetition > totalDomains * 0.08 ? 'high' : 
                 metricsData.repetition > totalDomains * 0.03 ? 'medium' : 'low'
      });
    }
    
    if (metricsData.anchor && metricsData.anchor > 0) {
      warnings.push({
        type: 'anchor',
        count: metricsData.anchor,
        rate: (metricsData.anchor / totalDomains) * 100,
        severity: metricsData.anchor > totalDomains * 0.3 ? 'critical' : 
                 metricsData.anchor > totalDomains * 0.2 ? 'high' : 
                 metricsData.anchor > totalDomains * 0.1 ? 'medium' : 'low'
      });
    }
    
    return warnings;
  }, [metricsData]);

  // Transform for warning bar and pills
  const warningBarData: WarningBarData[] = warningData.map(w => ({
    type: w.type,
    count: w.count,
    rate: w.rate,
    severity: w.severity
  }));

  const warningPillData: WarningPillData[] = warningData.map(w => ({
    type: w.type,
    count: w.count,
    severity: w.severity
  }));

  // Configuration items for ConfigSummaryPanel
  const configItems = React.useMemo(() => {
    if (!enrichedData?.campaign) return [];
    
    const campaign = enrichedData.campaign;
    
    // Extract target domains from funnel data or progress
    const targetDomains = funnelData?.generated || campaign.progress?.totalDomains || 0;
    
    // Map backend status to display format
    const statusDisplay = campaign.status === 'draft' ? 'Draft' :
                          campaign.status === 'running' ? 'Running' :
                          campaign.status === 'paused' ? 'Paused' :
                          campaign.status === 'completed' ? 'Completed' :
                          campaign.status === 'failed' ? 'Failed' :
                          campaign.status === 'cancelled' ? 'Cancelled' : 'Unknown';
    
    return [
      { label: 'Campaign Type', value: 'Lead Generation', type: 'badge' as const },
      { label: 'Target Domains', value: targetDomains, type: 'number' as const },
      { label: 'Created', value: campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Unknown', type: 'date' as const },
      { label: 'Status', value: statusDisplay, type: 'badge' as const },
      { label: 'Name', value: campaign.name || 'N/A', type: 'text' as const }
    ];
  }, [enrichedData, funnelData]);

  // Handle loading states
  if (!campaignId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">Invalid Campaign</h2>
          <p className="text-gray-600">Campaign ID is required</p>
        </div>
      </div>
    );
  }

  const isLoading = metricsLoading || funnelLoading;
  const hasError = metricsError || funnelError;
  const sseStatusLabel = sseError
    ? `Disconnected (${sseError})`
    : isConnected
      ? 'Live'
      : 'Connecting…';

  if (hasError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">Error Loading Campaign</h2>
          <p className="text-gray-600">
            {typeof metricsError === 'string'
              ? metricsError
              : typeof funnelError === 'string'
                ? funnelError
                : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with SSE connection status */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Campaign Dashboard
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected && !sseError
                ? 'bg-green-500'
                : sseError
                ? 'bg-red-500'
                : 'bg-yellow-400'
            }`}
            aria-hidden="true"
          />
          <span className="text-gray-600 dark:text-gray-400">
            {sseStatusLabel}
          </span>
        </div>
      </div>

      {/* Pipeline Status Bar */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Pipeline Status</h2>
        <PipelineBar phases={pipelinePhases} />
      </div>

      {/* KPI Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Key Metrics</h2>
        <KpiGrid kpis={kpis} loading={isLoading} />
      </div>

      {/* Two-column layout for detailed views */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Funnel */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            {funnelLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : funnelData ? (
              <FunnelSnapshot data={funnelData} />
            ) : (
              <div className="text-center p-8 text-gray-500">
                <p>Funnel data not available</p>
              </div>
            )}
          </div>

          {/* Config Summary */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            <ConfigSummary 
              config={configItems}
              title="Campaign Configuration"
            />
          </div>
        </div>

        {/* Right column: Recommendations and other insights */}
        <div className="space-y-6">
          {/* Recommendations */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            {recsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : recommendationsData?.recommendations ? (
              <RecommendationPanel 
                recommendations={recommendationsData.recommendations.map((r: CampaignRecommendation): Recommendation => ({
                  id: r.id ?? `${r.rationaleCode}-${r.message}`,
                  title: r.message,
                  detail: r.message,
                  rationale: r.rationaleCode,
                  severity: 'info'
                }))}
              />
            ) : (
              <div className="text-center p-8 text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Recommendations</h3>
                <p>Recommendations will appear based on campaign performance</p>
              </div>
            )}
          </div>

          {/* Additional insights panels - now implemented */}
          <section aria-labelledby="insights-heading">
            <h3 id="insights-heading" className="sr-only">Additional Insights</h3>
            {warningData.length > 0 ? (
              <WarningDistribution
                warnings={warningData}
                totalDomains={metricsData?.totalAnalyzed || 0}
                aria-label="Warning analysis and distribution"
              />
            ) : (
              <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border text-center text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Quality Issues</h3>
                <p>All domains are passing quality checks</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Full-width momentum panel at bottom if data exists */}
      {momentumData && (momentumData.moversUp?.length > 0 || momentumData.moversDown?.length > 0) && (
        <section className="mt-8" aria-labelledby="momentum-full-heading">
          <h2 id="momentum-full-heading" className="text-lg font-semibold mb-4">Momentum Analysis</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <MoverList
              movers={momentumData.moversUp || []}
              type="up"
              title="Top Gainers"
              maxItems={10}
              showScores={true}
              showRanks={true}
              aria-label="Detailed list of top gaining domains"
            />
            <MoverList
              movers={momentumData.moversDown || []}
              type="down"
              title="Top Decliners"
              maxItems={10}
              showScores={true}
              showRanks={true}
              aria-label="Detailed list of top declining domains"
            />
          </div>
          
          {momentumData.histogram && (
            <div className="mt-6">
              <Histogram
                bins={momentumData.histogram.map((count: number, idx: number) => ({
                  bucket: `bin_${idx}`,
                  count
                }))}
                title="Score Delta Distribution"
                orientation="horizontal"
                colorScheme="diverging"
                showStats={true}
                aria-label="Comprehensive score change distribution"
              />
            </div>
          )}
        </section>
      )}

      {/* Loading overlay for initial load */}
      {isLoading && !metricsData && (
        <div 
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50"
          role="progressbar"
          aria-label="Loading campaign data"
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading unified campaign experience...</p>
          </div>
        </div>
      )}
    </div>
  );
}