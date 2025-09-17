/**
 * Campaign Overview V2 Component
 * Value-first campaign overview with KPIs, classification, and pipeline visualization
 */

import React from 'react';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignResponse } from '@/lib/api-client/models';
import type { DomainFeatures } from '@/lib/campaignMetrics/classification';
import { useCampaignAggregates } from '@/hooks/refactor/useCampaignAggregates';
import { PipelineBar } from '../pipeline/PipelineBar';
import { KpiCard } from './KpiCard';
import { ClassificationBuckets } from './ClassificationBuckets';
import { WarningSummary } from './WarningSummary';
import { ConfigSummary } from './ConfigSummary';

interface CampaignOverviewV2Props {
  campaign: CampaignResponse;
  domains: DomainFeatures[];
  phaseExecutions?: Record<string, any>;
  className?: string;
}

function BetaBanner() {
  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
      <div className="flex items-center space-x-2">
        <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Beta Feature
        </span>
        <span className="text-sm text-blue-600 dark:text-blue-400">
          This is the new value-first campaign overview. Feedback welcome!
        </span>
      </div>
    </div>
  );
}

export function CampaignOverviewV2({ 
  campaign, 
  domains, 
  phaseExecutions, 
  className 
}: CampaignOverviewV2Props) {
  const aggregates = useCampaignAggregates(domains);

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;
  const formatDecimal = (value: number) => value.toFixed(3);

  return (
    <div className={cn('space-y-6', className)} data-testid="campaign-overview-v2">
      <BetaBanner />

      {/* Pipeline Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Pipeline Progress
          </h2>
        </div>
        <PipelineBar 
          currentPhase={campaign.currentPhase} 
          phaseExecutions={phaseExecutions}
        />
      </div>

      {/* Key Performance Indicators */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Key Performance Indicators
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Total Domains"
            value={aggregates.totalDomains}
            testId="kpi-total-domains"
          />
          <KpiCard
            title="Lead Candidates"
            value={aggregates.leads}
            variant={aggregates.leads > 0 ? 'success' : 'default'}
            subtitle={`${aggregates.classification.lead_candidate} confirmed`}
            testId="kpi-leads"
          />
          <KpiCard
            title="Mean Richness"
            value={formatDecimal(aggregates.meanRichness)}
            variant={aggregates.meanRichness > 0.7 ? 'success' : aggregates.meanRichness > 0.5 ? 'warning' : 'default'}
            testId="kpi-richness"
          />
          <KpiCard
            title="Warning Rate"
            value={formatPercentage(aggregates.warningRate)}
            variant={aggregates.warningRate < 0.2 ? 'success' : aggregates.warningRate < 0.5 ? 'warning' : 'danger'}
            testId="kpi-warnings"
          />
        </div>
      </div>

      {/* Domain Classification */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <ClassificationBuckets classification={aggregates.classification} />
      </div>

      {/* Warning Summary and Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <WarningSummary 
            warningRate={aggregates.warningRate}
            totalDomains={aggregates.totalDomains}
          />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <ConfigSummary campaign={campaign} />
        </div>
      </div>
    </div>
  );
}