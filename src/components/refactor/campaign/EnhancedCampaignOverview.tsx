/**
 * Enhanced Campaign Overview with Phase 4 Integration
 * Example showing how to integrate all Phase 4 features into existing components
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedKPICard } from '@/components/refactor/campaign/EnhancedKPICard';
import { MetricsDebugPanel } from '@/components/refactor/campaign/MetricsDebugPanel';
import { useEnhancedMetricsContext } from '@/hooks/useEnhancedMetricsContext';
import { getMemoryStats } from '@/services/campaignMetrics/historyStore';
import { getPerformanceStats as _getPerformanceStats, exportPerformanceData } from '@/services/campaignMetrics/metricsPerf';
import type { DomainListItem } from '@/lib/api-client/models';

interface EnhancedCampaignOverviewProps {
  campaignId: string;
  domains: DomainListItem[];
  className?: string;
}

/**
 * Enhanced Campaign Overview with Phase 4 features
 */
export const EnhancedCampaignOverview: React.FC<EnhancedCampaignOverviewProps> = ({
  campaignId,
  domains,
  className
}) => {
  const {
    aggregates,
    snapshots,
    snapshotCount,
    hasHistoricalData,
    deltas,
    significantDeltas,
    recommendations,
    workerMetrics,
    performanceMetrics,
    features,
    isLoading,
    error,
    progress: _progress,
    isConnected
  } = useEnhancedMetricsContext();

  const [showDebugPanel, setShowDebugPanel] = useState(false);
  interface MemoryStats { campaignCount: number; totalSnapshots: number; estimatedSizeKB: number }
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

  // Update memory stats periodically
  useEffect(() => {
    const updateStats = () => {
      setMemoryStats(getMemoryStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Check for debug panel visibility
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugEnabled = features.enableAdvancedScoring || urlParams.get('debugMetrics') === '1';
    setShowDebugPanel(debugEnabled);
  }, [features.enableAdvancedScoring]);

  // Handle performance data export
  const handleExportPerformance = () => {
    const data = exportPerformanceData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignId}-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertDescription>
          Error loading campaign metrics: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={className}>
      {/* Header with Phase 4 indicators */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campaign Overview</h1>
          <div className="flex items-center gap-2 mt-1">
            {features.enableTrends && hasHistoricalData && (
              <Badge variant="secondary" className="text-xs">
                📈 {snapshotCount} snapshots
              </Badge>
            )}
            {workerMetrics.isUsingWorker && (
              <Badge variant="outline" className="text-xs">
                ⚡ Worker mode
              </Badge>
            )}
            {isConnected && features.enableRealtimeProgress && (
              <Badge variant="default" className="text-xs">
                🔴 Live
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {memoryStats && (
            <Badge variant="outline" className="text-xs">
              💾 {memoryStats.estimatedSizeKB}KB
            </Badge>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPerformance}
            disabled={isLoading}
          >
            Export Debug Data
          </Button>
          
          {process.env.NODE_ENV === 'development' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
            >
              {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <EnhancedKPICard
          title="Total Domains"
          value={aggregates?.totalDomains || 0}
          campaignId={campaignId}
          metricKey="totalDomains"
          delta={significantDeltas.find(d => d.key === 'totalDomains')?.absolute}
          deltaDirection={significantDeltas.find(d => d.key === 'totalDomains')?.direction}
        />
        
        <EnhancedKPICard
          title="Average Lead Score"
          value={aggregates?.avgLeadScore || 0}
          unit="%"
          campaignId={campaignId}
          metricKey="avgLeadScore"
          delta={significantDeltas.find(d => d.key === 'avgLeadScore')?.absolute}
          deltaDirection={significantDeltas.find(d => d.key === 'avgLeadScore')?.direction}
          threshold={75} // Show threshold line at 75%
        />
        
        <EnhancedKPICard
          title="Success Rate"
          value={aggregates?.successRate || 0}
          unit="%"
          campaignId={campaignId}
          metricKey="successRate"
          delta={significantDeltas.find(d => d.key === 'successRate')?.absolute}
          deltaDirection={significantDeltas.find(d => d.key === 'successRate')?.direction}
          threshold={90} // Show threshold line at 90%
        />
        
        <EnhancedKPICard
          title="DNS Success Rate"
          value={aggregates?.dnsSuccessRate || 0}
          unit="%"
          campaignId={campaignId}
          metricKey="dnsSuccessRate"
          delta={significantDeltas.find(d => d.key === 'dnsSuccessRate')?.absolute}
          deltaDirection={significantDeltas.find(d => d.key === 'dnsSuccessRate')?.direction}
          threshold={95}
        />
      </div>

      {/* Performance Indicators */}
      {(workerMetrics.isUsingWorker || performanceMetrics.computeTimeMs) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {workerMetrics.isUsingWorker && (
                <div>
                  <div className="font-medium">Worker Computation</div>
                  <div className="text-gray-600">
                    {workerMetrics.workerTimingMs?.toFixed(0)}ms for {domains.length} domains
                  </div>
                </div>
              )}
              
              {performanceMetrics.computeTimeMs && (
                <div>
                  <div className="font-medium">Total Compute Time</div>
                  <div className="text-gray-600">
                    {performanceMetrics.computeTimeMs.toFixed(0)}ms
                  </div>
                </div>
              )}
              
              {performanceMetrics.cacheHitRate > 0 && (
                <div>
                  <div className="font-medium">Cache Hit Rate</div>
                  <div className="text-gray-600">
                    {(performanceMetrics.cacheHitRate * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Recommendations */}
      {recommendations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">
              Smart Recommendations 
              {features.enableAdvancedScoring && (
                <Badge variant="outline" className="ml-2 text-xs">
                  v2 Scoring
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, _index) => (
                <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex-shrink-0">
                    <Badge 
                      variant={rec.severity === 'action' ? 'destructive' : 
                              rec.severity === 'warn' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {rec.severity}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{rec.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{rec.detail}</div>
                    {features.enableAdvancedScoring && rec.compositePriority && (
                      <div className="text-xs text-gray-500 mt-1">
                        Priority: {rec.compositePriority.toFixed(3)}
                        {rec.duplicateCount && rec.duplicateCount > 1 && (
                          <span className="ml-2">({rec.duplicateCount} similar)</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <MetricsDebugPanel
          snapshots={snapshots}
          connectionState={isConnected ? 'connected' : 'disconnected'}
          lastDeltas={deltas}
          topMovers={[]} // Would come from movers context
          className="mt-6"
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            Computing metrics...
            {workerMetrics.isUsingWorker && " (using worker)"}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCampaignOverview;