import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useBulkGenerateDomainsMutation,
  useBulkValidateDNSMutation,
  useBulkValidateHTTPMutation,
  useBulkAnalyzeDomainsMutation,
  useAllocateBulkResourcesMutation,
  useListBulkOperationsQuery,
  useGetBulkOperationStatusQuery
} from '@/store/api/bulkOperationsApi';
import { 
  useGetResourceMetricsQuery,
  useGetSystemHealthQuery 
} from '@/store/api/monitoringApi';
import { useSSE, type SSEEvent } from '@/hooks/useSSE';
import ResourceMonitor from '@/components/monitoring/ResourceMonitor';
import PerformanceTracker from '@/components/monitoring/PerformanceTracker';
import {
  startTracking,
  updateOperationStatus,
  selectActiveOperations,
  selectRecentOperations,
  selectCanStartNewOperation,
  selectResourceUsagePercentage,
  type BulkOperationType,
  type BulkOperationState
} from '@/store/slices/bulkOperationsSlice';
import type { BulkOperationStatusResponse } from '@/lib/api-client/models/bulk-operation-status-response';
import type {
  BulkDomainGenerationRequest,
  BulkDNSValidationRequest,
  BulkHTTPValidationRequest,
  BulkAnalyticsRequest,
  BulkResourceAllocationRequest,
} from '@/lib/api-client/models';
import { BulkAnalyticsRequestGranularityEnum, BulkAnalyticsRequestMetricsEnum } from '@/lib/api-client/models/bulk-analytics-request';
import { BulkDNSValidationRequestOperationsInnerValidationConfigRecordTypesEnum } from '@/lib/api-client/models/bulk-dnsvalidation-request-operations-inner-validation-config';
// UUID type alias (generated client no longer exports uuid-types explicitly)
type UUID = string;

// Professional type aliases for readability
type BulkResourceRequest = BulkResourceAllocationRequest;

/**
 * Bulk Operations Dashboard Component
 * 
 * Enterprise-grade bulk operations interface with real-time monitoring:
 * - Domain Generation (bulk_domains_handlers.go)
 * - DNS/HTTP Validation (bulk_validation_handlers.go) 
 * - Analytics & Campaigns (bulk_analytics_handlers.go)
 * - Resource Management (bulk_resources_handlers.go)
 * - Real-time resource monitoring integration
 * - SSE-powered live updates
 */
