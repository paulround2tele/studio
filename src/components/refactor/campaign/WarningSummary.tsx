/**
 * Warning Summary Component
 * Displays campaign warnings and issues
 */

import React from 'react';
import { WarningTriangleIcon, AlertCircleIcon, InfoIcon, CheckCircleIcon } from '@/icons';
import Badge from '@/components/ta/ui/badge/Badge';
import { cn } from '@/lib/utils';

interface Warning {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  count?: number;
}

interface WarningSummaryProps {
  warnings: Warning[];
  className?: string;
}

function getWarningIcon(type: Warning['type']) {
  switch (type) {
    case 'error':
      return <AlertCircleIcon className="w-4 h-4 text-red-500" />;
    case 'warning':
      return <WarningTriangleIcon className="w-4 h-4 text-yellow-500" />;
    case 'info':
      return <InfoIcon className="w-4 h-4 text-blue-500" />;
    case 'success':
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    default:
      return <InfoIcon className="w-4 h-4 text-gray-500" />;
  }
}

function _getWarningVariant(type: Warning['type']): 'default' | 'destructive' {
  return type === 'error' ? 'destructive' : 'default';
}

function getBadgeColor(type: Warning['type']): 'error' | 'warning' | 'success' | 'info' | 'light' {
  switch (type) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'success':
      return 'success';
    case 'info':
    default:
      return 'info';
  }
}

export function WarningSummary({ warnings, className }: WarningSummaryProps) {
  if (warnings.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
        <div className="p-6">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    );
  }

  // Group warnings by type for summary
  const summary = warnings.reduce((acc, warning) => {
    acc[warning.type] = (acc[warning.type] || 0) + (warning.count || 1);
    return acc;
  }, {} as Record<Warning['type'], number>);

  return (
    <div className={cn("rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]", className)}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">System Status</h3>
          <div className="flex gap-2">
            {Object.entries(summary).map(([type, count]) => (
              <Badge 
                key={type}
                color={getBadgeColor(type as Warning['type'])}
                size="sm"
              >
                {count} {type}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="px-6 pb-6">
        <div className="space-y-3">
          {warnings.map((warning) => (
            <div 
              key={warning.id}
              className={cn(
                "py-3 px-4 rounded-lg border",
                warning.type === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                warning.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                warning.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
              )}
            >
              <div className="flex items-start gap-3">
                {getWarningIcon(warning.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">
                      {warning.title}
                    </h4>
                    {warning.count && warning.count > 1 && (
                      <Badge color="light" size="sm">
                        {warning.count}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {warning.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WarningSummary;