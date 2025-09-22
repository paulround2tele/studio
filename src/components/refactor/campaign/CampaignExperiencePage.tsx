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
import { ConfigSummary } from './ConfigSummary';

import { useCampaignPhaseStream } from '@/hooks/useCampaignPhaseStream';
import { 
  useGetCampaignMetricsQuery,
  useGetCampaignFunnelQuery,
  useGetCampaignRecommendationsQuery,
  useGetCampaignStatusQuery
} from '@/store/api/campaignApi';

import type { CampaignKpi } from '../types';

interface CampaignExperiencePageProps {
  className?: string;
}

export function CampaignExperiencePage({ className }: CampaignExperiencePageProps) {
  const params = useParams();
  const campaignId = params?.id as string;

  // Fetch campaign data
  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useGetCampaignMetricsQuery(campaignId);
  const { data: funnelData, isLoading: funnelLoading, error: funnelError } = useGetCampaignFunnelQuery(campaignId);
  const { data: recommendationsData, isLoading: recsLoading } = useGetCampaignRecommendationsQuery(campaignId);
  const { data: statusData } = useGetCampaignStatusQuery(campaignId);

  // Real-time phase updates
  const { phases, isConnected, error: sseError } = useCampaignPhaseStream(campaignId, {
    enabled: true,
    onPhaseUpdate: (event) => {
      console.log('Phase update:', event);
    },
    onError: (error) => {
      console.error('SSE error:', error);
    }
  });

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
  const hasError = metricsError || funnelError || sseError;

  if (hasError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-semibold">Error Loading Campaign</h2>
          <p className="text-gray-600">
            {typeof metricsError === 'string' ? metricsError : 
             typeof funnelError === 'string' ? funnelError : 
             typeof sseError === 'string' ? sseError : 
             'Unknown error occurred'}
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
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-600 dark:text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Pipeline Status Bar */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Pipeline Status</h2>
        <PipelineBar phases={phases} />
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
              config={[
                { label: 'Campaign Type', value: 'Lead Generation', type: 'badge' },
                { label: 'Target Domains', value: '10,000', type: 'number' },
                { label: 'Created', value: new Date().toISOString(), type: 'date' },
                { label: 'Status', value: 'Active', type: 'badge' }
              ]}
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
                recommendations={recommendationsData.recommendations}
              />
            ) : (
              <div className="text-center p-8 text-gray-500">
                <h3 className="text-lg font-medium mb-2">No Recommendations</h3>
                <p>Recommendations will appear based on campaign performance</p>
              </div>
            )}
          </div>

          {/* Additional insights panels can be added here */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border">
            <div className="text-center p-8 text-gray-500">
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p>Classification buckets, momentum analysis, and more insights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}