/**
 * Metrics Debug Panel (Phase 4, Updated for Phase 5)
 * Development debugging panel for metrics inspection
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getPerformanceStats, getTimingStats, clearPerformanceData, exportPerformanceData } from '@/services/campaignMetrics/metricsPerf';
import { getMemoryStats } from '@/services/campaignMetrics/historyStore';
import { getStreamPoolStats } from '@/services/campaignMetrics/streamPool';
import { getTelemetryStatus } from '@/services/campaignMetrics/telemetryService';
import type { ConnectionState } from '@/services/campaignMetrics/progressChannel';
import type { AggregateSnapshot, DeltaMetrics as CoreDeltaMetrics, Mover as CoreMover } from '@/types/campaignMetrics';
import type { Anomaly } from '@/services/campaignMetrics/anomalyService';
import type { PortfolioSummary, PortfolioOutlier } from '@/services/campaignMetrics/portfolioMetricsService';

// Feature flag
// Local fallback types if not imported from campaignMetrics types
// Use core campaign metrics types instead of local placeholders
type DeltaMetrics = CoreDeltaMetrics;
// Adapt mover display; core mover has domain/from/to. Keep local adapter if needed
interface MoverDisplay { id: string; label: string; change: number; direction: 'up' | 'down'; domain?: string }
const ENABLE_DEBUG_PANEL = process.env.NEXT_PUBLIC_DEBUG_METRICS_PANEL === 'true' || 
                          (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugMetrics') === '1');

interface MetricsDebugPanelProps {
  snapshots?: AggregateSnapshot[];
  connectionState?: ConnectionState;
  lastDeltas?: DeltaMetrics[];
  topMovers?: MoverDisplay[];
  anomalies?: Anomaly[];
  portfolioSummary?: PortfolioSummary | null;
  portfolioOutliers?: PortfolioOutlier[];
  className?: string;
}

interface PerformanceMetric {
  name: string;
  count: number;
  average: number;
  min: number;
  max: number;
  p95: number;
}

export const MetricsDebugPanel: React.FC<MetricsDebugPanelProps> = ({
  snapshots = [],
  connectionState = 'disconnected',
  lastDeltas = [],
  topMovers = [],
  anomalies = [],
  portfolioSummary = null,
  portfolioOutliers = [],
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetric[]>([]);
  // Replace untyped debug states with structured interfaces
  interface MemoryStats { campaignCount: number; totalSnapshots: number; estimatedSizeKB: number }
  interface StreamPoolStats { totalPools: number; totalConnections: number; pools: Array<{ url: string; refCount: number; missedHeartbeats: number; failureCount: number }> }
  interface TelemetryStatus { enabled?: boolean; inSample: boolean; sessionId: string; queueSize: number; samplingRate: number; flushIntervalMs?: number; lastFlush?: string }
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [streamStats, setStreamStats] = useState<StreamPoolStats | null>(null);
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStatus | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Check if debug panel should be shown
  useEffect(() => {
    setIsVisible(ENABLE_DEBUG_PANEL);
  }, []);

  // Update performance metrics periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const perfStats = getPerformanceStats();
      const operations = Object.keys(perfStats.timings);
      
      const metrics = operations.map(op => {
        const stats = getTimingStats(op);
        return stats ? {
          name: op,
          ...stats
        } : null;
      }).filter(Boolean) as PerformanceMetric[];

      setPerfMetrics(metrics);

      // Get memory stats
      const memory = getMemoryStats();
      setMemoryStats(memory);

      // Get Phase 5 stats
      const streamPoolStats = getStreamPoolStats();
      setStreamStats(streamPoolStats);

      const telemetryStatus = getTelemetryStatus();
      setTelemetryStats(telemetryStatus);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleExportData = () => {
    const data = exportPerformanceData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getConnectionStateColor = (state: ConnectionState) => {
    switch (state) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'degraded': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className={cn('border-dashed border-yellow-300 bg-yellow-50/50', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-yellow-800">
            🔧 Metrics Debug Panel
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Development Only
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsVisible(false)}
            >
              Hide
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs defaultValue="snapshots" className="w-full">
          <TabsList className="grid w-full grid-cols-8 text-xs">
            <TabsTrigger value="snapshots">Timeline</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
            <TabsTrigger value="deltas">Deltas</TabsTrigger>
            <TabsTrigger value="movers">Movers</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="snapshots" className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Snapshot History ({snapshots.length})</h4>
              {memoryStats && (
                <Badge variant="outline" className="text-xs">
                  Campaigns: {memoryStats.campaignCount} | 
                  Snapshots: {memoryStats.totalSnapshots} | 
                  Memory: ~{memoryStats.estimatedSizeKB}KB
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {snapshots.slice(-10).reverse().map((snapshot, index) => (
                <div
                  key={snapshot.id}
                  className="text-xs p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSection(`snapshot-${snapshot.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{snapshot.id}</span>
                    <span className="text-gray-500">
                      {new Date(snapshot.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {expandedSections.has(`snapshot-${snapshot.id}`) && (
                    <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(snapshot.aggregates, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              
              {snapshots.length === 0 && (
                <div className="text-xs text-gray-500 italic text-center py-4">
                  No snapshots available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deltas" className="space-y-2">
            <h4 className="text-sm font-medium">Recent Deltas ({lastDeltas.length})</h4>
            
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {lastDeltas.slice(-5).map((delta, index) => (
                <div
                  key={index}
                  className="text-xs p-2 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSection(`delta-${index}`)}
                >
                  <div className="flex items-center justify-between">
                    <span>{(delta as any).metric || delta.key || 'Unknown'}</span>
                    <Badge 
                      variant={delta.direction === 'up' ? 'default' : delta.direction === 'down' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {delta.direction} {typeof (delta as any).magnitude === 'number' ? (delta as any).magnitude.toFixed(2) : ''}
                    </Badge>
                  </div>
                  
                  {expandedSections.has(`delta-${index}`) && (
                    <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(delta, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              
              {lastDeltas.length === 0 && (
                <div className="text-xs text-gray-500 italic text-center py-4">
                  No delta data available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="movers" className="space-y-2">
            <h4 className="text-sm font-medium">Top Movers ({topMovers.length})</h4>
            
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {topMovers.slice(0, 10).map((mover, index) => (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="font-mono">{(mover as any).domain || mover.label || 'Unknown'}</span>
                    <span className={cn(
                      'font-medium',
                      mover.direction === 'up' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {mover.direction === 'up' ? '↗' : '↘'} {mover.change?.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              
              {topMovers.length === 0 && (
                <div className="text-xs text-gray-500 italic text-center py-4">
                  No mover data available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Performance Metrics</h4>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={handleExportData}>
                  Export
                </Button>
                <Button size="sm" variant="outline" onClick={clearPerformanceData}>
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {perfMetrics.map((metric) => (
                <div key={metric.name} className="text-xs p-2 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{metric.name}</span>
                    <span className="text-gray-500">×{metric.count}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-1 text-xs">
                    <div>Avg: {formatDuration(metric.average)}</div>
                    <div>Min: {formatDuration(metric.min)}</div>
                    <div>Max: {formatDuration(metric.max)}</div>
                    <div>P95: {formatDuration(metric.p95)}</div>
                  </div>
                </div>
              ))}
              
              {perfMetrics.length === 0 && (
                <div className="text-xs text-gray-500 italic text-center py-4">
                  No performance data available
                </div>
              )}
            </div>
          </TabsContent>

          {/* Phase 5 New Tabs */}
          <TabsContent value="anomalies" className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Detected Anomalies ({anomalies.length})</h4>
              {process.env.NEXT_PUBLIC_ENABLE_ANOMALY_RULES !== 'false' && (
                <Badge variant="outline" className="text-xs bg-green-50">
                  Enabled
                </Badge>
              )}
            </div>
            
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {anomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className="text-xs p-2 bg-red-50 border border-red-200 rounded"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-800">{anomaly.metric}</span>
                    <Badge 
                      variant={anomaly.severity === 'critical' ? 'destructive' : 'outline'} 
                      className="text-xs"
                    >
                      {anomaly.severity}
                    </Badge>
                  </div>
                  <div className="text-red-700 mt-1">{anomaly.description}</div>
                  <div className="text-red-600 text-xs mt-1">
                    Z-Score: {anomaly.zScore.toFixed(2)} | Value: {anomaly.value}
                  </div>
                </div>
              ))}
              
              {anomalies.length === 0 && (
                <div className="text-xs text-gray-500 italic text-center py-4">
                  No anomalies detected
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Portfolio Metrics</h4>
              {process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO_METRICS !== 'false' && (
                <Badge variant="outline" className="text-xs bg-green-50">
                  Enabled
                </Badge>
              )}
            </div>
            
            {portfolioSummary ? (
              <div className="space-y-2">
                <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Campaigns: {portfolioSummary.totalCampaigns}</div>
                    <div>Total Domains: {portfolioSummary.totalDomains}</div>
                    <div>Avg Success: {(portfolioSummary.avgSuccessRate * 100).toFixed(1)}%</div>
                    <div>Total Leads: {portfolioSummary.totalLeads}</div>
                  </div>
                </div>
                
                {portfolioOutliers.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium">Outliers ({portfolioOutliers.length})</div>
                    {portfolioOutliers.slice(0, 3).map((outlier, index) => (
                      <div key={index} className="text-xs p-1 bg-yellow-50 border border-yellow-200 rounded">
                        {outlier.campaignId.slice(0, 8)}: {outlier.metric} ({outlier.severity})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic text-center py-4">
                Portfolio metrics not available (need ≥2 campaigns)
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Export Status</h4>
              {process.env.NEXT_PUBLIC_ENABLE_EXPORT_TOOLS !== 'false' && (
                <Badge variant="outline" className="text-xs bg-green-50">
                  Enabled
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-xs p-2 bg-gray-50 border rounded">
                <div>Available Snapshots: {snapshots.length}</div>
                <div>Estimated Size: {Math.round(JSON.stringify(snapshots).length / 1024)}KB</div>
                <div>Export Formats: JSON, CSV, Share Bundle</div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" className="text-xs">
                  Test JSON
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  Test CSV
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  Test Bundle
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="telemetry" className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Telemetry Status</h4>
              {telemetryStats?.enabled && (
                <Badge variant="outline" className="text-xs bg-green-50">
                  {telemetryStats.inSample ? 'Sampling' : 'Enabled'}
                </Badge>
              )}
            </div>
            
            {telemetryStats && (
              <div className="space-y-2">
                <div className="text-xs p-2 bg-gray-50 border rounded">
                  <div>Session: {telemetryStats.sessionId.slice(0, 12)}...</div>
                  <div>Sampling Rate: {(telemetryStats.samplingRate * 100).toFixed(1)}%</div>
                  <div>In Sample: {telemetryStats.inSample ? 'Yes' : 'No'}</div>
                  <div>Queue Size: {telemetryStats.queueSize}</div>
                </div>
                
                {streamStats && (
                  <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-medium mb-1">Stream Pool</div>
                    <div>Active Pools: {streamStats.totalPools}</div>
                    <div>Total Connections: {streamStats.totalConnections}</div>
                    <div>Efficiency: {streamStats.totalPools > 0 ? (streamStats.totalConnections / streamStats.totalPools).toFixed(1) : 0}x</div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connection" className="space-y-2">
            <h4 className="text-sm font-medium">Connection Status</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', getConnectionStateColor(connectionState))} />
                <span className="text-sm font-medium">{connectionState}</span>
              </div>
              
              <div className="text-xs space-y-1">
                <div>Last update: {new Date().toLocaleTimeString()}</div>
                <div>Stream pooling: {process.env.NEXT_PUBLIC_STREAM_POOLING !== 'false' ? 'Enabled' : 'Disabled'}</div>
                {streamStats && (
                  <>
                    <div>Active streams: {streamStats.totalPools}</div>
                    <div>Total refs: {streamStats.totalConnections}</div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MetricsDebugPanel;