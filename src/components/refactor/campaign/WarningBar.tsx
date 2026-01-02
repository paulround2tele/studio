/**
 * Warning Bar Component (Phase C)
 * Visual warning distribution bars
 */

import React from 'react';
import { WarningTriangleIcon, AlertCircleIcon, InfoIcon, ActivityIcon } from '@/icons';
import { cn } from '@/lib/utils';

export interface WarningBarData {
  type: 'stuffing' | 'repetition' | 'anchor' | 'general';
  count: number;
  rate: number; // percentage
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface WarningBarProps {
  warnings: WarningBarData[];
  totalDomains: number;
  className?: string;
  showLabels?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

const warningConfig = {
  stuffing: {
    label: 'Stuffing',
    icon: WarningTriangleIcon,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-200 dark:bg-orange-900/40'
  },
  repetition: {
    label: 'Repetition',
    icon: AlertCircleIcon,
    color: 'bg-red-500',
    lightColor: 'bg-red-200 dark:bg-red-900/40'
  },
  anchor: {
    label: 'Anchor',
    icon: ActivityIcon,
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-200 dark:bg-yellow-900/40'
  },
  general: {
    label: 'General',
    icon: InfoIcon,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-200 dark:bg-blue-900/40'
  }
};

const heightConfig = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6'
};

export function WarningBar({ 
  warnings, 
  totalDomains, 
  className,
  showLabels = true,
  height = 'md'
}: WarningBarProps) {
  const totalWarnings = warnings.reduce((sum, w) => sum + w.count, 0);
  
  if (totalDomains === 0) {
    return (
      <div className={cn("", className)}>
        <div className={cn(
          "w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
          heightConfig[height]
        )}>
          <div className="w-full h-full bg-gray-300 dark:bg-gray-600" />
        </div>
        {showLabels && (
          <p className="text-xs text-gray-500 mt-1">No data available</p>
        )}
      </div>
    );
  }

  if (warnings.length === 0 || totalWarnings === 0) {
    return (
      <div className={cn("", className)}>
        <div className={cn(
          "w-full bg-green-200 dark:bg-green-900/40 rounded-full overflow-hidden",
          heightConfig[height]
        )}>
          <div className="w-full h-full bg-green-500" />
        </div>
        {showLabels && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            No warnings detected
          </p>
        )}
      </div>
    );
  }

  // Calculate percentages for stacked bar
  const warningPercentages = warnings.map(warning => ({
    ...warning,
    percentage: (warning.count / totalDomains) * 100
  }));

  const cleanPercentage = ((totalDomains - totalWarnings) / totalDomains) * 100;

  return (
    <div className={cn("", className)}>
      <div className={cn(
        "w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex",
        heightConfig[height]
      )}>
        {/* Clean domains (no warnings) */}
        {cleanPercentage > 0 && (
          <div 
            className="bg-green-500 h-full"
            style={{ width: `${cleanPercentage}%` }}
            title={`${(totalDomains - totalWarnings).toLocaleString()} clean domains`}
          />
        )}
        
        {/* Warning segments */}
        {warningPercentages.map((warning) => {
          const config = warningConfig[warning.type];
          
          if (warning.percentage <= 0) return null;
          
          return (
            <div
              key={warning.type}
              className={cn("h-full", config.color)}
              style={{ width: `${warning.percentage}%` }}
              title={`${warning.count.toLocaleString()} ${config.label} warnings (${warning.rate.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      
      {showLabels && (
        <div className="mt-2 space-y-1">
          {/* Clean domains label */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span className="text-gray-600 dark:text-gray-400">
              Clean: {(totalDomains - totalWarnings).toLocaleString()} domains ({cleanPercentage.toFixed(1)}%)
            </span>
          </div>
          
          {/* Warning labels */}
          {warningPercentages
            .filter(w => w.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((warning) => {
              const config = warningConfig[warning.type];
              const Icon = config.icon;
              
              return (
                <div key={warning.type} className="flex items-center gap-2 text-xs">
                  <div className={cn("w-3 h-3 rounded-sm", config.color)} />
                  <Icon className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {config.label}: {warning.count.toLocaleString()} domains ({warning.rate.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default WarningBar;