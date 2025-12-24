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
  /** Current phase to determine early-stage display */
  currentPhase?: string;
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
  showPercentages = true,
  currentPhase,
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
      name: 'HTTP Enriched',
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
  
  // Determine if we're in early pipeline stages where funnel data is incomplete
  const isGenerationPhase = currentPhase && (
    currentPhase.includes('generation') || 
    currentPhase.includes('discovery') ||
    currentPhase === 'domain_generation'
  );
  const isEarlyStage = data.generated > 0 && data.dnsValid === 0 && data.httpValid === 0;

  const firstStage = stages[0];
  
  // Show simplified view during early stages (generation or pre-validation)
  if ((isEarlyStage || isGenerationPhase) && data.dnsValid === 0 && firstStage) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Conversion Funnel
          </h3>
        </div>
        
        <FunnelStageComponent
          stage={firstStage}
          maxCount={firstStage.count}
          showLabels={showLabels}
          showPercentages={showPercentages}
        />
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>
            {isGenerationPhase && data.dnsValid === 0 
              ? 'Generating domains... Funnel will populate after DNS & HTTP validation begins.' 
              : 'Waiting for DNS & HTTP validation to begin...'}
          </span>
        </div>
      </div>
    );
  }

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
      
      {/* Warning when HTTP enrichment completed but no keyword matches found */}
      {data.httpValid > 0 && data.keywordHits === 0 && data.analyzed === 0 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium">No keyword matches found</p>
              <p className="mt-1 text-xs opacity-80">
                {data.httpValid.toLocaleString()} domains were HTTP validated, but none contained your configured keywords. 
                Check your keyword configuration or try broader search terms.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {maxCount === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No funnel data available</p>
          <p className="text-sm">Data will appear as campaign progresses</p>
        </div>
      )}
    </div>
  );
}