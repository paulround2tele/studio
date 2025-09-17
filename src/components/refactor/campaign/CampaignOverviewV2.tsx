/**
 * Campaign Overview V2 Component
 * Value-first campaign overview that appears above the legacy domains table
 */

import React from 'react';
import { useGetCampaignEnrichedQuery } from '@/store/api/campaignApi';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

import CampaignKpiCard from './CampaignKpiCard';
import ClassificationBuckets from './ClassificationBuckets';
import WarningSummary from './WarningSummary';
import ConfigSummary from './ConfigSummary';
import PipelineBarContainer from './PipelineBarContainer';

import type { 
  CampaignKpi, 
  ClassificationBucket, 
  CampaignDomain 
} from '../types';

interface CampaignOverviewV2Props {
  campaignId: string;
  className?: string;
}

// TODO: Phase 2 - Replace with actual domain aggregation logic from server
function generateMockData(domains: any[] = []) {
  // Mock KPIs
  const kpis: CampaignKpi[] = [
    {
      label: 'Total Domains',
      value: domains.length,
      format: 'number',
      trend: { direction: 'up', percentage: 12 }
    },
    {
      label: 'Success Rate',
      value: domains.length > 0 ? Math.round((domains.filter((d: any) => d.dns_status === 'ok').length / domains.length) * 100) : 0,
      format: 'percentage',
      trend: { direction: 'up', percentage: 5 }
    },
    {
      label: 'Avg Lead Score',
      value: domains.length > 0 ? Math.round(domains.reduce((sum: number, d: any) => sum + (d.lead_score || 0), 0) / domains.length) : 0,
      format: 'number',
      trend: { direction: 'stable', percentage: 0 }
    },
    {
      label: 'Runtime',
      value: 127,
      format: 'duration',
      trend: { direction: 'down', percentage: 8 }
    }
  ];

  // Mock classification buckets
  const buckets: ClassificationBucket[] = [
    { label: 'High Quality', count: Math.round(domains.length * 0.3), percentage: 30, color: '#10b981' },
    { label: 'Medium Quality', count: Math.round(domains.length * 0.5), percentage: 50, color: '#f59e0b' },
    { label: 'Low Quality', count: Math.round(domains.length * 0.2), percentage: 20, color: '#ef4444' }
  ];

  // Mock warnings
  const warnings = domains.length > 0 && domains.some((d: any) => d.dns_status === 'error') ? [
    {
      id: 'dns-errors',
      type: 'warning' as const,
      title: 'DNS Resolution Issues',
      message: 'Some domains are experiencing DNS resolution failures',
      count: domains.filter((d: any) => d.dns_status === 'error').length
    }
  ] : [];

  // Mock config
  const config = [
    { label: 'Created', value: new Date().toISOString(), type: 'date' as const },
    { label: 'Max Domains', value: 1000, type: 'number' as const },
    { label: 'Pattern', value: 'example-{variation}.com', type: 'text' as const },
    { label: 'Extensions', value: 'com,net,org', type: 'list' as const }
  ];

  return { kpis, buckets, warnings, config };
}

// Convert API domains to our lightweight interface
function convertDomains(apiDomains: any[]): CampaignDomain[] {
  return apiDomains.map(domain => ({
    id: domain.id,
    domain_name: domain.domain_name || domain.domainName || '',
    dns_status: domain.dns_status || 'pending',
    http_status: domain.http_status || 'pending', 
    lead_score: domain.lead_score || 0,
    created_at: domain.created_at || domain.createdAt || new Date().toISOString(),
    updated_at: domain.updated_at || domain.updatedAt || new Date().toISOString()
  }));
}

export function CampaignOverviewV2({ campaignId, className }: CampaignOverviewV2Props) {
  const { data: enriched, isLoading, error } = useGetCampaignEnrichedQuery(campaignId);
  
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="flex items-center gap-2">
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

  // TODO: Phase 2 - Integrate with getDomains query when needed
  // For now, use empty array to show the UI structure with mock data
  const domains = convertDomains([]);
  const { kpis, buckets, warnings, config } = generateMockData(domains);

  return (
    <div className={cn("space-y-6", className)}>
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <CampaignKpiCard 
            key={`${kpi.label}-${index}`}
            kpi={kpi}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <PipelineBarContainer domains={domains} />
          <ClassificationBuckets buckets={buckets} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <WarningSummary warnings={warnings} />
          <ConfigSummary config={config} />
        </div>
      </div>
    </div>
  );
}

export default CampaignOverviewV2;