export const BulkOperationsDashboard: React.FC = () => {
  const dispatch = useDispatch();
  
  // Redux state
  const activeOperations = useSelector(selectActiveOperations);
  const recentOperations = useSelector(selectRecentOperations);
  const canStartNewOperation = useSelector(selectCanStartNewOperation);
  const resourceUsage = useSelector(selectResourceUsagePercentage);
  
  // RTK Query mutations for each separated handler
  const [bulkGenerateDomains] = useBulkGenerateDomainsMutation();
  const [bulkValidateDNS] = useBulkValidateDNSMutation();
  const [bulkValidateHTTP] = useBulkValidateHTTPMutation();
  const [bulkAnalyzeDomains] = useBulkAnalyzeDomainsMutation();
  const [allocateBulkResources] = useAllocateBulkResourcesMutation();
  
  // Query for operation list
  const { data: _operationsList, isLoading: _isLoadingOperations } = useListBulkOperationsQuery({
    limit: 20,
    offset: 0
  });

  // Real-time monitoring data
  const { data: resourceMetrics } = useGetResourceMetricsQuery();
  const { data: _systemHealth } = useGetSystemHealthQuery();
  
  // Local state for operation configuration
  const [selectedOperationType, setSelectedOperationType] = useState<BulkOperationType>('domain_generation');
  const [_isConfiguring, _setIsConfiguring] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState<SSEEvent[]>([]);
  const [trackedOperationIds, setTrackedOperationIds] = useState<string[]>([]);
  const [completedAges, setCompletedAges] = useState<Record<string, number>>({});

  // Prune completed tracking IDs after a retention window
  useEffect(() => {
    const RETAIN_MS = 15000;
    const interval = setInterval(() => {
      setTrackedOperationIds(ids => ids.filter(id => {
        const c = completedAges[id];
        return !c || (Date.now() - c < RETAIN_MS);
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, [completedAges]);

  // SSE connection for real-time bulk operation updates
  const { readyState, lastEvent: _lastEvent } = useSSE(
    '/api/v2/monitoring/stream',
    (event) => {
      const dataObj = (event.data && typeof event.data === 'object') ? (event.data as Record<string, unknown>) : undefined;
      // Normalize external status strings to our internal BulkOperationState union
      const normalizeStatus = (status: unknown, evType: string): BulkOperationState => {
        const s = typeof status === 'string' ? status.toLowerCase() : '';
        switch (s) {
          case 'queued':
          case 'pending':
          case 'init':
          case 'initialized':
            return 'pending';
          case 'started':
          case 'in_progress':
          case 'progress':
          case 'running':
            return 'running';
          case 'success':
          case 'completed':
          case 'done':
            return 'completed';
          case 'failed':
          case 'error':
          case 'errored':
            return 'failed';
          case 'cancelled':
          case 'canceled':
            return 'cancelled';
          default:
            // Fall back to event type hints
            if (evType === 'bulk_operation_started') return 'running';
            if (evType === 'bulk_operation_completed') return 'completed';
            if (evType === 'bulk_operation_failed') return 'failed';
            return 'pending';
        }
      };
      // Handle different types of SSE events
      switch (event.event) {
        case 'bulk_operation_started':
        case 'bulk_operation_progress':
        case 'bulk_operation_completed':
        case 'bulk_operation_failed':
          setRealTimeUpdates(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 updates
          // Update Redux state if needed
          if (dataObj && 'operation_id' in dataObj) {
            const opId = String((dataObj as { operation_id: unknown }).operation_id);
            // Extract optional numeric progress
            const progressVal = (dataObj as { progress?: unknown }).progress;
            const progressNum = typeof progressVal === 'number' ? progressVal : Number(progressVal ?? 0) || 0;
            // Safely extract nested result object
            let opResult: Record<string, unknown> | undefined;
            if ('result' in dataObj) {
              const maybeResult = (dataObj as { result?: unknown }).result;
              if (maybeResult && typeof maybeResult === 'object' && !Array.isArray(maybeResult)) {
                opResult = maybeResult as Record<string, unknown>;
              }
            }
            const errorVal = (dataObj as { error?: unknown }).error;
            dispatch(updateOperationStatus({
              id: opId,
              status: normalizeStatus((dataObj as { status?: unknown }).status, event.event),
              progress: progressNum,
              result: opResult,
              error: typeof errorVal === 'string' ? errorVal : undefined,
            }));
          }
          break;
        case 'resource_update':
          // Resource updates are handled by ResourceMonitor component
          break;
        default:
          console.log('Unknown SSE event:', event.event);
      }
    },
    {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 3000,
    }
  );

  // Check if system can handle new operations based on resource usage
  const canStartNewOperationSafely = () => {
    if (!canStartNewOperation) return false;
    if (!resourceMetrics) return true; // Allow if no metrics available
    
    // Don't start new operations if system is under stress
    return resourceMetrics.cpu_percent < 85 && 
           resourceMetrics.memory_percent < 85 && 
           resourceMetrics.disk_percent < 90;
  };
  
  /**
   * Execute bulk operation based on type with resource monitoring
   */
  const executeBulkOperation = async (operationType: BulkOperationType, config: BulkDomainGenerationRequest | BulkDNSValidationRequest | BulkHTTPValidationRequest | BulkAnalyticsRequest | BulkResourceRequest) => {
    if (!canStartNewOperationSafely()) {
  window.alert(
        !canStartNewOperation 
          ? 'Maximum concurrent operations reached. Please wait for an operation to complete.'
          : 'System resources are under stress. Please wait before starting new operations.'
      );
      return;
    }
    
  const operationId = `bulk_${operationType}_${Date.now()}`;
    
    // Start tracking in Redux
    dispatch(startTracking({
      id: operationId,
      type: operationType,
      metadata: { config, startedBy: 'user' }
    }));
    
    try {
      let result;
      
      switch (operationType) {
        case 'domain_generation':
          result = await bulkGenerateDomains(config as BulkDomainGenerationRequest).unwrap();
          break;
          
        case 'dns_validation':
          result = await bulkValidateDNS(config as BulkDNSValidationRequest).unwrap();
          break;
          
        case 'http_validation':
          result = await bulkValidateHTTP(config as BulkHTTPValidationRequest).unwrap();
          break;
          
        case 'analytics':
          result = await bulkAnalyzeDomains(config as BulkAnalyticsRequest).unwrap();
          break;
          
        case 'resource_allocation':
          result = await allocateBulkResources(config as BulkResourceRequest).unwrap();
          break;
          
        default:
          throw new Error(`Unsupported operation type: ${operationType}`);
      }
      
      // If the API returns an operation tracking id use it, else keep synthetic
      const operationResultId = (result as { operationId?: string })?.operationId || operationId;
      if (!trackedOperationIds.includes(operationResultId)) {
        setTrackedOperationIds(prev => [...prev, operationResultId]);
      }
      dispatch(updateOperationStatus({
        id: operationResultId,
        status: 'running',
        progress: 0,
        result: result as unknown as Record<string, unknown>
      }));
      
  } catch (error) {
      // Update operation status with error
      dispatch(updateOperationStatus({
        id: operationId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Operation failed'
      }));
    }
  };
  
  /**
   * Sample configurations for each operation type
   * Note: These actually match the backend API contracts, unlike the previous amateur hour attempt
   */
  const getSampleConfig = (operationType: BulkOperationType) => {
    switch (operationType) {
      case 'domain_generation':
        return {
          operations: [{
            campaignId: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-dg`) as UUID,
            config: {
              patternType: 'prefix',
              prefixVariableLength: 8,
              suffixVariableLength: 0,
              variableLength: 8,
              characterSet: 'abcdefghijklmnopqrstuvwxyz',
              constantString: 'bulk-test-',
              tlds: ['com', 'org', 'net'],
              numDomainsToGenerate: 1000,
              batchSize: 100,
            },
            maxDomains: 1000,
          }],
          batchSize: 100,
          parallel: true,
        } as BulkDomainGenerationRequest;
      
      case 'dns_validation':
        return {
          operations: [{
            campaignId: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-dv`) as UUID,
            personaIds: ['persona-1', 'persona-2'],
            maxDomains: 100,
            validationConfig: {
              timeout: 5000,
              retries: 1,
              recordTypes: [BulkDNSValidationRequestOperationsInnerValidationConfigRecordTypesEnum.A]
            },
          }],
          batchSize: 50,
          stealth: {},
        } satisfies BulkDNSValidationRequest;
      
      case 'http_validation':
        return {
          operations: [{
            campaignId: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-hv`) as UUID,
            personaIds: ['persona-1', 'persona-2'],
            keywords: ['test', 'sample'],
            maxDomains: 100,
            validationConfig: { timeout: 5000, followRedirects: true },
          }],
          batchSize: 25,
          stealth: { /* optional */ },
        } as BulkHTTPValidationRequest;
      
      case 'analytics':
        return {
          campaignIds: ['campaign-1', 'campaign-2'],
          metrics: [BulkAnalyticsRequestMetricsEnum.response_time],
          granularity: BulkAnalyticsRequestGranularityEnum.day,
          timeRange: {
            startTime: '2024-01-01T00:00:00Z',
            endTime: '2024-12-31T23:59:59Z',
          },
        } satisfies BulkAnalyticsRequest;
        
      case 'resource_allocation':
        return {
          operationType: 'domain_generation',
          resources: {
            cpu: 2,
            memory: 4,
            networkBandwidth: 100,
          },
          priority: 'normal',
          duration: 3600,
          tags: { source: 'ui', purpose: 'sample' },
        } as BulkResourceRequest;
        
      default:
        // Fallback to a no-op analytics request to satisfy typing; UI prevents hitting this path.
        return {
          campaignIds: [],
          metrics: [BulkAnalyticsRequestMetricsEnum.response_time],
          granularity: BulkAnalyticsRequestGranularityEnum.day,
          timeRange: { startTime: new Date().toISOString(), endTime: new Date().toISOString() },
        } satisfies BulkAnalyticsRequest;
    }
  };
  
  // Legacy per-loop polling removed; replaced by Poller components below to respect hook rules

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bulk Operations Dashboard
        </h1>
        <p className="text-gray-600">
          Enterprise-scale bulk operations with real-time monitoring and separated handlers
        </p>
      </div>

      {/* Real-time Monitoring Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ResourceMonitor variant="compact" />
        <PerformanceTracker variant="compact" />
        
        {/* SSE Connection Status & Real-time Updates */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            Live Updates
            <div className={`w-2 h-2 rounded-full ${readyState === 1 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </h3>
          <div className="text-sm text-muted-foreground mb-2">
            {readyState === 1 ? 'Connected' : 'Disconnected'}
          </div>
          {realTimeUpdates.length > 0 && (
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {realTimeUpdates.slice(0, 3).map((update, index) => {
                const dataObj = (update.data && typeof update.data === 'object')
                  ? (update.data as Record<string, unknown>)
                  : undefined;
                const statusText = dataObj && typeof (dataObj as Record<string, unknown>).status === 'string'
                  ? String((dataObj as { status?: unknown }).status)
                  : 'update';
                return (
                  <div key={index} className="text-xs p-1 bg-muted rounded">
                    {update.event}: {statusText}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Resource Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Active Operations</h3>
          <div className="text-3xl font-bold text-blue-600">
            {Object.keys(activeOperations).length}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">System Status</h3>
          <div className={`text-3xl font-bold ${canStartNewOperationSafely() ? 'text-green-600' : 'text-red-600'}`}>
            {canStartNewOperationSafely() ? 'Ready' : 'Busy'}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {resourceMetrics && `CPU: ${resourceMetrics.cpu_percent.toFixed(0)}% | Mem: ${resourceMetrics.memory_percent.toFixed(0)}%`}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Concurrent Operations</h3>
          <div className="text-3xl font-bold text-orange-600">
            {resourceUsage.concurrentOperations.toFixed(0)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-orange-600 h-2 rounded-full" 
              style={{ width: `${Math.min(resourceUsage.concurrentOperations, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Operation Launcher */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Launch Bulk Operation</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {(['domain_generation', 'dns_validation', 'http_validation', 'analytics', 'resource_allocation'] as BulkOperationType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedOperationType(type)}
              className={`px-4 py-2 rounded-md font-medium ${
                selectedOperationType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Selected: <strong>{selectedOperationType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
          </p>
          <p className="text-xs text-gray-500">
            This will execute against the corresponding separated backend handler.
          </p>
        </div>
        
        <button
          onClick={() => executeBulkOperation(selectedOperationType, getSampleConfig(selectedOperationType))}
          disabled={!canStartNewOperation}
          className={`px-6 py-2 rounded-md font-medium ${
            canStartNewOperation
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
        >
          {canStartNewOperation ? 'Execute Sample Operation' : 'Resource Limit Reached'}
        </button>
      </div>
      
      {/* Pollers (hook-safe components) */}
          {trackedOperationIds.slice(0, 25).map((id) => {
            const Poller: React.FC = () => {
              const { data } = useGetBulkOperationStatusQuery(
                { operationId: id },
                { pollingInterval: 5000 }
              );

              useEffect(() => {
                const status = data as unknown as BulkOperationStatusResponse | undefined;
                if (!status) return;
                const processed = status.progress?.processed ?? 0;
                const total = status.progress?.total ?? 0;
                const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : undefined;
                dispatch(
                  updateOperationStatus({
                    id: status.operationId,
                    status: status.status as BulkOperationState,
                    progress: percent,
                    result: { processed, total } as unknown as Record<string, unknown>,
                  })
                );
                if (['completed', 'failed', 'cancelled'].includes(status.status)) {
                  setCompletedAges((prev) => ({ ...prev, [status.operationId]: Date.now() }));
                }
              }, [data]);
              return null;
            };

            return <Poller key={id} />;
          })}
      {/* Active Operations */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Operations</h2>
        
        {Object.keys(activeOperations).length === 0 ? (
          <p className="text-gray-500">No active operations</p>
        ) : (
          <div className="space-y-4">
            {Object.values(activeOperations).map((operation) => {
              const processed = (operation.result?.raw as unknown as { processed?: number })?.processed;
              const total = (operation.result?.raw as unknown as { total?: number })?.total;
              return (
                <div key={operation.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{operation.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                      <p className="text-sm text-gray-600">{operation.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      operation.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      operation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      operation.status === 'completed' ? 'bg-green-100 text-green-800' :
                      operation.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {operation.status}
                    </span>
                  </div>
                  {(processed !== undefined || total !== undefined) && (
                    <div className="text-xs text-gray-500 mb-1">{processed ?? 0}/{total ?? 0} processed</div>
                  )}
                  {operation.progress !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${operation.progress}%` }}
                      ></div>
                    </div>
                  )}
                  {operation.error && (
                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                      <span className="font-semibold">Error:</span>
                      <span className="truncate" title={operation.error}>{operation.error}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Started: {new Date(operation.startTime).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Recently Completed (last 5) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Recently Completed</h2>
        {recentOperations.filter(op => ['completed','failed','cancelled'].includes(op.status)).length === 0 ? (
          <p className="text-gray-500 text-sm">No completed operations yet</p>
        ) : (
          <div className="space-y-3">
            {recentOperations
              .filter(op => ['completed','failed','cancelled'].includes(op.status))
              .slice(0,5)
              .map(op => {
                const processed = (op.result?.raw as unknown as { processed?: number })?.processed ?? op.result?.data?.processedCount;
                const total = (op.result?.raw as unknown as { total?: number })?.total ?? op.result?.data?.totalProcessed;
                const percent = (processed !== undefined && total) ? Math.min(100, Math.round((processed/total)*100)) : undefined;
                const durationMs = op.endTime ? (new Date(op.endTime).getTime() - new Date(op.startTime).getTime()) : undefined;
                return (
                  <div key={op.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-medium text-sm">{op.type.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</h3>
                        <p className="text-[11px] text-gray-500">{op.id}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                        op.status === 'completed' ? 'bg-green-100 text-green-800' :
                        op.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {op.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600 mb-1">
                      {processed !== undefined && (
                        <span>{processed}/{total ?? '?'} processed{percent !== undefined && ` (${percent}%)`}</span>
                      )}
                      {durationMs !== undefined && (
                        <span>Duration: {(durationMs/1000).toFixed(1)}s</span>
                      )}
                      <span>Started: {new Date(op.startTime).toLocaleTimeString()}</span>
                      {op.endTime && <span>Ended: {new Date(op.endTime).toLocaleTimeString()}</span>}
                    </div>
                    {op.error && (
                      <div className="text-[11px] text-red-600 truncate" title={op.error}>Error: {op.error}</div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Recent Operations */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Recent Operations</h2>
        
        {recentOperations.length === 0 ? (
          <p className="text-gray-500">No recent operations</p>
        ) : (
          <div className="space-y-2">
            {recentOperations.slice(0, 10).map((operation) => (
              <div key={operation.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <span className="font-medium">{operation.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <span className="text-sm text-gray-600 ml-2">{operation.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    operation.status === 'completed' ? 'bg-green-100 text-green-800' :
                    operation.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {operation.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(operation.endTime || operation.startTime).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOperationsDashboard;
