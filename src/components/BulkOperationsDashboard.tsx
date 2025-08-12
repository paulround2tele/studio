import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useBulkGenerateDomainsMutation,
  useBulkValidateDNSMutation,
  useBulkValidateHTTPMutation,
  useBulkAnalyzeDomainsMutation,
  useAllocateBulkResourcesMutation,
  useListBulkOperationsQuery
} from '@/store/api/bulkOperationsApi';
import { 
  useGetResourceMetricsQuery,
  useGetSystemHealthQuery 
} from '@/store/api/monitoringApi';
import { useSSE } from '@/hooks/useSSE';
import ResourceMonitor from '@/components/monitoring/ResourceMonitor';
import PerformanceTracker from '@/components/monitoring/PerformanceTracker';
import {
  startTracking,
  updateOperationStatus,
  selectActiveOperations,
  selectRecentOperations,
  selectCanStartNewOperation,
  selectResourceUsagePercentage,
  type BulkOperationType
} from '@/store/slices/bulkOperationsSlice';
import type { RootState } from '@/store';
import type {
  BulkDomainGenerationRequest,
  BulkDNSValidationRequest,
  BulkHTTPValidationRequest,
  BulkAnalyticsRequest,
  BulkResourceRequest
} from '@/lib/api-client/models';
import type { UUID } from '@/lib/api-client/uuid-types';

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
  const { data: operationsList, isLoading: isLoadingOperations } = useListBulkOperationsQuery({
    limit: 20,
    offset: 0
  });

  // Real-time monitoring data
  const { data: resourceMetrics } = useGetResourceMetricsQuery();
  const { data: systemHealth } = useGetSystemHealthQuery();
  
  // Local state for operation configuration
  const [selectedOperationType, setSelectedOperationType] = useState<BulkOperationType>('domain_generation');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState<any[]>([]);

  // SSE connection for real-time bulk operation updates
  const { readyState, lastEvent } = useSSE(
    '/api/v2/monitoring/stream',
    (event) => {
      // Handle different types of SSE events
      switch (event.event) {
        case 'bulk_operation_started':
        case 'bulk_operation_progress':
        case 'bulk_operation_completed':
        case 'bulk_operation_failed':
          setRealTimeUpdates(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 updates
          // Update Redux state if needed
          if (event.data.operation_id) {
            dispatch(updateOperationStatus({
              id: event.data.operation_id,
              status: event.data.status,
              progress: event.data.progress || 0,
              result: event.data.result,
              error: event.data.error
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
  const executeBulkOperation = async (operationType: BulkOperationType, config: any) => {
    if (!canStartNewOperationSafely()) {
      alert(
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
      
      // Update operation status with result
      dispatch(updateOperationStatus({
        id: operationId,
        status: 'completed',
        progress: 100,
        result
      }));
      
    } catch (error: any) {
      // Update operation status with error
      dispatch(updateOperationStatus({
        id: operationId,
        status: 'failed',
        error: error.message || 'Operation failed'
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
            campaignId: crypto.randomUUID() as UUID,
            config: {
              pattern: { type: 'prefix', value: 'bulk-test-' },
              count: 1000,
              tlds: ['com', 'org', 'net']
            },
            maxDomains: 1000,
            startFrom: 0
          }],
          batchSize: 100,
          stealth: { enabled: true, randomizationLevel: 'medium' }
        } as BulkDomainGenerationRequest;
      
      case 'dns_validation':
        return {
          operations: [{
            campaignId: crypto.randomUUID() as UUID,
            personaIds: ['persona-1', 'persona-2'],
            maxDomains: 100
          }],
          stealth: { enabled: true, randomizationLevel: 'high' },
          batchSize: 50
        } as BulkDNSValidationRequest;
      
      case 'http_validation':
        return {
          operations: [{
            campaignId: crypto.randomUUID() as UUID,
            personaIds: ['persona-1', 'persona-2'],
            keywords: ['test', 'sample'],
            maxDomains: 100
          }],
          stealth: { enabled: true, randomizationLevel: 'extreme' },
          batchSize: 25
        } as BulkHTTPValidationRequest;
      
      case 'analytics':
        return {
          campaignIds: ['campaign-1', 'campaign-2'],
          metrics: ['response_time', 'content_analysis', 'lead_score'],
          granularity: 'day',
          timeRange: { 
            startTime: '2024-01-01T00:00:00Z', 
            endTime: '2024-12-31T23:59:59Z',
            timezone: 'UTC'
          }
        } as BulkAnalyticsRequest;
        
      case 'resource_allocation':
        return {
          operations: [{
            campaignId: crypto.randomUUID() as UUID,
            priority: 'normal' as const,
            type: 'domain_generation' as const,
            requiredResources: {
              estimatedDomains: 10000,
              maxConcurrency: 2
            }
          }],
          requestId: crypto.randomUUID()
        } as unknown as BulkResourceRequest;
        
      default:
        return {};
    }
  };
  
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
              {realTimeUpdates.slice(0, 3).map((update, index) => (
                <div key={index} className="text-xs p-1 bg-muted rounded">
                  {update.event}: {update.data.status || 'update'}
                </div>
              ))}
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
      
      {/* Active Operations */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Operations</h2>
        
        {Object.keys(activeOperations).length === 0 ? (
          <p className="text-gray-500">No active operations</p>
        ) : (
          <div className="space-y-4">
            {Object.values(activeOperations).map((operation) => (
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
                    'bg-red-100 text-red-800'
                  }`}>
                    {operation.status}
                  </span>
                </div>
                
                {operation.progress !== undefined && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${operation.progress}%` }}
                    ></div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  Started: {new Date(operation.startTime).toLocaleString()}
                </p>
              </div>
            ))}
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
