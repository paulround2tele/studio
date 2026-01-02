/**
 * Classification Buckets Component (Phase C)
 * Domain distribution across quality buckets with sample domains
 */

import React from 'react';
import { cn } from '@/lib/utils';
import Badge from '@/components/ta/ui/badge/Badge';

export interface ClassificationBucket {
  name: string;
  count: number;
  percentage: number;
  color: string;
  samples?: Array<{
    domain: string;
    richness?: number;
  }>;
}

interface ClassificationBucketsProps {
  buckets: ClassificationBucket[];
  className?: string;
  showSamples?: boolean;
  maxSamples?: number;
}

function BucketCard({ bucket, showSamples = true, maxSamples = 3 }: { 
  bucket: ClassificationBucket; 
  showSamples?: boolean; 
  maxSamples?: number; 
}) {
  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {bucket.name}
        </h3>
        <Badge 
          color="light" 
          size="sm"
        >
          {bucket.percentage.toFixed(1)}%
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: bucket.color }}
        />
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {bucket.count.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500">domains</span>
      </div>

      {showSamples && bucket.samples && bucket.samples.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sample Domains
          </h4>
          <div className="space-y-1">
            {bucket.samples.slice(0, maxSamples).map((sample, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 truncate">
                  {sample.domain}
                </span>
                {sample.richness !== undefined && (
                  <span className="text-xs text-gray-500 ml-2">
                    {sample.richness.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
            {bucket.samples.length > maxSamples && (
              <div className="text-xs text-gray-500 mt-1">
                +{bucket.samples.length - maxSamples} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ClassificationBuckets({ 
  buckets, 
  className, 
  showSamples = true, 
  maxSamples = 3 
}: ClassificationBucketsProps) {
  if (!buckets || buckets.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <h3 className="text-lg font-medium mb-2">No Classification Data</h3>
        <p className="text-sm">Domain classifications will appear once analysis is complete</p>
      </div>
    );
  }

  const totalDomains = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Domain Classifications
        </h3>
        <div className="text-sm text-gray-500">
          {totalDomains.toLocaleString()} total domains
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {buckets.map((bucket, index) => (
          <BucketCard
            key={`${bucket.name}-${index}`}
            bucket={bucket}
            showSamples={showSamples}
            maxSamples={maxSamples}
          />
        ))}
      </div>
    </div>
  );
}