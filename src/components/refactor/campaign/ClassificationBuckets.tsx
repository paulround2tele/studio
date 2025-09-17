/**
 * Classification Buckets Component
 * Shows domain classification analysis in buckets
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClassificationBucket } from '../types';

interface ClassificationBucketsProps {
  buckets: ClassificationBucket[];
  title?: string;
  className?: string;
}

export function ClassificationBuckets({ 
  buckets, 
  title = "Domain Classification",
  className 
}: ClassificationBucketsProps) {
  const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  
  if (buckets.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 dark:text-gray-400 text-center py-4">
            No classification data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex rounded-lg overflow-hidden h-3 bg-gray-200 dark:bg-gray-700">
            {buckets.map((bucket, index) => (
              <div
                key={`${bucket.label}-${index}`}
                className="h-full"
                style={{
                  width: `${bucket.percentage}%`,
                  backgroundColor: bucket.color
                }}
                title={`${bucket.label}: ${bucket.count} domains (${bucket.percentage}%)`}
              />
            ))}
          </div>

          {/* Bucket details */}
          <div className="space-y-3">
            {buckets.map((bucket, index) => (
              <div 
                key={`${bucket.label}-detail-${index}`}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: bucket.color }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {bucket.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {bucket.count}
                  </Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {bucket.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-gray-900 dark:text-gray-100">Total</span>
              <span className="text-gray-900 dark:text-gray-100">{totalCount} domains</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClassificationBuckets;