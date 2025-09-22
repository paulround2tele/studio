/**
 * Histogram Component (Phase C)
 * Richness delta histogram visualization - standalone version
 */

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface HistogramBin {
  bucket: string; // e.g., "-0.5 to -0.4", "0.0 to 0.1"
  count: number;
  percentage?: number;
  range?: {
    min: number;
    max: number;
  };
}

interface HistogramProps {
  bins: HistogramBin[];
  title?: string;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  showPercentages?: boolean;
  showStats?: boolean;
  colorScheme?: 'default' | 'diverging' | 'sequential';
  height?: number; // for vertical histograms
}

const colorSchemes = {
  default: {
    positive: 'bg-green-500',
    negative: 'bg-red-500',
    neutral: 'bg-gray-500',
    lightPositive: 'bg-green-200 dark:bg-green-900/40',
    lightNegative: 'bg-red-200 dark:bg-red-900/40',
    lightNeutral: 'bg-gray-200 dark:bg-gray-700'
  },
  diverging: {
    positive: 'bg-blue-500',
    negative: 'bg-orange-500',
    neutral: 'bg-gray-400',
    lightPositive: 'bg-blue-200 dark:bg-blue-900/40',
    lightNegative: 'bg-orange-200 dark:bg-orange-900/40',
    lightNeutral: 'bg-gray-200 dark:bg-gray-700'
  },
  sequential: {
    positive: 'bg-purple-500',
    negative: 'bg-purple-300',
    neutral: 'bg-purple-400',
    lightPositive: 'bg-purple-200 dark:bg-purple-900/40',
    lightNegative: 'bg-purple-100 dark:bg-purple-900/20',
    lightNeutral: 'bg-purple-100 dark:bg-purple-900/30'
  }
};

function getBucketType(bucket: string): 'positive' | 'negative' | 'neutral' {
  // Parse bucket range to determine if it's positive, negative, or neutral
  const match = bucket.match(/([-+]?\d*\.?\d+)\s*to\s*([-+]?\d*\.?\d+)/);
  if (match && match[1] && match[2]) {
    const min = parseFloat(match[1]);
    const max = parseFloat(match[2]);
    
    if (min > 0) return 'positive';
    if (max < 0) return 'negative';
    return 'neutral';
  }
  
  // Fallback: check if bucket contains negative sign
  if (bucket.includes('-')) return 'negative';
  if (bucket.includes('+')) return 'positive';
  return 'neutral';
}

function calculateStats(bins: HistogramBin[]) {
  const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
  const positiveCount = bins
    .filter(bin => getBucketType(bin.bucket) === 'positive')
    .reduce((sum, bin) => sum + bin.count, 0);
  const negativeCount = bins
    .filter(bin => getBucketType(bin.bucket) === 'negative')
    .reduce((sum, bin) => sum + bin.count, 0);
  
  return {
    total: totalCount,
    positive: positiveCount,
    negative: negativeCount,
    neutral: totalCount - positiveCount - negativeCount,
    positiveRate: totalCount > 0 ? (positiveCount / totalCount) * 100 : 0,
    negativeRate: totalCount > 0 ? (negativeCount / totalCount) * 100 : 0
  };
}

export function Histogram({ 
  bins, 
  title = "Distribution",
  className,
  orientation = 'horizontal',
  showPercentages = true,
  showStats = true,
  colorScheme = 'default',
  height = 200
}: HistogramProps) {
  
  if (bins.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No distribution data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...bins.map(b => b.count));
  const stats = calculateStats(bins);
  const colors = colorSchemes[colorScheme];

  // Calculate percentages if not provided
  const binsWithPercentages = bins.map(bin => ({
    ...bin,
    percentage: bin.percentage ?? (stats.total > 0 ? (bin.count / stats.total) * 100 : 0)
  }));

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            {title}
          </CardTitle>
          {showStats && (
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {stats.total} total
              </Badge>
              {stats.positive > 0 && (
                <Badge variant="secondary" className="text-xs text-green-700 bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stats.positiveRate.toFixed(1)}%
                </Badge>
              )}
              {stats.negative > 0 && (
                <Badge variant="secondary" className="text-xs text-red-700 bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {stats.negativeRate.toFixed(1)}%
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {orientation === 'horizontal' ? (
          <div className="space-y-3">
            {binsWithPercentages.map((bin, index) => {
              const bucketType = getBucketType(bin.bucket);
              const barColor = colors[bucketType];
              const lightColor = colors[`light${bucketType.charAt(0).toUpperCase() + bucketType.slice(1)}` as keyof typeof colors];
              const widthPercentage = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right font-mono">
                    {bin.bucket}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    <div className={cn("h-6 rounded-sm relative overflow-hidden", lightColor)} style={{ width: '100%' }}>
                      <div 
                        className={cn("h-full transition-all duration-300 rounded-sm", barColor)}
                        style={{ 
                          width: `${widthPercentage}%`,
                          minWidth: bin.count > 0 ? '2px' : '0'
                        }}
                      />
                    </div>
                    
                    <div className="w-12 text-xs text-gray-600 dark:text-gray-400 text-right">
                      {bin.count}
                    </div>
                    
                    {showPercentages && (
                      <div className="w-12 text-xs text-gray-500 text-right">
                        {bin.percentage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2" style={{ height }}>
            {binsWithPercentages.map((bin, index) => {
              const bucketType = getBucketType(bin.bucket);
              const barColor = colors[bucketType];
              const heightPercentage = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
              
              return (
                <div key={index} className="flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    {bin.count}
                  </div>
                  
                  <div 
                    className={cn("w-8 transition-all duration-300 rounded-t-sm", barColor)}
                    style={{ 
                      height: `${heightPercentage}%`,
                      minHeight: bin.count > 0 ? '2px' : '0'
                    }}
                    title={`${bin.bucket}: ${bin.count} (${bin.percentage.toFixed(1)}%)`}
                  />
                  
                  <div className="text-xs text-gray-500 text-center transform -rotate-45 origin-center whitespace-nowrap">
                    {bin.bucket}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {showStats && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-medium text-green-600 dark:text-green-400">
                  {stats.positive}
                </div>
                <div className="text-gray-500">Positive</div>
              </div>
              <div>
                <div className="font-medium text-gray-600 dark:text-gray-400">
                  {stats.neutral}
                </div>
                <div className="text-gray-500">Neutral</div>
              </div>
              <div>
                <div className="font-medium text-red-600 dark:text-red-400">
                  {stats.negative}
                </div>
                <div className="text-gray-500">Negative</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Histogram;