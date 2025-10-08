/**
 * Pipeline Bar Container Component
 * Wraps PipelineBar with campaign-specific logic
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PipelineBar from '../shared/PipelineBar';
import type { CampaignDomain, PipelineSegment } from '../types';

interface PipelineBarContainerProps {
  domains: CampaignDomain[];
  title?: string;
  className?: string;
  showLabels?: boolean;
}

// Define colors for different statuses
const STATUS_COLORS = {
  pending: '#f59e0b', // amber-500
  ok: '#10b981',      // emerald-500
  error: '#ef4444',   // red-500
  timeout: '#6b7280'  // gray-500
} as const;

function generatePipelineSegments(domains: CampaignDomain[]): PipelineSegment[] {
  if (domains.length === 0) return [];

  // Aggregate domains by their DNS and HTTP status
  const dnsStats = domains.reduce((acc, domain) => {
    acc[domain.dns_status] = (acc[domain.dns_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const httpStats = domains.reduce((acc, domain) => {
    acc[domain.http_status] = (acc[domain.http_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const segments: PipelineSegment[] = [];
  const totalDomains = domains.length;

  // DNS phase segments
  Object.entries(dnsStats).forEach(([status, count]) => {
    if (count > 0) {
      segments.push({
        phase: `DNS ${status}`,
        status: (['not_started','in_progress','completed','failed'].includes(status) ? status : 'not_started') as 'not_started' | 'in_progress' | 'completed' | 'failed',
        count,
        percentage: Math.round((count / totalDomains) * 100),
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending
      });
    }
  });

  // HTTP phase segments
  Object.entries(httpStats).forEach(([status, count]) => {
    if (count > 0) {
      segments.push({
        phase: `HTTP ${status}`,
        status: (['not_started','in_progress','completed','failed'].includes(status) ? status : 'not_started') as 'not_started' | 'in_progress' | 'completed' | 'failed',
        count,
        percentage: Math.round((count / totalDomains) * 100),
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending
      });
    }
  });

  return segments;
}

export function PipelineBarContainer({ 
  domains,
  title = "Pipeline Progress",
  className,
  showLabels = true
}: PipelineBarContainerProps) {
  const segments = generatePipelineSegments(domains);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {domains.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No domains available for pipeline visualization
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {domains.length} domain{domains.length !== 1 ? 's' : ''} in pipeline
            </div>
            <PipelineBar 
              segments={segments}
              showLabels={showLabels}
              height={12}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PipelineBarContainer;