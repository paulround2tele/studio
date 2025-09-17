/**
 * KPI Card Component
 * Displays key performance indicators with values and labels
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  testId: string;
  className?: string;
}

export function KpiCard({ 
  title, 
  value, 
  subtitle, 
  variant = 'default', 
  testId,
  className 
}: KpiCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'danger':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      default:
        return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
    }
  };

  const getValueStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'danger':
        return 'text-red-700 dark:text-red-300';
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-2',
        getVariantStyles(),
        className
      )}
      data-testid={testId}
    >
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
        {title}
      </div>
      <div className={cn('text-2xl font-bold', getValueStyles())}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </div>
      )}
    </div>
  );
}