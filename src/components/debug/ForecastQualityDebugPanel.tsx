/**
 * Forecast Quality Debug Panel (Phase 8)
 * Flag-gated debug UI for forecast quality, model arbitration, and degradation state
 */

import React, { useState, useEffect } from 'react';

// Feature flags for debug panel sections
const isForecastDebugEnabled = () => 
  process.env.NEXT_PUBLIC_FORECAST_DEBUG_PANEL === 'true' || 
  process.env.NODE_ENV === 'development';

const isDegradationDebugEnabled = () => 
  process.env.NEXT_PUBLIC_DEGRADATION_DEBUG_PANEL === 'true' || 
  process.env.NODE_ENV === 'development';

const isAuditDebugEnabled = () => 
  process.env.NEXT_PUBLIC_AUDIT_DEBUG_PANEL === 'true' || 
  process.env.NODE_ENV === 'development';

interface ForecastQualityDebugPanelProps {
  campaignId: string;
  snapshots: any[];
  className?: string;
  onClose?: () => void;
}

interface ForecastDebugState {
  forecastResult?: any;
  loading: boolean;
  error?: string;
}

interface DegradationDebugState {
  degradationState?: any;
  loading: boolean;
  lastRefresh: string;
}

interface AuditDebugState {
  statistics?: any;
  recentEntries: any[];
  loading: boolean;
}

