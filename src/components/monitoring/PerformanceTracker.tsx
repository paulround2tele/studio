import React, { useMemo, useState } from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import { TrendingUpIcon, ClockIcon, ActivityIcon, AlertCircleIcon } from '@/icons';
import { useGetPerformanceMetricsQuery } from '@/store/api/monitoringApi';
import type { PerformanceMetrics } from '@/store/api/monitoringApi';

interface PerformanceTrackerProps {
  variant?: 'full' | 'compact';
  hoursToShow?: number;
}

/**
 * Performance tracking component showing response times, throughput, and error rates
 * Displays data from our monitoring service performance endpoints
 */
export const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({ 
  variant = 'full',
  hoursToShow = 24 
}) => {
  const { 
    data: performanceData, 
    isLoading, 
    error 
  } = useGetPerformanceMetricsQuery({ hours: hoursToShow }, {
    pollingInterval: 60000, // Refresh every minute
  });

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!performanceData || performanceData.length === 0) {
      return {
        avgResponseTime: 0,
        totalThroughput: 0,
        totalRequests: 0,
        avgErrorRate: 0,
        operationTypes: []
      };
    }

    const totalRequests = performanceData.reduce((sum, metric) => 
      sum + metric.success_count + metric.error_count, 0);
    
    const totalErrors = performanceData.reduce((sum, metric) => 
      sum + metric.error_count, 0);
    
    const avgResponseTime = performanceData.reduce((sum, metric) => 
      sum + metric.duration_ms, 0) / performanceData.length;
    
    const totalThroughput = performanceData.reduce((sum, metric) => 
      sum + metric.throughput_per_second, 0);
    
    const avgErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    const operationTypes = [...new Set(performanceData.map(m => m.operation_type))];

    return {
      avgResponseTime,
      totalThroughput,
      totalRequests,
      avgErrorRate,
      operationTypes
    };
  }, [performanceData]);

  // Group metrics by operation type
  const metricsByOperation = useMemo(() => {
    if (!performanceData) return {};
    
    return performanceData.reduce((acc, metric) => {
      if (!acc[metric.operation_type]) {
        acc[metric.operation_type] = [];
      }
      acc[metric.operation_type]!.push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetrics[]>);
  }, [performanceData]);

  // Get performance status color
  const getPerformanceStatus = (avgResponseTime: number, errorRate: number): 'error' | 'warning' | 'success' => {
    if (errorRate > 5 || avgResponseTime > 2000) return 'error';
    if (errorRate > 2 || avgResponseTime > 1000) return 'warning';
    return 'success';
  };

  // Track active tab
  const [activeTab, setActiveTab] = useState<string>(summary.operationTypes[0] || '');

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Performance Tracker
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-brand-500 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Performance Tracker
          </h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <AlertCircleIcon className="h-8 w-8 mr-2" />
            Failed to load performance data
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              Performance
            </span>
            <Badge color={getPerformanceStatus(summary.avgResponseTime, summary.avgErrorRate)}>
              {summary.avgErrorRate.toFixed(1)}% errors
            </Badge>
          </h3>
        </div>
        <div className="p-4 pt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Avg Response</div>
              <div className="font-semibold">{formatDuration(summary.avgResponseTime)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Throughput</div>
              <div className="font-semibold">{summary.totalThroughput.toFixed(1)}/s</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Performance Tracker
          </span>
          <Badge color={getPerformanceStatus(summary.avgResponseTime, summary.avgErrorRate)}>
            {summary.operationTypes.length} operation types
          </Badge>
        </h3>
      </div>
      <div className="p-4 sm:p-6">
        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg Response Time</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(summary.avgResponseTime)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUpIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Throughput</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalThroughput.toFixed(1)}/s</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <ActivityIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Requests</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircleIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Error Rate</span>
            </div>
            <div className={`text-2xl font-bold ${summary.avgErrorRate > 5 ? 'text-red-600' : summary.avgErrorRate > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
              {summary.avgErrorRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Operation Breakdown - Inline Tabs */}
        <div className="w-full">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            {summary.operationTypes.slice(0, 4).map((opType) => (
              <button
                key={opType}
                onClick={() => setActiveTab(opType)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === opType
                    ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {opType.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
          
          {summary.operationTypes.map((opType) => {
            if (activeTab !== opType) return null;
            
            const metrics = metricsByOperation[opType] || [];
            const opSummary = {
              count: metrics.length,
              avgDuration: metrics.reduce((sum, m) => sum + m.duration_ms, 0) / metrics.length,
              totalThroughput: metrics.reduce((sum, m) => sum + m.throughput_per_second, 0),
              totalErrors: metrics.reduce((sum, m) => sum + m.error_count, 0),
              totalSuccess: metrics.reduce((sum, m) => sum + m.success_count, 0),
            };
            
            const errorRate = opSummary.totalSuccess + opSummary.totalErrors > 0 
              ? (opSummary.totalErrors / (opSummary.totalSuccess + opSummary.totalErrors)) * 100 
              : 0;

            return (
              <div key={opType} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Average Duration</div>
                    <div className="text-xl font-semibold">{formatDuration(opSummary.avgDuration)}</div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Throughput</div>
                    <div className="text-xl font-semibold">{opSummary.totalThroughput.toFixed(1)}/s</div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Error Rate</div>
                    <div className={`text-xl font-semibold ${errorRate > 5 ? 'text-red-600' : errorRate > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {errorRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {opSummary.count} samples • {opSummary.totalSuccess} successful • {opSummary.totalErrors} errors
                </div>
              </div>
            );
          })}
        </div>

        {/* No Data Message */}
        {(!performanceData || performanceData.length === 0) && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No performance data available for the last {hoursToShow} hours
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTracker;
