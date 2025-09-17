/**
 * PipelineBar Component
 * Visualizes campaign pipeline progress with phase segments
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { PipelineSegment } from '../types';

interface PipelineBarProps {
  segments: PipelineSegment[];
  className?: string;
  showLabels?: boolean;
  height?: number;
}

export function PipelineBar({ 
  segments, 
  className,
  showLabels = true,
  height = 8
}: PipelineBarProps) {
  const totalCount = segments.reduce((sum, segment) => sum + segment.count, 0);
  
  if (totalCount === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <div 
          className="w-full bg-gray-200 dark:bg-gray-700 rounded-full" 
          style={{ height: `${height}px` }}
        >
          <div className="w-full h-full bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">No data</span>
          </div>
        </div>
        {showLabels && (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            No pipeline data available
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Pipeline bar */}
      <div 
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
        role="list"
        aria-label="Campaign pipeline progress"
      >
        {segments.map((segment, index) => {
          const widthPercent = (segment.count / totalCount) * 100;
          
          if (widthPercent < 0.5) return null; // Don't show very small segments
          
          return (
            <div
              key={`${segment.phase}-${index}`}
              className="h-full inline-block"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: segment.color
              }}
              aria-label={`${segment.phase}: ${segment.count} domains (${segment.percentage}%)`}
              title={`${segment.phase}: ${segment.count} domains`}
            />
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex flex-wrap gap-4 text-sm">
          {segments.map((segment, index) => (
            <div 
              key={`${segment.phase}-label-${index}`}
              className="flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {segment.phase}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                ({segment.count})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PipelineBar;