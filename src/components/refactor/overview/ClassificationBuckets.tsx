/**
 * Classification Buckets Component
 * Displays domain classification counts in organized buckets
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { ClassificationCounts } from '@/lib/campaignMetrics/classification';

interface ClassificationBucketsProps {
  classification: ClassificationCounts;
  className?: string;
}

interface BucketConfig {
  key: keyof ClassificationCounts;
  label: string;
  description: string;
  variant: 'success' | 'warning' | 'danger' | 'default' | 'info';
}

const BUCKET_CONFIG: BucketConfig[] = [
  {
    key: 'lead_candidate',
    label: 'Lead Candidates',
    description: 'Domains with confirmed matches',
    variant: 'success',
  },
  {
    key: 'high_potential',
    label: 'High Potential',
    description: 'Strong richness and gain metrics',
    variant: 'success',
  },
  {
    key: 'emerging',
    label: 'Emerging',
    description: 'Good richness, developing gain',
    variant: 'info',
  },
  {
    key: 'at_risk',
    label: 'At Risk',
    description: 'Moderate metrics, needs attention',
    variant: 'warning',
  },
  {
    key: 'low_value',
    label: 'Low Value',
    description: 'Below threshold performance',
    variant: 'danger',
  },
  {
    key: 'other',
    label: 'Other',
    description: 'Unclassified domains',
    variant: 'default',
  },
];

function ClassificationBucket({ 
  config, 
  count 
}: { 
  config: BucketConfig; 
  count: number; 
}) {
  const getVariantStyles = () => {
    switch (config.variant) {
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

  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-center space-y-1',
        getVariantStyles()
      )}
      data-testid={`bucket-${config.key}`}
    >
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm font-medium">{config.label}</div>
      <div className="text-xs opacity-80">{config.description}</div>
    </div>
  );
}

export function ClassificationBuckets({ classification, className }: ClassificationBucketsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Domain Classification
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {BUCKET_CONFIG.map(config => (
          <ClassificationBucket
            key={config.key}
            config={config}
            count={classification[config.key]}
          />
        ))}
      </div>
    </div>
  );
}