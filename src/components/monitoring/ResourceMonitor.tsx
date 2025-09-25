import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Cpu, HardDrive, MemoryStick } from 'lucide-react';
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
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoadingMetrics || isLoadingHealth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Resources
            </span>
            {healthData && (
              <Badge variant={healthData.status === 'healthy' ? 'default' : 'destructive'}>
                {healthData.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {currentMetrics && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>CPU</span>
                <span className={getUsageColor(currentMetrics.cpu_percent)}>
                  {currentMetrics.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <Progress value={currentMetrics.cpu_percent} className="h-2" />
              
              <div className="flex justify-between text-xs">
                <span>Memory</span>
                <span className={getUsageColor(currentMetrics.memory_percent)}>
                  {currentMetrics.memory_percent.toFixed(1)}%
                </span>
              </div>
              <Progress value={currentMetrics.memory_percent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            System Resource Monitor
          </span>
          <div className="flex items-center gap-2">
            {/* SSE Connection Status */}
            <Badge variant={readyState === 1 ? 'default' : 'secondary'}>
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentMetrics ? (
          <div className="grid gap-6 md:grid-cols-3">
            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="font-medium">CPU</span>
                </div>
                <span className={`font-bold ${getUsageColor(currentMetrics.cpu_percent)}`}>
                  {currentMetrics.cpu_percent.toFixed(1)}%
                </span>
              </div>
              <Progress value={currentMetrics.cpu_percent} className="h-3" />
              <p className="text-xs text-muted-foreground">
                System processor utilization
              </p>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4" />
                  <span className="font-medium">Memory</span>
                </div>
                <span className={`font-bold ${getUsageColor(currentMetrics.memory_percent)}`}>
                  {currentMetrics.memory_percent.toFixed(1)}%
                </span>
              </div>
              <Progress value={currentMetrics.memory_percent} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {formatBytes(currentMetrics.memory_used_bytes)} / {formatBytes(currentMetrics.memory_total_bytes)}
              </p>
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="font-medium">Disk</span>
                </div>
                <span className={`font-bold ${getUsageColor(currentMetrics.disk_percent)}`}>
                  {currentMetrics.disk_percent.toFixed(1)}%
                </span>
              </div>
              <Progress value={currentMetrics.disk_percent} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {formatBytes(currentMetrics.disk_used_bytes)} / {formatBytes(currentMetrics.disk_total_bytes)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No resource data available
          </div>
        )}

        {/* Health Issues */}
        {healthData && healthData.issues.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
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
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Last updated: {new Date(currentMetrics.timestamp).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResourceMonitor;