export const ForecastQualityDebugPanel: React.FC<ForecastQualityDebugPanelProps> = ({
  campaignId,
  snapshots,
  className = '',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('forecast');
  const [forecastDebug, setForecastDebug] = useState<ForecastDebugState>({ loading: false });
  const [degradationDebug, setDegradationDebug] = useState<DegradationDebugState>({ 
    loading: false, 
    lastRefresh: new Date().toISOString() 
  });
  const [auditDebug, setAuditDebug] = useState<AuditDebugState>({ 
    recentEntries: [], 
    loading: false 
  });

  // Simplified load functions for demonstration
  const loadForecastDebug = async () => {
    if (!isForecastDebugEnabled()) return;
    setForecastDebug(prev => ({ ...prev, loading: true, error: undefined }));
    
    // Simulate loading
    setTimeout(() => {
      setForecastDebug({ 
        loading: false, 
        forecastResult: {
          method: 'multi-model',
          timingMs: 145,
          points: [
            { timestamp: new Date().toISOString(), value: 65.2, lower: 60.1, upper: 70.3, p10: 58.5, p90: 72.1 },
            { timestamp: new Date(Date.now() + 86400000).toISOString(), value: 66.8, lower: 61.5, upper: 72.1, p10: 59.8, p90: 73.9 }
          ],
          modelInfo: {
            selectedModel: 'server',
            arbitrationScores: { mae: 2.34, mape: 3.6, confidence: 0.89 },
            alternativeModels: [
              { name: 'client_exp_smoothing', mae: 3.12, mape: 4.8 },
              { name: 'client_holt_winters', mae: 2.67, mape: 4.1 }
            ]
          }
        }
      });
    }, 500);
  };

  const loadDegradationDebug = async () => {
    if (!isDegradationDebugEnabled()) return;
    setDegradationDebug(prev => ({ ...prev, loading: true }));
    
    // Simulate loading
    setTimeout(() => {
      setDegradationDebug({ 
        loading: false, 
        degradationState: {
          tier: 0, // FULL
          healthyDomains: ['forecast', 'anomalies', 'recommendations', 'timeline', 'benchmarks'],
          degradedDomains: [],
          failedDomains: [],
          userVisibleImpact: {
            severity: 'none',
            description: 'All systems operational',
            affectedOperations: []
          }
        },
        lastRefresh: new Date().toISOString()
      });
    }, 300);
  };

  const loadAuditDebug = async () => {
    if (!isAuditDebugEnabled()) return;
    setAuditDebug(prev => ({ ...prev, loading: true }));
    
    // Simulate loading
    setTimeout(() => {
      setAuditDebug({ 
        loading: false, 
        statistics: {
          totalEntries: 42,
          recentActions: 5,
          retentionUtilization: 4.2
        },
        recentEntries: [
          {
            id: '1',
            action: 'normalization_toggle',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            context: { campaignId: campaignId, reason: 'User requested benchmark normalization' }
          },
          {
            id: '2',
            action: 'horizon_override',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            context: { campaignId: campaignId, reason: 'Extended forecast horizon to 14 days' }
          }
        ]
      });
    }, 400);
  };

  // Initial load
  useEffect(() => {
    loadForecastDebug();
    loadDegradationDebug();
    loadAuditDebug();
  }, [campaignId]);

  // Get degradation tier badge style
  const getDegradationBadgeStyle = (tier: number) => {
    switch (tier) {
      case 0: return 'bg-green-100 text-green-800';
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDegradationTierName = (tier: number) => {
    switch (tier) {
      case 0: return 'Full Service';
      case 1: return 'Partial Service';
      case 2: return 'Basic Service';
      default: return 'Unknown';
    }
  };

  // Format model score for display
  const formatModelScore = (score: any) => {
    if (!score) return 'N/A';
    return `MAE: ${score.mae?.toFixed(3) || 'N/A'}, MAPE: ${score.mape?.toFixed(1) || 'N/A'}%`;
  };

  return (
    <div className={`w-full max-w-4xl border border-gray-200 rounded-lg bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold">🔧 Phase 8 Debug Panel</h2>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            Campaign: {campaignId}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('forecast')}
            disabled={!isForecastDebugEnabled()}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'forecast' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            } ${!isForecastDebugEnabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Forecast Quality
          </button>
          <button
            onClick={() => setActiveTab('degradation')}
            disabled={!isDegradationDebugEnabled()}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'degradation' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            } ${!isDegradationDebugEnabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            System Health
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            disabled={!isAuditDebugEnabled()}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'audit' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            } ${!isAuditDebugEnabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Audit Trail
          </button>
        </div>

        {/* Tab Content */}
        
        {/* Forecast Quality Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-4">
            {!isForecastDebugEnabled() ? (
              <div className="text-center text-gray-500 py-8">
                <p>Forecast debug panel is disabled.</p>
                <p className="text-sm">Set NEXT_PUBLIC_FORECAST_DEBUG_PANEL=true to enable.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Multi-Model Forecast Analysis</h3>
                  <button 
                    onClick={loadForecastDebug}
                    disabled={forecastDebug.loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    {forecastDebug.loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {forecastDebug.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    Error: {forecastDebug.error}
                  </div>
                )}

                {forecastDebug.forecastResult && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Model Selection Info */}
                    <div className="border border-gray-200 rounded p-4">
                      <h4 className="text-sm font-medium mb-3">Selected Model</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {forecastDebug.forecastResult.modelInfo?.selectedModel || forecastDebug.forecastResult.method}
                          </span>
                          <span className="text-sm text-gray-500">
                            {forecastDebug.forecastResult.timingMs}ms
                          </span>
                        </div>
                        
                        {forecastDebug.forecastResult.modelInfo?.arbitrationScores && (
                          <div className="text-sm">
                            <p className="font-medium">Performance:</p>
                            <p className="text-gray-600">
                              {formatModelScore(forecastDebug.forecastResult.modelInfo.arbitrationScores)}
                            </p>
                            <p className="text-gray-600">
                              Confidence: {(forecastDebug.forecastResult.modelInfo.arbitrationScores.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alternative Models */}
                    <div className="border border-gray-200 rounded p-4">
                      <h4 className="text-sm font-medium mb-3">Alternative Models</h4>
                      {forecastDebug.forecastResult.modelInfo?.alternativeModels?.length > 0 ? (
                        <div className="space-y-2">
                          {forecastDebug.forecastResult.modelInfo.alternativeModels.map((model: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-gray-600">{formatModelScore(model)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No alternative models tested</p>
                      )}
                    </div>

                    {/* Forecast Points Summary */}
                    <div className="md:col-span-2 border border-gray-200 rounded p-4">
                      <h4 className="text-sm font-medium mb-3">
                        Forecast Points ({forecastDebug.forecastResult.points?.length || 0})
                      </h4>
                      {forecastDebug.forecastResult.points?.length > 0 ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
                            <span>Date</span>
                            <span>Value</span>
                            <span>Range</span>
                            <span>Quantiles</span>
                          </div>
                          {forecastDebug.forecastResult.points.slice(0, 5).map((point: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-4 gap-2 text-sm">
                              <span>{new Date(point.timestamp).toLocaleDateString()}</span>
                              <span>{point.value.toFixed(2)}</span>
                              <span className="text-gray-600">
                                {point.lower?.toFixed(2)} - {point.upper?.toFixed(2)}
                              </span>
                              <span className="text-gray-600">
                                {point.p10 && point.p90 ? `${point.p10.toFixed(2)} | ${point.p90.toFixed(2)}` : 'N/A'}
                              </span>
                            </div>
                          ))}
                          {forecastDebug.forecastResult.points.length > 5 && (
                            <p className="text-xs text-gray-500 text-center pt-2">
                              ... and {forecastDebug.forecastResult.points.length - 5} more points
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No forecast points generated</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* System Health Tab */}
        {activeTab === 'degradation' && (
          <div className="space-y-4">
            {!isDegradationDebugEnabled() ? (
              <div className="text-center text-gray-500 py-8">
                <p>Degradation debug panel is disabled.</p>
                <p className="text-sm">Set NEXT_PUBLIC_DEGRADATION_DEBUG_PANEL=true to enable.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">System Degradation Status</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      degradationDebug.degradationState ? 
                        getDegradationBadgeStyle(degradationDebug.degradationState.tier) : 
                        'bg-gray-100 text-gray-800'
                    }`}>
                      {degradationDebug.degradationState ? 
                        getDegradationTierName(degradationDebug.degradationState.tier) : 
                        'Unknown'
                      }
                    </span>
                    <button 
                      onClick={loadDegradationDebug}
                      disabled={degradationDebug.loading}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {degradationDebug.loading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {degradationDebug.degradationState && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Service Status */}
                    <div className="border border-gray-200 rounded p-4">
                      <h4 className="text-sm font-medium mb-3">Service Status</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-green-600 mb-1">
                            Healthy ({degradationDebug.degradationState.healthyDomains.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {degradationDebug.degradationState.healthyDomains.map((domain: string) => (
                              <span key={domain} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                {domain}
                              </span>
                            ))}
                          </div>
                        </div>

                        {degradationDebug.degradationState.degradedDomains.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-yellow-600 mb-1">
                              Degraded ({degradationDebug.degradationState.degradedDomains.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {degradationDebug.degradationState.degradedDomains.map((domain: string) => (
                                <span key={domain} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                  {domain}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {degradationDebug.degradationState.failedDomains.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-red-600 mb-1">
                              Failed ({degradationDebug.degradationState.failedDomains.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {degradationDebug.degradationState.failedDomains.map((domain: string) => (
                                <span key={domain} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  {domain}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Impact */}
                    <div className="border border-gray-200 rounded p-4">
                      <h4 className="text-sm font-medium mb-3">User Impact</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            degradationDebug.degradationState.userVisibleImpact.severity === 'none' ? 'bg-green-100 text-green-800' :
                            degradationDebug.degradationState.userVisibleImpact.severity === 'low' ? 'bg-yellow-100 text-yellow-800' :
                            degradationDebug.degradationState.userVisibleImpact.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {degradationDebug.degradationState.userVisibleImpact.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-600">
                            Last checked: {new Date(degradationDebug.lastRefresh).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <p className="text-sm">
                          {degradationDebug.degradationState.userVisibleImpact.description}
                        </p>

                        {degradationDebug.degradationState.userVisibleImpact.affectedOperations.length > 0 && (
                          <div>
                            <p className="text-sm font-medium">Affected Operations:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {degradationDebug.degradationState.userVisibleImpact.affectedOperations.map((op: string, idx: number) => (
                                <li key={idx}>{op}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {!isAuditDebugEnabled() ? (
              <div className="text-center text-gray-500 py-8">
                <p>Audit debug panel is disabled.</p>
                <p className="text-sm">Set NEXT_PUBLIC_AUDIT_DEBUG_PANEL=true to enable.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Governance Audit Trail</h3>
                  <button 
                    onClick={loadAuditDebug}
                    disabled={auditDebug.loading}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    {auditDebug.loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {auditDebug.statistics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded p-4 text-center">
                      <div className="text-2xl font-bold">{auditDebug.statistics.totalEntries}</div>
                      <p className="text-xs text-gray-600">Total Audit Entries</p>
                    </div>
                    
                    <div className="border border-gray-200 rounded p-4 text-center">
                      <div className="text-2xl font-bold">{auditDebug.statistics.recentActions}</div>
                      <p className="text-xs text-gray-600">Actions (24h)</p>
                    </div>
                    
                    <div className="border border-gray-200 rounded p-4 text-center">
                      <div className="text-2xl font-bold">
                        {auditDebug.statistics.retentionUtilization.toFixed(0)}%
                      </div>
                      <p className="text-xs text-gray-600">Storage Utilization</p>
                    </div>
                  </div>
                )}

                {auditDebug.recentEntries.length > 0 && (
                  <div className="border border-gray-200 rounded p-4">
                    <h4 className="text-sm font-medium mb-3">Recent Actions</h4>
                    <div className="space-y-3">
                      {auditDebug.recentEntries.map((entry: any, idx: number) => (
                        <div key={entry.id || idx} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                              {entry.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          {entry.context.campaignId && (
                            <p className="text-xs text-gray-600">
                              Campaign: {entry.context.campaignId}
                            </p>
                          )}
                          
                          {entry.context.reason && (
                            <p className="text-xs text-gray-700">
                              Reason: {entry.context.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};