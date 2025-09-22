/**
 * Funnel Snapshot Component (Phase C)
 * 7-stage conversion funnel visualization
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface FunnelData {
  generated: number;
  dnsValid: number;
  httpValid: number;
  keywordHits: number;
  analyzed: number;
  highPotential: number;
  leads: number;
}

interface FunnelSnapshotProps {
  data: FunnelData;
  className?: string;
  showLabels?: boolean;
  showPercentages?: boolean;
}

function FunnelStageComponent({ 
  stage, 
  maxCount, 
  showLabels = true, 
  showPercentages = true 
}: { 
  stage: FunnelStage; 
  maxCount: number; 
  showLabels?: boolean; 
  showPercentages?: boolean; 
}) {
  const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
  const backgroundColor = stage.color || '#3B82F6';
  
  return (
    <div className="relative mb-3">
      {showLabels && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {stage.name}
          </span>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-mono">{stage.count.toLocaleString()}</span>
            {showPercentages && (
              <span className="text-xs">({stage.percentage.toFixed(1)}%)</span>
            )}
          </div>
        </div>
      )}
      <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        <div 
          className="h-full rounded-lg transition-all duration-500 ease-out flex items-center justify-center"
          style={{ 
            width: `${width}%`, 
            backgroundColor,
            minWidth: stage.count > 0 ? '2rem' : '0'
          }}
        >
          {stage.count > 0 && (
            <span className="text-white text-xs font-medium px-2 truncate">
              {stage.count.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function FunnelSnapshot({ 
  data, 
  className, 
  showLabels = true, 
  showPercentages = true 
}: FunnelSnapshotProps) {
  const stages: FunnelStage[] = [
    {
      name: 'Generated',
      count: data.generated,
      percentage: 100,
      color: '#8B5CF6'
    },
    {
      name: 'DNS Valid',
      count: data.dnsValid,
      percentage: data.generated > 0 ? (data.dnsValid / data.generated) * 100 : 0,
      color: '#06B6D4'
    },
    {
      name: 'HTTP Valid',
      count: data.httpValid,
      percentage: data.generated > 0 ? (data.httpValid / data.generated) * 100 : 0,
      color: '#10B981'
    },
    {
      name: 'Keyword Hits',
      count: data.keywordHits,
      percentage: data.generated > 0 ? (data.keywordHits / data.generated) * 100 : 0,
      color: '#F59E0B'
    },
    {
      name: 'Analyzed',
      count: data.analyzed,
      percentage: data.generated > 0 ? (data.analyzed / data.generated) * 100 : 0,
      color: '#EF4444'
    },
    {
      name: 'High Potential',
      count: data.highPotential,
      percentage: data.generated > 0 ? (data.highPotential / data.generated) * 100 : 0,
      color: '#8B5CF6'
    },
    {
      name: 'Leads',
      count: data.leads,
      percentage: data.generated > 0 ? (data.leads / data.generated) * 100 : 0,
      color: '#059669'
    }
  ];

  const maxCount = Math.max(...stages.map(s => s.count));

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Conversion Funnel
        </h3>
        <div className="text-sm text-gray-500">
          {data.generated > 0 && data.leads > 0 && (
            <span>
              Conversion Rate: {((data.leads / data.generated) * 100).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      
      {stages.map((stage, index) => (
        <FunnelStageComponent
          key={`${stage.name}-${index}`}
          stage={stage}
          maxCount={maxCount}
          showLabels={showLabels}
          showPercentages={showPercentages}
        />
      ))}
      
      {maxCount === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No funnel data available</p>
          <p className="text-sm">Data will appear as campaign progresses</p>
        </div>
      )}
    </div>
  );
}