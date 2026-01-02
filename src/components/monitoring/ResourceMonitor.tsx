import React, { useState } from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import { WarningTriangleIcon, CheckCircleIcon, XCircleIcon, CpuIcon, HardDriveIcon, MemoryStickIcon } from '@/icons';
import { useGetResourceMetricsQuery, useGetSystemHealthQuery } from '@/store/api/monitoringApi';
import { useSSE } from '@/hooks/useSSE';
import type { ResourceMetrics } from '@/store/api/monitoringApi';

interface ResourceMonitorProps {
  variant?: 'full' | 'compact';
  refreshInterval?: number;
}

/**
 * Real-time resource monitoring component
 * Displays CPU, memory, and disk usage with SSE updates
 */
export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({ 
  variant = 'full',
  refreshInterval = 30000 // 30 seconds
}) => {
  const [realTimeMetrics, setRealTimeMetrics] = useState<ResourceMetrics | null>(null);
  
  // Initial data fetch with polling fallback
  const { 
    data: initialMetrics, 
    isLoading: isLoadingMetrics,
  refetch: _refetchMetrics 
  } = useGetResourceMetricsQuery(undefined, {
    pollingInterval: refreshInterval,
  });

  const { 
    data: healthData, 
    isLoading: isLoadingHealth 
  } = useGetSystemHealthQuery(undefined, {
    pollingInterval: refreshInterval,
  });

  // SSE connection for real-time updates
  const { readyState } = useSSE(
    '/api/v2/monitoring/stream',
    (event) => {
      if (event.event === 'resource_update') {
        setRealTimeMetrics(event.data as ResourceMetrics);
      }
    },
    {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
    }
  );

  // Use real-time data if available, fallback to polled data
  const currentMetrics = realTimeMetrics || initialMetrics;

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status color based on usage percentage
  const getUsageColor = (percentage: number): string => {
    if (percentage < 70) return 'text-green-600';
    if (percentage < 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get status icon based on health status
  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'degraded': return <WarningTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <XCircleIcon className="h-4 w-4 text-red-600" />;
      default: return <WarningTriangleIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoadingMetrics || isLoadingHealth) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center gap-2">
            <CpuIcon className="h-5 w-5" />
            System Resources
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

  if (variant === 'compact') {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CpuIcon className="h-4 w-4" />
              Resources
            </span>
            {healthData && (
              <Badge color={healthData.status === 'healthy' ? 'success' : 'error'}>
                {healthData.status}
              </Badge>
            )}
          </h3>
        </div>
        <div className="p-4 pt-2">
          {currentMetrics && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>CPU</span>
                <span className={getUsageColor(currentMetrics.cpu_percent)}>
                  {currentMetrics.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div className="h-2 rounded-full bg-brand-500" style={{ width: `${currentMetrics.cpu_percent}%` }} />
              </div>
              
              <div className="flex justify-between text-xs">
                <span>Memory</span>
                <span className={getUsageColor(currentMetrics.memory_percent)}>
                  {currentMetrics.memory_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div className="h-2 rounded-full bg-brand-500" style={{ width: `${currentMetrics.memory_percent}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CpuIcon className="h-5 w-5" />
            System Resource Monitor
          </span>
          <div className="flex items-center gap-2">
            {/* SSE Connection Status */}
            <Badge color={readyState === 1 ? 'success' : 'light'}>
              {readyState === 1 ? 'Live' : 'Polling'}
            </Badge>
            {/* System Health Status */}
            {healthData && (
              <div className="flex items-center gap-1">
                {getHealthIcon(healthData.status)}
                <span className="text-sm capitalize">{healthData.status}</span>
              </div>
            )}
          </div>
        </h3>
      </div>
      <div className="p-4 sm:p-6">
        {currentMetrics ? (
          <div className="grid gap-6 md:grid-cols-3">
            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CpuIcon className="h-4 w-4" />
                  <span className="font-medium">CPU</span>
                </div>
                <span className={`font-bold ${getUsageColor(currentMetrics.cpu_percent)}`}>
                  {currentMetrics.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                <div className="h-3 rounded-full bg-brand-500" style={{ width: `${currentMetrics.cpu_percent}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                System processor utilization
              </p>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStickIcon className="h-4 w-4" />
                  <span className="font-medium">Memory</span>
                </div>
                <span className={`font-bold ${getUsageColor(currentMetrics.memory_percent)}`}>
                  {currentMetrics.memory_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                <div className="h-3 rounded-full bg-brand-500" style={{ width: `${currentMetrics.memory_percent}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatBytes(currentMetrics.memory_used_bytes)} / {formatBytes(currentMetrics.memory_total_bytes)}
              </p>
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDriveIcon className="h-4 w-4" />
                  <span className="font-medium">Disk</span>
                </div>
                <span className={`font-bold ${getUsageColor(currentMetrics.disk_percent)}`}>
                  {currentMetrics.disk_percent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                <div className="h-3 rounded-full bg-brand-500" style={{ width: `${currentMetrics.disk_percent}%` }} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatBytes(currentMetrics.disk_used_bytes)} / {formatBytes(currentMetrics.disk_total_bytes)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No resource data available
          </div>
        )}

        {/* Health Issues */}
        {healthData && healthData.issues.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <WarningTriangleIcon className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">System Issues</span>
            </div>
            <ul className="text-sm text-yellow-700 space-y-1">
              {healthData.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Last Update */}
        {currentMetrics && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            Last updated: {new Date(currentMetrics.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceMonitor;
