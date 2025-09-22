/**
 * Warning Pills Component (Phase C)
 * Warning type indicator pills
 */

import React from 'react';
import { AlertTriangle, AlertCircle, Info, Activity, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface WarningPillData {
  type: 'stuffing' | 'repetition' | 'anchor' | 'general';
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  active?: boolean; // for filtering/selection
}

interface WarningPillsProps {
  warnings: WarningPillData[];
  onPillClick?: (type: WarningPillData['type']) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  showClean?: boolean; // show "no warnings" pill when warnings.length === 0
}

const warningConfig = {
  stuffing: {
    label: 'Keyword Stuffing',
    shortLabel: 'Stuffing',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400'
  },
  repetition: {
    label: 'Content Repetition',
    shortLabel: 'Repetition',
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400'
  },
  anchor: {
    label: 'Anchor Share Issues',
    shortLabel: 'Anchor',
    icon: Activity,
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  general: {
    label: 'General Warnings',
    shortLabel: 'General',
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400'
  }
};

const severityConfig = {
  low: {
    variant: 'secondary' as const,
    className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  },
  medium: {
    variant: 'outline' as const,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
  },
  high: {
    variant: 'destructive' as const,
    className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  },
  critical: {
    variant: 'destructive' as const,
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300'
  }
};

const sizeConfig = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1',
  lg: 'text-sm px-4 py-2'
};

export function WarningPills({ 
  warnings, 
  onPillClick,
  className,
  size = 'md',
  variant = 'default',
  showClean = true
}: WarningPillsProps) {
  
  if (warnings.length === 0) {
    if (!showClean) return null;
    
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Badge 
          variant="default"
          className={cn(
            "flex items-center gap-1.5 bg-green-50 text-green-700 border-green-200",
            "dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
            sizeConfig[size],
            onPillClick && "cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40"
          )}
          onClick={onPillClick ? () => {} : undefined}
        >
          <CheckCircle className="w-3 h-3" />
          No Warnings
        </Badge>
      </div>
    );
  }

  // Sort by severity (critical first) and then by count
  const sortedWarnings = [...warnings].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.count - a.count;
  });

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {sortedWarnings.map((warning) => {
        const config = warningConfig[warning.type];
        const severityConf = severityConfig[warning.severity];
        const Icon = config.icon;
        
        const isClickable = onPillClick !== undefined;
        
        return (
          <Badge
            key={warning.type}
            variant={severityConf.variant}
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              severityConf.className,
              sizeConfig[size],
              warning.active && "ring-2 ring-blue-500 ring-offset-1",
              isClickable && "cursor-pointer hover:brightness-110",
              variant === 'compact' && "px-2 py-0.5"
            )}
            onClick={isClickable ? () => onPillClick(warning.type) : undefined}
          >
            <Icon className="w-3 h-3 shrink-0" />
            
            {variant === 'detailed' ? (
              <>
                <span className="font-medium">{config.shortLabel}</span>
                <span className="text-xs opacity-75">
                  ({warning.count})
                </span>
              </>
            ) : variant === 'compact' ? (
              <span className="font-medium text-xs">
                {warning.count}
              </span>
            ) : (
              <>
                <span className="font-medium">{config.shortLabel}</span>
                <span className="bg-white/20 dark:bg-black/20 px-1.5 py-0.5 rounded text-xs">
                  {warning.count}
                </span>
              </>
            )}
          </Badge>
        );
      })}
    </div>
  );
}

export default WarningPills;