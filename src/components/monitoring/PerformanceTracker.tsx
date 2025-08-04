import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Clock, Activity, AlertCircle } from 'lucide-react';
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
      acc[metric.operation_type].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetrics[]>);
  }, [performanceData]);

  // Get performance status color
  const getPerformanceStatus = (avgResponseTime: number, errorRate: number) => {
    if (errorRate > 5 || avgResponseTime > 2000) return 'destructive';
    if (errorRate > 2 || avgResponseTime > 1000) return 'secondary';
    return 'default';
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Tracker
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mr-2" />
            Failed to load performance data
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
              <Activity className="h-4 w-4" />
              Performance
            </span>
            <Badge variant={getPerformanceStatus(summary.avgResponseTime, summary.avgErrorRate)}>
              {summary.avgErrorRate.toFixed(1)}% errors
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Avg Response</div>
              <div className="font-semibold">{formatDuration(summary.avgResponseTime)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Throughput</div>
              <div className="font-semibold">{summary.totalThroughput.toFixed(1)}/s</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Tracker
          </span>
          <Badge variant={getPerformanceStatus(summary.avgResponseTime, summary.avgErrorRate)}>
            {summary.operationTypes.length} operation types
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Response Time</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(summary.avgResponseTime)}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Throughput</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalThroughput.toFixed(1)}/s</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Requests</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Error Rate</span>
            </div>
            <div className={`text-2xl font-bold ${summary.avgErrorRate > 5 ? 'text-red-600' : summary.avgErrorRate > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
              {summary.avgErrorRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Operation Breakdown */}
        <Tabs defaultValue={summary.operationTypes[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.min(summary.operationTypes.length, 4)}, 1fr)` }}>
            {summary.operationTypes.slice(0, 4).map((opType) => (
              <TabsTrigger key={opType} value={opType} className="text-xs">
                {opType.replace('_', ' ').toUpperCase()}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {summary.operationTypes.map((opType) => {
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
              <TabsContent key={opType} value={opType} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Average Duration</div>
                    <div className="text-xl font-semibold">{formatDuration(opSummary.avgDuration)}</div>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Throughput</div>
                    <div className="text-xl font-semibold">{opSummary.totalThroughput.toFixed(1)}/s</div>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Error Rate</div>
                    <div className={`text-xl font-semibold ${errorRate > 5 ? 'text-red-600' : errorRate > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {errorRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {opSummary.count} samples • {opSummary.totalSuccess} successful • {opSummary.totalErrors} errors
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* No Data Message */}
        {(!performanceData || performanceData.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            No performance data available for the last {hoursToShow} hours
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceTracker;
