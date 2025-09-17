/**
 * Warning Summary Component
 * Displays summary of domain warnings and potential issues
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WarningSummaryProps {
  warningRate: number;
  totalDomains: number;
  className?: string;
}

export function WarningSummary({ warningRate, totalDomains, className }: WarningSummaryProps) {
  const warningCount = Math.round(warningRate * totalDomains);
  const warningPercentage = Math.round(warningRate * 100);

  const getWarningVariant = () => {
    if (warningRate === 0) return 'success';
    if (warningRate < 0.2) return 'info';
    if (warningRate < 0.5) return 'warning';
    return 'danger';
  };

  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const variant = getWarningVariant();

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Warning Summary
      </h3>
      <div
        className={cn(
          'rounded-lg border p-4 flex items-center space-x-3',
          getVariantStyles(variant)
        )}
      >
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium">
            {warningCount} of {totalDomains} domains ({warningPercentage}%)
          </div>
          <div className="text-sm opacity-80">
            {variant === 'success'
              ? 'No domains with warnings detected'
              : variant === 'info'
              ? 'Low warning rate - monitoring recommended'
              : variant === 'warning'
              ? 'Moderate warnings - review recommended'
              : 'High warning rate - immediate attention needed'}
          </div>
        </div>
      </div>
    </div>
  );
}