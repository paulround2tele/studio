/**
 * Pipeline Bar Container Component
 * @deprecated Use PipelineTimeline component directly instead
 * This component is maintained for backward compatibility with CampaignOverviewV2
 */

import React from 'react';
import { cn } from '@/lib/utils';
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
    <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
      <div className="p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="px-6 pb-6">
        {domains.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No domains available for pipeline visualization
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {domains.length} domain{domains.length !== 1 ? 's' : ''} in pipeline
            </div>
            {/* Simple inline bar visualization for backward compatibility */}
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              {segments.map((segment, index) => (
                <div
                  key={`${segment.phase}-${index}`}
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: `${segment.count > 0 ? Math.max(5, (segment.count / domains.length) * 100) : 0}%`,
                    backgroundColor: segment.color
                  }}
                  title={showLabels ? `${segment.phase}: ${segment.count}` : undefined}
                />
              ))}
            </div>
            {showLabels && (
              <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
                {segments.map((segment, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: segment.color }}
                    />
                    <span>{segment.phase}: {segment.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PipelineBarContainer;